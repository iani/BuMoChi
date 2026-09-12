/**
 * Shared API contracts. Every interface here MUST match a Pydantic model in
 * backend/app/schemas.py field-for-field (names, optionality and types).
 */

export interface HealthResponse {
  status: 'ok'
  version: string
}
