'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Calendar, User, Trophy, Medal, Star, TrendingUp, ArrowLeftRight, Loader2, Building2, Shield, Award } from 'lucide-react';
import { UnifiedAthlete, HistoryPoint } from '@/types';
import { getAthleteById, getAthleteHistory } from '@/lib/localDataService';

// Safe Athlete Image component with onError fallback
const AthleteImage = ({ src, alt, width, height, className, fallbackLetter }: {
  src?: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fallbackLetter: string;
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-pink-400 to-rose-600 text-white font-bold text-3xl sm:text-4xl flex items-center justify-center">
        {fallbackLetter}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setHasError(true)}
    />
  );
};

export default function PlayerClientPage({ playerId }: { playerId?: string }) {
  const searchParams = useSearchParams();
  const effectiveId = searchParams.get('id') || playerId || '';
  const sportParam = searchParams.get('sport') || 'Tennis';

  const [athlete, setAthlete] = useState<UnifiedAthlete | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

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
          const foundHistory = await getAthleteHistory(effectiveId, foundAthlete.sport);
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
        <p className="text-slate-500 text-sm">We couldn't find a profile matching this ID in the local dataset.</p>
        <Link href="/rankings" className="mt-4 px-6 py-2.5 bg-[#FA2E72] text-white rounded-full text-sm font-bold shadow-sm">
          Return to Rankings
        </Link>
      </div>
    );
  }

  const isTeam = athlete.sport === 'Football' || athlete.sport === 'Basketball';
  const extra = (athlete.extraInfo || {}) as Record<string, any>;

  // Format ranking history for SVG chart
  const recentHistory = history.length > 0 ? history.slice(-12) : [];
  const minRankInHist = recentHistory.length > 0 ? Math.min(...recentHistory.map((h) => h.ranking)) : athlete.ranking;
  const maxRankInHist = recentHistory.length > 0 ? Math.max(...recentHistory.map((h) => h.ranking)) : athlete.ranking + 10;
  const rankSpan = Math.max(1, maxRankInHist - minRankInHist);

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-16">
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

            <h1 className="text-2xl sm:text-5xl font-extrabold tracking-tight drop-shadow-sm truncate">
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
          <div className="flex items-center justify-center gap-3 shrink-0 w-full sm:w-auto">
            <Link
              href={`/compare?player1=${athlete.id}&sport=${encodeURIComponent(athlete.sport)}`}
              className="flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 bg-white text-[#FA2E72] hover:bg-pink-50 rounded-2xl text-xs sm:text-sm font-extrabold shadow-lg transition-transform active:scale-95 w-full sm:w-auto"
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
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">#{athlete.ranking}</div>
              <div className="text-[10px] sm:text-xs text-emerald-600 font-semibold mt-0.5">Official Standing</div>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col gap-1">
              <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Medal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                <span>Career High</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">#{athlete.careerHighRank}</div>
              <div className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-0.5 truncate">
                {athlete.careerHighDate ? `Achieved ${athlete.careerHighDate}` : 'Best Rank'}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col gap-1 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500" />
                <span>Points / Rating</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">{athlete.points}</div>
              <div className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-0.5">Standardized</div>
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
              <div className="w-full relative flex flex-col pt-2">
                {/* Responsive Aspect-Correct SVG Line Chart */}
                <svg
                  className="w-full h-auto overflow-visible select-none"
                  viewBox="0 0 700 180"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <defs>
                    <linearGradient id="rankingChartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FA2E72" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#FA2E72" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid Lines */}
                  <line x1="45" y1="30" x2="665" y2="30" stroke="#f1f5f9" strokeWidth="1.5" strokeDasharray="4 4" />
                  <line x1="45" y1="85" x2="665" y2="85" stroke="#f1f5f9" strokeWidth="1.5" strokeDasharray="4 4" />
                  <line x1="45" y1="140" x2="665" y2="140" stroke="#f1f5f9" strokeWidth="1.5" strokeDasharray="4 4" />

                  {/* Y-Axis Rank Labels */}
                  <text x="38" y="34" textAnchor="end" className="text-[10px] font-extrabold fill-slate-400">
                    #{minRankInHist}
                  </text>
                  <text x="38" y="89" textAnchor="end" className="text-[10px] font-bold fill-slate-300">
                    #{Math.round((minRankInHist + maxRankInHist) / 2)}
                  </text>
                  <text x="38" y="144" textAnchor="end" className="text-[10px] font-bold fill-slate-400">
                    #{maxRankInHist}
                  </text>

                  {/* Calculate SVG Points */}
                  {(() => {
                    const svgW = 700;
                    const padL = 45;
                    const padR = 35;
                    const padT = 30;
                    const drawW = svgW - padL - padR;
                    const drawH = 110;

                    const pts = recentHistory.map((pt, idx) => {
                      const x = padL + (idx / Math.max(1, recentHistory.length - 1)) * drawW;
                      const y = padT + ((pt.ranking - minRankInHist) / rankSpan) * drawH;
                      return { x, y, ranking: pt.ranking, date: pt.date, idx };
                    });

                    const polylineStr = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                    const polygonStr = `${pts[0].x.toFixed(1)},140 ${polylineStr} ${pts[pts.length - 1].x.toFixed(1)},140`;

                    return (
                      <g>
                        {/* Gradient Area Fill */}
                        <polygon points={polygonStr} fill="url(#rankingChartGrad)" />

                        {/* Smooth Main Line */}
                        <polyline
                          fill="none"
                          stroke="#FA2E72"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={polylineStr}
                        />

                        {/* Data Points */}
                        {pts.map((p) => (
                          <g key={p.idx} className="group cursor-pointer">
                            {/* Outer Glow on Hover */}
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="8"
                              className="fill-[#FA2E72]/20 opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                            {/* Point Node */}
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="4.5"
                              className="fill-white stroke-[#FA2E72] stroke-2 transition-transform group-hover:r-6"
                            />
                            {/* Tooltip on Hover */}
                            <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <rect
                                x={Math.min(620, Math.max(10, p.x - 45))}
                                y={Math.max(5, p.y - 32)}
                                width="90"
                                height="22"
                                rx="6"
                                className="fill-slate-900/90 backdrop-blur-xs"
                              />
                              <text
                                x={Math.min(665, Math.max(55, p.x))}
                                y={Math.max(19, p.y - 18)}
                                textAnchor="middle"
                                className="text-[10px] font-bold fill-white"
                              >
                                #{p.ranking} • {p.date}
                              </text>
                            </g>
                          </g>
                        ))}

                        {/* X-Axis Date Labels */}
                        <text x={pts[0].x} y="165" textAnchor="start" className="text-[10px] font-bold fill-slate-400">
                          {pts[0].date}
                        </text>
                        {pts.length > 2 && (
                          <text
                            x={pts[Math.floor(pts.length / 2)].x}
                            y="165"
                            textAnchor="middle"
                            className="text-[10px] font-bold fill-slate-400"
                          >
                            {pts[Math.floor(pts.length / 2)].date}
                          </text>
                        )}
                        <text
                          x={pts[pts.length - 1].x}
                          y="165"
                          textAnchor="end"
                          className="text-[10px] font-bold fill-slate-400"
                        >
                          {pts[pts.length - 1].date}
                        </text>
                      </g>
                    );
                  })()}
                </svg>
              </div>
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
                          <div className="font-bold text-slate-800">{athlete.birthDate}</div>
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
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-4 border-[#FA2E72] border-r-pink-100 flex items-center justify-center text-[10px] font-bold text-[#FA2E72]">
                        {Math.round(athlete.winRate)}%
                      </div>
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
