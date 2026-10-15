"""Tests for the streamed recipe generation endpoint (SSE contract v2)."""

import asyncio
import json
from collections.abc import AsyncIterator

import pytest
from pydantic_ai.exceptions import ModelHTTPError
from pydantic_ai.messages import ModelMessage
from pydantic_ai.models.function import AgentInfo, DeltaToolCall, FunctionModel

from app.agents import pydantic_recipe_agent
from app.agents.demo_model import build_demo_model
from app.agents.pydantic_recipe_agent import (
    OUTPUT_TOOL_NAME,
    build_recipe_agent,
    get_recipe_agent,
)
from app.api.endpoints import recipes as recipes_endpoint
from app.core.config import settings
from app.models.recipe import Recipe as RecipeModel
from app.schemas.recipe import RecipeGenerationRequest
from app.services.recipe_stream import (
    describe_error,
    format_sse,
    generate_recipe_events,
    parse_draft,
    with_keepalive,
)
from tests.conftest import TestingSessionLocal

STREAM_URL = "/api/v1/recipes/generate/stream"


def parse_sse(body: str) -> list[tuple[str, dict]]:
    """Parse an event-stream body into ``(event, data)`` pairs."""
    events = []
    for block in body.replace("\r\n", "\n").split("\n\n"):
        if not block.strip():
            continue
        name = "message"
        data_lines = []
        for line in block.split("\n"):
            if line.startswith("event:"):
                name = line[len("event:") :].strip()
            elif line.startswith("data:"):
                data_lines.append(line[len("data:") :].lstrip())
        events.append((name, json.loads("\n".join(data_lines))))
    return events


@pytest.fixture
def use_agent(monkeypatch):
    """Point the endpoint at a specific agent."""

    def _use(agent):
        monkeypatch.setattr(recipes_endpoint, "get_recipe_agent", lambda: agent)
        return agent

    return _use


@pytest.fixture
def demo_agent(use_agent, monkeypatch):
    monkeypatch.setattr(settings, "RECIPE_STREAM_DRAFT_INTERVAL_SECONDS", 0.0)
    return use_agent(build_recipe_agent(build_demo_model(delay_scale=0)))


def _failing_model(exc: Exception) -> FunctionModel:
    async def stream(
        messages: list[ModelMessage], info: AgentInfo
    ) -> AsyncIterator[str]:
        raise exc
        yield ""  # pragma: no cover

    return FunctionModel(stream_function=stream)


