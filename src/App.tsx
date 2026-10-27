import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Header } from './components/Header.js';
import { Sidebar, NavTab } from './components/Sidebar.js';
import { DashboardCards } from './components/DashboardCards.js';
import { ClinicalKanban } from './components/ClinicalKanban.js';
import { PatientCareBoard } from './components/PatientCareBoard.js';
import { PatientList } from './components/PatientList.js';
import { AdmissionModal } from './components/AdmissionModal.js';
import { MonitoringModal } from './components/MonitoringModal.js';
import { PatientDetailModal } from './components/PatientDetailModal.js';
import { DischargeModal } from './components/DischargeModal.js';
import { StaffManagement } from './components/StaffManagement.js';
import { AuditLogsView } from './components/AuditLogsView.js';
import { ReportsView } from './components/ReportsView.js';
import { SettingsView } from './components/SettingsView.js';
import { LoginView } from './components/LoginView.js';
import { PatientInventoryModule } from './components/PatientInventoryModule.js';
import { Patient, DashboardStats, ZoneType, KanbanStage } from './types/index.js';
import {
  apiGetPatients,
  apiGetDashboardSummary,
  apiUpdateKanbanStage,
} from './lib/api.js';
import { Activity } from 'lucide-react';

function MainApp() {
  const { user, loading: authLoading } = useAuth();

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [currentZone, setCurrentZone] = useState<ZoneType | ''>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Data state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Modals state
  const [isAdmissionOpen, setIsAdmissionOpen] = useState(false);
  const [isMonitoringOpen, setIsMonitoringOpen] = useState(false);
  const [selectedPatientForMonitoring, setSelectedPatientForMonitoring] = useState<Patient | null>(null);
  const [detailPatientId, setDetailPatientId] = useState<string | null>(null);
  const [dischargeTarget, setDischargeTarget] = useState<Patient | null>(null);

  async function loadData() {
    if (!user) return;
    try {
      setLoadingData(true);
      const [patientsRes, statsRes] = await Promise.all([
        apiGetPatients({ zone: currentZone, status: 'Active' }),
        apiGetDashboardSummary(),
      ]);
      setPatients(patientsRes.patients);
      setStats(statsRes);
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, currentZone]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <Activity className="w-8 h-8 text-teal-400 animate-spin" />
          <span className="text-xs font-medium text-slate-400">Menyediakan Convee CarePulse...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  async function handleUpdateKanbanStage(admissionId: string, stage: KanbanStage) {
    await apiUpdateKanbanStage(admissionId, stage);
    await loadData();
  }

  return (
    <div className="min-h-screen bg-[#EAF1E9] flex antialiased text-slate-900">
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          currentZone={currentZone}
          onZoneChange={(zone) => setCurrentZone(zone)}
          onOpenAdmission={() => setIsAdmissionOpen(true)}
          onOpenMonitoring={() => {
            setSelectedPatientForMonitoring(null);
            setIsMonitoringOpen(true);
          }}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 pb-8 pt-1">
          <div className="max-w-7xl mx-auto space-y-6">
            {currentTab === 'dashboard' && (
              <DashboardCards
                stats={stats}
                onSelectPatient={(id) => setDetailPatientId(id)}
                onOpenAdmission={() => setIsAdmissionOpen(true)}
                onOpenMonitoring={() => {
                  setSelectedPatientForMonitoring(null);
                  setIsMonitoringOpen(true);
                }}
                onNavigateTab={(tab) => setCurrentTab(tab)}
              />
            )}

            {currentTab === 'patients' && (
              <PatientList
                patients={patients}
                onSelectPatient={(id) => setDetailPatientId(id)}
                onOpenMonitoringForPatient={(p) => {
                  setSelectedPatientForMonitoring(p);
                  setIsMonitoringOpen(true);
                }}
                onOpenDischargeForPatient={(p) => setDischargeTarget(p)}
                onOpenAdmission={() => setIsAdmissionOpen(true)}
                currentZone={currentZone}
                onZoneChange={(zone) => setCurrentZone(zone)}
              />
            )}

            {currentTab === 'inventory' && (
              <PatientInventoryModule
                patients={patients}
                onSelectPatientId={(id) => setDetailPatientId(id)}
              />
            )}

            {currentTab === 'kanban' && (
              <ClinicalKanban
                patients={patients}
                onSelectPatient={(id) => setDetailPatientId(id)}
                onUpdateStage={handleUpdateKanbanStage}
                onOpenMonitoringForPatient={(p) => {
                  setSelectedPatientForMonitoring(p);
                  setIsMonitoringOpen(true);
                }}
                onOpenDischargeForPatient={(p) => setDischargeTarget(p)}
                onRefresh={loadData}
              />
            )}

            {currentTab === 'care_board' && (
              <PatientCareBoard
                patients={patients}
                onSelectPatient={(id) => setDetailPatientId(id)}
                onOpenMonitoringForPatient={(p) => {
                  setSelectedPatientForMonitoring(p);
                  setIsMonitoringOpen(true);
                }}
              />
            )}

            {currentTab === 'monitoring' && (
              <PatientList
                patients={patients}
                onSelectPatient={(id) => setDetailPatientId(id)}
                onOpenMonitoringForPatient={(p) => {
                  setSelectedPatientForMonitoring(p);
                  setIsMonitoringOpen(true);
                }}
                onOpenDischargeForPatient={(p) => setDischargeTarget(p)}
                onOpenAdmission={() => setIsAdmissionOpen(true)}
                currentZone={currentZone}
                onZoneChange={(zone) => setCurrentZone(zone)}
              />
            )}

            {currentTab === 'reports' && <ReportsView />}

            {currentTab === 'staff' && <StaffManagement />}

            {currentTab === 'audit' && <AuditLogsView />}

            {currentTab === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>

      {/* Modals */}
      <AdmissionModal
        isOpen={isAdmissionOpen}
        onClose={() => setIsAdmissionOpen(false)}
        onSuccess={() => loadData()}
        defaultZone={currentZone}
      />

      <MonitoringModal
        isOpen={isMonitoringOpen}
        onClose={() => {
          setIsMonitoringOpen(false);
          setSelectedPatientForMonitoring(null);
        }}
        onSuccess={() => loadData()}
        patients={patients}
        selectedPatient={selectedPatientForMonitoring}
      />

      <PatientDetailModal
        patientId={detailPatientId}
        onClose={() => setDetailPatientId(null)}
        onOpenMonitoring={(p) => {
          setSelectedPatientForMonitoring(p);
          setIsMonitoringOpen(true);
        }}
        onOpenDischarge={(p) => setDischargeTarget(p)}
      />

      <DischargeModal
        isOpen={!!dischargeTarget}
        onClose={() => setDischargeTarget(null)}
        onSuccess={() => loadData()}
        patient={dischargeTarget}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
