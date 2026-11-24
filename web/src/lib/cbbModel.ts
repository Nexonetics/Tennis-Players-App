/**
 * College basketball match predictions and betting leans.
 *
 * Two independent views of each game are blended, in points of expected margin:
 *   1. The market: the sportsbooks' consensus spread and total, and their average
 *      win probability with the vig removed (`fair_win_prob`). Markets are hard to
 *      beat, so they are the starting point.
 *   2. A records model built from the teams' season numbers: scoring margin,
 *      win–loss record, home/road record, recent form and home-court advantage.
 *
 * The records model only nudges the market, and by less early in the season (a few
 * games against uneven schedules say little). Blending in points rather than in
 * probabilities keeps long-shot probabilities from being inflated.
 *
 * A "lean" is only flagged when the blended view disagrees with a posted price by
 * more than a minimum edge. Everything here is an estimate, not a guarantee.
 */
import type { CbbBookLine, CbbGame, CbbGameSide, CbbTeam } from '@/types';

export const MODEL_SETTINGS = {
  /** Points a home team is worth in college basketball. The odds feed doesn't flag neutral-site games. */
  homeCourtPts: 3,
  /** Scoring margin is shrunk by n / (n + k): early-season blowouts of weak opponents count for less. */
  marginShrinkGames: 8,
  /** Win % is regressed toward .500 as if each team had also gone (k/2)–(k/2). */
  winPctPriorGames: 6,
  /** Expected-margin points per 1.0 difference in (regressed) win %. Kept small: margin already reflects it. */
  winPctPts: 8,
  /** Home/road win % regression and weight (tiny samples, so both are conservative). */
  venuePriorGames: 4,
  venuePts: 3,
  /** Current streak: points per game of streak, capped. Deliberately small. */
  streakPtsPerGame: 0.25,
  streakCapPts: 1,
  /** Spread of real results around the expected margin in college basketball (~11 points). */
  marginSigmaPts: 11,
  /**
   * Weight on the records model vs. the market: maxRecordsWeight * n / (n + k), where n is the
   * fewer games played of the two teams. ~0.1 after 5 games, ~0.2 after 15, approaching 0.35.
   */
  maxRecordsWeight: 0.35,
  recordsWeightGames: 12,
  /** Minimum expected value per $1 staked, and minimum probability edge, before a moneyline is flagged as value. */
  minMoneylineEv: 0.03,
  minMoneylineEdge: 0.02,
  /**
   * Only judge moneylines in this price band: no-vig estimates are unreliable for big
   * long shots/favourites (the favourite–long-shot bias).
   */
  valuePriceRange: [-300, 300] as const,
  /** Minimum gap (points) between the blended number and the posted spread/total to flag a lean. */
  minLineGapPts: 1.5,
  /**
   * Only judge spreads up to this size. The records model shrinks scoring margins toward an
   * average team, so for mismatches (e.g. +30 underdogs) it always understates the gap and
   * would lean the underdog every time — a model artifact, not value.
   */
  maxSpreadForLean: 15,
} as const;

const S = MODEL_SETTINGS;

export type Side = 'home' | 'away';

export interface PriceQuote {
  price: number;
  book: string;
}

export interface Factor {
  label: string;
  away: string;
  home: string;
  /** Which team this factor points to, if any. */
  favors: Side | null;
}

export interface MoneylineValue {
  side: Side;
  price: number;
  book: string;
  /** Expected profit per $1 staked at this price, using the blended win probability. */
  ev: number;
  /** Blended probability minus the price's implied probability. */
  edge: number;
}

export interface LineLean {
  /** 'home' / 'away' for spreads, 'over' / 'under' for totals. */
  pick: Side | 'over' | 'under';
  /** The posted line (spread for the picked side, or the total). */
  line: number;
  /** Our blended number (expected home margin, or expected total). */
  projected: number;
}

