import { DatabaseState, Driver, DeliveryRecord, AppSettings, WeeklySettlement } from '../types';
import { formatDateISO, getFiscalWeekInfo, parseISODate } from '../utils/dateUtils';
import { calculateRecordTotal } from '../utils/calcUtils';

export const DEFAULT_SETTINGS: AppSettings = {
  storeName: 'Pizza Hut - Unidade Central',
  cooperativeName: 'Cooperativa de Entregadores Parceiros',
  storeAddress: 'Av. Paulista, 1500 - Bela Vista, São Paulo - SP',
  storePhone: '(11) 3456-7890',
  baseDeliveryRate: 9, // R$ 9,00 base
  additionalRate: 2, // + R$ 2,00 por adicional
  fiscalWeekStartDay: 3, // 3 = Quarta-feira
  currencySymbol: 'R$',
  allowNegativeValues: false,
  autoSaveIntervalSeconds: 3,
};

export const INITIAL_DRIVERS: Driver[] = [
  {
    id: 'drv_1',
    name: 'Carlos Eduardo Mendes',
    nickname: 'Relâmpago',
    phone: '(11) 98765-4321',
    pixKey: 'carlos.mendes@email.com',
    pixType: 'email',
    vehicleType: 'moto',
    plate: 'BRA-2E19',
    active: true,
    color: '#ef4444',
    createdAt: '2025-01-10T10:00:00Z',
    notes: 'Disponível turno almoço e jantar. Moto Honda CG 160 Fan.',
  },
  {
    id: 'drv_2',
    name: 'Marcos Vinicius da Silva',
    nickname: 'Marcão',
    phone: '(11) 97654-3210',
    pixKey: '123.456.789-00',
    pixType: 'cpf',
    vehicleType: 'moto',
    plate: 'XYZ-8890',
    active: true,
    color: '#3b82f6',
    createdAt: '2025-01-12T14:00:00Z',
    notes: 'Conhece bem a região Norte e Centro.',
  },
  {
    id: 'drv_3',
    name: 'Rafael Santos de Oliveira',
    nickname: 'Rafa',
    phone: '(11) 96543-2109',
    pixKey: '11965432109',
    pixType: 'telefone',
    vehicleType: 'moto',
    plate: 'KLU-3342',
    active: true,
    color: '#10b981',
    createdAt: '2025-01-15T09:00:00Z',
    notes: 'Disponível finais de semana integral.',
  },
  {
    id: 'drv_4',
    name: 'Diego Souza Lima',
    nickname: 'Foguete',
    phone: '(11) 95432-1098',
    pixKey: 'diego.souza@pix.com',
    pixType: 'email',
    vehicleType: 'moto',
    plate: 'QWE-9912',
    active: true,
    color: '#f59e0b',
    createdAt: '2025-01-20T11:00:00Z',
    notes: 'Bag térmica reforçada para pedidos família.',
  },
  {
    id: 'drv_5',
    name: 'Amanda Cristina Rocha',
    nickname: 'Manda',
    phone: '(11) 94321-0987',
    pixKey: '234.567.890-11',
    pixType: 'cpf',
    vehicleType: 'moto',
    plate: 'JHG-4411',
    active: true,
    color: '#8b5cf6',
    createdAt: '2025-02-01T15:00:00Z',
    notes: 'Turno noturno. Excelente pontualidade.',
  },
  {
    id: 'drv_6',
    name: 'Lucas Ferreira Guimarães',
    nickname: 'Luquinhas',
    phone: '(11) 93210-9876',
    pixKey: 'lucas.guimaraes@banco.com.br',
    pixType: 'email',
    vehicleType: 'moto',
    plate: 'TYU-7721',
    active: true,
    color: '#ec4899',
    createdAt: '2025-02-05T08:00:00Z',
    notes: 'Atende áreas estendidas com adicionais.',
  },
  {
    id: 'drv_7',
    name: 'João Pedro Carvalho',
    nickname: 'Paulista',
    phone: '(11) 92109-8765',
    pixKey: '345.678.901-22',
    pixType: 'cpf',
    vehicleType: 'moto',
    plate: 'ASD-5523',
    active: true,
    color: '#06b6d4',
    createdAt: '2025-02-10T12:00:00Z',
    notes: 'Reforço de sexta a domingo.',
  },
  {
    id: 'drv_8',
    name: 'Bruno Cesar Alencar',
    nickname: 'Brunão',
    phone: '(11) 91098-7654',
    pixKey: 'e89a3c42-8812-4fbc-bc23-112233445566',
    pixType: 'aleatoria',
    vehicleType: 'moto',
    plate: 'VBN-1092',
    active: false, // Inativo para teste de filtros
    color: '#64748b',
    createdAt: '2024-11-10T10:00:00Z',
    notes: 'Licença temporária.',
  }
];

