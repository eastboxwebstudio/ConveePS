export type UserRole = 'admin' | 'staff_nurse' | 'caregiver';
export type UserStatus = 'active' | 'inactive';

export interface User {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  status?: UserStatus;
  must_change_passcode?: number;
  created_at?: string;
  last_login_at?: string;
}

export type ZoneType = 'Zon Lelaki' | 'Zon Perempuan';

export type CareLevel = 'Independent' | 'Partial Assist' | 'Total Assist';

export type PatientStatus = 'Active' | 'Discharged' | 'Hospitalised' | 'Home Leave';

export type KanbanStage =
  | 'New Admission'
  | 'Hospitalisation'
  | 'Red Alert'
  | 'TCA'
  | 'Home Leave'
  | 'Refuse Medication'
  | 'Discharged';

export type ShiftType =
  | 'Morning (7:00am-5:00pm)'
  | 'Petang (2:00pm-12:00am)'
  | 'Night (9:00pm-7:00am)'
  | 'AM (7:00-5:00)'
  | 'PM (5:00-9:00)';

export type ClinicalStatus = 'Stable' | 'Red Alert';

export interface Patient {
  id: string;
  mrn: string;
  full_name: string;
  gender: 'Male' | 'Female';
  age: number;
  date_of_birth?: string | null;
  zone: ZoneType;
  room_bed?: string | null;
  primary_diagnosis: string;
  prescribed_medications?: string | null;
  follow_up_facility?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  care_level: CareLevel;
  baseline_mobility: string;
  feeding_method: string;
  status: PatientStatus;
  created_at?: string;
  updated_at?: string;

  // Joined admission fields
  admission_id?: string;
  admission_number?: string;
  admission_date?: string;
  admission_time?: string;
  kanban_stage?: KanbanStage;
  length_of_stay?: number;
  tca_date?: string | null;
  tca_location?: string | null;
  tca_remarks?: string | null;

  // Latest monitoring indicators
  latest_clinical_status?: ClinicalStatus;
  latest_bp?: string;
  latest_pulse?: number;
  latest_temp?: number;
  latest_spo2?: number;
  latest_appetite?: string;
  latest_med_status?: string;
  latest_monitoring_time?: string;
  latest_nurse_advice?: string | null;
  latest_diet_plan?: string | null;
}

export interface Admission {
  id: string;
  patient_id: string;
  admission_number: string;
  admission_date: string;
  admission_time: string;
  zone: ZoneType;
  room_bed?: string | null;
  admitted_by: string;
  admitted_by_name?: string;
  lifecycle_status: PatientStatus;
  kanban_stage: KanbanStage;
  admission_remarks?: string;
  tca_date?: string | null;
  tca_location?: string | null;
  tca_remarks?: string | null;
  created_at: string;
}

export type PatientConditionGeneral = 'Stable' | 'Improving' | 'Unwell';
export type PatientConditionConsciousness = 'Alert' | 'Drowsy' | 'Confused';
export type PatientConditionMobility = 'Independent' | 'Assisted' | 'Bedbound';
export type PatientConditionAppetite = 'Good' | 'Fair' | 'Poor';
export type PatientConditionUrine = 'Normal' | 'Reduced' | 'Other';
export type PatientConditionBowel = 'Normal' | 'No bowel motion' | 'Diarrhoea';

export type PatientBehaviorCategory =
  | 'Calm & Cooperative'
  | 'Agitated / Restless'
  | 'Verbal Aggression'
  | 'Repetitive Behaviour'
  | 'Wandering'
  | 'Anxious / Fearful'
  | 'Confused / Disoriented'
  | 'Attention-Seeking'
  | 'Emotionally Distressed';

export interface MonitoringRecord {
  id: string;
  admission_id: string;
  patient_id: string;
  staff_user_id: string;
  staff_name: string;
  timestamp: string;
  shift: ShiftType;
  clinical_status: ClinicalStatus;

  // Vitals
  blood_pressure?: string | null;
  pulse_rate?: number | null;
  temperature?: number | null;
  spo2?: number | null;
  blood_sugar?: string | null;
  pain_level: number;

  // Conditions (As per CECC DAPUD form)
  general_condition?: PatientConditionGeneral | string;
  consciousness?: PatientConditionConsciousness | string;
  mobility_status?: PatientConditionMobility | string;
  appetite: 'GOOD' | 'FAIR' | 'POOR' | 'Good' | 'Fair' | 'Poor';
  urine_output?: PatientConditionUrine | string;
  urine_other?: string | null;
  bowel_movement: number;
  bowel_status?: PatientConditionBowel | string;

