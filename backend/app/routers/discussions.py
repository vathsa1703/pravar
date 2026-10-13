from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.routers.leads import DayWindow
from app.schemas.discussion import DiscussionCreate, DiscussionCreated, DiscussionOut
from app.services import discussions as discussion_service
from app.services import leads as lead_service

router = APIRouter(prefix="/leads/{lead_id}/discussions", tags=["discussions"])


@router.get("", response_model=list[DiscussionOut])
def list_discussions(lead_id: int, db: Session = Depends(get_db)):
    discussions = discussion_service.list_discussions(db, lead_id)
    if discussions is None:
        raise HTTPException(404, "Lead not found")
    return discussions


@router.post("", response_model=DiscussionCreated, status_code=201)
def add_discussion(
    lead_id: int,
    body: DiscussionCreate,
    window: DayWindow = Depends(),
    db: Session = Depends(get_db),
):
    discussion = discussion_service.add_discussion(db, lead_id, body)
    if discussion is None:
        raise HTTPException(404, "Lead not found")
    lead = lead_service.get_lead(db, lead_id, window.start, window.end)
    return {"discussion": discussion, "lead": lead}
