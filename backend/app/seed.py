"""Demo data. Run with:  python -m app.seed

Safe to run repeatedly: it wipes leads/discussions first, then re-creates them.
All dates are relative to "now", so the demo always looks current:
  - the two "today" cases are placed inside today's calendar day in YOUR time zone
    (the machine's, or SEED_UTC_OFFSET_MINUTES if set, e.g. 330 for IST)
  - overdue / future cases are whole days away from now.
"""
import os
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.db import SessionLocal
from app.models import Discussion, Lead, LeadStatus

NOW = datetime.now(timezone.utc)


def _local_day_bounds() -> tuple[datetime, datetime]:
    offset = os.environ.get("SEED_UTC_OFFSET_MINUTES")
    tz = timezone(timedelta(minutes=int(offset))) if offset else NOW.astimezone().tzinfo
    start = NOW.astimezone(tz).replace(hour=0, minute=0, second=0, microsecond=0)
    return start.astimezone(timezone.utc), (start + timedelta(days=1)).astimezone(timezone.utc)


DAY_START, DAY_END = _local_day_bounds()
# Up to 3 hours away, but never past midnight / before the start of the local day.
LATER_TODAY = NOW + min(timedelta(hours=3), (DAY_END - NOW) / 2)
EARLIER_TODAY = NOW - min(timedelta(hours=3), (NOW - DAY_START) / 2)


def ago(**kwargs) -> datetime:
    return NOW - timedelta(**kwargs)


def ahead(**kwargs) -> datetime:
    return NOW + timedelta(**kwargs)


# Each lead: its fields, then discussions oldest -> newest as (created_at, note, follow_up_at).
# The lead's next_follow_up_at is set explicitly (it equals the newest follow-up in the notes).
SEED = [
    {  # follow-up TODAY, a few hours ahead
        "lead": dict(name="Meera Iyer", company="Finwise Advisors", phone="+91 98450 12345",
                     status=LeadStatus.qualified, next_follow_up_at=LATER_TODAY),
        "discussions": [
            (ago(days=9), "Intro call. Interested in the wealth dashboard for her 40 advisors.", None),
            (ago(days=5), "Sent product overview deck. Asked about SSO and audit logs.", None),
            (ago(days=1, hours=2), "Demo went well. Needs sign-off from CTO before pricing.", LATER_TODAY),
        ],
    },
    {  # follow-up TODAY, but already passed this morning ("due earlier today")
        "lead": dict(name="Arjun Mehta", company="Northwind Capital", phone="+91 99001 88776",
                     status=LeadStatus.contacted, next_follow_up_at=EARLIER_TODAY),
        "discussions": [
            (ago(days=4), "Cold outreach by email. Replied asking for a call.", None),
            (ago(days=2), "Left voicemail. Will try again in the morning.", EARLIER_TODAY),
        ],
    },
    {  # OVERDUE by 3 days
        "lead": dict(name="Sofia Almeida", company="Bluepeak Insurance", phone="+351 912 345 678",
                     status=LeadStatus.proposal_sent, next_follow_up_at=ago(days=3)),
        "discussions": [
            (ago(days=14), "Discovery call. Wants a claims-tracking pilot for Q4.", None),
            (ago(days=10), "Shared requirements doc. Confirmed budget range.", None),
            (ago(days=7), "Sent proposal and pricing deck (3-year term).", None),
            (ago(days=6), "She is reviewing with finance. Follow up Friday.", ago(days=3)),
        ],
    },
    {  # FUTURE follow-up
        "lead": dict(name="Daniel Okafor", company="Lumen Health", phone="+234 803 555 0142",
                     status=LeadStatus.contacted, next_follow_up_at=ahead(days=4)),
        "discussions": [
            (ago(days=3), "Met at HealthTech Expo. Exchanged cards.", None),
            (ago(days=1), "Intro call. Interested in patient follow-up workflows. Send case study.",
             ahead(days=4)),
        ],
    },
    {  # NO discussions at all
        "lead": dict(name="Kavya Reddy", company="Tandem Labs", phone="+91 97311 20458",
                     status=LeadStatus.new, next_follow_up_at=None),
        "discussions": [],
    },
    {  # WON: its old follow-up must never show as overdue
        "lead": dict(name="Rohan Kapoor", company="Orbit Logistics", phone="+91 98200 33445",
                     status=LeadStatus.won, next_follow_up_at=ago(days=6)),
        "discussions": [
            (ago(days=30), "Intro call. Pain point: manual shipment status updates.", None),
            (ago(days=20), "Product demo for ops team. Very positive.", None),
            (ago(days=12), "Negotiated annual contract. Verbal yes.", ago(days=6)),
            (ago(days=8), "Contract signed. Onboarding kicks off next week.", None),
        ],
    },
    {  # LOST: ditto
        "lead": dict(name="Li Wei", company="Harbor Retail Group", phone="+65 8123 4567",
                     status=LeadStatus.lost, next_follow_up_at=ago(days=10)),
        "discussions": [
            (ago(days=25), "Intro call. Evaluating three vendors.", None),
            (ago(days=18), "Sent pricing. Asked for volume discount.", ago(days=10)),
            (ago(days=9), "Chose a competitor with an existing ERP integration. Closing as lost.", None),
        ],
    },
    {  # a second NEW lead with a little history, no follow-up
        "lead": dict(name="Priya Nair", company="Acme Textiles", phone="+91 98765 43210",
                     status=LeadStatus.new, next_follow_up_at=None),
        "discussions": [
            (ago(days=2), "Inbound form fill. Asked for a callback next week.", None),
            (ago(hours=20), "Tried calling, no answer. Sent a WhatsApp message.", None),
        ],
    },
]


def run() -> None:
    with SessionLocal() as db:
        db.execute(text("TRUNCATE leads, discussions RESTART IDENTITY CASCADE"))
        for entry in SEED:
            lead = Lead(**entry["lead"], created_at=ago(days=40))
            db.add(lead)
            db.flush()  # assigns lead.id
            for created_at, note, follow_up_at in entry["discussions"]:
                db.add(Discussion(lead_id=lead.id, note=note, follow_up_at=follow_up_at,
                                  created_at=created_at))
        db.commit()
    print(f"Seeded {len(SEED)} leads.")


if __name__ == "__main__":
    run()
