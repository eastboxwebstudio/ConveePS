import React, { useState, useEffect } from 'react';
import {
  Appointment,
  AppointmentStats,
  AppointmentStatus,
  Patient,
} from '../types/index.js';
import {
  apiGetAppointments,
  apiCreateAppointment,
  apiCheckInAppointment,
  apiCheckOutAppointment,
  apiUpdateAppointmentStatus,
  apiDeleteAppointment,
} from '../lib/api.js';
import {
  CalendarDays,
  UserCheck,
  Clock,
  Search,
  Plus,
  Zap,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Phone,
  Thermometer,
  ShieldCheck,
  Calendar,
  Building2,
  Trash2,
  RefreshCw,
  X,
  Check,
  ExternalLink,
  Users2,
  Sparkles,
} from 'lucide-react';

interface AppointmentsViewProps {
  patients: Patient[];
  onSelectPatientId?: (patientId: string) => void;
}

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  patients,
  onSelectPatientId,
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<AppointmentStats>({
    today_total: 0,
    currently_checked_in: 0,
    upcoming_scheduled: 0,
    completed_today: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter states
  const [dateFilter, setDateFilter] = useState<'today' | 'upcoming' | 'all'>('today');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isWalkInMode, setIsWalkInMode] = useState(false);

  // Form states for new appointment
  const [patientId, setPatientId] = useState<string>('');
  const [visitorName, setVisitorName] = useState('');
  const [visitorIc, setVisitorIc] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [relationship, setRelationship] = useState('Anak');
  const [purpose, setPurpose] = useState('Lawatan Pesakit');
  const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState('10:00 AM');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [paxCount, setPaxCount] = useState(1);
  const [notes, setNotes] = useState('');
  const [temperature, setTemperature] = useState<string>('36.5');
  const [healthDeclaration, setHealthDeclaration] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Check-In modal target
  const [checkInTarget, setCheckInTarget] = useState<Appointment | null>(null);
  const [checkInTemp, setCheckInTemp] = useState('36.5');
  const [checkInDeclaration, setCheckInDeclaration] = useState(true);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const res = await apiGetAppointments({
        date: dateFilter,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchTerm.trim() || undefined,
      });
      setAppointments(res.appointments || []);
      setStats(res.stats || {
        today_total: 0,
        currently_checked_in: 0,
        upcoming_scheduled: 0,
        completed_today: 0,
      });
    } catch (err: any) {
      setError(err.message || 'Gagal memuat senarai temujanji.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [dateFilter, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  function openCreateModal(walkIn: boolean = false) {
    setIsWalkInMode(walkIn);
    setVisitorName('');
    setVisitorIc('');
    setVisitorPhone('');
    setRelationship('Anak');
    setPurpose(walkIn ? 'Lawatan Pesakit' : 'Lawatan Pesakit');
    setScheduledDate(new Date().toISOString().split('T')[0]);
    setScheduledTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    setDurationMinutes(45);
    setPaxCount(1);
    setNotes('');
    setTemperature('36.5');
    setHealthDeclaration(true);
    setPatientId(patients.length > 0 ? patients[0].id : '');
    setIsAddModalOpen(true);
  }

  async function handleCreateAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!visitorName.trim() || !visitorPhone.trim()) {
      setError('Sila lengkapkan nama dan nombor telefon pelawat.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await apiCreateAppointment({
        patient_id: patientId || null,
        visitor_name: visitorName.trim(),
        visitor_ic_passport: visitorIc.trim() || null,
        visitor_phone: visitorPhone.trim(),
        relationship,
        purpose,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        duration_minutes: durationMinutes,
        pax_count: paxCount,
        notes: notes.trim() || undefined,
        health_declaration: healthDeclaration ? 1 : 0,
        temperature: isWalkInMode && temperature ? parseFloat(temperature) : null,
        is_walk_in: isWalkInMode,
      });

      setSuccessMsg(
        isWalkInMode
          ? `Pelawat "${visitorName}" berjaya didaftarkan masuk terus!`
          : `Temujanji bersama "${visitorName}" berjaya dijadualkan!`
      );
      setIsAddModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan temujanji.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckInSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!checkInTarget) return;

    try {
      setSubmitting(true);
      await apiCheckInAppointment(checkInTarget.id, {
        temperature: checkInTemp ? parseFloat(checkInTemp) : 36.5,
        health_declaration: checkInDeclaration ? 1 : 0,
      });
      setSuccessMsg(`Pelawat "${checkInTarget.visitor_name}" berjaya didaftarkan masuk.`);
      setCheckInTarget(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Gagal mendaftar masuk pelawat.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckOut(apt: Appointment) {
    if (!confirm(`Sahkan pendaftaran keluar untuk "${apt.visitor_name}"?`)) return;

    try {
      await apiCheckOutAppointment(apt.id);
      setSuccessMsg(`Pelawat "${apt.visitor_name}" telah mendaftar keluar.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Gagal mendaftar keluar pelawat.');
    }
  }

  async function handleCancelAppointment(apt: Appointment) {
    if (!confirm(`Adakah anda pasti mahu membatalkan temujanji bersama "${apt.visitor_name}"?`)) return;

    try {
      await apiUpdateAppointmentStatus(apt.id, 'Cancelled');
      setSuccessMsg(`Temujanji telah dibatalkan.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Gagal membatalkan temujanji.');
    }
  }

  async function handleDeleteAppointment(apt: Appointment) {
    if (!confirm(`Padam rekod temujanji "${apt.visitor_name}" sepenuhnya?`)) return;

    try {
      await apiDeleteAppointment(apt.id);
      setSuccessMsg(`Rekod temujanji telah dipadam.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Gagal memadam temujanji.');
    }
  }

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-800 text-sm shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 text-sm shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 lg:p-7 border border-emerald-950/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs tracking-wider uppercase">
            <Building2 className="w-4 h-4" />
            <span>Convee Care Centre &bull; Kawalan Pelawat & SOP Jagaan</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
            Temujanji & Pendaftaran Pelawat
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Urus jadual lawatan waris, saringan kesihatan awal, rekod daftar masuk/keluar, dan kawal selia keselamatan pesakit warga emas secara digital.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0 flex-wrap">
          <button
            onClick={() => openCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>Walk-in Check-In</span>
          </button>

          <button
            onClick={() => openCreateModal(false)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0B3B2C] hover:bg-[#082d21] text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Jadual Temujanji</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Currently Checked In */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-950/10 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sedang Melawat</span>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">{stats.currently_checked_in}</span>
            <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
              Di Fasiliti
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Pelawat aktif yang telah mendaftar masuk</p>
        </div>

        {/* Today's Total */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-950/10 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Jumlah Hari Ini</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">{stats.today_total}</span>
            <span className="text-xs text-slate-500 font-medium">Temujanji</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Termasuk dijadualkan & walk-in hari ini</p>
        </div>

        {/* Upcoming Scheduled */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-950/10 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Akan Datang</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">{stats.upcoming_scheduled}</span>
            <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">
              Dijadualkan
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Menunggu kehadiran pada masa ditetapkan</p>
        </div>

        {/* Completed Visits */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-950/10 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Selesai Hari Ini</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">{stats.completed_today}</span>
            <span className="text-xs text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-full">
              Selesai
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Telah mendaftar keluar dengan selamat</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-emerald-950/10 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Date Tabs */}
        <div className="flex items-center p-1 bg-slate-100/80 rounded-xl self-start md:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setDateFilter('today')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              dateFilter === 'today'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hari Ini
          </button>
          <button
            onClick={() => setDateFilter('upcoming')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              dateFilter === 'upcoming'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Akan Datang
          </button>
          <button
            onClick={() => setDateFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              dateFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua Rekod
          </button>
        </div>

        {/* Status Dropdown, Search, Refresh */}
        <div className="flex items-center gap-2.5 flex-1 max-w-xl">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">Semua Status</option>
            <option value="Checked-In">Sedang Melawat (Checked-In)</option>
            <option value="Scheduled">Dijadualkan (Scheduled)</option>
            <option value="Completed">Selesai (Completed)</option>
            <option value="Cancelled">Dibatalkan (Cancelled)</option>
          </select>

          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari pelawat, pesakit, no fon, K/P..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <button
            onClick={loadData}
            title="Muat semula data"
            className="p-2 text-slate-500 hover:text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Appointments List / Grid */}
      {loading && appointments.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-emerald-950/10 shadow-xs">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-slate-500 text-xs mt-3">Memuatkan data temujanji dan pelawat...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-emerald-950/10 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <CalendarDays className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">Tiada Rekod Temujanji</h3>
          <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
            Tiada temujanji yang sepadan dengan penapis semasa. Klik butang di atas untuk mendaftar temujanji baharu.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => openCreateModal(false)}
              className="px-4 py-2 bg-[#0B3B2C] text-white rounded-xl text-xs font-semibold hover:bg-[#082d21]"
            >
              + Jadualkan Temujanji
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {appointments.map((apt) => {
            const isCheckedIn = apt.status === 'Checked-In';
            const isScheduled = apt.status === 'Scheduled';
            const isCompleted = apt.status === 'Completed';
            const isCancelled = apt.status === 'Cancelled';

            return (
              <div
                key={apt.id}
                className={`bg-white rounded-2xl p-5 border shadow-xs transition-all flex flex-col justify-between ${
                  isCheckedIn
                    ? 'border-emerald-500/40 ring-2 ring-emerald-500/10'
                    : 'border-emerald-950/10 hover:border-emerald-950/20'
                }`}
              >
                <div>
                  {/* Top Bar: Status & Time */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{apt.scheduled_date}</span>
                      <span className="text-slate-300">&bull;</span>
                      <span className="text-slate-900">{apt.scheduled_time}</span>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                        isCheckedIn
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : isScheduled
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : isCompleted
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {isCheckedIn && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                      {apt.status === 'Checked-In'
                        ? 'Sedang Melawat'
                        : apt.status === 'Scheduled'
                        ? 'Dijadualkan'
                        : apt.status === 'Completed'
                        ? 'Selesai'
                        : 'Dibatalkan'}
                    </span>
                  </div>

                  {/* Visitor Information */}
                  <div className="mt-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{apt.visitor_name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                            {apt.relationship}
                          </span>
                          <span className="text-[11px] text-slate-500">{apt.purpose}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-medium text-slate-400 block">Kapasiti</span>
                        <span className="text-xs font-bold text-slate-700">{apt.pax_count} Orang</span>
                      </div>
                    </div>

                    {/* Contact & IC */}
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-[11px]">{apt.visitor_phone}</span>
                        <a
                          href={`https://wa.me/${apt.visitor_phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Hubungi melalui WhatsApp"
                          className="text-emerald-600 hover:text-emerald-700 p-0.5 ml-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {apt.visitor_ic_passport && (
                        <span className="text-[10px] font-mono text-slate-400">
                          K/P: {apt.visitor_ic_passport}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Target Resident / Patient */}
                  <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/5 border border-emerald-950/10">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Pesakit Dilawati
                    </span>
                    {apt.patient_name ? (
                      <div className="flex items-center justify-between mt-0.5">
                        <button
                          type="button"
                          onClick={() => apt.patient_id && onSelectPatientId && onSelectPatientId(apt.patient_id)}
                          className="font-bold text-xs text-slate-900 hover:text-emerald-700 text-left transition-colors truncate"
                        >
                          {apt.patient_name} ({apt.patient_mrn})
                        </button>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <span className="text-[10px] px-1.5 py-0.5 bg-white font-medium rounded text-slate-600 border border-slate-200">
                            {apt.patient_zone === 'Zon Lelaki' ? 'Zon L' : 'Zon P'}
                          </span>
                          {apt.room_bed && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-white font-medium rounded text-slate-600 border border-slate-200">
                              Katil {apt.room_bed}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600 italic">Lawatan Umum Fasiliti</span>
                    )}
                  </div>

                  {/* Health & Check-in Details */}
                  {(isCheckedIn || isCompleted) && (
                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 px-1">
                      <div className="flex items-center gap-1.5">
                        <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                        <span>Suhu: {apt.temperature ? `${apt.temperature}°C` : 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-700">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Bebas Simptom</span>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {apt.notes && (
                    <p className="mt-2.5 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg italic">
                      "{apt.notes}"
                    </p>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDeleteAppointment(apt)}
                      title="Padam rekod"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {isScheduled && (
                      <button
                        onClick={() => handleCancelAppointment(apt)}
                        className="text-[11px] text-slate-400 hover:text-rose-600 font-medium px-2 py-1 rounded-lg hover:bg-slate-50"
                      >
                        Batal
                      </button>
                    )}
                  </div>

                  {/* Primary Status Transition Buttons */}
                  <div>
                    {isScheduled && (
                      <button
                        onClick={() => {
                          setCheckInTarget(apt);
                          setCheckInTemp('36.5');
                          setCheckInDeclaration(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Daftar Masuk</span>
                      </button>
                    )}

                    {isCheckedIn && (
                      <button
                        onClick={() => handleCheckOut(apt)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Daftar Keluar</span>
                      </button>
                    )}

                    {isCompleted && (
                      <span className="text-[11px] font-medium text-slate-400">
                        {apt.check_out_time ? `Keluar: ${new Date(apt.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Lawatan Selesai'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DAFTAR TEMUJANJI BARU / WALK-IN */}
      {/* ========================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                  isWalkInMode ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {isWalkInMode ? <Zap className="w-5 h-5 fill-current" /> : <CalendarDays className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {isWalkInMode ? 'Daftar Masuk Segera (Walk-In Visitor)' : 'Jadualkan Temujanji Pelawat'}
                  </h3>
                  <p className="text-slate-400 text-xs">
                    {isWalkInMode ? 'Pelawat terus disahkan masuk ke fasiliti' : 'Daftar slot tarikh & masa kehadiran awal'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateAppointment} className="p-5 overflow-y-auto space-y-4">
              {/* Patient Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pesakit Yang Dilawati <span className="text-slate-400 font-normal">(Pilihan)</span>
                </label>
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">-- Lawatan Umum / Tiada Pesakit Tertentu --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.mrn}) &bull; {p.zone} {p.room_bed ? `- Katil ${p.room_bed}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Visitor Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Penuh Pelawat <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="cth: Encik Ali bin Omar"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. Telefon / WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="cth: 012-3456789"
                    value={visitorPhone}
                    onChange={(e) => setVisitorPhone(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* IC & Relationship */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. Kad Pengenalan / Pasport
                  </label>
                  <input
                    type="text"
                    placeholder="cth: 880215-14-5544"
                    value={visitorIc}
                    onChange={(e) => setVisitorIc(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hubungan Dengan Pesakit <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full text-xs font-medium px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="Anak">Anak</option>
                    <option value="Pasangan">Pasangan (Suami / Isteri)</option>
                    <option value="Adik-beradik">Adik-beradik</option>
                    <option value="Cucu">Cucu</option>
                    <option value="Saudara-mara">Saudara-mara</option>
                    <option value="Rakan">Rakan / Kenalan</option>
                    <option value="Doktor Pakar">Doktor Pakar / Perubatan Luar</option>
                    <option value="Fisioterapis">Fisioterapis / Terapi</option>
                    <option value="Jururawat Swasta">Jururawat Swasta</option>
                    <option value="Pegawai / VIP">Pegawai / Pelawat Rasmi</option>
                    <option value="Pembekal / Vendor">Pembekal / Vendor</option>
                    <option value="Lain-lain">Lain-lain</option>
                  </select>
                </div>
              </div>

              {/* Purpose & Pax */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tujuan Lawatan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full text-xs font-medium px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="Lawatan Pesakit">Lawatan / Ziarah Pesakit</option>
                    <option value="Konsultasi Perubatan">Konsultasi / Rawatan Doktor</option>
                    <option value="Fisioterapi / Rehab">Fisioterapi & Rehabilitasi</option>
                    <option value="Hantar Barang / Ubat">Hantar Barangan & Bekalan Ubat</option>
                    <option value="Perbincangan Pelan Jagaan">Perbincangan Pelan Jagaan</option>
                    <option value="Urusan Pentadbiran">Urusan Pentadbiran & Bil</option>
                    <option value="Lain-lain">Lain-lain</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bilangan Pelawat (Pax)
                  </label>
                  <select
                    value={paxCount}
                    onChange={(e) => setPaxCount(Number(e.target.value))}
                    className="w-full text-xs font-medium px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value={1}>1 Orang Pelawat</option>
                    <option value={2}>2 Orang Pelawat (Maksimum Disyorkan)</option>
                    <option value={3}>3 Orang (Perlu Kebenaran Khas)</option>
                  </select>
                </div>
              </div>

              {/* Date & Time & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tarikh Lawatan
                  </label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Masa Lawatan
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="cth: 10:00 AM"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Anggaran Tempoh
                  </label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full text-xs font-medium px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value={30}>30 Minit</option>
                    <option value={45}>45 Minit</option>
                    <option value={60}>1 Jam</option>
                    <option value={90}>1 Jam 30 Minit</option>
                  </select>
                </div>
              </div>

              {/* Walk-in Temperature & Health Check */}
              {isWalkInMode && (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                    <Thermometer className="w-4 h-4 text-amber-600" />
                    <span>Saringan Kesihatan Masuk (Walk-In)</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-1/2">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Suhu Badan (°C)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={temperature}
                        onChange={(e) => setTemperature(e.target.value)}
                        placeholder="36.5"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900"
                      />
                    </div>

                    <div className="w-1/2 flex items-center pt-5">
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={healthDeclaration}
                          onChange={(e) => setHealthDeclaration(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                        />
                        <span className="text-[11px] font-medium leading-tight">
                          Bebas gejala batuk, selsema & demam
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Tambahan
                </label>
                <textarea
                  rows={2}
                  placeholder="cth: Membawa ubat tambahan, perlu bantuan kerusi roda di ruang lobi..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-xs transition-colors ${
                    isWalkInMode
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-[#0B3B2C] hover:bg-[#082d21]'
                  } disabled:opacity-50`}
                >
                  {submitting
                    ? 'Menyimpan...'
                    : isWalkInMode
                    ? '⚡ Sahkan & Daftar Masuk Terus'
                    : 'Jadualkan Temujanji'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: QUICK CHECK-IN UNTUK TEMUJANJI BERJADUAL */}
      {/* ========================================================= */}
      {checkInTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Daftar Masuk Pelawat</h3>
                  <p className="text-slate-400 text-xs">Saringan suhu & pengesahan kehadiran</p>
                </div>
              </div>
              <button
                onClick={() => setCheckInTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckInSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Pelawat</span>
                <h4 className="font-bold text-slate-900 text-sm">{checkInTarget.visitor_name}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                  <span>{checkInTarget.relationship}</span>
                  <span>&bull;</span>
                  <span>Masa: {checkInTarget.scheduled_time}</span>
                </div>
                {checkInTarget.patient_name && (
                  <p className="text-xs text-emerald-800 font-medium mt-1">
                    Pesakit: {checkInTarget.patient_name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Suhu Badan Semasa (°C) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={checkInTemp}
                  onChange={(e) => setCheckInTemp(e.target.value)}
                  placeholder="36.5"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkInDeclaration}
                    onChange={(e) => setCheckInDeclaration(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 mt-0.5"
                  />
                  <span className="text-[11px] leading-relaxed">
                    Pengisytiharan: Pelawat berada dalam keadaan sihat dan tidak mempunyai sebarang simptom selesema, batuk atau demam melebihi 37.5°C.
                  </span>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCheckInTarget(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Mendaftar...' : 'Sahkan & Daftar Masuk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
