import React, { useState, useMemo } from 'react';
import { DataProvider, useData } from './context/DataContext';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { DailyEntryView } from './components/DailyEntryView';
import { WeeklySettlementView } from './components/WeeklySettlementView';
import { DriversView } from './components/DriversView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { calculateWeeklySummary, formatCurrency } from './utils/calcUtils';
import { 
  LayoutDashboard, 
  ClipboardPen, 
  FileCheck, 
  Users, 
  FileSpreadsheet, 
  Settings,
  Pizza,
  Wifi,
  ShieldCheck
} from 'lucide-react';

function AppLayout() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const { data, selectedWeek, networkInfo } = useData();

  // Real-time weekly summary for the sidebar widget
  const { overallStats } = useMemo(() => {
    const settlement = data.settlements?.find((s) => s.weekStartDate === selectedWeek.startDate);
    return calculateWeeklySummary(
      data.drivers,
      data.records,
      selectedWeek,
      settlement,
      data.settings
    );
  }, [data.drivers, data.records, selectedWeek, data.settlements, data.settings]);

  const navGroups = [
    {
      title: 'Principal',
      items: [
        { id: 'dashboard', label: 'Dashboard Semanal', icon: LayoutDashboard },
        { id: 'daily', label: 'Registrar Entregas', icon: ClipboardPen },
        { id: 'settlement', label: 'Histórico Fiscal', icon: FileCheck },
      ]
    },
    {
      title: 'Configurações',
      items: [
        { id: 'drivers', label: 'Entregadores', icon: Users },
        { id: 'reports', label: 'Relatórios & CSV', icon: FileSpreadsheet },
        { id: 'settings', label: 'Ajustes & Rede', icon: Settings },
      ]
    }
  ];

  return (
    <div className="flex h-screen w-full bg-[#f0f2f5] font-sans text-slate-900 overflow-hidden select-none">
      {/* Desktop High Density Sidebar */}
      <aside className="w-64 bg-[#0c0e12] text-white hidden md:flex flex-col shrink-0 border-r border-white/10 select-none">
        {/* Brand Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center font-bold text-xl italic text-white shadow-md shadow-red-900/50">
              H
            </div>
            <div>
              <span className="font-bold text-base tracking-tight uppercase block leading-tight">
                CoopHut <span className="text-red-500">Express</span>
              </span>
              <span className="text-[10px] text-slate-400 block font-medium">
                Pizza Hut Cooperativa
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {group.title}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`sidebar_nav_${item.id}`}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs rounded-md transition-all cursor-pointer ${
                      isActive
                        ? 'bg-red-600/10 text-red-500 rounded-md border-l-2 border-red-600 font-semibold'
                        : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-red-500' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Real-time Total da Semana widget */}
        <div className="p-4 bg-red-600/5 m-4 rounded-lg border border-red-600/20 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total da Semana</span>
            <span className="text-[10px] text-red-400 font-mono font-bold">Sem. #{selectedWeek.weekNumber}</span>
          </div>
          <div className="text-xl font-bold text-white font-mono tracking-tight">
            {formatCurrency(overallStats.grandTotalGross)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-white/5">
            <span>{overallStats.totalDeliveries} corridas</span>
            <span className="text-emerald-400 font-medium">+{overallStats.totalAdditionals} adic.</span>
          </div>
        </div>

        {/* LAN Connection indicator */}
        <div className="px-4 py-3 bg-black/40 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5 truncate">
            <Wifi className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="truncate">{networkInfo?.localIPs[0] ? `${networkInfo.localIPs[0]}:3000` : 'Localhost:3000'}</span>
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" title="Servidor Local Ativo" />
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header with week selector & quick actions */}
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f0f2f5]">
          <div className="max-w-7xl mx-auto w-full">
            {activeTab === 'dashboard' && <DashboardView onNavigateTab={setActiveTab} />}
            {activeTab === 'daily' && <DailyEntryView />}
            {activeTab === 'settlement' && <WeeklySettlementView />}
            {activeTab === 'drivers' && <DriversView />}
            {activeTab === 'reports' && <ReportsView />}
            {activeTab === 'settings' && <SettingsView />}
          </div>
        </main>

        {/* Footer */}
        <footer className="h-10 bg-slate-100 border-t border-slate-200 px-6 flex items-center justify-between text-[10px] text-slate-500 font-medium shrink-0">
          <div>
            Conectado a:{' '}
            <span className="text-slate-800 font-semibold underline underline-offset-2">
              {networkInfo?.localIPs[0] ? `http://${networkInfo.localIPs[0]}:3000` : 'Localhost:3000'} (Rede Local Pizza Hut)
            </span>
          </div>
          <div className="hidden sm:block">Versão 2.4.0-fiscal | Quarta a Terça</div>
        </footer>

        {/* Mobile Bottom Navigation Bar (for small screens) */}
        <div className="md:hidden bg-[#0c0e12] text-white border-t border-white/10 px-2 py-1.5 flex items-center justify-around shrink-0 z-40">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'daily', label: 'Lançar', icon: ClipboardPen },
            { id: 'settlement', label: 'Fechamento', icon: FileCheck },
            { id: 'drivers', label: 'Motoboys', icon: Users },
            { id: 'reports', label: 'Relatórios', icon: FileSpreadsheet },
            { id: 'settings', label: 'Ajustes', icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                  isActive
                    ? 'text-red-500 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-red-500 scale-110' : ''}`} />
                <span className="text-[9px] mt-0.5">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <AppLayout />
    </DataProvider>
  );
}
