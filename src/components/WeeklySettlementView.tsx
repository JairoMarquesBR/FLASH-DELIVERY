import React, { useState, useMemo } from 'react';
import { 
  FileCheck, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Eye, 
  Send, 
  Sparkles, 
  DollarSign, 
  Calendar,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useData } from '../context/DataContext';
import { calculateWeeklySummary, formatCurrency } from '../utils/calcUtils';
import { generateWeeklyReportCSV, downloadCSV } from '../utils/csvUtils';
import { DriverReceiptModal } from './DriverReceiptModal';
import { DriverWeeklySummary } from '../types';
import { formatDateBR } from '../utils/dateUtils';

export const WeeklySettlementView: React.FC = () => {
  const { 
    data, 
    selectedWeek, 
    toggleDriverPayment, 
    markAllDriversPaid, 
    closeWeeklySettlement 
  } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendentes' | 'pagos'>('todos');
  const [selectedDriverForReceipt, setSelectedDriverForReceipt] = useState<DriverWeeklySummary | null>(null);
  const [copiedBatchPix, setCopiedBatchPix] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeNotes, setCloseNotes] = useState('');

  // Settlement for current selected week
  const currentSettlement = useMemo(() => {
    return data.settlements?.find((s) => s.weekStartDate === selectedWeek.startDate);
  }, [data.settlements, selectedWeek.startDate]);

  const { driverSummaries, overallStats } = useMemo(() => {
    return calculateWeeklySummary(
      data.drivers,
      data.records,
      selectedWeek,
      currentSettlement,
      data.settings
    );
  }, [data.drivers, data.records, selectedWeek, currentSettlement, data.settings]);

  // Filtered summaries
  const filteredSummaries = useMemo(() => {
    return driverSummaries.filter((s) => {
      // Search
      const matchSearch =
        !searchTerm.trim() ||
        s.driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.driver.nickname && s.driver.nickname.toLowerCase().includes(searchTerm.toLowerCase())) ||
        s.driver.pixKey.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      // Status
      if (statusFilter === 'pagos') return s.isPaid;
      if (statusFilter === 'pendentes') return !s.isPaid;
      return true;
    });
  }, [driverSummaries, searchTerm, statusFilter]);

  // Handle Mark All Paid with Confetti
  const handleMarkAllPaid = async () => {
    if (window.confirm(`Deseja marcar TODOS os ${driverSummaries.length} entregadores como PAGOS para a semana ${selectedWeek.label}?`)) {
      await markAllDriversPaid(selectedWeek.startDate);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    const csv = generateWeeklyReportCSV(selectedWeek, driverSummaries, overallStats, data.settings);
    downloadCSV(`fechamento_fiscal_pizzahut_${selectedWeek.startDate}_a_${selectedWeek.endDate}.csv`, csv);
  };

  // Copy batch PIX list for online banking transfers
  const handleCopyBatchPIX = () => {
    const lines: string[] = [];
    lines.push(`LISTA DE PAGAMENTOS PIX - SEMANA ${selectedWeek.label}`);
    lines.push(`---------------------------------------------`);
    driverSummaries
      .filter((s) => s.grandTotal > 0)
      .forEach((s) => {
        lines.push(`${s.driver.name} ${s.driver.nickname ? `(${s.driver.nickname})` : ''}: ${formatCurrency(s.grandTotal)} | PIX (${s.driver.pixType.toUpperCase()}): ${s.driver.pixKey}`);
      });
    lines.push(`---------------------------------------------`);
    lines.push(`TOTAL GERAL: ${formatCurrency(overallStats.grandTotalGross)}`);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedBatchPix(true);
    setTimeout(() => setCopiedBatchPix(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Summary Banner */}
      <div className="bg-slate-900 rounded-2xl p-5 sm:p-6 text-white border border-slate-800 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-red-600/30 text-red-300 text-xs font-bold rounded-full border border-red-500/20">
              Semana Fiscal #{selectedWeek.weekNumber} (Quarta a Terça)
            </span>
            <span className="text-xs text-slate-400">
              {formatDateBR(selectedWeek.startDate)} a {formatDateBR(selectedWeek.endDate)}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Fechamento Semanal da Cooperativa
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
            Demonstrativo consolidado de entregas, adicionais e quitação PIX dos motoboys
          </p>
        </div>

        {/* Global actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn_export_settlement_csv"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Exportar CSV</span>
          </button>

          <button
            id="btn_copy_batch_pix"
            onClick={handleCopyBatchPIX}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
            title="Copiar lista de chaves PIX e valores para transferências"
          >
            {copiedBatchPix ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
            <span>{copiedBatchPix ? 'PIX Copiados!' : 'Copiar Lote PIX'}</span>
          </button>

          <button
            id="btn_print_settlement"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            <span>Imprimir Folha</span>
          </button>

          <button
            id="btn_mark_all_paid"
            onClick={handleMarkAllPaid}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Quitar Todos via PIX</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Faturamento Total a Pagar</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(overallStats.grandTotalGross)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {overallStats.totalDeliveries} entregas + {overallStats.totalAdditionals} adicionais
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-600 uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Total Já Pago
          </span>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {formatCurrency(overallStats.totalPaidAmount)}
          </div>
          <p className="text-[11px] text-emerald-600 mt-1">
            {driverSummaries.filter((s) => s.isPaid).length} motoboys quitados
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-amber-600 uppercase flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Total Pendente
          </span>
          <div className="text-2xl font-black text-amber-700 mt-1">
            {formatCurrency(overallStats.totalPendingAmount)}
          </div>
          <p className="text-[11px] text-amber-600 mt-1">
            {driverSummaries.filter((s) => !s.isPaid).length} motoboys a pagar
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Entregadores Ativos</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {overallStats.activeDriversCount} <span className="text-sm font-normal text-slate-400">/ {data.drivers.length}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Com produção registrada no período
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, apelido ou chave PIX..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          {(['todos', 'pendentes', 'pagos'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                statusFilter === filter
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {filter === 'todos' && `Todos (${driverSummaries.length})`}
              {filter === 'pendentes' && `Pendentes (${driverSummaries.filter((s) => !s.isPaid).length})`}
              {filter === 'pagos' && `Pagos (${driverSummaries.filter((s) => s.isPaid).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Master Fechamento Semanal Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4 sticky left-0 bg-slate-900 z-10">Entregador / PIX</th>
                {selectedWeek.days.map((day) => (
                  <th key={day.date} className="py-3.5 px-2 text-center border-l border-slate-800">
                    <div>{day.shortName}</div>
                    <div className="text-[9px] text-slate-400 font-normal">{day.formattedDate}</div>
                  </th>
                ))}
                <th className="py-3.5 px-3 text-center border-l border-slate-800">Total Entregas</th>
                <th className="py-3.5 px-3 text-center border-l border-slate-800">Adicionais</th>
                <th className="py-3.5 px-4 text-right border-l border-slate-800">Total a Pagar</th>
                <th className="py-3.5 px-3 text-center border-l border-slate-800">Status</th>
                <th className="py-3.5 px-4 text-center border-l border-slate-800">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400 text-xs">
                    Nenhum entregador encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((summary) => (
                  <tr
                    key={summary.driver.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      summary.isPaid ? 'bg-emerald-50/20' : ''
                    }`}
                  >
                    {/* Driver Column (sticky on scroll) */}
                    <td className="py-3 px-4 sticky left-0 bg-white hover:bg-slate-50 z-10 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: summary.driver.color || '#ef4444' }}
                        >
                          {summary.driver.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{summary.driver.name}</span>
                            {summary.driver.nickname && (
                              <span className="text-[10px] bg-slate-100 text-slate-700 px-1 rounded font-semibold">
                                "{summary.driver.nickname}"
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                            <span>PIX: {summary.driver.pixKey}</span>
                            <span className="text-[9px] uppercase font-bold text-slate-400">({summary.driver.pixType})</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 7 Days Columns */}
                    {selectedWeek.days.map((day) => {
                      const d = summary.days[day.date];
                      const hasData = d && (d.deliveries > 0 || d.additionals > 0);

                      return (
                        <td
                          key={day.date}
                          className="py-3 px-2 text-center border-l border-slate-100 text-xs"
                        >
                          {hasData ? (
                            <div>
                              <span className="font-bold text-slate-900">{d.deliveries}</span>
                              {d.additionals > 0 && (
                                <span className="text-amber-600 font-bold text-[10px] ml-0.5">
                                  (+{d.additionals})
                                </span>
                              )}
                              <div className="text-[9px] text-slate-400">
                                {formatCurrency(d.total)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Total Deliveries */}
                    <td className="py-3 px-3 text-center border-l border-slate-100 font-bold text-slate-900">
                      <div>{summary.totalDeliveries}</div>
                      <div className="text-[9px] text-slate-400">
                        {formatCurrency(summary.totalBaseValue)}
                      </div>
                    </td>

                    {/* Total Additionals */}
                    <td className="py-3 px-3 text-center border-l border-slate-100 font-bold text-amber-600">
                      <div>+{summary.totalAdditionals}</div>
                      <div className="text-[9px] text-amber-600/80">
                        {formatCurrency(summary.totalAdditionalsValue)}
                      </div>
                    </td>

                    {/* Total a Pagar (Grand Total) */}
                    <td className="py-3 px-4 text-right border-l border-slate-100">
                      <div className="font-black text-sm text-slate-900">
                        {formatCurrency(summary.grandTotal)}
                      </div>
                    </td>

                    {/* Payment Status Pill */}
                    <td className="py-3 px-3 text-center border-l border-slate-100">
                      <button
                        onClick={() => toggleDriverPayment(selectedWeek.startDate, summary.driver.id, summary.grandTotal)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase transition-all cursor-pointer ${
                          summary.isPaid
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                        }`}
                        title="Clique para alternar status de pagamento"
                      >
                        {summary.isPaid ? '✓ PAGO' : '⏳ PENDENTE'}
                      </button>
                    </td>

                    {/* Actions Column */}
                    <td className="py-3 px-4 text-center border-l border-slate-100">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedDriverForReceipt(summary)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                          title="Ver Extrato e Recibo p/ WhatsApp"
                        >
                          <Eye className="w-3.5 h-3.5 text-red-600" />
                          <span>Extrato</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Table Footer with Sum Totals */}
            <tfoot>
              <tr className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-800">
                <td className="py-4 px-4 sticky left-0 bg-slate-900 z-10 uppercase tracking-wider">
                  TOTAL GERAL DA SEMANA
                </td>
                {selectedWeek.days.map((day) => {
                  const dayTot = overallStats.dailyTotals[day.date];
                  return (
                    <td key={day.date} className="py-4 px-2 text-center border-l border-slate-800">
                      {dayTot && (dayTot.deliveries > 0 || dayTot.additionals > 0) ? (
                        <div>
                          <div>{dayTot.deliveries} ent.</div>
                          {dayTot.additionals > 0 && (
                            <div className="text-amber-400 text-[10px]">+{dayTot.additionals} adic.</div>
                          )}
                          <div className="text-[10px] text-emerald-400">{formatCurrency(dayTot.amount)}</div>
                        </div>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  );
                })}
                <td className="py-4 px-3 text-center border-l border-slate-800">
                  <div>{overallStats.totalDeliveries}</div>
                  <div className="text-[10px] text-slate-400">{formatCurrency(overallStats.totalBaseGross)}</div>
                </td>
                <td className="py-4 px-3 text-center border-l border-slate-800 text-amber-400">
                  <div>+{overallStats.totalAdditionals}</div>
                  <div className="text-[10px] text-amber-400">{formatCurrency(overallStats.totalAdditionalsGross)}</div>
                </td>
                <td className="py-4 px-4 text-right border-l border-slate-800 text-emerald-400 text-sm">
                  {formatCurrency(overallStats.grandTotalGross)}
                </td>
                <td colSpan={2} className="py-4 px-4 text-center border-l border-slate-800 text-[11px] text-slate-300">
                  Pago: {formatCurrency(overallStats.totalPaidAmount)} | Pend: {formatCurrency(overallStats.totalPendingAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Driver Receipt Modal */}
      {selectedDriverForReceipt && (
        <DriverReceiptModal
          summary={selectedDriverForReceipt}
          weekInfo={selectedWeek}
          settings={data.settings}
          onClose={() => setSelectedDriverForReceipt(null)}
          onTogglePaid={async () => {
            await toggleDriverPayment(
              selectedWeek.startDate,
              selectedDriverForReceipt.driver.id,
              selectedDriverForReceipt.grandTotal
            );
            // Refresh modal summary status
            setSelectedDriverForReceipt((prev) =>
              prev ? { ...prev, isPaid: !prev.isPaid } : null
            );
          }}
        />
      )}
    </div>
  );
};