def test_stream_emits_v2_events_in_order(client, auth_headers, db, demo_agent):
    response = client.post(
        STREAM_URL,
        headers=auth_headers,
        json={
            "meal_type": "dinner",
            "cuisine": "Thai",
            "ingredients_to_use": ["tofu"],
            "servings": 2,
            "difficulty": "Easy",
        },
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    events = parse_sse(response.text)
    names = [name for name, _ in events]

    assert events[0] == (
        "stage",
        {"stage": "context", "message": events[0][1]["message"]},
    )
    stages = [data["stage"] for name, data in events if name == "stage"]
    assert stages == ["context", "thinking", "drafting", "saving"]

    thinking_at = names.index("thinking")
    first_draft_at = names.index("draft")
    saving_at = next(
        i for i, (n, d) in enumerate(events) if n == "stage" and d["stage"] == "saving"
    )
    assert names.index("stage", 1) < thinking_at < first_draft_at < saving_at
    assert names[-1] == "complete"
    assert names.count("complete") == 1
    assert "error" not in names
    assert all(n != "draft" for n in names[saving_at:])

    thinking = "".join(d["delta"] for n, d in events if n == "thinking")
    assert "Thai" in thinking and "tofu" in thinking

    drafts = [d["recipe"] for n, d in events if n == "draft"]
    assert len(drafts) > 3
    assert len(drafts[-1]["ingredients"]) >= len(
        drafts[len(drafts) // 2].get("ingredients", [])
    )

    recipe = events[-1][1]["recipe"]
    assert isinstance(recipe["id"], int)
    assert drafts[-1]["name"] == recipe["name"]
    assert recipe["servings"] == 2
    assert recipe["cuisine"] == "Thai"
    assert recipe["difficulty"] == "easy"
    assert recipe["total_minutes"] == (
        recipe["prep_time_minutes"] + recipe["cook_time_minutes"]
    )
    assert any("tofu" in ing["name"] for ing in recipe["ingredients"])
    assert recipe["feedback"] is None

    detail = client.get(f"/api/v1/recipes/{recipe['id']}", headers=auth_headers)
    assert detail.status_code == 200
    assert detail.json() == recipe


def test_stream_maps_provider_errors(client, auth_headers, db, use_agent):
    use_agent(
        build_recipe_agent(
            _failing_model(ModelHTTPError(429, "grok", body="rate limit secret-detail"))
        )
    )

    response = client.post(STREAM_URL, headers=auth_headers, json={"servings": 2})

    assert response.status_code == 200
    events = parse_sse(response.text)
    assert [n for n, _ in events] == ["stage", "error"]
    error = events[-1][1]
    assert error["retryable"] is True
    assert "secret-detail" not in error["message"]
    assert "429" not in error["message"]
    assert db.query(RecipeModel).count() == 0


def test_stream_reports_invalid_model_output(client, auth_headers, db, use_agent):
    async def stream(messages: list[ModelMessage], info: AgentInfo):
        yield {0: DeltaToolCall(name=OUTPUT_TOOL_NAME, json_args='{"name": "Half')}

    use_agent(build_recipe_agent(FunctionModel(stream_function=stream)))

    response = client.post(STREAM_URL, headers=auth_headers, json={})

    events = parse_sse(response.text)
    assert events[-1][0] == "error"
    assert events[-1][1] == {
        "message": "The AI returned an incomplete recipe. Please try again.",
        "retryable": True,
    }
    assert db.query(RecipeModel).count() == 0


def test_stream_requires_auth(client):
    response = client.post(STREAM_URL, json={})
    assert response.status_code == 401


@pytest.fixture
def no_llm_keys(monkeypatch):
    monkeypatch.setattr(settings, "LLM_PROVIDER", "auto")
    monkeypatch.setattr(settings, "GROK_API_KEY", "")
    monkeypatch.setattr(settings, "TOGETHER_API_KEY", "")
    get_recipe_agent.cache_clear()
    yield
    get_recipe_agent.cache_clear()


def test_unconfigured_returns_503_in_production(
    client, auth_headers, monkeypatch, no_llm_keys
):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")

    response = client.post(STREAM_URL, headers=auth_headers, json={})

    assert response.status_code == 503
    assert response.json() == {"detail": "Recipe generation isn't available right now."}
    status = pydantic_recipe_agent.get_recipe_agent_status()
    assert status["configured"] is False


def test_auto_without_keys_uses_demo_outside_production(
    client, auth_headers, monkeypatch, no_llm_keys
):
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "DEMO_LLM_DELAY_SCALE", 0.0)

    status = pydantic_recipe_agent.get_recipe_agent_status()
    assert status["provider"] == "demo"
    assert status["configured"] is True

    response = client.post(STREAM_URL, headers=auth_headers, json={"servings": 3})
    events = parse_sse(response.text)
    assert events[-1][0] == "complete"
    assert events[-1][1]["recipe"]["servings"] == 3


def test_demo_provider_is_refused_in_production(monkeypatch):
    monkeypatch.setattr(settings, "LLM_PROVIDER", "demo")
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")

    status = pydantic_recipe_agent.get_recipe_agent_status()

    assert status["configured"] is False


@pytest.mark.asyncio
async def test_generate_events_with_agent_override(db, test_user, monkeypatch):
    monkeypatch.setattr(settings, "DEMO_LLM_DELAY_SCALE", 0.0)
    agent = build_recipe_agent(build_demo_model(delay_scale=1.0))

    with agent.override(model=build_demo_model(delay_scale=0)):
        frames = [
            frame
            async for frame in generate_recipe_events(
                agent=agent,
                request=RecipeGenerationRequest(meal_type="breakfast", servings=1),
                user_id=test_user.id,
                session_factory=TestingSessionLocal,
                draft_interval=0,
            )
        ]

    events = parse_sse("".join(frames))
    assert events[-1][0] == "complete"
    assert events[-1][1]["recipe"]["servings"] == 1
    assert "breakfast" in events[-1][1]["recipe"]["tags"]


@pytest.mark.asyncio
async def test_keepalive_pings_while_idle():
    async def slow() -> AsyncIterator[str]:
        yield format_sse("stage", {"stage": "context", "message": "x"})
        await asyncio.sleep(0.08)
        yield format_sse("complete", {"recipe": {}})

    frames = [frame async for frame in with_keepalive(slow(), interval=0.02)]
    names = [name for name, _ in parse_sse("".join(frames))]

    assert names[0] == "stage"
    assert names[-1] == "complete"
    assert "ping" in names[1:-1]


@pytest.mark.asyncio
async def test_keepalive_cancels_source_when_closed():
    cancelled = asyncio.Event()

    async def forever() -> AsyncIterator[str]:
        try:
            yield format_sse("stage", {"stage": "context", "message": "x"})
            await asyncio.sleep(10)
        finally:
            cancelled.set()

    stream = with_keepalive(forever(), interval=5)
    await stream.__anext__()
    await stream.aclose()

    await asyncio.wait_for(cancelled.wait(), timeout=1)


def test_format_sse_frame():
    assert format_sse("thinking", {"delta": "hé\nllo"}) == (
        'event: thinking\ndata: {"delta":"hé\\nllo"}\n\n'
    )


@pytest.mark.parametrize(
    ("args", "expected"),
    [
        (None, None),
        ('{"na', {}),
        ('{"name": "Thai Ba', {"name": "Thai Ba"}),
        (
            '{"name": "X", "ingredients": [{"name": "rice", "quantity": 1.',
            {"name": "X", "ingredients": [{"name": "rice"}]},
        ),
        ({"name": "X", "servings": 2}, {"name": "X", "servings": 2}),
        ('{"servings": "fo', None),
    ],
)
def test_parse_draft_handles_partial_json(args, expected):
    draft = parse_draft(args)
    if expected is None:
        assert draft is None
    else:
        assert draft.model_dump(exclude_none=True) == expected


@pytest.mark.parametrize(
    ("exc", "retryable"),
    [
        (ModelHTTPError(429, "m"), True),
        (ModelHTTPError(401, "m"), False),
        (ModelHTTPError(503, "m"), True),
        (TimeoutError(), True),
        (ValueError("boom: internal detail"), True),
    ],
)
def test_describe_error_is_friendly(exc, retryable):
    message, is_retryable = describe_error(exc)
    assert is_retryable is retryable
    assert "internal detail" not in message
    assert message.endswith(".")


def test_placeholder_keys_count_as_missing(monkeypatch, no_llm_keys):
    monkeypatch.setattr(settings, "ENVIRONMENT", "prod")
    monkeypatch.setattr(settings, "GROK_API_KEY", "your-grok-api-key-here")

    assert pydantic_recipe_agent.get_recipe_agent_status()["configured"] is False

    monkeypatch.setattr(settings, "GROK_API_KEY", "xai-real-looking-key")
    assert pydantic_recipe_agent.get_recipe_agent_status()["provider"] == "grok"
