"""One JSON error shape for the whole API: {"detail": ..., "code": ...}.

Validation errors also carry an "errors" list ({field, message}) so the
frontend can show messages next to the right input.
"""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

logger = logging.getLogger("leadflow")

_CODES = {
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    422: "validation_error",
}


def _error(status_code: int, detail: str, code: str, **extra) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"detail": detail, "code": code, **extra})


def _field_name(loc: tuple) -> str:
    # loc looks like ("body", "name") or ("query", "status"); drop the first part.
    return ".".join(str(part) for part in loc[1:]) or "request"


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException):
        code = _CODES.get(exc.status_code, "http_error")
        return _error(exc.status_code, str(exc.detail), code)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        errors = [
            {
                "field": _field_name(err["loc"]),
                # pydantic prefixes custom messages with "Value error, "
                "message": err["msg"].removeprefix("Value error, "),
            }
            for err in exc.errors()
        ]
        return _error(422, "Validation failed", "validation_error", errors=errors)

    @app.exception_handler(Exception)
    async def unhandled_error(request: Request, exc: Exception):
        # Log the traceback server-side; never send it to the client.
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return _error(500, "Internal server error", "internal_error")
