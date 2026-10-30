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
import { apiCreateMonitoring, apiGetPatients, uploadImageToR2 } from '../lib/api.js';

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
    desc: 'Calm, compliant with instructions, cooperative with nursing staff',
  },
  {
    id: 'Agitated / Restless',
    label: 'Agitated / Restless',
    desc: 'Restless, pacing, unable to sit still',
  },
  {
    id: 'Verbal Aggression',
    label: 'Verbal Aggression',
    desc: 'Shouting, scolding staff, harsh words',
  },
  {
    id: 'Repetitive Behaviour',
    label: 'Repetitive Behaviour',
    desc: 'Repeating the same question or action repeatedly',
  },
  {
    id: 'Wandering',
    label: 'Wandering',
    desc: 'Aimless walking or attempting to exit the premises',
  },
  {
    id: 'Anxious / Fearful',
    label: 'Anxious / Fearful',
    desc: 'Appears worried, fearful, constantly seeking reassurance',
  },
  {
    id: 'Confused / Disoriented',
    label: 'Confused / Disoriented',
    desc: 'Confused, difficulty recognizing people, places, or time',
  },
  {
    id: 'Attention-Seeking',
    label: 'Attention-Seeking',
    desc: 'Frequently calling staff or repeatedly requesting assistance',
  },
  {
    id: 'Emotionally Distressed',
    label: 'Emotionally Distressed',
    desc: 'Crying, sad mood, sudden emotional mood swings',
  },
];

