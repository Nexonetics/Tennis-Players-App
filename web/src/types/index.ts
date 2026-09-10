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
