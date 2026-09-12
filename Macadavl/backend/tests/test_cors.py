import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import create_app

PREVIEW_ORIGIN = "https://abc123.ai-and-music-2026.pages.dev"
PAGES_REGEX = r"^https://([a-z0-9-]+\.)?ai-and-music-2026\.pages\.dev$"


def _preflight(client: TestClient, origin: str) -> str | None:
    res = client.options(
        "/api/health",
        headers={"Origin": origin, "Access-Control-Request-Method": "GET"},
    )
    return res.headers.get("access-control-allow-origin")


def test_configured_origin_is_allowed() -> None:
    with TestClient(create_app()) as client:
        assert _preflight(client, "http://localhost:5173") == "http://localhost:5173"


def test_unknown_origin_is_rejected_without_regex(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "cors_origin_regex", None)
    with TestClient(create_app()) as client:
        assert _preflight(client, PREVIEW_ORIGIN) is None


@pytest.mark.parametrize(
    "origin",
    [PREVIEW_ORIGIN, "https://ai-and-music-2026.pages.dev"],
)
def test_origin_matching_regex_is_allowed(monkeypatch: pytest.MonkeyPatch, origin: str) -> None:
    monkeypatch.setattr(settings, "cors_origin_regex", PAGES_REGEX)
    with TestClient(create_app()) as client:
        assert _preflight(client, origin) == origin


def test_origin_not_matching_regex_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "cors_origin_regex", PAGES_REGEX)
    with TestClient(create_app()) as client:
        assert _preflight(client, "https://evil.example.com") is None
