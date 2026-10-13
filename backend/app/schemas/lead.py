import re
from datetime import datetime

from pydantic import AwareDatetime, BaseModel, ConfigDict, field_validator

from app.models import LeadStatus

# Light phone check: digits plus common separators, optional leading +.
# Deliberately permissive so international formats are not rejected.
_PHONE_RE = re.compile(r"^\+?[\d\s().\-]+$")


def _clean_name(value: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError("Name is required")
    if len(value) > 200:
        raise ValueError("Name must be at most 200 characters")
    return value


def _clean_company(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    if len(value) > 200:
        raise ValueError("Company must be at most 200 characters")
    return value or None


def _clean_phone(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    if not value:
        return None
    digits = sum(c.isdigit() for c in value)
    if not _PHONE_RE.match(value) or digits < 5 or len(value) > 50:
        raise ValueError("Enter a valid phone number, e.g. +91 98765 43210")
    return value


class LeadCreate(BaseModel):
    name: str
    company: str | None = None
    phone: str | None = None
    status: LeadStatus = LeadStatus.new

    _name = field_validator("name")(_clean_name)
    _company = field_validator("company")(_clean_company)
    _phone = field_validator("phone")(_clean_phone)


class LeadUpdate(BaseModel):
    """PATCH body. Only fields that are sent are changed.

    Sending next_follow_up_at: null explicitly clears the follow-up.
    """

    name: str | None = None
    company: str | None = None
    phone: str | None = None
    status: LeadStatus | None = None
    next_follow_up_at: AwareDatetime | None = None

    @field_validator("name")
    @classmethod
    def _name_not_blank(cls, value: str | None) -> str | None:
        if value is None:
            raise ValueError("Name cannot be null")
        return _clean_name(value)

    _company = field_validator("company")(_clean_company)
    _phone = field_validator("phone")(_clean_phone)

    @field_validator("status")
    @classmethod
    def _status_not_null(cls, value: LeadStatus | None) -> LeadStatus | None:
        if value is None:
            raise ValueError("Status cannot be null")
        return value


class LeadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    company: str | None
    phone: str | None
    status: LeadStatus
    next_follow_up_at: datetime | None
    created_at: datetime
    updated_at: datetime
    # Computed by the list query (see services/leads.py)
    last_note: str | None
    last_discussion_at: datetime | None
    follow_up_today: bool
    is_overdue: bool
