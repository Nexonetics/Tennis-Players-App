import React from 'react';
import { HeroBanner } from '@/components/home/HeroBanner';
import { SportsGrid } from '@/components/home/SportsGrid';
import { QuickTools } from '@/components/home/QuickTools';

export default function Home() {
  return (
    <div className="flex flex-col gap-5 sm:gap-6 w-full max-w-6xl mx-auto pb-8">
      <HeroBanner />
      <SportsGrid />
      <QuickTools />
    </div>
  );
}
