import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useModulo } from '../contexts/ModuloContext' // 1. Importação do contexto
import { 
  Calendar as CalendarIcon, Filter, FileText, 
  Printer, Loader2, MapPin, Wrench, User, ArrowRightLeft,
  CheckCircle2, AlertTriangle, Tag, Clock
} from 'lucide-react'

export default function RelatoriosPage() {
  const { moduloAtivo } = useModulo() // 2. Puxando o ambiente atual
  const [loading, setLoading] = useState(false)
  const [dadosBrutos, setDadosBrutos] = useState([])
  const [auxiliares, setAuxiliares] = useState({ unidades: [] })
  
  // Datas
  const [periodoInicial, setPeriodoInicial] = useState(() => {
    const data = new Date()
    data.setDate(1) 
    return data.toISOString().split('T')[0]
  })
  const [periodoFinal, setPeriodoFinal] = useState(() => {
    const data = new Date()
    return data.toISOString().split('T')[0]
  })
  
  // Filtros Globais
  const [filtroUnidade, setFiltroUnidade] = useState('Todas')
  const [filtroStatusOs, setFiltroStatusOs] = useState('Todas') 
  const [filtroPatrimonio, setFiltroPatrimonio] = useState('Todos') 
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('Todos') 
  const [filtroCalibracao, setFiltroCalibracao] = useState('Todos') 

  useEffect(() => { carregarAuxiliares() }, [])
  
  // 3. Atualiza se o módulo ou qualquer filtro mudar (com proteção)
  useEffect(() => { 
    if (!moduloAtivo) return;
    gerarRelatorio() 
  }, [
    periodoInicial, periodoFinal, filtroUnidade, 
    filtroStatusOs, filtroPatrimonio, filtroEtiqueta, filtroCalibracao,
    moduloAtivo
  ])

  const carregarAuxiliares = async () => {
    const { data: uni } = await supabase.from('unidades').select('*').order('nome')
    if (uni) setAuxiliares({ unidades: uni })
  }

  const gerarRelatorio = async () => {
    setLoading(true)
    const fimAjustado = `${periodoFinal}T23:59:59.999Z`

    let query = supabase
      .from('chamados')
      .select(`
        id, tipo_intervencao, data_abertura, data_conclusao, data_prevista, descricao, protocolo_externo,
        status:status_id(nome),
        prestador:prestador_id(nome),
        aberto_por:aberto_por_id(nome),
        equipamento:equipamento_id(
          nome, patrimonio, numero_serie, modelo,
          possui_etiqueta, sem_patrimonio, data_proxima_calibracao, 
          unidade:unidade_id(id, nome),
          setor:setor_id(id, nome)
        )
      `)
      .eq('modulo', moduloAtivo) // 4. O segredo da separação: filtra pelo ambiente
      .gte('data_abertura', `${periodoInicial}T00:00:00.000Z`)
      .lte('data_abertura', fimAjustado)
      .order('data_abertura', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error("Erro ao buscar relatórios:", error)
      setLoading(false)
      return
    }

    let chamadosFiltrados = data || []

    // 1. Filtro Unidade 
    if (filtroUnidade !== 'Todas') {
      chamadosFiltrados = chamadosFiltrados.filter(ch => ch.equipamento?.unidade?.id === filtroUnidade)
    }

    // 2. Filtro Status OS
    if (filtroStatusOs === 'Concluidos') {
      chamadosFiltrados = chamadosFiltrados.filter(ch => ch.status?.nome === 'Concluído')
    } else if (filtroStatusOs === 'Pendentes') {
      chamadosFiltrados = chamadosFiltrados.filter(ch => ch.status?.nome !== 'Concluído')
    }

    // 3. Filtro Patrimônio
    if (filtroPatrimonio === 'Com') {
      chamadosFiltrados = chamadosFiltrados.filter(ch => ch.equipamento && !ch.equipamento.sem_patrimonio)
    } else if (filtroPatrimonio === 'Sem') {
      chamadosFiltrados = chamadosFiltrados.filter(ch => ch.equipamento && ch.equipamento.sem_patrimonio)
    }

    // 4. Filtro Etiqueta
    if (filtroEtiqueta === 'Com') {
      chamadosFiltrados = chamadosFiltrados.filter(ch => ch.equipamento && ch.equipamento.possui_etiqueta)
    } else if (filtroEtiqueta === 'Sem') {
      chamadosFiltrados = chamadosFiltrados.filter(ch => ch.equipamento && !ch.equipamento.possui_etiqueta)
    }

    // 5. Filtro Calibração
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
    setLoading(false)
  }

  const getResumoFiltros = () => {
    let ativos = []
    if (filtroStatusOs !== 'Todas') ativos.push(`Status OS: ${filtroStatusOs}`)
    if (filtroPatrimonio !== 'Todos') ativos.push(filtroPatrimonio === 'Sem' ? 'Equip. Sem Patrimônio' : 'Equip. Com Patrimônio')
    if (filtroEtiqueta !== 'Todos') ativos.push(filtroEtiqueta === 'Sem' ? 'Sem Etiqueta' : 'Com Etiqueta')
    if (filtroCalibracao !== 'Todos') ativos.push(`Prev./Calib: ${filtroCalibracao === 'Atrasada' ? 'Atrasadas' : 'Em Dia'}`)
    
    return ativos.length > 0 ? ativos.join(' | ') : 'Nenhum filtro técnico extra aplicado'
  }

  const exportarPDF = () => {
    const printContainer = document.createElement('div')
    printContainer.id = 'print-container'
    
    const relatorio = document.getElementById('relatorio-impresso').cloneNode(true)
    printContainer.appendChild(relatorio)
    document.body.appendChild(printContainer)
    window.print()
    document.body.removeChild(printContainer)
  }

  // Define o título de impressão baseado no ambiente
  const nomeAmbienteImpressao = {
    medicos: 'Engenharia Clínica',
    ti: 'Tecnologia da Informação',
    infra: 'Infraestrutura e Nobreaks',
    manutencao: 'Manutenção Predial'
  }[moduloAtivo] || 'Relatório Analítico'

  return (
    <div className="relative min-h-full font-sans pb-10 animate-in fade-in duration-500">
      
      <style>{`
        #print-container { display: none; }

        @media print {
          @page { size: A4 landscape; margin: 10mm 15mm; }
          #root, #__next { display: none !important; }
          #print-container { display: block !important; width: 100% !important; background-color: white !important; }
          #print-container #relatorio-impresso {
            width: 100% !important; max-width: 100% !important; margin: 0 !important;
            padding: 0 !important; border: none !important; box-shadow: none !important;
          }
          #print-container table { width: 100% !important; min-width: 100% !important; table-layout: fixed !important; }
          #print-container tr { page-break-inside: avoid !important; break-inside: avoid !important; }
          #print-container thead { display: table-header-group !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* CABEÇALHO E CONTROLES (Não sai no PDF) */}
      <div className="no-print mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
              <FileText className="text-blue-600" size={28} /> Relatório Analítico
            </h1>
            <p className="text-sm md:text-base text-slate-500 mt-1">Gere relatórios customizados para impressão e auditoria.</p>
          </div>
          <button 
            onClick={exportarPDF}
            disabled={loading || dadosBrutos.length === 0}
            className="w-full sm:w-auto bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 text-sm md:text-base"
          >
            <Printer size={20} />
            Imprimir / Salvar PDF
          </button>
        </div>

        {/* PAINEL DE FILTROS SUPER COMPLETO */}
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          {loading && <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex items-center justify-center font-bold text-blue-600 gap-2"><Loader2 size={20} className="animate-spin"/> Atualizando Base...</div>}
          
          {/* Linha 1: Datas e Unidade */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mb-5">
            <div>
              <label className="text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                <CalendarIcon size={14} /> Data Inicial (Abertura da OS)
              </label>
              <input type="date" value={periodoInicial} onChange={(e) => setPeriodoInicial(e.target.value)} className="w-full px-3 md:px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-medium" />
            </div>
            <div>
              <label className="text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                <CalendarIcon size={14} /> Data Final
              </label>
              <input type="date" value={periodoFinal} onChange={(e) => setPeriodoFinal(e.target.value)} className="w-full px-3 md:px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-medium" />
            </div>
            <div>
              <label className="text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                <Filter size={14} /> Unidade
              </label>
              <select value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value)} className="w-full px-3 md:px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm font-bold text-slate-700">
                <option value="Todas">Todas as Unidades</option>
                {auxiliares.unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
          </div>

          {/* Linha 2: Filtros Técnicos Específicos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Status do Serviço (OS)</label>
              <select value={filtroStatusOs} onChange={(e) => setFiltroStatusOs(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 bg-slate-50 text-xs font-bold text-slate-700">
                <option value="Todas">Todas as OS</option>
                <option value="Concluidos">Apenas Concluídas</option>
                <option value="Pendentes">Pendentes (Abertas/Agendadas)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block flex items-center gap-1"><AlertTriangle size={10}/> Patrimônio Físico</label>
              <select value={filtroPatrimonio} onChange={(e) => setFiltroPatrimonio(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 bg-slate-50 text-xs font-bold text-slate-700">
                <option value="Todos">Indiferente</option>
                <option value="Com">Equipamentos Com Patrimônio</option>
                <option value="Sem">Equipamentos Sem Patrimônio</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block flex items-center gap-1"><Tag size={10}/> Etiqueta Manutenção</label>
              <select value={filtroEtiqueta} onChange={(e) => setFiltroEtiqueta(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 bg-slate-50 text-xs font-bold text-slate-700">
                <option value="Todos">Indiferente</option>
                <option value="Com">Equipamentos Com Etiqueta</option>
                <option value="Sem">Equipamentos Sem Etiqueta</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block flex items-center gap-1"><Clock size={10}/> Data Prev. Calibração</label>
              <select value={filtroCalibracao} onChange={(e) => setFiltroCalibracao(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 bg-slate-50 text-xs font-bold text-slate-700">
                <option value="Todos">Indiferente</option>
                <option value="EmDia">Preventiva/Calib. em Dia</option>
                <option value="Atrasada">Preventiva/Calib. Atrasada</option>
              </select>
            </div>
          </div>

        </div>
      </div>

      <div className="md:hidden flex items-center justify-center gap-2 text-xs font-bold text-slate-400 mb-3 print:hidden animate-pulse">
        <ArrowRightLeft size={14} /> Arraste para os lados para ver a tabela completa
      </div>

      {/* ÁREA DE IMPRESSÃO */}
      <div id="relatorio-impresso" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 lg:p-8 overflow-hidden">
        
        <div className="border-b-2 border-slate-800 pb-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            {/* 5. NOME INTELIGENTE NO PDF */}
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">{nomeAmbienteImpressao} IOFV</h2>
            <p className="text-slate-600 font-medium mt-1 text-xs md:text-sm">Relatório Analítico Consolidado</p>
            <p className="text-[10px] md:text-xs text-blue-700 font-bold mt-2 bg-blue-50 inline-block px-2 py-1 rounded">
              Filtros: {getResumoFiltros()}
            </p>
          </div>
          <div className="w-full md:w-auto text-left md:text-right text-xs md:text-sm text-slate-700 bg-slate-50 border border-slate-200 p-3 rounded-lg">
            <div><span className="font-bold">Período:</span> {new Date(periodoInicial + 'T00:00:00').toLocaleDateString('pt-BR')} a {new Date(periodoFinal + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
            <div className="mt-1"><span className="font-bold">Unidade:</span> {filtroUnidade === 'Todas' ? 'Todas as Unidades' : auxiliares.unidades.find(u => u.id === filtroUnidade)?.nome}</div>
            <div className="mt-1"><span className="font-bold">Total Encontrado:</span> {dadosBrutos.length} OS listadas</div>
          </div>
        </div>

        <div className="w-full overflow-x-auto print:overflow-visible custom-scrollbar pb-2">
          {dadosBrutos.length === 0 ? (
            <div className="text-center py-16 text-slate-400 font-medium text-sm md:text-base">Nenhum registro atende aos critérios deste filtro.</div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px] print:min-w-full">
              <thead className="bg-slate-100 border-b border-slate-300">
                <tr>
                  <th className="py-2 px-3 md:py-3 md:px-4 text-[10px] md:text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[16%] md:w-[14%]">Data / OS</th>
                  <th className="py-2 px-3 md:py-3 md:px-4 text-[10px] md:text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[24%] md:w-[26%]">Equipamento / Status</th>
                  <th className="py-2 px-3 md:py-3 md:px-4 text-[10px] md:text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[40%]">Serviço Realizado / Descrição</th>
                  <th className="py-2 px-3 md:py-3 md:px-4 text-[10px] md:text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[20%]">Técnico / Solicitação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dadosBrutos.map((os) => {
                  
                  let tituloData = 'Aberto:'
                  let valorData = new Date(os.data_abertura).toLocaleDateString('pt-BR')
                  let corData = 'text-slate-800'

                  if (os.status?.nome === 'Concluído' && os.data_conclusao) {
                    tituloData = 'Concluído:'
                    valorData = new Date(os.data_conclusao).toLocaleDateString('pt-BR')
                    corData = 'text-emerald-700'
                  } else if (os.data_prevista && os.status?.nome !== 'Concluído') {
                    tituloData = 'Agendado:'
                    valorData = new Date(os.data_prevista).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                    corData = 'text-blue-700'
                  }

                  return (
                    <tr key={os.id} className="hover:bg-slate-50 transition-colors">
                      
                      {/* COLUNA 1: DATAS E STATUS */}
                      <td className="py-3 px-3 md:py-4 md:px-4 align-top">
                        <div className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{tituloData}</div>
                        <div className={`font-bold text-xs md:text-sm mb-2 ${corData}`}>{valorData}</div>
                        
                        <div className={`inline-block px-1.5 md:px-2 py-0.5 rounded text-[9px] md:text-[10px] font-bold uppercase tracking-wider border ${
                          os.tipo_intervencao === 'Preventiva' ? 'bg-green-50 text-green-700 border-green-200' :
                          os.tipo_intervencao === 'Calibração' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          os.tipo_intervencao === 'Qualificação' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {os.tipo_intervencao}
                        </div>

                        <div className={`mt-1.5 text-[10px] md:text-xs font-bold ${os.status?.nome === 'Concluído' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {os.status?.nome || 'Aberto'}
                        </div>
                      </td>
                      
                      {/* COLUNA 2: EQUIPAMENTO, UNIDADE E SETOR */}
                      <td className="py-3 px-3 md:py-4 md:px-4 align-top">
                        <div className="font-black text-slate-900 text-xs md:text-sm uppercase leading-tight">{os.equipamento?.nome || 'Excluído'}</div>
                        <div className="mt-1 flex flex-col gap-0.5 text-[10px] md:text-[11px] text-slate-500">
                          <span>
                            <strong className="text-slate-400">PAT:</strong> {' '}
                            {os.equipamento?.sem_patrimonio ? (
                              <span className="text-rose-600 font-bold bg-rose-50 px-1 rounded inline-block">PENDENTE</span>
                            ) : (
                              os.equipamento?.patrimonio || '-'
                            )}
                          </span>
                          <span><strong className="text-slate-400">SÉRIE:</strong> {os.equipamento?.numero_serie || '-'}</span>
                        </div>
                        
                        <div className="mt-1.5 md:mt-2 text-[10px] md:text-xs font-bold text-blue-600 flex items-start gap-1">
                          <MapPin size={10} className="md:w-3 md:h-3 mt-0.5 shrink-0" /> 
                          <span className="leading-tight">
                            {os.equipamento?.unidade?.nome || 'Unidade não informada'} 
                            {os.equipamento?.setor?.nome ? ` (${os.equipamento.setor.nome})` : ''}
                          </span>
                        </div>

                        {os.equipamento && !os.equipamento.possui_etiqueta && (
                          <div className="mt-1.5 text-[9px] text-amber-700 font-bold bg-amber-50 inline-block px-1.5 py-0.5 rounded border border-amber-200">
                            Sem Etiqueta
                          </div>
                        )}
                      </td>

                      {/* COLUNA 3: RELATO TÉCNICO */}
                      <td className="py-3 px-3 md:py-4 md:px-4 align-top">
                        <p className="text-xs md:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {os.descricao || '-'}
                        </p>
                      </td>

                      {/* COLUNA 4: RESPONSÁVEIS */}
                      <td className="py-3 px-3 md:py-4 md:px-4 align-top">
                        <div className="text-xs md:text-sm font-bold text-slate-800 flex items-start gap-1.5 mb-1.5">
                          <Wrench size={12} className="text-slate-400 mt-0.5 shrink-0 md:w-3.5 md:h-3.5" /> 
                          <span className="leading-tight">{os.prestador?.nome || 'Equipe Interna'}</span>
                        </div>
                        <div className="text-[10px] md:text-xs text-slate-500 flex items-start gap-1.5">
                          <User size={10} className="text-slate-400 mt-0.5 shrink-0 md:w-3 md:h-3" /> 
                          <span className="leading-tight">Solicitante: {os.aberto_por?.nome || '-'}</span>
                        </div>
                        {os.protocolo_externo && (
                          <div className="mt-2 text-[9px] md:text-[11px] text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 md:px-2 md:py-1 rounded inline-block">
                            <strong>OS Ext:</strong> {os.protocolo_externo}
                          </div>
                        )}
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}