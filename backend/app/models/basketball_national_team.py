from sqlalchemy import Column, Integer, String, Float, DateTime, Index, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class BasketballNationalTeam(Base):
    __tablename__ = "basketball_national_teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    country = Column(String, index=True)
    confederation = Column(String, index=True)  # FIBA Americas, FIBA Europe, FIBA Asia, FIBA Africa, FIBA Oceania
    founded_year = Column(Integer)
    stadium = Column(String)
    nickname = Column(String)
    image_url = Column(String)
    website = Column(String)
    description = Column(Text)
    ranking = Column(Integer, index=True)  # FIBA World Ranking
    category = Column(String, index=True, default="men")  # 'men' or 'women'
    
    # Enhanced Statistics
    total_trophies = Column(Integer, default=0)
    world_cup_titles = Column(Integer, default=0)  # FIBA World Cup Titles
    manager = Column(String)  # Head Coach
    captain = Column(String)
    main_rivals = Column(String)
    
    # Detailed Honors (Stored as JSON for flexibility)
    # Example: {"FIBA World Cup": 5, "FIBA AmeriCup": 7}
    honors_json = Column(JSON)

    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_basketball_national_teams_name_lower", func.lower(name)),
    )


class BasketballHistoricalTeam(Base):
    __tablename__ = "basketball_teams_historical"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    country = Column(String, nullable=True)
    confederation = Column(String, nullable=True)
    category = Column(String, index=True, default="men")  # 'men' or 'women'
    picture = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship to rankings
    rankings = relationship("BasketballHistoricalRanking", back_populates="team", cascade="all, delete-orphan")


class BasketballHistoricalRanking(Base):
    __tablename__ = "basketball_rankings_historical"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("basketball_teams_historical.id", ondelete="CASCADE"), nullable=False, index=True)
    points = Column(Float, nullable=False, default=0.0)
    rank = Column(Integer, nullable=False)
    ranking_date = Column(Integer, nullable=False)
    ranking_month = Column(Integer, nullable=False)
    ranking_year = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to team
    team = relationship("BasketballHistoricalTeam", back_populates="rankings")

    __table_args__ = (
        Index("ix_basketball_rankings_historical_team_date", "team_id", "ranking_year", "ranking_month", "ranking_date", unique=True),
    )