  // Diet Plan & Tube Management
  diet_plan?: string | null;
  tube_has_ngt?: number;
  tube_has_cbd?: number;
  tube_type?: string | null;
  tube_material?: 'silicone' | 'PVC' | string | null;
  tube_replacement_date?: string | null;
  tube_size?: string | null;

  // Patient Behavior (Ticked categories)
  patient_behavior?: string | null;

  // Media Attachment & Nurse Advice
  attachment_image?: string | null;
  nurse_advice?: string | null;

  // ADL Care Tasks
  medication_intake: 'SERVED' | 'REFUSE' | 'WITHHELD';
  hygiene_care: string;
  feeding_care: string;
  wound_dressing: string;
  repositioning: string;
  mobilisation: string;

  // Reports
  nursing_report?: string | null;
  rehab_assessment?: string | null;
  visitor_log?: string | null;
  created_at: string;

  // Joined fields
  patient_name?: string;
  mrn?: string;
  zone?: ZoneType;
  room_bed?: string;
}

export interface DischargeRecord {
  id: string;
  admission_id: string;
  patient_id: string;
  discharge_date: string;
  discharge_time: string;
  discharged_by: string;
  discharged_by_name?: string;
  discharge_destination: string;
  discharge_summary?: string;
  emergency_contact_notified: number;
  medications_given?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  target_entity: string;
  target_id?: string | null;
  details: string;
  ip_address?: string;
  created_at: string;
}

export interface DashboardStats {
  total_active_patients: number;
  male_zone_count: number;
  female_zone_count: number;
  new_admissions_7d: number;
  discharges_total: number;
  alerts: {
    red_alert_today: number;
    refuse_meds_today: number;
    poor_appetite_today: number;
  };
  updates_today: {
    am_shift: number;
    pm_shift: number;
    night_shift: number;
    total: number;
  };
  avg_length_of_stay: number;
  recent_activities: MonitoringRecord[];
}

export type InventoryCategory = 'personal' | 'medication';
export type StockNecessity = 'YES' | 'NO';

export interface PatientInventoryItem {
  id: string;
  patient_id: string;
  category: InventoryCategory;
  item_order: number;
  item_name: string;
  stock_balance: string;
  stock_necessity: StockNecessity;
  restock_date?: string | null;
  restock_qty?: string | null;
  remark?: string | null;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PatientInventoryCheck {
  id: string;
  patient_id: string;
  check_date: string;
  personal_staff_name: string;
  med_staff_name?: string | null;
  status: 'Draft' | 'Completed' | 'Approved';
  total_items: number;
  total_restock_needed: number;
  general_remarks?: string | null;
  created_at?: string;
  patient_name?: string;
  patient_mrn?: string;
  zone?: string;
  room_bed?: string;
}

export interface PatientInventoryCheckDetail {
  id: string;
  check_id: string;
  patient_id: string;
  category: InventoryCategory;
  item_name: string;
  stock_balance: string;
  stock_necessity: StockNecessity;
  restock_date?: string | null;
  restock_qty?: string | null;
  remark?: string | null;
  image_url?: string | null;
}

export interface InventoryStats {
  total_patients: number;
  total_items_tracked: number;
  total_restock_needed: number;
  personal_restock_needed: number;
  meds_restock_needed: number;
  urgent_alerts: {
    patient_id: string;
    patient_name: string;
    room_bed?: string;
    item_name: string;
    category: InventoryCategory;
    stock_balance: string;
    remark?: string;
  }[];
}

export type AppointmentStatus =
  | 'Scheduled'
  | 'Checked-In'
  | 'Completed'
  | 'Cancelled'
  | 'No-Show';

export interface Appointment {
  id: string;
  patient_id?: string | null;
  visitor_name: string;
  visitor_ic_passport?: string | null;
  visitor_phone: string;
  relationship: string;
  purpose: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  pax_count: number;
  status: AppointmentStatus;
  check_in_time?: string | null;
  check_out_time?: string | null;
  health_declaration: number;
  temperature?: number | null;
  notes?: string | null;
  staff_user_id?: string | null;
  created_at?: string;
  updated_at?: string;

  // Joined fields
  patient_name?: string | null;
  patient_mrn?: string | null;
  patient_zone?: ZoneType | null;
  room_bed?: string | null;
  staff_name?: string | null;
}

export interface AppointmentStats {
  today_total: number;
  currently_checked_in: number;
  upcoming_scheduled: number;
  completed_today: number;
}
