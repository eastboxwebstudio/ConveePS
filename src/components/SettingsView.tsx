import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { apiChangePasscode, apiGetR2Status, apiSaveR2Config } from '../lib/api.js';
import { Settings, KeyRound, Shield, Check, Building2, Clock, CheckCircle } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { user } = useAuth();
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cloudflare R2 Credentials State
  const [r2AccountId, setR2AccountId] = useState('');
  const [r2BucketName, setR2BucketName] = useState('convee-carepulse-assets');
  const [r2AccessKeyId, setR2AccessKeyId] = useState('');
  const [r2SecretAccessKey, setR2SecretAccessKey] = useState('');
  const [r2PublicDomain, setR2PublicDomain] = useState('');
  const [r2Testing, setR2Testing] = useState(false);
  const [r2Msg, setR2Msg] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    apiGetR2Status().then((res) => {
      if (res.bucketName) setR2BucketName(res.bucketName);
      if (res.publicDomain && !res.publicDomain.includes('Standard')) setR2PublicDomain(res.publicDomain);
    }).catch(() => {});
  }, []);

  async function handleSaveR2Config(e: React.FormEvent) {
    e.preventDefault();
    setR2Testing(true);
    setR2Msg(null);

    try {
      const res = await apiSaveR2Config({
        accountId: r2AccountId,
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
        bucketName: r2BucketName,
        publicDomain: r2PublicDomain,
      });

      if (res.testResult.success) {
        setR2Msg({ text: res.testResult.message, isError: false });
      } else {
        setR2Msg({ text: res.testResult.message, isError: true });
      }
    } catch (err: any) {
      setR2Msg({ text: err.message || 'Failed to save R2 configuration.', isError: true });
    } finally {
      setR2Testing(false);
    }
  }

  async function handleChangePasscode(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (newPasscode !== confirmPasscode) {
      setError('New passcode and confirmation do not match.');
      return;
    }

    if (newPasscode.length < 6) {
      setError('Passcode must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      await apiChangePasscode(currentPasscode, newPasscode);
      setMessage('Passcode successfully updated.');
      setCurrentPasscode('');
      setNewPasscode('');
      setConfirmPasscode('');
    } catch (err: any) {
      setError(err.message || 'Failed to update passcode.');
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
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Profile & Account Security Settings</h2>
          <p className="text-xs text-slate-500 mt-0.5">Staff account configuration and personal passcode management.</p>
        </div>
      </div>

      {/* Account Info Card */}
      <div className="p-6 bg-white rounded-3xl border border-emerald-950/5 shadow-xs space-y-4 text-xs">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#0B3B2C]" />
          Current User Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="p-3 bg-[#F8FAF8] rounded-2xl">
            <span className="text-slate-400 block text-[11px] font-semibold">Full Name:</span>
            <span className="font-bold text-slate-800 text-xs mt-0.5 block">{user?.full_name}</span>
          </div>

          <div className="p-3 bg-[#F8FAF8] rounded-2xl">
            <span className="text-slate-400 block text-[11px] font-semibold">Username:</span>
            <span className="font-mono font-bold text-slate-800 text-xs mt-0.5 block">{user?.username}</span>
          </div>

          <div className="p-3 bg-[#F8FAF8] rounded-2xl">
            <span className="text-slate-400 block text-[11px] font-semibold">System Role:</span>
            <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EAF5DC] text-[#0B3B2C] mt-0.5">
              {user?.role === 'admin' ? 'Administrator' : 'Staff Nurse'}
            </span>
          </div>

          <div className="p-3 bg-[#F8FAF8] rounded-2xl">
            <span className="text-slate-400 block text-[11px] font-semibold">Care Facility:</span>
            <span className="font-bold text-slate-800 text-xs mt-0.5 block">Convee Care Centre</span>
          </div>
        </div>
      </div>

      {/* Change Passcode Form */}
      <div className="p-6 bg-white rounded-3xl border border-emerald-950/5 shadow-xs space-y-4 text-xs">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#0B3B2C]" />
          Change Passcode
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
            <label className="font-bold text-slate-700">Current Passcode *</label>
            <input
              type="password"
              required
              value={currentPasscode}
              onChange={(e) => setCurrentPasscode(e.target.value)}
              className="w-full px-3.5 py-2 rounded-2xl border border-emerald-950/10 font-mono text-xs focus:outline-hidden focus:ring-1 focus:ring-[#0B3B2C] bg-[#F8FAF8]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">New Passcode *</label>
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
            <label className="font-bold text-slate-700">Confirm New Passcode *</label>
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
            <span>{loading ? 'Updating...' : 'Update Passcode'}</span>
          </button>
        </form>
      </div>

      {/* Facility Configuration Info */}
      <div className="p-6 bg-white rounded-3xl border border-emerald-950/5 shadow-xs space-y-4 text-xs">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#0B3B2C]" />
          Ward Zones & Schedule Configuration
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-600 pt-1">
          <div className="p-4 bg-[#F8FAF8] rounded-2xl border border-emerald-950/5">
            <div className="font-bold text-slate-900 mb-1.5">Capacity & Care Zones (30 Beds):</div>
            <ul className="list-disc list-inside space-y-1 text-slate-500">
              <li><strong className="text-slate-800">Male Ward</strong>: 15 Beds (Bed L-01 to L-15)</li>
              <li><strong className="text-slate-800">Female Ward</strong>: 15 Beds (Bed P-01 to P-15)</li>
            </ul>
          </div>

          <div className="p-4 bg-[#F8FAF8] rounded-2xl border border-emerald-950/5">
            <div className="font-bold text-slate-900 mb-1.5">Shift Timings:</div>
            <ul className="list-disc list-inside space-y-1 text-slate-500">
              <li><strong className="text-slate-800">Morning Shift</strong>: 7:00am – 5:00pm [Mandatory Vitals]</li>
              <li><strong className="text-slate-800">Afternoon Shift</strong>: 2:00pm – 12:00am [Care & Meds]</li>
              <li><strong className="text-slate-800">Night Shift</strong>: 9:00pm – 7:00am [Mandatory Vitals]</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Cloudflare R2 Storage Integration Info & Configuration Form */}
      <div className="p-6 bg-white rounded-3xl border border-emerald-950/5 shadow-xs space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            Cloudflare R2 Object Storage Settings
          </h3>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
            R2 Active Ready
          </span>
        </div>

        <p className="text-slate-600 leading-relaxed">
          All attached media (inventory reference photos and DAPUD wound assessment pictures) are automatically synced to Cloudflare R2 Bucket. Enter your Cloudflare R2 API credentials if connecting to an external dedicated bucket:
        </p>

        {r2Msg && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-medium flex items-center gap-2 ${
              r2Msg.isError
                ? 'bg-rose-50 border border-rose-200 text-rose-800'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            }`}
          >
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{r2Msg.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveR2Config} className="space-y-3.5 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Cloudflare Account ID</label>
              <input
                type="text"
                placeholder="e.g. 8a9b7c6d5e4f3a2b1c0d"
                value={r2AccountId}
                onChange={(e) => setR2AccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">R2 Bucket Name</label>
              <input
                type="text"
                placeholder="convee-carepulse-assets"
                value={r2BucketName}
                onChange={(e) => setR2BucketName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Access Key ID</label>
              <input
                type="text"
                placeholder="e.g. 2a3b4c5d6e7f..."
                value={r2AccessKeyId}
                onChange={(e) => setR2AccessKeyId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Secret Access Key</label>
              <input
                type="password"
                placeholder="••••••••••••••••••••"
                value={r2SecretAccessKey}
                onChange={(e) => setR2SecretAccessKey(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:ring-1 focus:ring-emerald-700"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Public Domain / Custom R2 Domain (Optional)</label>
            <input
              type="text"
              placeholder="e.g. https://pub-r2.convee-carepulse.com"
              value={r2PublicDomain}
              onChange={(e) => setR2PublicDomain(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-400">
              System will automatically fall back to local image assets if R2 credentials are not verified.
            </span>

            <button
              type="submit"
              disabled={r2Testing}
              className="px-4 py-2 rounded-xl bg-[#0B3B2C] hover:bg-[#07281E] text-white font-bold text-xs flex items-center gap-2 transition"
            >
              <Check className="w-3.5 h-3.5 text-[#C5E875]" />
              <span>{r2Testing ? 'Testing Connection...' : 'Test & Save R2 Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

