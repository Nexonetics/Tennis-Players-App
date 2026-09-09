from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.tt_player import TableTennisPlayer, TableTennisHistoricalPlayer, TableTennisHistoricalRanking
from app.schemas.tt_player import TtPlayerCreate, TtPlayerUpdate
from typing import List, Optional
from datetime import date


class TtPlayerService:
    @staticmethod
    def map_historical_player(db: Session, p: TableTennisHistoricalPlayer, rank: Optional[int] = None, include_history: bool = False):
        # If rank is not provided, fetch rank on the latest global ranking date for their gender
        if rank is None:
            latest_global = TtPlayerService._latest_ranking_date(db, 'M' if p.gender == 0 else 'F')
            if latest_global:
                ly, lm, ld = latest_global
                latest_r = db.query(TableTennisHistoricalRanking).filter(
                    TableTennisHistoricalRanking.player_id == p.id,
                    TableTennisHistoricalRanking.ranking_year == ly,
                    TableTennisHistoricalRanking.ranking_month == lm,
                    TableTennisHistoricalRanking.ranking_date == ld
                ).first()
                if latest_r:
                    rank = latest_r.rank
            # Fallback 1: most recent ranking for this player if not in latest global snapshot
            if rank is None:
                recent_r = db.query(TableTennisHistoricalRanking).filter(
                    TableTennisHistoricalRanking.player_id == p.id,
                    TableTennisHistoricalRanking.rank > 0
                ).order_by(
                    TableTennisHistoricalRanking.ranking_year.desc(),
                    TableTennisHistoricalRanking.ranking_month.desc(),
                    TableTennisHistoricalRanking.ranking_date.desc()
                ).first()
                if recent_r:
                    rank = recent_r.rank
        
        # Try to match with old TableTennisPlayer to get style, weight, and win %
        full_name = f"{p.first_name} {p.last_name}"
        style = None
        win_pct = None
        weight = None
        
        old_p = db.query(TableTennisPlayer).filter(
            TableTennisPlayer.name == full_name
        ).first()
        if old_p:
            style = old_p.playing_style
            win_pct = old_p.win_percentage
            weight = old_p.weight
            # Fallback 2: legacy table ranking
            if rank is None and old_p.ranking:
                rank = old_p.ranking
        
        # Calculate birth date if components exist
        b_date = None
        if p.birth_year and p.birth_month and p.birth_date:
            try:
                b_date = date(p.birth_year, p.birth_month, p.birth_date)
            except ValueError:
                pass

        # Fetch career high rank and date (ignoring invalid ranks <= 0)
        career_high_rank = None
        career_high_date = None
        ch_record = db.query(TableTennisHistoricalRanking).filter(
            TableTennisHistoricalRanking.player_id == p.id,
            TableTennisHistoricalRanking.rank > 0
        ).order_by(
            TableTennisHistoricalRanking.rank.asc(),
            TableTennisHistoricalRanking.ranking_year.asc(),
            TableTennisHistoricalRanking.ranking_month.asc(),
            TableTennisHistoricalRanking.ranking_date.asc()
        ).first()
        
        if ch_record:
            career_high_rank = ch_record.rank
            try:
                career_high_date = date(ch_record.ranking_year, ch_record.ranking_month, ch_record.ranking_date)
            except ValueError:
                pass

        history = None
        if include_history:
            # Query all historical ranking checkpoints where rank is valid
            history_objs = db.query(TableTennisHistoricalRanking).filter(
                TableTennisHistoricalRanking.player_id == p.id,
                TableTennisHistoricalRanking.rank > 0
            ).order_by(
                TableTennisHistoricalRanking.ranking_year.asc(),
                TableTennisHistoricalRanking.ranking_month.asc(),
                TableTennisHistoricalRanking.ranking_date.asc()
            ).all()
            
            # Sample up to 20 points across their entire career to show a meaningful timeline
            sampled = []
            if history_objs:
                if len(history_objs) <= 20:
                    sampled = history_objs
                else:
                    n = len(history_objs)
                    for i in range(20):
                        index = int(i * (n - 1) / 19)
                        sampled.append(history_objs[index])
            
            history = []
            for h in sampled:
                try:
                    h_date = date(h.ranking_year, h.ranking_month, h.ranking_date)
                    history.append({
                        "ranking": h.rank,
                        "date": h_date
                    })
                except ValueError:
                    pass

        return {
            "id": p.id,
            "name": full_name,
            "country": p.country,
            "ranking": rank,
            "birth_date": b_date,
            "weight": weight,
            "playing_style": style or "Unknown",
            "win_percentage": win_pct or 50.0,
            "image_url": p.picture,
            "source": "ITTF Historical Database",
            "gender": "M" if p.gender == 0 else "F",
            "last_updated": p.last_updated,
            "ranking_history": history,
            "career_high_rank": career_high_rank,
            "career_high_date": career_high_date
        }

    @staticmethod
    def get_player(db: Session, player_id: int):
        p = db.query(TableTennisHistoricalPlayer).filter(TableTennisHistoricalPlayer.id == player_id).first()
        if not p:
            return None
        return TtPlayerService.map_historical_player(db, p, include_history=True)

    @staticmethod
    def _latest_ranking_date(db: Session, gender: Optional[str] = None):
        query = db.query(
            TableTennisHistoricalRanking.ranking_year,
            TableTennisHistoricalRanking.ranking_month,
            TableTennisHistoricalRanking.ranking_date
        ).join(
            TableTennisHistoricalPlayer,
            TableTennisHistoricalPlayer.id == TableTennisHistoricalRanking.player_id
        )
        if gender:
            g_val = 0 if gender == 'M' else 1
            query = query.filter(TableTennisHistoricalPlayer.gender == g_val)
        return query.order_by(
            TableTennisHistoricalRanking.ranking_year.desc(),
            TableTennisHistoricalRanking.ranking_month.desc(),
            TableTennisHistoricalRanking.ranking_date.desc()
        ).first()

    @staticmethod
    def get_players(db: Session, skip: int = 0, limit: int = 100, gender: Optional[str] = None):
        if not gender:
            gender = 'M'

        latest_date = TtPlayerService._latest_ranking_date(db, gender)

        if not latest_date:
            return [], 0

        ly, lm, ld = latest_date
        g_val = 0 if gender == 'M' else 1

        query = db.query(
            TableTennisHistoricalPlayer,
            TableTennisHistoricalRanking.rank
        ).join(
            TableTennisHistoricalRanking,
            TableTennisHistoricalPlayer.id == TableTennisHistoricalRanking.player_id
        ).filter(
            TableTennisHistoricalRanking.ranking_year == ly,
            TableTennisHistoricalRanking.ranking_month == lm,
            TableTennisHistoricalRanking.ranking_date == ld,
            TableTennisHistoricalPlayer.gender == g_val
        )

        total = query.count()
        results = query.order_by(TableTennisHistoricalRanking.rank.asc(), TableTennisHistoricalPlayer.id.asc()).offset(skip).limit(limit).all()

        items = []
        seen_ranks = set()
        for p, r in results:
            if r in seen_ranks:
                continue
            seen_ranks.add(r)
            items.append(TtPlayerService.map_historical_player(db, p, rank=r))

        return items, total

    @staticmethod
    def search_players(db: Session, query: str, skip: int = 0, limit: int = 20, gender: Optional[str] = None):
        if not gender:
            gender = 'M'

        latest_date = TtPlayerService._latest_ranking_date(db, gender)

        ly, lm, ld = latest_date if latest_date else (0, 0, 0)
        g_val = 0 if gender == 'M' else 1

        search_filter = func.concat(
            TableTennisHistoricalPlayer.first_name, ' ', TableTennisHistoricalPlayer.last_name
        ).ilike(f"%{query}%")

        q = db.query(
            TableTennisHistoricalPlayer,
            TableTennisHistoricalRanking.rank
        ).outerjoin(
            TableTennisHistoricalRanking,
            (TableTennisHistoricalPlayer.id == TableTennisHistoricalRanking.player_id) &
            (TableTennisHistoricalRanking.ranking_year == ly) &
            (TableTennisHistoricalRanking.ranking_month == lm) &
            (TableTennisHistoricalRanking.ranking_date == ld)
        ).filter(
            search_filter,
            TableTennisHistoricalPlayer.gender == g_val
        )

        total = q.count()
        results = q.order_by(
            TableTennisHistoricalRanking.rank.asc().nullslast(),
            TableTennisHistoricalPlayer.id.asc()
        ).offset(skip).limit(limit).all()

        items = []
        for p, r in results:
            items.append(TtPlayerService.map_historical_player(db, p, rank=r))

        return items, total

    @staticmethod
    def get_top_players(db: Session, limit: int = 50, gender: Optional[str] = None):
        if not gender:
            gender = 'M'

        latest_date = TtPlayerService._latest_ranking_date(db, gender)

        if not latest_date:
            return []

        ly, lm, ld = latest_date
        g_val = 0 if gender == 'M' else 1

        query = db.query(
            TableTennisHistoricalPlayer,
            TableTennisHistoricalRanking.rank
        ).join(
            TableTennisHistoricalRanking,
            TableTennisHistoricalPlayer.id == TableTennisHistoricalRanking.player_id
        ).filter(
            TableTennisHistoricalRanking.ranking_year == ly,
            TableTennisHistoricalRanking.ranking_month == lm,
            TableTennisHistoricalRanking.ranking_date == ld,
            TableTennisHistoricalPlayer.gender == g_val
        )

        results = query.order_by(TableTennisHistoricalRanking.rank.asc(), TableTennisHistoricalPlayer.id.asc()).limit(limit * 2).all()

        items = []
        seen_ranks = set()
        for p, r in results:
            if r in seen_ranks:
                continue
            seen_ranks.add(r)
            items.append(TtPlayerService.map_historical_player(db, p, rank=r))
            if len(items) >= limit:
                break

        return items

    @staticmethod
    def create_or_update_player(db: Session, player_data: TtPlayerCreate):
        # We don't write to historical player table in standard API CRUD, 
        # but keep it here referencing old TableTennisPlayer for backward compatibility/admin usage
        db_player = db.query(TableTennisPlayer).filter(
            TableTennisPlayer.name == player_data.name
        ).first()
        if db_player:
            for key, value in player_data.model_dump(exclude_unset=True).items():
                setattr(db_player, key, value)
        else:
            db_player = TableTennisPlayer(**player_data.model_dump())
            db.add(db_player)

        db.commit()
        return db_player

