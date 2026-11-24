'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ChevronDown, Clock, Info, Loader2, Search } from 'lucide-react';
import { getCollegeBasketball } from '@/lib/localDataService';
import { useSports } from '@/context/SportsContext';
import type { CbbGame, CbbGameSide, CbbLeague, CbbTeam, CollegeBasketballData } from '@/types';

// Odds API only lists games that haven't finished, but this page reads a snapshot,
// so games that tipped off long ago are almost certainly over.
const HIDE_GAMES_STARTED_HOURS_AGO = 4;
const STANDINGS_PAGE_SIZE = 50;

const formatOdds = (price?: number | null) =>
  price === undefined || price === null ? '—' : price > 0 ? `+${price}` : `${price}`;

const formatSpread = (point?: number | null) =>
  point === undefined || point === null ? '—' : point === 0 ? 'PK' : point > 0 ? `+${point}` : `${point}`;

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

const TeamLogo = ({ src, name, size = 36 }: { src?: string | null; name: string; size?: number }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full bg-gradient-to-br from-pink-400 to-rose-600 text-white font-bold text-sm flex items-center justify-center shrink-0"
      >
        {name.charAt(0)}
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={`${name} logo`}
      width={size}
      height={size}
      className="object-contain shrink-0"
      onError={() => setFailed(true)}
    />
  );
};

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

function TeamRow({
  side,
  venue,
  spread,
  moneyline,
  winProb,
}: {
  side: CbbGameSide;
  venue: 'home' | 'away';
  spread?: number | null;
  moneyline: { price: number; book: string } | null;
  winProb?: number | null;
}) {
  const name = side.short_name || side.name;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_4.5rem] sm:grid-cols-[minmax(0,1fr)_5rem_7rem_4rem] items-center gap-2 sm:gap-4 py-2">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <TeamLogo src={side.logo} name={name} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-slate-900 text-sm sm:text-base truncate">{name}</span>
            {side.record && (
              <span className="text-xs sm:text-sm font-bold text-slate-500 shrink-0">({side.record})</span>
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
        <div className="font-extrabold text-slate-900 text-sm sm:text-base">{formatSpread(spread)}</div>
      </div>

      <div className="text-center">
        <div className="font-extrabold text-slate-900 text-sm sm:text-base">{formatOdds(moneyline?.price)}</div>
        {moneyline && <div className="text-[10px] text-slate-400 font-medium truncate">{moneyline.book}</div>}
      </div>

      <div className="hidden sm:block text-center font-bold text-slate-700 text-sm">
        {winProb !== undefined && winProb !== null ? `${Math.round(winProb * 100)}%` : '—'}
      </div>
    </div>
  );
}

