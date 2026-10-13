from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.db import engine

FOLLOW_UP = datetime(2026, 7, 1, 10, 0, tzinfo=timezone.utc)


def test_add_discussion_returns_201_with_updated_lead(client, make_lead):
    lead = make_lead()
    response = client.post(
        f"/api/leads/{lead['id']}/discussions",
        json={"note": "  Intro call  ", "follow_up_at": FOLLOW_UP.isoformat()},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["discussion"]["note"] == "Intro call"  # trimmed
    assert body["lead"]["last_note"] == "Intro call"
    assert body["lead"]["last_discussion_at"] is not None
    assert datetime.fromisoformat(body["lead"]["next_follow_up_at"]) == FOLLOW_UP


def test_discussion_with_follow_up_updates_lead_follow_up(client, make_lead):
    lead = make_lead()
    client.post(
        f"/api/leads/{lead['id']}/discussions",
        json={"note": "n", "follow_up_at": FOLLOW_UP.isoformat()},
    )
    stored = client.get(f"/api/leads/{lead['id']}").json()
    assert datetime.fromisoformat(stored["next_follow_up_at"]) == FOLLOW_UP


def test_discussion_without_follow_up_keeps_existing_follow_up(client, make_lead):
    lead = make_lead()
    client.post(
        f"/api/leads/{lead['id']}/discussions",
        json={"note": "first", "follow_up_at": FOLLOW_UP.isoformat()},
    )
    response = client.post(f"/api/leads/{lead['id']}/discussions", json={"note": "second"})
    assert response.status_code == 201
    assert datetime.fromisoformat(response.json()["lead"]["next_follow_up_at"]) == FOLLOW_UP


def test_discussions_are_newest_first(client, make_lead):
    lead = make_lead()
    for note in ["first", "second", "third"]:
        client.post(f"/api/leads/{lead['id']}/discussions", json={"note": note})
    notes = [d["note"] for d in client.get(f"/api/leads/{lead['id']}/discussions").json()]
    assert notes == ["third", "second", "first"]


def test_list_row_reflects_latest_note(client, make_lead):
    lead = make_lead()
    client.post(f"/api/leads/{lead['id']}/discussions", json={"note": "old"})
    client.post(f"/api/leads/{lead['id']}/discussions", json={"note": "newest"})
    row = client.get("/api/leads").json()[0]
    assert row["last_note"] == "newest"


def test_blank_note_is_422(client, make_lead):
    lead = make_lead()
    response = client.post(f"/api/leads/{lead['id']}/discussions", json={"note": "   "})
    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "note"


def test_too_long_note_is_422(client, make_lead):
    lead = make_lead()
    response = client.post(f"/api/leads/{lead['id']}/discussions", json={"note": "x" * 5001})
    assert response.status_code == 422


def test_invalid_follow_up_is_422(client, make_lead):
    lead = make_lead()
    response = client.post(
        f"/api/leads/{lead['id']}/discussions", json={"note": "n", "follow_up_at": "not a date"}
    )
    assert response.status_code == 422


def test_past_follow_up_is_allowed(client, make_lead):
    lead = make_lead()
    past = datetime.now(timezone.utc) - timedelta(days=5)
    response = client.post(
        f"/api/leads/{lead['id']}/discussions", json={"note": "n", "follow_up_at": past.isoformat()}
    )
    assert response.status_code == 201


def test_unknown_lead_is_404_for_both_endpoints(client):
    assert client.get("/api/leads/999/discussions").status_code == 404
    response = client.post("/api/leads/999/discussions", json={"note": "n"})
    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


def test_deleting_a_lead_cascades_to_discussions(client, make_lead):
    lead = make_lead()
    client.post(f"/api/leads/{lead['id']}/discussions", json={"note": "n"})
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM leads WHERE id = :id"), {"id": lead["id"]})
        count = conn.scalar(text("SELECT count(*) FROM discussions"))
    assert count == 0