export interface GamePrediction {
  /** Blended probability that each side wins. */
  winProb: Record<Side, number>;
  pick: Side;
  pickProb: number;
  confidence: 'Strong' | 'Moderate' | 'Slight';
  /** The market's (no-vig, or spread-implied) and the records model's home win probability. */
  marketHomeProb: number | null;
  recordsHomeProb: number | null;
  /** How much the records model counted for (0–1). */
  recordsWeight: number;
  /** True when the records model and the market pick different winners. */
  recordsDisagree: boolean;
  /** Fewer than 4 games played by either team: the records model is a small sample. */
  smallSample: boolean;
  /** Expected home margin (points) and total, blended. */
  projectedMargin: number | null;
  projectedTotal: number | null;
  /** Short, human-readable reasons behind the pick. */
  reasons: string[];
  factors: Factor[];
  /** Best and worst moneyline across books, per side. */
  priceRange: Record<Side, { best: PriceQuote | null; worst: PriceQuote | null }>;
  moneylineValue: MoneylineValue | null;
  spreadLean: LineLean | null;
  totalLean: LineLean | null;
}

// --------------------------------------------------------------------------- //
// Odds maths
// --------------------------------------------------------------------------- //

export function americanToDecimal(price: number): number {
  return price > 0 ? 1 + price / 100 : 1 + 100 / -price;
}

export function impliedProb(price: number): number {
  return price > 0 ? 100 / (price + 100) : -price / (-price + 100);
}

