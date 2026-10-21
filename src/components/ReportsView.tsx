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
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Pusat Laporan & Eksport Data (Reports & Analytics)</h2>
            <p className="text-xs text-slate-500">Jana dan muat turun laporan rasmi berstruktur CSV bagi tujuan dokumentasi dan audit fasiliti.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export Card 1: DAPUD Monitoring Records */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 rounded-lg bg-blue-50 text-blue-700">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                Format CSV (DAPUD)
              </span>
            </div>

            <h3 className="font-bold text-slate-900 text-sm">Laporan Pemantauan Klinikal Harian (DAPUD)</h3>
            <p className="text-xs text-slate-600 mt-1">
              Merangkumi semua catatan syif (AM, PM, Night), tanda vital (BP, Nadi, Suhu, SpO2, Gula), status amaran (Red Alert), pematuhan ubat, tugasan kejururawatan harian (mandi, suapan, dressing, reposisi) dan nota pertukaran syif.
            </p>

            <ul className="mt-3 space-y-1 text-xs text-slate-500">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Format lajur sepadan 100% dengan lembaran DAPUD Convee CC</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Termasuk nama jururawat dan masa tepat pemerhatian</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => handleDownload('monitoring')}
            className="w-full py-2.5 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Muat Turun CSV Rekod Pemantauan</span>
          </button>
        </div>

        {/* Export Card 2: Patients & Admissions */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 rounded-lg bg-teal-50 text-teal-700">
                <FileText className="w-5 h-5" />
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                Format CSV (Master Index)
              </span>
            </div>

            <h3 className="font-bold text-slate-900 text-sm">Laporan Pendaftaran & Kemasukan Pesakit</h3>
            <p className="text-xs text-slate-600 mt-1">
              Senarai lengkap pesakit aktif dan discaj, zon (Lelaki / Perempuan), nombor katil, diagnosis klinikal, senarai ubat berjadual, hospital temujanji susulan (TCA), dan tempoh tinggal (*Length of Stay*).
            </p>

            <ul className="mt-3 space-y-1 text-xs text-slate-500">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Mengandungi pengiraan automatik bilangan hari tinggal (LOS)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Termasuk maklumat waris dan rekod pelepasan discaj</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => handleDownload('patients')}
            className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Muat Turun CSV Profil & Kemasukan</span>
          </button>
        </div>
      </div>

      {/* Compliance Note */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-slate-800 mb-0.5">Nota Privasi & Keselamatan Data Klinikal:</div>
          <p>
            Fail eksport mengandungi maklumat rawatan pesakit. Akses fail ini dihadkan mengikut peranan pengguna berdaftar dan setiap kali aktiviti eksport dimuat turun, rekod log audit akan dicatatkan secara automatik dalam pangkalan data D1.
          </p>
        </div>
      </div>
    </div>
  );
};
