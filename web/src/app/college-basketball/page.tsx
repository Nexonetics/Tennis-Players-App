'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Clock, Info, Loader2, Search, AlertTriangle, RefreshCw } from 'lucide-react';
import { AdminAuthError, getCollegeBasketball, refreshCollegeBasketball } from '@/lib/localDataService';
import { useSports } from '@/context/SportsContext';
import { findRecordOddsMismatch, predictGame, type GamePrediction } from '@/lib/cbbModel';
import { TeamLogo, describeLeans, formatOdds, formatSpread, teamName, type LeanItem } from '@/components/cbb/shared';
import { PredictionPanel, AnalysisTable } from '@/components/cbb/PredictionPanel';
import { TopLeans } from '@/components/cbb/TopLeans';
import type { CbbGame, CbbGameSide, CbbLeague, CbbTeam, CollegeBasketballData } from '@/types';

// Odds API only lists games that haven't finished, but this page reads a snapshot,
// so games that tipped off long ago are almost certainly over.
const HIDE_GAMES_STARTED_HOURS_AGO = 4;
const STANDINGS_PAGE_SIZE = 50;
/** The odds pull runs once a day (.github/workflows/college_basketball_odds.yml), so older than this is stale. */
const ODDS_STALE_HOURS = 20;

const formatTipoff = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

function timeAgo(iso: string | null | undefined, now: number): string {
  if (!iso) return 'never';
  const mins = Math.round((now - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} days ago`;
}

const StreakBadge = ({ streak }: { streak?: string | null }) => {
  if (!streak || streak === '-') return null;
  const won = streak.startsWith('W');
  return (
    <span
      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
        won ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
      }`}
    >
      {streak}
    </span>
  );
};

const other = (side: 'home' | 'away') => (side === 'home' ? 'away' : 'home');
/** Record win %: 4-1 -> "80%". */
const recordPct = (p: number) => `${Math.round(p * 100)}%`;

// Team | Spread | Best ML
const TEAM_GRID =
  'grid grid-cols-[minmax(0,1fr)_3.5rem_4.5rem] sm:grid-cols-[minmax(0,1fr)_5rem_7rem] gap-2 sm:gap-4';