/** Inverse standard normal CDF (Acklam's rational approximation, rel. error < 1.2e-9). */
export function normalQuantile(p: number): number {
  const q0 = Math.min(1 - 1e-9, Math.max(1e-9, p));
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const low = 0.02425;
  if (q0 < low) {
    const q = Math.sqrt(-2 * Math.log(q0));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (q0 > 1 - low) {
    const q = Math.sqrt(-2 * Math.log(1 - q0));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = q0 - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/** Standard normal CDF (Abramowitz & Stegun 7.1.26, error < 1.5e-7). */
export function normalCdf(x: number): number {
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * z);
  const erf =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-z * z);
  return x >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

// --------------------------------------------------------------------------- //
// Team numbers
// --------------------------------------------------------------------------- //

export function parseRecord(record?: string | null): { wins: number; losses: number } | null {
  const m = /^(\d+)-(\d+)/.exec(record ?? '');
  return m ? { wins: Number(m[1]), losses: Number(m[2]) } : null;
}

/** "W3" -> 3, "L2" -> -2, anything else -> 0. */
export function parseStreak(streak?: string | null): number {
  const m = /^([WL])(\d+)$/.exec(streak ?? '');
  if (!m) return 0;
  return m[1] === 'W' ? Number(m[2]) : -Number(m[2]);
}

function regressedPct(rec: { wins: number; losses: number }, priorGames: number): number {
  return (rec.wins + priorGames / 2) / (rec.wins + rec.losses + priorGames);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const signed = (v: number, digits = 1) => `${v > 0 ? '+' : ''}${v.toFixed(digits)}`;
/** Percentage for display; never claims certainty ("100%") for a very likely outcome. */
export function formatPct(p: number): string {
  if (p >= 0.995) return '>99%';
  if (p <= 0.005) return '<1%';
  return `${Math.round(p * 100)}%`;
}
const pct = formatPct;

interface TeamNumbers {
  name: string;
  record: { wins: number; losses: number };
  games: number;
  winPct: number;
  venue: { wins: number; losses: number } | null;
  venuePct: number | null;
  net: number | null;
  shrunkNet: number | null;
  streak: number;
  ppg: number | null;
  oppPpg: number | null;
}

function teamNumbers(side: CbbGameSide): TeamNumbers | null {
  if (!side.team_id) return null;
  const record = parseRecord(side.record);
  if (!record) return null;
  const games = record.wins + record.losses;
  if (games === 0) return null;

  const venue = parseRecord(side.venue_record);
  const venueGames = venue ? venue.wins + venue.losses : 0;
  const hasScoring = typeof side.ppg === 'number' && typeof side.opp_ppg === 'number';
  const net = hasScoring ? (side.ppg as number) - (side.opp_ppg as number) : null;

  return {
    name: side.short_name || side.name,
    record,
    games,
    winPct: regressedPct(record, S.winPctPriorGames),
    venue,
    venuePct: venue && venueGames > 0 ? regressedPct(venue, S.venuePriorGames) : null,
    net,
    shrunkNet: net === null ? null : (net * games) / (games + S.marginShrinkGames),
    streak: parseStreak(side.streak),
    ppg: hasScoring ? (side.ppg as number) : null,
    oppPpg: hasScoring ? (side.opp_ppg as number) : null,
  };
}

// --------------------------------------------------------------------------- //
// Records model
// --------------------------------------------------------------------------- //

interface RecordsModel {
  /** Expected home margin in points, and each input's contribution to it. */
  margin: number;
  contributions: { key: 'margin' | 'record' | 'venue' | 'form' | 'home'; pts: number }[];
  homeProb: number;
  total: number | null;
}

function recordsModel(home: TeamNumbers, away: TeamNumbers): RecordsModel {
  const contributions: RecordsModel['contributions'] = [{ key: 'home', pts: S.homeCourtPts }];

  if (home.shrunkNet !== null && away.shrunkNet !== null) {
    contributions.push({ key: 'margin', pts: home.shrunkNet - away.shrunkNet });
  }
  contributions.push({ key: 'record', pts: (home.winPct - away.winPct) * S.winPctPts });
  if (home.venuePct !== null && away.venuePct !== null) {
    contributions.push({ key: 'venue', pts: (home.venuePct - away.venuePct) * S.venuePts });
  }
  const form = (n: number) => clamp(n * S.streakPtsPerGame, -S.streakCapPts, S.streakCapPts);
  contributions.push({ key: 'form', pts: form(home.streak) - form(away.streak) });

  const margin = contributions.reduce((sum, c) => sum + c.pts, 0);
  const total =
    home.ppg !== null && home.oppPpg !== null && away.ppg !== null && away.oppPpg !== null
      ? (home.ppg + away.oppPpg) / 2 + (away.ppg + home.oppPpg) / 2
      : null;

  return { margin, contributions, homeProb: normalCdf(margin / S.marginSigmaPts), total };
}

// --------------------------------------------------------------------------- //
// Prices
// --------------------------------------------------------------------------- //

function priceRange(books: CbbBookLine[], side: Side): { best: PriceQuote | null; worst: PriceQuote | null } {
  const quotes = books
    .filter((b) => b.moneyline && typeof b.moneyline[side] === 'number')
    .map((b) => ({ price: b.moneyline![side], book: b.title }));
  if (quotes.length === 0) return { best: null, worst: null };
  // Higher American odds always pay more, for favourites and underdogs alike.
  const best = quotes.reduce((a, b) => (b.price > a.price ? b : a));
  const worst = quotes.reduce((a, b) => (b.price < a.price ? b : a));
  return { best, worst };
}

/** Market number nudged toward the records number by `weight`; whichever exists if only one does. */
const blend = (market: number | null, records: number | null, weight: number) =>
  market !== null && records !== null ? market + weight * (records - market) : (market ?? records);

const marginToProb = (margin: number) => normalCdf(margin / S.marginSigmaPts);
const probToMargin = (prob: number) => normalQuantile(prob) * S.marginSigmaPts;

// --------------------------------------------------------------------------- //
// Prediction
// --------------------------------------------------------------------------- //

/** Returns null when there is neither market data nor team records to work from. */
export function predictGame(game: CbbGame, teamsById?: Map<string, CbbTeam>): GamePrediction | null {
  const home = teamNumbers(game.home);
  const away = teamNumbers(game.away);
  const records = home && away ? recordsModel(home, away) : null;

  const recordsWeight =
    home && away
      ? (S.maxRecordsWeight * Math.min(home.games, away.games)) /
        (Math.min(home.games, away.games) + S.recordsWeightGames)
      : 0;

  // The market's view of the home margin: the spread when posted, otherwise implied by the moneyline.
  const spreadMargin = game.consensus_spread ? -game.consensus_spread.home : null;
  const fairHome = game.fair_win_prob?.home ?? null;
  const marketProbMargin = fairHome !== null ? probToMargin(fairHome) : spreadMargin;
  const marketHomeProb = fairHome ?? (spreadMargin !== null ? marginToProb(spreadMargin) : null);
  const recordsHomeProb = records?.homeProb ?? null;

  const blendedProbMargin = blend(marketProbMargin, records?.margin ?? null, recordsWeight);
  if (blendedProbMargin === null) return null;
  const homeProb =
    marketProbMargin === null ? (recordsHomeProb as number) : recordsWeight === 0 && fairHome !== null ? fairHome : marginToProb(blendedProbMargin);

  const winProb: Record<Side, number> = { home: homeProb, away: 1 - homeProb };
  const pick: Side = homeProb >= 0.5 ? 'home' : 'away';
  const pickProb = winProb[pick];
  const confidence = pickProb >= 0.75 ? 'Strong' : pickProb >= 0.6 ? 'Moderate' : 'Slight';

  const projectedMargin = blend(spreadMargin ?? marketProbMargin, records?.margin ?? null, recordsWeight);
  const projectedTotal = blend(game.consensus_total, records?.total ?? null, recordsWeight);

  const recordsDisagree =
    marketHomeProb !== null && recordsHomeProb !== null && marketHomeProb >= 0.5 !== recordsHomeProb >= 0.5;

  // ---- Moneyline value: blended probability vs. the best price on offer ----
  const range: GamePrediction['priceRange'] = {
    home: priceRange(game.books, 'home'),
    away: priceRange(game.books, 'away'),
  };
  let moneylineValue: MoneylineValue | null = null;
  const [minPrice, maxPrice] = S.valuePriceRange;
  for (const side of ['home', 'away'] as const) {
    const best = game.best_moneyline[side] ?? range[side].best;
    // Needs a real moneyline market to compare against, and a price where the estimate is reliable.
    if (!best || fairHome === null || best.price < minPrice || best.price > maxPrice) continue;
    const ev = winProb[side] * americanToDecimal(best.price) - 1;
    const edge = winProb[side] - impliedProb(best.price);
    if (ev >= S.minMoneylineEv && edge >= S.minMoneylineEdge && (!moneylineValue || ev > moneylineValue.ev)) {
      moneylineValue = { side, price: best.price, book: best.book, ev, edge };
    }
  }

  // ---- Spread / total leans: only when the records model moves us off the line ----
  let spreadLean: LineLean | null = null;
  if (
    game.consensus_spread &&
    spreadMargin !== null &&
    projectedMargin !== null &&
    records &&
    Math.abs(spreadMargin) <= S.maxSpreadForLean
  ) {
    const gap = projectedMargin - spreadMargin;
    if (Math.abs(gap) >= S.minLineGapPts) {
      const side: Side = gap > 0 ? 'home' : 'away';
      spreadLean = { pick: side, line: game.consensus_spread[side], projected: projectedMargin };
    }
  }
  let totalLean: LineLean | null = null;
  if (game.consensus_total !== null && projectedTotal !== null && records?.total != null) {
    const gap = projectedTotal - game.consensus_total;
    if (Math.abs(gap) >= S.minLineGapPts) {
      totalLean = { pick: gap > 0 ? 'over' : 'under', line: game.consensus_total, projected: projectedTotal };
    }
  }

  // ---- Win–loss analysis table ----
  const factors: Factor[] = [];
  const favorsHigher = (h: number | null, a: number | null, minGap: number): Side | null =>
    h === null || a === null || Math.abs(h - a) < minGap ? null : h > a ? 'home' : 'away';

  if (home && away) {
    factors.push({
      label: 'Season record',
      away: `${away.record.wins}-${away.record.losses}`,
      home: `${home.record.wins}-${home.record.losses}`,
      favors: favorsHigher(home.winPct, away.winPct, 0.02),
    });
    factors.push({
      label: 'Home / road record',
      away: away.venue ? `Road ${away.venue.wins}-${away.venue.losses}` : '—',
      home: home.venue ? `Home ${home.venue.wins}-${home.venue.losses}` : '—',
      favors: favorsHigher(home.venuePct, away.venuePct, 0.02),
    });
    factors.push({
      label: 'Scoring margin / game',
      away: away.net !== null ? signed(away.net) : '—',
      home: home.net !== null ? signed(home.net) : '—',
      favors: favorsHigher(home.net, away.net, 0.5),
    });
    factors.push({
      label: 'Points scored / allowed',
      away: away.ppg !== null && away.oppPpg !== null ? `${away.ppg.toFixed(1)} / ${away.oppPpg.toFixed(1)}` : '—',
      home: home.ppg !== null && home.oppPpg !== null ? `${home.ppg.toFixed(1)} / ${home.oppPpg.toFixed(1)}` : '—',
      favors: null,
    });
    factors.push({
      label: 'Current streak',
      away: game.away.streak && game.away.streak !== '-' ? game.away.streak : '—',
      home: game.home.streak && game.home.streak !== '-' ? game.home.streak : '—',
      favors: home.streak === away.streak ? null : home.streak > away.streak ? 'home' : 'away',
    });
  }
  const homeTeam = game.home.team_id ? teamsById?.get(game.home.team_id) : undefined;
  const awayTeam = game.away.team_id ? teamsById?.get(game.away.team_id) : undefined;
  if (homeTeam?.vs_ap_top25 || awayTeam?.vs_ap_top25) {
    factors.push({
      label: 'vs AP Top 25',
      away: awayTeam?.vs_ap_top25 ?? '—',
      home: homeTeam?.vs_ap_top25 ?? '—',
      favors: null,
    });
  }
  if (game.home.conference || game.away.conference) {
    factors.push({
      label: 'Conference (record)',
      away: [game.away.conference, game.away.conference_record].filter(Boolean).join(' · ') || '—',
      home: [game.home.conference, game.home.conference_record].filter(Boolean).join(' · ') || '—',
      favors: null,
    });
  }
  if (marketHomeProb !== null) {
    factors.push({
      label: fairHome !== null ? 'Market win chance (no vig)' : 'Market win chance (from spread)',
      away: pct(1 - marketHomeProb),
      home: pct(marketHomeProb),
      favors: marketHomeProb === 0.5 ? null : marketHomeProb > 0.5 ? 'home' : 'away',
    });
  }

  // ---- Plain-language reasons for the pick ----
  const reasons: string[] = [];
  const pickNumbers = pick === 'home' ? home : away;
  const otherNumbers = pick === 'home' ? away : home;
  if (marketHomeProb !== null) {
    const marketPick = marketHomeProb >= 0.5 ? 'home' : 'away';
    reasons.push(
      marketPick === pick
        ? `Sportsbooks make them ${pct(Math.max(marketHomeProb, 1 - marketHomeProb))} favorites`
        : `Close call: sportsbooks lean slightly the other way (${pct(Math.max(marketHomeProb, 1 - marketHomeProb))})`
    );
  } else {
    reasons.push('No betting market yet — based on season records only');
  }
  if (records && pickNumbers && otherNumbers) {
    const toPick = (pts: number) => (pick === 'home' ? pts : -pts);
    const labels: Record<RecordsModel['contributions'][number]['key'], string> = {
      margin: `Better scoring margin (${signed(pickNumbers.net ?? 0)} vs ${signed(otherNumbers.net ?? 0)})`,
      record: `Stronger record (${pickNumbers.record.wins}-${pickNumbers.record.losses} vs ${otherNumbers.record.wins}-${otherNumbers.record.losses})`,
      venue: pick === 'home' ? 'Better home record than their opponent’s road record' : 'Better road record than their opponent’s home record',
      form: `Better current form (${pick === 'home' ? game.home.streak : game.away.streak})`,
      home: 'Home-court advantage',
    };
    records.contributions
      .filter((c) => toPick(c.pts) >= 0.75 && (c.key !== 'home' || pick === 'home'))
      .sort((a, b) => toPick(b.pts) - toPick(a.pts))
      .slice(0, 2)
      .forEach((c) => reasons.push(labels[c.key]));
  }

  return {
    winProb,
    pick,
    pickProb,
    confidence,
    marketHomeProb,
    recordsHomeProb,
    recordsWeight,
    recordsDisagree,
    smallSample: !!home && !!away && Math.min(home.games, away.games) < 4,
    projectedMargin,
    projectedTotal,
    reasons,
    factors,
    priceRange: range,
    moneylineValue,
    spreadLean,
    totalLean,
  };
}
