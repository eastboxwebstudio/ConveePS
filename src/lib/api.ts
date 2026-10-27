import {
  User,
  Patient,
  Admission,
  MonitoringRecord,
  DischargeRecord,
  AuditLog,
  DashboardStats,
  KanbanStage,
  ZoneType,
  PatientInventoryItem,
  PatientInventoryCheck,
  InventoryStats,
} from '../types/index.js';

const BASE_URL = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('convee_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Ralat berlaku semasa menghubungi pelayan.');
  }

  return data as T;
}

// 1. Auth API
export async function apiLogin(username: string, passcode: string) {
  const data = await request<{ success: boolean; token: string; user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, passcode }),
  });
  if (data.token) {
    localStorage.setItem('convee_token', data.token);
  }
  return data;
}

export async function apiLogout() {
  try {
    await request('/auth/logout', { method: 'POST' });
  } finally {
    localStorage.removeItem('convee_token');
  }
}

export async function apiGetMe() {
  return request<{ user: User }>('/auth/me');
}

export async function apiChangePasscode(currentPasscode: string, newPasscode: string) {
  return request<{ success: boolean; message: string }>('/auth/change-passcode', {
    method: 'POST',
    body: JSON.stringify({ currentPasscode, newPasscode }),
  });
}

// 2. Dashboard API
export async function apiGetDashboardSummary() {
  return request<DashboardStats>('/dashboard/summary');
}

// 3. Patients API
export async function apiGetPatients(params?: {
  search?: string;
  zone?: ZoneType | '';
  status?: string;
  kanban_stage?: KanbanStage | '';
}) {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.zone) query.append('zone', params.zone);
  if (params?.status) query.append('status', params.status);
  if (params?.kanban_stage) query.append('kanban_stage', params.kanban_stage);

  return request<{ patients: Patient[] }>(`/patients?${query.toString()}`);
}

export async function apiGetPatientDetails(id: string) {
  return request<{
    patient: Patient;
    admissions: Admission[];
    monitoring: MonitoringRecord[];
    discharge?: DischargeRecord;
  }>(`/patients/${id}`);
}

