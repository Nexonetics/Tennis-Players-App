import {
  TennisPlayer,
  TableTennisPlayer,
  FootballTeam,
  BasketballClub,
  UnifiedAthlete,
  HistoryPoint,
} from '@/types';

// In-memory cache for parsed JSON data
const dataCache: Record<string, any> = {};

async function getJsonData<T>(filename: string): Promise<T> {
  if (dataCache[filename]) {
    return dataCache[filename] as T;
  }

  if (typeof window === 'undefined') {
    try {
      // Server/SSG node environment
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path');
      const filePath = path.join(process.cwd(), 'public/data/json', filename);
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(fileContent);
        dataCache[filename] = parsed;
        return parsed as T;
      }
    } catch (err) {
      console.error(`Error reading ${filename} from disk:`, err);
    }
  } else {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const url = `${basePath}/data/json/${filename}`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const parsed = await res.json();
        dataCache[filename] = parsed;
        return parsed as T;
      }
    } catch (err) {
      console.error(`Error fetching ${filename}:`, err);
    }
  }

  return [] as unknown as T;
}

// Country code helper mapping
const countryCodeMap: Record<string, string> = {
  China: 'CHN',
  'Chinese Taipei': 'TPE',
  Taiwan: 'TPE',
  Japan: 'JPN',
  Germany: 'GER',
  France: 'FRA',
  Italy: 'ITA',
  Spain: 'ESP',
  'United States': 'USA',
  USA: 'USA',
  Brazil: 'BRA',
  Argentina: 'ARG',
  England: 'ENG',
  Serbia: 'SRB',
  Croatia: 'CRO',
  Slovenia: 'SLO',
  Sweden: 'SWE',
  Australia: 'AUS',
  Canada: 'CAN',
  Poland: 'POL',
  Portugal: 'POR',
  Netherlands: 'NED',
  Belgium: 'BEL',
  Switzerland: 'SUI',
  Austria: 'AUT',
  Greece: 'GRE',
  Czechia: 'CZE',
  'Czech Republic': 'CZE',
  'South Korea': 'KOR',
  'Korea Republic': 'KOR',
  India: 'IND',
};

export function getCountryCode(countryName?: string): string {
  if (!countryName) return 'UNK';
  if (countryCodeMap[countryName]) return countryCodeMap[countryName];
  if (countryName.length === 3) return countryName.toUpperCase();
  return countryName.slice(0, 3).toUpperCase();
}

export function calculateAge(birthDate?: string): number | undefined {
  if (!birthDate) return undefined;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age > 0 ? age : undefined;
}

// Convert raw models into UnifiedAthlete
export function toUnifiedAthlete(
  raw: any,
  sport: 'Tennis' | 'Table Tennis' | 'Football' | 'Basketball'
): UnifiedAthlete {
  const idStr = String(raw.id);
  const country = raw.country || raw.city || 'Unknown';
  const countryCode = getCountryCode(country);
  const ranking = typeof raw.ranking === 'number' ? raw.ranking : 9999;
  const careerHigh = raw.career_high_rank || raw.highest_ranking || ranking;

  let winRate: number | undefined;
  if (typeof raw.win_percentage === 'number') {
    winRate = raw.win_percentage;
  } else if (raw.wins !== undefined && raw.losses !== undefined) {
    const total = raw.wins + raw.losses;
    if (total > 0) {
      winRate = Number(((raw.wins / total) * 100).toFixed(1));
    }
  }

  // Determine standardized gender ('Men' vs 'Women')
  let gender: 'Men' | 'Women' = 'Men';
  const rawGender = String(raw.gender || '').toUpperCase();
  const rawCategory = String(raw.category || '').toLowerCase();
  const rawSource = String(raw.source || '').toUpperCase();

  if (
    rawGender === 'F' ||
    rawGender === 'FEMALE' ||
    rawGender === 'WOMEN' ||
    rawCategory.includes('women') ||
    rawCategory.includes('wta') ||
    rawSource.includes('WTA')
  ) {
    gender = 'Women';
  } else {
    gender = 'Men';
  }

  // Calculate points string representation
  let points = '1,000';
  if (ranking <= 10) {
    points = `${(12000 - ranking * 800).toLocaleString()}`;
  } else if (ranking <= 50) {
    points = `${(4000 - ranking * 50).toLocaleString()}`;
  } else {
    points = `${Math.max(100, 1500 - ranking * 10).toLocaleString()}`;
  }

  return {
    id: idStr,
    sport,
    name: raw.name || 'Unknown',
    country,
    countryCode,
    ranking,
    careerHighRank: careerHigh,
    careerHighDate: raw.career_high_date || raw.highest_ranking_date,
    gender,
    age: calculateAge(raw.birth_date),
    birthDate: raw.birth_date,
    playingStyle: raw.playing_style || raw.style || 'Right Handed',
    winRate,
    wins: raw.wins,
    losses: raw.losses,
    imageUrl: raw.image_url || undefined,
    points,
    extraInfo: raw,
  };
}

