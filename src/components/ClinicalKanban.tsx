import React, { useState } from 'react';
import { Patient, KanbanStage } from '../types/index.js';
import {
  Clock,
  BellRing,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  Hospital,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { apiUpdateTcaSchedule } from '../lib/api.js';

interface ClinicalKanbanProps {
  patients: Patient[];
  onSelectPatient: (patientId: string) => void;
  onUpdateStage: (admissionId: string, stage: KanbanStage) => Promise<void>;
  onOpenMonitoringForPatient: (patient: Patient) => void;
  onOpenDischargeForPatient: (patient: Patient) => void;
  onRefresh?: () => void;
}

const STAGES: { id: KanbanStage; label: string }[] = [
  { id: 'New Admission', label: 'New Admission' },
  { id: 'Hospitalisation', label: 'Ward / Inpatient' },
  { id: 'Red Alert', label: 'Red Alert' },
  { id: 'TCA', label: 'TCA (Hospital Follow-Up)' },
  { id: 'Home Leave', label: 'Home Leave' },
  { id: 'Refuse Medication', label: 'Refused Medication' },
  { id: 'Discharged', label: 'Discharged' },
];

export const ClinicalKanban: React.FC<ClinicalKanbanProps> = ({
  patients,
  onSelectPatient,
  onUpdateStage,
  onOpenMonitoringForPatient,
  onOpenDischargeForPatient,
  onRefresh,
}) => {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // TCA Modal State
  const [tcaModalPatient, setTcaModalPatient] = useState<Patient | null>(null);
  const [tcaDateInput, setTcaDateInput] = useState('');
  const [tcaLocationInput, setTcaLocationInput] = useState('');
  const [tcaRemarksInput, setTcaRemarksInput] = useState('');
  const [tcaSaving, setTcaSaving] = useState(false);
  const [tcaError, setTcaError] = useState<string | null>(null);

  async function handleStageChange(admissionId: string, newStage: KanbanStage) {
    try {
      setUpdatingId(admissionId);
      await onUpdateStage(admissionId, newStage);
    } finally {
      setUpdatingId(null);
    }
  }

  // Calculate Dates for TCA alerts
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Patients with TCA alerts (Tomorrow or Today or overdue)
  const tcaAlerts = patients
    .filter((p) => p.tca_date || p.kanban_stage === 'TCA')
    .map((p) => {
      let alertLevel: 'tomorrow' | 'today' | 'overdue' | 'upcoming' | null = null;
      let daysDiff: number | null = null;

      if (p.tca_date) {
        const pDate = new Date(p.tca_date + 'T00:00:00');
        const currDate = new Date(todayStr + 'T00:00:00');
        const diffMs = pDate.getTime() - currDate.getTime();
        daysDiff = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (p.tca_date === tomorrowStr || daysDiff === 1) {
          alertLevel = 'tomorrow'; // Sehari awal (1 day ahead alert)
        } else if (p.tca_date === todayStr || daysDiff === 0) {
          alertLevel = 'today';
        } else if (daysDiff < 0) {
          alertLevel = 'overdue';
        } else if (daysDiff <= 3) {
          alertLevel = 'upcoming';
        }
      } else if (p.kanban_stage === 'TCA') {
        alertLevel = 'upcoming'; // in TCA column but no date yet
      }

      return {
        patient: p,
        alertLevel,
        daysDiff,
      };
    })
    .filter((item) => item.alertLevel !== null);

  // Group alerts
  const tomorrowAlerts = tcaAlerts.filter((a) => a.alertLevel === 'tomorrow');
  const todayAlerts = tcaAlerts.filter((a) => a.alertLevel === 'today');
  const otherTcaAlerts = tcaAlerts.filter((a) => a.alertLevel !== 'tomorrow' && a.alertLevel !== 'today');

  function openTcaModal(p: Patient) {
    setTcaModalPatient(p);
    setTcaDateInput(p.tca_date || tomorrowStr);
    setTcaLocationInput(p.tca_location || p.follow_up_facility || 'Hospital Selayang');
    setTcaRemarksInput(p.tca_remarks || 'Prepare DAPUD records, latest vital signs summary & medication supply.');
    setTcaError(null);
  }

  async function handleSaveTca(e: React.FormEvent) {
    e.preventDefault();
    if (!tcaModalPatient || !tcaModalPatient.admission_id) {
      setTcaError('Invalid resident admission record.');
      return;
    }

    if (!tcaDateInput) {
      setTcaError('Please select a TCA appointment date.');
      return;
    }

    try {
      setTcaSaving(true);
      setTcaError(null);

      await apiUpdateTcaSchedule(tcaModalPatient.admission_id, {
        tca_date: tcaDateInput,
        tca_location: tcaLocationInput.trim(),
        tca_remarks: tcaRemarksInput.trim(),
        set_stage_tca: true,
      });

      if (onRefresh) {
        onRefresh();
      } else {
        await onUpdateStage(tcaModalPatient.admission_id, 'TCA');
      }

      setTcaModalPatient(null);
    } catch (err: any) {
      setTcaError(err.message || 'Failed to save TCA appointment details.');
    } finally {
      setTcaSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 1-DAY AHEAD TCA ALERT BANNER */}
      {tomorrowAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-4 text-white shadow-lg border border-amber-400/40">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
                <BellRing className="w-5 h-5 text-white animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm uppercase tracking-wider bg-white text-orange-700 px-2.5 py-0.5 rounded-full shadow-2xs text-[10px]">
                    🚨 TCA ALERT: APPOINTMENT TOMORROW (1 DAY LEFT)
                  </span>
                  <span className="text-xs font-semibold text-amber-100">
                    {tomorrowAlerts.length} Resident(s) Require Preparation
                  </span>
                </div>
                <p className="text-xs text-amber-50 mt-1 leading-relaxed">
                  Please notify the duty nurse shift to prepare referral documents, DAPUD logs, medication files, and hospital transport:
                </p>

                <div className="mt-2.5 flex flex-wrap gap-2">
                  {tomorrowAlerts.map(({ patient }) => (
                    <div
                      key={patient.id}
                      onClick={() => onSelectPatient(patient.id)}
                      className="bg-white/95 hover:bg-white text-slate-900 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-transform hover:scale-102"
                    >
                      <Hospital className="w-3.5 h-3.5 text-orange-600" />
                      <span>{patient.full_name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({patient.room_bed || patient.mrn})</span>
                      <span className="bg-orange-100 text-orange-800 px-1.5 py-0.2 rounded text-[10px] font-bold">
                        {patient.tca_location || 'Hospital'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TODAY'S TCA ALERT (If any) */}
      {todayAlerts.length > 0 && (
        <div className="bg-rose-600 rounded-3xl p-4 text-white shadow-lg border border-rose-400">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[10px] uppercase tracking-wider bg-white text-rose-700 px-2 py-0.5 rounded-full">
                  🔴 TODAY'S TCA APPOINTMENT
                </span>
                <span className="text-xs text-rose-100 font-semibold">
                  Immediate Action Required
                </span>
              </div>
              <p className="text-xs text-rose-100 mt-1">
                The following resident(s) have hospital/clinic appointments scheduled for today:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {todayAlerts.map(({ patient }) => (
                  <button
                    key={patient.id}
                    onClick={() => onSelectPatient(patient.id)}
                    className="bg-white text-rose-900 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-rose-50"
                  >
                    <span>{patient.full_name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({patient.room_bed})</span>
                    <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold">
                      {patient.tca_location || 'Hospital'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Header */}
      <div className="bg-white p-5 rounded-3xl border border-emerald-950/5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Clinical Kanban Board (7 Stages)
            {tomorrowAlerts.length > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1 border border-amber-200">
                <BellRing className="w-3 h-3 text-amber-700" />
                {tomorrowAlerts.length} TCA Tomorrow
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Care journey tracking including Red Alert emergencies and hospital follow-up (TCA) scheduling.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#EAF5DC] text-[#0B3B2C]">
            7 Flow Stages
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
          const isTcaColumn = stage.id === 'TCA';

          return (
            <div
              key={stage.id}
              className={`w-72 shrink-0 rounded-3xl border flex flex-col max-h-[750px] transition-colors shadow-2xs ${
                isAlertColumn
                  ? 'bg-rose-50/50 border-rose-200'
                  : isTcaColumn
                  ? 'bg-amber-50/40 border-amber-200'
                  : 'bg-white/80 border-emerald-950/5'
              }`}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {isTcaColumn && <BellRing className="w-3.5 h-3.5 text-amber-700" />}
                  <span className="text-xs font-bold text-slate-900 tracking-tight">
                    {stage.label}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#F4F8F4] text-[#0B3B2C] tabular-nums">
                  {stagePatients.length}
                </span>
              </div>

              {/* Cards list */}
              <div className="p-3 space-y-3 overflow-y-auto flex-1">
                {stagePatients.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No residents
                  </div>
                ) : (
                  stagePatients.map((patient) => {
                    const isRed = patient.latest_clinical_status === 'Red Alert' || stage.id === 'Red Alert';
                    const isTcaTomorrow = patient.tca_date === tomorrowStr;
                    const isTcaToday = patient.tca_date === todayStr;

                    return (
                      <div
                        key={patient.id}
                        className={`p-3.5 bg-white rounded-2xl border transition-all shadow-2xs ${
                          isTcaTomorrow
                            ? 'border-amber-400 ring-2 ring-amber-200 bg-amber-50/20'
                            : isTcaToday
                            ? 'border-rose-400 ring-2 ring-rose-200 bg-rose-50/20'
                            : isRed
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
                            {patient.room_bed || (patient.zone === 'Zon Lelaki' ? 'Male Ward' : patient.zone === 'Zon Perempuan' ? 'Female Ward' : patient.zone)}
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
                          <span>{patient.age} yrs</span>
                          <span className="text-slate-300">·</span>
                          <span>{patient.gender === 'Male' || (patient.gender as string) === 'Lelaki' ? 'Male' : 'Female'}</span>
                        </div>

                        {/* Primary Diagnosis */}
                        <div className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed bg-[#F8FAF8] p-2 rounded-xl">
                          {patient.primary_diagnosis}
                        </div>

                        {/* TCA Schedule Badge if scheduled or stage is TCA */}
                        {(patient.tca_date || stage.id === 'TCA') && (
                          <div
                            className={`mt-2 p-2 rounded-xl border text-[11px] flex items-start gap-1.5 ${
                              isTcaTomorrow
                                ? 'bg-amber-100/90 border-amber-300 text-amber-900 font-semibold'
                                : isTcaToday
                                ? 'bg-rose-100 border-rose-300 text-rose-900 font-semibold'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold">
                                  {isTcaTomorrow
                                    ? '🔔 TCA TOMORROW (1 DAY)!'
                                    : isTcaToday
                                    ? '🚨 TCA TODAY!'
                                    : 'TCA Appointment:'}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openTcaModal(patient);
                                  }}
                                  className="text-[10px] text-amber-800 hover:underline font-bold"
                                >
                                  Edit
                                </button>
                              </div>
                              <div className="font-mono text-[10px] mt-0.5">
                                {patient.tca_date ? patient.tca_date : 'Date not set'}
                              </div>
                              <div className="text-[10px] text-slate-600 line-clamp-1">
                                {patient.tca_location || patient.follow_up_facility || 'Facility not specified'}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Vitals Row */}
                        {(patient.latest_bp || patient.latest_temp) && (
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-600">
                            <span>BP {patient.latest_bp || '-'}</span>
                            <span>{patient.latest_temp ? `${patient.latest_temp}°C` : '-'}</span>
                            <span>{patient.latest_spo2 ? `SpO2 ${patient.latest_spo2}%` : '-'}</span>
                          </div>
                        )}

                        {/* Latest Diet Plan & Nurse Advice Badge */}
                        {patient.latest_nurse_advice && (
                          <div className="mt-2 p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-900 line-clamp-1">
                            <span className="font-bold">Advice: </span>
                            {patient.latest_nurse_advice}
                          </div>
                        )}

                        {/* Footer & Actions */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {patient.length_of_stay !== undefined ? `${patient.length_of_stay} days` : 'Day 1'}
                          </span>

                          <div className="flex items-center gap-1">
                            {stage.id === 'TCA' && (
                              <button
                                type="button"
                                onClick={() => openTcaModal(patient)}
                                className="px-2 py-1 rounded-xl text-[10px] font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 transition-colors"
                                title="Update TCA schedule"
                              >
                                📅 TCA
                              </button>
                            )}

                            <button
                              onClick={() => onOpenMonitoringForPatient(patient)}
                              className="px-2 py-1 rounded-xl text-[11px] font-semibold text-slate-700 hover:text-[#0B3B2C] hover:bg-[#EAF5DC] transition-colors"
                            >
                              Log
                            </button>

                            <select
                              value={patient.kanban_stage || stage.id}
                              disabled={updatingId === patient.admission_id}
                              onChange={(e) => {
                                if (patient.admission_id) {
                                  const selected = e.target.value as KanbanStage;
                                  if (selected === 'Discharged') {
                                    onOpenDischargeForPatient(patient);
                                  } else if (selected === 'TCA') {
                                    openTcaModal(patient);
                                  } else {
                                    handleStageChange(patient.admission_id, selected);
                                  }
                                }
                              }}
                              aria-label={`Change stage for ${patient.full_name}`}
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

      {/* TCA SCHEDULE & NOTIFICATION MODAL */}
      {tcaModalPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-emerald-950/10 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Schedule Hospital TCA Appointment</h3>
                  <p className="text-[11px] text-slate-500">1-day ahead notification alert will be triggered automatically.</p>
                </div>
              </div>
              <button
                onClick={() => setTcaModalPatient(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {tcaError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {tcaError}
              </div>
            )}

            <form onSubmit={handleSaveTca} className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900">{tcaModalPatient.full_name}</span>
                <span className="text-slate-500 block text-[11px] font-mono">
                  {tcaModalPatient.mrn} · {tcaModalPatient.room_bed || (tcaModalPatient.zone === 'Zon Lelaki' ? 'Male Ward' : 'Female Ward')}
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">TCA Appointment Date *</label>
                <input
                  type="date"
                  required
                  value={tcaDateInput}
                  onChange={(e) => setTcaDateInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Hospital / Referral Facility *</label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {['Hospital Selayang', 'HKL', 'HUKM', 'Hospital Ampang', 'Health Clinic (KK)'].map((hosp) => (
                    <button
                      type="button"
                      key={hosp}
                      onClick={() => setTcaLocationInput(hosp)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                        tcaLocationInput === hosp
                          ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {hosp}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="e.g. Hospital Selayang (Geriatric Specialist Clinic)"
                  required
                  value={tcaLocationInput}
                  onChange={(e) => setTcaLocationInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Appointment Preparation Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Prepare vital signs log, current medication packs, bring referral letter..."
                  value={tcaRemarksInput}
                  onChange={(e) => setTcaRemarksInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                <BellRing className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                <span>
                  The system will display an alert banner 1 day prior to the TCA date at the top of the Kanban to ensure staff do not miss it.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTcaModalPatient(null)}
                  disabled={tcaSaving}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={tcaSaving}
                  className="px-4 py-2 rounded-xl bg-[#0B3B2C] text-white hover:bg-[#07281E] font-bold transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#C5E875]" />
                  <span>{tcaSaving ? 'Saving...' : 'Save & Activate TCA Stage'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
