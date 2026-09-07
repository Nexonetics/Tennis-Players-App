from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.basketball_national_team import BasketballNationalTeam, BasketballHistoricalTeam, BasketballHistoricalRanking
from app.schemas.basketball_national_team import BasketballNationalTeamCreate, BasketballNationalTeamUpdate
from typing import List, Optional
from datetime import date


NAME_ALIASES = {
    "usa": "united states",
    "us": "united states",
    "united states of america": "united states",
    "ir iran": "iran",
    "korea republic": "south korea",
    "korea dpr": "north korea",
    "côte d'ivoire": "ivory coast",
    "cote d'ivoire": "ivory coast",
    "czechia": "czech republic",
    "cabo verde": "cape verde",
    "st. kitts and nevis": "saint kitts and nevis",
    "st. vincent and the grenadines": "saint vincent and the grenadines",
    "st. lucia": "saint lucia",
    "china": "china pr",
    "china pr": "china pr",
}

def normalize_team_name(name: str) -> str:
    if not name:
        return ""
    n = name.strip().lower()
    return NAME_ALIASES.get(n, n)

class BasketballNationalTeamService:
    @staticmethod
    def map_team(db: Session, team: BasketballNationalTeam, include_history: bool = False):
        if not team:
            return None

        # Find matching BasketballHistoricalTeam by normalized name & category
        norm_name = normalize_team_name(team.name)
        hist_team = db.query(BasketballHistoricalTeam).filter(
            func.lower(BasketballHistoricalTeam.name) == norm_name,
            BasketballHistoricalTeam.category == team.category
        ).first()

        ranking_history = None
        highest_ranking = None
        highest_ranking_date = None

        if hist_team:
            ch_record = db.query(BasketballHistoricalRanking).filter(
                BasketballHistoricalRanking.team_id == hist_team.id,
                BasketballHistoricalRanking.rank > 0
            ).order_by(
                BasketballHistoricalRanking.rank.asc(),
                BasketballHistoricalRanking.ranking_year.asc(),
                BasketballHistoricalRanking.ranking_month.asc(),
                BasketballHistoricalRanking.ranking_date.asc()
            ).first()

            if ch_record:
                highest_ranking = ch_record.rank
                try:
                    highest_ranking_date = date(ch_record.ranking_year, ch_record.ranking_month, ch_record.ranking_date)
                except ValueError:
                    pass

            if include_history:
                history_objs = db.query(BasketballHistoricalRanking).filter(
                    BasketballHistoricalRanking.team_id == hist_team.id,
                    BasketballHistoricalRanking.rank > 0
                ).order_by(
                    BasketballHistoricalRanking.ranking_year.asc(),
                    BasketballHistoricalRanking.ranking_month.asc(),
                    BasketballHistoricalRanking.ranking_date.asc()
                ).all()

                sampled = []
                if history_objs:
                    if len(history_objs) <= 20:
                        sampled = history_objs
                    else:
                        n = len(history_objs)
                        for i in range(20):
                            idx = int(i * (n - 1) / 19)
                            sampled.append(history_objs[idx])

                ranking_history = []
                for h in sampled:
                    try:
                        h_date = date(h.ranking_year, h.ranking_month, h.ranking_date)
                        ranking_history.append({
                            "ranking": h.rank,
                            "date": h_date
                        })
                    except ValueError:
                        pass

        return {
            "id": team.id,
            "name": team.name,
            "country": team.country,
            "confederation": team.confederation,
            "founded_year": team.founded_year,
            "stadium": team.stadium,
            "manager": team.manager,
            "nickname": team.nickname,
            "image_url": team.image_url,
            "website": team.website,
            "description": team.description,
            "ranking": team.ranking,
            "category": team.category or "men",
            "total_trophies": team.total_trophies or 0,
            "world_cup_titles": team.world_cup_titles or 0,
            "captain": team.captain,
            "main_rivals": team.main_rivals,
            "honors_json": team.honors_json,
            "last_updated": team.last_updated,
            "ranking_history": ranking_history,
            "highest_ranking": highest_ranking,
            "highest_ranking_date": highest_ranking_date,
            "career_high_rank": highest_ranking,
            "career_high_date": highest_ranking_date,
        }

    @staticmethod
    def get_team(db: Session, team_id: int):
        team = db.query(BasketballNationalTeam).filter(BasketballNationalTeam.id == team_id).first()
        if not team:
            return None
        return BasketballNationalTeamService.map_team(db, team, include_history=True)

    @staticmethod
    def get_teams(db: Session, skip: int = 0, limit: int = 100, category: Optional[str] = None):
        query = db.query(BasketballNationalTeam)
        if category:
            query = query.filter(BasketballNationalTeam.category == category)
        total = query.with_entities(func.count(BasketballNationalTeam.id)).scalar()
        items = query.order_by(BasketballNationalTeam.ranking.asc().nullslast()).offset(skip).limit(limit).all()
        mapped_items = [BasketballNationalTeamService.map_team(db, t, include_history=False) for t in items]
        return mapped_items, total

    @staticmethod
    def search_teams(db: Session, query: str, skip: int = 0, limit: int = 20, category: Optional[str] = None):
        search_filter = BasketballNationalTeam.name.ilike(f"%{query}%")
        q = db.query(BasketballNationalTeam).filter(search_filter)
        if category:
            q = q.filter(BasketballNationalTeam.category == category)
        total = q.with_entities(func.count(BasketballNationalTeam.id)).scalar()
        items = q.order_by(BasketballNationalTeam.ranking.asc().nullslast()).offset(skip).limit(limit).all()
        mapped_items = [BasketballNationalTeamService.map_team(db, t, include_history=False) for t in items]
        return mapped_items, total

    @staticmethod
    def get_top_teams(db: Session, limit: int = 10, category: Optional[str] = None):
        query = db.query(BasketballNationalTeam).filter(BasketballNationalTeam.ranking != None)
        if category:
            query = query.filter(BasketballNationalTeam.category == category)
        items = query.order_by(BasketballNationalTeam.ranking.asc()).limit(limit).all()
        return [BasketballNationalTeamService.map_team(db, t, include_history=False) for t in items]

    @staticmethod
    def create_or_update_team(db: Session, team_data: BasketballNationalTeamCreate):
        db_team = db.query(BasketballNationalTeam).filter(
            BasketballNationalTeam.name == team_data.name,
            BasketballNationalTeam.category == team_data.category
        ).first()
        if db_team:
            for key, value in team_data.model_dump(exclude_unset=True).items():
                setattr(db_team, key, value)
        else:
            db_team = BasketballNationalTeam(**team_data.model_dump())
            db.add(db_team)
        
        db.commit()
        return db_team
