import React, { useState } from 'react';
import { Patient, ZoneType } from '../types/index.js';
import {
  Search,
  Eye,
  Plus,
  ClipboardPenLine,
  LogOut,
} from 'lucide-react';

interface PatientListProps {
  patients: Patient[];
  onSelectPatient: (patientId: string) => void;
  onOpenMonitoringForPatient: (patient: Patient) => void;
  onOpenDischargeForPatient: (patient: Patient) => void;
  onOpenAdmission: () => void;
  currentZone: ZoneType | '';
  onZoneChange: (zone: ZoneType | '') => void;
}

export const PatientList: React.FC<PatientListProps> = ({
  patients,
  onSelectPatient,
  onOpenMonitoringForPatient,
  onOpenDischargeForPatient,
  onOpenAdmission,
  currentZone,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Active' | 'Discharged' | 'All'>('Active');

  const filtered = patients.filter((p) => {
    // Zone filter
    if (currentZone && p.zone !== currentZone) return false;

    // Status filter
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.full_name.toLowerCase().includes(q);
      const matchMrn = p.mrn.toLowerCase().includes(q);
      const matchBed = p.room_bed ? p.room_bed.toLowerCase().includes(q) : false;
      const matchDiag = p.primary_diagnosis.toLowerCase().includes(q);
      return matchName || matchMrn || matchBed || matchDiag;
    }

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="p-4 sm:p-5 bg-white rounded-3xl border border-emerald-950/5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama pesakit, MRN, katil, atau diagnosis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-2xl border border-emerald-950/10 focus:outline-hidden focus:ring-1 focus:ring-[#0B3B2C] transition-all bg-[#F8FAF8]"
            />
          </div>

          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3.5 py-2 text-xs rounded-2xl border border-emerald-950/10 bg-[#F8FAF8] text-slate-700 font-semibold focus:outline-hidden"
          >
            <option value="Active">Status: Aktif</option>
            <option value="Discharged">Status: Telah Discaj</option>
            <option value="All">Status: Semua</option>
          </select>
        </div>

        <button
          onClick={onOpenAdmission}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#0B3B2C] hover:bg-[#07281E] text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5 text-[#C5E875]" />
          <span>Daftar Pesakit Baru</span>
        </button>
      </div>

      {/* Patients Data Grid */}
      <div className="bg-white rounded-3xl border border-emerald-950/5 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAF8] border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-5">No. MRN</th>
                <th className="py-3.5 px-5">Nama Pesakit</th>
                <th className="py-3.5 px-5">Umur & Jantina</th>
                <th className="py-3.5 px-5">Zon & Katil</th>
                <th className="py-3.5 px-5">Diagnosis Utama</th>
                <th className="py-3.5 px-5">Fasa Semasa</th>
                <th className="py-3.5 px-5">Tanda Vital Terkini</th>
                <th className="py-3.5 px-5">Tempoh</th>
                <th className="py-3.5 px-5 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tiada rekod pesakit yang sepadan dengan carian.
                  </td>
                </tr>
              ) : (
                filtered.map((patient) => {
                  const isRed = patient.latest_clinical_status === 'Red Alert';
                  return (
                    <tr
                      key={patient.id}
                      className={`hover:bg-[#F8FAF8] transition-colors ${
                        isRed ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-600">
                        {patient.mrn}
                      </td>

                      <td className="py-3.5 px-5">
                        <div
                          onClick={() => onSelectPatient(patient.id)}
                          className="font-bold text-slate-900 hover:text-[#0B3B2C] cursor-pointer transition-colors"
                        >
                          {patient.full_name}
                        </div>
                        {patient.follow_up_facility && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5">
                            Susulan: {patient.follow_up_facility}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-slate-600 tabular-nums">
                        {patient.age} thn · {patient.gender === 'Male' ? 'L' : 'P'}
                      </td>

                      <td className="py-3.5 px-5 font-semibold text-slate-700">
                        <span className="px-2 py-0.5 rounded-md bg-[#F2F6F2] text-[#0B3B2C] text-[11px]">
                          {patient.room_bed || patient.zone}
                        </span>
                      </td>

                      <td className="py-3.5 px-5 text-slate-600 max-w-xs truncate" title={patient.primary_diagnosis}>
                        {patient.primary_diagnosis}
                      </td>

                      <td className="py-3.5 px-5">
                        <span
                          className={`font-semibold text-xs px-2 py-0.5 rounded-full ${
                            patient.kanban_stage === 'Red Alert'
                              ? 'bg-rose-100 text-rose-800'
                              : patient.kanban_stage === 'Refuse Medication'
                              ? 'bg-amber-100 text-amber-800'
                              : patient.kanban_stage === 'TCA'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {patient.kanban_stage || 'New Admission'}
                        </span>
                      </td>

                      <td className="py-3.5 px-5 font-mono text-[11px] tabular-nums">
                        {patient.latest_bp ? (
                          <div>
                            <span className="font-bold text-slate-800">{patient.latest_bp}</span>
                            <span className="text-slate-400 text-[10px] block">
                              {patient.latest_temp ? `${patient.latest_temp}°C` : ''} · {patient.latest_pulse ? `${patient.latest_pulse}bpm` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Belum disemak</span>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-slate-600 font-mono tabular-nums">
                        {patient.length_of_stay !== undefined ? `${patient.length_of_stay} hari` : 'Hari 1'}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => onSelectPatient(patient.id)}
                            title="Lihat profil pesakit"
                            className="p-1.5 rounded-xl hover:bg-[#EAF5DC] text-slate-500 hover:text-[#0B3B2C] transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onOpenMonitoringForPatient(patient)}
                            title="Catat pemerhatian syif"
                            className="p-1.5 rounded-xl hover:bg-[#EAF5DC] text-slate-500 hover:text-[#0B3B2C] transition-colors"
                          >
                            <ClipboardPenLine className="w-4 h-4" />
                          </button>

                          {patient.status === 'Active' && (
                            <button
                              onClick={() => onOpenDischargeForPatient(patient)}
                              title="Proses discaj pesakit"
                              className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <LogOut className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
