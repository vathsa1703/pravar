from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import LeadStatus
from app.schemas.lead import LeadCreate, LeadOut, LeadUpdate
from app.services import leads as lead_service

router = APIRouter(prefix="/leads", tags=["leads"])


class DayWindow:
    """The client's "today", as UTC instants: [start, end)."""

    def __init__(
        self,
        day_start: datetime | None = Query(None, description="Start of the client's day (ISO, UTC)"),
        day_end: datetime | None = Query(None, description="End of the client's day (ISO, UTC)"),
    ):
        if day_start is None or day_end is None:
            day_start, day_end = lead_service.default_day_window()
        if day_start.tzinfo is None or day_end.tzinfo is None or day_end <= day_start:
            raise HTTPException(
                422, "day_start and day_end must include a timezone, and day_end must be after day_start"
            )
        self.start, self.end = day_start, day_end


def _get_or_404(db: Session, lead_id: int, window: DayWindow) -> LeadOut:
    lead = lead_service.get_lead(db, lead_id, window.start, window.end)
    if lead is None:
        raise HTTPException(404, "Lead not found")
    return lead


@router.get("", response_model=list[LeadOut])
def list_leads(
    status: LeadStatus | None = None,
    q: str | None = Query(None, max_length=200, description="Search name or company"),
    window: DayWindow = Depends(),
    db: Session = Depends(get_db),
):
    return lead_service.list_leads(db, window.start, window.end, status=status, q=q)


@router.post("", response_model=LeadOut, status_code=201)
def create_lead(body: LeadCreate, window: DayWindow = Depends(), db: Session = Depends(get_db)):
    lead = lead_service.create_lead(db, body)
    return _get_or_404(db, lead.id, window)


@router.get("/{lead_id}", response_model=LeadOut)
def read_lead(lead_id: int, window: DayWindow = Depends(), db: Session = Depends(get_db)):
    return _get_or_404(db, lead_id, window)


@router.patch("/{lead_id}", response_model=LeadOut)
def update_lead(
    lead_id: int, body: LeadUpdate, window: DayWindow = Depends(), db: Session = Depends(get_db)
):
    if not lead_service.update_lead(db, lead_id, body):
        raise HTTPException(404, "Lead not found")
    return _get_or_404(db, lead_id, window)
