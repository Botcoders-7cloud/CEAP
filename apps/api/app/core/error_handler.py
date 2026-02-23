"""
CEAP — Global Error Handler
Catches unhandled exceptions and returns clean JSON responses.
"""
import traceback
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Catch unhandled exceptions and return structured JSON errors."""

    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except Exception as exc:
            # Log the full traceback (visible in Render logs)
            print(f"❌ Unhandled error on {request.method} {request.url.path}:")
            traceback.print_exc()

            return JSONResponse(
                status_code=500,
                content={
                    "detail": "An internal server error occurred. Please try again later.",
                    "path": request.url.path,
                },
            )
