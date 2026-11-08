import React from 'react';
import { History, Settings, Droplets } from 'lucide-react';

interface HeaderProps {
  activeTab: 'today' | 'history' | 'bottle';
  setActiveTab: (tab: 'today' | 'history' | 'bottle') => void;
  onOpenSettings: () => void;
  mongoConnected: boolean;
  engine: 'mongodb' | 'file_store';
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-[#202227] bg-[#0e0f11]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-8 px-4 py-3 sm:px-6">
        {/* Zone 1: Single text element wordmark */}
        <div 
          onClick={() => setActiveTab('today')}
          className="flex cursor-pointer items-center gap-2.5 whitespace-nowrap shrink-0"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2a2d34] bg-[#16181c] text-[#f4f5f7]">
            <Droplets className="h-4 w-4 text-[#f4f5f7]" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-[#f4f5f7]">Dosed</span>
          </div>
        </div>

        {/* Zone 2: Navigation Links (Single-line, unboxed) */}
        <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium">
          <button
            onClick={() => setActiveTab('today')}
            className={`px-2.5 py-1.5 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'today'
                ? 'text-[#f4f5f7] border-b-2 border-[#f4f5f7]'
                : 'text-[#8d939e] hover:text-[#d1d5db]'
            }`}
          >
            Today
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'history'
                ? 'text-[#f4f5f7] border-b-2 border-[#f4f5f7]'
                : 'text-[#8d939e] hover:text-[#d1d5db]'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>History</span>
          </button>

          <button
            onClick={() => setActiveTab('bottle')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'bottle'
                ? 'text-[#f4f5f7] border-b-2 border-[#f4f5f7]'
                : 'text-[#8d939e] hover:text-[#d1d5db]'
            }`}
          >
            <span>Bottle</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action / Settings */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#26282e] bg-[#16181c] text-[#8d939e] transition hover:border-[#383c46] hover:text-[#f4f5f7]"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