function BooksTable({ game }: { game: CbbGame }) {
  const bestAway = game.best_moneyline.away?.price;
  const bestHome = game.best_moneyline.home?.price;
  const away = game.away.short_name || game.away.name;
  const home = game.home.short_name || game.home.name;

  return (
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
              <td className={`py-2 px-2 text-center ${b.moneyline?.away === bestAway ? 'font-extrabold text-emerald-700' : ''}`}>
                {formatOdds(b.moneyline?.away)}
              </td>
              <td className={`py-2 px-2 text-center ${b.moneyline?.home === bestHome ? 'font-extrabold text-emerald-700' : ''}`}>
                {formatOdds(b.moneyline?.home)}
              </td>
              <td className="py-2 px-2 text-center whitespace-nowrap">
                {b.spread ? `${formatSpread(b.spread.away.point)} (${formatOdds(b.spread.away.price)})` : '—'}
              </td>
              <td className="py-2 px-2 text-center whitespace-nowrap">
                {b.spread ? `${formatSpread(b.spread.home.point)} (${formatOdds(b.spread.home.price)})` : '—'}
              </td>
              <td className="py-2 pl-2 text-center whitespace-nowrap">
                {b.total
                  ? `${b.total.over.point ?? '—'} (${formatOdds(b.total.over.price)} / ${formatOdds(b.total.under.price)})`
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GameCard({ game, now }: { game: CbbGame; now: number }) {
  const [showBooks, setShowBooks] = useState(false);
  const started = new Date(game.commence_time).getTime() <= now;

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-4 sm:p-5 shadow-xs">
      <div className="flex items-start sm:items-center justify-between gap-3 mb-1">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 min-w-0 text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 shrink-0" />
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

      <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_4.5rem] sm:grid-cols-[minmax(0,1fr)_5rem_7rem_4rem] gap-2 sm:gap-4 text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-2">
        <span>Team</span>
        <span className="text-center">Spread</span>
        <span className="text-center">Best ML</span>
        <span className="hidden sm:block text-center">Win %</span>
      </div>

      <div className="divide-y divide-slate-100">
        <TeamRow
          side={game.away}
          venue="away"
          spread={game.consensus_spread?.away}
          moneyline={game.best_moneyline.away}
          winProb={game.fair_win_prob?.away}
        />
        <TeamRow
          side={game.home}
          venue="home"
          spread={game.consensus_spread?.home}
          moneyline={game.best_moneyline.home}
          winProb={game.fair_win_prob?.home}
        />
      </div>

      {game.books.length > 0 && (
        <>
          <button
            onClick={() => setShowBooks((v) => !v)}
            aria-expanded={showBooks}
            className="mt-2 -ml-1 flex items-center gap-1 py-1.5 px-1 rounded-lg text-xs font-bold text-[#FA2E72] hover:text-[#E02263] active:bg-pink-50 cursor-pointer"
          >
            {showBooks ? 'Hide' : 'Compare'} {game.books.length} sportsbooks
            <ChevronDown className={`w-4 h-4 transition-transform ${showBooks ? 'rotate-180' : ''}`} />
          </button>
          {showBooks && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <BooksTable game={game} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GamesView({ league, now }: { league: CbbLeague; now: number }) {
  const games = useMemo(() => {
    const cutoff = now - HIDE_GAMES_STARTED_HOURS_AGO * 3600 * 1000;
    return league.games.filter((g) => new Date(g.commence_time).getTime() > cutoff);
  }, [league, now]);

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

  if (games.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-10 text-center border border-slate-200 shadow-xs">
        <p className="text-slate-700 font-semibold">No upcoming games in the latest odds pull.</p>
        <p className="text-slate-500 text-sm mt-1">Odds last pulled {timeAgo(league.odds_updated_at, now)}.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {games.map((g) => (
        <GameCard key={g.id} game={g} now={now} />
      ))}
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
                <th className="py-3 px-2 font-bold text-center">Win %</th>
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
                  <td className="py-2.5 px-2 text-center">{t.win_pct !== null ? t.win_pct.toFixed(3).replace(/^0/, '') : '—'}</td>
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

export default function CollegeBasketballPage() {
  const { gender, setGender } = useSports();
  const [data, setData] = useState<CollegeBasketballData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'games' | 'teams'>('games');
  // Captured once on load so renders stay pure; drives 'started' badges and 'updated X ago'.
  const [now, setNow] = useState(0);

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
      {/* Hero */}
      <div className="w-full rounded-3xl overflow-hidden relative shadow-sm border border-pink-100 bg-gradient-to-r from-pink-50 via-pink-100 to-rose-50 flex items-center px-5 sm:px-10 py-5 sm:py-7">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#FA2E72] rounded-full flex items-center justify-center shadow-md text-2xl sm:text-3xl text-white shrink-0">
            🏀
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-slate-900 mb-0.5 sm:mb-1">College Basketball Odds</h1>
            <p className="text-slate-600 text-xs sm:text-sm font-medium">
              NCAA lines from US sportsbooks, with every team&apos;s win-loss record.
            </p>
          </div>
        </div>
      </div>

      {/* Men / Women + tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex bg-white rounded-full p-1 border border-slate-200 shadow-xs">
          {(
            [
              ['games', 'Games & Odds'],
              ['teams', 'Team Records'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                tab === value ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex bg-white rounded-full p-1 border border-slate-200 shadow-xs">
          {(['Men', 'Women'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                gender === g ? 'bg-[#E02263] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
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
            <span>Odds updated {timeAgo(league.odds_updated_at, now)}</span>
            <span>Records updated {timeAgo(league.records_updated_at, now)}</span>
          </div>

          {tab === 'games' ? <GamesView league={league} now={now} /> : <StandingsView key={league.odds_sport_key} league={league} />}

          <p className="flex items-start gap-2 text-[11px] text-slate-400 font-medium">
            <Info className="w-3.5 h-3.5 mt-px shrink-0" />
            Odds are a snapshot from {data?.sources.odds} and move quickly — confirm the line with the sportsbook before
            betting. Win % is the bookmakers&apos; average implied probability with the vig removed. Records from{' '}
            {data?.sources.records}.
          </p>
        </>
      )}
    </div>
  );
}
