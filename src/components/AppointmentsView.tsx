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
  const [relationship, setRelationship] = useState('Child');
  const [purpose, setPurpose] = useState('Resident Visit');
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
      setError(err.message || 'Failed to load appointments.');
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
    setRelationship('Child');
    setPurpose('Resident Visit');
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
      setError('Please provide the visitor full name and contact phone number.');
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
          ? `Visitor "${visitorName}" successfully checked in directly!`
          : `Appointment for "${visitorName}" scheduled successfully!`
      );
      setIsAddModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule appointment.');
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
      setSuccessMsg(`Visitor "${checkInTarget.visitor_name}" successfully checked in.`);
      setCheckInTarget(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to check in visitor.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckOut(apt: Appointment) {
    if (!confirm(`Confirm check-out for "${apt.visitor_name}"?`)) return;

    try {
      await apiCheckOutAppointment(apt.id);
      setSuccessMsg(`Visitor "${apt.visitor_name}" has checked out.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to check out visitor.');
    }
  }

  async function handleCancelAppointment(apt: Appointment) {
    if (!confirm(`Are you sure you want to cancel the appointment with "${apt.visitor_name}"?`)) return;

    try {
      await apiUpdateAppointmentStatus(apt.id, 'Cancelled');
      setSuccessMsg(`Appointment cancelled.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel appointment.');
    }
  }

  async function handleDeleteAppointment(apt: Appointment) {
    if (!confirm(`Permanently delete appointment record for "${apt.visitor_name}"?`)) return;

    try {
      await apiDeleteAppointment(apt.id);
      setSuccessMsg(`Appointment record deleted.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete appointment.');
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
            <span>Convee Care Centre &bull; Visitor Protocols & Care Security</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
            Appointments & Visitor Log
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Manage next-of-kin visits, health screening, check-in/out logs, and safeguard elder resident security digitally.
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
            <span>+ Schedule Appointment</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Currently Checked In */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-950/10 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Currently Visiting</span>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">{stats.currently_checked_in}</span>
            <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
              On-Site
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Active visitors checked into facility</p>
        </div>

        {/* Today's Total */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-950/10 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Total</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">{stats.today_total}</span>
            <span className="text-xs text-slate-500 font-medium">Appointments</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Includes scheduled & walk-in visits today</p>
        </div>

        {/* Upcoming Scheduled */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-950/10 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Upcoming</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">{stats.upcoming_scheduled}</span>
            <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">
              Scheduled
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Awaiting arrival at designated slot</p>
        </div>

        {/* Completed Visits */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-950/10 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed Today</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">{stats.completed_today}</span>
            <span className="text-xs text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-full">
              Completed
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Safely checked out from facility</p>
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
            Today
          </button>
          <button
            onClick={() => setDateFilter('upcoming')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              dateFilter === 'upcoming'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setDateFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              dateFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Records
          </button>
        </div>

        {/* Status Dropdown, Search, Refresh */}
        <div className="flex items-center gap-2.5 flex-1 max-w-xl">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">All Statuses</option>
            <option value="Checked-In">Currently Visiting (Checked-In)</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search visitor, resident, phone, IC/Passport..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <button
            onClick={loadData}
            title="Refresh data"
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
          <p className="text-slate-500 text-xs mt-3">Loading appointments and visitor logs...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-emerald-950/10 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <CalendarDays className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">No Appointment Records Found</h3>
          <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
            No appointments match the current filter. Use the button above to register or schedule a new visit.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => openCreateModal(false)}
              className="px-4 py-2 bg-[#0B3B2C] text-white rounded-xl text-xs font-semibold hover:bg-[#082d21]"
            >
              + Schedule Appointment
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
                        ? 'Visiting'
                        : apt.status === 'Scheduled'
                        ? 'Scheduled'
                        : apt.status === 'Completed'
                        ? 'Completed'
                        : 'Cancelled'}
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
                        <span className="text-[10px] font-medium text-slate-400 block">Capacity</span>
                        <span className="text-xs font-bold text-slate-700">{apt.pax_count} Pax</span>
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
                          title="Contact via WhatsApp"
                          className="text-emerald-600 hover:text-emerald-700 p-0.5 ml-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {apt.visitor_ic_passport && (
                        <span className="text-[10px] font-mono text-slate-400">
                          ID: {apt.visitor_ic_passport}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Target Resident / Patient */}
                  <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/5 border border-emerald-950/10">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Resident Visited
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
                            {apt.patient_zone === 'Zon Lelaki' ? 'Male Ward' : apt.patient_zone === 'Zon Perempuan' ? 'Female Ward' : apt.patient_zone}
                          </span>
                          {apt.room_bed && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-white font-medium rounded text-slate-600 border border-slate-200">
                              Bed {apt.room_bed}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600 italic">General Facility Visit</span>
                    )}
                  </div>

                  {/* Health & Check-in Details */}
                  {(isCheckedIn || isCompleted) && (
                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 px-1">
                      <div className="flex items-center gap-1.5">
                        <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                        <span>Temp: {apt.temperature ? `${apt.temperature}°C` : 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-700">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Symptom-Free</span>
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
                      title="Delete record"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {isScheduled && (
                      <button
                        onClick={() => handleCancelAppointment(apt)}
                        className="text-[11px] text-slate-400 hover:text-rose-600 font-medium px-2 py-1 rounded-lg hover:bg-slate-50"
                      >
                        Cancel
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
                        <span>Check In</span>
                      </button>
                    )}

                    {isCheckedIn && (
                      <button
                        onClick={() => handleCheckOut(apt)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Check Out</span>
                      </button>
                    )}

                    {isCompleted && (
                      <span className="text-[11px] font-medium text-slate-400">
                        {apt.check_out_time ? `Out: ${new Date(apt.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Visit Completed'}
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
                    {isWalkInMode ? 'Instant Check-In (Walk-In Visitor)' : 'Schedule Visitor Appointment'}
                  </h3>
                  <p className="text-slate-400 text-xs">
                    {isWalkInMode ? 'Direct on-site admission with initial health screen' : 'Pre-book visit date and time slot'}
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
                  Resident to Visit <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">-- General Facility Visit / No Specific Resident --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.mrn}) &bull; {p.zone === 'Zon Lelaki' ? 'Male Ward' : p.zone === 'Zon Perempuan' ? 'Female Ward' : p.zone} {p.room_bed ? `- Bed ${p.room_bed}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Visitor Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Visitor Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mr. John Doe"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone / WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 012-3456789"
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
                    NRIC / Passport No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 880215-14-5544"
                    value={visitorIc}
                    onChange={(e) => setVisitorIc(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Relationship to Resident <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full text-xs font-medium px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="Child">Child (Son / Daughter)</option>
                    <option value="Spouse">Spouse (Husband / Wife)</option>
                    <option value="Sibling">Sibling (Brother / Sister)</option>
                    <option value="Grandchild">Grandchild</option>
                    <option value="Relative">Relative / Extended Family</option>
                    <option value="Friend">Friend / Acquaintance</option>
                    <option value="Specialist Doctor">Visiting Specialist Doctor</option>
                    <option value="Physiotherapist">Physiotherapist / Therapist</option>
                    <option value="Private Nurse">Private Duty Nurse</option>
                    <option value="Official / VIP">Official / Authority Visitor</option>
                    <option value="Vendor / Supplier">Vendor / Supplier</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Purpose & Pax */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Visit Purpose <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full text-xs font-medium px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="Resident Visit">Family / Resident Visit</option>
                    <option value="Medical Consultation">Medical Consultation / Checkup</option>
                    <option value="Physiotherapy / Rehab">Physiotherapy & Rehab</option>
                    <option value="Item / Med Delivery">Supplies / Medication Delivery</option>
                    <option value="Care Plan Discussion">Care Plan Discussion</option>
                    <option value="Administrative / Billing">Administrative & Billing</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Visitor Party Count (Pax)
                  </label>
                  <select
                    value={paxCount}
                    onChange={(e) => setPaxCount(Number(e.target.value))}
                    className="w-full text-xs font-medium px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value={1}>1 Visitor</option>
                    <option value={2}>2 Visitors (Recommended Maximum)</option>
                    <option value={3}>3 Visitors (Special Permission Required)</option>
                  </select>
                </div>
              </div>

              {/* Date & Time & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Visit Date
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
                    Visit Time
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10:00 AM"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Est. Duration
                  </label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full text-xs font-medium px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>1 Hour</option>
                    <option value={90}>1 Hour 30 Minutes</option>
                  </select>
                </div>
              </div>

              {/* Walk-in Temperature & Health Check */}
              {isWalkInMode && (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                    <Thermometer className="w-4 h-4 text-amber-600" />
                    <span>On-Site Health Screening (Walk-In)</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-1/2">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Body Temp (°C)
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
                          Free from fever, cough & flu symptoms
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Bringing extra medication packs, requires wheelchair assistance in lobby..."
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
                  Cancel
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
                    ? 'Saving...'
                    : isWalkInMode
                    ? '⚡ Confirm & Check-In Direct'
                    : 'Schedule Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: QUICK CHECK-IN FOR SCHEDULED APPOINTMENT */}
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
                  <h3 className="font-extrabold text-slate-900 text-base">Visitor Check-In</h3>
                  <p className="text-slate-400 text-xs">Temperature screen & attendance confirmation</p>
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
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Visitor</span>
                <h4 className="font-bold text-slate-900 text-sm">{checkInTarget.visitor_name}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                  <span>{checkInTarget.relationship}</span>
                  <span>&bull;</span>
                  <span>Time: {checkInTarget.scheduled_time}</span>
                </div>
                {checkInTarget.patient_name && (
                  <p className="text-xs text-emerald-800 font-medium mt-1">
                    Resident: {checkInTarget.patient_name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Current Body Temperature (°C) <span className="text-rose-500">*</span>
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
                    Declaration: Visitor is currently healthy with no fever (&gt;37.5°C), cough, cold, or shortness of breath.
                  </span>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCheckInTarget(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Confirm & Check In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
