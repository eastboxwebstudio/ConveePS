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
      setError('No active admission record found for this resident.');
      return;
    }

    try {
      setLoading(true);
      await apiDischargePatient(patient.admission_id, {
        discharge_destination: destination,
        discharge_summary: summary || 'Resident discharged in stable condition in accordance with facility protocols.',
        emergency_contact_notified: contactNotified,
        medications_given: medsGiven || patient.prescribed_medications || '',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process discharge.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-emerald-950/10 shadow-2xl max-w-lg w-full flex flex-col my-auto overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-[#F8FAF8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <LogOut className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Resident Discharge Process</h2>
              <p className="text-xs text-slate-500 mt-0.5">Official discharge from Convee Care Centre.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Patient summary pill */}
          <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-emerald-950/5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-slate-700">{patient.mrn}</span>
                <span className="text-slate-300 mx-2">•</span>
                <span className="font-bold text-slate-900">{patient.full_name}</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#EAF5DC] text-[#0B3B2C]">
                {patient.zone === 'Zon Lelaki' ? 'Male Ward' : patient.zone === 'Zon Perempuan' ? 'Female Ward' : patient.zone}
              </span>
            </div>
            <div className="text-slate-500 text-[11px] mt-1.5">
              Diagnosis: {patient.primary_diagnosis}
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">Discharge Destination *</label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-emerald-950/10 bg-[#F8FAF8] text-slate-800 font-semibold focus:outline-hidden"
            >
              <option value="Home (Family Care)">Home (Family Care)</option>
              <option value="Hospital / Specialist Referral">Hospital / Specialist Referral</option>
              <option value="Rehabilitation / Other Care Center">Rehabilitation / Other Care Center</option>
              <option value="Deceased (BOD)">Deceased</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">Discharge Summary & Current Condition</label>
            <textarea
              rows={3}
              placeholder="e.g. Resident discharged in stable condition, wound dry, medications provided for 2 weeks."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-emerald-950/10 focus:ring-1 focus:ring-[#0B3B2C] focus:outline-hidden bg-[#F8FAF8]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">Supplied Take-Home Medications</label>
            <input
              type="text"
              placeholder="e.g. Amlodipine 10mg (14 days), Aspirin 100mg (14 days)"
              value={medsGiven}
              onChange={(e) => setMedsGiven(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-emerald-950/10 focus:ring-1 focus:ring-[#0B3B2C] focus:outline-hidden bg-[#F8FAF8]"
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={contactNotified}
                onChange={(e) => setContactNotified(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-800 border-slate-300 focus:ring-emerald-700"
              />
              <span className="font-medium text-xs">Next of Kin / Primary Caregiver has been notified of this discharge.</span>
            </label>
          </div>

          {/* Footer actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-100 font-semibold text-slate-700 transition-colors text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors flex items-center gap-2 shadow-xs text-xs"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Processing...' : 'Confirm & Complete Discharge'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
