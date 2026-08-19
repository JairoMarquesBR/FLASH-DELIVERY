import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  AppSettings, 
  DatabaseState, 
  DeliveryRecord, 
  Driver, 
  FiscalWeekInfo, 
  IndividualOrder, 
  WeeklySettlement, 
  ShiftType 
} from '../types';
import { generateSeedData, DEFAULT_SETTINGS } from '../data/seedData';
import { calculateRecordTotal } from '../utils/calcUtils';
import { generateFiscalWeekOptions, getFiscalWeekInfo, formatDateISO } from '../utils/dateUtils';

interface NetworkInfo {
  port: number;
  localIPs: string[];
  primaryUrl: string;
  allUrls: string[];
  hostname?: string;
}

interface DataContextType {
  data: DatabaseState;
  isLoading: boolean;
  isSaving: boolean;
  isSyncError: boolean;
  networkInfo: NetworkInfo | null;
  selectedWeek: FiscalWeekInfo;
  availableWeeks: FiscalWeekInfo[];
  setSelectedWeekStart: (startDate: string) => void;
  goToCurrentWeek: () => void;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  
  // Records
  addOrUpdateRecord: (record: Omit<DeliveryRecord, 'id' | 'createdAt' | 'totalValue'> & { id?: string }) => Promise<void>;
  deleteRecord: (recordId: string) => Promise<void>;
  batchUpdateDailyGrid: (
    date: string, 
    entries: { driverId: string; deliveriesCount: number; additionalsCount: number; shift?: ShiftType; notes?: string }[]
  ) => Promise<void>;

  // Drivers
  addDriver: (driverData: Omit<Driver, 'id' | 'createdAt'>) => Promise<string>;
  updateDriver: (id: string, updates: Partial<Driver>) => Promise<void>;
  deleteDriver: (id: string) => Promise<void>;
  toggleDriverStatus: (id: string) => Promise<void>;

  // Weekly Settlement & Payments
  toggleDriverPayment: (weekStartDate: string, driverId: string, amount?: number, note?: string) => Promise<void>;
  markAllDriversPaid: (weekStartDate: string) => Promise<void>;
  closeWeeklySettlement: (weekStartDate: string, notes?: string) => Promise<void>;

  // Settings & DB Management
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  resetDatabase: () => Promise<void>;
  importBackup: (backupState: DatabaseState) => Promise<boolean>;
  refreshData: () => Promise<void>;
}

