import React, { useState } from 'react';
import { Patient } from '../types/index.js';
import { Search } from 'lucide-react';

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
  let groups: { key: string; label: string; list: Patient[] }[] = [];

  if (groupBy === 'zone') {
    groups = [
      {
        key: 'Zon Lelaki',
        label: 'Zon Lelaki',
        list: filteredPatients.filter((p) => p.zone === 'Zon Lelaki'),
      },
      {
        key: 'Zon Perempuan',
        label: 'Zon Perempuan',
        list: filteredPatients.filter((p) => p.zone === 'Zon Perempuan'),
      },
    ];
  } else if (groupBy === 'status') {
    groups = [
      {
        key: 'Stable',
        label: 'Pesakit Stabil (Nominal)',
        list: filteredPatients.filter((p) => p.latest_clinical_status !== 'Red Alert'),
      },
      {
        key: 'Red Alert',
        label: 'Perhatian Rapi (Red Alert)',
        list: filteredPatients.filter((p) => p.latest_clinical_status === 'Red Alert'),
      },
    ];
  } else {
    groups = [
      {
        key: 'GOOD',
        label: 'Selera Normal',
        list: filteredPatients.filter((p) => p.latest_appetite !== 'POOR'),
      },
      {
        key: 'POOR',
        label: 'Kurang Selera (Poor Appetite)',
        list: filteredPatients.filter((p) => p.latest_appetite === 'POOR'),
      },
    ];
  }

  return (
    <div className="space-y-4">
      {/* Board Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-emerald-950/5 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Patient Care Board (ADL)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tugasan mandian, pemakanan, balutan luka, reposisi, dan mobilisasi.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari pesakit..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-2xl border border-emerald-950/10 focus:outline-hidden focus:ring-1 focus:ring-[#0B3B2C] transition-all bg-[#F8FAF8]"
            />
          </div>

          {/* Grouping segmented switch with lime active pill */}
          <div className="inline-flex rounded-2xl border border-emerald-950/5 p-1 bg-[#F4F8F4] text-xs font-semibold shrink-0">
            <button
              onClick={() => setGroupBy('zone')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                groupBy === 'zone' ? 'bg-[#C5E875] text-[#0D382B] font-bold shadow-2xs' : 'text-slate-600'
              }`}
            >
              Zon
            </button>
            <button
              onClick={() => setGroupBy('status')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                groupBy === 'status' ? 'bg-[#C5E875] text-[#0D382B] font-bold shadow-2xs' : 'text-slate-600'
              }`}
            >
              Status
            </button>
            <button
              onClick={() => setGroupBy('appetite')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                groupBy === 'appetite' ? 'bg-[#C5E875] text-[#0D382B] font-bold shadow-2xs' : 'text-slate-600'
              }`}
            >
              Selera
            </button>
          </div>
        </div>
      </div>

      {/* Columns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {groups.map((grp) => (
          <div key={grp.key} className="bg-white rounded-3xl border border-emerald-950/5 shadow-xs flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">{grp.label}</span>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#F4F8F4] text-[#0B3B2C] tabular-nums">
                {grp.list.length} Pesakit
              </span>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto max-h-[700px]">
              {grp.list.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Tiada pesakit dalam kategori ini.
                </div>
              ) : (
                grp.list.map((patient) => {
                  const isRed = patient.latest_clinical_status === 'Red Alert';
                  return (
                    <div
                      key={patient.id}
                      className={`p-4 rounded-2xl border transition-all shadow-2xs ${
                        isRed
                          ? 'border-rose-300 ring-2 ring-rose-100 bg-rose-50/20'
                          : 'border-emerald-950/5 hover:border-emerald-200 bg-white'
                      }`}
                    >
                      {/* Top Header */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-slate-400">
                            {patient.mrn}
                          </span>
                          <span
                            onClick={() => onSelectPatient(patient.id)}
                            className="text-xs font-bold text-slate-900 hover:text-[#0B3B2C] cursor-pointer transition-colors"
                          >
                            {patient.full_name}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#0B3B2C] font-bold bg-[#EAF5DC] px-2 py-0.5 rounded-md">
                          {patient.room_bed || patient.zone}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 mb-2.5 flex items-center gap-1.5 flex-wrap">
                        <span>{patient.age} thn</span>
                        <span className="text-slate-300">·</span>
                        <span>{patient.care_level}</span>
                        <span className="text-slate-300">·</span>
                        <span className="truncate max-w-xs">{patient.primary_diagnosis}</span>
                      </div>

                      {/* Care Tasks Strip */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100 text-center">
                        <div className="p-2 rounded-xl bg-[#F8FAF8] border border-slate-100 text-[11px]">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Mandian</div>
                          <div className="font-bold text-slate-800 mt-0.5">Selesai</div>
                        </div>

                        <div className="p-2 rounded-xl bg-[#F8FAF8] border border-slate-100 text-[11px]">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Selera</div>
                          <div className={`font-bold mt-0.5 ${patient.latest_appetite === 'POOR' ? 'text-amber-800' : 'text-slate-800'}`}>
                            {patient.latest_appetite === 'POOR' ? 'Kurang' : 'Baik'}
                          </div>
                        </div>

                        <div className="p-2 rounded-xl bg-[#F8FAF8] border border-slate-100 text-[11px]">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Dressing</div>
                          <div className="font-bold text-slate-800 mt-0.5">Sedia</div>
                        </div>

                        <div className="p-2 rounded-xl bg-[#F8FAF8] border border-slate-100 text-[11px]">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Reposisi</div>
                          <div className="font-bold text-slate-800 mt-0.5">2 Jam</div>
                        </div>

                        <div className="p-2 rounded-xl bg-[#F8FAF8] border border-slate-100 text-[11px]">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Ubat</div>
                          <div className={`font-bold mt-0.5 ${patient.latest_med_status === 'REFUSE' ? 'text-rose-700' : 'text-[#0B3B2C]'}`}>
                            {patient.latest_med_status === 'REFUSE' ? 'Tolak' : 'Diberi'}
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-500">
                          Status: <strong className={isRed ? 'text-rose-700 font-bold' : 'text-[#0B3B2C] font-bold'}>{patient.latest_clinical_status || 'Stable'}</strong>
                        </span>

                        <button
                          onClick={() => onOpenMonitoringForPatient(patient)}
                          className="px-3 py-1.5 rounded-xl bg-[#F2F6F2] hover:bg-[#EAF5DC] text-[#0B3B2C] text-xs font-bold transition-colors"
                        >
                          Kemas Kini Jagaan
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
