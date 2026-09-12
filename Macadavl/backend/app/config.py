from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Runtime configuration, overridable via environment variables (prefix AUDIO_)."""

    model_config = SettingsConfigDict(env_prefix="AUDIO_", env_file=".env", extra="ignore")

    tmp_dir: Path = BACKEND_ROOT / "tmp"
    cors_origins: list[str] = ["http://localhost:5173"]
    cors_origin_regex: str | None = None
    max_upload_bytes: int = 50 * 1024 * 1024


settings = Settings()
