import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Calendar, 
  Filter, 
  Table, 
  FileText, 
  Check, 
  Copy, 
  Share2, 
  Pizza, 
  Layers, 
  DollarSign, 
  Users 
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { calculateWeeklySummary, formatCurrency } from '../utils/calcUtils';
import { 
  generateWeeklyReportCSV, 
  generateDailyRecordsCSV, 
  generateDriversListCSV, 
  downloadCSV 
} from '../utils/csvUtils';
import { formatDateBR, formatDateISO } from '../utils/dateUtils';

export const ReportsView: React.FC = () => {
  const { data, selectedWeek } = useData();

  // Custom date range state
  const [customStartDate, setCustomStartDate] = useState(selectedWeek.startDate);
  const [customEndDate, setCustomEndDate] = useState(selectedWeek.endDate);
  const [reportType, setReportType] = useState<'weekly_settlement' | 'daily_records' | 'drivers_list'>('weekly_settlement');
  const [copiedBatchWhatsApp, setCopiedBatchWhatsApp] = useState(false);

  const { driverSummaries, overallStats } = useMemo(() => {
    const settlement = data.settlements?.find((s) => s.weekStartDate === selectedWeek.startDate);
    return calculateWeeklySummary(
      data.drivers,
      data.records,
      selectedWeek,
      settlement,
      data.settings
    );
  }, [data.drivers, data.records, selectedWeek, data.settlements, data.settings]);

  // Export handlers
  const handleExportWeeklyCSV = () => {
    const csv = generateWeeklyReportCSV(selectedWeek, driverSummaries, overallStats, data.settings);
    downloadCSV(`fechamento_semanal_${selectedWeek.startDate}_a_${selectedWeek.endDate}.csv`, csv);
  };

  const handleExportDailyRecordsCSV = () => {
    // Filter records by custom date range
    const filtered = data.records.filter(
      (r) => r.date >= customStartDate && r.date <= customEndDate
    );
    const csv = generateDailyRecordsCSV(filtered, data.drivers, selectedWeek, data.settings);
    downloadCSV(`extrato_lancamentos_${customStartDate}_a_${customEndDate}.csv`, csv);
  };

  const handleExportDriversCSV = () => {
    const csv = generateDriversListCSV(data.drivers);
    downloadCSV(`lista_entregadores_${formatDateISO(new Date())}.csv`, csv);
  };

  // Generate All WhatsApp Receipts Text in one file / copy
  const handleCopyAllWhatsApp = () => {
    const lines: string[] = [];
    lines.push(`🍕 *${data.settings.storeName.toUpperCase()}* - ${data.settings.cooperativeName}`);
    lines.push(`📋 *CONSOLIDADO DE EXTRATOS DE PAGAMENTO*`);
    lines.push(`🗓️ *Semana Fiscal #${selectedWeek.weekNumber} (${selectedWeek.label})*`);
    lines.push(`========================================\n`);

    driverSummaries
      .filter((s) => s.grandTotal > 0)
      .forEach((s, idx) => {
        lines.push(`[${idx + 1}] *${s.driver.name.toUpperCase()}* ${s.driver.nickname ? `(${s.driver.nickname})` : ''}`);
        lines.push(`🔑 PIX (${s.driver.pixType.toUpperCase()}): ${s.driver.pixKey}`);
        lines.push(`📦 Entregas (R$ 9): ${s.totalDeliveries} (${formatCurrency(s.totalBaseValue)})`);
        lines.push(`⚡ Adicionais (+R$ 2): +${s.totalAdditionals} (${formatCurrency(s.totalAdditionalsValue)})`);
        lines.push(`💰 *TOTAL:* *${formatCurrency(s.grandTotal)}* | Status: ${s.isPaid ? 'PAGO ✅' : 'PENDENTE ⏳'}`);
        lines.push(`----------------------------------------\n`);
      });

    lines.push(`💰 *TOTAL GERAL DA COOPERATIVA:* *${formatCurrency(overallStats.grandTotalGross)}*`);
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedBatchWhatsApp(true);
    setTimeout(() => setCopiedBatchWhatsApp(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900 rounded-2xl p-5 sm:p-6 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-red-600/30 text-red-300 text-xs font-bold rounded-full border border-red-500/20">
              Exportação & Auditoria
            </span>
            <span className="text-xs text-slate-400">
              Compatível com Excel, Google Planilhas e WhatsApp
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Relatórios Fiscais & Exportação CSV
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
            Gere relatórios completos para auditoria, conferência financeira e repasses PIX
          </p>
        </div>

        <button
          onClick={handleCopyAllWhatsApp}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/30 transition-all cursor-pointer shrink-0"
        >
          {copiedBatchWhatsApp ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
          <span>{copiedBatchWhatsApp ? 'Extratos Copiados!' : 'Copiar Todos p/ WhatsApp'}</span>
        </button>
      </div>

      {/* 3 Quick Export Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Weekly Settlement CSV */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
          <div>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">
              CSV do Fechamento Semanal Fiscal
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Matriz completa da semana fiscal {selectedWeek.label} com colunas por dia (Qua a Ter), totais de entregas, adicionais e status PIX.
            </p>
          </div>

          <button
            id="btn_download_weekly_csv"
            onClick={handleExportWeeklyCSV}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Baixar CSV Fechamento</span>
          </button>
        </div>

        {/* Card 2: Detailed Daily Records CSV */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">
              CSV do Extrato Detalhado de Lançamentos
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Registro linha por linha de todos os lançamentos diários com turno, motivos de adicionais, taxas aplicadas e observações.
            </p>
          </div>

          <button
            id="btn_download_daily_csv"
            onClick={handleExportDailyRecordsCSV}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Baixar Extrato Diário</span>
          </button>
        </div>

        {/* Card 3: Drivers Directory CSV */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">
              CSV do Cadastro de Entregadores
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Lista cadastral de todos os {data.drivers.length} motoboys com nome, telefone, chaves PIX, veículos e placas.
            </p>
          </div>

          <button
            id="btn_download_drivers_csv"
            onClick={handleExportDriversCSV}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Baixar Lista Motoboys</span>
          </button>
        </div>
      </div>

      {/* Interactive Data Preview Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Table className="w-5 h-5 text-red-600" />
              Pré-visualização do Relatório
            </h3>
            <p className="text-xs text-slate-500">
              Visualize os dados estruturados antes da exportação
            </p>
          </div>

          {/* Report Type Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setReportType('weekly_settlement')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                reportType === 'weekly_settlement'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Fechamento Semanal
            </button>
            <button
              onClick={() => setReportType('daily_records')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                reportType === 'daily_records'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lançamentos Diários
            </button>
            <button
              onClick={() => setReportType('drivers_list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                reportType === 'drivers_list'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cadastro Entregadores
            </button>
          </div>
        </div>

        {/* Date filter bar for daily records */}
        {reportType === 'daily_records' && (
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filtrar Período:
            </span>
            <div className="flex items-center gap-2">
              <label className="text-slate-500 font-medium">De:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-500 font-medium">Até:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>
        )}

        {/* Table Render */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          {reportType === 'weekly_settlement' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Entregador</th>
                  <th className="py-2.5 px-3">Chave PIX</th>
                  <th className="py-2.5 px-3 text-center">Entregas (R$ 9)</th>
                  <th className="py-2.5 px-3 text-center">Adicionais (+R$ 2)</th>
                  <th className="py-2.5 px-3 text-right">Total Base</th>
                  <th className="py-2.5 px-3 text-right">Total Adic.</th>
                  <th className="py-2.5 px-3 text-right">Total a Pagar</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {driverSummaries.map((s) => (
                  <tr key={s.driver.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {s.driver.name} {s.driver.nickname && `(${s.driver.nickname})`}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                      {s.driver.pixKey} ({s.driver.pixType.toUpperCase()})
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold">{s.totalDeliveries}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-amber-600">+{s.totalAdditionals}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{formatCurrency(s.totalBaseValue)}</td>
                    <td className="py-2.5 px-3 text-right text-amber-600">{formatCurrency(s.totalAdditionalsValue)}</td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900">{formatCurrency(s.grandTotal)}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {s.isPaid ? 'PAGO' : 'PENDENTE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'daily_records' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Entregador</th>
                  <th className="py-2.5 px-3">Turno</th>
                  <th className="py-2.5 px-3 text-center">Entregas</th>
                  <th className="py-2.5 px-3 text-center">Adicionais</th>
                  <th className="py-2.5 px-3 text-right">Valor Total</th>
                  <th className="py-2.5 px-3">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.records
                  .filter((r) => r.date >= customStartDate && r.date <= customEndDate)
                  .map((r) => {
                    const drv = data.drivers.find((d) => d.id === r.driverId);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{formatDateBR(r.date)}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{drv?.name || 'Desconhecido'}</td>
                        <td className="py-2.5 px-3 uppercase text-[10px] text-slate-600">{r.shift}</td>
                        <td className="py-2.5 px-3 text-center font-bold">{r.deliveriesCount}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-amber-600">+{r.additionalsCount}</td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">{formatCurrency(r.totalValue)}</td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px] truncate max-w-xs">{r.notes || '-'}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}

          {reportType === 'drivers_list' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Nome</th>
                  <th className="py-2.5 px-3">Apelido</th>
                  <th className="py-2.5 px-3">Telefone</th>
                  <th className="py-2.5 px-3">Chave PIX</th>
                  <th className="py-2.5 px-3">Tipo Veículo</th>
                  <th className="py-2.5 px-3">Placa</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.drivers.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{d.name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{d.nickname || '-'}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">{d.phone}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">{d.pixKey} ({d.pixType.toUpperCase()})</td>
                    <td className="py-2.5 px-3 uppercase text-[10px]">{d.vehicleType}</td>
                    <td className="py-2.5 px-3 font-mono uppercase">{d.plate || '-'}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${d.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                        {d.active ? 'ATIVO' : 'INATIVO'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
