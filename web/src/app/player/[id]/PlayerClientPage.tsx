'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, User, Trophy, Medal, Star, TrendingUp, ArrowLeftRight, ArrowLeft, Loader2, Building2, Shield, Award } from 'lucide-react';
import { UnifiedAthlete, HistoryPoint } from '@/types';
import { getAthleteById, getAthleteHistory } from '@/lib/localDataService';
import { AthleteImage } from '@/components/ui/AthleteImage';
import { formatMonthYear, formatFullDate } from '@/lib/format';
import { formatRank, isRanked } from '@/lib/sports';
import { RankingHistoryChart } from '@/components/player/RankingHistoryChart';

interface TeamExtraInfo {
  founded_year?: number | string;
  arena?: string;
  stadium?: string;
  league?: string;
  confederation?: string;
  head_coach?: string;
  manager?: string;
  titles?: number;
  total_trophies?: number;
  world_cup_titles?: number;
}

/** Circular progress ring for a percentage (0–100). */
function PercentRing({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative w-11 h-11 sm:w-12 sm:h-12 shrink-0" role="img" aria-label={`${clamped}%`}>
      <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
        <circle cx="20" cy="20" r={radius} fill="none" stroke="#FCE7F3" strokeWidth="4" />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke="#FA2E72"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#FA2E72]">
        {Math.round(clamped)}%
      </span>
    </div>
  );
}

