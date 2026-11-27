from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services import college_basketball_service as service

router = APIRouter()


@router.get("")
def get_college_basketball(db: Session = Depends(get_db)):
    payload = service.get_latest(db)
    if payload is None:
        raise HTTPException(status_code=404, detail="No college basketball data yet")
    return payload


@router.post("/refresh")
def refresh_college_basketball(
    x_admin_key: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Admin-only: pull fresh odds now. Each pull costs ~6 of the 500 monthly Odds API credits."""
    if not service.admin_key_ok(x_admin_key):
        raise HTTPException(status_code=401, detail="Wrong or missing admin password")
    try:
        return service.refresh(db)
    except service.RefreshError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