export const MonitoringModal: React.FC<MonitoringModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  patients,
  selectedPatient,
}) => {
  const [internalPatients, setInternalPatients] = useState<Patient[]>(patients);
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
  const [uploadingImage, setUploadingImage] = useState(false);
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

  // Keep internal patients list in sync or fetch active patients if empty
  useEffect(() => {
    if (patients && patients.length > 0) {
      setInternalPatients(patients);
    } else if (isOpen) {
      apiGetPatients({ status: 'Active' })
        .then((res) => {
          if (res?.patients && res.patients.length > 0) {
            setInternalPatients(res.patients);
          }
        })
        .catch((err) => console.error('Failed to load active patients for monitoring:', err));
    }
  }, [patients, isOpen]);

  // Sync patient selection and defaults when modal opens or patient changes
  useEffect(() => {
    if (!isOpen) return;

    const available = Array.isArray(internalPatients) && internalPatients.length > 0
      ? internalPatients
      : (Array.isArray(patients) ? patients : []);

    if (selectedPatient) {
      setPatientId(selectedPatient.id);
      const fm = String(selectedPatient.feeding_method || '').toLowerCase();
      if (fm.includes('tube') || fm.includes('ngt')) {
        setHasNgt(true);
        setDietPlan('Susu Ensure via NGT 250ml x 4 kali');
      } else if (fm.includes('soft')) {
        setDietPlan('Makan bubur lembut');
      } else if (selectedPatient.latest_diet_plan) {
        setDietPlan(selectedPatient.latest_diet_plan);
      }
    } else if (available.length > 0 && available[0]?.id) {
      setPatientId((prev) => (prev && available.some((p) => p?.id === prev) ? prev : available[0].id));
    }
    setError(null);
  }, [isOpen, selectedPatient, patients, internalPatients]);

  // Auto trigger Red Alert detection based on vital entries
  useEffect(() => {
    const t = Number(temp);
    const s = Number(spo2);
    const p = Number(pulse);
    if ((t && t >= 38.0) || (s && s < 92) || (p && (p > 120 || p < 50))) {
      setClinicalStatus('Red Alert');
    }
  }, [temp, spo2, pulse]);

  const currentShiftStr = String(shift || 'Morning');
  const isVitalShift = currentShiftStr.startsWith('Morning') || currentShiftStr.startsWith('AM') || currentShiftStr.startsWith('Night');

  function handleBehaviorToggle(bId: PatientBehaviorCategory) {
    const currentList = Array.isArray(selectedBehaviors) ? selectedBehaviors : [];
    if (currentList.includes(bId)) {
      setSelectedBehaviors(currentList.filter((item) => item !== bId));
    } else {
      setSelectedBehaviors([...currentList, bId]);
    }
  }

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
        admission_id: activePatientObj?.admission_id || selectedPatient?.admission_id || undefined,
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
      setError(err.message || 'Failed to save monitoring record.');
    } finally {
      setLoading(false);
    }
  }

  const availablePatients = Array.isArray(internalPatients) && internalPatients.length > 0
    ? internalPatients
    : (Array.isArray(patients) ? patients : []);
  const activePatientObj = availablePatients.find((p) => p && p.id === patientId);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white rounded-3xl border border-emerald-950/10 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col my-auto overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-[#F8FAF8]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0B3B2C] text-[#C5E875] flex items-center justify-center shadow-xs">
                <ClipboardList className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Shift Clinical Monitoring (DAPUD)
                </h2>
                <p className="text-xs text-slate-500">
                  Resident observations, vital signs, tubes, diet, and behavior assessment.
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
                <label className="font-bold text-slate-800">Select Resident *</label>
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium"
                >
                  {availablePatients.length === 0 ? (
                    <option value="">No active residents found</option>
                  ) : (
                    availablePatients.map((p) => {
                      if (!p) return null;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.mrn} — {p.full_name} ({p.room_bed || p.zone || 'Ward'})
                        </option>
                      );
                    })
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800">Duty Shift *</label>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value as ShiftType)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium"
                >
                  <option value="Morning (7:00am-5:00pm)">Morning (7:00am - 5:00pm) [Mandatory Vitals]</option>
                  <option value="Petang (2:00pm-12:00am)">Evening (2:00pm - 12:00am) [ADL & Care]</option>
                  <option value="Night (9:00pm-7:00am)">Night (9:00pm - 7:00am) [Mandatory Vitals]</option>
                </select>
              </div>
            </div>

            {/* 1. Patient Condition Section */}
            <div className="p-4 rounded-2xl border border-emerald-950/10 bg-white space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <Activity className="w-4 h-4 text-emerald-700" />
                  A. Resident Clinical Condition
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Duty Shift: {String(shift || 'Morning').split(' ')[0]}</span>
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
                  <label className="font-bold text-slate-700">Appetite</label>
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
                  <label className="font-bold text-slate-700">Urine Output</label>
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
                      placeholder="Specify, e.g. Hematuria / Foley Catheter..."
                      value={urineOther}
                      onChange={(e) => setUrineOther(e.target.value)}
                      className="mt-1 w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px]"
                    />
                  )}
                </div>

                {/* Bowel */}
                <div className="space-y-1 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <label className="font-bold text-slate-700">Bowel Movement</label>
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

            {/* 2. Diet Plan & 3. Tube Management */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Diet Plan */}
              <div className="p-3.5 rounded-2xl border border-emerald-950/10 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Utensils className="w-4 h-4 text-amber-600" />
                    Diet Plan
                  </span>
                  <span className="text-[10px] text-slate-400">Custom entry enabled</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Normal diet',
                    'Soft diet',
                    'Porridge / Puree',
                    'Diabetic diet',
                    'Low Salt',
                    'NPO (Fasting)',
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
                  placeholder="e.g. Chicken porridge / soft diet..."
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
                    Tube Management
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
                    <span>NGT Tube (Nasogastric / Feeding)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={hasCbd}
                      onChange={(e) => setHasCbd(e.target.checked)}
                      className="w-4 h-4 rounded text-[#0B3B2C] focus:ring-[#0B3B2C]"
                    />
                    <span>CBD / Foley Catheter (Urinary)</span>
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
                      />
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

            {/* 4. Patient Behavior Section */}
            <div className="p-4 rounded-2xl border border-emerald-950/10 bg-white space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-amber-600" />
                  Resident Behavior Assessment
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {Array.isArray(selectedBehaviors) ? selectedBehaviors.length : 0} selected
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {BEHAVIOR_OPTIONS.map((item) => {
                  const isSelected = Array.isArray(selectedBehaviors) && selectedBehaviors.includes(item.id);
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
                  Vital Signs
                </span>
                {isVitalShift && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                    Mandatory 2x Daily (AM & Night)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Blood Pressure (BP)</label>
                  <input
                    type="text"
                    placeholder="120/80"
                    value={bp}
                    onChange={(e) => setBp(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Pulse Rate (bpm)</label>
                  <input
                    type="number"
                    placeholder="76"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Temperature (°C)</label>
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
                  <label className="font-semibold text-slate-700">Blood Glucose (mmol/L)</label>
                  <input
                    type="text"
                    placeholder="5.6 or -"
                    value={bloodSugar}
                    onChange={(e) => setBloodSugar(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Pain Scale (0-10)</label>
                  <select
                    value={painLevel}
                    onChange={(e) => setPainLevel(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value={0}>0 — No Pain</option>
                    <option value={1}>1 — Mild Pain</option>
                    <option value={2}>2 — Mild Pain</option>
                    <option value={3}>3 — Moderate Pain</option>
                    <option value={4}>4 — Distressing Pain</option>
                    <option value={5}>5 — Severe Pain</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Clinical Status</label>
                  <select
                    value={clinicalStatus}
                    onChange={(e) => setClinicalStatus(e.target.value as ClinicalStatus)}
                    className={`w-full px-3 py-2 rounded-xl border font-bold ${
                      clinicalStatus === 'Red Alert'
                        ? 'border-rose-400 bg-rose-50 text-rose-700'
                        : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    <option value="Stable">Stable</option>
                    <option value="Red Alert">Red Alert (Close Attention)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ADL Care & Medication */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Medication Administration</label>
                <select
                  value={medication}
                  onChange={(e) => setMedication(e.target.value as any)}
                  className={`w-full px-3 py-2 rounded-xl border ${
                    medication === 'REFUSE' ? 'border-rose-300 bg-rose-50 text-rose-700 font-bold' : 'border-slate-200 bg-white'
                  }`}
                >
                  <option value="SERVED">SERVED (Administered)</option>
                  <option value="REFUSE">REFUSE (Refused Medication)</option>
                  <option value="WITHHELD">WITHHELD (Withheld)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Personal Hygiene / Bath</label>
                <select
                  value={hygiene}
                  onChange={(e) => setHygiene(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="Normal shower">Normal shower</option>
                  <option value="Sponging and bed bath">Bed bath & sponging</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Wound Care / Dressing</label>
                <select
                  value={wound}
                  onChange={(e) => setWound(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="N/A">N/A (No Wound)</option>
                  <option value="DONE">DONE (Dressing Completed)</option>
                </select>
              </div>
            </div>

            {/* 5. Attachment Picture & 6. Nurse Advice Column */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Attachment Picture */}
              <div className="p-3.5 rounded-2xl border border-emerald-950/10 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-700" />
                    Attach Clinical Photo
                  </span>
                  <span className="text-[10px] text-slate-400">e.g. Wound or skin condition</span>
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
                      alt="Clinical photo attachment"
                      className="w-16 h-16 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90"
                      onClick={() => setPreviewEnlargedImage(attachmentImage)}
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800 text-[11px]">Photo uploaded successfully</p>
                      <button
                        type="button"
                        onClick={() => setPreviewEnlargedImage(attachmentImage)}
                        className="text-[10px] text-emerald-700 hover:underline font-medium block"
                      >
                        Click to view full size
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachmentImage(null)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Remove photo"
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
                      Click to take photo / upload file
                    </span>
                    <span className="text-[10px] text-slate-400">
                      PNG, JPG or WEBP (Max 5MB)
                    </span>
                  </button>
                )}
              </div>

              {/* Nurse Advice Column */}
              <div className="p-3.5 rounded-2xl border border-emerald-950/10 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-700" />
                    Nurse Advice Column
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-[#EAF5DC] px-2 py-0.5 rounded-full">
                    Next Shift Notes
                  </span>
                </div>
                <textarea
                  rows={3}
                  placeholder="Specific nursing instructions for the next shift / attending doctor (e.g. Monitor BP every 2 hours, clean wound with Normal Saline tomorrow morning)..."
                  value={nurseAdvice}
                  onChange={(e) => setNurseAdvice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-700 focus:outline-hidden text-xs"
                />
              </div>
            </div>

            {/* General Handover Notes */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">General Handover Notes</label>
              <textarea
                rows={2}
                placeholder="Daily clinical progress, resident interaction, family communications..."
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
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-2xl bg-[#0B3B2C] hover:bg-[#07281E] text-white font-semibold transition-colors flex items-center gap-2 shadow-xs text-xs"
              >
                <Check className="w-4 h-4 text-[#C5E875]" />
                <span>{loading ? 'Saving...' : 'Save DAPUD Shift Record'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Lightbox Image Preview Modal */}
      {previewEnlargedImage && (
        <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="relative max-w-2xl w-full bg-white rounded-3xl p-4 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-bold text-slate-900 text-sm">Resident Clinical Observation Photo</span>
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