export default function PlayerClientPage({ playerId }: { playerId?: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const effectiveId = searchParams.get('id') || playerId || '';
  const sportParam = searchParams.get('sport') || 'Tennis';

  const [athlete, setAthlete] = useState<UnifiedAthlete | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const handleBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/rankings');
  };

  useEffect(() => {
    async function fetchPlayerData() {
      if (!effectiveId) {
        setAthlete(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const sport = (['Tennis', 'Table Tennis', 'Football', 'Basketball'].includes(sportParam)
          ? sportParam
          : 'Tennis') as 'Tennis' | 'Table Tennis' | 'Football' | 'Basketball';
        const foundAthlete = await getAthleteById(effectiveId, sport);
        if (foundAthlete) {
          const canonicalId = String(foundAthlete.id);
          const foundHistory = await getAthleteHistory(canonicalId, foundAthlete.sport);
          setAthlete(foundAthlete);
          setHistory(foundHistory);
        } else {
          setAthlete(null);
          setHistory([]);
        }
      } catch (err) {
        console.error('Failed to load player details', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlayerData();
  }, [effectiveId, sportParam]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-4">
        <Loader2 className="w-12 h-12 text-[#FA2E72] animate-spin" />
        <span className="text-sm font-semibold text-slate-500">Loading profile...</span>
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 max-w-xl mx-auto text-center px-4">
        <h2 className="text-2xl font-bold text-slate-800">Profile Not Found</h2>
        <p className="text-slate-500 text-sm">We couldn&apos;t find a profile matching this ID in the local dataset.</p>
        <Link href="/rankings" className="mt-4 px-6 py-2.5 bg-[#FA2E72] text-white rounded-full text-sm font-bold shadow-sm">
          Return to Rankings
        </Link>
      </div>
    );
  }

  const isTeam = athlete.sport === 'Football' || athlete.sport === 'Basketball';
  const extra = (athlete.extraInfo || {}) as TeamExtraInfo;
  // Tennis / table tennis publish real ranking points; team datasets only get an estimate from rank.
  const hasOfficialPoints = Number(athlete.extraInfo?.points) > 0;

  // Helper function to sample points evenly across full career history timeline
  const sampleTimeline = (historyList: HistoryPoint[], maxPoints = 12): HistoryPoint[] => {
    if (!historyList || historyList.length === 0) return [];
    if (historyList.length <= maxPoints) return historyList;
    const sampled: HistoryPoint[] = [];
    const step = (historyList.length - 1) / (maxPoints - 1);
    for (let i = 0; i < maxPoints; i++) {
      const idx = Math.min(historyList.length - 1, Math.round(i * step));
      sampled.push(historyList[idx]);
    }
    return sampled;
  };

  // Ranking history for the chart (samples across entire career timeline)
  const recentHistory = sampleTimeline(history, 12);

  return (
    <div className="flex flex-col gap-5 sm:gap-8 pb-16">
      <button
        type="button"
        onClick={handleBack}
        className="self-start -mb-2 sm:-mb-4 -ml-1 flex items-center gap-1.5 py-1.5 pl-1 pr-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 active:bg-slate-100 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Top Banner & Header */}
      <div className="relative bg-gradient-to-r from-[#FA2E72] to-[#FF6B00] rounded-3xl p-5 sm:p-10 text-white overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_60%)]" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-5 sm:gap-8">
          {/* Avatar Container */}
          <div className="w-28 h-28 sm:w-40 sm:h-40 rounded-2xl bg-white/20 backdrop-blur-md p-1.5 shadow-2xl shrink-0">
            <div className="w-full h-full rounded-xl overflow-hidden relative bg-white">
              <AthleteImage
                src={athlete.imageUrl}
                alt={athlete.name}
                width={160}
                height={160}
                className="w-full h-full object-cover object-top"
                fallbackLetter={athlete.name.charAt(0)}
                fallbackClassName="text-3xl sm:text-4xl"
                preload
              />
            </div>
          </div>

          {/* Player Info */}
          <div className="flex-1 text-center md:text-left flex flex-col gap-2 min-w-0">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md px-3 py-1 rounded-full w-fit mx-auto md:mx-0">
              <span>{athlete.sport}</span>
              <span>•</span>
              <span>{isTeam ? 'Team' : athlete.gender}</span>
              <span>•</span>
              <span>{athlete.country} ({athlete.countryCode})</span>
            </div>

            <h1 className="text-2xl sm:text-5xl font-extrabold tracking-tight drop-shadow-sm text-balance break-words md:truncate">
              {athlete.name}
            </h1>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4 text-xs sm:text-sm font-semibold opacity-90 mt-0.5">
              {!isTeam && athlete.age && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{athlete.age} Yrs</span>
                </div>
              )}
              {!isTeam && athlete.playingStyle && (
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{athlete.playingStyle}</span>
                </div>
              )}
              {isTeam && extra.founded_year && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Est. {extra.founded_year}</span>
                </div>
              )}
              {isTeam && (extra.arena || extra.stadium) && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{extra.arena || extra.stadium}</span>
                </div>
              )}
              {isTeam && (extra.league || extra.confederation) && (
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{extra.league || extra.confederation}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Action buttons */}
          <div className="flex items-center justify-center gap-3 shrink-0 w-full md:w-auto">
            <Link
              href={`/compare?player1=${athlete.id}&sport=${encodeURIComponent(athlete.sport)}`}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-white text-[#FA2E72] hover:bg-pink-50 rounded-2xl text-sm font-extrabold shadow-lg transition-transform active:scale-95 w-full md:w-auto"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>Compare Head-to-Head</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Grid Layout: Stats Cards & Ranking History */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-8">
        {/* Left Column: Key Stats & Career Highlights (7 Cols) */}
        <div className="xl:col-span-7 flex flex-col gap-5 sm:gap-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col gap-1">
              <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FA2E72]" />
                <span>World Rank</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">
                {formatRank(athlete.ranking)}
              </div>
              <div className="text-[10px] sm:text-xs text-emerald-600 font-semibold mt-0.5">
                {isRanked(athlete.ranking) ? 'Official Standing' : 'Currently Unranked'}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col gap-1">
              <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Medal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                <span>Career High</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">
                {formatRank(athlete.careerHighRank)}
              </div>
              <div className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-0.5 truncate">
                {athlete.careerHighDate ? `Achieved ${formatMonthYear(athlete.careerHighDate)}` : 'Best Rank'}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col gap-1 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500" />
                <span>Points / Rating</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1 tabular-nums">{athlete.points}</div>
              <div className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-0.5">
                {hasOfficialPoints ? 'Official ranking points' : 'Estimated from rank'}
              </div>
            </div>
          </div>

          {/* Ranking History Chart Card */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm flex flex-col gap-4 relative">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#FA2E72]" />
                  <span>Ranking History</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400">Historical performance trajectory</p>
              </div>

              {recentHistory.length > 0 && (
                <div className="text-[10px] sm:text-xs font-bold text-[#FA2E72] bg-pink-50 px-2.5 py-1 rounded-full">
                  {recentHistory.length} Points
                </div>
              )}
            </div>

            {recentHistory.length > 0 ? (
              <RankingHistoryChart points={recentHistory} fallbackRank={athlete.ranking} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs font-semibold gap-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <TrendingUp className="w-8 h-8 opacity-40" />
                <span>Detailed ranking history unavailable for this profile</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Profile Overview & Bio (5 Cols) */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm flex flex-col gap-4 sm:gap-5">
            <h3 className="text-base sm:text-lg font-bold text-slate-800">{isTeam ? 'Team Profile' : 'Athlete Profile'}</h3>

            <div className="flex flex-col gap-3 sm:gap-4 text-xs sm:text-sm">
              {/* Name Card */}
              <div className="bg-slate-50 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center text-[#FA2E72] shadow-xs shrink-0">
                    <User className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-xs font-semibold text-slate-400">{isTeam ? 'Team Name' : 'Full Name'}</div>
                    <div className="font-bold text-slate-800">{athlete.name}</div>
                  </div>
                </div>
              </div>

              {!isTeam ? (
                <>
                  {athlete.birthDate && (
                    <div className="bg-slate-50 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center text-[#FA2E72] shadow-xs shrink-0">
                          <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                          <div className="text-[10px] sm:text-xs font-semibold text-slate-400">Date of Birth</div>
                          <div className="font-bold text-slate-800">{formatFullDate(athlete.birthDate)}</div>
                        </div>
                      </div>
                      {athlete.age && (
                        <span className="text-[10px] sm:text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-full shadow-2xs">
                          {athlete.age} Yrs
                        </span>
                      )}
                    </div>
                  )}

                  {athlete.playingStyle && (
                    <div className="bg-slate-50 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 sm:gap-4 border border-slate-100">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white flex items-center justify-center text-[#FA2E72] shadow-xs shrink-0">
                        <User className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] sm:text-xs font-semibold text-slate-400">Playing Style</div>
                        <div className="font-bold text-slate-800 text-sm sm:text-lg">{athlete.playingStyle}</div>
                      </div>
                    </div>
                  )}

                  {athlete.winRate !== undefined && (
                    <div className="bg-slate-50 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between border border-slate-100">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white flex items-center justify-center text-[#FA2E72] shadow-xs shrink-0">
                          <Star className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                          <div className="text-[10px] sm:text-xs font-semibold text-slate-400">Win Rate</div>
                          <div className="font-bold text-slate-800 text-sm sm:text-lg">{athlete.winRate}%</div>
                        </div>
                      </div>
                      <PercentRing value={athlete.winRate} />
                    </div>
                  )}
                </>
              ) : (
                <>
                  {extra.founded_year && (
                    <div className="bg-slate-50 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center text-[#FA2E72] shadow-xs shrink-0">
                          <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                          <div className="text-[10px] sm:text-xs font-semibold text-slate-400">Founded Year</div>
                          <div className="font-bold text-slate-800">{extra.founded_year}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {(extra.arena || extra.stadium) && (
                    <div className="bg-slate-50 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 sm:gap-4 border border-slate-100">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center text-[#FA2E72] shadow-xs shrink-0">
                        <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] sm:text-xs font-semibold text-slate-400">Home Arena / Stadium</div>
                        <div className="font-bold text-slate-800">{extra.arena || extra.stadium}</div>
                      </div>
                    </div>
                  )}

                  {(extra.head_coach || extra.manager) && (
                    <div className="bg-slate-50 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 sm:gap-4 border border-slate-100">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center text-[#FA2E72] shadow-xs shrink-0">
                        <User className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] sm:text-xs font-semibold text-slate-400">Head Coach / Manager</div>
                        <div className="font-bold text-slate-800">{extra.head_coach || extra.manager}</div>
                      </div>
                    </div>
                  )}

                  {(extra.league || extra.confederation) && (
                    <div className="bg-slate-50 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 sm:gap-4 border border-slate-100">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center text-[#FA2E72] shadow-xs shrink-0">
                        <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] sm:text-xs font-semibold text-slate-400">League / Confederation</div>
                        <div className="font-bold text-slate-800">{extra.league || extra.confederation}</div>
                      </div>
                    </div>
                  )}

                  {(extra.titles !== undefined || extra.total_trophies !== undefined || extra.world_cup_titles !== undefined) && (
                    <div className="bg-slate-50 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between border border-slate-100">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center text-[#FA2E72] shadow-xs shrink-0">
                          <Award className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                          <div className="text-[10px] sm:text-xs font-semibold text-slate-400">Trophies / Titles</div>
                          <div className="font-bold text-slate-800 text-sm sm:text-lg">
                            {extra.titles ?? extra.total_trophies ?? extra.world_cup_titles}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {athlete.winRate !== undefined && (
                    <div className="bg-slate-50 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between border border-slate-100">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center text-[#FA2E72] shadow-xs shrink-0">
                          <Star className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                          <div className="text-[10px] sm:text-xs font-semibold text-slate-400">Win Percentage</div>
                          <div className="font-bold text-slate-800 text-sm sm:text-lg">{athlete.winRate}%</div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
