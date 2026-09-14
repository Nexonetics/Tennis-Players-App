'use client';

import React, { useState, useEffect, use, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Calendar, User, Trophy, Medal, Star, TrendingUp, ArrowLeftRight, Loader2 } from 'lucide-react';
import { UnifiedAthlete, HistoryPoint } from '@/types';

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
      <div className="w-full h-full bg-gradient-to-br from-pink-400 to-rose-600 text-white font-bold text-4xl flex items-center justify-center">
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

function PlayerPageContent({ playerId }: { playerId: string }) {
  const searchParams = useSearchParams();
  const sportParam = searchParams.get('sport') || 'Tennis';

  const [athlete, setAthlete] = useState<UnifiedAthlete | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlayerData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/players/${playerId}?sport=${encodeURIComponent(sportParam)}`);
        if (res.ok) {
          const data = await res.json();
          setAthlete(data.athlete || null);
          setHistory(data.history || []);
        }
      } catch (err) {
        console.error('Failed to load player details', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlayerData();
  }, [playerId, sportParam]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-4">
        <Loader2 className="w-12 h-12 text-[#FA2E72] animate-spin" />
        <span className="text-sm font-semibold text-slate-500">Loading player profile...</span>
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 max-w-xl mx-auto text-center">
        <h2 className="text-2xl font-bold text-slate-800">Athlete Not Found</h2>
        <p className="text-slate-500 text-sm">We couldn't find an athlete matching this ID in the local dataset.</p>
        <Link href="/rankings" className="mt-4 px-6 py-2.5 bg-[#FA2E72] text-white rounded-full text-sm font-bold shadow-sm">
          Return to Rankings
        </Link>
      </div>
    );
  }

  // Format ranking history for SVG chart
  const recentHistory = history.length > 0 ? history.slice(-12) : [];
  const minRankInHist = recentHistory.length > 0 ? Math.min(...recentHistory.map((h) => h.ranking)) : athlete.ranking;
  const maxRankInHist = recentHistory.length > 0 ? Math.max(...recentHistory.map((h) => h.ranking)) : athlete.ranking + 10;
  const rankSpan = Math.max(1, maxRankInHist - minRankInHist);

  // SVG dimensions for smooth connected graph
  const svgWidth = 800;
  const svgHeight = 160;
  const paddingX = 40;
  const paddingY = 25;
  const usableW = svgWidth - 2 * paddingX;
  const usableH = svgHeight - 2 * paddingY;

  const chartPoints = recentHistory.map((pt, i) => {
    const x = recentHistory.length === 1 ? svgWidth / 2 : paddingX + (i / (recentHistory.length - 1)) * usableW;
    const norm = (pt.ranking - minRankInHist) / rankSpan;
    const y = paddingY + norm * usableH;
    return { x, y, pt };
  });

  const linePathD = chartPoints.length > 0
    ? chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    : '';

  const areaPathD = chartPoints.length > 0
    ? `${linePathD} L ${chartPoints[chartPoints.length - 1].x.toFixed(1)} ${svgHeight} L ${chartPoints[0].x.toFixed(1)} ${svgHeight} Z`
    : '';

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-12">
      {/* Hero Banner */}
      <div className="w-full h-48 rounded-3xl overflow-hidden relative shadow-sm border border-slate-200">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1534158914592-062992fbe900?q=80&w=2000&auto=format&fit=crop"
            alt="Player Banner"
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A2342] via-[#0A2342]/90 to-transparent"></div>
        </div>
        <div className="relative z-10 flex items-center gap-6 px-10 h-full">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white shadow-lg shrink-0 bg-slate-200 flex items-center justify-center">
            <AthleteImage
              src={athlete.imageUrl}
              alt={athlete.name}
              width={128}
              height={128}
              className="object-cover w-full h-full"
              fallbackLetter={athlete.name.charAt(0)}
            />
          </div>
          <div className="flex flex-col text-white">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold uppercase tracking-widest mb-2 border border-white/10 w-max">
              <span>🏆</span> {athlete.sport}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-2 tracking-tight">{athlete.name}</h1>
            <div className="flex items-center gap-3 text-xs sm:text-sm font-medium text-slate-200">
              <span className="flex items-center gap-1.5">{athlete.country} ({athlete.countryCode})</span>
              {athlete.gender && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                  <span>{athlete.gender}</span>
                </>
              )}
              {athlete.age && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                  <span>{athlete.age} years</span>
                </>
              )}
            </div>
            <p className="mt-2 text-pink-200 text-xs sm:text-sm max-w-md italic">
              "Discipline and continuous dedication define peak performance."
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: Quick Info */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col gap-5">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
              <User className="w-5 h-5 text-[#FA2E72]" />
              Quick Info
            </h3>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center text-base shrink-0">🏳️</div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-400">Country</div>
                  <div className="font-bold text-slate-800 text-sm">{athlete.country}</div>
                </div>
              </div>

              {athlete.age && (
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400">Age</div>
                    <div className="font-bold text-slate-800 text-sm">{athlete.age} years</div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 shrink-0 text-base">
                  🏓
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-400">Playing Style</div>
                  <div className="font-bold text-slate-800 text-sm">{athlete.playingStyle || 'Right Handed'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-400">Current Rank</div>
                  <div className="font-bold text-slate-800 text-sm">#{athlete.ranking}</div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-5 border-t border-slate-100">
              <Link href={`/compare?player1=${athlete.id}&sport=${encodeURIComponent(athlete.sport)}`}>
                <button className="w-full py-2.5 bg-pink-50 hover:bg-[#FA2E72] text-[#FA2E72] hover:text-white rounded-full text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer">
                  <ArrowLeftRight className="w-4 h-4" /> Compare with Another Athlete
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Content */}
        <div className="lg:col-span-9 flex flex-col gap-6">
          {/* Ranking Progress Chart */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <TrendingUp className="w-5 h-5 text-[#FA2E72]" />
                Ranking History & Trend
              </h3>
              <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                {recentHistory.length} Recorded Data Points
              </span>
            </div>

            {recentHistory.length > 0 ? (
              <div className="w-full h-64 bg-gradient-to-b from-pink-50/40 to-white rounded-2xl border border-pink-100 flex flex-col relative overflow-hidden p-4">
                <div className="relative w-full h-full">
                  {/* Connected SVG Line & Gradient Overlay */}
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="w-full h-full overflow-visible pointer-events-none"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FA2E72" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#FA2E72" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Gradient Area under line */}
                    {areaPathD && <path d={areaPathD} fill="url(#chartAreaGrad)" />}

                    {/* Connected Trend Line */}
                    {linePathD && (
                      <path
                        d={linePathD}
                        fill="none"
                        stroke="#FA2E72"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </svg>

                  {/* Node Dots, Rank Badges, & Date Labels Overlaid */}
                  <div className="absolute inset-0 pointer-events-none">
                    {chartPoints.map((cp, i) => {
                      const leftPercent = (cp.x / svgWidth) * 100;
                      const topPercent = (cp.y / svgHeight) * 100;

                      return (
                        <div
                          key={i}
                          className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
                          style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
                        >
                          {/* Rank Label above node */}
                          <span className="text-[10px] font-extrabold text-[#FA2E72] bg-white/90 backdrop-blur-xs px-1.5 py-0.5 rounded-md shadow-xs border border-pink-100 -translate-y-6 whitespace-nowrap">
                            #{cp.pt.ranking}
                          </span>

                          {/* Node Dot */}
                          <div className="w-3.5 h-3.5 rounded-full bg-[#FA2E72] border-2 border-white shadow-sm ring-2 ring-pink-200"></div>

                          {/* Date Label below node */}
                          <span className="text-[9px] font-semibold text-slate-400 translate-y-5 whitespace-nowrap">
                            {cp.pt.date}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-40 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 text-xs font-semibold">
                No historical ranking chart points available for this athlete.
              </div>
            )}
          </div>

          {/* Player Statistics */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col gap-6">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
              <Medal className="w-5 h-5 text-[#FA2E72]" />
              Detailed Player Statistics
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4 border border-slate-100">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#FA2E72] shadow-xs shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-400">Current World Rank</div>
                  <div className="font-bold text-slate-800 text-lg">#{athlete.ranking}</div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4 border border-slate-100">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#FA2E72] shadow-xs shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-400">Career High Rank</div>
                  <div className="font-bold text-slate-800 text-lg">
                    #{athlete.careerHighRank || athlete.ranking}
                    {athlete.careerHighDate && <span className="text-xs text-slate-500 font-normal"> ({athlete.careerHighDate})</span>}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4 border border-slate-100">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#FA2E72] shadow-xs shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-400">Playing Style</div>
                  <div className="font-bold text-slate-800 text-lg">{athlete.playingStyle || 'Standard'}</div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#FA2E72] shadow-xs shrink-0">
                    <Star className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-400">Win Rate</div>
                    <div className="font-bold text-slate-800 text-lg">
                      {athlete.winRate !== undefined ? `${athlete.winRate}%` : '75.0%'}
                    </div>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full border-4 border-[#FA2E72] border-r-pink-100 flex items-center justify-center text-[10px] font-bold text-[#FA2E72]">
                  {athlete.winRate !== undefined ? `${Math.round(athlete.winRate)}%` : '75%'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 text-[#FA2E72] animate-spin" />
        <span className="text-xs text-[#FA2E72]">Loading player details...</span>
      </div>
    }>
      <PlayerPageContent playerId={resolvedParams.id} />
    </Suspense>
  );
}
