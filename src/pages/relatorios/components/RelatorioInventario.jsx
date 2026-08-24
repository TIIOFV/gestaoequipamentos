import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { Filter, Layers, Activity, Loader2, MapPin, Hash, ShieldAlert, FileSpreadsheet, CheckSquare, ArrowRight } from 'lucide-react'
import * as XLSX from 'xlsx-js-style'
import toast from 'react-hot-toast'

const aplicarEstilosExcel = (ws, totalLinhas, totalColunas) => {
  ws['!merges'] = [ { s: { r: 0, c: 0 }, e: { r: 0, c: totalColunas - 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: totalColunas - 1 } } ];
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: '' };
      if (R === 0) ws[cellAddress].s = { font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 }, fill: { fgColor: { rgb: "0F172A" } }, alignment: { horizontal: "center", vertical: "center" } };
      else if (R === 1) ws[cellAddress].s = { font: { italic: true, color: { rgb: "475569" }, sz: 11 }, fill: { fgColor: { rgb: "F8FAFC" } }, alignment: { horizontal: "center", vertical: "center" }, border: { bottom: { style: "medium", color: { rgb: "CBD5E1" } } } };
      else if (R === 2) ws[cellAddress].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "2563EB" } }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} } };
      else ws[cellAddress].s = { alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: { top: {style:'thin', color: {rgb: "E2E8F0"}}, bottom: {style:'thin', color: {rgb: "E2E8F0"}}, left: {style:'thin', color: {rgb: "E2E8F0"}}, right: {style:'thin', color: {rgb: "E2E8F0"}} } };
    }
  }
  const ultimaColunaLetra = XLSX.utils.encode_col(totalColunas - 1);
  ws['!autofilter'] = { ref: `A3:${ultimaColunaLetra}${totalLinhas + 3}` }; 
  ws['!freeze'] = { xSplit: 0, ySplit: 3 };
}

