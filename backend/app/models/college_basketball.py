from sqlalchemy import Column, String, DateTime, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.db.session import Base


class CollegeBasketballSnapshot(Base):
    """College basketball odds + team records, in the same shape as
    web/src/data/json/college_basketball.json.

    Only the row with key='latest' is kept (overwritten on each pull), so storage
    stays around 0.5 MB instead of growing by that much every day.
    """
    __tablename__ = "college_basketball_snapshots"

    key = Column(String, primary_key=True)
    payload = Column(JSON().with_variant(JSONB(), "postgresql"), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
