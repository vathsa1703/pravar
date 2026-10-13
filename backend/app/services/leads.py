from datetime import datetime, timedelta, timezone

from sqlalchemy import Select, and_, case, func, or_, select, true
from sqlalchemy.orm import Session

from app.models import CLOSED_STATUSES, Discussion, Lead, LeadStatus
from app.schemas.lead import LeadCreate, LeadOut, LeadUpdate


def default_day_window() -> tuple[datetime, datetime]:
    """Fallback "today" (UTC) when the client does not send its own window."""
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    return start, start + timedelta(days=1)


def _escape_like(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _is_today(day_start: datetime, day_end: datetime):
    """Open lead whose follow-up falls inside the client's day."""
    return and_(
        Lead.status.not_in(CLOSED_STATUSES),
        Lead.next_follow_up_at >= day_start,
        Lead.next_follow_up_at < day_end,
    )


def _is_overdue(day_start: datetime):
    """Open lead whose follow-up is before the start of the client's day."""
    return and_(Lead.status.not_in(CLOSED_STATUSES), Lead.next_follow_up_at < day_start)


def _lead_summary_query(day_start: datetime, day_end: datetime) -> Select:
    """Leads + their latest discussion + today/overdue flags, computed in SQL.

    The LATERAL subquery runs once per lead and picks only its newest
    discussion (index ix_discussions_lead_id_created_at makes that cheap).
    """
    latest = (
        select(Discussion.note.label("note"), Discussion.created_at.label("created_at"))
        .where(Discussion.lead_id == Lead.id)
        .order_by(Discussion.created_at.desc(), Discussion.id.desc())
        .limit(1)
        .lateral("latest")
    )
    return (
        select(
            Lead,
            latest.c.note.label("last_note"),
            latest.c.created_at.label("last_discussion_at"),
            # A NULL follow-up makes the comparison NULL, so coalesce to False.
            func.coalesce(_is_today(day_start, day_end), False).label("follow_up_today"),
            func.coalesce(_is_overdue(day_start), False).label("is_overdue"),
        )
        .select_from(Lead)
        .outerjoin(latest, true())
    )


def _to_out(row) -> LeadOut:
    lead = row.Lead
    return LeadOut(
        id=lead.id,
        name=lead.name,
        company=lead.company,
        phone=lead.phone,
        status=lead.status,
        next_follow_up_at=lead.next_follow_up_at,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
        last_note=row.last_note,
        last_discussion_at=row.last_discussion_at,
        follow_up_today=row.follow_up_today,
        is_overdue=row.is_overdue,
    )


def list_leads(
    db: Session,
    day_start: datetime,
    day_end: datetime,
    status: LeadStatus | None = None,
    q: str | None = None,
) -> list[LeadOut]:
    query = _lead_summary_query(day_start, day_end)

    if status is not None:
        query = query.where(Lead.status == status)
    if q and q.strip():
        pattern = f"%{_escape_like(q.strip())}%"
        query = query.where(
            or_(Lead.name.ilike(pattern, escape="\\"), Lead.company.ilike(pattern, escape="\\"))
        )

    today = _is_today(day_start, day_end)
    # Last activity = newest discussion, or the lead's creation time if it has none.
    last_activity = func.coalesce(query.selected_columns.last_discussion_at, Lead.created_at)
    query = query.order_by(
        case((today, 0), else_=1),  # 1. today's follow-ups first...
        case((today, Lead.next_follow_up_at)).asc(),  # 2. ...ordered by follow-up time
        last_activity.desc(),  # 3. everyone else: most recent activity first
        Lead.id.desc(),
    )
    return [_to_out(row) for row in db.execute(query)]


def get_lead(db: Session, lead_id: int, day_start: datetime, day_end: datetime) -> LeadOut | None:
    row = db.execute(_lead_summary_query(day_start, day_end).where(Lead.id == lead_id)).first()
    return _to_out(row) if row else None


def create_lead(db: Session, data: LeadCreate) -> Lead:
    lead = Lead(**data.model_dump())
    db.add(lead)
    db.commit()
    return lead


def update_lead(db: Session, lead_id: int, data: LeadUpdate) -> bool:
    """Apply only the fields the client sent. Returns False if the lead is missing."""
    lead = db.get(Lead, lead_id)
    if lead is None:
        return False
    for field in data.model_fields_set:
        setattr(lead, field, getattr(data, field))
    db.commit()
    return True
