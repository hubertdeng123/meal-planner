"""Server-Sent Events pipeline for streamed recipe generation (streaming contract v2).

Event order: ``stage(context)`` -> [``stage(thinking)`` -> ``thinking``*] ->
``stage(drafting)`` -> ``draft``+ -> ``stage(saving)`` -> ``complete``, with ``error`` as an
alternative terminal event and ``ping`` frames whenever the stream is idle.
"""

import asyncio
import contextlib
import json
import logging
import time
from collections.abc import AsyncIterator
from typing import Any, Literal

import httpx
from pydantic import TypeAdapter, ValidationError
from pydantic_ai import Agent
from pydantic_ai.exceptions import (
    ModelAPIError,
    ModelHTTPError,
    UnexpectedModelBehavior,
    UsageLimitExceeded,
)
from pydantic_ai.messages import (
    PartDeltaEvent,
    PartStartEvent,
    TextPart,
    TextPartDelta,
    ThinkingPart,
    ThinkingPartDelta,
    ToolCallPart,
)
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker
from starlette.concurrency import run_in_threadpool

from app.agents.pydantic_recipe_agent import OUTPUT_TOOL_NAME
from app.agents.recipe_deps import RecipeAgentDeps
from app.core.config import settings
from app.schemas.llm_response import RecipeDraft, RecipeLLM
from app.schemas.recipe import Recipe, RecipeGenerationRequest
from app.services.recipe_generation import (
    build_recipe_prompt,
    prefetch_user_context,
    save_generated_recipe,
    select_cuisine,
)
from app.services.recipe_responses import format_recipe_response

logger = logging.getLogger(__name__)

Stage = Literal["context", "thinking", "drafting", "saving"]

STAGE_MESSAGES: dict[Stage, str] = {
    "context": "Reading your preferences and kitchen",
    "thinking": "Thinking through the recipe",
    "drafting": "Writing the recipe",
    "saving": "Saving to your recipes",
}

SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}

_draft_adapter = TypeAdapter(RecipeDraft)


class RecipeStreamError(Exception):
    """A failure with a user-facing message, raised inside the pipeline."""

    def __init__(self, message: str, retryable: bool) -> None:
        super().__init__(message)
        self.message = message
        self.retryable = retryable


