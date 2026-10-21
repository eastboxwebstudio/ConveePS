import React, { useState } from 'react';
import { X, LogOut, Check, AlertCircle } from 'lucide-react';
import { Patient } from '../types/index.js';
import { apiDischargePatient } from '../lib/api.js';

interface DischargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patient: Patient | null;
}

export const DischargeModal: React.FC<DischargeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  patient,
}) => {
  const [destination, setDestination] = useState('Rumah (Jagaan Keluarga)');
  const [summary, setSummary] = useState('');
  const [contactNotified, setContactNotified] = useState(true);
  const [medsGiven, setMedsGiven] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !patient) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patient?.admission_id) {
      setError('Tiada rekod kemasukan aktif dijumpai untuk pesakit ini.');
      return;
    }

    try {
      setLoading(true);
      await apiDischargePatient(patient.admission_id, {
        discharge_destination: destination,
        discharge_summary: summary || 'Pesakit discaj dalam keadaan stabil mengikut prosedur fasiliti.',
        emergency_contact_notified: contactNotified,
        medications_given: medsGiven || patient.prescribed_medications || '',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal memproses discaj.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full flex flex-col my-auto">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-600 text-white">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Proses Pelepasan / Discaj Pesakit</h2>
              <p className="text-xs text-slate-500">Pelepasan rasmi daripada Convee Care Centre.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Patient summary pill */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-slate-800">{patient.mrn}</span>
                <span className="text-slate-400 mx-2">•</span>
                <span className="font-bold text-slate-900">{patient.full_name}</span>
              </div>
              <span className="text-slate-500 text-[11px] font-semibold">{patient.zone}</span>
            </div>
            <div className="text-slate-500 text-[11px] mt-1">
              Diagnosis: {patient.primary_diagnosis}
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Destinasi Discaj *</label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
            >
              <option value="Rumah (Jagaan Keluarga)">Rumah (Jagaan Keluarga)</option>
              <option value="Hospital Rujukan / Pakar">Hospital Rujukan / Pakar</option>
              <option value="Pusat Pemulihan / Jagaan Lain">Pusat Pemulihan / Jagaan Lain</option>
              <option value="Meninggal Dunia (BOD)">Meninggal Dunia</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Ringkasan Pelepasan & Keadaan Semasa</label>
            <textarea
              rows={3}
              placeholder="cth: Pesakit discaj dalam keadaan stabil, luka kering, ubat dibekalkan untuk 2 minggu."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-600 focus:outline-hidden"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Bekalan Ubat Yang Diserahkan</label>
            <input
              type="text"
              placeholder="cth: Amlodipine 10mg (14 hari), Aspirin 100mg (14 hari)"
              value={medsGiven}
              onChange={(e) => setMedsGiven(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-600 focus:outline-hidden"
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={contactNotified}
                onChange={(e) => setContactNotified(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 border-slate-300 focus:ring-teal-500"
              />
              <span className="font-medium">Waris / Penjaga telah dimaklumkan mengenai discaj ini.</span>
            </label>
          </div>

          {/* Footer actions */}
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
              className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors flex items-center gap-2 shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Memproses...' : 'Sahkan & Lengkapkan Discaj'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
