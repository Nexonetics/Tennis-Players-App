from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List, Dict

class BasketballClubBase(BaseModel):
    name: str
    city: Optional[str] = None
    country: Optional[str] = None
    league: Optional[str] = None
    conference: Optional[str] = None
    founded_year: Optional[int] = None
    arena: Optional[str] = None
    capacity: Optional[int] = None
    head_coach: Optional[str] = None
    nickname: Optional[str] = None
    image_url: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    ranking: Optional[int] = None
    highest_ranking: Optional[int] = None
    highest_ranking_date: Optional[str] = None
    career_high_rank: Optional[int] = None
    career_high_date: Optional[str] = None
    category: Optional[str] = "men"
    titles: Optional[int] = 0
    playoff_appearances: Optional[int] = 0
    market_value: Optional[str] = None
    current_season_record: Optional[str] = None
    star_player: Optional[str] = None
    owner: Optional[str] = None
    general_manager: Optional[str] = None
    honors_json: Optional[Dict[str, int]] = None

class BasketballClubCreate(BasketballClubBase):
    pass

class BasketballClubUpdate(BasketballClubBase):
    name: Optional[str] = None

class BasketballClub(BasketballClubBase):
    id: int
    last_updated: datetime

    class Config:
        from_attributes = True

class BasketballClubList(BaseModel):
    items: List[BasketballClub]
    total: int
    page: int
    size: int
