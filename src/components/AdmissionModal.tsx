import React, { useState } from 'react';
import { X, UserPlus, Check } from 'lucide-react';
import { ZoneType, CareLevel } from '../types/index.js';
import { apiCreatePatient } from '../lib/api.js';

interface AdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultZone?: ZoneType | '';
}

export const AdmissionModal: React.FC<AdmissionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultZone,
}) => {
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [age, setAge] = useState<number | ''>('');
  const [dob, setDob] = useState('');
  const [zone, setZone] = useState<ZoneType>(defaultZone === 'Zon Perempuan' ? 'Zon Perempuan' : 'Zon Lelaki');
  const [roomBed, setRoomBed] = useState('Katil L-01');
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState('');
  const [medications, setMedications] = useState('');
  const [followUpFacility, setFollowUpFacility] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [careLevel, setCareLevel] = useState<CareLevel>('Partial Assist');
  const [mobility, setBaselineMobility] = useState('Able to ambulate');
  const [feedingMethod, setFeedingMethod] = useState('Oral normal diet');
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [admissionTime, setAdmissionTime] = useState(
    new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !primaryDiagnosis.trim() || !age) {
      setError('Sila lengkapkan nama pesakit, umur, dan diagnosis utama.');
      return;
    }

    try {
      setLoading(true);
      await apiCreatePatient({
        full_name: fullName.trim(),
        gender,
        age: Number(age),
        date_of_birth: dob || null,
        zone,
        room_bed: roomBed,
        primary_diagnosis: primaryDiagnosis.trim(),
        prescribed_medications: medications || null,
        follow_up_facility: followUpFacility || null,
        emergency_contact_name: emergencyName || null,
        emergency_contact_phone: emergencyPhone || null,
        care_level: careLevel,
        baseline_mobility: mobility,
        feeding_method: feedingMethod,
        admission_date: admissionDate,
        admission_time: admissionTime,
        admission_remarks: remarks,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal mendaftar pesakit.');
    } finally {
      setLoading(false);
    }
  }

  // Auto-switch bed prefix when zone changes
  function handleZoneChange(newZone: ZoneType) {
    setZone(newZone);
    if (newZone === 'Zon Lelaki') {
      setGender('Male');
      if (roomBed.startsWith('Katil P')) setRoomBed('Katil L-01');
    } else {
      setGender('Female');
      if (roomBed.startsWith('Katil L')) setRoomBed('Katil P-01');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-emerald-950/10 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col my-auto overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-[#F8FAF8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0B3B2C] text-[#C5E875] flex items-center justify-center">
              <UserPlus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Pendaftaran Kemasukan Pesakit Baru</h2>
              <p className="text-xs text-slate-500">Nombor MRN (cth: PT-007) akan dijana secara automatik.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors">
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

          {/* Section 1: Profil Asas & Zon */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="font-semibold text-slate-700">Nama Penuh Pesakit *</label>
              <input
                type="text"
                required
                placeholder="cth: Zainal bin Abidin"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-600 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Umur *</label>
              <input
                type="number"
                required
                min={1}
                max={120}
                placeholder="cth: 68"
                value={age}
                onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Zon Rawatan *</label>
              <select
                value={zone}
                onChange={(e) => handleZoneChange(e.target.value as ZoneType)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
              >
                <option value="Zon Lelaki">Zon Lelaki</option>
                <option value="Zon Perempuan">Zon Perempuan</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Nombor Katil / Bilik</label>
              <select
                value={roomBed}
                onChange={(e) => setRoomBed(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
              >
                {zone === 'Zon Lelaki' ? (
                  <>
                    {Array.from({ length: 15 }, (_, i) => {
                      const bedNum = String(i + 1).padStart(2, '0');
                      return (
                        <option key={`L-${bedNum}`} value={`Katil L-${bedNum}`}>
                          Katil L-{bedNum}
                        </option>
                      );
                    })}
                  </>
                ) : (
                  <>
                    {Array.from({ length: 15 }, (_, i) => {
                      const bedNum = String(i + 1).padStart(2, '0');
                      return (
                        <option key={`P-${bedNum}`} value={`Katil P-${bedNum}`}>
                          Katil P-{bedNum}
                        </option>
                      );
                    })}
                  </>
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Jantina</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
              >
                <option value="Male">Lelaki</option>
                <option value="Female">Perempuan</option>
              </select>
            </div>
          </div>

          {/* Section 2: Diagnosis & Perubatan */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Diagnosis Utama / Keadaan Penyakit *</label>
            <textarea
              required
              rows={2}
              placeholder="cth: Stroke Ischemic, Hipertensi, Diabetes Mellitus"
              value={primaryDiagnosis}
              onChange={(e) => setPrimaryDiagnosis(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-600 focus:outline-hidden"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Senarai Ubat Berjadual & Dos</label>
            <textarea
              rows={2}
              placeholder="cth: Amlodipine 10mg OD (Pagi), Simvastatin 20mg ON (Malam)"
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Fasiliti Temujanji Susulan (TCA)</label>
              <input
                type="text"
                placeholder="cth: Hospital Canselor Tuanku Muhriz (HUKM)"
                value={followUpFacility}
                onChange={(e) => setFollowUpFacility(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-600 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Tahap Kebergantungan (Care Level)</label>
              <select
                value={careLevel}
                onChange={(e) => setCareLevel(e.target.value as CareLevel)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
              >
                <option value="Independent">Independent (Berdikari)</option>
                <option value="Partial Assist">Partial Assist (Bantuan Separa)</option>
                <option value="Total Assist">Total Assist (Bantuan Penuh)</option>
              </select>
            </div>
          </div>

          {/* Section 3: Waris & Kemasukan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Nama Waris / Penjaga</label>
              <input
                type="text"
                placeholder="cth: Siti Sarah (Anak)"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-600 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">No. Telefon Waris</label>
              <input
                type="text"
                placeholder="cth: 012-3456789"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Tarikh Kemasukan (DOA)</label>
              <input
                type="date"
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Masa Kemasukan</label>
              <input
                type="time"
                value={admissionTime}
                onChange={(e) => setAdmissionTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-100 font-semibold text-slate-700 transition-colors text-xs"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-2xl bg-[#0B3B2C] hover:bg-[#07281E] text-white font-semibold transition-colors flex items-center gap-2 shadow-xs text-xs"
            >
              <Check className="w-4 h-4 text-[#C5E875]" />
              <span>{loading ? 'Mendaftar...' : 'Sahkan & Daftar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
