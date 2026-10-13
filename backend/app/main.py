from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.errors import register_error_handlers
from app.routers import discussions, health, leads


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="LeadFlow API", version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_error_handlers(app)

    app.include_router(health.router, prefix="/api")
    app.include_router(leads.router, prefix="/api")
    app.include_router(discussions.router, prefix="/api")
    return app


app = create_app()
