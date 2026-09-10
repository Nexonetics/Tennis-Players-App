import React from 'react';
import { HeroBanner } from '@/components/home/HeroBanner';
import { LiveMatchesCard } from '@/components/home/LiveMatchesCard';
import { SportsGrid } from '@/components/home/SportsGrid';
import { UpcomingMatches } from '@/components/home/UpcomingMatches';

export default function Home() {
  return (
    <>
      {/* Top Section: Hero + Sports Grid (Left) & Live Matches (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* Left 8 Columns */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          <HeroBanner />
          <SportsGrid />
        </div>

        {/* Right 4 Columns */}
        <div className="xl:col-span-4 flex">
          <LiveMatchesCard />
        </div>
      </div>

      {/* Bottom Section: Upcoming Matches */}
      <UpcomingMatches />
    </>
  );
}
