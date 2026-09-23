import {
  TennisPlayer,
  TableTennisPlayer,
  FootballTeam,
  BasketballClub,
  UnifiedAthlete,
  HistoryPoint,
} from '@/types';

// In-memory cache for raw parsed JSON data
const dataCache: Record<string, any> = {};

// In-memory cache for transformed UnifiedAthlete arrays per sport
const athletesCache: Record<string, UnifiedAthlete[]> = {};
const athleteIdMap: Record<string, UnifiedAthlete> = {};
const historyFileCache: Record<string, Record<string, HistoryPoint[]>> = {};

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

  const rawRank = typeof raw.ranking === 'number'
    ? raw.ranking
    : (parseInt(String(raw.ranking), 10) || 0);

  const ranking = rawRank > 0 ? rawRank : 9999;

  const rawHigh = raw.career_high_rank || raw.highest_ranking;
  const parsedHigh = typeof rawHigh === 'number' ? rawHigh : (parseInt(String(rawHigh), 10) || 0);
  const careerHigh = parsedHigh > 0 ? parsedHigh : (ranking < 9999 ? ranking : undefined);

  let winRate: number | undefined;
  if (typeof raw.win_percentage === 'number' && raw.win_percentage > 0) {
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
  } else if (ranking < 9999) {
    points = `${Math.max(100, 1500 - ranking * 10).toLocaleString()}`;
  } else {
    points = '500';
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
  if (!athletesCache[sport]) {
    let rawList: any[] = [];
    if (sport === 'Tennis') {
      rawList = await getJsonData<TennisPlayer[]>('players.json');
    } else if (sport === 'Table Tennis') {
      rawList = await getJsonData<TableTennisPlayer[]>('tt_players.json');
    } else if (sport === 'Football') {
      rawList = await getJsonData<FootballTeam[]>('football_national_teams.json');
    } else if (sport === 'Basketball') {
      // FIBA Basketball National Teams ONLY (matching Flutter app)
      rawList = await getJsonData<any[]>('basketball_national_teams.json');
    }

    const converted = rawList.map((item) => toUnifiedAthlete(item, sport));
    converted.sort((a, b) => a.ranking - b.ranking);

    athletesCache[sport] = converted;

    // Index into global ID map for O(1) detail lookup
    converted.forEach((a) => {
      athleteIdMap[`${sport}_${a.id}`] = a;
      athleteIdMap[`any_${a.id}`] = a;
      if (a.extraInfo?.id) {
        athleteIdMap[`${sport}_${a.extraInfo.id}`] = a;
        athleteIdMap[`any_${a.extraInfo.id}`] = a;
      }
    });
  }

  let athletes = athletesCache[sport];

  if (genderFilter) {
    const gLower = genderFilter.toLowerCase().trim();
    if (gLower.includes('wta') || gLower.includes('women') || gLower === 'f') {
      athletes = athletes.filter((a) => a.gender === 'Women');
    } else if (gLower.includes('atp') || gLower.includes('men') || gLower === 'm') {
      athletes = athletes.filter((a) => a.gender === 'Men');
    }
  }

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

  const isSearchQuery = query && query.trim() !== '';

  // If user is just browsing rankings (no search query & no specific rank bounds),
  // filter out unranked / legacy entries (ranking === 9999) so only valid active ranks show.
  if (!isSearchQuery && minRank === undefined && maxRank === undefined) {
    list = list.filter((a) => a.ranking < 9999);
  }

  if (isSearchQuery) {
    const rawQ = query!.toLowerCase().trim();
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
    list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === 'points') {
    list = [...list].sort((a, b) => (b.winRate || 0) - (a.winRate || 0));
  } else {
    // Rank sort: ranked players first, then name
    list = [...list].sort((a, b) => a.ranking - b.ranking);
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
  const targetId = String(id);
  const cleanId = targetId.replace(/^(b_nat_|b_club_|nat_|club_)/, '');

  // 1. Check O(1) indexed lookup map
  if (athleteIdMap[`${sport}_${targetId}`]) return athleteIdMap[`${sport}_${targetId}`];
  if (athleteIdMap[`any_${targetId}`]) return athleteIdMap[`any_${targetId}`];
  if (athleteIdMap[`${sport}_${cleanId}`]) return athleteIdMap[`${sport}_${cleanId}`];
  if (athleteIdMap[`any_${cleanId}`]) return athleteIdMap[`any_${cleanId}`];

  // 2. Ensure current sport is loaded
  const list = await getAthletesBySport(sport);
  const athlete = list.find(
    (a) => String(a.id) === targetId || String(a.extraInfo?.id) === targetId || String(a.id) === cleanId || String(a.extraInfo?.id) === cleanId
  );
  if (athlete) return athlete;

  // 3. Check other sports
  for (const s of ['Tennis', 'Table Tennis', 'Football', 'Basketball'] as const) {
    if (s === sport) continue;
    const found = (await getAthletesBySport(s)).find(
      (a) => String(a.id) === targetId || String(a.extraInfo?.id) === targetId || String(a.id) === cleanId || String(a.extraInfo?.id) === cleanId
    );
    if (found) return found;
  }

  // 4. Fallback check for basketball clubs if requested ID was a club ID
  if (targetId.startsWith('b_club_') || targetId.startsWith('club_') || sport === 'Basketball') {
    const clubs = await getJsonData<BasketballClub[]>('basketball_clubs.json');
    const club = clubs.find((c) => String(c.id) === cleanId || String(c.id) === targetId);
    if (club) {
      return toUnifiedAthlete({ ...club, id: `b_club_${club.id}` }, 'Basketball');
    }
  }

  return null;
}

export async function getAthleteHistory(
  id: string,
  sport: 'Tennis' | 'Table Tennis' | 'Football' | 'Basketball' = 'Tennis'
): Promise<HistoryPoint[]> {
  let primaryFilename = 'player_histories.json';
  if (sport === 'Table Tennis') primaryFilename = 'tt_player_histories.json';
  else if (sport === 'Football') primaryFilename = 'football_team_histories.json';
  else if (sport === 'Basketball') primaryFilename = 'basketball_team_histories.json';

  const cleanId = String(id).replace(/^(b_nat_|b_club_|nat_|club_)/, '');

  if (!historyFileCache[primaryFilename]) {
    historyFileCache[primaryFilename] = await getJsonData<Record<string, HistoryPoint[]>>(primaryFilename);
  }
  const primaryDict = historyFileCache[primaryFilename];
  if (primaryDict) {
    if (primaryDict[String(id)]) return primaryDict[String(id)];
    if (primaryDict[cleanId]) return primaryDict[cleanId];
  }

  // Fallback to checking other history files if not found
  for (const f of [
    'player_histories.json',
    'tt_player_histories.json',
    'football_team_histories.json',
    'basketball_team_histories.json',
  ]) {
    if (f === primaryFilename) continue;
    if (!historyFileCache[f]) {
      historyFileCache[f] = await getJsonData<Record<string, HistoryPoint[]>>(f);
    }
    const dict = historyFileCache[f];
    if (dict) {
      if (dict[String(id)]) return dict[String(id)];
      if (dict[cleanId]) return dict[cleanId];
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

