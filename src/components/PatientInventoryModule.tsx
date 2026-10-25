import React, { useState, useEffect } from 'react';
import {
  Patient,
  PatientInventoryItem,
  PatientInventoryCheck,
  InventoryStats,
} from '../types/index.js';
import {
  apiGetPatientInventory,
  apiGetInventorySummary,
  apiUpdateInventoryItem,
  apiAddInventoryItem,
  apiDeleteInventoryItem,
  apiRestockInventory,
  apiSaveWeeklyCheck,
  getExportInventoryCsvUrl,
} from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import {
  Package,
  Pill,
  AlertTriangle,
  CheckCircle2,
  Plus,
  RefreshCw,
  Download,
  Printer,
  Calendar,
  UserCheck,
  Edit2,
  Trash2,
  Check,
  X,
  Sparkles,
  ClipboardCheck,
  Search,
  Filter,
  ArrowUpDown,
  History,
} from 'lucide-react';

interface PatientInventoryModuleProps {
  patients: Patient[];
  onSelectPatientId?: (patientId: string) => void;
}

export const PatientInventoryModule: React.FC<PatientInventoryModuleProps> = ({
  patients,
  onSelectPatientId,
}) => {
  const { user } = useAuth();

  // Active selected patient
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    patients[0]?.id || ''
  );

  // Data states
  const [personalItems, setPersonalItems] = useState<PatientInventoryItem[]>([]);
  const [medicationItems, setMedicationItems] = useState<PatientInventoryItem[]>([]);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [latestCheck, setLatestCheck] = useState<PatientInventoryCheck | null>(null);
  const [checkHistory, setCheckHistory] = useState<PatientInventoryCheck[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'restock_only' | 'personal' | 'meds'>('all');

  // Modal states
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [selectedItemForRestock, setSelectedItemForRestock] = useState<PatientInventoryItem | null>(null);
  const [restockQtyInput, setRestockQtyInput] = useState('');
  const [restockDateInput, setRestockDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [restockNewBalanceInput, setRestockNewBalanceInput] = useState('');
  const [restockRemarkInput, setRestockRemarkInput] = useState('');

  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newItemCategory, setNewItemCategory] = useState<'personal' | 'medication'>('personal');
  const [newItemName, setNewItemName] = useState('');
  const [newItemBalance, setNewItemBalance] = useState('');
  const [newItemNecessity, setNewItemNecessity] = useState<'YES' | 'NO'>('NO');
  const [newItemRemark, setNewItemRemark] = useState('');

  const [isWeeklyCheckModalOpen, setIsWeeklyCheckModalOpen] = useState(false);
  const [weeklyCheckDate, setWeeklyCheckDate] = useState(new Date().toISOString().split('T')[0]);
  const [weeklyPersonalStaff, setWeeklyPersonalStaff] = useState(user?.full_name || 'HAJAR');
  const [weeklyMedStaff, setWeeklyMedStaff] = useState('AISYAH');
  const [weeklyGeneralRemarks, setWeeklyGeneralRemarks] = useState('');
  const [weeklyCheckDraftItems, setWeeklyCheckDraftItems] = useState<
    {
      id?: string;
      category: 'personal' | 'medication';
      item_name: string;
      stock_balance: string;
      stock_necessity: 'YES' | 'NO';
      restock_date: string;
      restock_qty: string;
      remark: string;
    }[]
  >([]);

  // Inline edit state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [inlineBalance, setInlineBalance] = useState('');
  const [inlineRemark, setInlineRemark] = useState('');
  const [inlineRestockDate, setInlineRestockDate] = useState('');
  const [inlineRestockQty, setInlineRestockQty] = useState('');

  // Initial load
  useEffect(() => {
    if (!selectedPatientId && patients.length > 0) {
      setSelectedPatientId(patients[0].id);
    }
  }, [patients]);

  async function loadInventory(patientId: string) {
    if (!patientId) return;
    try {
      setLoading(true);
      const [invRes, statsRes] = await Promise.all([
        apiGetPatientInventory(patientId),
        apiGetInventorySummary(),
      ]);

      setCurrentPatient(invRes.patient);
      setPersonalItems(invRes.personal_items);
      setMedicationItems(invRes.medication_items);
      setLatestCheck(invRes.latest_check || null);
      setCheckHistory(invRes.check_history || []);
      setStats(statsRes);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedPatientId) {
      loadInventory(selectedPatientId);
    }
  }, [selectedPatientId]);

  // Quick toggle necessity
  async function handleToggleNecessity(item: PatientInventoryItem) {
    const newStatus = item.stock_necessity === 'YES' ? 'NO' : 'YES';
    try {
      const res = await apiUpdateInventoryItem(item.id, {
        stock_necessity: newStatus,
      });
      if (item.category === 'personal') {
        setPersonalItems((prev) =>
          prev.map((i) => (i.id === item.id ? res.item : i))
        );
      } else {
        setMedicationItems((prev) =>
          prev.map((i) => (i.id === item.id ? res.item : i))
        );
      }
      // Refresh summary KPIs
      const updatedStats = await apiGetInventorySummary();
      setStats(updatedStats);
    } catch (err) {
      console.error('Failed to toggle necessity:', err);
    }
  }

  // Fast Restock submit
  async function handleSubmitRestock(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItemForRestock) return;
    try {
      await apiRestockInventory({
        itemId: selectedItemForRestock.id,
        restockQty: restockQtyInput,
        restockDate: restockDateInput,
        newStockBalance: restockNewBalanceInput || selectedItemForRestock.stock_balance,
        stockNecessity: 'NO',
        remark: restockRemarkInput || selectedItemForRestock.remark || '',
      });

      setIsRestockOpen(false);
      setSelectedItemForRestock(null);
      await loadInventory(selectedPatientId);
    } catch (err) {
      console.error('Failed to restock item:', err);
    }
  }

  // Add Item submit
  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatientId || !newItemName) return;

    try {
      await apiAddInventoryItem({
        patient_id: selectedPatientId,
        category: newItemCategory,
        item_name: newItemName,
        stock_balance: newItemBalance || '0',
        stock_necessity: newItemNecessity,
        remark: newItemRemark,
      });

      setIsAddItemOpen(false);
      setNewItemName('');
      setNewItemBalance('');
      setNewItemRemark('');
      setNewItemNecessity('NO');
      await loadInventory(selectedPatientId);
    } catch (err) {
      console.error('Failed to add item:', err);
    }
  }

  // Delete Item
  async function handleDeleteItem(itemId: string) {
    if (!confirm('Adakah anda pasti untuk memadam item inventori ini?')) return;
    try {
      await apiDeleteInventoryItem(itemId);
      await loadInventory(selectedPatientId);
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  }

  // Save inline edit
  async function handleSaveInline(item: PatientInventoryItem) {
    try {
      const res = await apiUpdateInventoryItem(item.id, {
        stock_balance: inlineBalance,
        remark: inlineRemark,
        restock_date: inlineRestockDate,
        restock_qty: inlineRestockQty,
      });

      if (item.category === 'personal') {
        setPersonalItems((prev) =>
          prev.map((i) => (i.id === item.id ? res.item : i))
        );
      } else {
        setMedicationItems((prev) =>
          prev.map((i) => (i.id === item.id ? res.item : i))
        );
      }
      setEditingItemId(null);
    } catch (err) {
      console.error('Failed to save inline edit:', err);
    }
  }

  // Open Weekly Check Wizard
  function openWeeklyCheckModal() {
    const combined = [
      ...personalItems.map((p) => ({
        id: p.id,
        category: 'personal' as const,
        item_name: p.item_name,
        stock_balance: p.stock_balance,
        stock_necessity: p.stock_necessity,
        restock_date: p.restock_date || '',
        restock_qty: p.restock_qty || '',
        remark: p.remark || '',
      })),
      ...medicationItems.map((m) => ({
        id: m.id,
        category: 'medication' as const,
        item_name: m.item_name,
        stock_balance: m.stock_balance,
        stock_necessity: m.stock_necessity,
        restock_date: m.restock_date || '',
        restock_qty: m.restock_qty || '',
        remark: m.remark || '',
      })),
    ];
    setWeeklyCheckDraftItems(combined);
    setWeeklyCheckDate(new Date().toISOString().split('T')[0]);
    setIsWeeklyCheckModalOpen(true);
  }

  async function handleSaveWeeklyCheckModal(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatientId) return;

    try {
      await apiSaveWeeklyCheck({
        patient_id: selectedPatientId,
        check_date: weeklyCheckDate,
        personal_staff_name: weeklyPersonalStaff,
        med_staff_name: weeklyMedStaff,
        general_remarks: weeklyGeneralRemarks,
        items: weeklyCheckDraftItems,
      });

      setIsWeeklyCheckModalOpen(false);
      await loadInventory(selectedPatientId);
    } catch (err) {
      console.error('Failed to save weekly check:', err);
    }
  }

  // Filtered views
  const filterList = (items: PatientInventoryItem[]) => {
    return items.filter((it) => {
      if (filterType === 'restock_only' && it.stock_necessity !== 'YES') {
        return false;
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          it.item_name.toLowerCase().includes(q) ||
          (it.remark && it.remark.toLowerCase().includes(q)) ||
          it.stock_balance.toLowerCase().includes(q)
        );
      }
      return true;
    });
  };

  const displayedPersonal = filterType === 'meds' ? [] : filterList(personalItems);
  const displayedMedication = filterType === 'personal' ? [] : filterList(medicationItems);

  // Current patient's personal items needing restock
  const patientPersonalRestockCount = personalItems.filter((i) => i.stock_necessity === 'YES').length;
  const patientMedsRestockCount = medicationItems.filter((i) => i.stock_necessity === 'YES').length;
  const totalPatientRestockCount = patientPersonalRestockCount + patientMedsRestockCount;

  return (
    <div className="space-y-6">
      {/* 1. Header & KPI Alert Ribbon */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#0D382B] text-[#C5E875] text-[11px] font-bold tracking-wide uppercase">
                CECC
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Convee Elderly Care Centre
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
              Inventori Peralatan & Ubatan Pesakit
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Modul semakan mingguan (Weekly Stock Check), pemantauan baki simpanan peribadi dan amaran restock pesakit.
            </p>
          </div>

          {/* Quick Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openWeeklyCheckModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#0D382B] text-white text-xs font-semibold hover:bg-[#07241B] shadow-xs transition"
            >
              <ClipboardCheck className="w-4 h-4 text-[#C5E875]" />
              Semakan Mingguan Baharu
            </button>

            <button
              onClick={() => {
                setNewItemCategory('personal');
                setIsAddItemOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
            >
              <Plus className="w-4 h-4 text-emerald-700" />
              Tambah Item
            </button>

            {currentPatient && (
              <a
                href={getExportInventoryCsvUrl(currentPatient.id)}
                download
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
                title="Muat Turun Format Spreadsheet CSV"
              >
                <Download className="w-4 h-4 text-slate-500" />
                Eksport CSV
              </a>
            )}

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
              title="Cetak Salinan Rasmi"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              Cetak
            </button>
          </div>
        </div>

        {/* Global KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/60">
            <span className="text-[11px] font-medium text-slate-500">Jumlah Pesakit Dipantau</span>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">
              {stats?.total_patients || patients.length} <span className="text-xs font-normal text-slate-500">penghuni</span>
            </div>
          </div>

          <div
            className={`rounded-2xl p-3 border transition ${
              (stats?.total_restock_needed || 0) > 0
                ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium">Perlu Direstock (YES)</span>
              {(stats?.total_restock_needed || 0) > 0 && (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              )}
            </div>
            <div className="text-lg font-extrabold mt-0.5">
              {stats?.total_restock_needed || 0} <span className="text-xs font-normal">item pusat</span>
            </div>
          </div>

          <div className="bg-blue-50/80 rounded-2xl p-3 border border-blue-200 text-blue-900">
            <span className="text-[11px] font-medium">Barangan Peribadi Kurang</span>
            <div className="text-lg font-extrabold mt-0.5">
              {stats?.personal_restock_needed || 0} <span className="text-xs font-normal">item</span>
            </div>
          </div>

          <div className="bg-rose-50/80 rounded-2xl p-3 border border-rose-200 text-rose-900">
            <span className="text-[11px] font-medium">Ubatan Perlu Top-up</span>
            <div className="text-lg font-extrabold mt-0.5">
              {stats?.meds_restock_needed || 0} <span className="text-xs font-normal">preskripsi</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Patient Tabs matching Google Sheets bottom sheet tabs */}
      <div className="bg-white rounded-3xl p-3 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Pilihan Lembaran Pesakit (Sheets)
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Klik nama pesakit untuk melihat senarai semakan mingguan
          </span>
        </div>

        {/* Scrollable Patient Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
          {patients.map((p) => {
            const isSelected = p.id === selectedPatientId;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPatientId(p.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-[#0D382B] text-[#C5E875] shadow-xs ring-1 ring-emerald-900'
                    : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/80'
                }`}
              >
                <span>{p.full_name}</span>
                {p.room_bed && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                      isSelected
                        ? 'bg-emerald-800/80 text-[#C5E875]'
                        : 'bg-white/80 text-slate-500'
                    }`}
                  >
                    {p.room_bed}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Selected Patient Card & Inspector Info Header */}
      {currentPatient && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50/50 via-white to-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  ({currentPatient.full_name.toUpperCase()})
                </span>
                <span className="text-xs font-bold text-slate-500">
                  – PATIENT PERSONAL ITEMS – WEEKLY STOCK CHECK & RESTOCK UPDATE
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 font-medium text-slate-700">
                  MRN: <strong>{currentPatient.mrn}</strong>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 font-medium text-slate-700">
                  Katil: <strong>{currentPatient.room_bed || 'P-01'}</strong> ({currentPatient.zone})
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 font-medium text-slate-700">
                  Jagaan: <strong>{currentPatient.care_level}</strong>
                </span>
              </div>
            </div>

            {/* Staff Inspector Badges matching spreadsheet headers */}
            <div className="flex flex-wrap items-center gap-2 bg-white/90 p-2 rounded-2xl border border-slate-200/70 shadow-2xs">
              <div className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                <div className="text-[11px] leading-tight">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Staf Semakan</span>
                  <span className="font-extrabold text-emerald-950">
                    {latestCheck?.personal_staff_name || 'HAJAR'}
                  </span>
                </div>
              </div>

              <div className="px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-blue-700" />
                <div className="text-[11px] leading-tight">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Staf Ubatan</span>
                  <span className="font-extrabold text-blue-950">
                    {latestCheck?.med_staff_name || 'AISYAH'}
                  </span>
                </div>
              </div>

              <div className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <div className="text-[11px] leading-tight">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Tarikh Semakan</span>
                  <span className="font-bold text-slate-800">
                    {latestCheck?.check_date || '30 September 2026'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Patient Restock Status Banner */}
          {totalPatientRestockCount > 0 ? (
            <div className="bg-amber-50 px-5 py-2.5 border-b border-amber-200/80 flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Perhatian:</strong> Pesakit ini memerlukan penambahan stok bagi{' '}
                  <strong>{patientPersonalRestockCount} barangan peribadi</strong> dan{' '}
                  <strong>{patientMedsRestockCount} ubatan harian</strong>.
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-200 font-bold text-[11px] text-amber-900">
                Stock necessity: YES
              </span>
            </div>
          ) : (
            <div className="bg-emerald-50 px-5 py-2 border-b border-emerald-100 flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Semua barangan peribadi dan ubatan pesakit berada dalam keadaan mencukupi (Stock necessity: NO).</span>
            </div>
          )}

          {/* Filter & Search Bar */}
          <div className="p-4 bg-slate-50/70 border-b border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari item, baki atau catatan..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-[11px] text-slate-500 font-medium mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Tapis:
              </span>
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  filterType === 'all'
                    ? 'bg-[#0D382B] text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Semua ({personalItems.length + medicationItems.length})
              </button>
              <button
                onClick={() => setFilterType('restock_only')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  filterType === 'restock_only'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Perlu Restock ({totalPatientRestockCount})
              </button>
              <button
                onClick={() => setFilterType('personal')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  filterType === 'personal'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Barangan ({personalItems.length})
              </button>
              <button
                onClick={() => setFilterType('meds')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  filterType === 'meds'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Ubatan ({medicationItems.length})
              </button>
            </div>
          </div>

          {/* Tables Container */}
          <div className="p-4 sm:p-5 space-y-6">
            {/* SECTION 1: BARANGAN PERIBADI */}
            {(filterType === 'all' || filterType === 'personal' || filterType === 'restock_only') && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                      1
                    </span>
                    <h3 className="text-sm font-bold text-slate-800">
                      Barangan Peribadi (Personal Care Items)
                    </h3>
                    <span className="text-xs text-slate-400">
                      (Diaper, Wet Tissue, Underpad, Gloves, Lotion, Milk, Toiletries, etc.)
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setNewItemCategory('personal');
                      setIsAddItemOpen(true);
                    }}
                    className="text-xs text-emerald-800 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Barangan
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5 w-12 text-center">No</th>
                          <th className="px-4 py-2.5 w-48">Item</th>
                          <th className="px-4 py-2.5 w-32">Stock balance</th>
                          <th className="px-3 py-2.5 w-32 text-center">Stock necessity</th>
                          <th className="px-3 py-2.5 w-28">Restock Date</th>
                          <th className="px-3 py-2.5 w-20">Qty</th>
                          <th className="px-4 py-2.5 min-w-[200px]">Remark</th>
                          <th className="px-3 py-2.5 w-24 text-right">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayedPersonal.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-6 text-slate-400 italic">
                              Tiada barangan peribadi padan dengan penapis.
                            </td>
                          </tr>
                        ) : (
                          displayedPersonal.map((item, idx) => {
                            const isEditing = editingItemId === item.id;
                            const isYes = item.stock_necessity === 'YES';

                            return (
                              <tr
                                key={item.id}
                                className={`transition hover:bg-slate-50/80 ${
                                  isYes ? 'bg-amber-50/30' : ''
                                }`}
                              >
                                <td className="px-3 py-2 text-center font-bold text-slate-500">
                                  {item.item_order || idx + 1}
                                </td>

                                <td className="px-4 py-2 font-bold text-slate-900">
                                  {item.item_name}
                                </td>

                                <td className="px-4 py-2">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={inlineBalance}
                                      onChange={(e) => setInlineBalance(e.target.value)}
                                      className="px-2 py-1 border border-emerald-400 rounded-lg text-xs w-full bg-white focus:outline-none"
                                    />
                                  ) : (
                                    <span
                                      className={`font-semibold ${
                                        item.stock_balance === '0' || item.stock_balance.toLowerCase().includes('tiada')
                                          ? 'text-rose-600 font-extrabold'
                                          : 'text-slate-800'
                                      }`}
                                    >
                                      {item.stock_balance || '-'}
                                    </span>
                                  )}
                                </td>

                                {/* Stock Necessity Pill (YES = Cyan/Blue, NO = Red/Slate) */}
                                <td className="px-3 py-2 text-center">
                                  <button
                                    onClick={() => handleToggleNecessity(item)}
                                    title="Klik untuk ubah YES / NO"
                                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black tracking-wide transition shadow-2xs ${
                                      isYes
                                        ? 'bg-[#1875D2] text-white hover:bg-blue-700 ring-2 ring-blue-300'
                                        : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                    }`}
                                  >
                                    {isYes ? 'YES' : 'NO'}
                                  </button>
                                </td>

                                <td className="px-3 py-2 text-slate-600">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={inlineRestockDate}
                                      onChange={(e) => setInlineRestockDate(e.target.value)}
                                      placeholder="e.g. 27/9"
                                      className="px-2 py-1 border border-emerald-400 rounded-lg text-xs w-full bg-white focus:outline-none"
                                    />
                                  ) : (
                                    item.restock_date || '-'
                                  )}
                                </td>

                                <td className="px-3 py-2 font-medium text-slate-700">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={inlineRestockQty}
                                      onChange={(e) => setInlineRestockQty(e.target.value)}
                                      placeholder="e.g. 5"
                                      className="px-2 py-1 border border-emerald-400 rounded-lg text-xs w-full bg-white focus:outline-none"
                                    />
                                  ) : (
                                    item.restock_qty || '-'
                                  )}
                                </td>

                                <td className="px-4 py-2 text-slate-600">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={inlineRemark}
                                      onChange={(e) => setInlineRemark(e.target.value)}
                                      className="px-2 py-1 border border-emerald-400 rounded-lg text-xs w-full bg-white focus:outline-none"
                                    />
                                  ) : (
                                    <span className="line-clamp-2">{item.remark || '-'}</span>
                                  )}
                                </td>

                                <td className="px-3 py-2 text-right">
                                  {isEditing ? (
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => handleSaveInline(item)}
                                        className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                                        title="Simpan"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setEditingItemId(null)}
                                        className="p-1 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300"
                                        title="Batal"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => {
                                          setSelectedItemForRestock(item);
                                          setRestockNewBalanceInput('');
                                          setRestockQtyInput('');
                                          setRestockRemarkInput(item.remark || '');
                                          setIsRestockOpen(true);
                                        }}
                                        className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-[10px] font-bold border border-emerald-200"
                                        title="Rekod Restock Pantas"
                                      >
                                        Restock
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingItemId(item.id);
                                          setInlineBalance(item.stock_balance);
                                          setInlineRemark(item.remark || '');
                                          setInlineRestockDate(item.restock_date || '');
                                          setInlineRestockQty(item.restock_qty || '');
                                        }}
                                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                        title="Edit Baris"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: UBATAN PESAKIT (15. Medicine) */}
            {(filterType === 'all' || filterType === 'meds' || filterType === 'restock_only') && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs">
                      15
                    </span>
                    <h3 className="text-sm font-bold text-slate-800">
                      Ubatan Pesakit (Prescription Medication)
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold border border-purple-100">
                      Disemak oleh: {latestCheck?.med_staff_name || 'AISYAH'}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setNewItemCategory('medication');
                      setIsAddItemOpen(true);
                    }}
                    className="text-xs text-purple-800 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Ubatan
                  </button>
                </div>

                <div className="border border-purple-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-purple-50/80 text-purple-900 font-bold uppercase text-[10px] tracking-wider border-b border-purple-200/80">
                        <tr>
                          <th className="px-3 py-2.5 w-12 text-center">No</th>
                          <th className="px-4 py-2.5 w-52">Nama Ubat (Drug Name)</th>
                          <th className="px-4 py-2.5 w-32">Stock balance</th>
                          <th className="px-3 py-2.5 w-32 text-center">Stock necessity</th>
                          <th className="px-3 py-2.5 w-28">Restock Date</th>
                          <th className="px-4 py-2.5 min-w-[200px]">Remark / Status</th>
                          <th className="px-3 py-2.5 w-24 text-right">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-100/60">
                        {displayedMedication.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-6 text-slate-400 italic">
                              Tiada rekod ubatan padan dengan penapis.
                            </td>
                          </tr>
                        ) : (
                          displayedMedication.map((med, idx) => {
                            const isEditing = editingItemId === med.id;
                            const isYes = med.stock_necessity === 'YES';

                            return (
                              <tr
                                key={med.id}
                                className={`transition hover:bg-purple-50/30 ${
                                  isYes ? 'bg-rose-50/40' : ''
                                }`}
                              >
                                <td className="px-3 py-2 text-center font-bold text-slate-500">
                                  {idx + 1}
                                </td>

                                <td className="px-4 py-2 font-bold text-slate-900 flex items-center gap-2">
                                  <Pill className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                  <span>{med.item_name}</span>
                                </td>

                                <td className="px-4 py-2">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={inlineBalance}
                                      onChange={(e) => setInlineBalance(e.target.value)}
                                      className="px-2 py-1 border border-purple-400 rounded-lg text-xs w-full bg-white focus:outline-none"
                                    />
                                  ) : (
                                    <span
                                      className={`font-semibold ${
                                        isYes ? 'text-rose-700 font-extrabold' : 'text-slate-800'
                                      }`}
                                    >
                                      {med.stock_balance}
                                    </span>
                                  )}
                                </td>

                                <td className="px-3 py-2 text-center">
                                  <button
                                    onClick={() => handleToggleNecessity(med)}
                                    title="Klik untuk ubah YES / NO"
                                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black tracking-wide transition shadow-2xs ${
                                      isYes
                                        ? 'bg-[#1875D2] text-white hover:bg-blue-700 ring-2 ring-blue-300'
                                        : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                    }`}
                                  >
                                    {isYes ? 'YES' : 'NO'}
                                  </button>
                                </td>

                                <td className="px-3 py-2 text-slate-600">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={inlineRestockDate}
                                      onChange={(e) => setInlineRestockDate(e.target.value)}
                                      placeholder="e.g. 27/9"
                                      className="px-2 py-1 border border-purple-400 rounded-lg text-xs w-full bg-white focus:outline-none"
                                    />
                                  ) : (
                                    med.restock_date || '-'
                                  )}
                                </td>

                                <td className="px-4 py-2">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={inlineRemark}
                                      onChange={(e) => setInlineRemark(e.target.value)}
                                      className="px-2 py-1 border border-purple-400 rounded-lg text-xs w-full bg-white focus:outline-none"
                                    />
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      {isYes && (
                                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold">
                                          Perlu topup
                                        </span>
                                      )}
                                      <span className="text-slate-600">{med.remark || '-'}</span>
                                    </div>
                                  )}
                                </td>

                                <td className="px-3 py-2 text-right">
                                  {isEditing ? (
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => handleSaveInline(med)}
                                        className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                                        title="Simpan"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setEditingItemId(null)}
                                        className="p-1 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300"
                                        title="Batal"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => {
                                          setSelectedItemForRestock(med);
                                          setRestockNewBalanceInput('');
                                          setRestockQtyInput('');
                                          setRestockRemarkInput(med.remark || '');
                                          setIsRestockOpen(true);
                                        }}
                                        className="px-2 py-1 rounded-lg bg-purple-50 text-purple-800 hover:bg-purple-100 text-[10px] font-bold border border-purple-200"
                                        title="Restock Ubat"
                                      >
                                        Restock
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingItemId(med.id);
                                          setInlineBalance(med.stock_balance);
                                          setInlineRemark(med.remark || '');
                                          setInlineRestockDate(med.restock_date || '');
                                          setInlineRestockQty(med.restock_qty || '');
                                        }}
                                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                        title="Edit Baris"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteItem(med.id)}
                                        className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50"
                                        title="Padam"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Past Weekly Check Audits */}
            {checkHistory.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-700">
                  <History className="w-4 h-4 text-slate-500" />
                  <span>Sejarah Semakan Mingguan Pesakit</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {checkHistory.map((chk) => (
                    <div
                      key={chk.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>{chk.check_date}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
                          {chk.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Staf Semakan: <strong>{chk.personal_staff_name}</strong>
                        {chk.med_staff_name ? ` & ${chk.med_staff_name}` : ''}
                      </div>
                      <div className="text-[11px]">
                        Item perlu restock:{' '}
                        <strong className={chk.total_restock_needed > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                          {chk.total_restock_needed} daripada {chk.total_items}
                        </strong>
                      </div>
                      {chk.general_remarks && (
                        <p className="text-[11px] text-slate-500 italic border-t border-slate-200/60 pt-1">
                          "{chk.general_remarks}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. MODAL: Fast Restock / Top-up */}
      {isRestockOpen && selectedItemForRestock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Kemas Kini Stok / Top-up
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedItemForRestock.item_name} ({currentPatient?.full_name})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRestockOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRestock} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Kuantiti Ditambah / Diterima (Qty Restocked)
                </label>
                <input
                  type="text"
                  required
                  value={restockQtyInput}
                  onChange={(e) => setRestockQtyInput(e.target.value)}
                  placeholder="Contoh: 5 paks, 30 biji, 2 botol"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Baki Stok Baharu (New Stock Balance)
                </label>
                <input
                  type="text"
                  value={restockNewBalanceInput}
                  onChange={(e) => setRestockNewBalanceInput(e.target.value)}
                  placeholder={`Baki semasa: ${selectedItemForRestock.stock_balance}. Sila isi baki baharu.`}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Tarikh Restock
                </label>
                <input
                  type="date"
                  required
                  value={restockDateInput}
                  onChange={(e) => setRestockDateInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Catatan / Pembekal (Remark)
                </label>
                <input
                  type="text"
                  value={restockRemarkInput}
                  onChange={(e) => setRestockRemarkInput(e.target.value)}
                  placeholder="Contoh: Dihantar oleh anak pesakit / Dibeli di farmasi"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-900 text-[11px]">
                Penambahan ini akan mengemas kini baki dan menetapkan status <strong>Stock necessity = NO</strong> (Mencukupi).
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRestockOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0D382B] text-white font-bold hover:bg-[#07241B]"
                >
                  Sahkan & Kemas Kini
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: Add New Item / Medication */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Tambah Item / Ubatan Baharu
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Untuk penghuni: {currentPatient?.full_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddItemOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Kategori
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewItemCategory('personal')}
                    className={`py-2 px-3 rounded-xl font-bold border transition ${
                      newItemCategory === 'personal'
                        ? 'bg-blue-50 border-blue-600 text-blue-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Barangan Peribadi
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewItemCategory('medication')}
                    className={`py-2 px-3 rounded-xl font-bold border transition ${
                      newItemCategory === 'medication'
                        ? 'bg-purple-50 border-purple-600 text-purple-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Ubatan (15. Medicine)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Nama Item / Ubat
                </label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder={
                    newItemCategory === 'personal'
                      ? 'Contoh: Minyak Angin, Pelindung Tilam, Susu Khas'
                      : 'Contoh: Metformin 500mg, Gabapentin 300mg'
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Baki Stok Semasa
                </label>
                <input
                  type="text"
                  required
                  value={newItemBalance}
                  onChange={(e) => setNewItemBalance(e.target.value)}
                  placeholder="Contoh: 1 botol, 14 biji, Cukup, 0"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Perlu Restock Segera? (Stock Necessity)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="necessity"
                      value="NO"
                      checked={newItemNecessity === 'NO'}
                      onChange={() => setNewItemNecessity('NO')}
                      className="text-emerald-700"
                    />
                    <span className="font-semibold text-slate-700">NO (Mencukupi)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="necessity"
                      value="YES"
                      checked={newItemNecessity === 'YES'}
                      onChange={() => setNewItemNecessity('YES')}
                      className="text-blue-700"
                    />
                    <span className="font-semibold text-blue-700">YES (Perlu Restock)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Catatan / Keterangan
                </label>
                <input
                  type="text"
                  value={newItemRemark}
                  onChange={(e) => setNewItemRemark(e.target.value)}
                  placeholder="Contoh: Arahan dos, simpan di peti sejuk, dll."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0D382B] text-white font-bold hover:bg-[#07241B]"
                >
                  Tambah Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: Weekly Stock Check Wizard */}
      {isWeeklyCheckModalOpen && currentPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0D382B] text-[#C5E875] flex items-center justify-center font-bold">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Rekod Semakan Mingguan Inventori (Weekly Stock Check)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Penghuni: <strong>{currentPatient.full_name}</strong> ({currentPatient.mrn} - {currentPatient.room_bed})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsWeeklyCheckModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body with Checklist */}
            <form onSubmit={handleSaveWeeklyCheckModal} className="flex-1 flex flex-col overflow-hidden text-xs">
              <div className="p-5 overflow-y-auto space-y-4">
                {/* Check Session Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Tarikh Semakan
                    </label>
                    <input
                      type="date"
                      required
                      value={weeklyCheckDate}
                      onChange={(e) => setWeeklyCheckDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Jururawat Barangan Peribadi
                    </label>
                    <input
                      type="text"
                      required
                      value={weeklyPersonalStaff}
                      onChange={(e) => setWeeklyPersonalStaff(e.target.value)}
                      placeholder="e.g. HAJAR"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Jururawat Ubatan (15. Medicine)
                    </label>
                    <input
                      type="text"
                      required
                      value={weeklyMedStaff}
                      onChange={(e) => setWeeklyMedStaff(e.target.value)}
                      placeholder="e.g. AISYAH"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>
                </div>

                {/* Checklist table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 w-12 text-center">No</th>
                        <th className="px-4 py-2 w-48">Item / Ubatan</th>
                        <th className="px-4 py-2 w-32">Baki Semasa</th>
                        <th className="px-3 py-2 w-28 text-center">Perlu Restock?</th>
                        <th className="px-3 py-2 w-28">Tarikh Restock</th>
                        <th className="px-4 py-2">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {weeklyCheckDraftItems.map((item, idx) => {
                        return (
                          <tr
                            key={idx}
                            className={item.stock_necessity === 'YES' ? 'bg-amber-50/50' : ''}
                          >
                            <td className="px-3 py-2 text-center font-bold text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-2 font-bold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                {item.category === 'medication' ? (
                                  <Pill className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                ) : (
                                  <Package className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                )}
                                <span>{item.item_name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={item.stock_balance}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setWeeklyCheckDraftItems((prev) =>
                                    prev.map((it, i) =>
                                      i === idx ? { ...it, stock_balance: val } : it
                                    )
                                  );
                                }}
                                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs w-full focus:outline-none focus:ring-1 focus:ring-emerald-700"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  const nextNecessity = item.stock_necessity === 'YES' ? 'NO' : 'YES';
                                  setWeeklyCheckDraftItems((prev) =>
                                    prev.map((it, i) =>
                                      i === idx ? { ...it, stock_necessity: nextNecessity } : it
                                    )
                                  );
                                }}
                                className={`px-3 py-1 rounded-full text-[10px] font-black transition ${
                                  item.stock_necessity === 'YES'
                                    ? 'bg-[#1875D2] text-white'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {item.stock_necessity}
                              </button>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={item.restock_date}
                                placeholder="e.g. 27/9"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setWeeklyCheckDraftItems((prev) =>
                                    prev.map((it, i) =>
                                      i === idx ? { ...it, restock_date: val } : it
                                    )
                                  );
                                }}
                                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs w-full focus:outline-none"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={item.remark}
                                placeholder="Catatan tambahan"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setWeeklyCheckDraftItems((prev) =>
                                    prev.map((it, i) =>
                                      i === idx ? { ...it, remark: val } : it
                                    )
                                  );
                                }}
                                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs w-full focus:outline-none"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Ulasan / Makluman Keseluruhan Semakan Mingguan
                  </label>
                  <textarea
                    rows={2}
                    value={weeklyGeneralRemarks}
                    onChange={(e) => setWeeklyGeneralRemarks(e.target.value)}
                    placeholder="Contoh: Keluarga telah dimaklumkan untuk membawa bekalan Diaper dan Ubatan harian sebelum hujung minggu."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/70 rounded-b-3xl">
                <span className="text-xs text-slate-500">
                  Jumlah item:{' '}
                  <strong>{weeklyCheckDraftItems.length}</strong> (Perlu restock:{' '}
                  <strong className="text-blue-700">
                    {weeklyCheckDraftItems.filter((i) => i.stock_necessity === 'YES').length}
                  </strong>
                  )
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWeeklyCheckModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#0D382B] text-white font-bold hover:bg-[#07241B] shadow-xs"
                  >
                    Simpan Semakan Mingguan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
