import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { Calendar as CalendarIcon, Filter, Layers, AlertTriangle, Tag, Clock, MapPin, Wrench, User, Activity, Loader2, FileSpreadsheet, ArrowRight } from 'lucide-react'
import * as XLSX from 'xlsx-js-style'
import toast from 'react-hot-toast'

const formatDataSegura = (dataString) => {
  if (!dataString) return '-';
  const apenasData = dataString.split('T')[0];
  const [ano, mes, dia] = apenasData.split('-');
  return `${dia}/${mes}/${ano}`;
}

export default function RelatorioOS({ moduloAtivo, nomeAmbiente, setBloquearImpressao }) {
  const isModuloTecnologia = ['ti', 'impressoras'].includes(moduloAtivo)
  
  const [loading, setLoading] = useState(false)
  const [dadosBrutos, setDadosBrutos] = useState([])
  const [auxiliares, setAuxiliares] = useState({ unidades: [], setores: [] })
  
  const [periodoInicial, setPeriodoInicial] = useState(() => { const data = new Date(); data.setDate(1); return data.toISOString().split('T')[0] })
  const [periodoFinal, setPeriodoFinal] = useState(() => new Date().toISOString().split('T')[0])
  const [filtroUnidade, setFiltroUnidade] = useState('Todas')
  const [filtroSetor, setFiltroSetor] = useState('Todos')
  const [filtroStatusOs, setFiltroStatusOs] = useState('Todas') 
  const [filtroPatrimonio, setFiltroPatrimonio] = useState('Todos') 
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('Todos') 
  const [filtroCalibracao, setFiltroCalibracao] = useState('Todos')

  useEffect(() => { if (moduloAtivo) carregarAuxiliares() }, [moduloAtivo])
  useEffect(() => { if (moduloAtivo) gerarRelatorio() }, [periodoInicial, periodoFinal, filtroUnidade, filtroSetor, filtroStatusOs, filtroPatrimonio, filtroEtiqueta, filtroCalibracao, moduloAtivo])
  useEffect(() => { setBloquearImpressao(dadosBrutos.length === 0) }, [dadosBrutos, setBloquearImpressao])

  const carregarAuxiliares = async () => {
    const [uni, set] = await Promise.all([ supabase.from('unidades').select('*').order('nome'), supabase.from('setores').select('*').order('nome') ])
    setAuxiliares({ unidades: uni.data || [], setores: set.data || [] })
  }

  const gerarRelatorio = async () => {
    setLoading(true)
    const fimAjustado = `${periodoFinal}T23:59:59.999Z`

    try {
      let query = supabase.from('chamados').select(`id, tipo_intervencao, data_abertura, data_conclusao, data_prevista, descricao, protocolo_externo, status:status_id(nome), prestador:prestador_id(nome), aberto_por:aberto_por_id(nome), equipamento:equipamento_id(nome, patrimonio, numero_serie, modelo, registro_anvisa, possui_etiqueta, sem_patrimonio, data_proxima_calibracao, unidade:unidade_id(id, nome), setor:setor_id(id, nome))`).eq('modulo', moduloAtivo).gte('data_abertura', `${periodoInicial}T00:00:00.000Z`).lte('data_abertura', fimAjustado).order('data_abertura', { ascending: false })
      const { data, error } = await query
      if (error) throw error

      let chamadosFiltrados = data || []
      if (filtroUnidade !== 'Todas') chamadosFiltrados = chamadosFiltrados.filter(ch => String(ch.equipamento?.unidade?.id) === String(filtroUnidade))
      if (filtroSetor !== 'Todos') chamadosFiltrados = chamadosFiltrados.filter(ch => String(ch.equipamento?.setor?.id) === String(filtroSetor))
      if (filtroStatusOs === 'Concluidos') chamadosFiltrados = chamadosFiltrados.filter(ch => ch.status?.nome?.toLowerCase().trim() === 'concluído')
      else if (filtroStatusOs === 'Pendentes') chamadosFiltrados = chamadosFiltrados.filter(ch => ch.status?.nome?.toLowerCase().trim() !== 'concluído')
      if (filtroPatrimonio === 'Com') chamadosFiltrados = chamadosFiltrados.filter(ch => ch.equipamento && !ch.equipamento.sem_patrimonio)
      else if (filtroPatrimonio === 'Sem') chamadosFiltrados = chamadosFiltrados.filter(ch => ch.equipamento && ch.equipamento.sem_patrimonio)
      if (filtroEtiqueta === 'Com') chamadosFiltrados = chamadosFiltrados.filter(ch => ch.equipamento && ch.equipamento.possui_etiqueta)
      else if (filtroEtiqueta === 'Sem') chamadosFiltrados = chamadosFiltrados.filter(ch => ch.equipamento && !ch.equipamento.possui_etiqueta)
      if (filtroCalibracao !== 'Todos') {
        const hoje = new Date()
        hoje.setHours(0,0,0,0)
        chamadosFiltrados = chamadosFiltrados.filter(ch => {
          if (!ch.equipamento || !ch.equipamento.data_proxima_calibracao) return false;
          const dataRef = new Date(ch.equipamento.data_proxima_calibracao);
          dataRef.setHours(0,0,0,0);
          const isAtrasada = dataRef < hoje;
          return filtroCalibracao === 'Atrasada' ? isAtrasada : !isAtrasada;
        })
      }
      setDadosBrutos(chamadosFiltrados)
    } catch (err) { toast.error("Erro ao processar base de relatórios.") } finally { setLoading(false) }
  }

  const getResumoFiltros = () => {
    let ativos = []
    if (filtroStatusOs !== 'Todas') ativos.push(`OS: ${filtroStatusOs}`)
    if (filtroSetor !== 'Todos') ativos.push(`Setor: ${auxiliares.setores.find(s => String(s.id) === String(filtroSetor))?.nome}`)
    return ativos.length > 0 ? ativos.join(' | ') : 'Todas as intervenções do período'
  }

  const exportarExcel = () => {
    if (dadosBrutos.length === 0) return toast.error('Não há dados para exportar.')
    const dadosExcel = dadosBrutos.map(os => {
      let dataReferencia = formatDataSegura(os.data_abertura); let tipoData = 'Abertura'
      if (os.status?.nome === 'Concluído' && os.data_conclusao) { dataReferencia = formatDataSegura(os.data_conclusao); tipoData = 'Conclusão' } 
      else if (os.data_prevista && os.status?.nome !== 'Concluído') { dataReferencia = formatDataSegura(os.data_prevista); tipoData = 'Agendado' }
      return { 'Data': dataReferencia, 'Referência': tipoData, 'Tipo de Intervenção': os.tipo_intervencao || '-', 'Status': os.status?.nome || 'Aberto', 'Equipamento': os.equipamento?.nome || 'Excluído', 'Patrimônio': os.equipamento?.sem_patrimonio ? 'PENDENTE' : (os.equipamento?.patrimonio || '-'), 'Número de Série': os.equipamento?.numero_serie || '-', 'Registro ANVISA': os.equipamento?.registro_anvisa || '-', 'Unidade': os.equipamento?.unidade?.nome || '-', 'Setor': os.equipamento?.setor?.nome || '-', 'Descrição do Serviço': os.descricao || '-', 'Prestador': os.prestador?.nome || 'Equipe Interna', 'Solicitante': os.aberto_por?.nome || '-', 'Protocolo Externo': os.protocolo_externo || '-' }
    })
    const ws = XLSX.utils.json_to_sheet(dadosExcel, { origin: "A3" })
    XLSX.utils.sheet_add_aoa(ws, [[`RELATÓRIO DE ORDENS DE SERVIÇO - ${nomeAmbiente.toUpperCase()}`]], { origin: "A1" })
    XLSX.utils.sheet_add_aoa(ws, [[`Período: ${formatDataSegura(periodoInicial)} a ${formatDataSegura(periodoFinal)} | Total de OS: ${dadosBrutos.length}`]], { origin: "A2" })
    ws['!cols'] = [ { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 35 }, { wch: 15 }, { wch: 20 }, { wch: 18 }, { wch: 25 }, { wch: 25 }, { wch: 55 }, { wch: 25 }, { wch: 25 }, { wch: 20 } ];
    const totalColunas = Object.keys(dadosExcel[0]).length
    const ultimaColuna = XLSX.utils.encode_col(totalColunas - 1)
    ws['!autofilter'] = { ref: `A3:${ultimaColuna}${dadosExcel.length + 3}` }
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Ordens de Serviço')
    XLSX.writeFile(wb, `OS_${nomeAmbiente.replace(/\s+/g, '_')}_${periodoInicial}_a_${periodoFinal}.xlsx`)
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500">
      
      <div className="no-print bg-white p-4 sm:p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 md:mb-6">
          <div>
            <label className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1.5"><CalendarIcon size={14} /> Data Inicial</label>
            <input type="date" value={periodoInicial} onChange={e => setPeriodoInicial(e.target.value)} className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1.5"><CalendarIcon size={14} /> Data Final</label>
            <input type="date" value={periodoFinal} onChange={e => setPeriodoFinal(e.target.value)} className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1.5"><Filter size={14} /> Unidade</label>
            <select value={filtroUnidade} onChange={e => setFiltroUnidade(e.target.value)} className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
              <option value="Todas">Todas as Unidades</option>
              {auxiliares.unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1.5"><Layers size={14} /> Setor Hospitalar</label>
            <select value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)} className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
              <option value="Todos">Todos os Setores</option>
              {auxiliares.setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 md:pt-6 border-t border-slate-100">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Status da OS</label>
            <select value={filtroStatusOs} onChange={e => setFiltroStatusOs(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
              <option value="Todas">Todas as OS</option>
              <option value="Concluidos">Apenas Concluídas</option>
              <option value="Pendentes">Pendentes / Agendadas</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><AlertTriangle size={12}/> Património</label>
            <select value={filtroPatrimonio} onChange={e => setFiltroPatrimonio(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
              <option value="Todos">Indiferente</option>
              <option value="Com">Com Património</option>
              <option value="Sem">Sem Património</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Tag size={12}/> Etiqueta</label>
            <select value={filtroEtiqueta} onChange={e => setFiltroEtiqueta(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
              <option value="Todos">Indiferente</option>
              <option value="Com">Com Etiqueta</option>
              <option value="Sem">Sem Etiqueta</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Clock size={12}/> Calibração</label>
            <select disabled={isModuloTecnologia} value={filtroCalibracao} onChange={e => setFiltroCalibracao(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-50 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
              <option value="Todos">Indiferente</option>
              <option value="EmDia">Em Dia</option>
              <option value="Atrasada">Atrasada</option>
            </select>
          </div>
        </div>
      </div>

      <div id="relatorio-impresso" className="bg-white rounded-[2rem] border border-slate-200 p-4 sm:p-6 md:p-8 shadow-sm">
        
        <div className="border-b-2 border-slate-800 pb-4 md:pb-5 mb-4 md:mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">{nomeAmbiente} - Intervenções</h2>
            <p className="text-[10px] md:text-xs text-blue-700 font-black tracking-widest mt-1.5 md:mt-2 bg-blue-50 inline-block px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg border border-blue-100">FILTROS: {getResumoFiltros()}</p>
          </div>
          <div className="w-full md:w-auto flex flex-col items-end gap-3 md:gap-4">
            <button
              type="button"
              onClick={exportarExcel}
              disabled={dadosBrutos.length === 0}
              className="no-print w-full md:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-xs px-5 py-3 md:py-4 rounded-xl shadow-md transition-all active:scale-95"
            >
              <FileSpreadsheet size={16} /> Excel Padronizado
            </button>
            <div className="w-full text-xs md:text-sm text-slate-700 bg-slate-50 border border-slate-200 p-3 md:p-4 rounded-xl">
              <div><span className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Período:</span> <span className="font-bold">{formatDataSegura(periodoInicial)} a {formatDataSegura(periodoFinal)}</span></div>
              <div className="mt-1"><span className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Total OS:</span> <span className="font-bold">{dadosBrutos.length} listadas</span></div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center text-slate-400"><Loader2 className="animate-spin" size={32} /></div>
        ) : dadosBrutos.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-bold">Nenhum registo atende aos critérios deste filtro.</div>
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
                    <th className="py-4 px-4 md:px-5 text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest w-[12%]">Data / OS</th>
                    <th className="py-4 px-4 md:px-5 text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest w-[25%]">Equipamento</th>
                    <th className="py-4 px-4 md:px-5 text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest w-[45%]">Descrição Técnica</th>
                    <th className="py-4 px-4 md:px-5 text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest w-[18%]">Responsáveis</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dadosBrutos.map((os) => {
                    let tituloData = 'Aberto:'
                    let valorData = formatDataSegura(os.data_abertura)
                    let corData = 'text-slate-800'

                    if (os.status?.nome === 'Concluído' && os.data_conclusao) {
                      tituloData = 'Concluído:'
                      valorData = formatDataSegura(os.data_conclusao)
                      corData = 'text-emerald-700'
                    } else if (os.data_prevista && os.status?.nome !== 'Concluído') {
                      tituloData = 'Agendado:'
                      valorData = formatDataSegura(os.data_prevista)
                      corData = 'text-blue-700'
                    }

                    return (
                      <tr key={os.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 md:py-5 px-4 md:px-5 align-top">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{tituloData}</div>
                          <div className={`font-black text-xs md:text-sm mb-2 md:mb-3 ${corData}`}>{valorData}</div>
                          <div className={`inline-block px-2 md:px-2.5 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                            os.tipo_intervencao === 'Preventiva' ? 'bg-green-50 text-green-700 border-green-200' :
                            os.tipo_intervencao === 'Calibração' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>{os.tipo_intervencao}</div>
                          <div className={`mt-2 text-[11px] md:text-xs font-bold bg-slate-100 px-2 md:px-2.5 py-1 rounded-lg inline-block ${os.status?.nome === 'Concluído' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {os.status?.nome || 'Aberto'}
                          </div>
                        </td>
                        <td className="py-4 md:py-5 px-4 md:px-5 align-top">
                          <div className="font-black text-slate-900 text-xs md:text-sm uppercase leading-tight">{os.equipamento?.nome || 'Excluído'}</div>
                          <div className="mt-2 flex flex-col gap-1 md:gap-1.5 text-[10px] md:text-[11px] text-slate-500 font-medium">
                            <span><strong className="text-slate-400 font-black">PAT:</strong> {os.equipamento?.sem_patrimonio ? <span className="text-rose-600 font-bold bg-rose-50 px-1 rounded border border-rose-200">PENDENTE</span> : os.equipamento?.patrimonio || '-'}</span>
                            <span><strong className="text-slate-400 font-black">SÉRIE:</strong> {os.equipamento?.numero_serie || '-'}</span>
                            {moduloAtivo === 'medicos' && os.equipamento?.registro_anvisa && (
                              <span className="text-emerald-700 font-bold flex items-center gap-1 mt-1 bg-emerald-50 w-fit px-2 py-0.5 rounded"><Activity size={10} md:size={12}/> ANVISA: {os.equipamento.registro_anvisa}</span>
                            )}
                          </div>
                          <div className="mt-2 md:mt-3 text-[10px] md:text-[11px] font-bold text-blue-700 flex items-start gap-1 md:gap-1.5 bg-blue-50 px-2 py-1.5 rounded-lg border border-blue-100 w-fit">
                            <MapPin size={10} md:size={12} className="shrink-0" />
                            <span>{os.equipamento?.unidade?.nome || 'Não informada'} {os.equipamento?.setor?.nome ? `(${os.equipamento.setor.nome})` : ''}</span>
                          </div>
                        </td>
                        <td className="py-4 md:py-5 px-4 md:px-5 align-top">
                          <p className="text-[11px] md:text-xs text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3 md:p-4 rounded-xl border border-slate-100">{os.descricao || 'Sem descrição.'}</p>
                        </td>
                        <td className="py-4 md:py-5 px-4 md:px-5 align-top">
                          <div className="text-[11px] md:text-xs font-bold text-slate-800 flex items-start gap-1.5 md:gap-2 mb-2">
                            <Wrench size={12} md:size={14} className="text-slate-400 mt-0.5 shrink-0" />
                            <span className="leading-tight">{os.prestador?.nome || 'Equipe Interna'}</span>
                          </div>
                          <div className="text-[10px] md:text-[11px] text-slate-500 flex items-start gap-1.5 md:gap-2 font-medium">
                            <User size={10} md:size={12} className="text-slate-400 mt-0.5 shrink-0" />
                            <span className="leading-tight">Solicitante: <strong className="text-slate-700">{os.aberto_por?.nome || '-'}</strong></span>
                          </div>
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