"""
Historical Persistence Helpers
===============================
These helpers dual-write a scraped player + today's rank into the
*historical* database tables that the backend API actually reads:

  Tennis:       TennisHistoricalPlayer  +  TennisHistoricalRanking
  TableTennis:  TableTennisHistoricalPlayer + TableTennisHistoricalRanking

The legacy flat tables (Player, TableTennisPlayer) are still written to
by their respective persistence modules for backward-compatibility.
"""

import os
import sys
import re
from datetime import date

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))

from app.db.session import SessionLocal, engine, Base
from app.models.player import TennisHistoricalPlayer, TennisHistoricalRanking
from app.models.tt_player import TableTennisHistoricalPlayer, TableTennisHistoricalRanking

# Ensure tables exist
Base.metadata.create_all(bind=engine)

try:
    from scraper.utils.logger import log
except ImportError:
    from utils.logger import log


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _parse_name(full_name: str):
    """Split 'First Last' into (first, last). Handles single-word names."""
    parts = " ".join(full_name.split()).split()
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def _gender_int(gender_str: str) -> int:
    """Convert 'M'/'F' to 0/1 integer used in historical tables."""
    return 0 if (gender_str or "M").upper() == "M" else 1


def _parse_birth(birth_val):
    """Return (day, month, year) from a date object or None tuple."""
    if not birth_val:
        return None, None, None
    if isinstance(birth_val, date):
        return birth_val.day, birth_val.month, birth_val.year
    if isinstance(birth_val, str):
        for fmt in ("%Y-%m-%d", "%B %d, %Y", "%d %b %Y"):
            try:
                from datetime import datetime
                d = datetime.strptime(birth_val.strip(), fmt).date()
                return d.day, d.month, d.year
            except ValueError:
                pass
    return None, None, None


# ---------------------------------------------------------------------------
# Tennis (ATP / WTA)
# ---------------------------------------------------------------------------

def save_tennis_player_with_rank(player_data: dict) -> None:
    """
    Upsert a TennisHistoricalPlayer record and insert a TennisHistoricalRanking
    row for today's date (if one does not already exist for this player).

    Expected keys in player_data:
        name, ranking, gender ('M'/'F'), country,
        birth_date (optional date/str), image_url (optional),
        prize_money (optional), highest_ranking (optional int)
    """
    name = player_data.get("name", "").strip()
    if not name:
        return

    ranking = player_data.get("ranking")
    if not ranking:
        return

    today = date.today()
    gender_int = _gender_int(player_data.get("gender", "M"))
    first_name, last_name = _parse_name(name)
    b_day, b_month, b_year = _parse_birth(player_data.get("birth_date"))
    country = player_data.get("country", "Unknown")
    image_url = player_data.get("image_url")
    prize_money = player_data.get("prize_money")

    db = SessionLocal()
    try:
        # --- Find or create TennisHistoricalPlayer ---
        player = db.query(TennisHistoricalPlayer).filter(
            TennisHistoricalPlayer.first_name == first_name,
            TennisHistoricalPlayer.last_name == last_name,
            TennisHistoricalPlayer.gender == gender_int,
        ).first()

        if not player:
            player = TennisHistoricalPlayer(
                first_name=first_name,
                last_name=last_name,
                gender=gender_int,
                country=country,
                birth_date=b_day,
                birth_month=b_month,
                birth_year=b_year,
                picture=image_url,
                prize_money=prize_money,
            )
            db.add(player)
            db.flush()
            log.info(f"[HistoricalPersistence] Created TennisHistoricalPlayer: {name}")
        else:
            # Update fields that may have improved from enrichment
            if country and country != "Unknown":
                player.country = country
            if b_day:
                player.birth_date = b_day
                player.birth_month = b_month
                player.birth_year = b_year
            if image_url:
                player.picture = image_url
            if prize_money:
                player.prize_money = prize_money

        points_val = 0
        if player_data.get("points"):
            try:
                points_val = int(re.sub(r"\D", "", str(player_data["points"])))
            except Exception:
                points_val = 0

        # --- Insert today's TennisHistoricalRanking if not already present ---
        existing = db.query(TennisHistoricalRanking).filter(
            TennisHistoricalRanking.player_id == player.id,
            TennisHistoricalRanking.ranking_year == today.year,
            TennisHistoricalRanking.ranking_month == today.month,
            TennisHistoricalRanking.ranking_date == today.day,
        ).first()

        if not existing:
            new_rank = TennisHistoricalRanking(
                player_id=player.id,
                rank=int(ranking),
                points=points_val,
                ranking_year=today.year,
                ranking_month=today.month,
                ranking_date=today.day,
            )
            db.add(new_rank)
            log.info(f"[HistoricalPersistence] Added rank {ranking} for {name} ({today})")
        else:
            # Update rank in case it changed
            if existing.rank != int(ranking):
                existing.rank = int(ranking)
                log.info(f"[HistoricalPersistence] Updated rank to {ranking} for {name}")
            if points_val and existing.points != points_val:
                existing.points = points_val

        db.commit()
    except Exception as e:
        db.rollback()
        log.error(f"[HistoricalPersistence] Error saving tennis player {name}: {e}")
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Table Tennis (WTT)
# ---------------------------------------------------------------------------

