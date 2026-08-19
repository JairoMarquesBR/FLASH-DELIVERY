import { 
  AppSettings, 
  DeliveryRecord, 
  Driver, 
  DriverWeeklySummary, 
  FiscalWeekInfo, 
  WeeklySettlement, 
  WeekOverallStats 
} from '../types';

/**
 * Format currency to Brazilian Real format: R$ 1.234,56
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

/**
 * Calculate total value for a single delivery record based on base rate and additionals
 */
export function calculateRecordTotal(
  deliveriesCount: number,
  additionalsCount: number,
  baseRate: number = 9,
  additionalRate: number = 2
): number {
  const deliveries = Math.max(0, Number(deliveriesCount) || 0);
  const additionals = Math.max(0, Number(additionalsCount) || 0);
  return (deliveries * baseRate) + (additionals * additionalRate);
}

/**
 * Build DriverWeeklySummary array and overall stats for a specific fiscal week
 */
export function calculateWeeklySummary(
  drivers: Driver[],
  records: DeliveryRecord[],
  weekInfo: FiscalWeekInfo,
  settlement?: WeeklySettlement,
  settings?: AppSettings
): {
  driverSummaries: DriverWeeklySummary[];
  overallStats: WeekOverallStats;
} {
  const baseRate = settings?.baseDeliveryRate ?? 9;
  const additionalRate = settings?.additionalRate ?? 2;
  
  // Filter records within this fiscal week (startDate <= date <= endDate)
  const weekRecords = records.filter(
    (r) => r.date >= weekInfo.startDate && r.date <= weekInfo.endDate
  );
  
  // Active drivers or drivers who have records this week
  const driversToInclude = drivers.filter((d) => {
    if (d.active) return true;
    return weekRecords.some((r) => r.driverId === d.id);
  });
  
  // Prepare daily totals accumulator
  const dailyTotals: Record<string, { deliveries: number; additionals: number; amount: number }> = {};
  weekInfo.days.forEach((day) => {
    dailyTotals[day.date] = { deliveries: 0, additionals: 0, amount: 0 };
  });
  
  let grandDeliveries = 0;
  let grandAdditionals = 0;
  let grandBaseGross = 0;
  let grandAdditionalsGross = 0;
  let grandTotalGross = 0;
  let totalPaidAmount = 0;
  let activeCouriersWithDeliveries = 0;
  
  const driverSummaries: DriverWeeklySummary[] = driversToInclude.map((driver) => {
    const driverRecords = weekRecords.filter((r) => r.driverId === driver.id);
    
    // Group records by day
    const days: Record<string, { deliveries: number; additionals: number; total: number; recordsCount: number; recordIds: string[] }> = {};
    let totalDriverDeliveries = 0;
    let totalDriverAdditionals = 0;
    let totalDriverBaseValue = 0;
    let totalDriverAdditionalsValue = 0;
    let driverGrandTotal = 0;
    
    weekInfo.days.forEach((day) => {
      const dayRecs = driverRecords.filter((r) => r.date === day.date);
      const dayDeliveries = dayRecs.reduce((sum, r) => sum + (r.deliveriesCount || 0), 0);
      const dayAdditionals = dayRecs.reduce((sum, r) => sum + (r.additionalsCount || 0), 0);
      const dayTotal = dayRecs.reduce((sum, r) => sum + (r.totalValue || 0), 0);
      
      days[day.date] = {
        deliveries: dayDeliveries,
        additionals: dayAdditionals,
        total: dayTotal,
        recordsCount: dayRecs.length,
        recordIds: dayRecs.map((r) => r.id),
      };
      
      totalDriverDeliveries += dayDeliveries;
      totalDriverAdditionals += dayAdditionals;
      
      // Update week daily totals
      if (dailyTotals[day.date]) {
        dailyTotals[day.date].deliveries += dayDeliveries;
        dailyTotals[day.date].additionals += dayAdditionals;
        dailyTotals[day.date].amount += dayTotal;
      }
    });
    
    totalDriverBaseValue = totalDriverDeliveries * baseRate;
    totalDriverAdditionalsValue = totalDriverAdditionals * additionalRate;
    driverGrandTotal = totalDriverBaseValue + totalDriverAdditionalsValue;
    
    grandDeliveries += totalDriverDeliveries;
    grandAdditionals += totalDriverAdditionals;
    grandBaseGross += totalDriverBaseValue;
    grandAdditionalsGross += totalDriverAdditionalsValue;
    grandTotalGross += driverGrandTotal;
    
    if (totalDriverDeliveries > 0 || totalDriverAdditionals > 0) {
      activeCouriersWithDeliveries++;
    }
    
    const paymentInfo = settlement?.driverPayments?.[driver.id];
    const isPaid = !!paymentInfo?.paid;
    if (isPaid) {
      totalPaidAmount += paymentInfo.paidAmount ?? driverGrandTotal;
    }
    
    return {
      driver,
      days,
      totalDeliveries: totalDriverDeliveries,
      totalAdditionals: totalDriverAdditionals,
      totalBaseValue: totalDriverBaseValue,
      totalAdditionalsValue: totalDriverAdditionalsValue,
      grandTotal: driverGrandTotal,
      isPaid,
      paymentInfo,
    };
  });
  
  // Sort driver summaries by grand total descending, then name
  driverSummaries.sort((a, b) => {
    if (b.grandTotal !== a.grandTotal) {
      return b.grandTotal - a.grandTotal;
    }
    return a.driver.name.localeCompare(b.driver.name);
  });
  
  // Find top driver
  const top = driverSummaries.length > 0 && driverSummaries[0].totalDeliveries > 0 
    ? {
        name: driverSummaries[0].driver.name,
        nickname: driverSummaries[0].driver.nickname,
        deliveries: driverSummaries[0].totalDeliveries,
        amount: driverSummaries[0].grandTotal,
      }
    : undefined;
    
  const overallStats: WeekOverallStats = {
    totalDeliveries: grandDeliveries,
    totalAdditionals: grandAdditionals,
    totalBaseGross: grandBaseGross,
    totalAdditionalsGross: grandAdditionalsGross,
    grandTotalGross: grandTotalGross,
    activeDriversCount: activeCouriersWithDeliveries,
    totalPaidAmount,
    totalPendingAmount: grandTotalGross - totalPaidAmount,
    dailyTotals,
    topDriver: top,
  };
  
  return {
    driverSummaries,
    overallStats,
  };
}
