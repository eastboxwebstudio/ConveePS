import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  LogOut,
  Plus,
  ClipboardPenLine,
  Menu,
  Search,
  Bell,
  Clock,
  CircleDot,
} from 'lucide-react';
import { ZoneType } from '../types/index.js';

interface HeaderProps {
  currentZone: ZoneType | '';
  onZoneChange: (zone: ZoneType | '') => void;
  onOpenAdmission: () => void;
  onOpenMonitoring: () => void;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentZone,
  onZoneChange,
  onOpenAdmission,
  onOpenMonitoring,
  onToggleSidebar,
}) => {
  const { user, logout } = useAuth();

  // Determine current active shift based on local hour
  const now = new Date();
  const hour = now.getHours();
  let activeShiftName = 'Syif AM';
  let activeShiftHours = '07:00 – 17:00';
  let isVitalShift = true;

  if (hour >= 17 && hour < 21) {
    activeShiftName = 'Syif PM';
    activeShiftHours = '17:00 – 21:00';
    isVitalShift = false;
  } else if (hour >= 21 || hour < 7) {
    activeShiftName = 'Syif Night';
    activeShiftHours = '21:00 – 07:00';
    isVitalShift = true;
  }

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <header className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
      {/* Left: Mobile hamburger & Global Search bar styled like reference */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          onClick={onToggleSidebar}
          className="p-2.5 rounded-2xl bg-white border border-emerald-950/5 text-slate-600 hover:text-slate-900 shadow-2xs lg:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search bar with ⌘ K badge like reference */}
        <div className="relative w-full hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari pesakit, rekod, atau katil..."
            className="w-full pl-9 pr-14 py-2.5 bg-white rounded-2xl border border-emerald-950/5 text-xs focus:outline-hidden focus:ring-1 focus:ring-[#0B3B2C] shadow-2xs transition-all"
          />
          <div className="absolute right-3 top-2.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#F4F8F4] text-[10px] font-mono font-semibold text-slate-500 border border-emerald-950/5">
            <span>⌘</span>
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Middle: Zone Selector buttons */}
      <div className="hidden lg:flex items-center gap-2">
        <div className="inline-flex rounded-2xl border border-emerald-950/5 p-1 bg-white shadow-2xs text-xs font-medium">
          <button
            onClick={() => onZoneChange('')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              currentZone === ''
                ? 'bg-[#C5E875] text-[#0D382B] font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            Semua Zon
          </button>
          <button
            onClick={() => onZoneChange('Zon Lelaki')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              currentZone === 'Zon Lelaki'
                ? 'bg-[#C5E875] text-[#0D382B] font-bold shadow-2xs'
                : 'text-slate-600 hover:text-blue-900'
            }`}
          >
            Zon Lelaki
          </button>
          <button
            onClick={() => onZoneChange('Zon Perempuan')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              currentZone === 'Zon Perempuan'
                ? 'bg-[#C5E875] text-[#0D382B] font-bold shadow-2xs'
                : 'text-slate-600 hover:text-rose-900'
            }`}
          >
            Zon Perempuan
          </button>
        </div>
      </div>

      {/* Right: Shift Status, User & Primary CTA Button */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Shift indicator badge */}
        <div className="hidden xl:flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white border border-emerald-950/5 text-xs font-medium shadow-2xs text-slate-700">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-[#0B3B2C]">{activeShiftName}</span>
          <span className="text-slate-300">·</span>
          <span className="font-mono text-slate-500 tabular-nums text-[11px]">{activeShiftHours}</span>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white border border-emerald-950/5 shadow-2xs">
          <div className="w-8 h-8 rounded-full bg-[#EAF5DC] text-[#0B3B2C] flex items-center justify-center font-bold text-xs ring-2 ring-[#C5E875]">
            {initials}
          </div>
          <div className="hidden sm:block text-left text-xs leading-none">
            <div className="font-bold text-slate-900 truncate max-w-[120px]">
              {user?.full_name}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              ID: {user?.id.slice(-6).toUpperCase()}
            </div>
          </div>
          <button
            onClick={() => logout()}
            title="Log keluar sistem"
            className="p-1 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Primary CTA (Inspired by + Create campaigns in reference) */}
        <button
          onClick={onOpenAdmission}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#0B3B2C] hover:bg-[#07281E] text-white text-xs font-semibold transition-all shadow-xs shrink-0"
        >
          <Plus className="w-3.5 h-3.5 text-[#C5E875]" />
          <span>Daftar Pesakit</span>
        </button>
      </div>
    </header>
  );
};
