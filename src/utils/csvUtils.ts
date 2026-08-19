import { 
  AppSettings, 
  DeliveryRecord, 
  Driver, 
  DriverWeeklySummary, 
  FiscalWeekInfo, 
  WeekOverallStats 
} from '../types';
import { formatDateBR } from './dateUtils';

/**
 * Triggers a browser file download with UTF-8 BOM
 */
export function downloadCSV(filename: string, csvContent: string) {
  // UTF-8 BOM for Excel compatibility with Portuguese special characters
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escape and format a value for CSV column
 */
function escapeCSV(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generate CSV for the complete weekly fiscal closing
 */
export function generateWeeklyReportCSV(
  weekInfo: FiscalWeekInfo,
  summaries: DriverWeeklySummary[],
  stats: WeekOverallStats,
  settings: AppSettings
): string {
  const lines: string[] = [];
  
  // Header Info
  lines.push(`${escapeCSV(settings.storeName)} - ${escapeCSV(settings.cooperativeName)}`);
  lines.push(`Relatório de Fechamento Semanal Fiscal:;${escapeCSV(weekInfo.label)};(Semana #${weekInfo.weekNumber}/${weekInfo.year})`);
  lines.push(`Período:;${escapeCSV(formatDateBR(weekInfo.startDate))};até;${escapeCSV(formatDateBR(weekInfo.endDate))}`);
  lines.push(`Taxa Base Entrega:;R$ ${settings.baseDeliveryRate.toFixed(2)};Taxa Adicional:;R$ ${settings.additionalRate.toFixed(2)}`);
  lines.push(`Gerado em:;${escapeCSV(new Date().toLocaleString('pt-BR'))}`);
  lines.push(''); // Empty separator
  
  // Table Header
  const headerCols = [
    'Entregador',
    'Apelido',
    'Chave PIX',
    'Tipo PIX',
    'Telefone',
    // 7 days columns
    ...weekInfo.days.map((d) => `${d.shortName} (${d.formattedDate})`),
    'Total Entregas',
    'Total Adicionais',
    'Valor Base (R$)',
    'Valor Adicionais (R$)',
    'Total a Pagar (R$)',
    'Status Pagamento',
    'Data Pagamento'
  ];
  lines.push(headerCols.map(escapeCSV).join(';'));
  
  // Rows for each driver
  summaries.forEach((s) => {
    const dayCols = weekInfo.days.map((d) => {
      const dayData = s.days[d.date];
      if (!dayData || (dayData.deliveries === 0 && dayData.additionals === 0)) {
        return '-';
      }
      return `${dayData.deliveries} ent (+${dayData.additionals} ad)`;
    });
    
    const row = [
      s.driver.name,
      s.driver.nickname || '-',
      s.driver.pixKey || '-',
      s.driver.pixType.toUpperCase(),
      s.driver.phone || '-',
      ...dayCols,
      s.totalDeliveries,
      s.totalAdditionals,
      s.totalBaseValue.toFixed(2).replace('.', ','),
      s.totalAdditionalsValue.toFixed(2).replace('.', ','),
      s.grandTotal.toFixed(2).replace('.', ','),
      s.isPaid ? 'PAGO' : 'PENDENTE',
      s.paymentInfo?.paidAt ? formatDateBR(s.paymentInfo.paidAt.split('T')[0]) : '-'
    ];
    lines.push(row.map(escapeCSV).join(';'));
  });
  
  lines.push(''); // Empty line
  
  // Totals Summary Line
  const totalDaysCols = weekInfo.days.map((d) => {
    const dayTot = stats.dailyTotals[d.date];
    return dayTot ? `${dayTot.deliveries} ent (+${dayTot.additionals} ad)` : '-';
  });
  
  const summaryRow = [
    'TOTAL GERAL DA SEMANA',
    '',
    '',
    '',
    '',
    ...totalDaysCols,
    stats.totalDeliveries,
    stats.totalAdditionals,
    stats.totalBaseGross.toFixed(2).replace('.', ','),
    stats.totalAdditionalsGross.toFixed(2).replace('.', ','),
    stats.grandTotalGross.toFixed(2).replace('.', ','),
    `Pago: R$ ${stats.totalPaidAmount.toFixed(2).replace('.', ',')}`,
    `Pendente: R$ ${stats.totalPendingAmount.toFixed(2).replace('.', ',')}`
  ];
  lines.push(summaryRow.map(escapeCSV).join(';'));
  
  return lines.join('\r\n');
}

/**
 * Generate CSV for detailed daily delivery logs
 */
export function generateDailyRecordsCSV(
  records: DeliveryRecord[],
  drivers: Driver[],
  weekInfo: FiscalWeekInfo,
  settings: AppSettings
): string {
  const lines: string[] = [];
  const driverMap = new Map(drivers.map((d) => [d.id, d]));
  
  lines.push(`${escapeCSV(settings.storeName)} - Extrato Detalhado de Lançamentos`);
  lines.push(`Período Selecionado:;${escapeCSV(weekInfo.label)}`);
  lines.push('');
  
  const headers = [
    'ID Lançamento',
    'Data',
    'Dia da Semana',
    'Entregador',
    'Apelido',
    'Turno',
    'Qtd Entregas (R$ 9)',
    'Qtd Adicionais (+ R$ 2)',
    'Taxa Base (R$)',
    'Taxa Adic. (R$)',
    'Valor Total (R$)',
    'Observações'
  ];
  lines.push(headers.map(escapeCSV).join(';'));
  
  const sortedRecords = [...records].sort((a, b) => b.date.localeCompare(a.date));
  
  sortedRecords.forEach((r) => {
    const driver = driverMap.get(r.driverId);
    const dateFormatted = formatDateBR(r.date);
    const dayOfWeekStr = new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' });
    
    const row = [
      r.id,
      dateFormatted,
      dayOfWeekStr,
      driver?.name || 'Desconhecido',
      driver?.nickname || '-',
      r.shift.toUpperCase(),
      r.deliveriesCount,
      r.additionalsCount,
      r.baseRate.toFixed(2).replace('.', ','),
      r.additionalRate.toFixed(2).replace('.', ','),
      r.totalValue.toFixed(2).replace('.', ','),
      r.notes || '-'
    ];
    lines.push(row.map(escapeCSV).join(';'));
  });
  
  return lines.join('\r\n');
}

/**
 * Generate CSV of all registered drivers
 */
export function generateDriversListCSV(drivers: Driver[]): string {
  const lines: string[] = [];
  lines.push('Cadastro de Entregadores - Pizza Hut Cooperativa');
  lines.push('');
  
  const headers = [
    'Nome Completo',
    'Apelido',
    'Telefone / WhatsApp',
    'Chave PIX',
    'Tipo Chave PIX',
    'Tipo Veículo',
    'Placa',
    'Status',
    'Data Cadastro',
    'Observações'
  ];
  lines.push(headers.map(escapeCSV).join(';'));
  
  drivers.forEach((d) => {
    const row = [
      d.name,
      d.nickname || '-',
      d.phone || '-',
      d.pixKey || '-',
      d.pixType.toUpperCase(),
      d.vehicleType.toUpperCase(),
      d.plate || '-',
      d.active ? 'ATIVO' : 'INATIVO',
      d.createdAt ? formatDateBR(d.createdAt.split('T')[0]) : '-',
      d.notes || '-'
    ];
    lines.push(row.map(escapeCSV).join(';'));
  });
  
  return lines.join('\r\n');
}
