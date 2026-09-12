"""Pydantic models exposed over the API.

Every model here MUST match the TypeScript interface of the same name in
frontend/src/types/api.ts field-for-field (names, optionality and types).
"""

from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["ok"]
    version: str
