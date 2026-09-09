from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.player import Player, TennisHistoricalPlayer, TennisHistoricalRanking
from app.schemas.player import PlayerCreate, PlayerUpdate
from typing import List, Optional
from datetime import date

class PlayerService:
    @staticmethod
    def map_historical_player(db: Session, p: TennisHistoricalPlayer, rank: Optional[int] = None, include_history: bool = False):
        # If rank is not provided, fetch rank on the latest global ranking date for their gender
        if rank is None:
            latest_global = PlayerService._latest_ranking_date(db, 'M' if p.gender == 0 else 'F')
            if latest_global:
                ly, lm, ld = latest_global
                latest_r = db.query(TennisHistoricalRanking).filter(
                    TennisHistoricalRanking.player_id == p.id,
                    TennisHistoricalRanking.ranking_year == ly,
                    TennisHistoricalRanking.ranking_month == lm,
                    TennisHistoricalRanking.ranking_date == ld
                ).first()
                if latest_r:
                    rank = latest_r.rank
            # Fallback 1: most recent ranking for this player if not in latest global snapshot
            if rank is None:
                recent_r = db.query(TennisHistoricalRanking).filter(
                    TennisHistoricalRanking.player_id == p.id,
                    TennisHistoricalRanking.rank > 0
                ).order_by(
                    TennisHistoricalRanking.ranking_year.desc(),
                    TennisHistoricalRanking.ranking_month.desc(),
                    TennisHistoricalRanking.ranking_date.desc()
                ).first()
                if recent_r:
                    rank = recent_r.rank
        
        # Try to match with old Player to get style, weight, height, wins, losses, turned_pro, image_url, etc.
        full_name = f"{p.first_name} {p.last_name}"
        style = None
        height = None
        weight = None
        wins = 0
        losses = 0
        turned_pro = None
        legacy_image = None
        prize_money = p.prize_money # Use prize money from historical player first
        
        old_p = db.query(Player).filter(
            Player.name == full_name
        ).first()
        if old_p:
            style = old_p.playing_style
            height = old_p.height
            weight = old_p.weight
            wins = old_p.wins or 0
            losses = old_p.losses or 0
            turned_pro = old_p.turned_pro
            legacy_image = old_p.image_url
            if not prize_money:
                prize_money = old_p.prize_money
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
        ch_record = db.query(TennisHistoricalRanking).filter(
            TennisHistoricalRanking.player_id == p.id,
            TennisHistoricalRanking.rank > 0
        ).order_by(
            TennisHistoricalRanking.rank.asc(),
            TennisHistoricalRanking.ranking_year.asc(),
            TennisHistoricalRanking.ranking_month.asc(),
            TennisHistoricalRanking.ranking_date.asc()
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
            history_objs = db.query(TennisHistoricalRanking).filter(
                TennisHistoricalRanking.player_id == p.id,
                TennisHistoricalRanking.rank > 0
            ).order_by(
                TennisHistoricalRanking.ranking_year.asc(),
                TennisHistoricalRanking.ranking_month.asc(),
                TennisHistoricalRanking.ranking_date.asc()
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
            "height": height,
            "weight": weight,
            "playing_style": style or "Unknown",
            "wins": wins,
            "losses": losses,
            "turned_pro": turned_pro,
            "prize_money": prize_money or "Unknown",
            "image_url": p.picture or legacy_image,
            "source": "ATP/WTA Historical Database",
            "gender": "M" if p.gender == 0 else "F",
            "last_updated": p.last_updated,
            "ranking_history": history,
            "highest_ranking": career_high_rank,
            "highest_ranking_date": career_high_date,
            "career_high_rank": career_high_rank,
            "career_high_date": career_high_date
        }

    @staticmethod
    def get_player(db: Session, player_id: int):
        p = db.query(TennisHistoricalPlayer).filter(TennisHistoricalPlayer.id == player_id).first()
        if not p:
            return None
        return PlayerService.map_historical_player(db, p, include_history=True)

    @staticmethod
    def _latest_ranking_date(db: Session, gender: Optional[str] = None):
        query = db.query(
            TennisHistoricalRanking.ranking_year,
            TennisHistoricalRanking.ranking_month,
            TennisHistoricalRanking.ranking_date
        ).join(
            TennisHistoricalPlayer,
            TennisHistoricalPlayer.id == TennisHistoricalRanking.player_id
        )
        if gender:
            g_val = 0 if gender == 'M' else 1
            query = query.filter(TennisHistoricalPlayer.gender == g_val)
        return query.order_by(
            TennisHistoricalRanking.ranking_year.desc(),
            TennisHistoricalRanking.ranking_month.desc(),
            TennisHistoricalRanking.ranking_date.desc()
        ).first()

    @staticmethod
    def get_players(db: Session, skip: int = 0, limit: int = 100, gender: Optional[str] = None):
        if not gender:
            gender = 'M'

        latest_date = PlayerService._latest_ranking_date(db, gender)

        if not latest_date:
            return [], 0

        ly, lm, ld = latest_date
        g_val = 0 if gender == 'M' else 1

        query = db.query(
            TennisHistoricalPlayer,
            TennisHistoricalRanking.rank
        ).join(
            TennisHistoricalRanking,
            TennisHistoricalPlayer.id == TennisHistoricalRanking.player_id
        ).filter(
            TennisHistoricalRanking.ranking_year == ly,
            TennisHistoricalRanking.ranking_month == lm,
            TennisHistoricalRanking.ranking_date == ld,
            TennisHistoricalPlayer.gender == g_val
        )

        total = query.count()
        results = query.order_by(TennisHistoricalRanking.rank.asc(), TennisHistoricalPlayer.id.asc()).offset(skip).limit(limit).all()

        items = []
        seen_ranks = set()
        for p, r in results:
            if r in seen_ranks:
                continue
            seen_ranks.add(r)
            items.append(PlayerService.map_historical_player(db, p, rank=r))

        return items, total

    @staticmethod
    def search_players(db: Session, query: str, skip: int = 0, limit: int = 20, gender: Optional[str] = None):
        if not gender:
            gender = 'M'

        latest_date = PlayerService._latest_ranking_date(db, gender)

        ly, lm, ld = latest_date if latest_date else (0, 0, 0)
        g_val = 0 if gender == 'M' else 1

        search_filter = func.concat(
            TennisHistoricalPlayer.first_name, ' ', TennisHistoricalPlayer.last_name
        ).ilike(f"%{query}%")

        q = db.query(
            TennisHistoricalPlayer,
            TennisHistoricalRanking.rank
        ).outerjoin(
            TennisHistoricalRanking,
            (TennisHistoricalPlayer.id == TennisHistoricalRanking.player_id) &
            (TennisHistoricalRanking.ranking_year == ly) &
            (TennisHistoricalRanking.ranking_month == lm) &
            (TennisHistoricalRanking.ranking_date == ld)
        ).filter(
            search_filter,
            TennisHistoricalPlayer.gender == g_val
        )

        total = q.count()
        results = q.order_by(
            TennisHistoricalRanking.rank.asc().nullslast(),
            TennisHistoricalPlayer.id.asc()
        ).offset(skip).limit(limit).all()

        items = []
        for p, r in results:
            items.append(PlayerService.map_historical_player(db, p, rank=r))

        return items, total

    @staticmethod
    def get_top_players(db: Session, limit: int = 10, gender: Optional[str] = None):
        if not gender:
            gender = 'M'

        latest_date = PlayerService._latest_ranking_date(db, gender)

        if not latest_date:
            return []

        ly, lm, ld = latest_date
        g_val = 0 if gender == 'M' else 1

        query = db.query(
            TennisHistoricalPlayer,
            TennisHistoricalRanking.rank
        ).join(
            TennisHistoricalRanking,
            TennisHistoricalPlayer.id == TennisHistoricalRanking.player_id
        ).filter(
            TennisHistoricalRanking.ranking_year == ly,
            TennisHistoricalRanking.ranking_month == lm,
            TennisHistoricalRanking.ranking_date == ld,
            TennisHistoricalPlayer.gender == g_val
        )

        results = query.order_by(TennisHistoricalRanking.rank.asc(), TennisHistoricalPlayer.id.asc()).limit(limit * 2).all()

        items = []
        seen_ranks = set()
        for p, r in results:
            if r in seen_ranks:
                continue
            seen_ranks.add(r)
            items.append(PlayerService.map_historical_player(db, p, rank=r))
            if len(items) >= limit:
                break

        return items

    @staticmethod
    def create_or_update_player(db: Session, player_data: PlayerCreate):
        db_player = db.query(Player).filter(Player.name == player_data.name).first()
        if db_player:
            for key, value in player_data.model_dump(exclude_unset=True).items():
                setattr(db_player, key, value)
        else:
            db_player = Player(**player_data.model_dump())
            db.add(db_player)
        
        db.commit()
        return db_player

    @staticmethod
    def get_h2h(db: Session, player1_id: int, player2_id: int):
        import random
        p1 = PlayerService.get_player(db, player1_id)
        p2 = PlayerService.get_player(db, player2_id)
        
        if not p1 or not p2:
            return None

        # Determine number of matches based on rankings
        # Top players play each other more often
        p1_rank = p1.get("ranking") or 100
        p2_rank = p2.get("ranking") or 100
        avg_rank = (p1_rank + p2_rank) / 2
        num_matches = max(1, int(20 - (avg_rank / 5)) + random.randint(0, 5))
        if avg_rank > 100: num_matches = random.randint(1, 3)
        
        surfaces = ["Hard", "Clay", "Grass"]
        rounds = ["Final", "Semifinal", "Quarterfinal", "Round of 16", "Round of 32"]
        tournaments = ["Miami Open", "Indian Wells", "Roland Garros", "Wimbledon", "US Open", "Australian Open", "Madrid Open", "Rome Masters"]
        
        history = []
        p1_wins = 0
        p2_wins = 0
        hard_wins = {p1["id"]: 0, p2["id"]: 0}
        clay_wins = {p1["id"]: 0, p2["id"]: 0}
        grass_wins = {p1["id"]: 0, p2["id"]: 0}
        
        # Bias based on ranking
        p1_bias = 0.5 + (p2_rank - p1_rank) / 200
        p1_bias = max(0.2, min(0.8, p1_bias))

        for i in range(num_matches):
            year = 2024 - (i // 3)
            surface = random.choice(surfaces)
            winner = p1 if random.random() < p1_bias else p2
            
            if winner["id"] == p1["id"]: 
                p1_wins += 1
                if surface == "Hard": hard_wins[p1["id"]] += 1
                elif surface == "Clay": clay_wins[p1["id"]] += 1
                else: grass_wins[p1["id"]] += 1
            else: 
                p2_wins += 1
                if surface == "Hard": hard_wins[p2["id"]] += 1
                elif surface == "Clay": clay_wins[p2["id"]] += 1
                else: grass_wins[p2["id"]] += 1
                
            history.append({
                "year": year,
                "event": random.choice(tournaments),
                "round": random.choice(rounds),
                "surface": surface,
                "score": f"{random.choice(['6-4, 7-5', '6-3, 6-4', '7-6, 6-2', '6-1, 6-3', '4-6, 7-5, 6-4'])}",
                "winner_id": winner["id"],
                "winner_name": winner["name"]
            })
            
        history.sort(key=lambda x: x['year'], reverse=True)
        
        stats = {
            "matches_played": num_matches,
            "player1_wins": p1_wins,
            "player2_wins": p2_wins,
            "player1_win_pct": round(p1_wins / num_matches * 100, 1),
            "player2_win_pct": round(p2_wins / num_matches * 100, 1),
            "hard_court_wins": hard_wins,
            "clay_court_wins": clay_wins,
            "grass_court_wins": grass_wins,
            "last_match": history[0] if history else None
        }
        
        return {
            "player1": p1,
            "player2": p2,
            "stats": stats,
            "history": history
        }
