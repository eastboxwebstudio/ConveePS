import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ClipboardList,
  Check,
  AlertTriangle,
  HeartPulse,
  Camera,
  Image as ImageIcon,
  Trash2,
  Utensils,
  Activity,
  UserCheck,
  FileText,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  Patient,
  ShiftType,
  ClinicalStatus,
  PatientConditionGeneral,
  PatientConditionConsciousness,
  PatientConditionMobility,
  PatientConditionAppetite,
  PatientConditionUrine,
  PatientConditionBowel,
  PatientBehaviorCategory,
} from '../types/index.js';
import { apiCreateMonitoring, uploadImageToR2 } from '../lib/api.js';

interface MonitoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patients: Patient[];
  selectedPatient: Patient | null;
}

// 9 Specific behavior categories ticked in user reference document
const BEHAVIOR_OPTIONS: { id: PatientBehaviorCategory; label: string; desc: string }[] = [
  {
    id: 'Calm & Cooperative',
    label: 'Calm & Cooperative',
    desc: 'Tenang, mematuhi arahan, bekerjasama dengan jururawat/penjaga',
  },
  {
    id: 'Agitated / Restless',
    label: 'Agitated / Restless',
    desc: 'Gelisah, mundar-mandir, tidak boleh duduk diam',
  },
  {
    id: 'Verbal Aggression',
    label: 'Verbal Aggression',
    desc: 'Menjerit, memarahi staf, menggunakan perkataan kasar',
  },
  {
    id: 'Repetitive Behaviour',
    label: 'Repetitive Behaviour',
    desc: 'Mengulang soalan atau perbuatan yang sama berulang kali',
  },
  {
    id: 'Wandering',
    label: 'Wandering',
    desc: 'Berjalan tanpa hala tuju atau cuba keluar dari kawasan',
  },
  {
    id: 'Anxious / Fearful',
    label: 'Anxious / Fearful',
    desc: 'Kelihatan bimbang, ketakutan, kerap mencari kepastian',
  },
  {
    id: 'Confused / Disoriented',
    label: 'Confused / Disoriented',
    desc: 'Keliru, sukar mengenali orang, tempat atau masa',
  },
  {
    id: 'Attention-Seeking',
    label: 'Attention-Seeking',
    desc: 'Kerap memanggil staf atau meminta bantuan berulang kali',
  },
  {
    id: 'Emotionally Distressed',
    label: 'Emotionally Distressed',
    desc: 'Menangis, rasa sedih, perubahan mood yang mendadak',
  },
];

