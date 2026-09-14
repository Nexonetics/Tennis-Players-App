export interface LiveMatch {
  id: string;
  sport: 'Tennis' | 'Football' | 'Table Tennis' | 'Basketball';
  player1: {
    name: string;
    country: string;
    flagCode: string;
    scores: number[];
  };
  player2: {
    name: string;
    country: string;
    flagCode: string;
    scores: number[];
  };
  isLive: boolean;
}

export interface UpcomingMatch {
  id: string;
  sport: 'Tennis' | 'Football' | 'Basketball' | 'Table Tennis';
  tournament: string;
  stage: string;
  team1: {
    name: string;
    logoOrFlag: string;
    type: 'flag' | 'team';
  };
  team2: {
    name: string;
    logoOrFlag: string;
    type: 'flag' | 'team';
  };
  schedule: string;
}

export interface SportCard {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  iconName: 'tennis' | 'table-tennis' | 'football' | 'basketball';
  gradientOverlay: string;
  arrowBg: string;
}

export interface UserProfile {
  name: string;
  avatarLetter: string;
  notificationsCount: number;
}

// Data models for Local Cached Dataset

export interface HistoryPoint {
  date: string;
  ranking: number;
}

export interface TennisPlayer {
  id: number | string;
  name: string;
  country: string;
  ranking: number;
  highest_ranking?: number;
  highest_ranking_date?: string;
  career_high_rank?: number;
  career_high_date?: string;
  birth_date?: string;
  height?: number | string;
  weight?: number | string;
  playing_style?: string;
  wins?: number;
  losses?: number;
  image_url?: string;
  gender?: 'Men' | 'Women' | string;
  source?: string;
  last_updated?: string;
  titles?: number;
  turned_pro?: number | string;
  prize_money?: string;
  external_id?: string;
  slug?: string;
}

export interface TableTennisPlayer {
  id: number | string;
  name: string;
  country: string;
  ranking: number;
  career_high_rank?: number;
  birth_date?: string;
  weight?: number | string;
  playing_style?: string;
  win_percentage?: number;
  image_url?: string;
  source?: string;
  gender?: 'Men' | 'Women' | string;
  last_updated?: string;
}

export interface FootballTeam {
  id: number | string;
  name: string;
  country: string;
  confederation?: string;
  founded_year?: number;
  stadium?: string;
  manager?: string;
  nickname?: string;
  image_url?: string;
  website?: string;
  description?: string;
  ranking: number;
  category?: string;
  total_trophies?: number;
  world_cup_titles?: number;
  captain?: string;
  main_rivals?: string;
  honors_json?: string;
  last_updated?: string;
  ranking_history?: string;
  highest_ranking?: number;
  highest_ranking_date?: string;
  career_high_rank?: number;
  career_high_date?: string;
}

export interface BasketballClub {
  id: number | string;
  name: string;
  city?: string;
  country: string;
  league?: string;
  conference?: string;
  founded_year?: number;
  arena?: string;
  capacity?: number;
  head_coach?: string;
  nickname?: string;
  image_url?: string;
  website?: string;
  description?: string;
  ranking: number;
  category?: string;
  titles?: number;
  playoff_appearances?: number;
  market_value?: string;
  current_season_record?: string;
  star_player?: string;
  owner?: string;
  general_manager?: string;
  honors_json?: string;
  last_updated?: string;
}

export interface UnifiedAthlete {
  id: string;
  sport: 'Tennis' | 'Table Tennis' | 'Football' | 'Basketball';
  name: string;
  country: string;
  countryCode: string;
  ranking: number;
  careerHighRank?: number;
  careerHighDate?: string;
  gender?: string;
  age?: number;
  birthDate?: string;
  playingStyle?: string;
  winRate?: number;
  wins?: number;
  losses?: number;
  imageUrl?: string;
  points?: string;
  extraInfo?: Record<string, any>;
}
