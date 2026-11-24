'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { MobileDrawer } from '@/components/layout/MobileDrawer';
import { SportsProvider } from '@/context/SportsContext';

export const LayoutShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <SportsProvider>
      <div className="flex flex-col md:flex-row min-h-dvh md:h-screen bg-[#F8FAFC]">
        {/* Left Navigation Sidebar (Desktop view) */}
        <Sidebar />

        {/* Slide-over Drawer (Mobile view) */}
        <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Top Header (sticky on mobile) */}
          <Header />

          {/* Dashboard Body — bottom padding clears the fixed mobile nav + home indicator */}
          <main className="flex-1 px-4 sm:px-6 md:px-8 pt-3 md:pt-0 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8 flex flex-col gap-5 overflow-y-auto">
            {children}
          </main>
        </div>

        {/* Fixed Bottom Navigation Bar (Mobile view) */}
        <MobileNav onOpenDrawer={() => setIsDrawerOpen(true)} />
      </div>
    </SportsProvider>
  );
};
