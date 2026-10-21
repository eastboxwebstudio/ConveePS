import React, { useEffect, useState } from 'react';
import { AuditLog } from '../types/index.js';
import { apiGetAuditLogs } from '../lib/api.js';
import { ShieldCheck, Search, Clock, RefreshCw } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  async function loadLogs() {
    try {
      setLoading(true);
      const res = await apiGetAuditLogs();
      setLogs(res.logs);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.actor_name.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="p-5 bg-white rounded-3xl border border-emerald-950/5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#EAF5DC] text-[#0B3B2C] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Log Audit Keselamatan & Akauntabiliti</h2>
            <p className="text-xs text-slate-500 mt-0.5">Rekod lengkap tindakan pengguna yang tidak boleh diubah (Immutable Audit Trail).</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari log aktiviti..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs rounded-2xl border border-emerald-950/10 focus:outline-hidden focus:ring-1 focus:ring-[#0B3B2C] bg-[#F8FAF8]"
            />
          </div>

          <button
            onClick={loadLogs}
            disabled={loading}
            className="p-2.5 rounded-2xl border border-emerald-950/10 hover:bg-[#F2F6F2] text-slate-600 transition-colors"
            title="Muat semula"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0B3B2C]' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-emerald-950/5 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAF8] border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-5">Masa & Tarikh</th>
                <th className="py-3.5 px-5">Pengguna</th>
                <th className="py-3.5 px-5">Peranan</th>
                <th className="py-3.5 px-5">Tindakan</th>
                <th className="py-3.5 px-5">Butiran Aktiviti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-sans">
                    Tiada log aktiviti dijumpai.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F8FAF8] transition-colors">
                    <td className="py-3.5 px-5 text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-GB', {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </td>
                    <td className="py-3.5 px-5 font-sans font-bold text-slate-900">
                      {log.actor_name}
                    </td>
                    <td className="py-3.5 px-5 font-sans">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF5DC] text-[#0B3B2C]">
                        {log.actor_role}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-bold text-[#0B3B2C]">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-5 font-sans text-slate-600 max-w-md truncate" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
