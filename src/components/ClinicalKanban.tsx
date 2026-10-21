import React, { useState } from 'react';
import { Patient, KanbanStage } from '../types/index.js';
import {
  AlertCircle,
  Clock,
  ArrowRight,
  MoreVertical,
  Activity,
  UserCheck,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

interface ClinicalKanbanProps {
  patients: Patient[];
  onSelectPatient: (patientId: string) => void;
  onUpdateStage: (admissionId: string, stage: KanbanStage) => Promise<void>;
  onOpenMonitoringForPatient: (patient: Patient) => void;
  onOpenDischargeForPatient: (patient: Patient) => void;
}

const STAGES: { id: KanbanStage; label: string; color: string; badgeBg: string }[] = [
  { id: 'New Admission', label: 'Kemasukan Baru', color: 'border-blue-500', badgeBg: 'bg-blue-50 text-blue-800 border-blue-200' },
  { id: 'Hospitalisation', label: 'Wad / Rawatan Biasa', color: 'border-teal-500', badgeBg: 'bg-teal-50 text-teal-800 border-teal-200' },
  { id: 'Red Alert', label: 'Red Alert (Kritikal)', color: 'border-rose-500', badgeBg: 'bg-rose-50 text-rose-800 border-rose-200' },
  { id: 'TCA', label: 'TCA (Susulan Hospital)', color: 'border-sky-500', badgeBg: 'bg-sky-50 text-sky-800 border-sky-200' },
  { id: 'Home Leave', label: 'Cuti Rumah (Home Leave)', color: 'border-indigo-500', badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  { id: 'Refuse Medication', label: 'Tolak Ubat (Refuse Meds)', color: 'border-amber-500', badgeBg: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'Discharged', label: 'Discaj / Keluar', color: 'border-slate-400', badgeBg: 'bg-slate-100 text-slate-700 border-slate-300' },
];

export const ClinicalKanban: React.FC<ClinicalKanbanProps> = ({
  patients,
  onSelectPatient,
  onUpdateStage,
  onOpenMonitoringForPatient,
  onOpenDischargeForPatient,
}) => {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleStageChange(admissionId: string, newStage: KanbanStage) {
    try {
      setUpdatingId(admissionId);
      await onUpdateStage(admissionId, newStage);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Kanban Header Note */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Papan Kanban Klinikal (Clinical Workflow Board)
          </h2>
          <p className="text-xs text-slate-500">
            Jejak fasa perjalanan setiap pesakit dari kemasukan hingga discaj merangkumi amaran Red Alert dan temujanji TCA.
          </p>
        </div>
      </div>

      {/* Kanban Board Horizontal Scroll */}
      <div className="flex gap-3 overflow-x-auto pb-4 items-start min-h-[550px]">
        {STAGES.map((stage) => {
          const stagePatients = patients.filter(
            (p) => (p.kanban_stage || 'New Admission') === stage.id
          );

          return (
            <div
              key={stage.id}
              className="w-72 shrink-0 bg-slate-100/80 rounded-xl border border-slate-200/80 flex flex-col max-h-[750px]"
            >
              {/* Column Header */}
              <div
                className={`p-3 bg-white rounded-t-xl border-b border-slate-200 border-t-4 ${stage.color} flex items-center justify-between shadow-2xs`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">{stage.label}</span>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${stage.badgeBg}`}>
                  {stagePatients.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1">
                {stagePatients.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 italic">
                    Tiada pesakit
                  </div>
                ) : (
                  stagePatients.map((patient) => {
                    const isRed = patient.latest_clinical_status === 'Red Alert' || stage.id === 'Red Alert';
                    return (
                      <div
                        key={patient.id}
                        className={`p-3 bg-white rounded-lg border transition-all hover:shadow-sm ${
                          isRed
                            ? 'border-rose-300 ring-1 ring-rose-200'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Top: MRN & Zone/Bed */}
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {patient.mrn}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              patient.zone === 'Zon Lelaki'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-pink-50 text-pink-700 border border-pink-200'
                            }`}
                          >
                            {patient.room_bed || patient.zone}
                          </span>
                        </div>

                        {/* Patient Name & Age */}
                        <div
                          onClick={() => onSelectPatient(patient.id)}
                          className="font-bold text-xs text-slate-900 hover:text-teal-700 cursor-pointer transition-colors"
                        >
                          {patient.full_name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {patient.age} tahun • {patient.gender === 'Male' ? 'Lelaki' : 'Perempuan'}
                        </div>

                        {/* Primary Diagnosis */}
                        <div className="mt-2 text-xs text-slate-600 line-clamp-2 bg-slate-50 p-1.5 rounded border border-slate-100">
                          {patient.primary_diagnosis}
                        </div>

                        {/* Vitals Summary Pill */}
                        {(patient.latest_bp || patient.latest_temp) && (
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-700">
                            <span>BP: {patient.latest_bp || '-'}</span>
                            <span>T: {patient.latest_temp ? `${patient.latest_temp}°C` : '-'}</span>
                            <span>SpO2: {patient.latest_spo2 ? `${patient.latest_spo2}%` : '-'}</span>
                          </div>
                        )}

                        {/* Length of stay & actions */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {patient.length_of_stay !== undefined ? `${patient.length_of_stay} hari` : 'Hari 1'}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onOpenMonitoringForPatient(patient)}
                              title="Catat pemerhatian syif"
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 font-semibold transition-colors"
                            >
                              Catat
                            </button>

                            {/* Move Stage Selector */}
                            <select
                              value={patient.kanban_stage || stage.id}
                              disabled={updatingId === patient.admission_id}
                              onChange={(e) => {
                                if (patient.admission_id) {
                                  const selected = e.target.value as KanbanStage;
                                  if (selected === 'Discharged') {
                                    onOpenDischargeForPatient(patient);
                                  } else {
                                    handleStageChange(patient.admission_id, selected);
                                  }
                                }
                              }}
                              aria-label={`Ubah fasa pesakit ${patient.full_name}`}
                              className="px-1.5 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-medium cursor-pointer"
                            >
                              {STAGES.map((s) => (
                                <option key={s.id} value={s.id}>
                                  ➔ {s.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
