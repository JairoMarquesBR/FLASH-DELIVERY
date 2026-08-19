import React, { useState, useRef } from 'react';
import { 
  Settings, 
  DollarSign, 
  Wifi, 
  Database, 
  Save, 
  RefreshCw, 
  Download, 
  Upload, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Check, 
  Pizza, 
  Building2, 
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { formatCurrency } from '../utils/calcUtils';

export const SettingsView: React.FC = () => {
  const { data, updateSettings, resetDatabase, importBackup, networkInfo, isSaving, refreshData } = useData();

  const [settingsForm, setSettingsForm] = useState({
    storeName: data.settings.storeName,
    cooperativeName: data.settings.cooperativeName,
    storeAddress: data.settings.storeAddress,
    storePhone: data.settings.storePhone,
    baseDeliveryRate: data.settings.baseDeliveryRate,
    additionalRate: data.settings.additionalRate,
  });

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      storeName: settingsForm.storeName,
      cooperativeName: settingsForm.cooperativeName,
      storeAddress: settingsForm.storeAddress,
      storePhone: settingsForm.storePhone,
      baseDeliveryRate: Number(settingsForm.baseDeliveryRate) || 9,
      additionalRate: Number(settingsForm.additionalRate) || 2,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleDownloadBackup = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_pizzahut_cooperativa_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const success = await importBackup(parsed);
        if (success) {
          setImportStatus('Backup restaurado com sucesso!');
        } else {
          setImportStatus('Erro: Arquivo JSON de backup inválido.');
        }
      } catch (err) {
        setImportStatus('Erro ao ler arquivo de backup.');
      }
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file);
  };

  const handleResetData = async () => {
    if (window.confirm('Atenção: Deseja realmente resetar o banco para os dados de demonstração iniciais da Pizza Hut?')) {
      await resetDatabase();
      alert('Banco de dados restaurado com dados de demonstração.');
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="bg-slate-900 rounded-2xl p-5 sm:p-6 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-red-600/30 text-red-300 text-xs font-bold rounded-full border border-red-500/20">
              Configurações do Sistema
            </span>
            <span className="text-xs text-slate-400">
              Taxas, Dados da Unidade e Hospedagem em Rede
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Ajustes, Taxas & Rede Local
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
            Configure valores padrão, regras de repasse e conexões de rede local
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>Configurações atualizadas e salvas no banco com sucesso!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form 1: Financial Rules & Store info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financial Parameters */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-red-50 text-red-600">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Regras de Remuneração da Cooperativa</h3>
                <p className="text-xs text-slate-500">Defina os valores padrão das entregas e adicionais</p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Base Rate */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
                  <label className="block font-bold text-slate-800">
                    Taxa Base por Entrega (R$) *
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Valor fixo pago por cada entrega realizada.
                  </p>
                  <div className="relative mt-2">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">R$</span>
                    <input
                      type="number"
                      step="0.50"
                      min="1"
                      required
                      value={settingsForm.baseDeliveryRate}
                      onChange={(e) => setSettingsForm({ ...settingsForm, baseDeliveryRate: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-10 pr-3 py-2 text-sm font-black bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Additional Rate */}
                <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-1.5">
                  <label className="block font-bold text-amber-900">
                    Valor por Adicional (Raio / Chuva) (R$) *
                  </label>
                  <p className="text-[11px] text-amber-800">
                    Acréscimo somado a cada adicional registrado.
                  </p>
                  <div className="relative mt-2">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-amber-700">R$</span>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      required
                      value={settingsForm.additionalRate}
                      onChange={(e) => setSettingsForm({ ...settingsForm, additionalRate: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-10 pr-3 py-2 text-sm font-black bg-white border border-amber-300 rounded-xl text-amber-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Fiscal Week Explanation box */}
              <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold block text-amber-300 uppercase tracking-wide text-[10px]">
                    Semana Fiscal da Cooperativa
                  </span>
                  <span className="font-medium text-slate-300">
                    Ciclo de Fechamento: <strong>Quarta a Terça-feira</strong>
                  </span>
                </div>
                <span className="px-2.5 py-1 bg-slate-800 text-emerald-400 rounded-lg font-bold text-[11px] border border-slate-700">
                  Ativo no Sistema
                </span>
              </div>

              {/* Store Identity */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <h4 className="font-bold text-sm text-slate-800">Identificação da Pizzaria & Cooperativa</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nome da Loja</label>
                    <input
                      type="text"
                      value={settingsForm.storeName}
                      onChange={(e) => setSettingsForm({ ...settingsForm, storeName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nome da Cooperativa</label>
                    <input
                      type="text"
                      value={settingsForm.cooperativeName}
                      onChange={(e) => setSettingsForm({ ...settingsForm, cooperativeName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Endereço da Unidade</label>
                    <input
                      type="text"
                      value={settingsForm.storeAddress}
                      onChange={(e) => setSettingsForm({ ...settingsForm, storeAddress: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Telefone da Loja</label>
                    <input
                      type="text"
                      value={settingsForm.storePhone}
                      onChange={(e) => setSettingsForm({ ...settingsForm, storePhone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow cursor-pointer transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Configurações</span>
              </button>
            </form>
          </div>
        </div>

        {/* Column 2: Local Network Hosting & Database Backup */}
        <div className="space-y-6">
          {/* Local Network Info */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Hospedagem em Rede Local</h3>
                <p className="text-xs text-slate-500">Acesso via celular ou tablet no Wi-Fi</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Este sistema grava os dados localmente no computador host. Para acessar de outros celulares ou tablets da pizzaria na mesma rede Wi-Fi:
              </p>

              {networkInfo && networkInfo.localIPs.length > 0 ? (
                <div className="space-y-2 pt-2">
                  {networkInfo.allUrls.map((url, idx) => (
                    <div key={idx} className="bg-slate-900 text-white p-3 rounded-xl flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-amber-300 truncate">{url}</span>
                      <button
                        onClick={() => copyUrl(url)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200"
                        title="Copiar URL"
                      >
                        {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-100 p-3 rounded-xl text-slate-700 font-mono text-xs">
                  http://localhost:3000
                </div>
              )}

              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-[11px] space-y-1">
                <p className="font-bold">✓ Multi-dispositivos em tempo real</p>
                <p>Qualquer lançamento feito no celular do gerente ou caixa atualiza instantaneamente no banco central.</p>
              </div>
            </div>
          </div>

          {/* Database Backup & Restore */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Banco de Dados Local</h3>
                <p className="text-xs text-slate-500">Backup, restauração e estatísticas</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total de Entregadores:</span>
                  <strong className="text-slate-900">{data.drivers.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lançamentos no Histórico:</span>
                  <strong className="text-slate-900">{data.records.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Última Gravação:</span>
                  <strong className="text-slate-900">{data.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString('pt-BR') : '-'}</strong>
                </div>
              </div>

              {importStatus && (
                <div className="p-2 bg-slate-900 text-white rounded-lg text-xs font-bold text-center">
                  {importStatus}
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleDownloadBackup}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Baixar Arquivo de Backup (JSON)</span>
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json"
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold border border-slate-200 cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Restaurar Backup (JSON)</span>
                </button>

                <button
                  onClick={handleResetData}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-red-600 hover:bg-red-50 rounded-xl font-semibold text-[11px] cursor-pointer transition-colors mt-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar Dados Padrão Pizza Hut</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
