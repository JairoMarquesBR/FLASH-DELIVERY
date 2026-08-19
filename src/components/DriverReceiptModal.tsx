import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Copy, 
  Check, 
  Share2, 
  Pizza, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import { DriverWeeklySummary, FiscalWeekInfo, AppSettings } from '../types';
import { formatCurrency } from '../utils/calcUtils';
import { formatDateBR } from '../utils/dateUtils';

interface DriverReceiptModalProps {
  summary: DriverWeeklySummary;
  weekInfo: FiscalWeekInfo;
  settings: AppSettings;
  onClose: () => void;
  onTogglePaid: () => void;
}

export const DriverReceiptModal: React.FC<DriverReceiptModalProps> = ({
  summary,
  weekInfo,
  settings,
  onClose,
  onTogglePaid,
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  // Build formatted text message for WhatsApp
  const generateWhatsAppMessage = () => {
    const lines: string[] = [];
    lines.push(`🍕 *${settings.storeName.toUpperCase()}*`);
    lines.push(`📋 *EXTRATO DE ENTREGAS & PAGAMENTO*`);
    lines.push(`🗓️ *Semana Fiscal #${weekInfo.weekNumber} (${weekInfo.label})*`);
    lines.push(`----------------------------------------`);
    lines.push(`👤 *Entregador:* ${summary.driver.name} ${summary.driver.nickname ? `(${summary.driver.nickname})` : ''}`);
    lines.push(`🔑 *Chave PIX (${summary.driver.pixType.toUpperCase()}):* ${summary.driver.pixKey}`);
    lines.push(`----------------------------------------`);
    lines.push(`*RESUMO DOS DIAS:*`);
    
    weekInfo.days.forEach((day) => {
      const d = summary.days[day.date];
      if (d && (d.deliveries > 0 || d.additionals > 0)) {
        lines.push(`• ${day.shortName} (${day.formattedDate}): ${d.deliveries} ent. | +${d.additionals} adic. ➔ ${formatCurrency(d.total)}`);
      } else {
        lines.push(`• ${day.shortName} (${day.formattedDate}): Folga / Sem entregas`);
      }
    });

    lines.push(`----------------------------------------`);
    lines.push(`📦 *Total de Entregas (R$ ${settings.baseDeliveryRate.toFixed(2)}):* ${summary.totalDeliveries} un. (${formatCurrency(summary.totalBaseValue)})`);
    lines.push(`⚡ *Total de Adicionais (+R$ ${settings.additionalRate.toFixed(2)}):* ${summary.totalAdditionals} un. (${formatCurrency(summary.totalAdditionalsValue)})`);
    lines.push(`💰 *VALOR TOTAL A RECEBER:* *${formatCurrency(summary.grandTotal)}*`);
    lines.push(`📌 *Status:* ${summary.isPaid ? '✅ PAGO VIA PIX' : '⏳ PENDENTE DE PAGAMENTO'}`);
    lines.push(`----------------------------------------`);
    lines.push(`_Gerado pelo sistema de gestão da cooperativa Pizza Hut._`);

    return lines.join('\n');
  };

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppMessage();
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(summary.driver.pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-black">
              <Pizza className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Extrato Individual de Pagamento</h3>
              <p className="text-xs text-slate-500">Semana Fiscal {weekInfo.label}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Card */}
        <div id="printable_receipt" className="bg-slate-50 rounded-2xl p-5 border border-slate-300 font-sans space-y-4">
          {/* Pizza Hut Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300">
            <h4 className="font-black text-base text-slate-900 tracking-wider">
              {settings.storeName.toUpperCase()}
            </h4>
            <p className="text-[11px] text-slate-500">{settings.cooperativeName}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Semana Fiscal #{weekInfo.weekNumber} • De {formatDateBR(weekInfo.startDate)} a {formatDateBR(weekInfo.endDate)}
            </p>
          </div>

          {/* Driver details */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Motoboy:</span>
              <strong className="text-slate-900">
                {summary.driver.name} {summary.driver.nickname && `(${summary.driver.nickname})`}
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Telefone:</span>
              <span className="text-slate-700 font-mono">{summary.driver.phone || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Chave PIX ({summary.driver.pixType.toUpperCase()}):</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-900 font-mono font-bold">{summary.driver.pixKey}</span>
                <button
                  onClick={handleCopyPix}
                  className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                  title="Copiar PIX"
                >
                  {copiedPix ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Daily Breakdown Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase flex justify-between">
              <span>Dia (Quarta a Terça)</span>
              <span>Entregas / Adicionais</span>
              <span>Subtotal</span>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {weekInfo.days.map((day) => {
                const dayData = summary.days[day.date];
                const hasAct = dayData && (dayData.deliveries > 0 || dayData.additionals > 0);

                return (
                  <div key={day.date} className="px-3 py-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">{day.shortName}</span>
                      <span className="text-slate-400 text-[10px] ml-1.5">({day.formattedDate})</span>
                    </div>
                    <div>
                      {hasAct ? (
                        <span className="text-slate-700 font-medium">
                          {dayData.deliveries} ent.
                          {dayData.additionals > 0 && (
                            <span className="text-amber-700 font-bold ml-1">
                              (+{dayData.additionals} ad)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Sem entregas</span>
                      )}
                    </div>
                    <div className="font-bold text-slate-900">
                      {hasAct ? formatCurrency(dayData.total) : '-'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totals Summary */}
          <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>{summary.totalDeliveries} Entregas Base (x R$ {settings.baseDeliveryRate.toFixed(2)}):</span>
              <strong className="text-white">{formatCurrency(summary.totalBaseValue)}</strong>
            </div>
            <div className="flex items-center justify-between text-xs text-amber-300">
              <span>+{summary.totalAdditionals} Adicionais (x R$ {settings.additionalRate.toFixed(2)}):</span>
              <strong>{formatCurrency(summary.totalAdditionalsValue)}</strong>
            </div>
            <div className="pt-2 border-t border-slate-700 flex items-center justify-between">
              <span className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Total Líquido a Receber:
              </span>
              <span className="text-xl font-black text-emerald-400">
                {formatCurrency(summary.grandTotal)}
              </span>
            </div>
          </div>

          {/* Payment Status Pill */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-500">Status do Pagamento:</span>
            <button
              onClick={onTogglePaid}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                summary.isPaid
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {summary.isPaid ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pago via PIX</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pendente (Clique p/ Quitar)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <button
            onClick={handleCopyWhatsApp}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition-colors cursor-pointer"
          >
            {copiedText ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            <span>{copiedText ? 'Copiado para o WhatsApp!' : 'Copiar Texto p/ WhatsApp'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Cupom</span>
          </button>
        </div>
      </div>
    </div>
  );
};
