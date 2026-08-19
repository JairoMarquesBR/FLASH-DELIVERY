import { FiscalDay, FiscalWeekInfo } from '../types';

export const DAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export const SHORT_DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Format a Date object to YYYY-MM-DD in local time
 */
export function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string into a local Date object without timezone drift
 */
export function parseISODate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Format YYYY-MM-DD or Date to DD/MM/YYYY
 */
export function formatDateBR(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? parseISODate(dateInput) : dateInput;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format YYYY-MM-DD to DD/MM
 */
export function formatDateShortBR(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? parseISODate(dateInput) : dateInput;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

/**
 * Get the Wednesday (start) of the fiscal week containing the given date
 */
export function getFiscalWeekStart(date: Date = new Date(), startDayIndex: number = 3): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const currentDay = d.getDay(); // 0 (Sun) .. 6 (Sat)
  
  // Calculate days since last Wednesday (day index 3)
  let daysSinceStart = currentDay - startDayIndex;
  if (daysSinceStart < 0) {
    daysSinceStart += 7;
  }
  
  d.setDate(d.getDate() - daysSinceStart);
  return d;
}

/**
 * Build detailed FiscalWeekInfo for any given date
 */
export function getFiscalWeekInfo(targetDate: Date = new Date(), startDayIndex: number = 3): FiscalWeekInfo {
  const startDate = getFiscalWeekStart(targetDate, startDayIndex);
  const startStr = formatDateISO(startDate);
  
  const todayStr = formatDateISO(new Date());
  
  const days: FiscalDay[] = [];
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + i);
    const dayStr = formatDateISO(dayDate);
    const dayOfWeek = dayDate.getDay();
    
    days.push({
      date: dayStr,
      dayOfWeek,
      dayLabel: DAY_NAMES[dayOfWeek],
      shortName: SHORT_DAY_NAMES[dayOfWeek],
      formattedDate: formatDateShortBR(dayDate),
      isToday: dayStr === todayStr,
    });
  }
  
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  const endStr = formatDateISO(endDate);
  
  // Check if current today is within this week
  const isCurrent = todayStr >= startStr && todayStr <= endStr;
  
  // Determine fiscal week number roughly
  const oneJan = new Date(startDate.getFullYear(), 0, 1);
  const numberOfDays = Math.floor((startDate.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
  
  const label = `${formatDateShortBR(startDate)} (${SHORT_DAY_NAMES[startDate.getDay()]}) a ${formatDateShortBR(endDate)} (${SHORT_DAY_NAMES[endDate.getDay()]})`;
  
  return {
    id: startStr,
    startDate: startStr,
    endDate: endStr,
    weekNumber,
    year: startDate.getFullYear(),
    label,
    isCurrent,
    days,
  };
}

/**
 * Generate a list of fiscal weeks around a center date (e.g. 10 weeks back, 2 weeks ahead)
 */
export function generateFiscalWeekOptions(countPast: number = 12, countFuture: number = 4): FiscalWeekInfo[] {
  const currentWeek = getFiscalWeekInfo(new Date());
  const weeks: FiscalWeekInfo[] = [];
  
  const currentStart = parseISODate(currentWeek.startDate);
  
  for (let i = -countPast; i <= countFuture; i++) {
    const d = new Date(currentStart);
    d.setDate(currentStart.getDate() + i * 7);
    weeks.push(getFiscalWeekInfo(d));
  }
  
  // Sort descending (newest first)
  return weeks.sort((a, b) => b.startDate.localeCompare(a.startDate));
}
