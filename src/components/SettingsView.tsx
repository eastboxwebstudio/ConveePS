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
      <div className="p-5 bg-white rounded-3xl border border-emerald-950/5 shadow-xs flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-2xl bg-[#EAF5DC] text-[#0B3B2C] flex items-center justify-center">
          <Settings className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Tetapan Profil & Keselamatan Akaun</h2>
          <p className="text-xs text-slate-500 mt-0.5">Konfigurasi akaun kakitangan dan penukaran kata laluan peribadi.</p>
        </div>
      </div>

      {/* Account Info Card */}
      <div className="p-6 bg-white rounded-3xl border border-emerald-950/5 shadow-xs space-y-4 text-xs">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#0B3B2C]" />
          Maklumat Pengguna Semasa
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="p-3 bg-[#F8FAF8] rounded-2xl">
            <span className="text-slate-400 block text-[11px] font-semibold">Nama Penuh:</span>
            <span className="font-bold text-slate-800 text-xs mt-0.5 block">{user?.full_name}</span>
          </div>

          <div className="p-3 bg-[#F8FAF8] rounded-2xl">
            <span className="text-slate-400 block text-[11px] font-semibold">Nama Pengguna (Username):</span>
            <span className="font-mono font-bold text-slate-800 text-xs mt-0.5 block">{user?.username}</span>
          </div>

          <div className="p-3 bg-[#F8FAF8] rounded-2xl">
            <span className="text-slate-400 block text-[11px] font-semibold">Peranan Dalam Sistem:</span>
            <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EAF5DC] text-[#0B3B2C] mt-0.5">
              {user?.role === 'admin' ? 'Pentadbir (Admin)' : 'Jururawat Bertugas (Staff Nurse)'}
            </span>
          </div>

          <div className="p-3 bg-[#F8FAF8] rounded-2xl">
            <span className="text-slate-400 block text-[11px] font-semibold">Pusat Penjagaan:</span>
            <span className="font-bold text-slate-800 text-xs mt-0.5 block">Convee Care Centre</span>
          </div>
        </div>
      </div>

      {/* Change Passcode Form */}
      <div className="p-6 bg-white rounded-3xl border border-emerald-950/5 shadow-xs space-y-4 text-xs">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#0B3B2C]" />
          Tukar Kata Laluan (Passcode)
        </h3>

        {message && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleChangePasscode} className="space-y-3.5 max-w-md">
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Kata Laluan Semasa *</label>
            <input
              type="password"
              required
              value={currentPasscode}
              onChange={(e) => setCurrentPasscode(e.target.value)}
              className="w-full px-3.5 py-2 rounded-2xl border border-emerald-950/10 font-mono text-xs focus:outline-hidden focus:ring-1 focus:ring-[#0B3B2C] bg-[#F8FAF8]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">Kata Laluan Baru *</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPasscode}
              onChange={(e) => setNewPasscode(e.target.value)}
              className="w-full px-3.5 py-2 rounded-2xl border border-emerald-950/10 font-mono text-xs focus:outline-hidden focus:ring-1 focus:ring-[#0B3B2C] bg-[#F8FAF8]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">Sahkan Kata Laluan Baru *</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPasscode}
              onChange={(e) => setConfirmPasscode(e.target.value)}
              className="w-full px-3.5 py-2 rounded-2xl border border-emerald-950/10 font-mono text-xs focus:outline-hidden focus:ring-1 focus:ring-[#0B3B2C] bg-[#F8FAF8]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 px-5 py-2.5 rounded-2xl bg-[#0B3B2C] hover:bg-[#07281E] text-white font-semibold flex items-center gap-2 shadow-xs transition-colors"
          >
            <Check className="w-4 h-4 text-[#C5E875]" />
            <span>{loading ? 'Mengemas kini...' : 'Kemas Kini Kata Laluan'}</span>
          </button>
        </form>
      </div>

      {/* Facility Configuration Info */}
      <div className="p-6 bg-white rounded-3xl border border-emerald-950/5 shadow-xs space-y-4 text-xs">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#0B3B2C]" />
          Konfigurasi Zon & Jadual Fasiliti
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-600 pt-1">
          <div className="p-4 bg-[#F8FAF8] rounded-2xl border border-emerald-950/5">
            <div className="font-bold text-slate-900 mb-1.5">Zon Rawatan:</div>
            <ul className="list-disc list-inside space-y-1 text-slate-500">
              <li><strong className="text-slate-800">Zon Lelaki</strong>: Katil L-01 hingga L-06</li>
              <li><strong className="text-slate-800">Zon Perempuan</strong>: Katil P-01 hingga P-06</li>
            </ul>
          </div>

          <div className="p-4 bg-[#F8FAF8] rounded-2xl border border-emerald-950/5">
            <div className="font-bold text-slate-900 mb-1.5">Jadual Syif:</div>
            <ul className="list-disc list-inside space-y-1 text-slate-500">
              <li><strong className="text-slate-800">Syif AM</strong> (7:00am - 5:00pm) [Vital Sign]</li>
              <li><strong className="text-slate-800">Syif PM</strong> (5:00pm - 9:00pm) [Jagaan]</li>
              <li><strong className="text-slate-800">Syif Night</strong> (9:00pm - 7:00am) [Vital Sign]</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
