from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List, Dict

class BasketballNationalTeamBase(BaseModel):
    name: str
    country: Optional[str] = None
    confederation: Optional[str] = None
    founded_year: Optional[int] = None
    stadium: Optional[str] = None
    manager: Optional[str] = None
    nickname: Optional[str] = None
    image_url: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    ranking: Optional[int] = None
    category: Optional[str] = "men"
    
    # Enhanced Statistics
    total_trophies: Optional[int] = 0
    world_cup_titles: Optional[int] = 0
    captain: Optional[str] = None
    main_rivals: Optional[str] = None
    
    # Detailed Honors
    honors_json: Optional[Dict[str, int]] = None

class BasketballNationalTeamCreate(BasketballNationalTeamBase):
    pass

class BasketballNationalTeamUpdate(BasketballNationalTeamBase):
    name: Optional[str] = None

class BasketballRankingHistoryPoint(BaseModel):
    ranking: int
    date: date

class BasketballNationalTeam(BasketballNationalTeamBase):
    id: int
    last_updated: Optional[datetime] = None
    ranking_history: Optional[List[BasketballRankingHistoryPoint]] = None
    highest_ranking: Optional[int] = None
    highest_ranking_date: Optional[date] = None
    career_high_rank: Optional[int] = None
    career_high_date: Optional[date] = None

    class Config:
        from_attributes = True

class BasketballNationalTeamList(BaseModel):
    items: List[BasketballNationalTeam]
    total: int
    page: int
    size: int