export function generateSeedData(): DatabaseState {
  const currentWeek = getFiscalWeekInfo(new Date());
  const prevWeek = getFiscalWeekInfo(new Date(parseISODate(currentWeek.startDate).getTime() - 7 * 24 * 60 * 60 * 1000));
  
  const records: DeliveryRecord[] = [];
  let recordCounter = 1;
  
  const activeDrivers = INITIAL_DRIVERS.filter(d => d.active);

  // Helper to generate seed records for a week
  const seedWeek = (week: typeof currentWeek, isPast: boolean) => {
    week.days.forEach((day, dayIndex) => {
      // If current week and date is in future, skip or generate up to today
      const todayStr = formatDateISO(new Date());
      if (!isPast && day.date > todayStr) {
        return;
      }
      
      // Pick random subset of active drivers for this day
      activeDrivers.forEach((driver, drvIndex) => {
        // Not every driver works everyday, weekend is busier
        const isWeekend = day.dayOfWeek === 5 || day.dayOfWeek === 6 || day.dayOfWeek === 0;
        const worksToday = (drvIndex + dayIndex) % 4 !== 0 || isWeekend;
        
        if (!worksToday) return;
        
        // Base deliveries: 7 to 18 (weekdays) or 12 to 24 (weekend)
        const minEnt = isWeekend ? 10 : 6;
        const maxEnt = isWeekend ? 22 : 14;
        const deliveries = Math.floor(Math.random() * (maxEnt - minEnt + 1)) + minEnt;
        
        // Additionals (+ R$ 2 each): 1 to 6
        const additionals = Math.floor(Math.random() * 6);
        
        const reasons = additionals > 0 
          ? (['raio_longo', 'chuva_tempo', 'parada_extra', 'taxa_noturna'] as const).slice(0, Math.min(additionals, 2))
          : [];
          
        const total = calculateRecordTotal(deliveries, additionals, 9, 2);
        
        records.push({
          id: `rec_${recordCounter++}`,
          driverId: driver.id,
          date: day.date,
          deliveriesCount: deliveries,
          additionalsCount: additionals,
          additionalReasons: reasons as any,
          shift: isWeekend ? 'geral' : (dayIndex % 2 === 0 ? 'jantar' : 'geral'),
          baseRate: 9,
          additionalRate: 2,
          totalValue: total,
          notes: additionals > 2 ? `${additionals} adicionais aplicados por raio estendido / alta demanda` : undefined,
          createdAt: `${day.date}T22:30:00Z`,
        });
      });
    });
  };

  // Seed past week and current week
  seedWeek(prevWeek, true);
  seedWeek(currentWeek, false);

  // Past week settlement (already closed and paid)
  const prevSettlement: WeeklySettlement = {
    id: `settlement_${prevWeek.startDate}`,
    weekStartDate: prevWeek.startDate,
    weekEndDate: prevWeek.endDate,
    fiscalWeekNumber: prevWeek.weekNumber,
    year: prevWeek.year,
    status: 'pago_total',
    driverPayments: {},
    closedAt: `${prevWeek.endDate}T23:59:00Z`,
    closedBy: 'Gerente Operacional',
    notes: 'Fechamento da semana anterior pago integralmente via PIX.',
  };

  activeDrivers.forEach((d) => {
    prevSettlement.driverPayments[d.id] = {
      paid: true,
      paidAt: `${prevWeek.endDate}T18:00:00Z`,
      paidAmount: 0, // Will be computed or updated
      paymentMethod: 'PIX',
      receiptNote: 'Comprovante emitido via banco da cooperativa.',
    };
  });

  return {
    version: 1,
    settings: DEFAULT_SETTINGS,
    drivers: INITIAL_DRIVERS,
    records,
    orders: [],
    settlements: [prevSettlement],
    lastUpdated: new Date().toISOString(),
  };
}
