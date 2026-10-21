import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Lock, User, AlertCircle, HeartPulse, ShieldCheck, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen bg-[#EAF1E9] flex flex-col justify-center items-center p-4 antialiased">
      <div className="max-w-sm w-full space-y-6">
        {/* Corporate Healthcare Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-3xl bg-[#0B3B2C] text-[#C5E875] items-center justify-center shadow-xs mb-1">
            <HeartPulse className="w-7 h-7 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">CONVEE</h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#C5E875] text-[#0D382B]">
                CARE
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Patient Monitoring & Clinical Operations
            </p>
          </div>
        </div>

        {/* Corporate Login Card */}
        <div className="bg-white rounded-3xl p-7 shadow-xs border border-emerald-950/5 space-y-5">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Log Masuk Kakitangan</h2>
            <p className="text-xs text-slate-400 mt-0.5">Sahkan identiti anda untuk memulakan sesi syif bertugas.</p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-2xl text-rose-700 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Nama Pengguna (Username)</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="admin atau nurse.hajar"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-emerald-950/10 focus:ring-1 focus:ring-[#0B3B2C] focus:outline-hidden font-mono text-xs transition-colors bg-[#F8FAF8]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Kata Laluan (Passcode)</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-emerald-950/10 focus:ring-1 focus:ring-[#0B3B2C] focus:outline-hidden font-mono text-xs transition-colors bg-[#F8FAF8]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-2xl bg-[#0B3B2C] hover:bg-[#07281E] text-white font-semibold text-xs transition-all shadow-xs mt-2 flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Mengesahkan Pengguna...' : 'Log Masuk Sesi'}</span>
              <ArrowRight className="w-4 h-4 text-[#C5E875]" />
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="pt-4 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 mb-2">Pilihan Log Masuk Ujian Segera:</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'Admin@123')}
                className="p-2.5 text-left rounded-2xl bg-[#F8FAF8] hover:bg-[#EAF5DC] border border-emerald-950/5 transition-colors cursor-pointer group"
              >
                <div className="font-bold text-[11px] text-slate-800 group-hover:text-[#0B3B2C]">Admin</div>
                <div className="text-[10px] text-slate-400 font-mono">admin / Admin@123</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('nurse.hajar', 'Nurse@123')}
                className="p-2.5 text-left rounded-2xl bg-[#F8FAF8] hover:bg-[#EAF5DC] border border-emerald-950/5 transition-colors cursor-pointer group"
              >
                <div className="font-bold text-[11px] text-slate-800 group-hover:text-[#0B3B2C]">Staff Nurse</div>
                <div className="text-[10px] text-slate-400 font-mono">nurse.hajar / Nurse@123</div>
              </button>
            </div>
          </div>
        </div>

        {/* Corporate Accreditation footer */}
        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-[#0B3B2C]" />
          <span>Cloudflare D1 · Convee Healthcare Protocol</span>
        </div>
      </div>
    </div>
  );
};
