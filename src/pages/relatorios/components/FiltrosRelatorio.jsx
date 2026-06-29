import { Calendar as CalendarIcon, Filter, AlertTriangle, Tag, Clock, Layers } from 'lucide-react'

export default function FiltrosRelatorio({
  loading,
  moduloAtivo,
  auxiliares,
  periodoInicial,
  setPeriodoInicial,
  periodoFinal,
  setPeriodoFinal,
  filtroUnidade,
  setFiltroUnidade,
  filtroSetor,
  setFiltroSetor,
  filtroStatusOs,
  setFiltroStatusOs,
  filtroPatrimonio,
  setFiltroPatrimonio,
  filtroEtiqueta,
  setFiltroEtiqueta,
  filtroCalibracao,
  setFiltroCalibracao
}) {
  const isModuloTecnologia = ['ti', 'impressoras'].includes(moduloAtivo)

  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
      {/* Linha 1: Período, Unidade e Setor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 mb-5">
        <div>
          <label className="text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
            <CalendarIcon size={14} /> Data Inicial (Abertura)
          </label>
          <input type="date" value={periodoInicial} onChange={(e) => setPeriodoInicial(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-medium" />
        </div>
        
        <div>
          <label className="text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
            <CalendarIcon size={14} /> Data Final
          </label>
          <input type="date" value={periodoFinal} onChange={(e) => setPeriodoFinal(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-medium" />
        </div>

        <div>
          <label className="text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
            <Filter size={14} /> Unidade
          </label>
          <select value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm font-bold text-slate-700">
            <option value="Todas">Todas as Unidades</option>
            {(auxiliares?.unidades || []).map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>

        {/* NOVO FILTRO POR SETOR PARA INDIVIDUALIZAR PARA A FISCALIZAÇÃO */}
        <div>
          <label className="text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
            <Layers size={14} /> Setor Hospitalar
          </label>
          <select value={filtroSetor} onChange={(e) => setFiltroSetor(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm font-bold text-slate-700">
            <option value="Todos">Todos os Setores</option>
            {(auxiliares?.setores || []).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
      </div>

      {/* Linha 2: Filtros Técnicos Avançados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Status do Serviço (OS)</label>
          <select value={filtroStatusOs} onChange={(e) => setFiltroStatusOs(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 bg-slate-50 text-xs font-bold text-slate-700">
            <option value="Todas">Todas as OS</option>
            <option value="Concluidos">Apenas Concluídas</option>
            <option value="Pendentes">Pendentes (Ativas/Agendadas)</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block flex items-center gap-1">
            <AlertTriangle size={10}/> Patrimônio Físico
          </label>
          <select value={filtroPatrimonio} onChange={(e) => setFiltroPatrimonio(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 bg-slate-50 text-xs font-bold text-slate-700">
            <option value="Todos">Indiferente</option>
            <option value="Com">Apenas Com Patrimônio</option>
            <option value="Sem">Apenas Sem Patrimônio</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block flex items-center gap-1">
            <Tag size={10}/> Etiqueta Manutenção
          </label>
          <select value={filtroEtiqueta} onChange={(e) => setFiltroEtiqueta(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 bg-slate-50 text-xs font-bold text-slate-700">
            <option value="Todos">Indiferente</option>
            <option value="Com">Apenas Com Etiqueta</option>
            <option value="Sem">Apenas Sem Etiqueta</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 tracking-wider mb-1 block flex items-center gap-1">
            <Clock size={10}/> Status Calibração/Prev.
          </label>
          <select disabled={isModuloTecnologia} value={filtroCalibracao} onChange={(e) => setFiltroCalibracao(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
            <option value="Todos">Indiferente</option>
            <option value="EmDia">Calibração em Dia</option>
            <option value="Atrasada">Calibração Atrasada</option>
          </select>
        </div>
      </div>
    </div>
  )
}