import React, { useState } from 'react';
import { Patient, ZoneType } from '../types/index.js';
import {
  Search,
  Filter,
  Eye,
  PlusCircle,
  ClipboardList,
  LogOut,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
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
  onZoneChange,
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
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama pesakit, MRN, katil, atau penyakit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-600"
            />
          </div>

          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
          >
            <option value="Active">Status: Aktif</option>
            <option value="Discharged">Status: Telah Discaj</option>
            <option value="All">Status: Semua</option>
          </select>
        </div>

        <button
          onClick={onOpenAdmission}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Daftar Pesakit Baru</span>
        </button>
      </div>

      {/* Patients Master Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">No. MRN</th>
                <th className="py-3 px-4">Nama Pesakit</th>
                <th className="py-3 px-4">Umur & Jantina</th>
                <th className="py-3 px-4">Zon & Katil</th>
                <th className="py-3 px-4">Diagnosis Utama</th>
                <th className="py-3 px-4">Fasa Semasa</th>
                <th className="py-3 px-4">Tanda Vital Terkini</th>
                <th className="py-3 px-4">Tempoh Tinggal</th>
                <th className="py-3 px-4 text-right">Tindakan</th>
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
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isRed ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {patient.mrn}
                      </td>

                      <td className="py-3 px-4">
                        <div
                          onClick={() => onSelectPatient(patient.id)}
                          className="font-bold text-slate-900 hover:text-teal-700 cursor-pointer"
                        >
                          {patient.full_name}
                        </div>
                        {patient.follow_up_facility && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">
                            Susulan: {patient.follow_up_facility}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {patient.age} thn • {patient.gender === 'Male' ? 'L' : 'P'}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            patient.zone === 'Zon Lelaki'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-pink-50 text-pink-700 border border-pink-200'
                          }`}
                        >
                          {patient.room_bed || patient.zone}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={patient.primary_diagnosis}>
                        {patient.primary_diagnosis}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            patient.kanban_stage === 'Red Alert'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : patient.kanban_stage === 'Refuse Medication'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : patient.kanban_stage === 'TCA'
                              ? 'bg-sky-50 text-sky-800 border-sky-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {patient.kanban_stage || 'New Admission'}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px]">
                        {patient.latest_bp ? (
                          <div className="space-y-0.5">
                            <span className="font-semibold text-slate-800">{patient.latest_bp}</span>
                            <span className="text-slate-400 text-[10px] block">
                              {patient.latest_temp ? `${patient.latest_temp}°C` : ''} • {patient.latest_pulse ? `${patient.latest_pulse}bpm` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Belum disemak</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {patient.length_of_stay !== undefined ? `${patient.length_of_stay} hari` : 'Hari 1'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onSelectPatient(patient.id)}
                            title="Lihat profil pesakit"
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onOpenMonitoringForPatient(patient)}
                            title="Catat pemerhatian syif"
                            className="p-1.5 rounded-md hover:bg-teal-50 text-teal-700 hover:text-teal-900 transition-colors"
                          >
                            <ClipboardList className="w-4 h-4" />
                          </button>

                          {patient.status === 'Active' && (
                            <button
                              onClick={() => onOpenDischargeForPatient(patient)}
                              title="Proses discaj pesakit"
                              className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
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
