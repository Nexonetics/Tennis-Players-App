'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Calendar, User, Trophy, Medal, Star, TrendingUp, ArrowLeftRight, Loader2 } from 'lucide-react';
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

export default function PlayerClientPage({ playerId }: { playerId: string }) {
  const searchParams = useSearchParams();
  const sportParam = searchParams.get('sport') || 'Tennis';

  const [athlete, setAthlete] = useState<UnifiedAthlete | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlayerData() {
      setLoading(true);
      try {
        const sport = (['Tennis', 'Table Tennis', 'Football', 'Basketball'].includes(sportParam)
          ? sportParam
          : 'Tennis') as 'Tennis' | 'Table Tennis' | 'Football' | 'Basketball';
        const foundAthlete = await getAthleteById(playerId, sport);
        if (foundAthlete) {
          const foundHistory = await getAthleteHistory(playerId, foundAthlete.sport);
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

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Top Banner & Header */}
      <div className="relative bg-gradient-to-r from-[#FA2E72] to-[#FF6B00] rounded-3xl p-6 sm:p-10 text-white overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_60%)]" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 sm:gap-8">
          {/* Avatar Container */}
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-white/20 backdrop-blur-md p-1.5 shadow-2xl shrink-0">
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
          <div className="flex-1 text-center md:text-left flex flex-col gap-2">
            <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md px-3 py-1 rounded-full w-fit mx-auto md:mx-0">
              <span>{athlete.sport}</span>
              <span>•</span>
              <span>{athlete.gender}</span>
              <span>•</span>
              <span>{athlete.country} ({athlete.countryCode})</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight drop-shadow-sm">
              {athlete.name}
            </h1>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm font-semibold opacity-90 mt-1">
              {athlete.age && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>{athlete.age} Years Old</span>
                </div>
              )}
              {athlete.playingStyle && (
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  <span>{athlete.playingStyle}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Action buttons */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href={`/compare?player1=${athlete.id}&sport=${encodeURIComponent(athlete.sport)}`}
              className="flex items-center gap-2 px-5 py-3 bg-white text-[#FA2E72] hover:bg-pink-50 rounded-2xl text-sm font-extrabold shadow-lg transition-transform active:scale-95"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>Compare Head-to-Head</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Grid Layout: Stats Cards & Ranking History */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Column: Key Stats & Career Highlights (7 Cols) */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Trophy className="w-4 h-4 text-[#FA2E72]" />
                <span>World Rank</span>
              </div>
              <div className="text-3xl font-extrabold text-slate-800 mt-1">#{athlete.ranking}</div>
              <div className="text-xs text-emerald-600 font-semibold mt-1">Official Standing</div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Medal className="w-4 h-4 text-amber-500" />
                <span>Career High</span>
              </div>
              <div className="text-3xl font-extrabold text-slate-800 mt-1">#{athlete.careerHighRank}</div>
              <div className="text-xs text-slate-400 font-semibold mt-1">
                {athlete.careerHighDate ? `Achieved ${athlete.careerHighDate}` : 'Best Rank'}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col gap-1 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Star className="w-4 h-4 text-indigo-500" />
                <span>Points / Rating</span>
              </div>
              <div className="text-3xl font-extrabold text-slate-800 mt-1">{athlete.points}</div>
              <div className="text-xs text-slate-400 font-semibold mt-1">Standardized</div>
            </div>
          </div>

          {/* Ranking History Chart Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#FA2E72]" />
                  <span>Ranking History</span>
                </h3>
                <p className="text-xs text-slate-400">Historical performance trajectory</p>
              </div>

              {recentHistory.length > 0 && (
                <div className="text-xs font-bold text-[#FA2E72] bg-pink-50 px-3 py-1 rounded-full">
                  {recentHistory.length} Data Points
                </div>
              )}
            </div>

            {recentHistory.length > 0 ? (
              <div className="w-full h-56 pt-4 relative flex flex-col justify-between">
                {/* Visual Chart Grid */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                  <div className="border-b border-dashed border-slate-400 w-full" />
                  <div className="border-b border-dashed border-slate-400 w-full" />
                  <div className="border-b border-dashed border-slate-400 w-full" />
                </div>

                {/* SVG Line Chart */}
                <svg className="w-full h-40 overflow-visible z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* Gradient definition */}
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FA2E72" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#FA2E72" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Area fill */}
                  <polygon
                    points={`
                      0,100 
                      ${recentHistory
                        .map((pt, idx) => {
                          const x = (idx / (recentHistory.length - 1)) * 100;
                          const y = ((pt.ranking - minRankInHist) / rankSpan) * 80 + 10;
                          return `${x},${y}`;
                        })
                        .join(' ')} 
                      100,100
                    `}
                    fill="url(#chartGradient)"
                  />

                  {/* Line */}
                  <polyline
                    fill="none"
                    stroke="#FA2E72"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={recentHistory
                      .map((pt, idx) => {
                        const x = (idx / (recentHistory.length - 1)) * 100;
                        const y = ((pt.ranking - minRankInHist) / rankSpan) * 80 + 10;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />

                  {/* Points */}
                  {recentHistory.map((pt, idx) => {
                    const x = (idx / (recentHistory.length - 1)) * 100;
                    const y = ((pt.ranking - minRankInHist) / rankSpan) * 80 + 10;
                    return (
                      <circle
                        key={idx}
                        cx={x}
                        cy={y}
                        r="3"
                        className="fill-white stroke-[#FA2E72] stroke-2 hover:r-5 transition-all cursor-pointer"
                      />
                    );
                  })}
                </svg>

                {/* X-Axis Labels */}
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-2 z-10">
                  <span>{recentHistory[0]?.date || 'Past'}</span>
                  <span>{recentHistory[Math.floor(recentHistory.length / 2)]?.date || 'Mid'}</span>
                  <span>{recentHistory[recentHistory.length - 1]?.date || 'Latest'}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs font-semibold gap-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <TrendingUp className="w-8 h-8 opacity-40" />
                <span>Detailed ranking history unavailable for this athlete</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Profile Overview & Bio (5 Cols) */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col gap-5">
            <h3 className="text-lg font-bold text-slate-800">Athlete Profile</h3>

            <div className="flex flex-col gap-4">
              <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#FA2E72] shadow-xs">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-400">Full Name</div>
                    <div className="font-bold text-slate-800">{athlete.name}</div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#FA2E72] shadow-xs">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-400">Date of Birth</div>
                    <div className="font-bold text-slate-800">{athlete.birthDate || 'N/A'}</div>
                  </div>
                </div>
                {athlete.age && (
                  <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full shadow-2xs">
                    {athlete.age} Yrs
                  </span>
                )}
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