export async function apiCreatePatient(payload: Partial<Patient> & { admission_date?: string; admission_time?: string; admission_remarks?: string }) {
  return request<{ success: boolean; message: string; patientId: string; mrn: string }>('/patients', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiUpdatePatient(id: string, payload: Partial<Patient>) {
  return request<{ success: boolean; message: string }>(`/patients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function apiUpdateKanbanStage(admissionId: string, kanban_stage: KanbanStage) {
  return request<{ success: boolean; message: string }>(`/admissions/${admissionId}/stage`, {
    method: 'PATCH',
    body: JSON.stringify({ kanban_stage }),
  });
}

export async function apiUpdateTcaSchedule(
  admissionId: string,
  payload: {
    tca_date?: string;
    tca_location?: string;
    tca_remarks?: string;
    set_stage_tca?: boolean;
  }
) {
  return request<{ success: boolean; message: string }>(`/admissions/${admissionId}/tca`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// 4. Monitoring API (DAPUD)
export async function apiCreateMonitoring(payload: Partial<MonitoringRecord> & {
  diet_plan?: string | null;
  tube_has_ngt?: boolean | number;
  tube_has_cbd?: boolean | number;
  tube_type?: string | null;
  tube_material?: string | null;
  tube_replacement_date?: string | null;
  tube_size?: string | null;
  patient_behavior?: string | null;
  attachment_image?: string | null;
  nurse_advice?: string | null;
  urine_other?: string | null;
}) {
  return request<{ success: boolean; message: string; monitoringId: string; clinicalStatus: string }>('/monitoring', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// 5. Discharge API
export async function apiDischargePatient(admissionId: string, payload: {
  discharge_destination: string;
  discharge_summary?: string;
  emergency_contact_notified: boolean;
  medications_given?: string;
}) {
  return request<{ success: boolean; message: string; dischargeId: string }>(`/admissions/${admissionId}/discharge`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// 6. Staff API (Admin Only)
export async function apiGetStaff() {
  return request<{ staff: User[] }>('/staff');
}

export async function apiCreateStaff(payload: {
  username: string;
  full_name: string;
  role: 'admin' | 'staff_nurse' | 'caregiver';
  temporary_passcode: string;
}) {
  return request<{ success: boolean; message: string }>('/staff', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiResetStaffPasscode(staffId: string, temporary_passcode: string) {
  return request<{ success: boolean; message: string }>(`/staff/${staffId}/reset-passcode`, {
    method: 'POST',
    body: JSON.stringify({ temporary_passcode }),
  });
}

export async function apiToggleStaffStatus(staffId: string) {
  return request<{ success: boolean; message: string; newStatus: string }>(`/staff/${staffId}/toggle-status`, {
    method: 'POST',
  });
}

// 7. Audit Logs API
export async function apiGetAuditLogs() {
  return request<{ logs: AuditLog[] }>('/audit-logs');
}

// 8. CSV Export URL
export function getExportCsvUrl(type: 'patients' | 'monitoring') {
  const token = localStorage.getItem('convee_token') || '';
  return `/api/reports/export-csv?type=${type}&token=${encodeURIComponent(token)}`;
}

// 9. Patient Inventory & Medication APIs
export async function apiGetInventorySummary() {
  return request<InventoryStats>('/inventory/summary');
}

export async function apiGetPatientInventory(patientId: string) {
  return request<{
    patient: Patient;
    personal_items: PatientInventoryItem[];
    medication_items: PatientInventoryItem[];
    latest_check?: PatientInventoryCheck | null;
    check_history: PatientInventoryCheck[];
  }>(`/inventory/patient/${patientId}`);
}

export async function apiUpdateInventoryItem(
  itemId: string,
  data: Partial<PatientInventoryItem>
) {
  return request<{ success: boolean; item: PatientInventoryItem }>(`/inventory/items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function apiAddInventoryItem(data: {
  patient_id: string;
  category: 'personal' | 'medication';
  item_name: string;
  stock_balance?: string;
  stock_necessity?: 'YES' | 'NO';
  restock_date?: string;
  restock_qty?: string;
  remark?: string;
  image_url?: string;
}) {
  return request<{ success: boolean; item: PatientInventoryItem }>('/inventory/items', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiDeleteInventoryItem(itemId: string) {
  return request<{ success: boolean; message: string }>(`/inventory/items/${itemId}`, {
    method: 'DELETE',
  });
}

export async function apiRestockInventory(data: {
  itemId: string;
  restockQty?: string;
  restockDate?: string;
  newStockBalance?: string;
  stockNecessity?: 'YES' | 'NO';
  remark?: string;
}) {
  return request<{ success: boolean; item: PatientInventoryItem }>('/inventory/restock', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiSaveWeeklyCheck(data: {
  patient_id: string;
  check_date: string;
  personal_staff_name: string;
  med_staff_name?: string;
  general_remarks?: string;
  items: {
    id?: string;
    category: 'personal' | 'medication';
    item_name: string;
    stock_balance: string;
    stock_necessity: 'YES' | 'NO';
    restock_date?: string;
    restock_qty?: string;
    remark?: string;
  }[];
}) {
  return request<{ success: boolean; check_id: string; total_items: number; total_restock_needed: number }>(
    '/inventory/checks',
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}

export function getExportInventoryCsvUrl(patientId: string) {
  return `/api/inventory/export-csv/${patientId}`;
}

// 10. Storage & Cloudflare R2 API
export async function uploadImageToR2(imageBase64: string, prefix = 'convee') {
  return request<{
    success: boolean;
    url: string;
    storageType: 'cloudflare_r2' | 'local_fallback';
    key: string;
    sizeBytes: number;
  }>('/storage/upload', {
    method: 'POST',
    body: JSON.stringify({ imageBase64, prefix }),
  });
}

export async function apiGetR2Status() {
  return request<{
    configured: boolean;
    bucketName: string;
    publicDomain: string;
    hasAccountId: boolean;
    hasAccessKey: boolean;
    hasSecretKey: boolean;
    provider: string;
  }>('/storage/r2/status');
}

export async function apiTestR2Connection(credentials?: {
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucketName?: string;
  publicDomain?: string;
}) {
  return request<{ success: boolean; message: string }>('/storage/r2/test', {
    method: 'POST',
    body: JSON.stringify(credentials || {}),
  });
}

export async function apiSaveR2Config(credentials: {
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucketName?: string;
  publicDomain?: string;
}) {
  return request<{
    success: boolean;
    message: string;
    testResult: { success: boolean; message: string };
    config: {
      accountId: string;
      accessKeyId: string;
      bucketName: string;
      publicDomain: string;
      isConfigured: boolean;
    };
  }>('/storage/r2/save', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}


