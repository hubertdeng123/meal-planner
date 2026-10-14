import logging
from collections import Counter
from math import ceil
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import and_, asc, bindparam, desc, func, or_, text
from sqlalchemy.orm import Session, selectinload, sessionmaker

from app.agents.pydantic_recipe_agent import get_recipe_agent
from app.api.deps import get_current_active_user
from app.db.database import get_db, get_session_factory
from app.models import (
    Recipe as RecipeModel,
    RecipeFeedback as RecipeFeedbackModel,
    User,
)
from app.schemas.recipe import (
    PaginatedRecipes,
    Recipe,
    RecipeFacet,
    RecipeFacets,
    RecipeFeedback,
    RecipeFeedbackCreate,
    RecipeGenerationRequest,
    RecipeUpdate,
)
from app.services.recipe_responses import (
    find_user_feedback,
    format_feedback_response,
    format_recipe_response,
)
from app.services.recipe_stream import (
    SSE_HEADERS,
    generate_recipe_events,
    with_keepalive,
)

router = APIRouter()
logger = logging.getLogger(__name__)

_TOTAL_MINUTES = func.coalesce(RecipeModel.prep_time_minutes, 0) + func.coalesce(
    RecipeModel.cook_time_minutes, 0
)


def _apply_tag_filters(query, tags: list[str], db: Session):
    if not tags:
        return query

    dialect_name = db.bind.dialect.name if db.bind else ""

    if dialect_name == "postgresql":
        return query.filter(RecipeModel.tags.contains(tags))

    for index, tag in enumerate(tags):
        param_name = f"tag_{index}"
        query = query.filter(
            text(
                f"EXISTS (SELECT 1 FROM json_each(recipes.tags) WHERE json_each.value = :{param_name})"
            ).bindparams(bindparam(param_name, tag))
        )
    return query


def _get_owned_recipe(recipe_id: int, user: User, db: Session) -> RecipeModel:
    recipe = (
        db.query(RecipeModel)
        .options(selectinload(RecipeModel.recipe_feedbacks))
        .filter(RecipeModel.id == recipe_id, RecipeModel.user_id == user.id)
        .first()
    )
    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found"
        )
    return recipe


def _recipe_payload(recipe: RecipeModel, user: User) -> dict:
    return format_recipe_response(recipe, find_user_feedback(recipe, user.id))


@router.post(
    "/generate/stream",
    responses={
        200: {
            "content": {"text/event-stream": {}},
            "description": "Named SSE events: stage, thinking, draft, complete, error, ping.",
        },
        503: {"description": "No LLM provider is configured."},
    },
)
async def generate_recipe_stream(
    request: RecipeGenerationRequest,
    current_user: User = Depends(get_current_active_user),
    session_factory: sessionmaker[Session] = Depends(get_session_factory),
):
    """Generate a recipe, streaming progress as Server-Sent Events (contract v2)."""
    try:
        recipe_agent = get_recipe_agent()
    except RuntimeError as exc:
        logger.warning("Recipe generation requested but LLM is unavailable: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Recipe generation isn't available right now.",
        )

    events = generate_recipe_events(
        agent=recipe_agent,
        request=request,
        user_id=current_user.id,
        session_factory=session_factory,
    )
    return StreamingResponse(
        with_keepalive(events),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )


