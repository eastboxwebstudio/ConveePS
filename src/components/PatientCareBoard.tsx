import React, { useState } from 'react';
import { Patient, ZoneType } from '../types/index.js';
import {
  CheckSquare,
  Square,
  ShieldAlert,
  Heart,
  Droplet,
  Utensils,
  RefreshCw,
  Move,
  Search,
} from 'lucide-react';

interface PatientCareBoardProps {
  patients: Patient[];
  onSelectPatient: (patientId: string) => void;
  onOpenMonitoringForPatient: (patient: Patient) => void;
}

type GroupByOption = 'zone' | 'status' | 'appetite';

export const PatientCareBoard: React.FC<PatientCareBoardProps> = ({
  patients,
  onSelectPatient,
  onOpenMonitoringForPatient,
}) => {
  const [groupBy, setGroupBy] = useState<GroupByOption>('zone');
  const [filterQuery, setFilterQuery] = useState('');

  const filteredPatients = patients.filter((p) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      p.full_name.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q) ||
      (p.room_bed && p.room_bed.toLowerCase().includes(q))
    );
  });

  // Grouping logic
  let groups: { key: string; label: string; list: Patient[]; color: string }[] = [];

  if (groupBy === 'zone') {
    groups = [
      {
        key: 'Zon Lelaki',
        label: 'Zon Lelaki (Katil L)',
        list: filteredPatients.filter((p) => p.zone === 'Zon Lelaki'),
        color: 'border-blue-500 bg-blue-50/50',
      },
      {
        key: 'Zon Perempuan',
        label: 'Zon Perempuan (Katil P)',
        list: filteredPatients.filter((p) => p.zone === 'Zon Perempuan'),
        color: 'border-pink-500 bg-pink-50/50',
      },
    ];
  } else if (groupBy === 'status') {
    groups = [
      {
        key: 'Stable',
        label: 'Pesakit Stabil (Stable)',
        list: filteredPatients.filter((p) => p.latest_clinical_status !== 'Red Alert'),
        color: 'border-emerald-500 bg-emerald-50/50',
      },
      {
        key: 'Red Alert',
        label: 'Perhatian Rapi (Red Alert)',
        list: filteredPatients.filter((p) => p.latest_clinical_status === 'Red Alert'),
        color: 'border-rose-500 bg-rose-50/50',
      },
    ];
  } else {
    groups = [
      {
        key: 'GOOD',
        label: 'Selera Baik (Good)',
        list: filteredPatients.filter((p) => p.latest_appetite !== 'POOR'),
        color: 'border-teal-500 bg-teal-50/50',
      },
      {
        key: 'POOR',
        label: 'Kurang Selera (Poor Appetite Alert)',
        list: filteredPatients.filter((p) => p.latest_appetite === 'POOR'),
        color: 'border-amber-500 bg-amber-50/50',
      },
    ];
  }

  return (
    <div className="space-y-4">
      {/* Board Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Patient Care Board (Tugasan Penjagaan Harian & ADL)
          </h2>
          <p className="text-xs text-slate-500">
            Pemantauan pelaksanaan mandian, suapan, dressing luka, reposisi baring, dan mobilisasi.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari pesakit..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-600"
            />
          </div>

          {/* Grouping switch */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs font-medium shrink-0">
            <button
              onClick={() => setGroupBy('zone')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                groupBy === 'zone' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              Zon
            </button>
            <button
              onClick={() => setGroupBy('status')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                groupBy === 'status' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              Status
            </button>
            <button
              onClick={() => setGroupBy('appetite')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                groupBy === 'appetite' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              Selera
            </button>
          </div>
        </div>
      </div>

      {/* Columns per group */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {groups.map((grp) => (
          <div key={grp.key} className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col">
            <div className={`p-3 border-b border-slate-200 rounded-t-xl border-l-4 ${grp.color} flex items-center justify-between`}>
              <span className="text-xs font-bold text-slate-800">{grp.label}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {grp.list.length} Pesakit
              </span>
            </div>

            <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[700px]">
              {grp.list.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 italic">
                  Tiada pesakit dalam kategori ini.
                </div>
              ) : (
                grp.list.map((patient) => {
                  const isRed = patient.latest_clinical_status === 'Red Alert';
                  return (
                    <div
                      key={patient.id}
                      className={`p-3.5 rounded-lg border transition-all ${
                        isRed
                          ? 'border-rose-300 bg-rose-50/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      {/* Top Header */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                            {patient.mrn}
                          </span>
                          <span
                            onClick={() => onSelectPatient(patient.id)}
                            className="text-xs font-bold text-slate-900 hover:text-teal-700 cursor-pointer"
                          >
                            {patient.full_name}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          {patient.room_bed || patient.zone}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 mb-2">
                        {patient.age} thn • {patient.care_level} • {patient.primary_diagnosis}
                      </div>

                      {/* Care Tasks Indicators Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100 text-center">
                        {/* Task 1: Hygiene */}
                        <div className="p-1.5 rounded bg-slate-50 border border-slate-100 text-[11px]">
                          <div className="text-[10px] text-slate-500 uppercase font-medium">Mandian</div>
                          <div className="font-bold text-slate-800 mt-0.5">Selesai</div>
                        </div>

                        {/* Task 2: Feeding */}
                        <div className="p-1.5 rounded bg-slate-50 border border-slate-100 text-[11px]">
                          <div className="text-[10px] text-slate-500 uppercase font-medium">Makan</div>
                          <div className={`font-bold mt-0.5 ${patient.latest_appetite === 'POOR' ? 'text-amber-700' : 'text-slate-800'}`}>
                            {patient.latest_appetite === 'POOR' ? 'Kurang' : 'Baik'}
                          </div>
                        </div>

                        {/* Task 3: Dressing */}
                        <div className="p-1.5 rounded bg-slate-50 border border-slate-100 text-[11px]">
                          <div className="text-[10px] text-slate-500 uppercase font-medium">Dressing</div>
                          <div className="font-bold text-slate-800 mt-0.5">Sedia</div>
                        </div>

                        {/* Task 4: Repositioning */}
                        <div className="p-1.5 rounded bg-slate-50 border border-slate-100 text-[11px]">
                          <div className="text-[10px] text-slate-500 uppercase font-medium">Reposisi</div>
                          <div className="font-bold text-slate-800 mt-0.5">2 Jam Sekali</div>
                        </div>

                        {/* Task 5: Medication */}
                        <div className="p-1.5 rounded bg-slate-50 border border-slate-100 text-[11px]">
                          <div className="text-[10px] text-slate-500 uppercase font-medium">Ubat</div>
                          <div className={`font-bold mt-0.5 ${patient.latest_med_status === 'REFUSE' ? 'text-rose-700' : 'text-teal-700'}`}>
                            {patient.latest_med_status === 'REFUSE' ? 'Tolak Ubat' : 'Diberi'}
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          Status Klinikal: <strong className={isRed ? 'text-rose-700' : 'text-emerald-700'}>{patient.latest_clinical_status || 'Stable'}</strong>
                        </span>

                        <button
                          onClick={() => onOpenMonitoringForPatient(patient)}
                          className="px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold transition-colors"
                        >
                          + Kemas Kini Jagaan
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
