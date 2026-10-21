import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { apiChangePasscode } from '../lib/api.js';
import { Settings, KeyRound, Shield, Check, Building2, Clock, CheckCircle } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { user } = useAuth();
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleChangePasscode(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (newPasscode !== confirmPasscode) {
      setError('Kata laluan baru dan pengesahan tidak sepadan.');
      return;
    }

    if (newPasscode.length < 6) {
      setError('Kata laluan mestilah sekurang-kurangnya 6 aksara.');
      return;
    }

    try {
      setLoading(true);
      await apiChangePasscode(currentPasscode, newPasscode);
      setMessage('Kata laluan berjaya dikemas kini.');
      setCurrentPasscode('');
      setNewPasscode('');
      setConfirmPasscode('');
    } catch (err: any) {
      setError(err.message || 'Gagal mengemas kini kata laluan.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">Tetapan Profil & Keselamatan Akaun</h2>
          <p className="text-xs text-slate-500">Konfigurasi akaun kakitangan dan penukaran kata laluan peribadi.</p>
        </div>
      </div>

      {/* Account Info Card */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-teal-700" />
          Maklumat Pengguna Semasa
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <span className="text-slate-400 block text-[11px]">Nama Penuh:</span>
            <span className="font-semibold text-slate-800">{user?.full_name}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Nama Pengguna (Username):</span>
            <span className="font-mono font-semibold text-slate-800">{user?.username}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Peranan Dalam Sistem:</span>
            <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
              {user?.role === 'admin' ? 'Pentadbir (Admin)' : 'Jururawat Bertugas (Staff Nurse)'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Pusat Penjagaan:</span>
            <span className="font-semibold text-slate-800">Convee Care Centre</span>
          </div>
        </div>
      </div>

      {/* Change Passcode Form */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-teal-700" />
          Tukar Kata Laluan (Passcode)
        </h3>

        {message && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleChangePasscode} className="space-y-3 max-w-md">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Kata Laluan Semasa *</label>
            <input
              type="password"
              required
              value={currentPasscode}
              onChange={(e) => setCurrentPasscode(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Kata Laluan Baru *</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPasscode}
              onChange={(e) => setNewPasscode(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Sahkan Kata Laluan Baru *</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPasscode}
              onChange={(e) => setConfirmPasscode(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold flex items-center gap-2 shadow-xs transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>{loading ? 'Mengemas kini...' : 'Kemas Kini Kata Laluan'}</span>
          </button>
        </form>
      </div>

      {/* Facility Configuration Info */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Building2 className="w-4 h-4 text-teal-700" />
          Konfigurasi Zon & Jadual Fasiliti
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600 pt-2">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="font-bold text-slate-800 mb-1">Zon Rawatan:</div>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Zon Lelaki</strong>: Katil L-01 hingga L-10</li>
              <li><strong>Zon Perempuan</strong>: Katil P-01 hingga P-10</li>
            </ul>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="font-bold text-slate-800 mb-1">Jadual Syif:</div>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Syif AM</strong> (7:00am - 5:00pm) [Vital Sign]</li>
              <li><strong>Syif PM</strong> (5:00pm - 9:00pm) [Jagaan]</li>
              <li><strong>Syif Night</strong> (9:00pm - 7:00am) [Vital Sign]</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
