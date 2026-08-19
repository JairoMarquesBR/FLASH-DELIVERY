import React, { useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Package, 
  PlusCircle, 
  Trophy, 
  Users, 
  Calendar, 
  ArrowUpRight, 
  FileSpreadsheet, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Plus,
  Activity,
  Flame,
  ArrowRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart 
} from 'recharts';
import { useData } from '../context/DataContext';
import { calculateWeeklySummary, formatCurrency } from '../utils/calcUtils';
import { generateWeeklyReportCSV, downloadCSV } from '../utils/csvUtils';

interface DashboardViewProps {
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateTab }) => {
  const { data, selectedWeek } = useData();

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

  // Data for Day of Week Chart (Qua -> Ter)
  const dailyChartData = useMemo(() => {
    return selectedWeek.days.map((day) => {
      const stats = overallStats.dailyTotals[day.date] || { deliveries: 0, additionals: 0, amount: 0 };
      return {
        dayName: `${day.shortName} (${day.formattedDate})`,
        shortDay: day.shortName,
        fullDayName: day.dayLabel,
        date: day.date,
        entregas: stats.deliveries,
        adicionais: stats.additionals,
        faturamento: stats.amount,
        isToday: day.isToday,
      };
    });
  }, [selectedWeek.days, overallStats.dailyTotals]);

  // Data for Driver Ranking Chart (Top Motoboys)
  const driverRankingData = useMemo(() => {
    return driverSummaries
      .filter((s) => s.totalDeliveries > 0 || s.totalAdditionals > 0)
      .slice(0, 6)
      .map((s) => ({
        name: s.driver.nickname ? `${s.driver.name.split(' ')[0]} (${s.driver.nickname})` : s.driver.name.split(' ')[0],
        fullName: s.driver.name,
        entregas: s.totalDeliveries,
        adicionais: s.totalAdditionals,
        totalPagar: s.grandTotal,
        isPaid: s.isPaid,
      }));
  }, [driverSummaries]);

  // Data for Pie Chart (Base vs Adicionais)
  const pieData = useMemo(() => {
    return [
      { name: `Taxa Base (R$ ${data.settings.baseDeliveryRate.toFixed(2)})`, value: overallStats.totalBaseGross, color: '#dc2626' },
      { name: `Adicionais (+R$ ${data.settings.additionalRate.toFixed(2)})`, value: overallStats.totalAdditionalsGross, color: '#2563eb' },
    ].filter((item) => item.value > 0);
  }, [overallStats.totalBaseGross, overallStats.totalAdditionalsGross, data.settings]);

  const activeDriverRatio = useMemo(() => {
    const total = data.drivers.length;
    const active = data.drivers.filter(d => d.active).length;
    const pct = total > 0 ? Math.round((active / total) * 100) : 0;
    return { active, total, pct };
  }, [data.drivers]);

  return (
    <div className="space-y-5 pb-8">
      {/* High Density Metric Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Financeiro a Pagar */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total a Pagar na Semana</span>
            <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-mono text-xs font-bold">
              R$
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
              {formatCurrency(overallStats.grandTotalGross)}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 font-medium">
              <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Pago: {formatCurrency(overallStats.totalPaidAmount)}
              </span>
              <span className="text-amber-700 flex items-center gap-1 font-semibold">
                <Clock className="w-3.5 h-3.5" />
                Pend: {formatCurrency(overallStats.totalPendingAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Total de Entregas */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Volume de Entregas</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight flex items-baseline gap-1.5">
              {overallStats.totalDeliveries} <span className="text-xs font-normal text-slate-500">corridas</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 text-slate-600">
              <span>Base (R$ {data.settings.baseDeliveryRate.toFixed(2)}/un):</span>
              <strong className="text-slate-900 font-mono">{formatCurrency(overallStats.totalBaseGross)}</strong>
            </div>
          </div>
        </div>

        {/* Card 3: Total de Adicionais (+ R$ 2) */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Adicionais (+R$ {data.settings.additionalRate.toFixed(2)})</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <PlusCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600 font-mono tracking-tight flex items-baseline gap-1">
              +{overallStats.totalAdditionals} <span className="text-xs font-normal text-slate-500">adicionais</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 text-slate-600">
              <span>Faturamento Adicional:</span>
              <strong className="text-blue-700 font-mono">{formatCurrency(overallStats.totalAdditionalsGross)}</strong>
            </div>
          </div>
        </div>

        {/* Card 4: Motoboy Destaque */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Motoboy Destaque</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div>
            {overallStats.topDriver ? (
              <>
                <div className="text-sm font-bold text-slate-900 truncate">
                  {overallStats.topDriver.name}
                  {overallStats.topDriver.nickname && (
                    <span className="text-xs font-normal text-slate-500 ml-1">
                      "{overallStats.topDriver.nickname}"
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 font-medium">
                  <span className="text-slate-600 font-mono"><strong>{overallStats.topDriver.deliveries}</strong> corridas</span>
                  <strong className="text-emerald-700 font-mono">{formatCurrency(overallStats.topDriver.amount)}</strong>
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400 italic py-1">
                Sem registros na semana
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Charts & Cooperative Status Row */}
      <div className="grid grid-cols-12 gap-5">
        {/* Evolution Chart (Qua a Ter) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h2 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-600" />
                Produtividade Semanal (Quarta a Terça)
              </h2>
              <p className="text-[11px] text-slate-500">
                Evolução diária de corridas base e adicionais
              </p>
            </div>
            <div className="flex gap-1.5 text-xs">
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold text-[10px]">
                Base: R$ {data.settings.baseDeliveryRate.toFixed(2)}
              </span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold text-[10px]">
                Adic: +R$ {data.settings.additionalRate.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="p-4 flex-1">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="dayName" 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} 
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis 
                    yAxisId="left" 
                    tick={{ fill: '#64748b', fontSize: 10 }} 
                    axisLine={{ stroke: '#e2e8f0' }}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    formatter={(value: any, name: any) => {
                      if (name === 'Faturamento (R$)') return [formatCurrency(Number(value)), name];
                      return [value, name];
                    }}
                    contentStyle={{ backgroundColor: '#0c0e12', borderRadius: '8px', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar 
                    yAxisId="left" 
                    dataKey="entregas" 
                    name="Entregas Padrão (R$ 9)" 
                    fill="#dc2626" 
                    radius={[3, 3, 0, 0]} 
                    barSize={20} 
                  />
                  <Bar 
                    yAxisId="left" 
                    dataKey="adicionais" 
                    name="Adicionais (+ R$ 2)" 
                    fill="#2563eb" 
                    radius={[3, 3, 0, 0]} 
                    barSize={20} 
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-500 font-medium">
            <span>Volume total da semana: <strong className="text-slate-800 font-mono">{overallStats.totalDeliveries} entregas</strong></span>
            <span>Total acumulado: <strong className="text-emerald-700 font-mono">{formatCurrency(overallStats.grandTotalGross)}</strong></span>
          </div>
        </div>

        {/* High Density Status Card */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          {/* Dark Status Card from Design Theme */}
          <div className="bg-[#1a1c1e] text-white p-5 rounded-xl shadow-lg relative overflow-hidden border border-white/10 flex flex-col justify-between space-y-4">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] uppercase tracking-widest text-red-500 font-bold flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  Status da Cooperativa
                </h3>
                <span className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                  PIZZA HUT
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end text-xs">
                  <span className="text-slate-300">Entregadores Ativos</span>
                  <span className="text-lg font-bold font-mono text-white">
                    {activeDriverRatio.active} / {activeDriverRatio.total}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)] transition-all duration-500"
                    style={{ width: `${activeDriverRatio.pct}%` }}
                  />
                </div>
              </div>

              <div className="pt-2">
                <div className="bg-white/5 rounded-lg p-3 border border-white/10 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wide flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-400" />
                    Balanço da Semana Fiscal
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300">
                    Ciclo de <strong className="text-white">Quarta a Terça</strong> com fechamento e repasse via PIX programado.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
              <button
                onClick={() => onNavigateTab('daily')}
                className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                Lançar Produção <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onNavigateTab('settlement')}
                className="text-xs text-slate-300 hover:text-white font-medium cursor-pointer"
              >
                Ver Fechamento
              </button>
            </div>
          </div>

          {/* Mini Quick Couriers Status */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-red-600" />
                Quitação PIX da Semana
              </h4>
              <span className="text-[10px] font-bold text-slate-500">
                {driverSummaries.filter((s) => s.isPaid).length}/{driverSummaries.length} Pagos
              </span>
            </div>

            <div className="space-y-1.5">
              {driverSummaries.slice(0, 4).map((s) => (
                <div key={s.driver.id} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-slate-50">
                  <div className="truncate">
                    <span className="font-semibold text-slate-900 block truncate">{s.driver.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{s.totalDeliveries} ent. (+{s.totalAdditionals})</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-slate-900 text-xs block">{formatCurrency(s.grandTotal)}</span>
                    <span className={`text-[9px] font-bold px-1 rounded ${s.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {s.isPaid ? 'PAGO' : 'PENDENTE'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => onNavigateTab('settlement')}
              className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors cursor-pointer text-center"
            >
              Abrir Fechamento Completo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
