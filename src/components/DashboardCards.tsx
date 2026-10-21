import React from 'react';
import { DashboardStats, Patient } from '../types/index.js';
import {
  Users,
  UserPlus,
  LogOut,
  AlertTriangle,
  Clock,
  Calendar,
  Activity,
  Heart,
  ChevronRight,
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
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-slate-100 rounded-xl border border-slate-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Active Patients & Zone breakdown */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pesakit Semasa</span>
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-bold text-slate-900 tracking-tight">
            {stats.total_active_patients}
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-blue-700 font-medium">Lelaki: {stats.male_zone_count}</span>
            <span className="text-slate-300">|</span>
            <span className="text-pink-700 font-medium">Perempuan: {stats.female_zone_count}</span>
          </div>
        </div>

        {/* Card 2: Clinical Alerts */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Amaran Hari Ini</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-rose-700 tracking-tight">
              {stats.alerts.red_alert_today}
            </span>
            <span className="text-xs font-medium text-rose-600">Red Alert</span>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-amber-700 font-medium">Tolak Ubat: {stats.alerts.refuse_meds_today}</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600 font-medium">Kurang Selera: {stats.alerts.poor_appetite_today}</span>
          </div>
        </div>

        {/* Card 3: Shift Updates */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Catatan Syif Hari Ini</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-bold text-slate-900 tracking-tight">
            {stats.updates_today.total}
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>AM: {stats.updates_today.am_shift}</span>
            <span>PM: {stats.updates_today.pm_shift}</span>
            <span>Night: {stats.updates_today.night_shift}</span>
          </div>
        </div>

        {/* Card 4: Average Stay & Admissions */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Purata Tempoh Rawatan</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">
              {stats.avg_length_of_stay}
            </span>
            <span className="text-xs font-medium text-slate-500">hari</span>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-teal-700 font-medium">Masuk Baru (7h): {stats.new_admissions_7d}</span>
            <span className="text-slate-500">Discaj: {stats.discharges_total}</span>
          </div>
        </div>
      </div>

      {/* Quick Alerts Notice if Red Alert active */}
      {stats.alerts.red_alert_today > 0 && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
            <p className="text-xs font-semibold text-rose-900">
              Terdapat {stats.alerts.red_alert_today} pesakit dengan status <span className="font-bold">Red Alert</span> hari ini. Sila semak bacaan tanda vital dan laporan kejururawatan segera.
            </p>
          </div>
          <button
            onClick={onOpenMonitoring}
            className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shrink-0"
          >
            Semak Sekarang
          </button>
        </div>
      )}

      {/* Recent Monitoring Activities Stream */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-700" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Aktiviti Pemantauan Terkini (DAPUD Stream)
            </h3>
          </div>
          <span className="text-xs text-slate-500">5 rekod terakhir</span>
        </div>

        <div className="divide-y divide-slate-100">
          {stats.recent_activities.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              Tiada rekod pemantauan direkodkan hari ini.
            </div>
          ) : (
            stats.recent_activities.map((rec) => (
              <div
                key={rec.id}
                onClick={() => onSelectPatient(rec.patient_id)}
                className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      rec.clinical_status === 'Red Alert' ? 'bg-rose-600' : 'bg-emerald-500'
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{rec.patient_name}</span>
                      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {rec.mrn}
                      </span>
                      <span className="text-xs text-slate-500">
                        {rec.zone} • {rec.room_bed || 'Tanpa Katil'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-600">
                      <span>Syif: <strong className="text-slate-800">{rec.shift}</strong></span>
                      {rec.blood_pressure && (
                        <span>BP: <strong className="text-slate-800">{rec.blood_pressure}</strong></span>
                      )}
                      {rec.pulse_rate && (
                        <span>Nadi: <strong className="text-slate-800">{rec.pulse_rate} bpm</strong></span>
                      )}
                      {rec.temperature && (
                        <span>Suhu: <strong className="text-slate-800">{rec.temperature}°C</strong></span>
                      )}
                      {rec.spo2 && (
                        <span>SpO2: <strong className="text-slate-800">{rec.spo2}%</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-medium text-slate-700">{rec.staff_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {new Date(rec.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
