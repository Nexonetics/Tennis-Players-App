import sys
import os
from datetime import date

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))

from app.db.session import SessionLocal, engine, Base
from app.models.basketball_national_team import BasketballNationalTeam, BasketballHistoricalTeam, BasketballHistoricalRanking
from sqlalchemy.orm import Session
from scraper.utils.logger import log

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

def save_basketball_national_team(team_data: dict):
    db = SessionLocal()
    try:
        # Extract points for historical ranking and remove from team_data dict
        points = float(team_data.pop('points', 0.0))
        
        existing = db.query(BasketballNationalTeam).filter(
            BasketballNationalTeam.name == team_data['name'],
            BasketballNationalTeam.category == team_data.get('category', 'men')
        ).first()
        
        if existing:
            # Update existing record
            for key, value in team_data.items():
                if value is not None:
                    setattr(existing, key, value)
            log.debug(f"Updated Basketball National Team: {team_data['name']}")
        else:
            # Create new record
            new_team = BasketballNationalTeam(**team_data)
            db.add(new_team)
            log.info(f"Added new Basketball National Team: {team_data['name']}")

        # Sync/Create BasketballHistoricalTeam
        hist_team = db.query(BasketballHistoricalTeam).filter(
            BasketballHistoricalTeam.name == team_data['name'],
            BasketballHistoricalTeam.category == team_data.get('category', 'men')
        ).first()
        if not hist_team:
            hist_team = BasketballHistoricalTeam(
                name=team_data['name'],
                country=team_data.get('country', team_data['name']),
                confederation=team_data.get('confederation'),
                category=team_data.get('category', 'men'),
                picture=team_data.get('image_url')
            )
            db.add(hist_team)
            db.flush()

        rank = team_data.get('ranking')
        if rank and rank < 999:
            today = date.today()
            existing_r = db.query(BasketballHistoricalRanking).filter(
                BasketballHistoricalRanking.team_id == hist_team.id,
                BasketballHistoricalRanking.ranking_year == today.year,
                BasketballHistoricalRanking.ranking_month == today.month,
                BasketballHistoricalRanking.ranking_date == today.day
            ).first()
            if not existing_r:
                db.add(BasketballHistoricalRanking(
                    team_id=hist_team.id,
                    points=points,
                    rank=rank,
                    ranking_date=today.day,
                    ranking_month=today.month,
                    ranking_year=today.year
                ))
        
        db.commit()
    except Exception as e:
        db.rollback()
        log.error(f"Failed to save basketball national team {team_data.get('name')}: {e}")
    finally:
        db.close()
