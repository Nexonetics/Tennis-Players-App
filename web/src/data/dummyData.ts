import { LiveMatch, UpcomingMatch, SportCard, UserProfile } from '@/types';

export const currentUser: UserProfile = {
  name: 'arya',
  avatarLetter: 'A',
  notificationsCount: 2,
};

export const liveMatches: LiveMatch[] = [
  {
    id: 'live-1',
    sport: 'Tennis',
    player1: {
      name: 'Alcaraz',
      country: 'Spain',
      flagCode: 'es',
      scores: [6, 4, 3],
    },
    player2: {
      name: 'Medvedev',
      country: 'Neutral',
      flagCode: 'neutral',
      scores: [7, 6, 4],
    },
    isLive: true,
  },
  {
    id: 'live-2',
    sport: 'Football', // matches the reference design tag
    player1: {
      name: 'Swiatek',
      country: 'Poland',
      flagCode: 'pl',
      scores: [6, 6],
    },
    player2: {
      name: 'Gauff',
      country: 'USA',
      flagCode: 'us',
      scores: [3, 4],
    },
    isLive: true,
  },
  {
    id: 'live-3',
    sport: 'Tennis',
    player1: {
      name: 'Djokovic',
      country: 'Serbia',
      flagCode: 'rs',
      scores: [7, 6],
    },
    player2: {
      name: 'Musetti',
      country: 'Italy',
      flagCode: 'it',
      scores: [5, 3],
    },
    isLive: true,
  },
];

export const sportCategories: SportCard[] = [
  {
    id: 'tennis',
    title: 'Tennis',
    subtitle: 'Players • Tournaments • Stats',
    image: '/images/tennis-card.jpg',
    iconName: 'tennis',
    gradientOverlay: 'from-[#0d5c48]/90 via-[#0d5c48]/60 to-transparent',
    arrowBg: 'bg-[#14b8a6]/40 hover:bg-[#14b8a6]/60',
  },
  {
    id: 'table-tennis',
    title: 'Table Tennis',
    subtitle: 'Players • Tournaments • Stats',
    image: '/images/table-tennis-card.jpg',
    iconName: 'table-tennis',
    gradientOverlay: 'from-[#3c3fc6]/90 via-[#3c3fc6]/55 to-transparent',
    arrowBg: 'bg-[#6366f1]/40 hover:bg-[#6366f1]/60',
  },
  {
    id: 'football',
    title: 'Football',
    subtitle: 'Players • Tournaments • Stats',
    image: '/images/football-card.jpg',
    iconName: 'football',
    gradientOverlay: 'from-[#174d32]/90 via-[#174d32]/60 to-transparent',
    arrowBg: 'bg-[#22c55e]/40 hover:bg-[#22c55e]/60',
  },
  {
    id: 'basketball',
    title: 'Basketball',
    subtitle: 'Players • Tournaments • Stats',
    image: '/images/basketball-card.jpg',
    iconName: 'basketball',
    gradientOverlay: 'from-[#b45309]/90 via-[#b45309]/60 to-transparent',
    arrowBg: 'bg-[#f97316]/40 hover:bg-[#f97316]/60',
  },
];

export const upcomingMatches: UpcomingMatch[] = [
  {
    id: 'upcoming-1',
    sport: 'Tennis',
    tournament: 'French Open 2025',
    stage: 'Quarter Final',
    team1: {
      name: 'Jannik Sinner',
      logoOrFlag: 'it',
      type: 'flag',
    },
    team2: {
      name: 'Carlos Alcaraz',
      logoOrFlag: 'es',
      type: 'flag',
    },
    schedule: 'Today 7:30 PM',
  },
  {
    id: 'upcoming-2',
    sport: 'Football',
    tournament: 'UEFA Champions League',
    stage: 'Semi Final',
    team1: {
      name: 'Real Madrid',
      logoOrFlag: 'real-madrid',
      type: 'team',
    },
    team2: {
      name: 'Bayern Munich',
      logoOrFlag: 'bayern',
      type: 'team',
    },
    schedule: 'Tomorrow 12:30 AM',
  },
  {
    id: 'upcoming-3',
    sport: 'Basketball',
    tournament: 'NBA Playoffs',
    stage: 'Round 2',
    team1: {
      name: 'Boston Celtics',
      logoOrFlag: 'celtics',
      type: 'team',
    },
    team2: {
      name: 'Miami Heat',
      logoOrFlag: 'heat',
      type: 'team',
    },
    schedule: 'Jun 6, 5:30 AM',
  },
  {
    id: 'upcoming-4',
    sport: 'Table Tennis',
    tournament: 'ITTF World Tour',
    stage: 'Final',
    team1: {
      name: 'Fan Zhendong',
      logoOrFlag: 'cn',
      type: 'flag',
    },
    team2: {
      name: 'Wang Chuqin',
      logoOrFlag: 'cn',
      type: 'flag',
    },
    schedule: 'Jun 7, 2:00 PM',
  },
];
