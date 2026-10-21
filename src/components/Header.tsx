import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  Activity,
  LogOut,
  UserCheck,
  PlusCircle,
  ClipboardList,
  Menu,
  Clock,
  ShieldAlert,
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
  let activeShiftLabel = 'Syif AM (7:00am - 5:00pm)';
  let isVitalShift = true;

  if (hour >= 17 && hour < 21) {
    activeShiftLabel = 'Syif PM (5:00pm - 9:00pm)';
    isVitalShift = false;
  } else if (hour >= 21 || hour < 7) {
    activeShiftLabel = 'Syif Night (9:00pm - 7:00am)';
    isVitalShift = true;
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Hamburger & Facility Branding */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-base">CONVEE CARE CENTRE</span>
              </div>
              <p className="hidden lg:block text-xs text-slate-500 font-medium">Sistem Pemantauan Pesakit & Papan Klinikal</p>
            </div>
          </div>
        </div>

        {/* Middle: Zone Filter & Live Shift Indicator */}
        <div className="hidden md:flex items-center gap-2.5">
          {/* Shift indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{activeShiftLabel}</span>
            {isVitalShift && (
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                Pemeriksaan Vital
              </span>
            )}
          </div>

          {/* Zone Selector Buttons */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs font-medium">
            <button
              onClick={() => onZoneChange('')}
              className={`px-3 py-1 rounded-md transition-colors ${
                currentZone === ''
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Zon
            </button>
            <button
              onClick={() => onZoneChange('Zon Lelaki')}
              className={`px-3 py-1 rounded-md transition-colors ${
                currentZone === 'Zon Lelaki'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              Zon Lelaki
            </button>
            <button
              onClick={() => onZoneChange('Zon Perempuan')}
              className={`px-3 py-1 rounded-md transition-colors ${
                currentZone === 'Zon Perempuan'
                  ? 'bg-pink-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-pink-700'
              }`}
            >
              Zon Perempuan
            </button>
          </div>
        </div>

        {/* Right: Action Buttons & User Profile */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAdmission}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Daftar Pesakit</span>
          </button>

          <button
            onClick={onOpenMonitoring}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <ClipboardList className="w-4 h-4" />
            <span>Catat Syif</span>
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* User info */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-bold text-slate-800">{user?.full_name}</div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {user?.role === 'admin' ? 'Pentadbir' : 'Jururawat Bertugas'}
              </div>
            </div>

            <button
              onClick={() => logout()}
              title="Log keluar sistem"
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
