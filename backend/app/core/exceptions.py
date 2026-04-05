"""
Autonomous — Custom Exceptions & Error Response Schema

Provides:
  - ``AppException``   — custom exception with status_code, error_code, and message
  - ``ErrorResponse``  — Pydantic model for the standardised error response body

Standardised error response format:
  {
    "error": {
      "code": "RATE_LIMIT_EXCEEDED",
      "message": "Rate limit exceeded. Try again later."
    }
  }
"""

from __future__ import annotations

from pydantic import BaseModel


class AppException(Exception):
    """Application-level exception with a structured error code and HTTP status."""

    def __init__(self, status_code: int, error_code: str, message: str) -> None:
        self.status_code = status_code
        self.error_code = error_code
        self.message = message
        super().__init__(message)


class ErrorDetail(BaseModel):
    """Inner detail object for the error response."""

    code: str
    message: str


class ErrorResponse(BaseModel):
    """Standardised JSON error response body."""

    error: ErrorDetail
