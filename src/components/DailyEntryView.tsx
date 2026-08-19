import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Calendar, 
  Trash2, 
  Edit3, 
  Check, 
  Save, 
  Sparkles, 
  Layers, 
  UserCheck, 
  Clock, 
  FileText, 
  AlertCircle,
  PlusCircle,
  MinusCircle,
  X,
  Search,
  CheckCircle2
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { calculateRecordTotal, formatCurrency } from '../utils/calcUtils';
import { formatDateBR, formatDateISO } from '../utils/dateUtils';
import { AdditionalReason, DeliveryRecord, ShiftType } from '../types';

interface GridEntry {
  deliveriesCount: number;
  additionalsCount: number;
  shift: ShiftType;
  notes: string;
}

export const DailyEntryView: React.FC = () => {
  const { data, selectedWeek, addOrUpdateRecord, deleteRecord, batchUpdateDailyGrid } = useData();

  // Selected Day inside the Fiscal Week (default to today if in range, otherwise first day = Wednesday)
  const todayStr = formatDateISO(new Date());
  const initialDay = useMemo(() => {
    const isTodayInWeek = selectedWeek.days.some((d) => d.date === todayStr);
    if (isTodayInWeek) return todayStr;
    return selectedWeek.days[0].date;
  }, [selectedWeek, todayStr]);

  const [selectedDate, setSelectedDate] = useState<string>(initialDay);
  const [activeMode, setActiveMode] = useState<'grid' | 'single'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Current day records
  const dayRecords = useMemo(() => {
    return data.records.filter((r) => r.date === selectedDate);
  }, [data.records, selectedDate]);

  // Active drivers
  const activeDrivers = useMemo(() => {
    return data.drivers.filter((d) => d.active);
  }, [data.drivers]);

  // State for Grid Mode (one entry per driver)
  const [gridEntries, setGridEntries] = useState<Record<string, GridEntry>>({});

  // Sync grid entries whenever day records or active drivers change
  useEffect(() => {
    const initial: Record<string, GridEntry> = {};
    activeDrivers.forEach((driver) => {
      const rec = dayRecords.find((r) => r.driverId === driver.id);
      if (rec) {
        initial[driver.id] = {
          deliveriesCount: rec.deliveriesCount,
          additionalsCount: rec.additionalsCount,
          shift: rec.shift,
          notes: rec.notes || '',
        };
      } else {
        initial[driver.id] = {
          deliveriesCount: 0,
          additionalsCount: 0,
          shift: 'geral',
          notes: '',
        };
      }
    });
    setGridEntries(initial);
  }, [dayRecords, activeDrivers, selectedDate]);

  // Handle single record modal / form state
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [singleDriverId, setSingleDriverId] = useState<string>('');
  const [singleDeliveries, setSingleDeliveries] = useState<number>(1);
  const [singleAdditionals, setSingleAdditionals] = useState<number>(0);
  const [singleReasons, setSingleReasons] = useState<AdditionalReason[]>([]);
  const [singleShift, setSingleShift] = useState<ShiftType>('jantar');
  const [singleNotes, setSingleNotes] = useState<string>('');

  const openNewSingleModal = (driverId?: string) => {
    setEditingRecordId(null);
    setSingleDriverId(driverId || activeDrivers[0]?.id || '');
    setSingleDeliveries(1);
    setSingleAdditionals(0);
    setSingleReasons([]);
    setSingleShift('jantar');
    setSingleNotes('');
    setIsSingleModalOpen(true);
  };

  const openEditSingleModal = (record: DeliveryRecord) => {
    setEditingRecordId(record.id);
    setSingleDriverId(record.driverId);
    setSingleDeliveries(record.deliveriesCount);
    setSingleAdditionals(record.additionalsCount);
    setSingleReasons(record.additionalReasons || []);
    setSingleShift(record.shift);
    setSingleNotes(record.notes || '');
    setIsSingleModalOpen(true);
  };

  const handleSaveSingleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleDriverId) return;

    await addOrUpdateRecord({
      id: editingRecordId || undefined,
      driverId: singleDriverId,
      date: selectedDate,
      deliveriesCount: Number(singleDeliveries) || 0,
      additionalsCount: Number(singleAdditionals) || 0,
      additionalReasons: singleReasons,
      shift: singleShift,
      notes: singleNotes.trim() || undefined,
      baseRate: data.settings.baseDeliveryRate,
      additionalRate: data.settings.additionalRate,
    });

    setIsSingleModalOpen(false);
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 2500);
  };

  // Grid update handlers
  const updateGridField = (driverId: string, field: 'deliveriesCount' | 'additionalsCount' | 'shift' | 'notes', value: any) => {
    setGridEntries((prev) => ({
      ...prev,
      [driverId]: {
        ...prev[driverId],
        [field]: value,
      },
    }));
  };

  const adjustGridCount = (driverId: string, field: 'deliveriesCount' | 'additionalsCount', delta: number) => {
    setGridEntries((prev) => {
      const current = prev[driverId]?.[field] || 0;
      const nextVal = Math.max(0, current + delta);
      return {
        ...prev,
        [driverId]: {
          ...prev[driverId],
          [field]: nextVal,
        },
      };
    });
  };

  const handleSaveGrid = async () => {
    const entriesToSave = (Object.entries(gridEntries) as [string, GridEntry][]).map(([driverId, entry]) => ({
      driverId,
      deliveriesCount: entry.deliveriesCount,
      additionalsCount: entry.additionalsCount,
      shift: entry.shift,
      notes: entry.notes.trim() || undefined,
    }));

    await batchUpdateDailyGrid(selectedDate, entriesToSave);
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 2500);
  };

  // Day calculations
  const dayTotals = useMemo(() => {
    let totalEnt = 0;
    let totalAdic = 0;
    let totalAmount = 0;
    let driversWithDeliveries = 0;

    (Object.values(gridEntries) as GridEntry[]).forEach((entry) => {
      if (entry.deliveriesCount > 0 || entry.additionalsCount > 0) {
        totalEnt += entry.deliveriesCount;
        totalAdic += entry.additionalsCount;
        totalAmount += calculateRecordTotal(
          entry.deliveriesCount,
          entry.additionalsCount,
          data.settings.baseDeliveryRate,
          data.settings.additionalRate
        );
        driversWithDeliveries++;
      }
    });

    return {
      deliveries: totalEnt,
      additionals: totalAdic,
      amount: totalAmount,
      activeCouriers: driversWithDeliveries,
    };
  }, [gridEntries, data.settings]);

  // Filtered drivers for grid
  const filteredActiveDrivers = useMemo(() => {
    if (!searchTerm.trim()) return activeDrivers;
    const term = searchTerm.toLowerCase();
    return activeDrivers.filter(
      (d) =>
        d.name.toLowerCase().includes(term) ||
        (d.nickname && d.nickname.toLowerCase().includes(term)) ||
        d.pixKey.toLowerCase().includes(term)
    );
  }, [activeDrivers, searchTerm]);

  const selectedFiscalDay = selectedWeek.days.find((d) => d.date === selectedDate);

  const toggleReason = (reason: AdditionalReason) => {
    setSingleReasons((prev) => {
      if (prev.includes(reason)) {
        return prev.filter((r) => r !== reason);
      }
      return [...prev, reason];
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Day Selector Tabs (Qua a Ter) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-red-600" />
            <h2 className="font-bold text-base text-slate-900">
              Selecione o Dia da Semana Fiscal (Quarta a Terça)
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Semana #{selectedWeek.weekNumber} ({selectedWeek.label})
          </span>
        </div>

        {/* 7 Days Button Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {selectedWeek.days.map((day) => {
            const isSelected = day.date === selectedDate;
            const recordsThisDay = data.records.filter((r) => r.date === day.date);
            const totalDeliveriesThisDay = recordsThisDay.reduce((s, r) => s + r.deliveriesCount, 0);
            const totalAdditionalsThisDay = recordsThisDay.reduce((s, r) => s + r.additionalsCount, 0);

            return (
              <button
                key={day.date}
                id={`btn_select_day_${day.date}`}
                onClick={() => setSelectedDate(day.date)}
                className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-red-600 text-white border-red-700 shadow-md shadow-red-900/20 ring-2 ring-red-400'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black uppercase tracking-wider ${isSelected ? 'text-red-100' : 'text-slate-500'}`}>
                    {day.shortName}
                  </span>
                  {day.isToday && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white text-red-700' : 'bg-red-100 text-red-700'}`}>
                      Hoje
                    </span>
                  )}
                </div>

                <div className="my-1.5">
                  <div className={`text-sm sm:text-base font-black ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {day.formattedDate}
                  </div>
                  <div className={`text-[11px] truncate ${isSelected ? 'text-red-100' : 'text-slate-500'}`}>
                    {day.dayLabel}
                  </div>
                </div>

                {/* Delivery count pill */}
                <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center justify-between ${
                  isSelected ? 'bg-red-800/60 text-white' : 'bg-slate-200/80 text-slate-700'
                }`}>
                  <span>{totalDeliveriesThisDay} ent.</span>
                  {totalAdditionalsThisDay > 0 && (
                    <span className={isSelected ? 'text-amber-300' : 'text-amber-700'}>
                      +{totalAdditionalsThisDay}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Summary Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-red-600 px-2 py-0.5 rounded font-bold uppercase">
              {selectedFiscalDay?.dayLabel}
            </span>
            <h1 className="text-lg sm:text-xl font-black tracking-tight">
              Lançamentos de {formatDateBR(selectedDate)}
            </h1>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Preencha o total de entregas (R$ {data.settings.baseDeliveryRate.toFixed(2)}) e adicionais (+R$ {data.settings.additionalRate.toFixed(2)}) dos motoboys neste dia.
          </p>
        </div>

        {/* Totals in real-time */}
        <div className="flex flex-wrap items-center gap-4 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Entregas do Dia</span>
            <span className="text-base font-black text-white">{dayTotals.deliveries}</span>
          </div>
          <div className="border-l border-slate-700 pl-3">
            <span className="text-[10px] text-amber-400 uppercase font-bold block">Adicionais</span>
            <span className="text-base font-black text-amber-400">+{dayTotals.additionals}</span>
          </div>
          <div className="border-l border-slate-700 pl-3">
            <span className="text-[10px] text-emerald-400 uppercase font-bold block">Total a Pagar</span>
            <span className="text-base font-black text-emerald-400">{formatCurrency(dayTotals.amount)}</span>
          </div>
        </div>
      </div>

      {/* Mode Switcher & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
          <button
            id="btn_mode_grid"
            onClick={() => setActiveMode('grid')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'grid'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-red-600" />
            <span>Grade Rápida do Turno (Todos os Motoboys)</span>
          </button>
          <button
            id="btn_mode_single"
            onClick={() => setActiveMode('single')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'single'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-red-600" />
            <span>Histórico de Lançamentos ({dayRecords.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar motoboy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <button
            id="btn_open_single_modal"
            onClick={() => openNewSingleModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Lançamento Avulso</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>Lançamentos salvos com sucesso no banco de dados local!</span>
        </div>
      )}

      {/* MODE 1: Fast Shift Grid (Recommended for end of shift / closing) */}
      {activeMode === 'grid' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-red-600" />
                Grade de Entregadores do Dia ({formatDateBR(selectedDate)})
              </h3>
              <p className="text-xs text-slate-500">
                Ajuste os valores usando os botões rápidos ou digitando diretamente nos campos.
              </p>
            </div>

            <button
              id="btn_save_daily_grid"
              onClick={handleSaveGrid}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-900/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Todos os Lançamentos</span>
            </button>
          </div>

          {filteredActiveDrivers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Nenhum entregador ativo encontrado. Cadastre entregadores na aba "Entregadores".
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Entregador</th>
                    <th className="py-3 px-3">Turno</th>
                    <th className="py-3 px-4 text-center">Entregas (R$ {data.settings.baseDeliveryRate.toFixed(2)})</th>
                    <th className="py-3 px-4 text-center">Adicionais (+R$ {data.settings.additionalRate.toFixed(2)})</th>
                    <th className="py-3 px-4 text-right">Total a Pagar</th>
                    <th className="py-3 px-4">Observações / Motivo Adicional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredActiveDrivers.map((driver) => {
                    const entry = gridEntries[driver.id] || { deliveriesCount: 0, additionalsCount: 0, shift: 'geral', notes: '' };
                    const rowTotal = calculateRecordTotal(
                      entry.deliveriesCount,
                      entry.additionalsCount,
                      data.settings.baseDeliveryRate,
                      data.settings.additionalRate
                    );
                    const hasDeliveries = entry.deliveriesCount > 0 || entry.additionalsCount > 0;

                    return (
                      <tr
                        key={driver.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          hasDeliveries ? 'bg-red-50/20' : ''
                        }`}
                      >
                        {/* Driver info */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                              style={{ backgroundColor: driver.color || '#ef4444' }}
                            >
                              {driver.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{driver.name}</span>
                                {driver.nickname && (
                                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded">
                                    "{driver.nickname}"
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                PIX: {driver.pixKey} ({driver.pixType.toUpperCase()})
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Shift */}
                        <td className="py-3 px-3">
                          <select
                            value={entry.shift}
                            onChange={(e) => updateGridField(driver.id, 'shift', e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500"
                          >
                            <option value="geral">Geral</option>
                            <option value="jantar">Jantar</option>
                            <option value="almoco">Almoço</option>
                            <option value="madrugada">Madrugada</option>
                          </select>
                        </td>

                        {/* Deliveries counter */}
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => adjustGridCount(driver.id, 'deliveriesCount', -1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-colors cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={entry.deliveriesCount}
                              onChange={(e) => updateGridField(driver.id, 'deliveriesCount', Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-14 text-center font-black text-sm text-slate-900 border border-slate-300 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                            <button
                              type="button"
                              onClick={() => adjustGridCount(driver.id, 'deliveriesCount', 1)}
                              className="w-7 h-7 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 font-bold flex items-center justify-center transition-colors cursor-pointer"
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              onClick={() => adjustGridCount(driver.id, 'deliveriesCount', 5)}
                              className="px-1.5 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[10px] flex items-center justify-center transition-colors cursor-pointer"
                              title="+5 entregas"
                            >
                              +5
                            </button>
                          </div>
                        </td>

                        {/* Additionals counter */}
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => adjustGridCount(driver.id, 'additionalsCount', -1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-colors cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={entry.additionalsCount}
                              onChange={(e) => updateGridField(driver.id, 'additionalsCount', Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-12 text-center font-black text-sm text-amber-600 border border-amber-300 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/40"
                            />
                            <button
                              type="button"
                              onClick={() => adjustGridCount(driver.id, 'additionalsCount', 1)}
                              className="w-7 h-7 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold flex items-center justify-center transition-colors cursor-pointer"
                            >
                              +1
                            </button>
                          </div>
                        </td>

                        {/* Row Total */}
                        <td className="py-3 px-4 text-right">
                          <div className="font-black text-sm text-slate-900">
                            {formatCurrency(rowTotal)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            ({entry.deliveriesCount}x9 + {entry.additionalsCount}x2)
                          </div>
                        </td>

                        {/* Notes */}
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            placeholder="Ex: +2 raio longo, chuva..."
                            value={entry.notes}
                            onChange={(e) => updateGridField(driver.id, 'notes', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500 focus:bg-white"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Bottom Save Bar */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Total do dia: <strong className="text-slate-900">{dayTotals.deliveries} entregas</strong>, <strong className="text-amber-700">+{dayTotals.additionals} adicionais</strong> = <strong className="text-emerald-700">{formatCurrency(dayTotals.amount)}</strong>
            </div>

            <button
              onClick={handleSaveGrid}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Todos os Lançamentos do Dia</span>
            </button>
          </div>
        </div>
      )}

      {/* MODE 2: Individual Record History & Details */}
      {activeMode === 'single' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Lançamentos Registrados em {formatDateBR(selectedDate)}
              </h3>
              <p className="text-xs text-slate-500">
                Histórico detalhado com comprovante de turno e justificativas
              </p>
            </div>

            <button
              onClick={() => openNewSingleModal()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Registro</span>
            </button>
          </div>

          {dayRecords.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-xs">
              Nenhum lançamento gravado para {formatDateBR(selectedDate)}. Utilize a Grade Rápida ou o botão "Novo Registro" acima.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Entregador</th>
                    <th className="py-3 px-3">Turno</th>
                    <th className="py-3 px-3 text-center">Entregas</th>
                    <th className="py-3 px-3 text-center">Adicionais</th>
                    <th className="py-3 px-3">Motivos</th>
                    <th className="py-3 px-4 text-right">Valor Total</th>
                    <th className="py-3 px-4">Observações</th>
                    <th className="py-3 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dayRecords.map((rec) => {
                    const driver = data.drivers.find((d) => d.id === rec.driverId);
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">
                            {driver?.name || 'Desconhecido'}
                            {driver?.nickname && (
                              <span className="text-slate-500 text-[10px] ml-1">
                                "{driver.nickname}"
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {driver?.pixKey}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 uppercase">
                            {rec.shift}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-900">
                          {rec.deliveriesCount}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-amber-600">
                          +{rec.additionalsCount}
                        </td>
                        <td className="py-3 px-3">
                          {rec.additionalReasons && rec.additionalReasons.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {rec.additionalReasons.map((reason) => (
                                <span
                                  key={reason}
                                  className="text-[9px] font-medium bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded"
                                >
                                  {reason.replace('_', ' ')}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">
                          {formatCurrency(rec.totalValue)}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs truncate max-w-xs">
                          {rec.notes || '-'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditSingleModal(rec)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg"
                              title="Editar"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteRecord(rec.id)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal for Single / Detailed Record Form */}
      {isSingleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-red-100 text-red-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {editingRecordId ? 'Editar Lançamento' : 'Novo Lançamento Individual'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Data: {formatDateBR(selectedDate)} ({selectedFiscalDay?.dayLabel})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSingleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSingleRecord} className="space-y-4 text-xs">
              {/* Driver Select */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Selecione o Entregador *
                </label>
                <select
                  value={singleDriverId}
                  onChange={(e) => setSingleDriverId(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {activeDrivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} {driver.nickname ? `(${driver.nickname})` : ''} - PIX: {driver.pixKey}
                    </option>
                  ))}
                </select>
              </div>

              {/* Shift */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Turno da Operação
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['jantar', 'almoco', 'madrugada', 'geral'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSingleShift(s)}
                      className={`py-2 rounded-xl border text-xs font-bold capitalize transition-all ${
                        singleShift === s
                          ? 'bg-red-600 text-white border-red-600 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deliveries Count with Big Tap Buttons */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">
                    Quantidade de Entregas Base (R$ {data.settings.baseDeliveryRate.toFixed(2)} cada)
                  </label>
                  <span className="text-xs font-bold text-slate-600">
                    = {formatCurrency(singleDeliveries * data.settings.baseDeliveryRate)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSingleDeliveries((prev) => Math.max(0, prev - 1))}
                    className="w-10 h-10 rounded-xl bg-slate-200 hover:bg-slate-300 font-black text-base text-slate-800 flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={singleDeliveries}
                    onChange={(e) => setSingleDeliveries(Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 text-center font-black text-lg bg-white border border-slate-300 rounded-xl py-1.5 text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setSingleDeliveries((prev) => prev + 1)}
                    className="w-10 h-10 rounded-xl bg-red-600 hover:bg-red-700 font-black text-base text-white flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  {[5, 10, 15, 20].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSingleDeliveries(preset)}
                      className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-[10px] font-bold text-slate-700"
                    >
                      {preset} ent.
                    </button>
                  ))}
                </div>
              </div>

              {/* Additionals Count (+ R$ 2 each) */}
              <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-amber-900">
                    Adicionais de Raio / Chuva / Noturno (+R$ {data.settings.additionalRate.toFixed(2)} cada)
                  </label>
                  <span className="text-xs font-bold text-amber-800">
                    = +{formatCurrency(singleAdditionals * data.settings.additionalRate)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSingleAdditionals((prev) => Math.max(0, prev - 1))}
                    className="w-10 h-10 rounded-xl bg-amber-200 hover:bg-amber-300 font-black text-base text-amber-900 flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={singleAdditionals}
                    onChange={(e) => setSingleAdditionals(Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 text-center font-black text-lg bg-white border border-amber-300 rounded-xl py-1.5 text-amber-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setSingleAdditionals((prev) => prev + 1)}
                    className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-600 font-black text-base text-white flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>

                {/* Additional Reasons Tags */}
                <div className="pt-1">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Motivos do Adicional (Opcional):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'raio_longo', label: 'Raio Estendido (>5km)' },
                      { id: 'chuva_tempo', label: 'Chuva / Tempo Ruim' },
                      { id: 'taxa_noturna', label: 'Taxa Noturna / Madrugada' },
                      { id: 'parada_extra', label: 'Parada Extra / Retorno' },
                      { id: 'area_risco', label: 'Área de Acesso Especial' },
                    ].map((reason) => {
                      const isSelected = singleReasons.includes(reason.id as AdditionalReason);
                      return (
                        <button
                          key={reason.id}
                          type="button"
                          onClick={() => toggleReason(reason.id as AdditionalReason)}
                          className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all ${
                            isSelected
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-amber-400'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '} {reason.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Total Calculation Display */}
              <div className="bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">Total a Pagar ao Motoboy</span>
                  <span className="text-xs text-slate-300">
                    ({singleDeliveries} x R$ 9) + ({singleAdditionals} x R$ 2)
                  </span>
                </div>
                <div className="text-xl font-black text-emerald-400">
                  {formatCurrency(calculateRecordTotal(singleDeliveries, singleAdditionals, data.settings.baseDeliveryRate, data.settings.additionalRate))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Observações / Detalhes (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Entregou pedido grande com bag extra..."
                  value={singleNotes}
                  onChange={(e) => setSingleNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSingleModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow"
                >
                  <Check className="w-4 h-4" />
                  <span>Gravar Lançamento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
