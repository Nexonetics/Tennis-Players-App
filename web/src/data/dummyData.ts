import { SportCard } from '@/types';

export const sportCategories: SportCard[] = [
  {
    id: 'tennis',
    title: 'Tennis',
    subtitle: 'ATP & WTA • Rankings • Stats',
    image: '/images/tennis-card.jpg',
    iconName: 'tennis',
    gradientOverlay: 'from-[#0d5c48]/90 via-[#0d5c48]/60 to-transparent',
    arrowBg: 'bg-[#14b8a6]/40 hover:bg-[#14b8a6]/60',
  },
  {
    id: 'table-tennis',
    title: 'Table Tennis',
    subtitle: 'ITTF • Rankings • Stats',
    image: '/images/table-tennis-card.jpg',
    iconName: 'table-tennis',
    gradientOverlay: 'from-[#3c3fc6]/90 via-[#3c3fc6]/55 to-transparent',
    arrowBg: 'bg-[#6366f1]/40 hover:bg-[#6366f1]/60',
  },
  {
    id: 'football',
    title: 'Football',
    subtitle: 'National Teams • Rankings • Stats',
    image: '/images/football-card.jpg',
    iconName: 'football',
    gradientOverlay: 'from-[#174d32]/90 via-[#174d32]/60 to-transparent',
    arrowBg: 'bg-[#22c55e]/40 hover:bg-[#22c55e]/60',
  },
  {
    id: 'basketball',
    title: 'Basketball',
    subtitle: 'FIBA Teams • Rankings • Stats',
    image: '/images/basketball-card.jpg',
    iconName: 'basketball',
    gradientOverlay: 'from-[#b45309]/90 via-[#b45309]/60 to-transparent',
    arrowBg: 'bg-[#f97316]/40 hover:bg-[#f97316]/60',
  },
];