def save_tt_player_with_rank(player_data: dict) -> None:
    """
    Upsert a TableTennisHistoricalPlayer record and insert a
    TableTennisHistoricalRanking row for today's date.

    Expected keys in player_data:
        name, ranking, gender ('M'/'F'), country,
        birth_date (optional date/str), image_url (optional),
        playing_style (optional), win_percentage (optional float)
    """
    name = player_data.get("name", "").strip()
    if not name:
        return

    ranking = player_data.get("ranking")
    if not ranking:
        return

    today = date.today()
    gender_int = _gender_int(player_data.get("gender", "M"))
    first_name, last_name = _parse_name(name)
    b_day, b_month, b_year = _parse_birth(player_data.get("birth_date"))
    country = player_data.get("country", "Unknown")
    image_url = player_data.get("image_url")

    db = SessionLocal()
    try:
        # --- Find or create TableTennisHistoricalPlayer ---
        player = db.query(TableTennisHistoricalPlayer).filter(
            TableTennisHistoricalPlayer.first_name == first_name,
            TableTennisHistoricalPlayer.last_name == last_name,
            TableTennisHistoricalPlayer.gender == gender_int,
        ).first()

        if not player:
            player = TableTennisHistoricalPlayer(
                first_name=first_name,
                last_name=last_name,
                gender=gender_int,
                country=country,
                birth_date=b_day,
                birth_month=b_month,
                birth_year=b_year,
                picture=image_url,
            )
            db.add(player)
            db.flush()
            log.info(f"[HistoricalPersistence] Created TableTennisHistoricalPlayer: {name}")
        else:
            if country and country != "Unknown":
                player.country = country
            if b_day:
                player.birth_date = b_day
                player.birth_month = b_month
                player.birth_year = b_year
            if image_url:
                player.picture = image_url

        # --- Insert today's TableTennisHistoricalRanking if not already present ---
        existing = db.query(TableTennisHistoricalRanking).filter(
            TableTennisHistoricalRanking.player_id == player.id,
            TableTennisHistoricalRanking.ranking_year == today.year,
            TableTennisHistoricalRanking.ranking_month == today.month,
            TableTennisHistoricalRanking.ranking_date == today.day,
        ).first()

        if not existing:
            new_rank = TableTennisHistoricalRanking(
                player_id=player.id,
                rank=int(ranking),
                points=0,  # WTT API doesn't always expose raw points
                ranking_year=today.year,
                ranking_month=today.month,
                ranking_date=today.day,
            )
            db.add(new_rank)
            log.info(f"[HistoricalPersistence] Added rank {ranking} for TT player {name} ({today})")
        else:
            if existing.rank != int(ranking):
                existing.rank = int(ranking)
                log.info(f"[HistoricalPersistence] Updated TT rank to {ranking} for {name}")

        db.commit()
    except Exception as e:
        db.rollback()
        log.error(f"[HistoricalPersistence] Error saving TT player {name}: {e}")
    finally:
        db.close()
