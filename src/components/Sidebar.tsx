import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  LayoutDashboard,
  Users,
  Kanban,
  CheckSquare,
  FileSpreadsheet,
  UserCog,
  FileText,
  ShieldCheck,
  Settings,
  X,
  HeartPulse,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'patients'
  | 'kanban'
  | 'care_board'
  | 'monitoring'
  | 'staff'
  | 'reports'
  | 'audit'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }>; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Papan Pemuka', icon: LayoutDashboard },
    { id: 'patients', label: 'Senarai Pesakit', icon: Users },
    { id: 'kanban', label: 'Papan Kanban Klinikal', icon: Kanban },
    { id: 'care_board', label: 'Patient Care Board (ADL)', icon: CheckSquare },
    { id: 'monitoring', label: 'Rekod Pemantauan (DAPUD)', icon: FileSpreadsheet },
    { id: 'reports', label: 'Laporan & Eksport CSV', icon: FileText },
    { id: 'staff', label: 'Pengurusan Staf', icon: UserCog, adminOnly: true },
    { id: 'audit', label: 'Log Audit Keselamatan', icon: ShieldCheck, adminOnly: true },
    { id: 'settings', label: 'Tetapan Akaun', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-wide">CONVEE CARE</div>
              <div className="text-[10px] text-teal-400 font-medium">Monitoring & Clinical Board</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Menu Operasi
          </div>
          {navItems
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-xs font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
        </nav>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 text-xs text-slate-400">
          <div className="px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <div className="text-[11px] font-semibold text-slate-300">Cloudflare Workers + D1</div>
            <div className="text-[10px] text-teal-400 font-mono mt-0.5">SQLite Active • Asia/KL</div>
          </div>
        </div>
      </aside>
    </>
  );
};
