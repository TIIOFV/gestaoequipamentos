import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { 
  Calendar as CalendarIcon, Filter, Layers, AlertTriangle, 
  Tag, Clock, MapPin, Wrench, User, Activity, Loader2, FileSpreadsheet
} from 'lucide-react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

// Função auxiliar à prova de bugs de fuso horário
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
  
  // Estados dos Filtros
  const [periodoInicial, setPeriodoInicial] = useState(() => {
    const data = new Date()
    data.setDate(1) 
    return data.toISOString().split('T')[0]
  })
  const [periodoFinal, setPeriodoFinal] = useState(() => new Date().toISOString().split('T')[0])
  
  const [filtroUnidade, setFiltroUnidade] = useState('Todas')
  const [filtroSetor, setFiltroSetor] = useState('Todos')
  const [filtroStatusOs, setFiltroStatusOs] = useState('Todas') 
  const [filtroPatrimonio, setFiltroPatrimonio] = useState('Todos') 
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('Todos') 
  const [filtroCalibracao, setFiltroCalibracao] = useState('Todos')

  useEffect(() => { 
    if (moduloAtivo) carregarAuxiliares() 
  }, [moduloAtivo])
  
  useEffect(() => { 
    if (moduloAtivo) gerarRelatorio() 
  }, [
    periodoInicial, periodoFinal, filtroUnidade, filtroSetor,
    filtroStatusOs, filtroPatrimonio, filtroEtiqueta, filtroCalibracao,
    moduloAtivo
  ])

  useEffect(() => {
    setBloquearImpressao(dadosBrutos.length === 0)
  }, [dadosBrutos, setBloquearImpressao])

  const carregarAuxiliares = async () => {
    const [uni, set] = await Promise.all([
      supabase.from('unidades').select('*').order('nome'),
      supabase.from('setores').select('*').order('nome')
    ])
    setAuxiliares({ unidades: uni.data || [], setores: set.data || [] })
  }

  const gerarRelatorio = async () => {
    setLoading(true)
    const fimAjustado = `${periodoFinal}T23:59:59.999Z`

    try {
      let query = supabase
        .from('chamados')
        .select(`
          id, tipo_intervencao, data_abertura, data_conclusao, data_prevista, descricao, protocolo_externo,
          status:status_id(nome),
          prestador:prestador_id(nome),
          aberto_por:aberto_por_id(nome),
          equipamento:equipamento_id(
            nome, patrimonio, numero_serie, modelo, registro_anvisa,
            possui_etiqueta, sem_patrimonio, data_proxima_calibracao, 
            unidade:unidade_id(id, nome),
            setor:setor_id(id, nome)
          )
        `)
        .eq('modulo', moduloAtivo)
        .gte('data_abertura', `${periodoInicial}T00:00:00.000Z`)
        .lte('data_abertura', fimAjustado)
        .order('data_abertura', { ascending: false })

      const { data, error } = await query
      if (error) throw error

      let chamadosFiltrados = data || []

      // FILTROS BLINDADOS (Com conversão de String)
      if (filtroUnidade !== 'Todas') {
        chamadosFiltrados = chamadosFiltrados.filter(ch => String(ch.equipamento?.unidade?.id) === String(filtroUnidade))
      }
      if (filtroSetor !== 'Todos') {
        chamadosFiltrados = chamadosFiltrados.filter(ch => String(ch.equipamento?.setor?.id) === String(filtroSetor))
      }
      
      // FILTRO STATUS OS BLINDADO
      if (filtroStatusOs === 'Concluidos') {
        chamadosFiltrados = chamadosFiltrados.filter(ch => ch.status?.nome?.toLowerCase().trim() === 'concluído')
      } else if (filtroStatusOs === 'Pendentes') {
        chamadosFiltrados = chamadosFiltrados.filter(ch => ch.status?.nome?.toLowerCase().trim() !== 'concluído')
      }
      
      // Filtros Booleanos
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
    } catch (err) {
      toast.error("Erro ao processar base de relatórios.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Blindado o find para não quebrar a exibição no cabeçalho
  const getResumoFiltros = () => {
    let ativos = []
    if (filtroStatusOs !== 'Todas') ativos.push(`OS: ${filtroStatusOs}`)
    if (filtroSetor !== 'Todos') ativos.push(`Setor: ${auxiliares.setores.find(s => String(s.id) === String(filtroSetor))?.nome}`)
    return ativos.length > 0 ? ativos.join(' | ') : 'Todas as intervenções do período'
  }

  const exportarExcel = () => {
    if (dadosBrutos.length === 0) {
      toast.error('Não há dados para exportar.')
      return
    }

    const dadosExcel = dadosBrutos.map(os => {
      let dataReferencia = formatDataSegura(os.data_abertura)
      let tipoData = 'Abertura'
      if (os.status?.nome === 'Concluído' && os.data_conclusao) {
        dataReferencia = formatDataSegura(os.data_conclusao)
        tipoData = 'Conclusão'
      } else if (os.data_prevista && os.status?.nome !== 'Concluído') {
        dataReferencia = formatDataSegura(os.data_prevista)
        tipoData = 'Agendado'
      }

      return {
        'Data': dataReferencia,
        'Referência': tipoData,
        'Tipo de Intervenção': os.tipo_intervencao || '-',
        'Status': os.status?.nome || 'Aberto',
        'Equipamento': os.equipamento?.nome || 'Excluído',
        'Patrimônio': os.equipamento?.sem_patrimonio ? 'PENDENTE' : (os.equipamento?.patrimonio || '-'),
        'Número de Série': os.equipamento?.numero_serie || '-',
        'Registro ANVISA': os.equipamento?.registro_anvisa || '-',
        'Unidade': os.equipamento?.unidade?.nome || '-',
        'Setor': os.equipamento?.setor?.nome || '-',
        'Descrição do Serviço': os.descricao || '-',
        'Prestador': os.prestador?.nome || 'Equipe Interna',
        'Solicitante': os.aberto_por?.nome || '-',
        'Protocolo Externo': os.protocolo_externo || '-'
      }
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

    const nomeArquivo = `OS_${nomeAmbiente.replace(/\s+/g, '_')}_${periodoInicial}_a_${periodoFinal}.xlsx`
    XLSX.writeFile(wb, nomeArquivo)
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* AREA DE FILTROS (Visual Modernizado e Alinhado) */}
      <div className="no-print bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 mb-5">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-1.5"><CalendarIcon size={14} /> Data Inicial</label>
            <input type="date" value={periodoInicial} onChange={e => setPeriodoInicial(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-1.5"><CalendarIcon size={14} /> Data Final</label>
            <input type="date" value={periodoFinal} onChange={e => setPeriodoFinal(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-1.5"><Filter size={14} /> Unidade</label>
            <select value={filtroUnidade} onChange={e => setFiltroUnidade(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="Todas">Todas as Unidades</option>
              {auxiliares.unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-1.5"><Layers size={14} /> Setor Hospitalar</label>
            <select value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="Todos">Todos os Setores</option>
              {auxiliares.setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-5 border-t border-slate-100">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Status da OS</label>
            <select value={filtroStatusOs} onChange={e => setFiltroStatusOs(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="Todas">Todas as OS</option>
              <option value="Concluidos">Apenas Concluídas</option>
              <option value="Pendentes">Pendentes / Agendadas</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1"><AlertTriangle size={10}/> Patrimônio</label>
            <select value={filtroPatrimonio} onChange={e => setFiltroPatrimonio(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="Todos">Indiferente</option>
              <option value="Com">Com Patrimônio</option>
              <option value="Sem">Sem Patrimônio</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1"><Tag size={10}/> Etiqueta</label>
            <select value={filtroEtiqueta} onChange={e => setFiltroEtiqueta(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="Todos">Indiferente</option>
              <option value="Com">Com Etiqueta</option>
              <option value="Sem">Sem Etiqueta</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1"><Clock size={10}/> Calibração</label>
            <select disabled={isModuloTecnologia} value={filtroCalibracao} onChange={e => setFiltroCalibracao(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-50 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="Todos">Indiferente</option>
              <option value="EmDia">Em Dia</option>
              <option value="Atrasada">Atrasada</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABELA DE IMPRESSÃO (O que vai pro PDF) */}
      <div id="relatorio-impresso" className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 lg:p-8 shadow-sm">
        
        <div className="border-b-2 border-slate-800 pb-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">{nomeAmbiente} - Relatório de Intervenções</h2>
            <p className="text-[10px] md:text-xs text-blue-700 font-bold mt-2 bg-blue-50 inline-block px-2 py-1 rounded">Filtros Ativos: {getResumoFiltros()}</p>
          </div>
          <div className="w-full md:w-auto flex flex-col items-end gap-3">
            <button
              type="button"
              onClick={exportarExcel}
              disabled={dadosBrutos.length === 0}
              className="no-print flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95"
            >
              <FileSpreadsheet size={16} /> Excel
            </button>
            <div className="w-full text-xs md:text-sm text-slate-700 bg-slate-50 border border-slate-200 p-3 rounded-lg">
              <div><span className="font-bold">Período:</span> {formatDataSegura(periodoInicial)} a {formatDataSegura(periodoFinal)}</div>
              <div className="mt-1"><span className="font-bold">Setor Gerado:</span> {filtroSetor === 'Todos' ? 'Todos os Setores' : auxiliares.setores.find(s => String(s.id) === String(filtroSetor))?.nome}</div>
              <div className="mt-1"><span className="font-bold">Quantidade de OS:</span> {dadosBrutos.length} listadas</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center text-slate-400"><Loader2 className="animate-spin" size={32} /></div>
        ) : dadosBrutos.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-medium">Nenhum registro atende aos critérios deste filtro.</div>
        ) : (
          <div className="w-full overflow-x-auto print:overflow-visible">
            <table className="w-full text-left border-collapse min-w-[800px] print:min-w-full">
              <thead className="bg-slate-50 border-y border-slate-200">
                  <tr>
                  <th className="py-3 px-4 text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[12%]">Data / OS</th>
                  <th className="py-3 px-4 text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[25%]">Equipamento / Identificação</th>
                  <th className="py-3 px-4 text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[45%]">Descrição Técnica do Serviço</th>
                  <th className="py-3 px-4 text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[18%]">Responsáveis</th>
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
                    <tr key={os.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 align-top">
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">{tituloData}</div>
                        <div className={`font-bold text-sm mb-2 ${corData}`}>{valorData}</div>
                        <div className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          os.tipo_intervencao === 'Preventiva' ? 'bg-green-50 text-green-700 border-green-200' :
                          os.tipo_intervencao === 'Calibração' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>{os.tipo_intervencao}</div>
                        <div className={`mt-1.5 text-xs font-bold ${os.status?.nome === 'Concluído' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {os.status?.nome || 'Aberto'}
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <div className="font-black text-slate-900 text-xs md:text-sm uppercase leading-tight">{os.equipamento?.nome || 'Excluído'}</div>
                        <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-slate-500">
                          <span><strong className="text-slate-400">PAT:</strong> {os.equipamento?.sem_patrimonio ? <span className="text-rose-600 font-bold bg-rose-50 px-1 rounded">PENDENTE</span> : os.equipamento?.patrimonio || '-'}</span>
                          <span><strong className="text-slate-400">SÉRIE:</strong> {os.equipamento?.numero_serie || '-'}</span>
                          {moduloAtivo === 'medicos' && os.equipamento?.registro_anvisa && (
                            <span className="text-emerald-700 font-bold flex items-center gap-0.5 mt-0.5"><Activity size={10}/> ANVISA: {os.equipamento.registro_anvisa}</span>
                          )}
                        </div>
                        <div className="mt-1.5 text-[11px] font-bold text-blue-600 flex items-start gap-1">
                          <MapPin size={10} className="mt-0.5 shrink-0" />
                          <span>{os.equipamento?.unidade?.nome || 'Não informada'} {os.equipamento?.setor?.nome ? `(${os.equipamento.setor.nome})` : ''}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <p className="text-xs md:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{os.descricao || '-'}</p>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <div className="text-xs md:text-sm font-bold text-slate-800 flex items-start gap-1.5 mb-1.5">
                          <Wrench size={12} className="text-slate-400 mt-0.5 shrink-0" />
                          <span className="leading-tight">{os.prestador?.nome || 'Equipe Interna'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-start gap-1.5">
                          <User size={10} className="text-slate-400 mt-0.5 shrink-0" />
                          <span className="leading-tight">Solicitante: {os.aberto_por?.nome || '-'}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}