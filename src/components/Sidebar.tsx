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
  Sparkles,
  Bed,
  PackageCheck,
  CalendarDays,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'patients'
  | 'appointments'
  | 'inventory'
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

  const clinicalItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'patients', label: 'Resident Directory', icon: Users },
    { id: 'appointments', label: 'Appointments & Visitors', icon: CalendarDays },
    { id: 'inventory', label: 'Inventory & Meds', icon: PackageCheck },
    { id: 'kanban', label: 'Kanban Journey', icon: Kanban },
    { id: 'care_board', label: 'Care Board (ADL)', icon: CheckSquare },
    { id: 'monitoring', label: 'DAPUD Shift Logs', icon: FileSpreadsheet },
  ];

  const adminItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }>; adminOnly?: boolean }[] = [
    { id: 'reports', label: 'Reports & Export', icon: FileText },
    { id: 'staff', label: 'Staff Management', icon: UserCog, adminOnly: true },
    { id: 'audit', label: 'Security & Audit Logs', icon: ShieldCheck, adminOnly: true },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Floating Modern Rounded Sidebar matching reference */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white lg:my-3 lg:ml-3 lg:h-[calc(100vh-24px)] lg:rounded-3xl border border-emerald-950/10 shadow-xs flex flex-col justify-between transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo & Brand Header */}
          <div className="p-5 pb-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0B3B2C] text-[#C5E875] flex items-center justify-center shadow-xs">
                <HeartPulse className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-900 text-sm tracking-tight">Convee</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#C5E875] text-[#0D382B]">
                    CarePulse
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium tracking-tight italic mt-0.5 block leading-tight">
                  “A Daily Pulse On Every Resident”
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-270px)]">
            {/* Section 1: Clinical Operations */}
            <div>
              <div className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Clinical Operations
              </div>
              <div className="space-y-1">
                {clinicalItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        onClose();
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs transition-all ${
                        isActive
                          ? 'bg-[#C5E875] text-[#0D382B] font-bold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-[#F2F6F2] font-medium'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0D382B]' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Administration & Records */}
            <div>
              <div className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Administration & Records
              </div>
              <div className="space-y-1">
                {adminItems
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
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs transition-all ${
                          isActive
                            ? 'bg-[#C5E875] text-[#0D382B] font-bold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-[#F2F6F2] font-medium'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0D382B]' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </nav>
        </div>

        {/* Bottom Facility Capacity Badge */}
        <div className="p-4 border-t border-slate-100">
          <div className="p-3.5 rounded-2xl bg-[#EAF5DC]/70 border border-[#C5E875]/60 text-slate-900">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="flex items-center gap-1.5 text-[#0B3B2C]">
                <Bed className="w-3.5 h-3.5" />
                Bed Capacity
              </span>
              <span className="text-[11px] font-mono text-emerald-800 font-extrabold">6 / 12</span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-white/80 rounded-full overflow-hidden">
              <div className="h-full bg-[#0B3B2C] rounded-full" style={{ width: '50%' }} />
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-medium">
              Male Ward: 3/6 · Female Ward: 3/6
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
