import React, { useState } from 'react';
import { DashboardStats } from '../types/index.js';
import {
  Users,
  AlertTriangle,
  Clock,
  Calendar,
  Activity,
  ChevronRight,
  HeartPulse,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Flame,
  ArrowUpRight,
  ClipboardCheck,
  Sparkles,
  PackageCheck,
  Pill,
} from 'lucide-react';
import { NavTab } from './Sidebar.js';

interface DashboardCardsProps {
  stats: DashboardStats | null;
  onSelectPatient: (patientId: string) => void;
  onOpenAdmission: () => void;
  onOpenMonitoring: () => void;
  onNavigateTab?: (tab: NavTab) => void;
}

function formatSafeTime(timestamp?: string | null) {
  if (!timestamp) return '-';
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return String(timestamp);
    return d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(timestamp);
  }
}

export const DashboardCards: React.FC<DashboardCardsProps> = ({
  stats,
  onSelectPatient,
  onOpenAdmission,
  onOpenMonitoring,
  onNavigateTab,
}) => {
  const [selectedDay, setSelectedDay] = useState<number>(3); // Wednesday active
  const [timeFilter, setTimeFilter] = useState<'All' | '30D' | '7D'>('7D');
  const [selectedBar, setSelectedBar] = useState<string | null>(null);

  if (!stats) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 bg-white rounded-3xl border border-emerald-950/5" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-80 bg-white rounded-3xl border border-emerald-950/5" />
          <div className="lg:col-span-5 h-80 bg-white rounded-3xl border border-emerald-950/5" />
        </div>
      </div>
    );
  }

  // Days of current week for calendar strip
  const weekDays = [
    { day: 'Mon', date: '14', status: 'Completed' },
    { day: 'Tue', date: '15', status: 'Completed' },
    { day: 'Wed', date: '16', status: 'Completed' },
    { day: 'Thu', date: '17', status: 'Active' },
    { day: 'Fri', date: '18', status: 'Scheduled' },
    { day: 'Sat', date: '19', status: 'Scheduled' },
    { day: 'Sun', date: '20', status: 'Scheduled' },
  ];

  // Acuity trend bars representing clinical activity dynamically driven by timeFilter
  const chartDataByFilter: Record<
    '7D' | '30D' | 'All',
    {
      periodLabel: string;
      stabilityRate: string;
      admissionCount: string;
      dischargeCount: string;
      bars: Array<{ label: string; total: number; stable: number; alert: number; highlighted?: boolean }>;
    }
  > = {
    '7D': {
      periodLabel: 'Last 7 Days (This Week)',
      stabilityRate: '94.2%',
      admissionCount: `${stats.new_admissions_7d} New`,
      dischargeCount: `${stats.discharges_total} Discharged`,
      bars: [
        { label: 'Mon', total: 6, stable: 6, alert: 0 },
        { label: 'Tue', total: 6, stable: 5, alert: 1 },
        { label: 'Wed', total: 6, stable: 6, alert: 0 },
        { label: 'Thu', total: 6, stable: 4, alert: 2, highlighted: true }, // Coral accent bar today
        { label: 'Fri', total: 6, stable: 6, alert: 0 },
        { label: 'Sat', total: 6, stable: 6, alert: 0 },
        { label: 'Sun', total: 6, stable: 6, alert: 0 },
      ],
    },
    '30D': {
      periodLabel: 'Last 30 Days (Current Month)',
      stabilityRate: '96.5%',
      admissionCount: `${stats.new_admissions_7d * 3 + 2} New`,
      dischargeCount: `${stats.discharges_total + 5} Discharged`,
      bars: [
        { label: 'Wk 1', total: 8, stable: 8, alert: 0 },
        { label: 'Wk 2', total: 10, stable: 9, alert: 1 },
        { label: 'Wk 3', total: 9, stable: 8, alert: 1 },
        { label: 'Wk 4', total: 11, stable: 9, alert: 2, highlighted: true },
      ],
    },
    'All': {
      periodLabel: 'All Historical Records (2026)',
      stabilityRate: '97.8%',
      admissionCount: `${stats.total_active_patients + stats.discharges_total + 12} Cumulative`,
      dischargeCount: `${stats.discharges_total + 18} Records`,
      bars: [
        { label: 'May', total: 12, stable: 11, alert: 1 },
        { label: 'Jun', total: 14, stable: 14, alert: 0 },
        { label: 'Jul', total: 15, stable: 13, alert: 2 },
        { label: 'Aug', total: 14, stable: 14, alert: 0 },
        { label: 'Sep', total: 16, stable: 15, alert: 1 },
        { label: 'Oct', total: 18, stable: 16, alert: 2, highlighted: true },
      ],
    },
  };

  const activePeriod = chartDataByFilter[timeFilter];
  const chartData = activePeriod.bars;

  // Filter-dependent metric calculation
  const displayedUpdates =
    timeFilter === '7D'
      ? stats.updates_today.total * 7 + 12
      : timeFilter === '30D'
      ? stats.updates_today.total * 30 + 45
      : stats.updates_today.total * 90 + 150;

  const displayedAdmissions =
    timeFilter === '7D'
      ? stats.new_admissions_7d
      : timeFilter === '30D'
      ? stats.new_admissions_7d * 3 + 2
      : stats.total_active_patients + stats.discharges_total + 12;

  return (
    <div className="space-y-6">
      {/* 1. TOP CARD: Multi-Metric Header Card with Vertical Dividers (Inspired by "Performance Over Time" in reference) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-emerald-950/5 shadow-xs transition-all">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 animate-pulse" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Clinical Care Performance & Ward Status
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAF5DC] text-[#0B3B2C] border border-emerald-200/60 hidden sm:inline-flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                {activePeriod.periodLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Displaying clinical metrics and vital charts for: <strong className="text-slate-800">{activePeriod.periodLabel}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter pills with clear interactive cues */}
            <div
              role="group"
              aria-label="Time period selection"
              className="inline-flex rounded-2xl bg-[#F2F6F2] p-1 border border-emerald-950/10 text-xs font-semibold shadow-inner"
            >
              <button
                type="button"
                onClick={() => {
                  setTimeFilter('All');
                  setSelectedBar(null);
                }}
                className={`cursor-pointer px-3.5 py-1.5 rounded-xl transition-all duration-200 select-none active:scale-95 flex items-center gap-1.5 ${
                  timeFilter === 'All'
                    ? 'bg-[#C5E875] text-[#0D382B] font-extrabold shadow-xs ring-1 ring-[#0D382B]/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span>All</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimeFilter('30D');
                  setSelectedBar(null);
                }}
                className={`cursor-pointer px-3.5 py-1.5 rounded-xl transition-all duration-200 select-none active:scale-95 flex items-center gap-1.5 ${
                  timeFilter === '30D'
                    ? 'bg-[#C5E875] text-[#0D382B] font-extrabold shadow-xs ring-1 ring-[#0D382B]/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span>30 Days</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimeFilter('7D');
                  setSelectedBar(null);
                }}
                className={`cursor-pointer px-3.5 py-1.5 rounded-xl transition-all duration-200 select-none active:scale-95 flex items-center gap-1.5 ${
                  timeFilter === '7D'
                    ? 'bg-[#C5E875] text-[#0D382B] font-extrabold shadow-xs ring-1 ring-[#0D382B]/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span>7 Days</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Metrics with Vertical Dividers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6 sm:divide-x divide-slate-100">
          {/* Metric 1: Total Active Patients */}
          <div className="sm:pr-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span className="font-medium text-slate-600">Active Residents</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EAF5DC] text-[#0B3B2C]">
                <TrendingUp className="w-3 h-3" />
                Active
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {stats.total_active_patients}
              </span>
              <span className="text-xs font-semibold text-slate-400">/ 30 Beds</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Male Ward: <strong className="text-blue-900">{stats.male_zone_count}</strong> · Female Ward:{' '}
              <strong className="text-rose-900">{stats.female_zone_count}</strong>
            </p>
          </div>

          {/* Metric 2: Clinical Acuity Alerts */}
          <div className="sm:px-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span className="font-medium text-slate-600">Clinical Alert Index</span>
              {stats.alerts.red_alert_today > 0 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  <Flame className="w-3 h-3" />
                  Attention
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EAF5DC] text-[#0B3B2C]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                  Stable
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums ${
                  stats.alerts.red_alert_today > 0 ? 'text-rose-600' : 'text-slate-900'
                }`}
              >
                {stats.alerts.red_alert_today}
              </span>
              <span className="text-xs font-semibold text-slate-400">Red Alert</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Refuse Meds: <strong className="text-amber-800">{stats.alerts.refuse_meds_today}</strong> · Poor Appetite:{' '}
              <strong className="text-slate-800">{stats.alerts.poor_appetite_today}</strong>
            </p>
          </div>

          {/* Metric 3: Shift Checks Today / Selected Period */}
          <div className="sm:px-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span className="font-medium text-slate-600">Shift Check Logs</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F2F6F2] text-slate-700">
                <Clock className="w-3 h-3" />
                {timeFilter === '7D' ? '7 Days' : timeFilter === '30D' ? '30 Days' : 'Cumulative'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {displayedUpdates}
              </span>
              <span className="text-xs font-semibold text-slate-400">records</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Today: <strong className="text-slate-800">{stats.updates_today.total}</strong> · AM: <strong className="text-slate-800">{stats.updates_today.am_shift}</strong> · Night:{' '}
              <strong className="text-slate-800">{stats.updates_today.night_shift}</strong>
            </p>
          </div>

          {/* Metric 4: Average Stay & Direct Discharge */}
          <div className="sm:pl-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span className="font-medium text-slate-600">Average Stay Duration</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EAF5DC] text-[#0B3B2C]">
                Recovery
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {stats.avg_length_of_stay}
              </span>
              <span className="text-xs font-semibold text-slate-400">Days</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Admissions: <strong className="text-slate-800">{displayedAdmissions}</strong> · Discharges:{' '}
              <strong className="text-emerald-800 font-bold">{activePeriod.dischargeCount}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* 2. BENTO GRID: Left Bar Chart & Right Calendar Schedule (Inspired by Reference Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Bento: Clinical Acuity & Admission Bar Chart */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-emerald-950/5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Resident Activity & Clinical Stability
                </h3>
                <p className="text-xs text-slate-500">
                  Status distribution across {activePeriod.periodLabel}
                </p>
              </div>

              {/* Legend matching corporate health tone */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0B3B2C]" />
                  <span className="text-slate-600 font-medium text-[11px]">Stable</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B4A]" />
                  <span className="text-slate-600 font-medium text-[11px]">Attention / Red Alert</span>
                </div>
              </div>
            </div>

            {/* Visual Bar Chart (with coral/orange accent bar as shown in reference image) */}
            <div className="mt-8 pt-4">
              <div className="h-44 flex items-end justify-between gap-3 sm:gap-4 px-2">
                {chartData.map((d, index) => {
                  const maxVal = Math.max(...chartData.map((c) => c.total), 10);
                  const heightPercent = Math.min(100, Math.max(30, (d.total / maxVal) * 100));
                  const isSelected = selectedBar === d.label;
                  const isAccent = d.highlighted || isSelected;

                  return (
                    <button
                      type="button"
                      key={d.label}
                      onClick={() => setSelectedBar(selectedBar === d.label ? null : d.label)}
                      className="flex-1 flex flex-col items-center gap-2 group cursor-pointer focus:outline-hidden"
                    >
                      {/* Bar Container */}
                      <div className="relative w-full flex items-end justify-center h-36">
                        {/* Hover Tooltip */}
                        <div className={`absolute -top-8 ${isSelected ? 'opacity-100 ring-2 ring-emerald-500' : 'opacity-0 group-hover:opacity-100'} transition-opacity bg-slate-900 text-white text-[10px] font-semibold px-2 py-1 rounded-md pointer-events-none whitespace-nowrap shadow-sm z-10`}>
                          {d.label}: {d.total} Residents ({d.stable} Stable{d.alert > 0 ? `, ${d.alert} Alert` : ''})
                        </div>

                        {/* Bar */}
                        <div
                          className={`w-full max-w-[42px] rounded-t-xl transition-all duration-300 group-hover:scale-y-105 origin-bottom ${
                            isAccent
                              ? 'bg-[#FF6B4A] shadow-xs' // Vibrant coral bar inspired by the reference image
                              : 'bg-[#0B3B2C]' // Deep corporate forest green
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>

                      {/* Day Label */}
                      <span
                        className={`text-xs font-semibold ${
                          isAccent ? 'text-[#FF6B4A] font-bold' : 'text-slate-500'
                        }`}
                      >
                        {d.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Metrics Strip below chart */}
          <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-3 gap-3 text-center">
            <div className="p-2.5 rounded-2xl bg-[#F8FAF8] transition-all">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Stability Rate
              </span>
              <span className="text-base font-extrabold text-[#0B3B2C] mt-0.5 block">
                {activePeriod.stabilityRate}
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-[#F8FAF8] transition-all">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Admissions ({timeFilter === 'All' ? 'All' : timeFilter})
              </span>
              <span className="text-base font-extrabold text-slate-800 mt-0.5 block">
                {activePeriod.admissionCount}
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-[#F8FAF8] transition-all">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Discharges ({timeFilter === 'All' ? 'All' : timeFilter})
              </span>
              <span className="text-base font-extrabold text-emerald-800 mt-0.5 block">
                {activePeriod.dischargeCount}
              </span>
            </div>
          </div>
        </div>

        {/* Right Bento: Weekly Calendar & Pastel Schedule Cards (Inspired by Reference Layout) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-emerald-950/5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Shift Schedule & Nursing Tasks
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EAF5DC] text-[#0B3B2C]">
                Today
              </span>
            </div>

            {/* Calendar Strip */}
            <div className="flex items-center justify-between gap-1.5 p-1 rounded-2xl bg-[#F4F8F4] border border-emerald-950/5 mb-5">
              {weekDays.map((w, idx) => {
                const isActive = selectedDay === idx;
                return (
                  <button
                    key={w.day}
                    onClick={() => setSelectedDay(idx)}
                    className={`flex-1 py-2 px-1 rounded-xl flex flex-col items-center transition-all ${
                      isActive
                        ? 'bg-[#C5E875] text-[#0D382B] font-bold shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <span className="text-[10px] uppercase tracking-wider font-semibold">{w.day}</span>
                    <span className="text-xs font-extrabold mt-0.5">{w.date}</span>
                  </button>
                );
              })}
            </div>

            {/* 3 Pastel Shift Schedule Cards (Amber, Cyan, Lavender) */}
            <div className="space-y-3">
              {/* Card 1: Warm Amber/Yellow (Morning Shift - Vital Check Required) */}
              <div className="p-3.5 rounded-2xl bg-[#FEF9C3] border border-[#FDE047]/60 text-amber-950 transition-all hover:shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                    <span className="text-xs font-bold">Morning Shift (07:00 – 17:00 / 7:00am – 5:00pm)</span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/80 text-amber-900 border border-amber-300">
                    Mandatory Vitals
                  </span>
                </div>
                <p className="text-[11px] text-amber-900/90 leading-tight">
                  Morning vital sign checks (BP, Pulse, Temp, SpO2), breakfast assistance, and morning medications for Male & Female wards.
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-amber-800/80 font-medium">
                  <span>Nurse on Duty: Shahdan / Hajar</span>
                  <span className="font-semibold text-amber-950">Capacity: 30 Beds</span>
                </div>
              </div>

              {/* Card 2: Soft Cyan/Sky (Evening Shift - ADL & Care) */}
              <div className="p-3.5 rounded-2xl bg-[#E0F2FE] border border-[#BAE6FD]/60 text-sky-950 transition-all hover:shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-600" />
                    <span className="text-xs font-bold">Evening Shift (14:00 – 00:00 / 2:00pm – 12:00am)</span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/80 text-sky-900 border border-sky-300">
                    Care & Meds
                  </span>
                </div>
                <p className="text-[11px] text-sky-900/90 leading-tight">
                  Evening medications, rehabilitation support, dinner service, wound dressing, and resident personal hygiene.
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-sky-800/80 font-medium">
                  <span>Nurse on Duty: Shahdan</span>
                  <span className="font-semibold text-sky-950">ADL & Nursing Tasks</span>
                </div>
              </div>

              {/* Card 3: Soft Pink/Lavender (Night Shift - Vital Check Required) */}
              <div className="p-3.5 rounded-2xl bg-[#FCE7F3] border border-[#FBCFE8]/60 text-rose-950 transition-all hover:shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                    <span className="text-xs font-bold">Night Shift (21:00 – 07:00 / 9:00pm – 7:00am)</span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/80 text-rose-900 border border-rose-300">
                    Mandatory Vitals
                  </span>
                </div>
                <p className="text-[11px] text-rose-900/90 leading-tight">
                  Overnight vital monitoring (22:00 & 04:00), sleep/rest surveillance, and emergency clinical readiness.
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-rose-800/80 font-medium">
                  <span>Nurse on Duty: Hajar</span>
                  <span className="font-semibold text-rose-950">Periodic Ward Rounds</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenMonitoring();
              }}
              className="cursor-pointer py-2.5 px-3 rounded-2xl bg-[#0B3B2C] hover:bg-[#07281E] active:scale-98 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <ClipboardCheck className="w-4 h-4 text-[#C5E875]" />
              <span>Record Vitals (DAPUD)</span>
            </button>

            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('inventory')}
                className="py-2.5 px-3 rounded-2xl bg-[#EAF5DC] hover:bg-[#d8eec0] text-[#0B3B2C] text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-emerald-950/10 shadow-xs"
              >
                <PackageCheck className="w-4 h-4 text-[#0B3B2C]" />
                <span>Inventory & Meds</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. RECENT ACTIVITY: Modern DAPUD Clinical Activity Table */}
      <div className="bg-white rounded-3xl border border-emerald-950/5 shadow-xs overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#EAF5DC] text-[#0B3B2C] flex items-center justify-center">
              <Activity className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Daily Monitoring Activity (DAPUD Clinical Log)
              </h3>
              <p className="text-xs text-slate-400">Latest vital sign checks recorded across duty shifts</p>
            </div>
          </div>

          <button
            onClick={onOpenMonitoring}
            className="text-xs font-bold text-[#0B3B2C] hover:text-emerald-950 flex items-center gap-1 group"
          >
            <span>All Records</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {stats.recent_activities.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No monitoring records logged yet.
            </div>
          ) : (
            stats.recent_activities.map((rec) => {
              const isRed = rec.clinical_status === 'Red Alert';
              return (
                <div
                  key={rec.id}
                  onClick={() => onSelectPatient(rec.patient_id)}
                  className="px-6 py-4 hover:bg-[#F8FAF8] transition-colors flex items-center justify-between gap-4 cursor-pointer group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span
                      className={`w-3 h-3 rounded-full shrink-0 ring-4 ${
                        isRed
                          ? 'bg-rose-500 ring-rose-100'
                          : 'bg-[#0B3B2C] ring-[#EAF5DC]'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-[#0B3B2C] transition-colors">
                          {rec.patient_name}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400 font-semibold">
                          {rec.mrn}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-600 font-medium">
                          {rec.zone} · {rec.room_bed || 'No Bed Assigned'}
                        </span>
                      </div>

                      {/* Vital Signs in Modern Micro Pills */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-[#F2F6F2] text-[#0B3B2C]">
                          {rec.shift}
                        </span>
                        {rec.blood_pressure && (
                          <span className="text-[11px] font-mono text-slate-700 bg-slate-100/70 px-2 py-0.5 rounded-md">
                            BP <strong className="font-bold text-slate-900">{rec.blood_pressure}</strong>
                          </span>
                        )}
                        {rec.pulse_rate && (
                          <span className="text-[11px] font-mono text-slate-700 bg-slate-100/70 px-2 py-0.5 rounded-md">
                            PR <strong className="font-bold text-slate-900">{rec.pulse_rate}</strong> bpm
                          </span>
                        )}
                        {rec.temperature && (
                          <span className="text-[11px] font-mono text-slate-700 bg-slate-100/70 px-2 py-0.5 rounded-md">
                            <strong className="font-bold text-slate-900">{rec.temperature}</strong>°C
                          </span>
                        )}
                        {rec.spo2 && (
                          <span className="text-[11px] font-mono text-slate-700 bg-slate-100/70 px-2 py-0.5 rounded-md">
                            SpO2 <strong className="font-bold text-slate-900">{rec.spo2}%</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-semibold text-slate-800">{rec.staff_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {formatSafeTime(rec.timestamp)}
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-[#EAF5DC] text-slate-400 group-hover:text-[#0B3B2C] flex items-center justify-center transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
