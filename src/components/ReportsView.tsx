import React from 'react';
import { FileSpreadsheet, Download, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import { getExportCsvUrl } from '../lib/api.js';

export const ReportsView: React.FC = () => {
  function handleDownload(type: 'monitoring' | 'patients') {
    const url = getExportCsvUrl(type);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      <div className="p-5 bg-white rounded-3xl border border-emerald-950/5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#EAF5DC] text-[#0B3B2C] flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Pusat Laporan & Eksport Data (Reports & Analytics)</h2>
            <p className="text-xs text-slate-500 mt-0.5">Jana dan muat turun laporan rasmi berstruktur CSV bagi tujuan dokumentasi dan audit fasiliti.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card 1: DAPUD Monitoring Records */}
        <div className="p-6 bg-white rounded-3xl border border-emerald-950/5 shadow-xs flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-800 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200">
                Format CSV (DAPUD)
              </span>
            </div>

            <h3 className="font-bold text-slate-900 text-sm">Laporan Pemantauan Klinikal Harian (DAPUD)</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Merangkumi semua catatan syif (AM, PM, Night), tanda vital (BP, Nadi, Suhu, SpO2, Gula), status amaran (Red Alert), pematuhan ubat, tugasan kejururawatan harian (mandi, suapan, dressing, reposisi) dan nota pertukaran syif.
            </p>

            <ul className="mt-4 space-y-1.5 text-xs text-slate-500">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Format lajur sepadan 100% dengan lembaran DAPUD Convee CC</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Termasuk nama jururawat dan masa tepat pemerhatian</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => handleDownload('monitoring')}
            className="w-full py-3 px-4 rounded-2xl bg-[#0B3B2C] hover:bg-[#07281E] text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4 text-[#C5E875]" />
            <span>Muat Turun CSV Rekod Pemantauan</span>
          </button>
        </div>

        {/* Export Card 2: Patients & Admissions */}
        <div className="p-6 bg-white rounded-3xl border border-emerald-950/5 shadow-xs flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="w-9 h-9 rounded-2xl bg-[#EAF5DC] text-[#0B3B2C] flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#EAF5DC] text-[#0B3B2C] border border-[#C5E875]">
                Format CSV (Master Index)
              </span>
            </div>

            <h3 className="font-bold text-slate-900 text-sm">Laporan Pendaftaran & Kemasukan Pesakit</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Senarai lengkap pesakit aktif dan discaj, zon (Lelaki / Perempuan), nombor katil, diagnosis klinikal, senarai ubat berjadual, hospital temujanji susulan (TCA), dan tempoh tinggal (*Length of Stay*).
            </p>

            <ul className="mt-4 space-y-1.5 text-xs text-slate-500">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Mengandungi pengiraan automatik bilangan hari tinggal (LOS)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Termasuk maklumat waris dan rekod pelepasan discaj</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => handleDownload('patients')}
            className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Muat Turun CSV Profil & Kemasukan</span>
          </button>
        </div>
      </div>

      {/* Compliance Note */}
      <div className="p-5 rounded-3xl bg-white border border-emerald-950/5 text-xs text-slate-600 flex items-start gap-3.5 shadow-2xs">
        <div className="w-8 h-8 rounded-xl bg-[#EAF5DC] text-[#0B3B2C] flex items-center justify-center shrink-0">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div>
          <div className="font-bold text-slate-900 mb-0.5">Nota Privasi & Keselamatan Data Klinikal:</div>
          <p className="leading-relaxed text-slate-500">
            Fail eksport mengandungi maklumat rawatan pesakit. Akses fail ini dihadkan mengikut peranan pengguna berdaftar dan setiap kali aktiviti eksport dimuat turun, rekod log audit akan dicatatkan secara automatik dalam pangkalan data.
          </p>
        </div>
      </div>
    </div>
  );
};