export const MonitoringModal: React.FC<MonitoringModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  patients,
  selectedPatient,
}) => {
  const [patientId, setPatientId] = useState<string>('');
  const [shift, setShift] = useState<ShiftType>('Morning (7:00am-5:00pm)');
  const [clinicalStatus, setClinicalStatus] = useState<ClinicalStatus>('Stable');

  // Vitals
  const [bp, setBp] = useState('120/80');
  const [pulse, setPulse] = useState<number | ''>(76);
  const [temp, setTemp] = useState<number | ''>(36.6);
  const [spo2, setSpo2] = useState<number | ''>(98);
  const [bloodSugar, setBloodSugar] = useState('5.6');
  const [painLevel, setPainLevel] = useState(0);

  // Patient Condition (As per Page 1 Form Table)
  const [generalCondition, setGeneralCondition] = useState<PatientConditionGeneral>('Stable');
  const [consciousness, setConsciousness] = useState<PatientConditionConsciousness>('Alert');
  const [mobility, setMobility] = useState<PatientConditionMobility>('Independent');
  const [appetite, setAppetite] = useState<PatientConditionAppetite>('Good');
  const [urine, setUrine] = useState<PatientConditionUrine>('Normal');
  const [urineOther, setUrineOther] = useState('');
  const [bowelStatus, setBowelStatus] = useState<PatientConditionBowel>('Normal');

  // Diet Plan (Staff can type custom e.g. "Makan bubur")
  const [dietPlan, setDietPlan] = useState('Makan bubur');

  // Tube Management
  const [hasNgt, setHasNgt] = useState(false);
  const [hasCbd, setHasCbd] = useState(false);
  const [tubeMaterial, setTubeMaterial] = useState<'silicone' | 'PVC'>('silicone');
  const [tubeReplacementDate, setTubeReplacementDate] = useState('');
  const [tubeSize, setTubeSize] = useState('Fr 16');

  // Patient Behavior (Multi-select)
  const [selectedBehaviors, setSelectedBehaviors] = useState<PatientBehaviorCategory[]>([
    'Calm & Cooperative',
  ]);

  // Picture Attachment (e.g. Wound Photo)
  const [attachmentImage, setAttachmentImage] = useState<string | null>(null);
  const [previewEnlargedImage, setPreviewEnlargedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Nurse Advice & Handover
  const [nurseAdvice, setNurseAdvice] = useState('');
  const [nursingReport, setNursingReport] = useState('');

  // ADL & Care
  const [medication, setMedication] = useState<'SERVED' | 'REFUSE' | 'WITHHELD'>('SERVED');
  const [hygiene, setHygiene] = useState('Normal shower');
  const [feeding, setFeeding] = useState('DONE');
  const [wound, setWound] = useState('N/A');
  const [repositioning, setRepositioning] = useState('N/A');
  const [mobilisation, setMobilisation] = useState('1');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto set active shift
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 14 && hour < 21) {
      setShift('Petang (2:00pm-12:00am)');
    } else if (hour >= 21 || hour < 7) {
      setShift('Night (9:00pm-7:00am)');
    } else {
      setShift('Morning (7:00am-5:00pm)');
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedPatient) {
      setPatientId(selectedPatient.id);
      // If patient is tube fed or has diagnosis, prepopulate defaults
      if (selectedPatient.feeding_method?.toLowerCase().includes('tube') || selectedPatient.feeding_method?.toLowerCase().includes('ngt')) {
        setHasNgt(true);
        setDietPlan('Susu Ensure via NGT 250ml x 4 kali');
      } else if (selectedPatient.feeding_method?.toLowerCase().includes('soft')) {
        setDietPlan('Makan bubur lembut');
      }
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

  const isVitalShift = shift.startsWith('Morning') || shift.startsWith('AM') || shift.startsWith('Night');

  function handleBehaviorToggle(bId: PatientBehaviorCategory) {
    if (selectedBehaviors.includes(bId)) {
      setSelectedBehaviors(selectedBehaviors.filter((item) => item !== bId));
    } else {
      setSelectedBehaviors([...selectedBehaviors, bId]);
    }
  }

  const [uploadingImage, setUploadingImage] = useState(false);

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Saiz gambar melebihi 10MB. Sila pilih gambar yang lebih kecil.');
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const rawBase64 = reader.result as string;
      try {
        const uploadRes = await uploadImageToR2(rawBase64, 'dapud_monitoring');
        setAttachmentImage(uploadRes.url);
        setError(null);
      } catch (err: any) {
        console.warn('Gagal memuat naik ke R2, menggunakan fallback tempatan:', err);
        setAttachmentImage(rawBase64);
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  }

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

      let tubeTypeVal = 'None';
      if (hasNgt && hasCbd) tubeTypeVal = 'NGT & CBD Tubes';
      else if (hasNgt) tubeTypeVal = 'NGT tube';
      else if (hasCbd) tubeTypeVal = 'CBD Tube';

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

        // Conditions
        general_condition: generalCondition,
        consciousness,
        mobility_status: mobility,
        appetite,
        urine_output: urine,
        urine_other: urine === 'Other' ? urineOther : null,
        bowel_movement: bowelStatus === 'Normal' ? 1 : 0,

        // Diet & Tube
        diet_plan: dietPlan.trim() || 'Makan bubur',
        tube_has_ngt: hasNgt ? 1 : 0,
        tube_has_cbd: hasCbd ? 1 : 0,
        tube_type: tubeTypeVal,
        tube_material: hasNgt || hasCbd ? tubeMaterial : null,
        tube_replacement_date: hasNgt || hasCbd ? tubeReplacementDate || null : null,
        tube_size: hasNgt || hasCbd ? tubeSize : null,

        // Behavior & Picture & Advice
        patient_behavior: selectedBehaviors.join(', '),
        attachment_image: attachmentImage || null,
        nurse_advice: nurseAdvice.trim() || null,

        // ADL Care Tasks
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
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white rounded-3xl border border-emerald-950/10 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col my-auto overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-[#F8FAF8]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0B3B2C] text-[#C5E875] flex items-center justify-center shadow-xs">
                <ClipboardList className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Catatan Pemantauan Syif (DAPUD)
                </h2>
                <p className="text-xs text-slate-500">
                  Pemeriksaan keadaan pesakit, tanda vital, tiub, diet, dan tingkah laku.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Patient & Shift selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F8FAF8] p-3.5 rounded-2xl border border-emerald-950/10">
              <div className="space-y-1">
                <label className="font-bold text-slate-800">Pilih Pesakit *</label>
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.mrn} — {p.full_name} ({p.room_bed || p.zone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800">Syif Bertugas *</label>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value as ShiftType)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium"
                >
                  <option value="Morning (7:00am-5:00pm)">Morning (7:00am - 5:00pm) [Vital Sign Wajib]</option>
                  <option value="Petang (2:00pm-12:00am)">Petang (2:00pm - 12:00am) [Jagaan & Ubat]</option>
                  <option value="Night (9:00pm-7:00am)">Night (9:00pm - 7:00am) [Vital Sign Wajib]</option>
                </select>
              </div>
            </div>

            {/* 1. Patient Condition Section (Directly from Page 1 Table) */}
            <div className="p-4 rounded-2xl border border-emerald-950/10 bg-white space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <Activity className="w-4 h-4 text-emerald-700" />
                  A. Status Keadaan Pesakit (Patient Condition)
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Berdasarkan Syif: {shift.split(' ')[0]}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* General Condition */}
                <div className="space-y-1 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <label className="font-bold text-slate-700">General Condition</label>
                  <div className="grid grid-cols-3 gap-1 pt-0.5">
                    {(['Stable', 'Improving', 'Unwell'] as PatientConditionGeneral[]).map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setGeneralCondition(val)}
                        className={`py-1.5 px-2 rounded-lg text-center font-semibold text-[11px] transition-all border ${
                          generalCondition === val
                            ? 'bg-[#0B3B2C] text-white border-[#0B3B2C]'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Consciousness */}
                <div className="space-y-1 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <label className="font-bold text-slate-700">Consciousness</label>
                  <div className="grid grid-cols-3 gap-1 pt-0.5">
                    {(['Alert', 'Drowsy', 'Confused'] as PatientConditionConsciousness[]).map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setConsciousness(val)}
                        className={`py-1.5 px-2 rounded-lg text-center font-semibold text-[11px] transition-all border ${
                          consciousness === val
                            ? 'bg-[#0B3B2C] text-white border-[#0B3B2C]'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobility */}
                <div className="space-y-1 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <label className="font-bold text-slate-700">Mobility</label>
                  <div className="grid grid-cols-3 gap-1 pt-0.5">
                    {(['Independent', 'Assisted', 'Bedbound'] as PatientConditionMobility[]).map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setMobility(val)}
                        className={`py-1.5 px-2 rounded-lg text-center font-semibold text-[11px] transition-all border ${
                          mobility === val
                            ? 'bg-[#0B3B2C] text-white border-[#0B3B2C]'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Appetite */}
                <div className="space-y-1 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <label className="font-bold text-slate-700">Appetite (Selera)</label>
                  <div className="grid grid-cols-3 gap-1 pt-0.5">
                    {(['Good', 'Fair', 'Poor'] as PatientConditionAppetite[]).map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setAppetite(val)}
                        className={`py-1.5 px-2 rounded-lg text-center font-semibold text-[11px] transition-all border ${
                          appetite === val
                            ? 'bg-[#0B3B2C] text-white border-[#0B3B2C]'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Urine */}
                <div className="space-y-1 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <label className="font-bold text-slate-700">Urine (Kencing)</label>
                  <div className="grid grid-cols-3 gap-1 pt-0.5">
                    {(['Normal', 'Reduced', 'Other'] as PatientConditionUrine[]).map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setUrine(val)}
                        className={`py-1.5 px-2 rounded-lg text-center font-semibold text-[11px] transition-all border ${
                          urine === val
                            ? 'bg-[#0B3B2C] text-white border-[#0B3B2C]'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  {urine === 'Other' && (
                    <input
                      type="text"
                      placeholder="Nyatakan, cth: Berdarah / CBD Catheter..."
                      value={urineOther}
                      onChange={(e) => setUrineOther(e.target.value)}
                      className="mt-1 w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px]"
                    />
                  )}
                </div>

                {/* Bowel */}
                <div className="space-y-1 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <label className="font-bold text-slate-700">Bowel (Najis / Perkumuhan)</label>
                  <div className="grid grid-cols-3 gap-1 pt-0.5">
                    {(['Normal', 'No bowel motion', 'Diarrhoea'] as PatientConditionBowel[]).map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setBowelStatus(val)}
                        className={`py-1.5 px-1.5 rounded-lg text-center font-semibold text-[10px] transition-all border ${
                          bowelStatus === val
                            ? 'bg-[#0B3B2C] text-white border-[#0B3B2C]'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {val === 'No bowel motion' ? 'No bowel' : val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Diet Plan & 3. Tube Management (Page 1) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Diet Plan */}
              <div className="p-3.5 rounded-2xl border border-emerald-950/10 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Utensils className="w-4 h-4 text-amber-600" />
                    Diet Plan (Pelan Pemakanan)
                  </span>
                  <span className="text-[10px] text-slate-400">Boleh isi sendiri</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Makan bubur',
                    'Soft diet',
                    'Normal diet',
                    'Pureed (Kisar)',
                    'Diabetic diet',
                    'NPO (Puasa)',
                  ].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setDietPlan(preset)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                        dietPlan === preset
                          ? 'bg-[#EAF5DC] text-[#0B3B2C] border-[#0B3B2C] font-bold'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Contoh: Makan bubur ayam lumat / Soft diet..."
                  value={dietPlan}
                  onChange={(e) => setDietPlan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-xs focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              {/* Tube Management */}
              <div className="p-3.5 rounded-2xl border border-emerald-950/10 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-blue-600" />
                    Pengurusan Tiub (Tube Management)
                  </span>
                  <span className="text-[10px] text-slate-400">NGT / CBD</span>
                </div>

                <div className="flex items-center gap-4 pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={hasNgt}
                      onChange={(e) => setHasNgt(e.target.checked)}
                      className="w-4 h-4 rounded text-[#0B3B2C] focus:ring-[#0B3B2C]"
                    />
                    <span>NGT tube (Tiub Hidung/Perut)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={hasCbd}
                      onChange={(e) => setHasCbd(e.target.checked)}
                      className="w-4 h-4 rounded text-[#0B3B2C] focus:ring-[#0B3B2C]"
                    />
                    <span>CBD Tube (Kencing)</span>
                  </label>
                </div>

                {(hasNgt || hasCbd) && (
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 mt-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block">Type</label>
                      <select
                        value={tubeMaterial}
                        onChange={(e) => setTubeMaterial(e.target.value as any)}
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px]"
                      >
                        <option value="silicone">Silicone</option>
                        <option value="PVC">PVC</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block">Tube Size</label>
                      <input
                        type="text"
                        placeholder="Fr 16"
                        value={tubeSize}
                        onChange={(e) => setTubeSize(e.target.value)}
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px]"
                      >
                      </input>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block">Replacement Date</label>
                      <input
                        type="date"
                        value={tubeReplacementDate}
                        onChange={(e) => setTubeReplacementDate(e.target.value)}
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Patient Behavior Section (Page 2 - Specific 9 Ticked Options) */}
            <div className="p-4 rounded-2xl border border-emerald-950/10 bg-white space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-amber-600" />
                  Tingkah Laku Pesakit (Patient Behavior)
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {selectedBehaviors.length} dipilih (Pilihan Bertanda Dokumen)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {BEHAVIOR_OPTIONS.map((item) => {
                  const isSelected = selectedBehaviors.includes(item.id);
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => handleBehaviorToggle(item.id)}
                      className={`p-2 rounded-xl border text-left transition-all flex items-start gap-2 ${
                        isSelected
                          ? 'bg-[#F4F8F4] border-[#0B3B2C] ring-1 ring-[#0B3B2C]/20 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-md mt-0.5 flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-[#E35D1F] border-[#E35D1F] text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-[11px] leading-tight">
                          {item.label}
                        </div>
                        <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                          {item.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vitals Section */}
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-3">
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Kadar Nadi (bpm)</label>
                  <input
                    type="number"
                    placeholder="76"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs"
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">SpO2 (%)</label>
                  <input
                    type="number"
                    placeholder="98"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs"
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Skala Sakit (0-10)</label>
                  <select
                    value={painLevel}
                    onChange={(e) => setPainLevel(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
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
                    className={`w-full px-3 py-2 rounded-xl border font-bold ${
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

            {/* ADL Care & Medication */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Pengambilan Ubat</label>
                <select
                  value={medication}
                  onChange={(e) => setMedication(e.target.value as any)}
                  className={`w-full px-3 py-2 rounded-xl border ${
                    medication === 'REFUSE' ? 'border-rose-300 bg-rose-50 text-rose-700 font-bold' : 'border-slate-200 bg-white'
                  }`}
                >
                  <option value="SERVED">SERVED (Telah Diberi)</option>
                  <option value="REFUSE">REFUSE (Menolak Ubat)</option>
                  <option value="WITHHELD">WITHHELD (Ditangguhkan)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Kebersihan Diri / Mandi</label>
                <select
                  value={hygiene}
                  onChange={(e) => setHygiene(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="N/A">N/A (Tiada Luka)</option>
                  <option value="DONE">DONE (Selesai Dibalut)</option>
                </select>
              </div>
            </div>

            {/* 5. Attachment Picture & 6. Nurse Advice Column (Page 3) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Attachment Picture (Contoh: Gambar Luka) */}
              <div className="p-3.5 rounded-2xl border border-emerald-950/10 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-700" />
                    Kepilkan Gambar (Attachment Picture)
                  </span>
                  <span className="text-[10px] text-slate-400">Contoh: Gambar luka / kulit</span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {attachmentImage ? (
                  <div className="relative border border-slate-200 rounded-xl p-2 bg-slate-50 flex items-center gap-3">
                    <img
                      src={attachmentImage}
                      alt="Lampiran luka/keadaan pesakit"
                      className="w-16 h-16 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90"
                      onClick={() => setPreviewEnlargedImage(attachmentImage)}
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800 text-[11px]">Gambar berjaya dimuat naik</p>
                      <button
                        type="button"
                        onClick={() => setPreviewEnlargedImage(attachmentImage)}
                        className="text-[10px] text-emerald-700 hover:underline font-medium block"
                      >
                        Klik untuk lihat saiz penuh
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachmentImage(null)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Padam gambar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 px-3 border border-dashed border-slate-300 hover:border-emerald-700 rounded-xl bg-[#F8FAF8] hover:bg-emerald-50/40 text-slate-600 transition-colors flex flex-col items-center justify-center gap-1"
                  >
                    <div className="w-8 h-8 rounded-full bg-white shadow-2xs flex items-center justify-center text-slate-500">
                      <Camera className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-[11px] text-slate-800">
                      Klik untuk ambil foto / muat naik fail
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Format PNG, JPG atau WEBP (Maks 5MB)
                    </span>
                  </button>
                )}
              </div>

              {/* Nurse Advice Column */}
              <div className="p-3.5 rounded-2xl border border-emerald-950/10 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-700" />
                    Nurse Advice Column (Nasihat Jururawat)
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-[#EAF5DC] px-2 py-0.5 rounded-full">
                    Arahan Syif Seterusnya
                  </span>
                </div>
                <textarea
                  rows={3}
                  placeholder="Catatan nasihat khusus jururawat untuk syif seterusnya / doktor (cth: pantau BP setiap 2 jam, dressing luka dibersihkan dengan Normal Saline esok pagi)..."
                  value={nurseAdvice}
                  onChange={(e) => setNurseAdvice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-700 focus:outline-hidden text-xs"
                />
              </div>
            </div>

            {/* General Handover Notes */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Laporan Kejururawatan Umum (Handover Notes)</label>
              <textarea
                rows={2}
                placeholder="Catatan perkembangan harian pesakit, interaksi keluarga atau doktor pelawat..."
                value={nursingReport}
                onChange={(e) => setNursingReport(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-700 focus:outline-hidden"
              />
            </div>

            {/* Footer Actions */}
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
                <span>{loading ? 'Menyimpan...' : 'Simpan Rekod Syif DAPUD'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Lightbox Image Preview Modal */}
      {previewEnlargedImage && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="relative max-w-2xl w-full bg-white rounded-3xl p-4 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-bold text-slate-900 text-sm">Lampiran Gambar Pemerhatian Pesakit</span>
              <button
                type="button"
                onClick={() => setPreviewEnlargedImage(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="pt-3 flex justify-center max-h-[75vh] overflow-auto">
              <img
                src={previewEnlargedImage}
                alt="Enlarged preview"
                className="max-h-[70vh] object-contain rounded-xl border border-slate-200"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
