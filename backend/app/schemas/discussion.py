from datetime import datetime

from pydantic import AwareDatetime, BaseModel, ConfigDict, field_validator

from app.schemas.lead import LeadOut

NOTE_MAX_LENGTH = 5000


class DiscussionCreate(BaseModel):
    note: str
    # Optional. Past dates are allowed (a rep may log a missed follow-up).
    follow_up_at: AwareDatetime | None = None

    @field_validator("note")
    @classmethod
    def _clean_note(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Note is required")
        if len(value) > NOTE_MAX_LENGTH:
            raise ValueError(f"Note must be at most {NOTE_MAX_LENGTH} characters")
        return value


class DiscussionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    note: str
    follow_up_at: datetime | None
    created_at: datetime


class DiscussionCreated(BaseModel):
    """Returned by POST so the client can update its list from one response."""

    discussion: DiscussionOut
    lead: LeadOut
