import React, { useEffect, useState } from 'react';
import {
  X,
  User,
  Clock,
  Heart,
  Calendar,
  AlertTriangle,
  ClipboardList,
  LogOut,
  MapPin,
  FileText,
  Activity,
  Phone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Patient, Admission, MonitoringRecord, DischargeRecord } from '../types/index.js';
import { apiGetPatientDetails } from '../lib/api.js';

interface PatientDetailModalProps {
  patientId: string | null;
  onClose: () => void;
  onOpenMonitoring: (patient: Patient) => void;
  onOpenDischarge: (patient: Patient) => void;
}

function formatSafeDateTime(timestamp?: string | null) {
  if (!timestamp) return '-';
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return String(timestamp);
    return d.toLocaleString('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return String(timestamp);
  }
}

export const PatientDetailModal: React.FC<PatientDetailModalProps> = ({
  patientId,
  onClose,
  onOpenMonitoring,
  onOpenDischarge,
}) => {
  const [data, setData] = useState<{
    patient: Patient;
    admissions: Admission[];
    monitoring: MonitoringRecord[];
    discharge?: DischargeRecord;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    apiGetPatientDetails(patientId)
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => setError(err.message || 'Failed to load resident details.'))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (!patientId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-emerald-950/10 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col my-auto overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-[#F8FAF8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0B3B2C] text-[#C5E875] flex items-center justify-center">
              <User className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  {data?.patient ? data.patient.full_name : 'Resident Profile'}
                </h2>
                {data?.patient && (
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#EAF5DC] text-[#0B3B2C]">
                    {data.patient.mrn}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {data?.patient ? `${data.patient.zone} • ${data.patient.room_bed || 'No Bed Assigned'}` : 'Loading...'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6 text-xs">
          {loading && (
            <div className="py-16 text-center text-slate-500">
              <Activity className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
              <span>Loading resident clinical information...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
              {error}
            </div>
          )}

          {data && !loading && (
            <>
              {/* Clinical Card Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 text-[11px]">Age & Gender</span>
                  <div className="font-bold text-slate-800 text-xs mt-0.5">
                    {data.patient.age} years ({data.patient.gender === 'Male' ? 'Male' : 'Female'})
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 text-[11px]">Care Level (Dependency)</span>
                  <div className="font-bold text-slate-800 text-xs mt-0.5">
                    {data.patient.care_level}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 text-[11px]">Lifecycle Status</span>
                  <div className="mt-0.5">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        data.patient.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {data.patient.status}
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-3 pt-2 border-t border-slate-200">
                  <span className="text-slate-500 text-[11px]">Primary Diagnosis:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {data.patient.primary_diagnosis}
                  </div>
                </div>

                {data.patient.prescribed_medications && (
                  <div className="sm:col-span-3 pt-2 border-t border-slate-200">
                    <span className="text-slate-500 text-[11px]">Prescribed Scheduled Medications:</span>
                    <div className="text-slate-700 font-mono text-[11px] whitespace-pre-line mt-0.5 bg-white p-2 rounded border border-slate-200">
                      {data.patient.prescribed_medications}
                    </div>
                  </div>
                )}

                {data.patient.follow_up_facility && (
                  <div className="sm:col-span-3 pt-2 border-t border-slate-200 flex items-center gap-1.5 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-teal-600" />
                    <span>Follow-up Facility (TCA): <strong>{data.patient.follow_up_facility}</strong></span>
                  </div>
                )}

                {data.patient.emergency_contact_name && (
                  <div className="sm:col-span-3 pt-2 border-t border-slate-200 flex items-center gap-2 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Emergency Contact: <strong>{data.patient.emergency_contact_name}</strong> ({data.patient.emergency_contact_phone || 'No phone number'})
                    </span>
                  </div>
                )}
              </div>

              {/* Discharge notice if discharged */}
              {data.discharge && (
                <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-300">
                  <div className="font-bold text-slate-900 flex items-center gap-2 mb-1">
                    <LogOut className="w-4 h-4 text-slate-700" />
                    Resident Has Been Discharged
                  </div>
                  <div className="text-slate-600 text-xs">
                    Date: <strong>{data.discharge.discharge_date}</strong> at <strong>{data.discharge.discharge_time}</strong> to <strong>{data.discharge.discharge_destination}</strong>.
                  </div>
                  {data.discharge.discharge_summary && (
                    <div className="mt-1 text-slate-500 italic">
                      "{data.discharge.discharge_summary}"
                    </div>
                  )}
                </div>
              )}

              {/* Chronological Monitoring History */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-700" />
                    Clinical Monitoring Timeline (DAPUD Log)
                  </h3>
                  <span className="text-slate-500 text-[11px]">
                    {data.monitoring.length} Saved Records
                  </span>
                </div>

                {data.monitoring.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 italic">
                    No monitoring records logged yet for this resident.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.monitoring.map((rec) => {
                      const isRed = rec.clinical_status === 'Red Alert';
                      return (
                        <div
                          key={rec.id}
                          className={`p-3.5 rounded-xl border ${
                            isRed ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${
                                  isRed ? 'bg-rose-600' : 'bg-emerald-500'
                                }`}
                              />
                              <span className="font-bold text-slate-900 text-xs">
                                {rec.shift}
                              </span>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-500 text-[11px] font-mono">
                                {formatSafeDateTime(rec.timestamp)}
                              </span>
                            </div>

                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isRed
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {rec.clinical_status}
                            </span>
                          </div>

                          {/* Vital Signs Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-mono text-xs">
                            <div>
                              <span className="text-slate-400 text-[10px] block">Blood Pressure:</span>
                              <strong className="text-slate-800">{rec.blood_pressure || '-'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] block">Pulse Rate:</span>
                              <strong className="text-slate-800">{rec.pulse_rate ? `${rec.pulse_rate} bpm` : '-'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] block">Temperature:</span>
                              <strong className="text-slate-800">{rec.temperature ? `${rec.temperature}°C` : '-'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] block">SpO2:</span>
                              <strong className="text-slate-800">{rec.spo2 ? `${rec.spo2}%` : '-'}</strong>
                            </div>
                          </div>

                          {/* Patient Condition & Diet Plan */}
                          <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-3 gap-2 bg-[#F8FAF8] p-2.5 rounded-xl border border-emerald-950/5 text-[11px]">
                            <div>
                              <span className="text-slate-400 text-[10px] block">General Condition:</span>
                              <strong className="text-slate-800">{rec.general_condition || 'Stable'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] block">Consciousness:</span>
                              <strong className="text-slate-800">{rec.consciousness || 'Alert'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] block">Mobility:</span>
                              <strong className="text-slate-800">{rec.mobility_status || 'Independent'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] block">Diet Plan:</span>
                              <strong className="text-emerald-900">{rec.diet_plan || 'Normal diet'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] block">Urine:</span>
                              <strong className="text-slate-800">{rec.urine_output || 'Normal'}{rec.urine_other ? ` (${rec.urine_other})` : ''}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] block">Bowel:</span>
                              <strong className="text-slate-800">{rec.bowel_movement ? 'Normal' : 'No bowel'}</strong>
                            </div>
                          </div>

                          {/* Tube info if present */}
                          {(rec.tube_has_ngt || rec.tube_has_cbd || rec.tube_type) && rec.tube_type !== 'None' && (
                            <div className="mt-2 p-2 rounded-xl bg-blue-50/60 border border-blue-200 text-blue-900 text-xs flex flex-wrap items-center gap-3">
                              <span className="font-bold">Resident Tubes:</span>
                              <span>{rec.tube_type}</span>
                              {rec.tube_material && <span>({rec.tube_material})</span>}
                              {rec.tube_size && <span>Size: {rec.tube_size}</span>}
                              {rec.tube_replacement_date && (
                                <span className="text-[11px] text-blue-700">
                                  Due Date: {rec.tube_replacement_date}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Patient Behavior Badges */}
                          {rec.patient_behavior && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Behavior:</span>
                              {rec.patient_behavior.split(', ').map((b, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200"
                                >
                                  {b}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Image Attachment (Luka dsb) */}
                          {rec.attachment_image && (
                            <div className="mt-2 flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-200">
                              <img
                                src={rec.attachment_image}
                                alt="Clinical attachment"
                                className="w-14 h-14 object-cover rounded-lg border border-slate-300"
                              />
                              <div className="text-xs">
                                <span className="font-bold text-slate-800 block">Clinical Observation Photo</span>
                                <span className="text-[11px] text-slate-500">Documented resident condition / wound</span>
                              </div>
                            </div>
                          )}

                          {/* Nurse Advice Column */}
                          {rec.nurse_advice && (
                            <div className="mt-2 p-2.5 rounded-xl bg-[#EAF5DC]/70 border border-[#0B3B2C]/20 text-[#0B3B2C] text-xs">
                              <div className="font-bold flex items-center gap-1.5 text-[11px] mb-0.5">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-800" />
                                Nurse Advice & Instructions:
                              </div>
                              <p className="leading-relaxed font-medium">{rec.nurse_advice}</p>
                            </div>
                          )}

                          {/* ADL & Nursing report note */}
                          <div className="mt-2 text-[11px] text-slate-600 flex flex-wrap items-center gap-3">
                            <span>Medication: <strong className={rec.medication_intake === 'REFUSE' ? 'text-rose-700' : 'text-slate-800'}>{rec.medication_intake}</strong></span>
                            <span>Bathing: <strong className="text-slate-800">{rec.hygiene_care}</strong></span>
                            <span>Dressing: <strong className="text-slate-800">{rec.wound_dressing}</strong></span>
                          </div>

                          {rec.nursing_report && (
                            <div className="mt-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 text-xs italic">
                              "{rec.nursing_report}"
                            </div>
                          )}

                          <div className="mt-2 text-right text-[10px] text-slate-400">
                            Logged by: <span className="font-semibold text-slate-600">{rec.staff_name}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 font-semibold text-slate-700 text-xs transition-colors"
          >
            Close
          </button>

          {data?.patient && data.patient.status === 'Active' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenMonitoring(data.patient);
                }}
                className="px-4 py-2.5 rounded-2xl bg-[#0B3B2C] hover:bg-[#07281E] text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <ClipboardList className="w-4 h-4 text-[#C5E875]" />
                <span>+ Record Vitals (DAPUD)</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenDischarge(data.patient);
                }}
                className="px-4 py-2.5 rounded-2xl border border-rose-300 hover:bg-rose-50 text-rose-700 font-semibold text-xs transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Discharge Resident</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
