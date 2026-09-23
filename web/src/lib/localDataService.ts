import fs from 'fs';
import path from 'path';
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

function getJsonData<T>(filename: string): T {
  if (dataCache[filename]) {
    return dataCache[filename] as T;
  }
  const filePath = path.join(process.cwd(), 'src/data/json', filename);
  try {
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(fileContent);
      dataCache[filename] = parsed;
      return parsed as T;
    }
  } catch (error) {
    console.error(`Error loading data file ${filename}:`, error);
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

export function getAthletesBySport(
  sport: 'Tennis' | 'Table Tennis' | 'Football' | 'Basketball',
  genderFilter?: string
): UnifiedAthlete[] {
  let rawList: any[] = [];
  if (sport === 'Tennis') {
    rawList = getJsonData<TennisPlayer[]>('players.json');
  } else if (sport === 'Table Tennis') {
    rawList = getJsonData<TableTennisPlayer[]>('tt_players.json');
  } else if (sport === 'Football') {
    rawList = getJsonData<FootballTeam[]>('football_national_teams.json');
  } else if (sport === 'Basketball') {
    const clubs = getJsonData<BasketballClub[]>('basketball_clubs.json');
    const nats = getJsonData<any[]>('basketball_national_teams.json');
    rawList = [...clubs, ...nats];
  }

  let athletes = rawList.map((item) => toUnifiedAthlete(item, sport));

  // Runtime deduplication safeguard: strictly 1 entry per athlete photo / normalized name+dob
  const uniqueNameDob = new Set<string>();
  const seenImageUrls = new Set<string>();

  const deduplicated: UnifiedAthlete[] = [];
  for (const ath of athletes) {
    const img = ath.imageUrl;
    const isGeneric = !img || img.includes('wikimedia.org') || img.includes('placeholder');

    let isDup = false;
    if (img && !isGeneric) {
      if (seenImageUrls.has(img)) {
        isDup = true;
      } else {
        seenImageUrls.add(img);
      }
    }

    if (!isDup && ath.name && ath.birthDate) {
      const normName = ath.name.toLowerCase().trim().split(/\s+/).sort().join(' ');
      const key = `${normName}_${ath.birthDate}`;
      if (uniqueNameDob.has(key)) {
        isDup = true;
      } else {
        uniqueNameDob.add(key);
      }
    }

    if (!isDup) {
      deduplicated.push(ath);
    }
  }

  athletes = deduplicated;

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

export function searchAthletes({
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
  let list = getAthletesBySport(sport, gender);

  if (query && query.trim() !== '') {
    const rawQ = query.toLowerCase().trim();
    const tokens = rawQ.split(/\s+/).filter(Boolean);
    list = list.filter((a) => {
      const nameLower = a.name.toLowerCase();
      const countryLower = a.country.toLowerCase();
      const countryCodeLower = a.countryCode.toLowerCase();
      const rankStr = String(a.ranking);

      // Direct exact/substring match
      if (
        nameLower.includes(rawQ) ||
        countryLower.includes(rawQ) ||
        countryCodeLower.includes(rawQ) ||
        rankStr === rawQ
      ) {
        return true;
      }

      // Tokenized search: all query words must match name, country, code or rank
      return tokens.every(
        (token) =>
          nameLower.includes(token) ||
          countryLower.includes(token) ||
          countryCodeLower.includes(token) ||
          rankStr === token
      );
    });
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

export function getAthleteById(
  id: string,
  sport: 'Tennis' | 'Table Tennis' | 'Football' | 'Basketball' = 'Tennis'
): UnifiedAthlete | null {
  const list = getAthletesBySport(sport);
  const athlete = list.find((a) => String(a.id) === String(id));
  if (athlete) return athlete;

  // Search across other sports if not found in requested sport
  for (const s of ['Tennis', 'Table Tennis', 'Football', 'Basketball'] as const) {
    if (s === sport) continue;
    const found = getAthletesBySport(s).find((a) => String(a.id) === String(id));
    if (found) return found;
  }
  return null;
}

export function getAthleteHistory(
  id: string,
  sport: 'Tennis' | 'Table Tennis' | 'Football' | 'Basketball' = 'Tennis'
): HistoryPoint[] {
  let filename = 'player_histories.json';
  if (sport === 'Table Tennis') filename = 'tt_player_histories.json';
  else if (sport === 'Football') filename = 'football_team_histories.json';
  else if (sport === 'Basketball') filename = 'basketball_team_histories.json';

  const historyDict = getJsonData<Record<string, HistoryPoint[]>>(filename);
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
    const dict = getJsonData<Record<string, HistoryPoint[]>>(f);
    if (dict && dict[String(id)]) {
      return dict[String(id)];
    }
  }

  return [];
}

export function getUniqueCountries(
  sport: 'Tennis' | 'Table Tennis' | 'Football' | 'Basketball' = 'Tennis'
): string[] {
  const athletes = getAthletesBySport(sport);
  const countrySet = new Set<string>();
  athletes.forEach((a) => {
    if (a.country && a.country !== 'Unknown') countrySet.add(a.country);
  });
  return Array.from(countrySet).sort();
}
