import React, { useState, useEffect } from 'react';
import { User } from '../types/index.js';
import { apiGetStaff, apiCreateStaff, apiResetStaffPasscode, apiToggleStaffStatus } from '../lib/api.js';
import {
  UserCog,
  UserPlus,
  KeyRound,
  Shield,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Check,
  X,
} from 'lucide-react';

export const StaffManagement: React.FC = () => {
  const [staffList, setStaffList] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add staff modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'staff_nurse'>('staff_nurse');
  const [newPasscode, setNewPasscode] = useState('Nurse@123');

  // Reset passcode modal state
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetPasscodeVal, setResetPasscodeVal] = useState('Passcode@123');

  async function loadStaff() {
    try {
      setLoading(true);
      const res = await apiGetStaff();
      setStaffList(res.staff);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat senarai staf.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStaff();
  }, []);

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiCreateStaff({
        username: newUsername,
        full_name: newFullName,
        role: newRole,
        temporary_passcode: newPasscode,
      });
      setSuccessMsg('Akaun staf berjaya ditambah.');
      setIsAddOpen(false);
      setNewUsername('');
      setNewFullName('');
      loadStaff();
    } catch (err: any) {
      setError(err.message || 'Gagal menambah staf.');
    }
  }

  async function handleResetPasscode(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    try {
      await apiResetStaffPasscode(resetTarget.id, resetPasscodeVal);
      setSuccessMsg(`Kata laluan bagi ${resetTarget.username} berjaya ditetapkan semula.`);
      setResetTarget(null);
    } catch (err: any) {
      setError(err.message || 'Gagal menetapkan semula kata laluan.');
    }
  }

  async function handleToggleStatus(staff: User) {
    try {
      const res = await apiToggleStaffStatus(staff.id);
      setSuccessMsg(res.message);
      loadStaff();
    } catch (err: any) {
      setError(err.message || 'Gagal menukar status staf.');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="p-5 bg-white rounded-3xl border border-emerald-950/5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#EAF5DC] text-[#0B3B2C] flex items-center justify-center">
            <UserCog className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Pengurusan Akaun Staf & Jururawat</h2>
            <p className="text-xs text-slate-500 mt-0.5">Kawalan akses peranan Admin dan Staff Nurse serta pengurusan kata laluan.</p>
          </div>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0B3B2C] hover:bg-[#07281E] text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4 text-[#C5E875]" />
          <span>Tambah Staf Baru</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-medium flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-medium flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Staff table */}
      <div className="bg-white rounded-3xl border border-emerald-950/5 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Nama Pengguna</th>
              <th className="py-3 px-4">Nama Penuh</th>
              <th className="py-3 px-4">Peranan</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Log Masuk Terakhir</th>
              <th className="py-3 px-4 text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staffList.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="py-3 px-4 font-mono font-bold text-slate-900">{s.username}</td>
                <td className="py-3 px-4 text-slate-800 font-semibold">{s.full_name}</td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      s.role === 'admin'
                        ? 'bg-purple-50 text-purple-800 border border-purple-200'
                        : 'bg-teal-50 text-teal-800 border border-teal-200'
                    }`}
                  >
                    <Shield className="w-3 h-3" />
                    {s.role === 'admin' ? 'Admin' : 'Staff Nurse'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      s.status === 'active'
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-rose-50 text-rose-800'
                    }`}
                  >
                    {s.status === 'active' ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    {s.status === 'active' ? 'Aktif' : 'Nyahaktif'}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                  {s.last_login_at
                    ? new Date(s.last_login_at).toLocaleString('en-GB', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })
                    : 'Belum log masuk'}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button
                      onClick={() => setResetTarget(s)}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] flex items-center gap-1"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>Reset Passcode</span>
                    </button>

                    <button
                      onClick={() => handleToggleStatus(s)}
                      className={`px-2.5 py-1 rounded font-semibold text-[11px] ${
                        s.status === 'active'
                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {s.status === 'active' ? 'Nyahaktifkan' : 'Aktifkan'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Staff Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Tambah Akaun Staf Baru</h3>
              <button onClick={() => setIsAddOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Nama Pengguna (Username) *</label>
                <input
                  type="text"
                  required
                  placeholder="cth: nurse.farah"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Nama Penuh *</label>
                <input
                  type="text"
                  required
                  placeholder="cth: Farah Nabilah binti Razak"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Peranan *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="staff_nurse">Staff Nurse (Jururawat)</option>
                  <option value="admin">Admin (Pentadbir)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Kata Laluan Sementara (Passcode) *</label>
                <input
                  type="text"
                  required
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold"
                >
                  Cipta Akaun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Passcode Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Tetapkan Semula Kata Laluan</h3>
              <button onClick={() => setResetTarget(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleResetPasscode} className="space-y-3 text-xs">
              <p className="text-slate-600">
                Menetapkan semula passcode untuk <strong>{resetTarget.username}</strong> ({resetTarget.full_name}). Sesi semasa mereka akan dibatalkan serta-merta.
              </p>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Kata Laluan Baru *</label>
                <input
                  type="text"
                  required
                  value={resetPasscodeVal}
                  onChange={(e) => setResetPasscodeVal(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold"
                >
                  Sahkan Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
