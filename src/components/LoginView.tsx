import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Activity, Lock, User, AlertCircle, ShieldCheck } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !passcode) {
      setError('Sila masukkan nama pengguna dan kata laluan.');
      return;
    }

    try {
      setLoading(true);
      await login(username.trim(), passcode);
    } catch (err: any) {
      setError(err.message || 'Log masuk gagal.');
    } finally {
      setLoading(false);
    }
  }

  function handleQuickLogin(u: string, p: string) {
    setUsername(u);
    setPasscode(p);
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Branding header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-teal-600 text-white items-center justify-center shadow-lg shadow-teal-500/20 mb-1">
            <Activity className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">CONVEE CARE CENTRE</h1>
          <p className="text-xs text-slate-400">
            Sistem Pemantauan Pesakit & Papan Klinikal (DAPUD)
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Log Masuk Kakitangan</h2>
            <p className="text-xs text-slate-500">Masukkan nama pengguna dan kata laluan berdaftar.</p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Nama Pengguna (Username)</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="admin atau nurse.hajar"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:border-teal-600 focus:outline-hidden font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Kata Laluan (Passcode)</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:border-teal-600 focus:outline-hidden font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs transition-colors shadow-xs"
            >
              {loading ? 'Mengesahkan...' : 'Log Masuk'}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="pt-4 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 mb-2">Pilihan Log Masuk Ujian Segera:</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'Admin@123')}
                className="p-2 text-left rounded-lg bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 transition-colors"
              >
                <div className="font-bold text-[11px] text-slate-800">Admin</div>
                <div className="text-[10px] text-slate-500 font-mono">admin / Admin@123</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('nurse.hajar', 'Nurse@123')}
                className="p-2 text-left rounded-lg bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 transition-colors"
              >
                <div className="font-bold text-[11px] text-slate-800">Staff Nurse</div>
                <div className="text-[10px] text-slate-500 font-mono">nurse.hajar / Nurse@123</div>
              </button>
            </div>
          </div>
        </div>

        {/* Security watermark */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Cloudflare D1 • SQLite Encryption & PBKDF2 Web Crypto</span>
        </div>
      </div>
    </div>
  );
};
