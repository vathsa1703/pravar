"""Test setup: a real Postgres test database, built by running the Alembic migrations.

The test DB is <your DB name>_test on the same server as DATABASE_URL
(or set TEST_DATABASE_URL). It is created if missing. It never touches your dev data.
"""
import os

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

from app.config import Settings

# Same source as the app: env vars first, then .env.
_base_url = make_url(Settings().database_url)
_test_url = make_url(
    os.environ.get("TEST_DATABASE_URL")
    or _base_url.set(database=f"{_base_url.database}_test").render_as_string(hide_password=False)
)
# Must happen before importing the app: app.db builds its engine at import time.
os.environ["DATABASE_URL"] = _test_url.render_as_string(hide_password=False)

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db import engine  # noqa: E402
from app.main import app  # noqa: E402


def _ensure_database_exists() -> None:
    admin = create_engine(_test_url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        exists = conn.scalar(
            text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": _test_url.database}
        )
        if not exists:
            conn.execute(text(f'CREATE DATABASE "{_test_url.database}"'))
    admin.dispose()


@pytest.fixture(scope="session", autouse=True)
def _database():
    _ensure_database_exists()
    command.upgrade(Config("alembic.ini"), "head")
    yield
    engine.dispose()


@pytest.fixture(autouse=True)
def _clean_tables(_database):
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE leads, discussions RESTART IDENTITY CASCADE"))


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def make_lead(client):
    def _make(**fields):
        body = {"name": "Test Lead", **fields}
        response = client.post("/api/leads", json=body)
        assert response.status_code == 201, response.text
        return response.json()

    return _make
