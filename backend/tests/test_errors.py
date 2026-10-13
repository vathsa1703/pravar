from fastapi.testclient import TestClient

from app.main import app


def test_unknown_route_uses_error_shape(client):
    response = client.get("/api/nope")
    assert response.status_code == 404
    assert set(response.json()) == {"detail", "code"}


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_unhandled_exception_returns_500_without_leaking_details():
    @app.get("/api/_boom")
    def boom():
        raise RuntimeError("secret internal detail")

    response = TestClient(app, raise_server_exceptions=False).get("/api/_boom")
    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error", "code": "internal_error"}
    assert "secret" not in response.text