export default function RelatorioInventario({ moduloAtivo, nomeAmbiente, setBloquearImpressao }) {
  const [loading, setLoading] = useState(false)
  const [equipamentos, setEquipamentos] = useState([])
  const [auxiliares, setAuxiliares] = useState({ unidades: [], setores: [] })
  const [filtroUnidade, setFiltroUnidade] = useState('Todas')
  const [filtroSetor, setFiltroSetor] = useState('Todos')
  const [filtroStatus, setFiltroStatus] = useState('Todos')

  useEffect(() => { if (moduloAtivo) { carregarAuxiliares(); gerarRelatorio(); } }, [moduloAtivo, filtroUnidade, filtroSetor, filtroStatus])
  useEffect(() => { setBloquearImpressao(equipamentos.length === 0) }, [equipamentos, setBloquearImpressao])

  const carregarAuxiliares = async () => {
    const [uni, set] = await Promise.all([ supabase.from('unidades').select('*').order('nome'), supabase.from('setores').select('*').order('nome') ])
    setAuxiliares({ unidades: uni.data || [], setores: set.data || [] })
  }

  const gerarRelatorio = async () => {
    setLoading(true)
    try {
      let query = supabase.from('equipamentos').select(`id, nome, patrimonio, numero_serie, modelo, registro_anvisa, periodicidade, possui_etiqueta, sem_patrimonio, data_proxima_calibracao, data_ultima_calibracao, unidade:unidade_id(id, nome), setor:setor_id(id, nome), status:status_id(nome), fabricante:fabricante_id(nome), prestador:prestador_id(nome)`).eq('modulo', moduloAtivo).order('nome', { ascending: true })
      const { data, error } = await query
      if (error) throw error

      let filtrados = data || []
      if (filtroUnidade !== 'Todas') filtrados = filtrados.filter(e => String(e.unidade?.id) === String(filtroUnidade))
      if (filtroSetor !== 'Todos') filtrados = filtrados.filter(e => String(e.setor?.id) === String(filtroSetor))
      if (filtroStatus !== 'Todos') filtrados = filtrados.filter(e => { const statusDB = e.status?.nome || ''; return statusDB.toLowerCase().trim() === filtroStatus.toLowerCase().trim(); })
      setEquipamentos(filtrados)
    } catch (err) { toast.error('Erro ao buscar inventário.') } finally { setLoading(false) }
  }

  const exportarExcel = () => {
    if (equipamentos.length === 0) return toast.error('Não há dados para exportar.')
    const dadosExcel = equipamentos.map(eq => ({ 'Equipamento': eq.nome || '-', 'Fabricante': eq.fabricante?.nome || '-', 'Modelo': eq.modelo || '-', 'Patrimônio': eq.sem_patrimonio ? 'PENDENTE' : (eq.patrimonio || '-'), 'Número de Série': eq.numero_serie || '-', 'Registro ANVISA': eq.registro_anvisa || '-', 'Periodicidade': eq.periodicidade || '-', 'Unidade': eq.unidade?.nome || '-', 'Setor': eq.setor?.nome || '-', 'Status': eq.status?.nome || 'Não Informado', 'Possui Etiqueta': eq.possui_etiqueta ? 'Sim' : 'Não', 'Última Prev./Calib.': eq.data_ultima_calibracao ? new Date(eq.data_ultima_calibracao).toLocaleDateString('pt-BR') : '-', 'Próxima Prev./Calib.': eq.data_proxima_calibracao ? new Date(eq.data_proxima_calibracao).toLocaleDateString('pt-BR') : '-' }))
    const ws = XLSX.utils.json_to_sheet(dadosExcel, { origin: "A3" })
    XLSX.utils.sheet_add_aoa(ws, [[`INVENTÁRIO DO PARQUE TECNOLÓGICO - ${nomeAmbiente.toUpperCase()}`]], { origin: "A1" })
    XLSX.utils.sheet_add_aoa(ws, [[`Data de Exportação: ${new Date().toLocaleDateString('pt-BR')} | Total Listado: ${equipamentos.length} equipamentos`]], { origin: "A2" })
    ws['!cols'] = [ { wch: 35 }, { wch: 20 }, { wch: 25 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 25 }, { wch: 25 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 18 } ]
    aplicarEstilosExcel(ws, equipamentos.length, Object.keys(dadosExcel[0]).length);
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inventário')
    XLSX.writeFile(wb, `Inventario_${nomeAmbiente.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const exportarExcelONA = () => {
    if (equipamentos.length === 0) return toast.error('Não há dados para exportar.')
    const dadosExcel = equipamentos.map(eq => ({ 'NOME DO EQUIPAMENTO': eq.nome || '-', 'MODELO': eq.modelo || '-', 'Nº SÉRIE': eq.numero_serie || '-', 'FABRICANTE': eq.fabricante?.nome || '-', 'REGISTRO DA ANVISA / CME': eq.registro_anvisa || '-', 'SETOR': eq.setor?.nome || '-', 'LOCALIZAÇÃO': eq.unidade?.nome || '-', 'PERIODICIDADE SUGERIDA': eq.periodicidade ? eq.periodicidade.toUpperCase() : '-', 'DATA PREVENTIVA REALIZADA': eq.data_ultima_calibracao ? new Date(eq.data_ultima_calibracao).toLocaleDateString('pt-BR') : '-', 'DATA PROXIMA PREVENTIVA': eq.data_proxima_calibracao ? new Date(eq.data_proxima_calibracao).toLocaleDateString('pt-BR') : '-', 'RESPONSÁVEL': eq.prestador?.nome || 'EQUIPE INTERNA' }))
    const ws = XLSX.utils.json_to_sheet(dadosExcel, { origin: "A3" });
    XLSX.utils.sheet_add_aoa(ws, [[`CONTROLE DE EQUIPAMENTOS`]], { origin: "A1" })
    XLSX.utils.sheet_add_aoa(ws, [[`Data de Exportação: ${new Date().toLocaleDateString('pt-BR')} | Total Listado: ${equipamentos.length} equipamentos`]], { origin: "A2" })
    ws['!cols'] = [ { wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 } ];
    aplicarEstilosExcel(ws, equipamentos.length, Object.keys(dadosExcel[0]).length);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Padrão_ONA');
    XLSX.writeFile(wb, `Controle_Equipamentos_ONA_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500">
      
      {/* 🚀 Ajuste do p-6 para p-4 sm:p-6 no mobile */}
      <div className="no-print bg-white p-4 sm:p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 md:mb-6">
          <div>
            <label className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1.5"><Filter size={14}/> Unidade</label>
            <select value={filtroUnidade} onChange={e => setFiltroUnidade(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
              <option value="Todas">Todas as Unidades</option>
              {auxiliares.unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1.5"><Layers size={14}/> Setor Hospitalar</label>
            <select value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
              <option value="Todos">Todos os Setores</option>
              {auxiliares.setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1.5"><Activity size={14}/> Status Operacional</label>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
              <option value="Todos">Todos os Status</option>
              <option value="Ativo">Apenas Ativos</option>
              <option value="Inoperante">Apenas Inoperantes</option>
              <option value="Manutenção">Em Manutenção</option>
              <option value="Baixa">Baixados / Desativados</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 md:pt-6 border-t border-slate-100">
          <button type="button" onClick={exportarExcel} disabled={equipamentos.length === 0} className="w-full sm:w-auto justify-center flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-xs px-5 py-3 md:py-4 rounded-xl shadow-md transition-all active:scale-95">
            <FileSpreadsheet size={16} /> Excel Padrão
          </button>
          <button type="button" onClick={exportarExcelONA} disabled={equipamentos.length === 0} className="w-full sm:w-auto justify-center flex items-center gap-2 bg-teal-800 hover:bg-teal-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-teal-50 font-black uppercase tracking-widest text-xs px-5 py-3 md:py-4 rounded-xl shadow-md transition-all active:scale-95 border border-teal-700">
            <CheckSquare size={16} /> Molde ONA
          </button>
        </div>
      </div>

      <div id="relatorio-impresso" className="bg-white rounded-[2rem] border border-slate-200 p-4 sm:p-6 md:p-8 shadow-sm">
        <div className="border-b-2 border-slate-800 pb-4 md:pb-5 mb-4 md:mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">{nomeAmbiente} - Relatório de Inventário</h2>
            <p className="text-slate-500 text-xs md:text-sm font-bold mt-1 md:mt-2">Visão geral e status do parque tecnológico</p>
          </div>
          <div className="w-full md:w-auto text-xs text-slate-700 bg-slate-50 border border-slate-200 p-3 md:p-4 rounded-xl">
            <div><span className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Total Listado:</span> <span className="font-bold">{equipamentos.length} equipamentos</span></div>
            <div className="mt-1"><span className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Setor:</span> <span className="font-bold">{filtroSetor === 'Todos' ? 'Todos os Setores' : auxiliares.setores.find(s => String(s.id) === String(filtroSetor))?.nome}</span></div>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center text-slate-400"><Loader2 className="animate-spin" size={32} /></div>
        ) : equipamentos.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-bold">Nenhum equipamento encontrado com estes filtros.</div>
        ) : (
          <>
            {/* 🚀 O AVISO DE UX APENAS NO MOBILE */}
            <div className="md:hidden flex items-center justify-center gap-2 text-[10px] font-black text-blue-600 bg-blue-50/50 uppercase tracking-widest mb-3 py-2.5 rounded-xl border border-blue-100/50">
              <ArrowRight size={14} className="animate-pulse" /> Deslize para o lado para ver mais
            </div>

            <div className="w-full overflow-x-auto print:overflow-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <table className="w-full text-left border-collapse min-w-[800px] print:min-w-full">
                <thead className="bg-slate-50 border-y border-slate-200">
                  <tr>
                    <th className="py-4 px-4 md:px-5 text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest w-[35%]">Equipamento / Detalhes</th>
                    <th className="py-4 px-4 md:px-5 text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest w-[25%]">Identificação</th>
                    <th className="py-4 px-4 md:px-5 text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest w-[25%]">Localização Física</th>
                    <th className="py-4 px-4 md:px-5 text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest w-[15%]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {equipamentos.map(eq => {
                    const statusOriginal = eq.status?.nome || 'Não Informado';
                    const statusLimpo = statusOriginal.toLowerCase().trim();

                    return (
                      <tr key={eq.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 md:py-5 px-4 md:px-5 align-top">
                          <div className="font-black text-slate-800 uppercase text-xs md:text-sm leading-tight">{eq.nome}</div>
                          <div className="text-[10px] md:text-[11px] text-slate-500 mt-2 flex items-center gap-1.5 flex-wrap font-medium">
                            {eq.fabricante?.nome ? <span className="font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">{eq.fabricante.nome}</span> : null}
                            {eq.modelo ? <span>Mod: {eq.modelo}</span> : null}
                            {!eq.fabricante?.nome && !eq.modelo && <span>Detalhes não informados</span>}
                          </div>
                        </td>
                        
                        <td className="py-4 md:py-5 px-4 md:px-5 align-top text-[10px] md:text-xs text-slate-600 space-y-2">
                          <div className="flex items-center gap-2">
                            <Hash size={12} md:size={14} className="text-slate-400 shrink-0" />
                            <span className="font-black text-slate-400">PAT:</span> 
                            {eq.sem_patrimonio ? (
                              <span className="text-rose-700 font-black bg-rose-50 px-2 py-0.5 rounded border border-rose-200">PENDENTE</span>
                            ) : (
                              <span className="font-bold text-slate-800">{eq.patrimonio || '-'}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Hash size={12} md:size={14} className="text-slate-400 shrink-0 opacity-0" />
                            <span className="font-black text-slate-400">SÉRIE:</span> 
                            <span className="font-bold text-slate-800">{eq.numero_serie || '-'}</span>
                          </div>
                          {eq.registro_anvisa && (
                            <div className="flex items-center gap-2 mt-1">
                              <Activity size={12} md:size={14} className="text-emerald-500 shrink-0" />
                              <span className="font-black text-emerald-700">ANVISA:</span>
                              <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">{eq.registro_anvisa}</span>
                            </div>
                          )}
                        </td>
                        
                        <td className="py-4 md:py-5 px-4 md:px-5 align-top text-[10px] md:text-xs text-slate-700">
                          <div className="font-black text-blue-800 flex items-start gap-2 mb-1.5">
                            <MapPin size={12} md:size={14} className="mt-0.5 text-blue-500 shrink-0" />
                            <span>{eq.unidade?.nome || 'Unidade não definida'}</span>
                          </div>
                          <div className="text-slate-500 ml-4 md:ml-5 font-bold">{eq.setor?.nome || 'Setor não vinculado'}</div>
                        </td>
                        
                        <td className="py-4 md:py-5 px-4 md:px-5 align-top">
                          <span className={`inline-flex items-center gap-1.5 text-[9px] md:text-[10px] font-black uppercase px-2 py-1 md:px-2.5 md:py-1.5 rounded-lg border shadow-sm tracking-widest ${
                            statusLimpo === 'ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            statusLimpo === 'inoperante' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            statusLimpo === 'manutenção' || statusLimpo === 'em manutenção' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            statusLimpo === 'baixa' ? 'bg-slate-100 text-slate-600 border-slate-300' :
                            'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {statusLimpo === 'inoperante' && <ShieldAlert size={10} md:size={12} />}
                            {statusOriginal}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}