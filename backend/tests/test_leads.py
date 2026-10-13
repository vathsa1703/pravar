from datetime import datetime, timedelta, timezone

# A fixed "today" so the tests do not depend on the wall clock:
# the client's day is 2026-06-15 in UTC.
DAY_START = datetime(2026, 6, 15, tzinfo=timezone.utc)
DAY_END = DAY_START + timedelta(days=1)
WINDOW = {"day_start": DAY_START.isoformat(), "day_end": DAY_END.isoformat()}


def iso(dt: datetime) -> str:
    return dt.isoformat()


def test_create_lead_defaults(client):
    response = client.post("/api/leads", json={"name": "  Asha Rao  "})
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Asha Rao"  # trimmed
    assert body["status"] == "new"  # default
    assert body["company"] is None
    assert body["last_note"] is None
    assert body["next_follow_up_at"] is None


def test_create_lead_requires_name(client):
    response = client.post("/api/leads", json={"name": "   "})
    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "validation_error"
    assert body["errors"][0]["field"] == "name"


def test_create_lead_rejects_bad_status_and_phone(client):
    assert client.post("/api/leads", json={"name": "A", "status": "nope"}).status_code == 422
    assert client.post("/api/leads", json={"name": "A", "phone": "abc"}).status_code == 422


def test_create_lead_accepts_international_phone(client):
    response = client.post("/api/leads", json={"name": "A", "phone": "+44 (0)20 7946 0958"})
    assert response.status_code == 201


def test_get_unknown_lead_is_404_with_error_shape(client):
    response = client.get("/api/leads/999")
    assert response.status_code == 404
    assert response.json() == {"detail": "Lead not found", "code": "not_found"}


def test_patch_status_persists(client, make_lead):
    lead = make_lead()
    response = client.patch(f"/api/leads/{lead['id']}", json={"status": "qualified"})
    assert response.status_code == 200
    assert response.json()["status"] == "qualified"
    assert client.get(f"/api/leads/{lead['id']}").json()["status"] == "qualified"


def test_patch_invalid_status_is_422(client, make_lead):
    lead = make_lead()
    assert client.patch(f"/api/leads/{lead['id']}", json={"status": "bogus"}).status_code == 422


def test_patch_unknown_lead_is_404(client):
    assert client.patch("/api/leads/999", json={"status": "won"}).status_code == 404


def test_patch_can_clear_follow_up(client, make_lead):
    lead = make_lead()
    client.post(
        f"/api/leads/{lead['id']}/discussions",
        json={"note": "call", "follow_up_at": iso(DAY_END + timedelta(days=3))},
    )
    response = client.patch(f"/api/leads/{lead['id']}", json={"next_follow_up_at": None})
    assert response.status_code == 200
    assert response.json()["next_follow_up_at"] is None


def test_list_orders_todays_follow_ups_first(client, make_lead):
    quiet = make_lead(name="Quiet")
    later_today = make_lead(name="Later today")
    earlier_today = make_lead(name="Earlier today")
    recent = make_lead(name="Recent activity")

    def follow_up(lead, when):
        client.post(f"/api/leads/{lead['id']}/discussions", json={"note": "n", "follow_up_at": iso(when)})

    follow_up(later_today, DAY_START + timedelta(hours=15))
    follow_up(earlier_today, DAY_START + timedelta(hours=9))
    client.post(f"/api/leads/{recent['id']}/discussions", json={"note": "most recent"})

    leads = client.get("/api/leads", params=WINDOW).json()
    assert [l["name"] for l in leads] == ["Earlier today", "Later today", "Recent activity", "Quiet"]
    assert [l["follow_up_today"] for l in leads] == [True, True, False, False]
    assert quiet["id"] in [l["id"] for l in leads]


def test_overdue_rules(client, make_lead):
    overdue = make_lead(name="Overdue")
    won = make_lead(name="Won", status="won")
    future = make_lead(name="Future")
    for lead, when in [
        (overdue, DAY_START - timedelta(days=2)),
        (won, DAY_START - timedelta(days=2)),
        (future, DAY_END + timedelta(days=2)),
    ]:
        client.post(f"/api/leads/{lead['id']}/discussions", json={"note": "n", "follow_up_at": iso(when)})

    by_name = {l["name"]: l for l in client.get("/api/leads", params=WINDOW).json()}
    assert by_name["Overdue"]["is_overdue"] is True
    assert by_name["Won"]["is_overdue"] is False  # closed leads are never overdue
    assert by_name["Future"]["is_overdue"] is False


def test_follow_up_just_after_midnight_belongs_to_the_client_day(client, make_lead):
    """00:30 next day is NOT today; 23:30 today IS. The window decides, not UTC."""
    late = make_lead(name="Late")
    after_midnight = make_lead(name="After midnight")
    client.post(
        f"/api/leads/{late['id']}/discussions",
        json={"note": "n", "follow_up_at": iso(DAY_END - timedelta(minutes=30))},
    )
    client.post(
        f"/api/leads/{after_midnight['id']}/discussions",
        json={"note": "n", "follow_up_at": iso(DAY_END + timedelta(minutes=30))},
    )
    by_name = {l["name"]: l for l in client.get("/api/leads", params=WINDOW).json()}
    assert by_name["Late"]["follow_up_today"] is True
    assert by_name["After midnight"]["follow_up_today"] is False


def test_filter_by_status(client, make_lead):
    make_lead(name="A", status="new")
    make_lead(name="B", status="won")
    leads = client.get("/api/leads", params={"status": "won"}).json()
    assert [l["name"] for l in leads] == ["B"]
    assert client.get("/api/leads", params={"status": "bogus"}).status_code == 422


def test_search_matches_name_and_company_case_insensitively(client, make_lead):
    make_lead(name="Priya Nair", company="Acme")
    make_lead(name="Rahul", company="Priyanka Traders")
    make_lead(name="Other", company="Zed")
    names = [l["name"] for l in client.get("/api/leads", params={"q": "PRIYA"}).json()]
    assert sorted(names) == ["Priya Nair", "Rahul"]


def test_search_treats_percent_literally(client, make_lead):
    make_lead(name="Alpha")
    assert client.get("/api/leads", params={"q": "%"}).json() == []


def test_search_and_status_combine(client, make_lead):
    make_lead(name="Priya Nair", status="won")
    make_lead(name="Priya Rao", status="new")
    leads = client.get("/api/leads", params={"q": "priya", "status": "new"}).json()
    assert [l["name"] for l in leads] == ["Priya Rao"]


def test_invalid_day_window_is_422(client):
    response = client.get("/api/leads", params={"day_start": iso(DAY_END), "day_end": iso(DAY_START)})
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"
