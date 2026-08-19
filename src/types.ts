export type ShiftType = 'geral' | 'almoco' | 'jantar' | 'madrugada';

export type AdditionalReason = 
  | 'raio_longo' 
  | 'chuva_tempo' 
  | 'parada_extra' 
  | 'taxa_noturna' 
  | 'area_risco' 
  | 'outros';

export interface Driver {
  id: string;
  name: string;
  nickname?: string;
  phone: string;
  pixKey: string;
  pixType: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';
  vehicleType: 'moto' | 'bicicleta' | 'carro';
  plate?: string;
  active: boolean;
  notes?: string;
  createdAt: string;
  color?: string;
}

export interface DeliveryRecord {
  id: string;
  driverId: string;
  date: string; // YYYY-MM-DD
  deliveriesCount: number; // Qtd entregas padrão (R$ 9 cada)
  additionalsCount: number; // Qtd adicionais (+ R$ 2 cada)
  additionalReasons?: AdditionalReason[];
  shift: ShiftType;
  baseRate: number; // Ex: 9.00
  additionalRate: number; // Ex: 2.00
  totalValue: number; // (deliveriesCount * baseRate) + (additionalsCount * additionalRate)
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface IndividualOrder {
  id: string;
  recordId?: string;
  driverId: string;
  date: string; // YYYY-MM-DD
  time?: string;
  orderNumber: string;
  neighborhood?: string;
  additionalsCount: number;
  reason?: AdditionalReason;
  baseValue: number;
  additionalValue: number;
  totalValue: number;
  notes?: string;
}

export interface PaymentStatusRecord {
  paid: boolean;
  paidAt?: string;
  paidAmount?: number;
  paymentMethod?: string;
  receiptNote?: string;
}

export interface WeeklySettlement {
  id: string; // e.g. "settlement_2025_w34"
  weekStartDate: string; // YYYY-MM-DD (Quarta-feira)
  weekEndDate: string; // YYYY-MM-DD (Terça-feira)
  fiscalWeekNumber: number;
  year: number;
  status: 'aberto' | 'fechado' | 'pago_parcial' | 'pago_total';
  driverPayments: Record<string, PaymentStatusRecord>;
  closedAt?: string;
  closedBy?: string;
  notes?: string;
}

export interface AppSettings {
  storeName: string;
  cooperativeName: string;
  storeAddress: string;
  storePhone: string;
  baseDeliveryRate: number; // Default: 9
  additionalRate: number; // Default: 2
  fiscalWeekStartDay: number; // 3 for Wednesday (0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday...)
  currencySymbol: string; // "R$"
  allowNegativeValues: boolean;
  autoSaveIntervalSeconds: number;
}

export interface FiscalDay {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 to 6
  dayLabel: string; // "Quarta", "Quinta", ...
  shortName: string; // "Qua", "Qui", ...
  formattedDate: string; // "14/08"
  isToday: boolean;
}

export interface FiscalWeekInfo {
  id: string; // YYYY-MM-DD start
  startDate: string; // YYYY-MM-DD (Wednesday)
  endDate: string; // YYYY-MM-DD (Tuesday)
  weekNumber: number;
  year: number;
  label: string; // "14/08 (Qua) a 20/08 (Ter)"
  isCurrent: boolean;
  days: FiscalDay[];
}

export interface DriverDayData {
  deliveries: number;
  additionals: number;
  total: number;
  recordsCount: number;
  recordIds: string[];
}

export interface DriverWeeklySummary {
  driver: Driver;
  days: Record<string, DriverDayData>;
  totalDeliveries: number;
  totalAdditionals: number;
  totalBaseValue: number;
  totalAdditionalsValue: number;
  grandTotal: number;
  isPaid: boolean;
  paymentInfo?: PaymentStatusRecord;
}

export interface WeekOverallStats {
  totalDeliveries: number;
  totalAdditionals: number;
  totalBaseGross: number;
  totalAdditionalsGross: number;
  grandTotalGross: number;
  activeDriversCount: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
  dailyTotals: Record<string, { deliveries: number; additionals: number; amount: number }>;
  topDriver?: { name: string; nickname?: string; deliveries: number; amount: number };
}

export interface DatabaseState {
  version: number;
  settings: AppSettings;
  drivers: Driver[];
  records: DeliveryRecord[];
  orders: IndividualOrder[];
  settlements: WeeklySettlement[];
  lastUpdated: string;
}
