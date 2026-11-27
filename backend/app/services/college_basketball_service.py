import hmac
import os
import sys

from sqlalchemy.orm import Session

from app.models.college_basketball import CollegeBasketballSnapshot

try:
    # In the Lambda zip, deploy_lambda.sh copies the module next to app/.
    import college_basketball_odds as cbb
except ImportError:
    # Local dev: the module lives in <repo>/scraper.
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "scraper")))
    import college_basketball_odds as cbb

LATEST_KEY = "latest"
# A second press within this window returns the data just pulled instead of spending credits again.
MIN_SECONDS_BETWEEN_PULLS = 120


class RefreshError(Exception):
    pass


def admin_key_ok(provided: str | None) -> bool:
    expected = os.getenv("ADMIN_API_KEY", "")
    if not expected or not provided:
        return False
    return hmac.compare_digest(provided.encode(), expected.encode())


def get_latest(db: Session) -> dict | None:
    row = db.get(CollegeBasketballSnapshot, LATEST_KEY)
    return row.payload if row else None


def save_latest(db: Session, payload: dict) -> None:
    row = db.get(CollegeBasketballSnapshot, LATEST_KEY)
    if row:
        row.payload = payload
    else:
        db.add(CollegeBasketballSnapshot(key=LATEST_KEY, payload=payload))
    db.commit()


def refresh(db: Session) -> dict:
    """Pull fresh odds (spends ~6 Odds API credits) and ESPN records, store and return them."""
    api_key = os.getenv("ODDS_API_KEY", "").strip()
    if not api_key:
        raise RefreshError("ODDS_API_KEY is not configured on the server")

    previous = get_latest(db) or {}
    age_hours = cbb.hours_since(cbb.last_odds_pull(previous))
    if age_hours is not None and age_hours * 3600 < MIN_SECONDS_BETWEEN_PULLS:
        return previous

    try:
        payload = cbb.build_payload(previous, cbb.OddsClient(api_key))
    except cbb.FetchError as exc:  # message already has the API key scrubbed
        raise RefreshError(str(exc)) from None

    save_latest(db, payload)
    return payload
