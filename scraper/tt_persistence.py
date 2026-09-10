import sys
import os

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))

from app.db.session import SessionLocal, engine, Base
from app.models.tt_player import TableTennisPlayer
from scraper.utils.logger import log

# Ensure tables are created
Base.metadata.create_all(bind=engine)


def save_tt_player(player_data):
    db = SessionLocal()
    try:
        db_player = db.query(TableTennisPlayer).filter(
            TableTennisPlayer.name == player_data['name']
        ).first()
        
        flat_data = player_data.copy()
        if 'points' in flat_data and not hasattr(TableTennisPlayer, 'points'):
            flat_data.pop('points')

        if db_player:
            for key, value in flat_data.items():
                setattr(db_player, key, value)
            log.info(f"Updated TT player: {player_data['name']}")
        else:
            db_player = TableTennisPlayer(**flat_data)
            db.add(db_player)
            log.info(f"Added new TT player: {player_data['name']}")

        db.commit()
    except Exception as e:
        db.rollback()
        log.error(f"Error saving TT player {player_data.get('name')}: {e}")
    finally:
        db.close()
