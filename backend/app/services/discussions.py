from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Discussion, Lead
from app.schemas.discussion import DiscussionCreate


def list_discussions(db: Session, lead_id: int) -> list[Discussion] | None:
    """Newest first. Returns None if the lead does not exist."""
    if db.get(Lead, lead_id) is None:
        return None
    query = (
        select(Discussion)
        .where(Discussion.lead_id == lead_id)
        .order_by(Discussion.created_at.desc(), Discussion.id.desc())
    )
    return list(db.scalars(query))


def add_discussion(db: Session, lead_id: int, data: DiscussionCreate) -> Discussion | None:
    """Insert a discussion and, if it carries a follow-up, move the lead's follow-up.

    Both writes happen in ONE transaction (a single commit): either the note
    and the new follow-up are both saved, or neither is. Returns None if the
    lead does not exist.

    No follow-up on the discussion -> the lead's existing follow-up is untouched.
    """
    lead = db.get(Lead, lead_id)
    if lead is None:
        return None

    discussion = Discussion(lead_id=lead_id, note=data.note, follow_up_at=data.follow_up_at)
    db.add(discussion)
    if data.follow_up_at is not None:
        lead.next_follow_up_at = data.follow_up_at

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return discussion
