import React, { useState, useEffect } from 'react';
import { X, ClipboardList, Check, AlertTriangle, HeartPulse } from 'lucide-react';
import { Patient, ShiftType, ClinicalStatus } from '../types/index.js';
import { apiCreateMonitoring } from '../lib/api.js';

interface MonitoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patients: Patient[];
  selectedPatient: Patient | null;
}

export const MonitoringModal: React.FC<MonitoringModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  patients,
  selectedPatient,
}) => {
  const [patientId, setPatientId] = useState<string>('');
  const [shift, setShift] = useState<ShiftType>('AM (7:00-5:00)');
  const [clinicalStatus, setClinicalStatus] = useState<ClinicalStatus>('Stable');

  // Vitals
  const [bp, setBp] = useState('120/80');
  const [pulse, setPulse] = useState<number | ''>(76);
  const [temp, setTemp] = useState<number | ''>(36.6);
  const [spo2, setSpo2] = useState<number | ''>(98);
  const [bloodSugar, setBloodSugar] = useState('5.6');
  const [painLevel, setPainLevel] = useState(0);

  // Conditions
  const [consciousness, setConsciousness] = useState('ALERT');
  const [generalCondition, setGeneralCondition] = useState('STABLE');
  const [mobility, setMobility] = useState('ABLE TO AMBULATE');
  const [appetite, setAppetite] = useState<'GOOD' | 'FAIR' | 'POOR'>('GOOD');
  const [urine, setUrine] = useState('NORMAL');
  const [bowel, setBowel] = useState(1);

  // ADL & Care
  const [medication, setMedication] = useState<'SERVED' | 'REFUSE' | 'WITHHELD'>('SERVED');
  const [hygiene, setHygiene] = useState('Normal shower');
  const [feeding, setFeeding] = useState('DONE');
  const [wound, setWound] = useState('N/A');
  const [repositioning, setRepositioning] = useState('N/A');
  const [mobilisation, setMobilisation] = useState('1');
  const [nursingReport, setNursingReport] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto set active shift
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 17 && hour < 21) {
      setShift('PM (5:00-9:00)');
    } else if (hour >= 21 || hour < 7) {
      setShift('Night (9:00pm-7:00am)');
    } else {
      setShift('AM (7:00-5:00)');
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedPatient) {
      setPatientId(selectedPatient.id);
    } else if (patients.length > 0 && !patientId) {
      setPatientId(patients[0].id);
    }
  }, [selectedPatient, patients]);

  // Auto trigger Red Alert detection based on vital entries
  useEffect(() => {
    const t = Number(temp);
    const s = Number(spo2);
    const p = Number(pulse);
    if ((t && t >= 38.0) || (s && s < 92) || (p && (p > 120 || p < 50))) {
      setClinicalStatus('Red Alert');
    }
  }, [temp, spo2, pulse]);

  if (!isOpen) return null;

  const isVitalShift = shift.startsWith('AM') || shift.startsWith('Night');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!patientId) {
      setError('Sila pilih pesakit.');
      return;
    }

    if (isVitalShift && (!bp || !pulse || !temp || !spo2)) {
      setError('Bagi syif AM dan Night, pemeriksaan tanda vital (BP, Nadi, Suhu, SpO2) adalah wajib.');
      return;
    }

    try {
      setLoading(true);
      await apiCreateMonitoring({
        patient_id: patientId,
        shift,
        clinical_status: clinicalStatus,
        blood_pressure: bp || null,
        pulse_rate: pulse ? Number(pulse) : null,
        temperature: temp ? Number(temp) : null,
        spo2: spo2 ? Number(spo2) : null,
        blood_sugar: bloodSugar || '-',
        pain_level: Number(painLevel),
        consciousness,
        general_condition: generalCondition,
        mobility_status: mobility,
        appetite,
        urine_output: urine,
        bowel_movement: Number(bowel),
        medication_intake: medication,
        hygiene_care: hygiene,
        feeding_care: feeding,
        wound_dressing: wound,
        repositioning,
        mobilisation,
        nursing_report: nursingReport || null,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan rekod pemantauan.');
    } finally {
      setLoading(false);
    }
  }

  const activePatientObj = patients.find((p) => p.id === patientId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-700 text-white">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Catatan Pemantauan Syif (DAPUD)</h2>
              <p className="text-xs text-slate-500">
                Pemeriksaan tanda vital 2x sehari (Syif AM & Night).
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Patient & Shift selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Pilih Pesakit *</label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.mrn} — {p.full_name} ({p.room_bed || p.zone})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Syif Bertugas *</label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as ShiftType)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium"
              >
                <option value="AM (7:00-5:00)">AM (7:00am - 5:00pm) [Vital Sign Wajib]</option>
                <option value="PM (5:00-9:00)">PM (5:00pm - 9:00pm) [Jagaan & Ubat]</option>
                <option value="Night (9:00pm-7:00am)">Night (9:00pm - 7:00am) [Vital Sign Wajib]</option>
              </select>
            </div>
          </div>

          {/* Vitals Section */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-rose-600" />
                Tanda-tanda Vital (Vital Signs)
              </span>
              {isVitalShift && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                  Wajib 2x Sehari (AM & Night)
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Tekanan Darah (BP)</label>
                <input
                  type="text"
                  placeholder="120/80"
                  value={bp}
                  onChange={(e) => setBp(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Kadar Nadi (bpm)</label>
                <input
                  type="number"
                  placeholder="76"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Suhu (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="36.8"
                  value={temp}
                  onChange={(e) => setTemp(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">SpO2 (%)</label>
                <input
                  type="number"
                  placeholder="98"
                  value={spo2}
                  onChange={(e) => setSpo2(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Glukosa Darah (mmol/L)</label>
                <input
                  type="text"
                  placeholder="5.6 atau -"
                  value={bloodSugar}
                  onChange={(e) => setBloodSugar(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Skala Sakit (0-10)</label>
                <select
                  value={painLevel}
                  onChange={(e) => setPainLevel(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value={0}>0 — Tiada Sakit (No Pain)</option>
                  <option value={1}>1 — Sakit Ringan</option>
                  <option value={2}>2 — Sakit Ringan</option>
                  <option value={3}>3 — Sakit Sederhana</option>
                  <option value={4}>4 — Sakit Mengganggu</option>
                  <option value={5}>5 — Sakit Kuat</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Status Klinikal</label>
                <select
                  value={clinicalStatus}
                  onChange={(e) => setClinicalStatus(e.target.value as ClinicalStatus)}
                  className={`w-full px-3 py-2 rounded-lg border font-bold ${
                    clinicalStatus === 'Red Alert'
                      ? 'border-rose-400 bg-rose-50 text-rose-700'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  }`}
                >
                  <option value="Stable">Stable (Stabil)</option>
                  <option value="Red Alert">Red Alert (Perhatian Rapi)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Status Jagaan & ADL */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Pengambilan Ubat</label>
              <select
                value={medication}
                onChange={(e) => setMedication(e.target.value as any)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  medication === 'REFUSE' ? 'border-rose-300 bg-rose-50 text-rose-700 font-bold' : 'border-slate-200 bg-white'
                }`}
              >
                <option value="SERVED">SERVED (Telah Diberi)</option>
                <option value="REFUSE">REFUSE (Menolak Ubat)</option>
                <option value="WITHHELD">WITHHELD (Ditangguhkan)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Selera Makan</label>
              <select
                value={appetite}
                onChange={(e) => setAppetite(e.target.value as any)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  appetite === 'POOR' ? 'border-amber-300 bg-amber-50 text-amber-700 font-bold' : 'border-slate-200 bg-white'
                }`}
              >
                <option value="GOOD">GOOD (Baik)</option>
                <option value="FAIR">FAIR (Sederhana)</option>
                <option value="POOR">POOR (Kurang / Tidak Makan)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Kebersihan Diri / Mandi</label>
              <select
                value={hygiene}
                onChange={(e) => setHygiene(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
              >
                <option value="Normal shower">Mandi Biasa (Shower)</option>
                <option value="Sponging and bed bath">Lap Badan di Katil (Sponging)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Rawatan Luka / Dressing</label>
              <select
                value={wound}
                onChange={(e) => setWound(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
              >
                <option value="N/A">N/A (Tiada Luka)</option>
                <option value="DONE">DONE (Selesai Dibalut)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Ubah Posisi Katil (Reposition)</label>
              <select
                value={repositioning}
                onChange={(e) => setRepositioning(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
              >
                <option value="DONE">DONE (Selesai Diubah)</option>
                <option value="N/A">N/A</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Mobilisasi / Pergerakan</label>
              <select
                value={mobilisation}
                onChange={(e) => setMobilisation(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
              >
                <option value="1">1 (Ada Latihan Gerak)</option>
                <option value="0">0 (Rehat Sepenuhnya)</option>
              </select>
            </div>
          </div>

          {/* Nursing Report Notes */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Laporan Kejururawatan (Nursing Handover Notes)</label>
            <textarea
              rows={3}
              placeholder="Catatan perkembangan pesakit, aduan sakit, tindak balas ubat, dsb..."
              value={nursingReport}
              onChange={(e) => setNursingReport(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-600 focus:outline-hidden"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 font-semibold text-slate-700 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold transition-colors flex items-center gap-2 shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Menyimpan...' : 'Simpan Rekod Syif'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