function TeamRow({
  side,
  venue,
  spread,
  moneyline,
  mismatch = false,
}: {
  side: CbbGameSide;
  venue: 'home' | 'away';
  spread?: number | null;
  moneyline: { price: number; book: string } | null;
  /** Records and moneyline disagree: better record is the underdog, worse record the favourite. */
  mismatch?: boolean;
}) {
  const name = side.short_name || side.name;
  return (
    <div className={`${TEAM_GRID} items-center py-2.5 ${mismatch ? '-mx-2 px-2 rounded-xl bg-red-50' : ''}`}>
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <TeamLogo src={side.logo} name={name} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-slate-900 text-sm sm:text-base truncate">{name}</span>
            {side.record && (
              <span className="text-xs sm:text-sm font-bold text-slate-500 shrink-0">({side.record})</span>
            )}
            {mismatch && (
              <span className="shrink-0 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-red-600 text-white">
                Mismatch
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-slate-500 font-medium">
            {side.team_id ? (
              <>
                <span>
                  {venue === 'home' ? 'Home' : 'Away'} {side.venue_record ?? '—'}
                </span>
                {side.conference && <span className="hidden sm:inline">• {side.conference}</span>}
                <StreakBadge streak={side.streak} />
              </>
            ) : (
              <span className="text-amber-600">No record found for “{side.name}”</span>
            )}
          </div>
        </div>
      </div>

      <div className="text-center">
        <div className="font-extrabold text-slate-900 text-sm sm:text-base tabular-nums">{formatSpread(spread)}</div>
      </div>

      <div className="text-center">
        <div className="font-extrabold text-slate-900 text-sm sm:text-base tabular-nums">{formatOdds(moneyline?.price)}</div>
        {moneyline && <div className="text-[10px] text-slate-400 font-medium truncate">{moneyline.book}</div>}
      </div>
    </div>
  );
}

function BooksTable({ game }: { game: CbbGame }) {
  const prices = (side: 'home' | 'away') =>
    game.books.map((b) => b.moneyline?.[side]).filter((p): p is number => typeof p === 'number');
  const awayPrices = prices('away');
  const homePrices = prices('home');
  const best = { away: Math.max(...awayPrices), home: Math.max(...homePrices) };
  const worst = { away: Math.min(...awayPrices), home: Math.min(...homePrices) };
  const away = teamName(game, 'away');
  const home = teamName(game, 'home');

  const mlClass = (price: number | undefined, side: 'home' | 'away') => {
    if (price === undefined || best[side] === worst[side]) return '';
    if (price === best[side]) return 'font-extrabold text-emerald-700';
    if (price === worst[side]) return 'font-semibold text-rose-600';
    return '';
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <table className="w-full text-xs sm:text-sm min-w-[560px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-400 text-left">
              <th className="py-2 pr-3 font-bold sticky left-0 z-10 bg-white">Sportsbook</th>
              <th className="py-2 px-2 font-bold text-center">{away} ML</th>
              <th className="py-2 px-2 font-bold text-center">{home} ML</th>
              <th className="py-2 px-2 font-bold text-center">{away} spread</th>
              <th className="py-2 px-2 font-bold text-center">{home} spread</th>
              <th className="py-2 pl-2 font-bold text-center">Total (O / U)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {game.books.map((b) => (
              <tr key={b.key} className="text-slate-700">
                <td className="py-2 pr-3 font-semibold text-slate-900 whitespace-nowrap sticky left-0 z-10 bg-white shadow-[6px_0_6px_-6px_rgba(15,23,42,0.12)] sm:shadow-none">
                  {b.title}
                </td>
                <td className={`py-2 px-2 text-center tabular-nums ${mlClass(b.moneyline?.away, 'away')}`}>
                  {formatOdds(b.moneyline?.away)}
                </td>
                <td className={`py-2 px-2 text-center tabular-nums ${mlClass(b.moneyline?.home, 'home')}`}>
                  {formatOdds(b.moneyline?.home)}
                </td>
                <td className="py-2 px-2 text-center whitespace-nowrap tabular-nums">
                  {b.spread ? `${formatSpread(b.spread.away.point)} (${formatOdds(b.spread.away.price)})` : '—'}
                </td>
                <td className="py-2 px-2 text-center whitespace-nowrap tabular-nums">
                  {b.spread ? `${formatSpread(b.spread.home.point)} (${formatOdds(b.spread.home.price)})` : '—'}
                </td>
                <td className="py-2 pl-2 text-center whitespace-nowrap tabular-nums">
                  {b.total
                    ? `${b.total.over.point ?? '—'} (${formatOdds(b.total.over.price)} / ${formatOdds(b.total.under.price)})`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-400">
        Moneyline: <span className="font-bold text-emerald-700">green</span> = best price for that team,{' '}
        <span className="font-bold text-rose-600">red</span> = worst. Always take the best number available.
      </p>
    </div>
  );
}

function GameCard({
  game,
  prediction,
  started,
}: {
  game: CbbGame;
  prediction: GamePrediction | null;
  started: boolean;
}) {
  const mismatch = findRecordOddsMismatch(game);
  const [showPrediction, setShowPrediction] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showBooks, setShowBooks] = useState(false);

  const toggleClass =
    '-ml-1 flex items-center gap-1 py-1.5 px-1 rounded-lg text-xs font-bold text-[#FA2E72] hover:text-[#E02263] active:bg-pink-50 cursor-pointer';

  return (
    <article
      id={`game-${game.id}`}
      className="scroll-mt-20 md:scroll-mt-4 bg-white border border-slate-100 rounded-3xl p-4 sm:p-5 shadow-xs"
    >
      <div className="flex items-start sm:items-center justify-between gap-3 mb-1">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 min-w-0 text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {formatTipoff(game.commence_time)}
          </span>
          {started && (
            <span className="w-fit text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 whitespace-nowrap">
              Started · pre-game lines
            </span>
          )}
        </div>
        {game.consensus_total !== null && (
          <span className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-100 rounded-full px-2.5 py-1 shrink-0">
            O/U {game.consensus_total}
          </span>
        )}
      </div>

      <div className="mt-2">
        <div className="min-w-0">
          <div className={`${TEAM_GRID} text-[10px] uppercase tracking-wider font-bold text-slate-400`}>
            <span>Team</span>
            <span className="text-center">Spread</span>
            <span className="text-center">Best ML</span>
          </div>
          <div className="divide-y divide-slate-100">
            {(['away', 'home'] as const).map((side) => (
              <TeamRow
                key={side}
                side={game[side]}
                venue={side}
                spread={game.consensus_spread?.[side]}
                moneyline={game.best_moneyline[side]}
                mismatch={mismatch !== null}
              />
            ))}
          </div>
        </div>
      </div>

      {mismatch && (
        <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden="true" />
          <span>
            Mismatch: {teamName(game, mismatch.side)} has the better record ({recordPct(mismatch.winPct[mismatch.side])}) but
            is the underdog ({formatOdds(mismatch.price[mismatch.side])}); {teamName(game, other(mismatch.side))} has the
            worse record ({recordPct(mismatch.winPct[other(mismatch.side)])}) but is the favourite (
            {formatOdds(mismatch.price[other(mismatch.side)])}).
          </span>
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-5">
        {prediction && (
          <button onClick={() => setShowPrediction((v) => !v)} aria-expanded={showPrediction} className={toggleClass}>
            {showPrediction ? 'Show less' : 'Show more'}
            <ChevronDown className={`w-4 h-4 transition-transform ${showPrediction ? 'rotate-180' : ''}`} />
          </button>
        )}
        {prediction && prediction.factors.length > 0 && (
          <button onClick={() => setShowAnalysis((v) => !v)} aria-expanded={showAnalysis} className={toggleClass}>
            {showAnalysis ? 'Hide' : 'Show'} win–loss analysis
            <ChevronDown className={`w-4 h-4 transition-transform ${showAnalysis ? 'rotate-180' : ''}`} />
          </button>
        )}
        {game.books.length > 0 && (
          <button onClick={() => setShowBooks((v) => !v)} aria-expanded={showBooks} className={toggleClass}>
            {showBooks ? 'Hide' : 'Compare'} {game.books.length} sportsbooks
            <ChevronDown className={`w-4 h-4 transition-transform ${showBooks ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {showPrediction && prediction && (
        <div className="mt-3">
          <PredictionPanel game={game} prediction={prediction} started={started} />
        </div>
      )}
      {showAnalysis && prediction && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <AnalysisTable game={game} prediction={prediction} />
        </div>
      )}
      {showBooks && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <BooksTable game={game} />
        </div>
      )}
    </article>
  );
}

function OddsFreshness({ league, now }: { league: CbbLeague; now: number }) {
  if (!league.odds_updated_at) return null;
  const ageHours = (now - new Date(league.odds_updated_at).getTime()) / 3.6e6;
  const stale = ageHours > ODDS_STALE_HOURS;
  return (
    <div
      role={stale ? 'status' : undefined}
      className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-xs sm:text-sm ${
        stale ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-white border-slate-200 text-slate-600'
      }`}
    >
      {stale ? (
        <AlertTriangle className="w-4 h-4 mt-px shrink-0 text-amber-600" aria-hidden="true" />
      ) : (
        <Clock className="w-4 h-4 mt-px shrink-0 text-slate-400" aria-hidden="true" />
      )}
      <p>
        <span className="font-bold">Odds as of {formatTipoff(league.odds_updated_at)}</span> ({timeAgo(league.odds_updated_at, now)}).{' '}
        {stale
          ? 'Lines have probably moved since, so check the current price with the sportsbook before betting. '
          : ''}
        Odds refresh once a day, around 9–10am ET.
      </p>
    </div>
  );
}

type GameFilter = 'all' | 'leans' | 'upsets';
type GameSort = 'time' | 'confidence' | 'edge';

interface AnalysedGame {
  game: CbbGame;
  prediction: GamePrediction | null;
  started: boolean;
  leans: LeanItem[];
}

function GamesView({ league, now }: { league: CbbLeague; now: number }) {
  const [filter, setFilter] = useState<GameFilter>('all');
  const [sort, setSort] = useState<GameSort>('time');

  const teamsById = useMemo(() => new Map(league.teams.map((t) => [t.id, t])), [league]);

  const analysed = useMemo<AnalysedGame[]>(() => {
    const cutoff = now - HIDE_GAMES_STARTED_HOURS_AGO * 3600 * 1000;
    return league.games
      .filter((g) => new Date(g.commence_time).getTime() > cutoff)
      .map((game) => {
        const prediction = predictGame(game, teamsById);
        const started = new Date(game.commence_time).getTime() <= now;
        return { game, prediction, started, leans: prediction && !started ? describeLeans(game, prediction) : [] };
      });
  }, [league, now, teamsById]);

  if (league.odds_status === 'inactive') {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-10 text-center border border-slate-200 shadow-xs">
        <p className="text-slate-700 font-semibold">No {league.title} betting lines are posted right now.</p>
        <p className="text-slate-500 text-sm mt-1">
          The Odds API has no active games for this league. Team records are still current — see the Team Records tab.
        </p>
      </div>
    );
  }

  if (analysed.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-10 text-center border border-slate-200 shadow-xs">
        <p className="text-slate-700 font-semibold">No upcoming games in the latest odds pull.</p>
        <p className="text-slate-500 text-sm mt-1">Odds last pulled {timeAgo(league.odds_updated_at, now)}.</p>
      </div>
    );
  }

  const counts: Record<GameFilter, number> = {
    all: analysed.length,
    leans: analysed.filter((a) => a.leans.length > 0).length,
    upsets: analysed.filter((a) => a.prediction?.recordsDisagree).length,
  };
  const strongestLean = (a: AnalysedGame) => Math.max(-1, ...a.leans.map((l) => l.strength));
  const visible = analysed
    .filter((a) => (filter === 'leans' ? a.leans.length > 0 : filter === 'upsets' ? a.prediction?.recordsDisagree : true))
    .sort((a, b) =>
      sort === 'confidence'
        ? (b.prediction?.pickProb ?? 0) - (a.prediction?.pickProb ?? 0)
        : sort === 'edge'
          ? strongestLean(b) - strongestLean(a)
          : a.game.commence_time.localeCompare(b.game.commence_time)
    );

  const filterLabels: Record<GameFilter, string> = { all: 'All games', leans: 'With a lean', upsets: 'Upset watch' };

  return (
    <div className="flex flex-col gap-4">
      <OddsFreshness league={league} now={now} />

      <TopLeans
        entries={analysed.flatMap((a) => a.leans.map((lean) => ({ game: a.game, lean })))}
        upcomingCount={analysed.filter((a) => !a.started).length}
      />

      {/* Filters + sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0" role="group" aria-label="Filter games">
          {(Object.keys(filterLabels) as GameFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                filter === f
                  ? 'bg-slate-900 text-white border-transparent'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {filterLabels[f]} <span className="opacity-60 tabular-nums">{counts[f]}</span>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 font-medium shrink-0">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as GameSort)}
            className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1.5 sm:py-1 font-semibold focus:outline-none focus:border-[#FA2E72] cursor-pointer text-base sm:text-sm"
          >
            <option value="time">Tip-off time</option>
            <option value="confidence">Most confident pick</option>
            <option value="edge">Biggest edge</option>
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-xs text-sm text-slate-500">
          No games match this filter right now.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((a) => (
            <GameCard key={a.game.id} game={a.game} prediction={a.prediction} started={a.started} />
          ))}
        </div>
      )}
    </div>
  );
}

function StandingsView({ league }: { league: CbbLeague }) {
  const [query, setQuery] = useState('');
  const [conference, setConference] = useState('All');
  const [limit, setLimit] = useState(STANDINGS_PAGE_SIZE);

  const conferences = useMemo(
    () => ['All', ...Array.from(new Set(league.teams.map((t) => t.conference).filter(Boolean))).sort()],
    [league]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return league.teams.filter(
      (t: CbbTeam) =>
        (conference === 'All' || t.conference === conference) &&
        (!q ||
          t.name.toLowerCase().includes(q) ||
          (t.abbreviation || '').toLowerCase() === q ||
          (t.conference || '').toLowerCase().includes(q))
    );
  }, [league, query, conference]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <label className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-2.5 sm:py-2 shadow-xs focus-within:border-[#FA2E72]/50 focus-within:ring-2 focus-within:ring-[#FA2E72]/15">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(STANDINGS_PAGE_SIZE);
            }}
            placeholder="Search team or conference"
            enterKeyHint="search"
            className="flex-1 bg-transparent text-base sm:text-sm outline-none placeholder:text-slate-400 min-w-0"
          />
        </label>
        <select
          value={conference}
          onChange={(e) => {
            setConference(e.target.value);
            setLimit(STANDINGS_PAGE_SIZE);
          }}
          className="bg-white border border-slate-200 rounded-full px-4 py-2.5 sm:py-2 text-base sm:text-sm font-semibold text-slate-700 shadow-xs cursor-pointer"
        >
          {conferences.map((c) => (
            <option key={c} value={c}>
              {c === 'All' ? 'All conferences' : c}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px] sm:min-w-[720px]">
            <thead className="bg-slate-50/80">
              <tr className="text-[10px] uppercase tracking-wider text-slate-400 text-left">
                <th className="py-3 pl-4 pr-2 font-bold w-12 min-w-12 sticky left-0 z-10 bg-slate-50">#</th>
                <th className="py-3 px-2 font-bold sticky left-12 z-10 bg-slate-50">Team</th>
                <th className="py-3 px-2 font-bold text-center">W-L</th>
                <th className="py-3 px-2 font-bold text-center">Home</th>
                <th className="py-3 px-2 font-bold text-center">Away</th>
                <th className="py-3 px-2 font-bold text-center">Conf</th>
                <th className="py-3 px-2 font-bold text-center">Streak</th>
                <th className="py-3 px-2 font-bold text-center">PPG</th>
                <th className="py-3 pl-2 pr-4 font-bold text-center">Opp PPG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.slice(0, limit).map((t, i) => (
                <tr key={t.id} className="group text-slate-700 hover:bg-slate-50/60">
                  <td className="py-2.5 pl-4 pr-2 w-12 min-w-12 text-xs font-bold text-slate-400 sticky left-0 z-10 bg-white group-hover:bg-slate-50">
                    {i + 1}
                  </td>
                  <td className="py-2.5 px-2 sticky left-12 z-10 bg-white group-hover:bg-slate-50 shadow-[6px_0_6px_-6px_rgba(15,23,42,0.12)] sm:shadow-none">
                    <div className="flex items-center gap-2.5 min-w-0 w-[9.5rem] sm:w-auto">
                      <TeamLogo src={t.logo} name={t.short_name || t.name} size={28} />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{t.name}</div>
                        <div className="text-[11px] text-slate-400 font-medium truncate">{t.conference}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center font-extrabold text-slate-900">{t.record ?? `${t.wins}-${t.losses}`}</td>
                  <td className="py-2.5 px-2 text-center">{t.home_record ?? '—'}</td>
                  <td className="py-2.5 px-2 text-center">{t.away_record ?? '—'}</td>
                  <td className="py-2.5 px-2 text-center">{t.conference_record ?? '—'}</td>
                  <td className="py-2.5 px-2 text-center">
                    <StreakBadge streak={t.streak} />
                  </td>
                  <td className="py-2.5 px-2 text-center">{t.ppg ?? '—'}</td>
                  <td className="py-2.5 pl-2 pr-4 text-center">{t.opp_ppg ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="p-8 text-center text-slate-500 text-sm">No teams match your search.</p>}
      </div>

      {filtered.length > limit && (
        <button
          onClick={() => setLimit((l) => l + STANDINGS_PAGE_SIZE)}
          className="self-center px-5 py-2 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer active:scale-95"
        >
          Show more ({filtered.length - limit} left)
        </button>
      )}
    </div>
  );
}

// The admin password is remembered for this browser tab only, so it isn't asked on every press.
const ADMIN_KEY_STORAGE = 'cbb-admin-key';

function readAdminKey(): string {
  try {
    return sessionStorage.getItem(ADMIN_KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

function writeAdminKey(key: string | null) {
  try {
    if (key) sessionStorage.setItem(ADMIN_KEY_STORAGE, key);
    else sessionStorage.removeItem(ADMIN_KEY_STORAGE);
  } catch {
    // Storage blocked: the password is simply asked again next time.
  }
}

export default function CollegeBasketballPage() {
  const { gender, setGender } = useSports();
  const [data, setData] = useState<CollegeBasketballData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'games' | 'teams'>('games');
  // Captured once on load so renders stay pure; drives 'started' badges and 'updated X ago'.
  const [now, setNow] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const handleFetchOdds = async () => {
    const key = readAdminKey() || window.prompt('Admin password (each fetch uses Odds API credits):')?.trim();
    if (!key) return;
    setRefreshing(true);
    setRefreshNotice(null);
    try {
      const fresh = await refreshCollegeBasketball(key);
      writeAdminKey(key);
      setData(fresh);
      setNow(Date.now());
      const left = fresh.odds_api_credits?.remaining;
      setRefreshNotice({ ok: true, text: left != null ? `Odds updated · ${left} credits left this month` : 'Odds updated' });
    } catch (err) {
      if (err instanceof AdminAuthError) writeAdminKey(null);
      setRefreshNotice({ ok: false, text: err instanceof Error ? err.message : 'Could not fetch odds' });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    getCollegeBasketball()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setNow(Date.now());
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const league = gender === 'Women' ? data?.leagues.women : data?.leagues.men;

  return (
    <div className="flex flex-col gap-5 sm:gap-6 w-full max-w-6xl mx-auto pb-12">
      <h1 className="sr-only">College Basketball Odds</h1>

      {/* Tabs + Men / Women + Fetch latest odds */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex bg-white rounded-full p-1 border border-slate-200 shadow-xs">
            {(
              [
                ['games', 'Games & Odds'],
                ['teams', 'Team Records'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={tab === value}
                onClick={() => setTab(value)}
                className={`flex-1 md:flex-none px-4 sm:px-6 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  tab === value ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5">
            <div className="flex bg-white rounded-full p-1 border border-slate-200 shadow-xs">
              {(['Men', 'Women'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={gender === g}
                  onClick={() => setGender(g)}
                  className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    gender === g ? 'bg-[#E02263] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleFetchOdds}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-full bg-white border border-pink-200 px-4 py-2.5 text-xs font-bold text-brand-pink-dark shadow-xs hover:bg-pink-50/60 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait active:scale-95 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Fetching odds…' : 'Fetch latest odds'}
            </button>
          </div>
        </div>

        {refreshNotice && (
          <p
            role="status"
            className={`text-xs font-semibold md:text-right ${refreshNotice.ok ? 'text-emerald-700' : 'text-rose-700'}`}
          >
            {refreshNotice.text}
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-10 h-10 text-[#FA2E72] animate-spin" />
          <span className="text-sm font-semibold text-slate-500">Loading college basketball data...</span>
        </div>
      ) : !league ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-xs">
          <p className="text-slate-700 font-semibold">No college basketball data yet.</p>
          <p className="text-slate-500 text-sm mt-1">
            Run <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">python3 scraper/college_basketball_odds.py</code>{' '}
            to pull odds and records.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium -mt-1">
            <span className="font-bold text-slate-700">
              {league.title} · {league.season}
            </span>
            {tab === 'teams' && <span>Odds updated {timeAgo(league.odds_updated_at, now)}</span>}
            <span>Records updated {timeAgo(league.records_updated_at, now)}</span>
          </div>

          {tab === 'games' ? <GamesView league={league} now={now} /> : <StandingsView key={league.odds_sport_key} league={league} />}

          <p className="flex items-start gap-2 text-[11px] text-slate-400 font-medium">
            <Info className="w-3.5 h-3.5 mt-px shrink-0" />
            <span>
              Odds are a once-a-day snapshot from {data?.sources.odds} and move quickly — confirm the line with the
              sportsbook before betting. Predictions start from the sportsbooks&apos; average win probability (vig
              removed) and adjust it with a season-records model (scoring margin, win–loss and home/road records,
              current streak, home court); a lean is shown only when that estimate beats the best available price.
              These are estimates, not guarantees or betting advice — please bet responsibly. Records from{' '}
              {data?.sources.records}.
            </span>
          </p>
        </>
      )}
    </div>
  );
}