def format_sse(event: str, data: dict[str, Any]) -> str:
    """Serialize one named SSE frame with a compact JSON payload."""
    payload = json.dumps(data, separators=(",", ":"), ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"


def describe_error(exc: BaseException) -> tuple[str, bool]:
    """Map an exception to a ``(friendly message, retryable)`` pair safe to show users."""
    if isinstance(exc, RecipeStreamError):
        return exc.message, exc.retryable
    if isinstance(exc, ModelHTTPError):
        if exc.status_code == 429:
            return "The AI chef is busy right now. Please try again in a moment.", True
        if exc.status_code in (401, 403):
            return (
                "Recipe generation is misconfigured on the server. Please contact support.",
                False,
            )
        if exc.status_code >= 500:
            return "The AI service is having trouble. Please try again.", True
        return "The AI service couldn't handle this request. Please try again.", True
    if isinstance(exc, ModelAPIError | httpx.TransportError):
        return "We couldn't reach the AI service. Please try again.", True
    if isinstance(exc, UsageLimitExceeded):
        return "That recipe got too long to finish. Try a simpler request.", True
    if isinstance(exc, UnexpectedModelBehavior):
        return "The AI returned an incomplete recipe. Please try again.", True
    if isinstance(exc, TimeoutError):
        return "Recipe generation took too long. Please try again.", True
    if isinstance(exc, SQLAlchemyError):
        return "We couldn't save your recipe. Please try again.", True
    return "Something went wrong while creating your recipe. Please try again.", True


def parse_draft(args: str | dict[str, Any] | None) -> RecipeDraft | None:
    """Validate possibly-truncated output tool arguments into a draft snapshot."""
    if not args:
        return None
    try:
        if isinstance(args, dict):
            return _draft_adapter.validate_python(
                args, experimental_allow_partial="trailing-strings"
            )
        return _draft_adapter.validate_json(
            args, experimental_allow_partial="trailing-strings"
        )
    except ValidationError:
        return None


class _DraftThrottle:
    """Emit draft snapshots at most once per interval, skipping unchanged ones."""

    def __init__(self, interval: float) -> None:
        self.interval = interval
        self._last_at = 0.0
        self._last_payload: dict[str, Any] | None = None

    def due(self) -> bool:
        return time.monotonic() - self._last_at >= self.interval

    def take(self, draft: RecipeDraft | None) -> dict[str, Any] | None:
        if draft is None:
            return None
        payload = draft.model_dump(exclude_none=True)
        if not payload or payload == self._last_payload:
            return None
        self._last_at = time.monotonic()
        self._last_payload = payload
        return payload


def _output_args(response_parts: list[Any]) -> str | dict[str, Any] | None:
    for part in reversed(response_parts):
        if isinstance(part, ToolCallPart) and part.tool_name == OUTPUT_TOOL_NAME:
            return part.args
    return None


async def generate_recipe_events(
    *,
    agent: Agent[RecipeAgentDeps, RecipeLLM],
    request: RecipeGenerationRequest,
    user_id: int,
    session_factory: sessionmaker[Session],
    draft_interval: float | None = None,
) -> AsyncIterator[str]:
    """Run one generation and yield SSE frames; always ends in ``complete`` or ``error``."""
    current: Stage | None = None
    stages: tuple[Stage, ...] = ("context", "thinking", "drafting", "saving")

    def advance(stage: Stage) -> str | None:
        nonlocal current
        if current is not None and stages.index(stage) <= stages.index(current):
            return None
        current = stage
        return format_sse("stage", {"stage": stage, "message": STAGE_MESSAGES[stage]})

    throttle = _DraftThrottle(
        settings.RECIPE_STREAM_DRAFT_INTERVAL_SECONDS
        if draft_interval is None
        else draft_interval
    )
    started = time.monotonic()
    if frame := advance("context"):
        yield frame

    db = session_factory()
    try:
        context = await run_in_threadpool(prefetch_user_context, user_id, db)
        cuisine = select_cuisine(request, context)
        prompt = build_recipe_prompt(request, context, cuisine)
        deps = RecipeAgentDeps(db=db, user_id=user_id)

        recipe_llm: RecipeLLM | None = None
        async with asyncio.timeout(settings.RECIPE_GENERATION_TIMEOUT_SECONDS):
            async with agent.iter(prompt, deps=deps) as run:
                async for node in run:
                    if not Agent.is_model_request_node(node):
                        continue
                    async with node.stream(run.ctx) as stream:
                        drafting = False
                        async for event in stream:
                            thinking_delta: str | None = None
                            if isinstance(event, PartStartEvent):
                                part = event.part
                                if isinstance(part, ThinkingPart):
                                    thinking_delta = part.content
                                elif isinstance(part, TextPart) and not drafting:
                                    thinking_delta = part.content
                                elif (
                                    isinstance(part, ToolCallPart)
                                    and part.tool_name == OUTPUT_TOOL_NAME
                                ):
                                    drafting = True
                                    if frame := advance("drafting"):
                                        yield frame
                            elif isinstance(event, PartDeltaEvent):
                                delta = event.delta
                                if isinstance(delta, ThinkingPartDelta):
                                    thinking_delta = delta.content_delta
                                elif isinstance(delta, TextPartDelta) and not drafting:
                                    thinking_delta = delta.content_delta

                            if thinking_delta:
                                if frame := advance("thinking"):
                                    yield frame
                                yield format_sse("thinking", {"delta": thinking_delta})

                            if drafting and throttle.due():
                                draft = parse_draft(_output_args(stream.response.parts))
                                if payload := throttle.take(draft):
                                    yield format_sse("draft", {"recipe": payload})

                        if drafting:
                            draft = parse_draft(_output_args(stream.response.parts))
                            if payload := throttle.take(draft):
                                yield format_sse("draft", {"recipe": payload})

                if run.result is not None:
                    recipe_llm = run.result.output

        if recipe_llm is None:
            raise RecipeStreamError(
                "The AI didn't return a recipe. Please try again.", True
            )

        if frame := advance("saving"):
            yield frame
        saved = await run_in_threadpool(
            save_generated_recipe, db, user_id, recipe_llm, request.difficulty
        )
        recipe = Recipe.model_validate(format_recipe_response(saved))
        logger.info(
            "Recipe generated user_id=%s recipe_id=%s ingredients=%s steps=%s elapsed=%.1fs",
            user_id,
            saved.id,
            len(recipe_llm.ingredients),
            len(recipe_llm.instructions),
            time.monotonic() - started,
        )
        yield format_sse("complete", {"recipe": recipe.model_dump(mode="json")})
    except Exception as exc:
        with contextlib.suppress(Exception):
            db.rollback()
        message, retryable = describe_error(exc)
        logger.exception(
            "Recipe generation failed user_id=%s stage=%s retryable=%s",
            user_id,
            current,
            retryable,
        )
        yield format_sse("error", {"message": message, "retryable": retryable})
    finally:
        db.close()


async def with_keepalive(
    frames: AsyncIterator[str], interval: float | None = None
) -> AsyncIterator[str]:
    """Interleave ``ping`` frames whenever ``frames`` is idle for ``interval`` seconds.

    The source runs in its own task so a slow model call never blocks the pings; if the
    client disconnects, that task (and with it the agent run) is cancelled.
    """
    interval = settings.RECIPE_STREAM_PING_SECONDS if interval is None else interval
    queue: asyncio.Queue[str | None] = asyncio.Queue()

    async def pump() -> None:
        try:
            async for frame in frames:
                queue.put_nowait(frame)
        finally:
            queue.put_nowait(None)

    task = asyncio.create_task(pump())
    try:
        while True:
            try:
                frame = await asyncio.wait_for(queue.get(), timeout=interval)
            except TimeoutError:
                yield format_sse("ping", {})
                continue
            if frame is None:
                break
            yield frame
        await task
    finally:
        if not task.done():
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task
