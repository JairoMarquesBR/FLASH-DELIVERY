import React, { useState } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Wifi, 
  CheckCircle2, 
  RefreshCw, 
  Download, 
  Copy, 
  Check, 
  Menu, 
  X,
  LayoutDashboard,
  ClipboardPen,
  FileCheck,
  Users,
  FileSpreadsheet,
  Settings
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { calculateWeeklySummary, formatCurrency } from '../utils/calcUtils';
import { generateWeeklyReportCSV, downloadCSV } from '../utils/csvUtils';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { 
    data, 
    selectedWeek, 
    availableWeeks, 
    setSelectedWeekStart, 
    goToCurrentWeek, 
    goToPreviousWeek, 
    goToNextWeek,
    isSaving,
    isSyncError,
    networkInfo,
  } = useData();

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const copyNetworkUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'daily', label: 'Lançamentos', icon: ClipboardPen },
    { id: 'settlement', label: 'Fechamento Fiscal', icon: FileCheck },
    { id: 'drivers', label: 'Entregadores', icon: Users },
    { id: 'reports', label: 'Relatórios & CSV', icon: FileSpreadsheet },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  const handleExportCSV = () => {
    const settlement = data.settlements?.find((s) => s.weekStartDate === selectedWeek.startDate);
    const { driverSummaries, overallStats } = calculateWeeklySummary(
      data.drivers,
      data.records,
      selectedWeek,
      settlement,
      data.settings
    );
    const csv = generateWeeklyReportCSV(selectedWeek, driverSummaries, overallStats, data.settings);
    downloadCSV(`fechamento_fiscal_pizzahut_${selectedWeek.startDate}_a_${selectedWeek.endDate}.csv`, csv);
  };

  return (
    <>
      <header id="main_header" className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 z-30 sticky top-0">
        {/* Left: Mobile menu toggle + Fiscal Week title */}
        <div className="flex items-center gap-3">
          <button
            id="btn_mobile_menu_toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Semana Fiscal Atual #{selectedWeek.weekNumber}
              </h1>
              {selectedWeek.isCurrent && (
                <span className="hidden sm:inline-block px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                  Em Curso
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1.5 mt-0.5">
              <button
                id="btn_prev_fiscal_week"
                onClick={goToPreviousWeek}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                title="Semana anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <select
                id="select_fiscal_week_dropdown"
                value={selectedWeek.startDate}
                onChange={(e) => setSelectedWeekStart(e.target.value)}
                className="font-bold text-sm sm:text-base text-slate-900 bg-transparent focus:outline-none cursor-pointer pr-1"
              >
                {availableWeeks.map((week) => (
                  <option key={week.startDate} value={week.startDate}>
                    {week.label} {week.isCurrent ? ' (Atual)' : ''}
                  </option>
                ))}
              </select>

              <button
                id="btn_next_fiscal_week"
                onClick={goToNextWeek}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                title="Próxima semana"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right side: Rates, LAN Wi-Fi & Export Action */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Rate pills */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs">
            <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded font-semibold border border-green-200">
              Base: R$ {data.settings.baseDeliveryRate.toFixed(2)}
            </span>
            <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded font-semibold border border-blue-200">
              Adic: +R$ {data.settings.additionalRate.toFixed(2)}
            </span>
          </div>

          {/* Sync Status Badge */}
          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500 font-medium">
            {isSaving ? (
              <span className="flex items-center gap-1 text-amber-600">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span className="text-[11px]">Gravando...</span>
              </span>
            ) : isSyncError ? (
              <span className="text-[11px] text-red-600 font-bold">Offline</span>
            ) : (
              <span className="flex items-center gap-1 text-slate-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px] hidden md:inline">Banco Ativo</span>
              </span>
            )}
          </div>

          {/* Wi-Fi LAN Trigger */}
          {networkInfo && networkInfo.localIPs.length > 0 && (
            <button
              id="btn_lan_modal_trigger"
              onClick={() => setShowNetworkModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium text-xs border border-slate-200 transition-colors cursor-pointer"
              title="Acessar pelo Celular na mesma rede Wi-Fi"
            >
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-mono hidden xl:inline">{networkInfo.localIPs[0]}:3000</span>
              <span className="font-mono xl:hidden text-[11px]">Wi-Fi</span>
            </button>
          )}

          {/* Export CSV Button */}
          <button
            id="btn_header_export_csv"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium text-xs shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 flex">
          <div className="w-64 bg-[#0c0e12] text-white h-full flex flex-col p-4 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-red-600 rounded flex items-center justify-center font-bold text-lg italic text-white">
                  H
                </div>
                <span className="font-bold text-base tracking-tight uppercase">
                  CoopHut <span className="text-red-500">Express</span>
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Navegação
              </div>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-red-600/10 text-red-500 border-l-2 border-red-600'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Network Host info Modal */}
      {showNetworkModal && networkInfo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c0e12] text-white rounded-xl max-w-md w-full p-6 border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Hospedagem em Rede Local (Wi-Fi)</h3>
                  <p className="text-xs text-slate-400">Acesse em celulares, tablets ou caixas</p>
                </div>
              </div>
              <button
                onClick={() => setShowNetworkModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white/5 rounded-lg p-4 border border-white/10 space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                Qualquer dispositivo conectado à mesma rede Wi-Fi da loja pode acessar o sistema no navegador:
              </p>

              {networkInfo.allUrls.map((url, idx) => (
                <div key={idx} className="bg-black/60 rounded-md p-2.5 border border-white/10 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-amber-300 font-semibold truncate">{url}</span>
                  <button
                    onClick={() => copyNetworkUrl(url)}
                    className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-xs px-2.5 py-1 rounded text-slate-200 transition-colors"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowNetworkModal(false)}
              className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
