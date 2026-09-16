from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List


class TtPlayerBase(BaseModel):
    name: str
    country: Optional[str] = None
    ranking: Optional[int] = None
    highest_ranking: Optional[int] = None
    highest_ranking_date: Optional[date] = None
    birth_date: Optional[date] = None
    weight: Optional[str] = None
    playing_style: Optional[str] = None
    win_percentage: Optional[float] = None
    image_url: Optional[str] = None
    source: Optional[str] = None
    gender: Optional[str] = None


class TtPlayerCreate(TtPlayerBase):
    pass


class TtPlayerUpdate(TtPlayerBase):
    name: Optional[str] = None


class TtRankingHistoryPoint(BaseModel):
    ranking: int
    date: date


class TtPlayer(TtPlayerBase):
    id: int
    last_updated: Optional[datetime] = None
    ranking_history: Optional[List[TtRankingHistoryPoint]] = None
    career_high_rank: Optional[int] = None
    career_high_date: Optional[date] = None

    class Config:
        from_attributes = True


class TtPlayerList(BaseModel):
    items: List[TtPlayer]
    total: int
    page: int
    size: int

