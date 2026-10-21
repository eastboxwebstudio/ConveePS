export type UserRole = 'admin' | 'staff_nurse';
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

export type ShiftType = 'AM (7:00-5:00)' | 'PM (5:00-9:00)' | 'Night (9:00pm-7:00am)';

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

  // Latest monitoring indicators
  latest_clinical_status?: ClinicalStatus;
  latest_bp?: string;
  latest_pulse?: number;
  latest_temp?: number;
  latest_spo2?: number;
  latest_appetite?: string;
  latest_med_status?: string;
  latest_monitoring_time?: string;
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
  created_at: string;
}

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

  // Conditions
  general_condition?: string;
  consciousness?: string;
  mobility_status?: string;
  appetite: 'GOOD' | 'FAIR' | 'POOR';
  urine_output?: string;
  bowel_movement: number;

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