export async function getAthletesBySport(
  sport: 'Tennis' | 'Table Tennis' | 'Football' | 'Basketball',
  genderFilter?: string
): Promise<UnifiedAthlete[]> {
  let rawList: any[] = [];
  if (sport === 'Tennis') {
    rawList = await getJsonData<TennisPlayer[]>('players.json');
  } else if (sport === 'Table Tennis') {
    rawList = await getJsonData<TableTennisPlayer[]>('tt_players.json');
  } else if (sport === 'Football') {
    rawList = await getJsonData<FootballTeam[]>('football_national_teams.json');
  } else if (sport === 'Basketball') {
    const clubs = await getJsonData<BasketballClub[]>('basketball_clubs.json');
    const nats = await getJsonData<any[]>('basketball_national_teams.json');
    rawList = [...clubs, ...nats];
  }

  let athletes = rawList.map((item) => toUnifiedAthlete(item, sport));

  if (genderFilter) {
    const gLower = genderFilter.toLowerCase().trim();
    if (gLower.includes('wta') || gLower.includes('women') || gLower === 'f') {
      athletes = athletes.filter((a) => a.gender === 'Women');
    } else if (gLower.includes('atp') || gLower.includes('men') || gLower === 'm') {
      athletes = athletes.filter((a) => a.gender === 'Men');
    }
  }

  // Sort by ranking by default
  athletes.sort((a, b) => a.ranking - b.ranking);
  return athletes;
}

export async function searchAthletes({
  sport = 'Tennis',
  gender,
  query,
  country,
  minRank,
  maxRank,
  sortBy = 'rank',
  page = 1,
  pageSize = 20,
}: {
  sport?: 'Tennis' | 'Table Tennis' | 'Football' | 'Basketball';
  gender?: string;
  query?: string;
  country?: string;
  minRank?: number;
  maxRank?: number;
  sortBy?: 'rank' | 'points' | 'name';
  page?: number;
  pageSize?: number;
}) {
  let list = await getAthletesBySport(sport, gender);

  if (query && query.trim() !== '') {
    const q = query.toLowerCase().trim();
    list = list.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.country.toLowerCase().includes(q) ||
        a.countryCode.toLowerCase().includes(q) ||
        String(a.ranking) === q
    );
  }

  if (country && country.trim() !== '' && country !== 'Country' && country !== 'All') {
    const c = country.toLowerCase().trim();
    list = list.filter((a) => a.country.toLowerCase().includes(c) || a.countryCode.toLowerCase() === c);
  }

  if (minRank !== undefined && !isNaN(minRank)) {
    list = list.filter((a) => a.ranking >= minRank);
  }

  if (maxRank !== undefined && !isNaN(maxRank)) {
    list = list.filter((a) => a.ranking <= maxRank);
  }

  if (sortBy === 'name') {
    list.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === 'points') {
    list.sort((a, b) => (b.winRate || 0) - (a.winRate || 0));
  } else {
    list.sort((a, b) => a.ranking - b.ranking);
  }

  const total = list.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const items = list.slice(startIndex, startIndex + pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getAthleteById(
  id: string,
  sport: 'Tennis' | 'Table Tennis' | 'Football' | 'Basketball' = 'Tennis'
): Promise<UnifiedAthlete | null> {
  const list = await getAthletesBySport(sport);
  const athlete = list.find((a) => String(a.id) === String(id));
  if (athlete) return athlete;

  // Search across other sports if not found in requested sport
  for (const s of ['Tennis', 'Table Tennis', 'Football', 'Basketball'] as const) {
    if (s === sport) continue;
    const found = (await getAthletesBySport(s)).find((a) => String(a.id) === String(id));
    if (found) return found;
  }
  return null;
}

export async function getAthleteHistory(
  id: string,
  sport: 'Tennis' | 'Table Tennis' | 'Football' | 'Basketball' = 'Tennis'
): Promise<HistoryPoint[]> {
  let filename = 'player_histories.json';
  if (sport === 'Table Tennis') filename = 'tt_player_histories.json';
  else if (sport === 'Football') filename = 'football_team_histories.json';
  else if (sport === 'Basketball') filename = 'basketball_team_histories.json';

  const historyDict = await getJsonData<Record<string, HistoryPoint[]>>(filename);
  if (historyDict && historyDict[String(id)]) {
    return historyDict[String(id)];
  }

  // Fallback to checking other history files if not found
  for (const f of [
    'player_histories.json',
    'tt_player_histories.json',
    'football_team_histories.json',
    'basketball_team_histories.json',
  ]) {
    const dict = await getJsonData<Record<string, HistoryPoint[]>>(f);
    if (dict && dict[String(id)]) {
      return dict[String(id)];
    }
  }

  return [];
}

export async function getUniqueCountries(
  sport: 'Tennis' | 'Table Tennis' | 'Football' | 'Basketball' = 'Tennis'
): Promise<string[]> {
  const athletes = await getAthletesBySport(sport);
  const countrySet = new Set<string>();
  athletes.forEach((a) => {
    if (a.country && a.country !== 'Unknown') countrySet.add(a.country);
  });
  return Array.from(countrySet).sort();
}