const LOCAL_STORAGE_KEY = 'pizzahut_cooperativa_db_v1';

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<DatabaseState>(() => {
    // Try local storage initial state before server loads
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return generateSeedData();
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSyncError, setIsSyncError] = useState<boolean>(false);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);

  // Available fiscal weeks
  const availableWeeks = useMemo(() => generateFiscalWeekOptions(16, 4), []);
  
  // Selected week start date string (default to current fiscal week)
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(() => {
    return getFiscalWeekInfo(new Date()).startDate;
  });

  const selectedWeek = useMemo(() => {
    const found = availableWeeks.find((w) => w.startDate === selectedWeekStart);
    if (found) return found;
    return getFiscalWeekInfo(new Date(selectedWeekStart + 'T12:00:00'));
  }, [availableWeeks, selectedWeekStart]);

  // Fetch network info
  const fetchNetworkInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/network-info');
      if (res.ok) {
        const json = await res.json();
        setNetworkInfo(json);
      }
    } catch {
      // Ignore network info failure in client mode
    }
  }, []);

  // Sync state to server & local storage
  const persistState = useCallback(async (nextState: DatabaseState) => {
    setIsSaving(true);
    setData(nextState);
    
    // Save to localStorage immediately
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextState));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }

    // Save to local Express backend server
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextState),
      });
      if (!res.ok) {
        setIsSyncError(true);
      } else {
        setIsSyncError(false);
      }
    } catch (err) {
      console.warn('Server sync failed, running in offline/local mode:', err);
      setIsSyncError(true);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Fetch initial data from server
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.drivers && json.data.records) {
          setData(json.data);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(json.data));
          setIsSyncError(false);
        } else {
          // If server has no database yet, seed it and send to server
          const initial = generateSeedData();
          await persistState(initial);
        }
      }
    } catch (err) {
      console.warn('Could not fetch from server, using local data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [persistState]);

  useEffect(() => {
    refreshData();
    fetchNetworkInfo();
  }, [refreshData, fetchNetworkInfo]);

  // Week navigation
  const goToCurrentWeek = useCallback(() => {
    const cur = getFiscalWeekInfo(new Date());
    setSelectedWeekStart(cur.startDate);
  }, []);

  const goToPreviousWeek = useCallback(() => {
    const d = new Date(selectedWeek.startDate + 'T12:00:00');
    d.setDate(d.getDate() - 7);
    const prev = getFiscalWeekInfo(d);
    setSelectedWeekStart(prev.startDate);
  }, [selectedWeek.startDate]);

  const goToNextWeek = useCallback(() => {
    const d = new Date(selectedWeek.startDate + 'T12:00:00');
    d.setDate(d.getDate() + 7);
    const next = getFiscalWeekInfo(d);
    setSelectedWeekStart(next.startDate);
  }, [selectedWeek.startDate]);

  // Record CRUD
  const addOrUpdateRecord = useCallback(async (
    recordData: Omit<DeliveryRecord, 'id' | 'createdAt' | 'totalValue'> & { id?: string }
  ) => {
    const baseRate = recordData.baseRate || data.settings.baseDeliveryRate;
    const additionalRate = recordData.additionalRate || data.settings.additionalRate;
    const total = calculateRecordTotal(
      recordData.deliveriesCount,
      recordData.additionalsCount,
      baseRate,
      additionalRate
    );

    const nowIso = new Date().toISOString();
    let updatedRecords = [...data.records];

    if (recordData.id) {
      updatedRecords = updatedRecords.map((r) => {
        if (r.id === recordData.id) {
          return {
            ...r,
            ...recordData,
            baseRate,
            additionalRate,
            totalValue: total,
            updatedAt: nowIso,
          };
        }
        return r;
      });
    } else {
      const newRec: DeliveryRecord = {
        id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        driverId: recordData.driverId,
        date: recordData.date,
        deliveriesCount: recordData.deliveriesCount,
        additionalsCount: recordData.additionalsCount,
        additionalReasons: recordData.additionalReasons || [],
        shift: recordData.shift || 'geral',
        baseRate,
        additionalRate,
        totalValue: total,
        notes: recordData.notes,
        createdAt: nowIso,
      };
      updatedRecords.push(newRec);
    }

    const nextState: DatabaseState = {
      ...data,
      records: updatedRecords,
    };
    await persistState(nextState);
  }, [data, persistState]);

  const deleteRecord = useCallback(async (recordId: string) => {
    const updatedRecords = data.records.filter((r) => r.id !== recordId);
    const nextState: DatabaseState = {
      ...data,
      records: updatedRecords,
    };
    await persistState(nextState);
  }, [data, persistState]);

  // Batch update daily grid (for rapid end-of-day logging across all drivers)
  const batchUpdateDailyGrid = useCallback(async (
    date: string,
    entries: { driverId: string; deliveriesCount: number; additionalsCount: number; shift?: ShiftType; notes?: string }[]
  ) => {
    const baseRate = data.settings.baseDeliveryRate;
    const additionalRate = data.settings.additionalRate;
    const nowIso = new Date().toISOString();

    // Filter out existing records for this specific date
    const remainingRecords = data.records.filter((r) => r.date !== date);
    const newRecords: DeliveryRecord[] = [];

    entries.forEach((entry) => {
      if (entry.deliveriesCount > 0 || entry.additionalsCount > 0) {
        const total = calculateRecordTotal(
          entry.deliveriesCount,
          entry.additionalsCount,
          baseRate,
          additionalRate
        );
        newRecords.push({
          id: `rec_${date}_${entry.driverId}_${Math.random().toString(36).substr(2, 4)}`,
          driverId: entry.driverId,
          date,
          deliveriesCount: Math.max(0, entry.deliveriesCount),
          additionalsCount: Math.max(0, entry.additionalsCount),
          shift: entry.shift || 'geral',
          baseRate,
          additionalRate,
          totalValue: total,
          notes: entry.notes,
          createdAt: nowIso,
        });
      }
    });

    const nextState: DatabaseState = {
      ...data,
      records: [...remainingRecords, ...newRecords],
    };
    await persistState(nextState);
  }, [data, persistState]);

  // Driver CRUD
  const addDriver = useCallback(async (driverData: Omit<Driver, 'id' | 'createdAt'>): Promise<string> => {
    const id = `drv_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];
    const randomColor = colors[data.drivers.length % colors.length];

    const newDriver: Driver = {
      ...driverData,
      id,
      color: driverData.color || randomColor,
      createdAt: new Date().toISOString(),
    };

    const nextState: DatabaseState = {
      ...data,
      drivers: [...data.drivers, newDriver],
    };
    await persistState(nextState);
    return id;
  }, [data, persistState]);

  const updateDriver = useCallback(async (id: string, updates: Partial<Driver>) => {
    const updatedDrivers = data.drivers.map((d) => {
      if (d.id === id) {
        return { ...d, ...updates };
      }
      return d;
    });

    const nextState: DatabaseState = {
      ...data,
      drivers: updatedDrivers,
    };
    await persistState(nextState);
  }, [data, persistState]);

  const deleteDriver = useCallback(async (id: string) => {
    const updatedDrivers = data.drivers.filter((d) => d.id !== id);
    const nextState: DatabaseState = {
      ...data,
      drivers: updatedDrivers,
    };
    await persistState(nextState);
  }, [data, persistState]);

  const toggleDriverStatus = useCallback(async (id: string) => {
    const updatedDrivers = data.drivers.map((d) => {
      if (d.id === id) {
        return { ...d, active: !d.active };
      }
      return d;
    });

    const nextState: DatabaseState = {
      ...data,
      drivers: updatedDrivers,
    };
    await persistState(nextState);
  }, [data, persistState]);

  // Settlements & Payments
  const toggleDriverPayment = useCallback(async (
    weekStartDate: string,
    driverId: string,
    amount?: number,
    note?: string
  ) => {
    const week = getFiscalWeekInfo(new Date(weekStartDate + 'T12:00:00'));
    let settlements = [...(data.settlements || [])];
    let settlementIndex = settlements.findIndex((s) => s.weekStartDate === weekStartDate);

    let settlement: WeeklySettlement;
    if (settlementIndex >= 0) {
      settlement = { ...settlements[settlementIndex] };
    } else {
      settlement = {
        id: `settlement_${weekStartDate}`,
        weekStartDate,
        weekEndDate: week.endDate,
        fiscalWeekNumber: week.weekNumber,
        year: week.year,
        status: 'aberto',
        driverPayments: {},
      };
      settlements.push(settlement);
      settlementIndex = settlements.length - 1;
    }

    const currentPayment = settlement.driverPayments[driverId];
    const isCurrentlyPaid = !!currentPayment?.paid;
    const nowIso = new Date().toISOString();

    settlement.driverPayments = {
      ...settlement.driverPayments,
      [driverId]: {
        paid: !isCurrentlyPaid,
        paidAt: !isCurrentlyPaid ? nowIso : undefined,
        paidAmount: amount,
        paymentMethod: 'PIX',
        receiptNote: note || (!isCurrentlyPaid ? 'Pagamento efetuado via PIX' : undefined),
      },
    };

    settlements[settlementIndex] = settlement;

    const nextState: DatabaseState = {
      ...data,
      settlements,
    };
    await persistState(nextState);
  }, [data, persistState]);

  const markAllDriversPaid = useCallback(async (weekStartDate: string) => {
    const week = getFiscalWeekInfo(new Date(weekStartDate + 'T12:00:00'));
    let settlements = [...(data.settlements || [])];
    let settlementIndex = settlements.findIndex((s) => s.weekStartDate === weekStartDate);

    let settlement: WeeklySettlement;
    if (settlementIndex >= 0) {
      settlement = { ...settlements[settlementIndex] };
    } else {
      settlement = {
        id: `settlement_${weekStartDate}`,
        weekStartDate,
        weekEndDate: week.endDate,
        fiscalWeekNumber: week.weekNumber,
        year: week.year,
        status: 'pago_total',
        driverPayments: {},
      };
      settlements.push(settlement);
      settlementIndex = settlements.length - 1;
    }

    const nowIso = new Date().toISOString();
    const updatedPayments: Record<string, any> = { ...settlement.driverPayments };

    data.drivers.forEach((driver) => {
      updatedPayments[driver.id] = {
        paid: true,
        paidAt: nowIso,
        paymentMethod: 'PIX',
        receiptNote: 'Baixa coletiva de fechamento semanal.',
      };
    });

    settlement.driverPayments = updatedPayments;
    settlement.status = 'pago_total';
    settlement.closedAt = nowIso;
    settlements[settlementIndex] = settlement;

    const nextState: DatabaseState = {
      ...data,
      settlements,
    };
    await persistState(nextState);
  }, [data, persistState]);

  const closeWeeklySettlement = useCallback(async (weekStartDate: string, notes?: string) => {
    const week = getFiscalWeekInfo(new Date(weekStartDate + 'T12:00:00'));
    let settlements = [...(data.settlements || [])];
    let settlementIndex = settlements.findIndex((s) => s.weekStartDate === weekStartDate);

    let settlement: WeeklySettlement;
    if (settlementIndex >= 0) {
      settlement = { ...settlements[settlementIndex] };
    } else {
      settlement = {
        id: `settlement_${weekStartDate}`,
        weekStartDate,
        weekEndDate: week.endDate,
        fiscalWeekNumber: week.weekNumber,
        year: week.year,
        status: 'fechado',
        driverPayments: {},
      };
      settlements.push(settlement);
      settlementIndex = settlements.length - 1;
    }

    settlement.status = 'fechado';
    settlement.closedAt = new Date().toISOString();
    settlement.notes = notes;
    settlements[settlementIndex] = settlement;

    const nextState: DatabaseState = {
      ...data,
      settlements,
    };
    await persistState(nextState);
  }, [data, persistState]);

  // Settings & DB management
  const updateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    const nextState: DatabaseState = {
      ...data,
      settings: { ...data.settings, ...newSettings },
    };
    await persistState(nextState);
  }, [data, persistState]);

  const resetDatabase = useCallback(async () => {
    const fresh = generateSeedData();
    try {
      await fetch('/api/reset-data', { method: 'POST' });
    } catch {
      // ignore
    }
    await persistState(fresh);
  }, [persistState]);

  const importBackup = useCallback(async (backupState: DatabaseState): Promise<boolean> => {
    if (!backupState || !Array.isArray(backupState.drivers) || !Array.isArray(backupState.records)) {
      return false;
    }
    await persistState({
      ...backupState,
      settings: backupState.settings || DEFAULT_SETTINGS,
      lastUpdated: new Date().toISOString(),
    });
    return true;
  }, [persistState]);

  return (
    <DataContext.Provider
      value={{
        data,
        isLoading,
        isSaving,
        isSyncError,
        networkInfo,
        selectedWeek,
        availableWeeks,
        setSelectedWeekStart,
        goToCurrentWeek,
        goToPreviousWeek,
        goToNextWeek,
        addOrUpdateRecord,
        deleteRecord,
        batchUpdateDailyGrid,
        addDriver,
        updateDriver,
        deleteDriver,
        toggleDriverStatus,
        toggleDriverPayment,
        markAllDriversPaid,
        closeWeeklySettlement,
        updateSettings,
        resetDatabase,
        importBackup,
        refreshData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export function useData(): DataContextType {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
