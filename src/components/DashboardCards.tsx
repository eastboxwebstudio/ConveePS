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
} from 'lucide-react';

interface DashboardCardsProps {
  stats: DashboardStats | null;
  onSelectPatient: (patientId: string) => void;
  onOpenAdmission: () => void;
  onOpenMonitoring: () => void;
}

export const DashboardCards: React.FC<DashboardCardsProps> = ({
  stats,
  onSelectPatient,
  onOpenAdmission,
  onOpenMonitoring,
}) => {
  const [selectedDay, setSelectedDay] = useState<number>(3); // Wednesday active
  const [timeFilter, setTimeFilter] = useState<'All' | '30D' | '7D'>('7D');

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
    { day: 'Isn', date: '14' },
    { day: 'Sel', date: '15' },
    { day: 'Rab', date: '16' },
    { day: 'Kha', date: '17' },
    { day: 'Jum', date: '18' },
    { day: 'Sab', date: '19' },
    { day: 'Ahd', date: '20' },
  ];

  // Acuity trend bars representing clinical activity across past days
  const chartData = [
    { label: 'Isn', total: 6, stable: 6, alert: 0 },
    { label: 'Sel', total: 6, stable: 5, alert: 1 },
    { label: 'Rab', total: 6, stable: 6, alert: 0 },
    { label: 'Kha', total: 6, stable: 4, alert: 2, highlighted: true }, // Coral accent bar like reference image
    { label: 'Jum', total: 6, stable: 6, alert: 0 },
    { label: 'Sab', total: 6, stable: 6, alert: 0 },
    { label: 'Ahd', total: 6, stable: 6, alert: 0 },
  ];

  return (
    <div className="space-y-6">
      {/* 1. TOP CARD: Multi-Metric Header Card with Vertical Dividers (Inspired by "Performance Over Time" in reference) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-emerald-950/5 shadow-xs">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Prestasi Penjagaan Klinikal & Status Wad
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ringkasan pemantauan tanda vital 2x sehari, zon pesakit, dan indeks amaran harian
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter pills */}
            <div className="inline-flex rounded-2xl bg-[#F2F6F2] p-1 border border-emerald-950/5 text-xs font-semibold">
              <button
                onClick={() => setTimeFilter('All')}
                className={`px-3 py-1 rounded-xl transition-all ${
                  timeFilter === 'All' ? 'bg-[#C5E875] text-[#0D382B] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setTimeFilter('30D')}
                className={`px-3 py-1 rounded-xl transition-all ${
                  timeFilter === '30D' ? 'bg-[#C5E875] text-[#0D382B] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                30 Hari
              </button>
              <button
                onClick={() => setTimeFilter('7D')}
                className={`px-3 py-1 rounded-xl transition-all ${
                  timeFilter === '7D' ? 'bg-[#C5E875] text-[#0D382B] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                7 Hari
              </button>
            </div>
          </div>
        </div>

        {/* 4 Metrics with Vertical Dividers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6 sm:divide-x divide-slate-100">
          {/* Metric 1: Total Active Patients */}
          <div className="sm:pr-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span className="font-medium text-slate-600">Pesakit Dalam Jagaan</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EAF5DC] text-[#0B3B2C]">
                <TrendingUp className="w-3 h-3" />
                Aktif
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {stats.total_active_patients}
              </span>
              <span className="text-xs font-semibold text-slate-400">/ 12 Katil</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Zon Lelaki: <strong className="text-blue-900">{stats.male_zone_count}</strong> · Zon Perempuan:{' '}
              <strong className="text-rose-900">{stats.female_zone_count}</strong>
            </p>
          </div>

          {/* Metric 2: Clinical Acuity Alerts */}
          <div className="sm:px-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span className="font-medium text-slate-600">Indeks Amaran Klinikal</span>
              {stats.alerts.red_alert_today > 0 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  <Flame className="w-3 h-3" />
                  Perhatian
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EAF5DC] text-[#0B3B2C]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                  Stabil
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
              Tolak Ubat: <strong className="text-amber-800">{stats.alerts.refuse_meds_today}</strong> · Kurang Selera:{' '}
              <strong className="text-slate-800">{stats.alerts.poor_appetite_today}</strong>
            </p>
          </div>

          {/* Metric 3: Shift Checks Today */}
          <div className="sm:px-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span className="font-medium text-slate-600">Catatan Semakan Syif</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F2F6F2] text-slate-700">
                <Clock className="w-3 h-3" />
                2x Sehari
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {stats.updates_today.total}
              </span>
              <span className="text-xs font-semibold text-slate-400">rekod</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              AM: <strong className="text-slate-800">{stats.updates_today.am_shift}</strong> · PM:{' '}
              <strong className="text-slate-800">{stats.updates_today.pm_shift}</strong> · Night:{' '}
              <strong className="text-slate-800">{stats.updates_today.night_shift}</strong>
            </p>
          </div>

          {/* Metric 4: Average Stay & Direct Discharge */}
          <div className="sm:pl-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span className="font-medium text-slate-600">Purata Tempoh Rawatan</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EAF5DC] text-[#0B3B2C]">
                Pemulihan
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {stats.avg_length_of_stay}
              </span>
              <span className="text-xs font-semibold text-slate-400">Hari</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Kemasukan 7H: <strong className="text-slate-800">{stats.new_admissions_7d}</strong> · Discaj Terus:{' '}
              <strong className="text-emerald-800 font-bold">{stats.discharges_total} Selesai</strong>
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
                  Aktiviti & Tahap Kestabilan Pesakit
                </h3>
                <p className="text-xs text-slate-500">
                  Taburan status klinikal harian mengikut pemantauan tanda vital
                </p>
              </div>

              {/* Legend matching corporate health tone */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0B3B2C]" />
                  <span className="text-slate-600 font-medium text-[11px]">Stabil</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B4A]" />
                  <span className="text-slate-600 font-medium text-[11px]">Perhatian / Red Alert</span>
                </div>
              </div>
            </div>

            {/* Visual Bar Chart (with coral/orange accent bar as shown in reference image) */}
            <div className="mt-8 pt-4">
              <div className="h-44 flex items-end justify-between gap-3 sm:gap-4 px-2">
                {chartData.map((d, index) => {
                  const heightPercent = Math.min(100, Math.max(30, (d.total / 8) * 100));
                  const isAccent = d.highlighted;

                  return (
                    <div key={d.label} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                      {/* Bar Container */}
                      <div className="relative w-full flex items-end justify-center h-36">
                        {/* Hover Tooltip */}
                        <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-semibold px-2 py-1 rounded-md pointer-events-none whitespace-nowrap shadow-sm z-10">
                          {d.total} Pesakit ({d.stable} Stabil{d.alert > 0 ? `, ${d.alert} Alert` : ''})
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
                          isAccent ? 'text-[#FF6B4A]' : 'text-slate-500'
                        }`}
                      >
                        {d.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Metrics Strip below chart */}
          <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-3 gap-3 text-center">
            <div className="p-2.5 rounded-2xl bg-[#F8FAF8]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Kadar Kestabilan
              </span>
              <span className="text-base font-extrabold text-[#0B3B2C] mt-0.5 block">94.2%</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-[#F8FAF8]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Kemasukan (7H)
              </span>
              <span className="text-base font-extrabold text-slate-800 mt-0.5 block">6 Baru</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-[#F8FAF8]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Discaj Selesai
              </span>
              <span className="text-base font-extrabold text-emerald-800 mt-0.5 block">Langsung</span>
            </div>
          </div>
        </div>

        {/* Right Bento: Weekly Calendar & Pastel Schedule Cards (Inspired by Reference Layout) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-emerald-950/5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Jadual Syif & Tugasan Penjagaan
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EAF5DC] text-[#0B3B2C]">
                Hari Ini
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
              {/* Card 1: Warm Amber/Yellow (AM Shift - Vital Check Required) */}
              <div className="p-3.5 rounded-2xl bg-[#FEF9C3] border border-[#FDE047]/60 text-amber-950 transition-all hover:shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                    <span className="text-xs font-bold">Syif AM (07:00 – 17:00)</span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/80 text-amber-900 border border-amber-300">
                    Vital Sign 1x Selesai
                  </span>
                </div>
                <p className="text-[11px] text-amber-900/90 leading-tight">
                  Semakan vital sign pagi untuk semua 6 pesakit Zon L & P selesai direkodkan.
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-amber-800/80 font-medium">
                  <span>Jururawat: Shahdan / Hajar</span>
                  <span className="font-semibold text-amber-950">6/6 Lengkap</span>
                </div>
              </div>

              {/* Card 2: Soft Cyan/Sky (PM Shift - ADL & Rehab) */}
              <div className="p-3.5 rounded-2xl bg-[#E0F2FE] border border-[#BAE6FD]/60 text-sky-950 transition-all hover:shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-600" />
                    <span className="text-xs font-bold">Syif PM (17:00 – 21:00)</span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/80 text-sky-900 border border-sky-300">
                    Tugasan ADL
                  </span>
                </div>
                <p className="text-[11px] text-sky-900/90 leading-tight">
                  Aktiviti pemulihan, makan malam, dan kebersihan diri pesakit.
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-sky-800/80 font-medium">
                  <span>Jururawat: Shahdan</span>
                  <span className="italic">Tanpa semakan vital mandatori</span>
                </div>
              </div>

              {/* Card 3: Soft Pink/Lavender (Night Shift - Vital Check Required) */}
              <div className="p-3.5 rounded-2xl bg-[#FCE7F3] border border-[#FBCFE8]/60 text-rose-950 transition-all hover:shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                    <span className="text-xs font-bold">Syif Night (21:00 – 07:00)</span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/80 text-rose-900 border border-rose-300">
                    Vital Sign 2x
                  </span>
                </div>
                <p className="text-[11px] text-rose-900/90 leading-tight">
                  Pemeriksaan berkala tanda vital waktu malam dan pengawasan rehat.
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-rose-800/80 font-medium">
                  <span>Jururawat: Hajar</span>
                  <span className="font-semibold text-rose-950">Dijadualkan 22:00</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Button */}
          <button
            onClick={onOpenMonitoring}
            className="mt-4 w-full py-2.5 px-4 rounded-2xl bg-[#0B3B2C] hover:bg-[#07281E] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <ClipboardCheck className="w-4 h-4 text-[#C5E875]" />
            <span>Rekod Pemantauan Sekarang</span>
          </button>
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
                Aktiviti Pemantauan Harian (DAPUD Clinical Log)
              </h3>
              <p className="text-xs text-slate-400">Catatan tanda vital terkini mengikut syif bertugas</p>
            </div>
          </div>

          <button
            onClick={onOpenMonitoring}
            className="text-xs font-bold text-[#0B3B2C] hover:text-emerald-950 flex items-center gap-1 group"
          >
            <span>Semua Rekod</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {stats.recent_activities.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Tiada rekod pemerhatian direkodkan setakat ini.
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
                          {rec.zone} · {rec.room_bed || 'Tanpa Katil'}
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
                        {new Date(rec.timestamp).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
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
