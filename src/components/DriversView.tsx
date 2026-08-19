import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  Phone, 
  Key, 
  Bike, 
  Car, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { Driver } from '../types';
import { generateDriversListCSV, downloadCSV } from '../utils/csvUtils';
import { formatDateBR } from '../utils/dateUtils';

export const DriversView: React.FC = () => {
  const { data, addDriver, updateDriver, deleteDriver, toggleDriverStatus } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    phone: '',
    pixKey: '',
    pixType: 'cpf' as Driver['pixType'],
    vehicleType: 'moto' as Driver['vehicleType'],
    plate: '',
    notes: '',
    active: true,
    color: '#ef4444',
  });

  const openNewDriverModal = () => {
    setEditingDriver(null);
    setFormData({
      name: '',
      nickname: '',
      phone: '',
      pixKey: '',
      pixType: 'cpf',
      vehicleType: 'moto',
      plate: '',
      notes: '',
      active: true,
      color: '#ef4444',
    });
    setIsModalOpen(true);
  };

  const openEditDriverModal = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      nickname: driver.nickname || '',
      phone: driver.phone,
      pixKey: driver.pixKey,
      pixType: driver.pixType,
      vehicleType: driver.vehicleType,
      plate: driver.plate || '',
      notes: driver.notes || '',
      active: driver.active,
      color: driver.color || '#ef4444',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.pixKey.trim()) return;

    if (editingDriver) {
      await updateDriver(editingDriver.id, formData);
    } else {
      await addDriver(formData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (driver: Driver) => {
    const hasRecords = data.records.some((r) => r.driverId === driver.id);
    const confirmMsg = hasRecords
      ? `Atenção: ${driver.name} possui lançamentos no histórico. Ao excluir o cadastro, o histórico permanecerá guardado com o ID. Deseja continuar?`
      : `Deseja realmente excluir o cadastro de ${driver.name}?`;

    if (window.confirm(confirmMsg)) {
      await deleteDriver(driver.id);
    }
  };

  const handleExportCSV = () => {
    const csv = generateDriversListCSV(data.drivers);
    downloadCSV(`cadastro_entregadores_pizzahut_${Date.now()}.csv`, csv);
  };

  // Filtered drivers
  const filteredDrivers = useMemo(() => {
    return data.drivers.filter((d) => {
      // Search
      const matchSearch =
        !searchTerm.trim() ||
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.nickname && d.nickname.toLowerCase().includes(searchTerm.toLowerCase())) ||
        d.pixKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.plate && d.plate.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;

      // Status
      if (filterStatus === 'ativos') return d.active;
      if (filterStatus === 'inativos') return !d.active;
      return true;
    });
  }, [data.drivers, searchTerm, filterStatus]);

  // Driver lifetime delivery count helper
  const getDriverStats = (driverId: string) => {
    const recs = data.records.filter((r) => r.driverId === driverId);
    const totalDeliveries = recs.reduce((s, r) => s + r.deliveriesCount, 0);
    const totalAdditionals = recs.reduce((s, r) => s + r.additionalsCount, 0);
    return { totalDeliveries, totalAdditionals, recordsCount: recs.length };
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-2xl p-5 sm:p-6 text-white border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-red-600/30 text-red-300 text-xs font-bold rounded-full border border-red-500/20">
              Gestão de Equipe
            </span>
            <span className="text-xs text-slate-400">
              {data.drivers.filter((d) => d.active).length} Ativos de {data.drivers.length} Cadastrados
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Cadastro de Entregadores (Motoboys)
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
            Gerenciamento de dados cadastrais, chaves PIX para pagamento e veículos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Exportar Lista</span>
          </button>

          <button
            id="btn_add_driver_open"
            onClick={openNewDriverModal}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-900/30 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Entregador</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, apelido, PIX, placa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          {(['todos', 'ativos', 'inativos'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterStatus(filter)}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                filterStatus === filter
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {filter === 'todos' && `Todos (${data.drivers.length})`}
              {filter === 'ativos' && `Ativos (${data.drivers.filter((d) => d.active).length})`}
              {filter === 'inativos' && `Inativos (${data.drivers.filter((d) => !d.active).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Driver Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDrivers.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-12 text-center text-slate-400 text-xs border border-slate-200">
            Nenhum entregador encontrado com os filtros atuais.
          </div>
        ) : (
          filteredDrivers.map((driver) => {
            const stats = getDriverStats(driver.id);
            return (
              <div
                key={driver.id}
                className={`bg-white rounded-2xl p-5 border transition-all hover:shadow-md flex flex-col justify-between space-y-4 ${
                  driver.active
                    ? 'border-slate-200'
                    : 'border-slate-200 bg-slate-50/70 opacity-75'
                }`}
              >
                {/* Card Top */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-base font-black shadow-sm"
                      style={{ backgroundColor: driver.color || '#ef4444' }}
                    >
                      {driver.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <span>{driver.name}</span>
                      </h3>
                      {driver.nickname && (
                        <span className="inline-block text-[11px] font-semibold text-slate-500">
                          Apelido: <strong className="text-slate-700">"{driver.nickname}"</strong>
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.2 rounded-full ${
                            driver.active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {driver.active ? 'Ativo' : 'Inativo'}
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize font-medium flex items-center gap-1">
                          {driver.vehicleType === 'moto' && <Bike className="w-3 h-3 text-red-600" />}
                          {driver.vehicleType === 'carro' && <Car className="w-3 h-3 text-blue-600" />}
                          {driver.vehicleType} {driver.plate ? `(${driver.plate})` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditDriverModal(driver)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="Editar dados"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(driver)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Excluir cadastro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Details box */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <Key className="w-3.5 h-3.5 text-amber-500" />
                      PIX ({driver.pixType.toUpperCase()}):
                    </span>
                    <span className="text-slate-900 font-mono font-bold truncate max-w-[170px]" title={driver.pixKey}>
                      {driver.pixKey}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      Telefone:
                    </span>
                    <span className="text-slate-700 font-mono">{driver.phone || '-'}</span>
                  </div>

                  {driver.notes && (
                    <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200/60">
                      "{driver.notes}"
                    </p>
                  )}
                </div>

                {/* Lifetime Delivery stats & toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="text-slate-500">
                    Histórico: <strong className="text-slate-900">{stats.totalDeliveries}</strong> ent. | <strong className="text-amber-600">+{stats.totalAdditionals}</strong> adic.
                  </div>

                  <button
                    onClick={() => toggleDriverStatus(driver.id)}
                    className={`text-[11px] font-bold px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                      driver.active
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {driver.active ? 'Desativar' : 'Ativar Motoboy'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Driver Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-red-100 text-red-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {editingDriver ? 'Editar Entregador' : 'Novo Entregador'}
                  </h3>
                  <p className="text-xs text-slate-500">Cadastro de dados e chave PIX para repasses</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Name */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo Mendes"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                  />
                </div>

                {/* Nickname */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Apelido / Nome de Guerra (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Relâmpago"
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: (11) 98765-4321"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                  />
                </div>

                {/* PIX Key Type */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tipo de Chave PIX *
                  </label>
                  <select
                    value={formData.pixType}
                    onChange={(e) => setFormData({ ...formData, pixType: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="cpf">CPF</option>
                    <option value="cnpj">CNPJ</option>
                    <option value="email">E-mail</option>
                    <option value="telefone">Telefone (DDD + Número)</option>
                    <option value="aleatoria">Chave Aleatória (EVP)</option>
                  </select>
                </div>

                {/* PIX Key */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Chave PIX *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 123.456.789-00 ou email@banco.com"
                    value={formData.pixKey}
                    onChange={(e) => setFormData({ ...formData, pixKey: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                  />
                </div>

                {/* Vehicle */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tipo de Veículo
                  </label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="moto">Moto (Motocicleta)</option>
                    <option value="bicicleta">Bicicleta</option>
                    <option value="carro">Carro / Utilitário</option>
                  </select>
                </div>

                {/* Plate */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Placa do Veículo
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: ABC-1D23"
                    value={formData.plate}
                    onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                  />
                </div>

                {/* Notes */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Observações / Região de Atendimento
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Turno noturno, bag extra, mora próximo..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Status active */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="chk_driver_active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                />
                <label htmlFor="chk_driver_active" className="font-semibold text-slate-800 cursor-pointer">
                  Entregador Ativo para novas escalas e lançamentos
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingDriver ? 'Salvar Alterações' : 'Cadastrar Entregador'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