@router.get("/", response_model=list[Recipe])
async def get_recipes(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get user's recipes"""
    recipes = (
        db.query(RecipeModel)
        .options(selectinload(RecipeModel.recipe_feedbacks))
        .filter(RecipeModel.user_id == current_user.id)
        .order_by(RecipeModel.id)
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [_recipe_payload(recipe, current_user) for recipe in recipes]


@router.get("/list", response_model=PaginatedRecipes)
async def get_recipes_paginated(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    q: str | None = Query(default=None, min_length=1),
    tags: list[str] | None = Query(default=None),
    cuisine: str | None = Query(default=None, min_length=1),
    favorites: bool = Query(
        default=False, description="Only recipes the user liked or rated 4+"
    ),
    sort: Literal["created_at", "name", "total_minutes"] = Query(default="created_at"),
    order: Literal["asc", "desc"] = Query(default="desc"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get paginated recipes with optional search, tag, cuisine and favorite filters."""
    query = db.query(RecipeModel).filter(RecipeModel.user_id == current_user.id)

    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            (RecipeModel.name.ilike(like)) | (RecipeModel.description.ilike(like))
        )
    if cuisine:
        query = query.filter(func.lower(RecipeModel.cuisine) == cuisine.strip().lower())
    if favorites:
        query = query.filter(
            RecipeModel.recipe_feedbacks.any(
                and_(
                    RecipeFeedbackModel.user_id == current_user.id,
                    or_(
                        RecipeFeedbackModel.liked.is_(True),
                        RecipeFeedbackModel.rating >= 4,
                    ),
                )
            )
        )

    query = _apply_tag_filters(query, tags or [], db)
    total = query.count()

    sort_column = {
        "created_at": RecipeModel.created_at,
        "name": RecipeModel.name,
        "total_minutes": _TOTAL_MINUTES,
    }[sort]
    sort_direction = desc if order == "desc" else asc
    query = query.order_by(sort_direction(sort_column), sort_direction(RecipeModel.id))

    offset = (page - 1) * page_size
    recipes = (
        query.options(selectinload(RecipeModel.recipe_feedbacks))
        .offset(offset)
        .limit(page_size)
        .all()
    )

    return {
        "items": [_recipe_payload(recipe, current_user) for recipe in recipes],
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": ceil(total / page_size) if total else 0,
    }


@router.get("/facets", response_model=RecipeFacets)
async def get_recipe_facets(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Cuisine and tag counts across the user's recipes, most common first."""
    rows = (
        db.query(RecipeModel.cuisine, RecipeModel.tags)
        .filter(RecipeModel.user_id == current_user.id)
        .all()
    )

    def facets(values: list[str]) -> list[RecipeFacet]:
        counts: Counter[str] = Counter()
        labels: dict[str, str] = {}
        for value in values:
            label = value.strip()
            if not label:
                continue
            key = label.lower()
            labels.setdefault(key, label)
            counts[key] += 1
        ranked = sorted(counts.items(), key=lambda item: (-item[1], item[0]))
        return [RecipeFacet(value=labels[key], count=count) for key, count in ranked]

    return RecipeFacets(
        cuisines=facets([cuisine for cuisine, _ in rows if cuisine]),
        tags=facets([tag for _, tags in rows for tag in (tags or [])]),
        total=len(rows),
    )


@router.get("/{recipe_id}", response_model=Recipe)
async def get_recipe(
    recipe_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get a specific recipe, including the current user's feedback."""
    return _recipe_payload(_get_owned_recipe(recipe_id, current_user, db), current_user)


@router.put("/{recipe_id}", response_model=Recipe)
async def update_recipe(
    recipe_id: int,
    recipe_update: RecipeUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update a recipe"""
    recipe = _get_owned_recipe(recipe_id, current_user, db)

    update_data = recipe_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(recipe, field, value)

    db.commit()
    db.refresh(recipe)

    return _recipe_payload(recipe, current_user)


@router.delete("/{recipe_id}")
async def delete_recipe(
    recipe_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Delete a recipe"""
    recipe = (
        db.query(RecipeModel)
        .filter(RecipeModel.id == recipe_id, RecipeModel.user_id == current_user.id)
        .first()
    )
    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found"
        )

    try:
        from app.models.meal_plan import MealPlanItem

        db.query(MealPlanItem).filter(MealPlanItem.recipe_id == recipe_id).delete()
        db.query(RecipeFeedbackModel).filter(
            RecipeFeedbackModel.recipe_id == recipe_id
        ).delete()
        db.delete(recipe)
        db.commit()

        return {"detail": "Recipe deleted successfully"}

    except Exception:
        db.rollback()
        logger.exception("Failed to delete recipe_id=%s", recipe_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete recipe.",
        )


@router.get("/{recipe_id}/feedback", response_model=RecipeFeedback | None)
async def get_recipe_feedback(
    recipe_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get the current user's feedback for a recipe, or null if none has been left."""
    recipe = _get_owned_recipe(recipe_id, current_user, db)
    feedback = find_user_feedback(recipe, current_user.id)
    return format_feedback_response(feedback) if feedback else None


@router.post("/{recipe_id}/feedback", response_model=RecipeFeedback)
async def add_recipe_feedback(
    recipe_id: int,
    feedback: RecipeFeedbackCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Create or replace the current user's feedback for a recipe."""
    recipe = _get_owned_recipe(recipe_id, current_user, db)
    existing = find_user_feedback(recipe, current_user.id)

    if existing:
        existing.liked = feedback.liked
        existing.rating = feedback.rating
        existing.notes = feedback.notes
        db.commit()
        db.refresh(existing)
        return format_feedback_response(existing)

    db_feedback = RecipeFeedbackModel(
        user_id=current_user.id,
        recipe_id=recipe_id,
        liked=feedback.liked,
        rating=feedback.rating,
        notes=feedback.notes,
    )

    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)

    return format_feedback_response(db_feedback)


@router.delete("/{recipe_id}/feedback", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recipe_feedback(
    recipe_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Remove the current user's feedback for a recipe (no-op if there is none)."""
    _get_owned_recipe(recipe_id, current_user, db)
    db.query(RecipeFeedbackModel).filter(
        RecipeFeedbackModel.recipe_id == recipe_id,
        RecipeFeedbackModel.user_id == current_user.id,
    ).delete()
    db.commit()
