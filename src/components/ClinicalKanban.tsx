import React, { useState } from 'react';
import { Patient, KanbanStage } from '../types/index.js';
import { Clock } from 'lucide-react';

interface ClinicalKanbanProps {
  patients: Patient[];
  onSelectPatient: (patientId: string) => void;
  onUpdateStage: (admissionId: string, stage: KanbanStage) => Promise<void>;
  onOpenMonitoringForPatient: (patient: Patient) => void;
  onOpenDischargeForPatient: (patient: Patient) => void;
}

const STAGES: { id: KanbanStage; label: string }[] = [
  { id: 'New Admission', label: 'Kemasukan Baru' },
  { id: 'Hospitalisation', label: 'Wad / Jagaan' },
  { id: 'Red Alert', label: 'Red Alert' },
  { id: 'TCA', label: 'TCA (Susulan)' },
  { id: 'Home Leave', label: 'Cuti Rumah' },
  { id: 'Refuse Medication', label: 'Tolak Ubat' },
  { id: 'Discharged', label: 'Discaj' },
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
      {/* Kanban Header */}
      <div className="bg-white p-5 rounded-3xl border border-emerald-950/5 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Papan Kanban Klinikal (7 Fasa)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Fasa perjalanan pesakit merangkumi amaran klinikal Red Alert dan susulan hospital.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#EAF5DC] text-[#0B3B2C]">
            7 Peringkat Aliran
          </span>
        </div>
      </div>

      {/* Horizontal Scroll Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[550px]">
        {STAGES.map((stage) => {
          const stagePatients = patients.filter(
            (p) => (p.kanban_stage || 'New Admission') === stage.id
          );

          const isAlertColumn = stage.id === 'Red Alert';

          return (
            <div
              key={stage.id}
              className={`w-72 shrink-0 rounded-3xl border flex flex-col max-h-[750px] transition-colors shadow-2xs ${
                isAlertColumn
                  ? 'bg-rose-50/50 border-rose-200'
                  : 'bg-white/80 border-emerald-950/5'
              }`}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 tracking-tight">
                  {stage.label}
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#F4F8F4] text-[#0B3B2C] tabular-nums">
                  {stagePatients.length}
                </span>
              </div>

              {/* Cards list */}
              <div className="p-3 space-y-3 overflow-y-auto flex-1">
                {stagePatients.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Tiada pesakit
                  </div>
                ) : (
                  stagePatients.map((patient) => {
                    const isRed = patient.latest_clinical_status === 'Red Alert' || stage.id === 'Red Alert';
                    return (
                      <div
                        key={patient.id}
                        className={`p-3.5 bg-white rounded-2xl border transition-all shadow-2xs ${
                          isRed
                            ? 'border-rose-300 ring-2 ring-rose-100'
                            : 'border-emerald-950/5 hover:border-emerald-200'
                        }`}
                      >
                        {/* Header: MRN & Location */}
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-mono text-[11px] font-bold text-slate-400">
                            {patient.mrn}
                          </span>
                          <span className="text-[11px] font-semibold text-[#0B3B2C] bg-[#EAF5DC] px-2 py-0.5 rounded-md">
                            {patient.room_bed || patient.zone}
                          </span>
                        </div>

                        {/* Patient Name */}
                        <div
                          onClick={() => onSelectPatient(patient.id)}
                          className="font-bold text-xs text-slate-900 hover:text-[#0B3B2C] cursor-pointer transition-colors leading-snug mt-1"
                        >
                          {patient.full_name}
                        </div>

                        {/* Unboxed Metadata */}
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                          <span>{patient.age} thn</span>
                          <span className="text-slate-300">·</span>
                          <span>{patient.gender === 'Male' ? 'Lelaki' : 'Perempuan'}</span>
                        </div>

                        {/* Primary Diagnosis */}
                        <div className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed bg-[#F8FAF8] p-2 rounded-xl">
                          {patient.primary_diagnosis}
                        </div>

                        {/* Vitals Row */}
                        {(patient.latest_bp || patient.latest_temp) && (
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-600">
                            <span>BP {patient.latest_bp || '-'}</span>
                            <span>{patient.latest_temp ? `${patient.latest_temp}°C` : '-'}</span>
                            <span>{patient.latest_spo2 ? `SpO2 ${patient.latest_spo2}%` : '-'}</span>
                          </div>
                        )}

                        {/* Footer & Actions */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {patient.length_of_stay !== undefined ? `${patient.length_of_stay} hari` : 'Hari 1'}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onOpenMonitoringForPatient(patient)}
                              className="px-2 py-1 rounded-xl text-[11px] font-semibold text-slate-700 hover:text-[#0B3B2C] hover:bg-[#EAF5DC] transition-colors"
                            >
                              Catat
                            </button>

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
                              className="px-2 py-1 rounded-xl border border-slate-200 bg-[#F8FAF8] text-slate-700 text-[10px] font-bold cursor-pointer focus:outline-hidden"
                            >
                              {STAGES.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.label}
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
