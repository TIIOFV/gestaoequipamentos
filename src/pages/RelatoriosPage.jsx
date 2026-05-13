import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Calendar as CalendarIcon, Filter, FileText, 
  Printer, Loader2, MapPin, Wrench, User, ArrowRightLeft
} from 'lucide-react'

export default function RelatoriosPage() {
  const [loading, setLoading] = useState(false)
  const [dadosBrutos, setDadosBrutos] = useState([])
  const [auxiliares, setAuxiliares] = useState({ unidades: [] })
  
  const [periodoInicial, setPeriodoInicial] = useState(() => {
    const data = new Date()
    data.setDate(1) 
    return data.toISOString().split('T')[0]
  })
  const [periodoFinal, setPeriodoFinal] = useState(() => {
    const data = new Date()
    return data.toISOString().split('T')[0]
  })
  const [filtroUnidade, setFiltroUnidade] = useState('Todas')

  useEffect(() => { carregarAuxiliares() }, [])
  useEffect(() => { gerarRelatorio() }, [periodoInicial, periodoFinal, filtroUnidade])

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
        equipamento:equipamento_id(nome, patrimonio, numero_serie, modelo, unidade_id, setor:setor_id(nome))
      `)
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
    if (filtroUnidade !== 'Todas') {
      chamadosFiltrados = chamadosFiltrados.filter(ch => ch.equipamento?.unidade_id === filtroUnidade)
    }

    setDadosBrutos(chamadosFiltrados)
    setLoading(false)
  }

  // --- O SEGREDO DO PDF PERFEITO ---
  const exportarPDF = () => {
    const printContainer = document.createElement('div')
    printContainer.id = 'print-container'
    
    const relatorio = document.getElementById('relatorio-impresso').cloneNode(true)
    printContainer.appendChild(relatorio)
    
    document.body.appendChild(printContainer)
    
    window.print()
    
    document.body.removeChild(printContainer)
  }

  return (
    <div className="relative min-h-full font-sans pb-10 animate-in fade-in duration-500">
      
      {/* CSS MAGNÍFICO PARA IMPRESSÃO ISOLADA */}
      <style>{`
        #print-container { display: none; }

        @media print {
          @page { 
            size: A4 landscape;
            margin: 10mm 15mm; 
          }
          
          #root, #__next { display: none !important; }
          
          #print-container { 
            display: block !important; 
            width: 100% !important;
            background-color: white !important;
          }

          #print-container #relatorio-impresso {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }

          #print-container table { 
            width: 100% !important; 
            min-width: 100% !important;
            table-layout: fixed !important;
          }
          #print-container tr { 
            page-break-inside: avoid !important;
            break-inside: avoid !important; 
          }
          #print-container thead { display: table-header-group !important; }
          
          * { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
        }
      `}</style>

      {/* CABEÇALHO DA PÁGINA (Não sai no PDF) */}
      <div className="no-print mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
              <FileText className="text-blue-600" size={28} /> Relatório Analítico
            </h1>
            <p className="text-sm md:text-base text-slate-500 mt-1">Histórico detalhado de serviços para impressão e exportação.</p>
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

        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4 md:gap-5 items-end relative overflow-hidden">
          {loading && <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex items-center justify-center font-bold text-blue-600 gap-2"><Loader2 size={20} className="animate-spin"/> Atualizando...</div>}
          
          <div className="w-full lg:w-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <div>
              <label className="text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                <CalendarIcon size={14} /> Data Inicial
              </label>
              <input type="date" value={periodoInicial} onChange={(e) => setPeriodoInicial(e.target.value)} className="w-full px-3 md:px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-medium" />
            </div>
            <div>
              <label className="text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                <CalendarIcon size={14} /> Data Final
              </label>
              <input type="date" value={periodoFinal} onChange={(e) => setPeriodoFinal(e.target.value)} className="w-full px-3 md:px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-medium" />
            </div>
          </div>
          <div className="w-full lg:w-1/3">
            <label className="text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
              <Filter size={14} /> Filtrar Unidade
            </label>
            <select value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value)} className="w-full px-3 md:px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm font-medium">
              <option value="Todas">Todas as Unidades</option>
              {auxiliares.unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* DICA DE UX PARA MOBILE (Escondida no PC e na Impressão) */}
      <div className="md:hidden flex items-center justify-center gap-2 text-xs font-bold text-slate-400 mb-3 print:hidden animate-pulse">
        <ArrowRightLeft size={14} /> Arraste para os lados para ver a tabela completa
      </div>

      {/* ÁREA DE IMPRESSÃO - Esta é a div clonada para virar PDF */}
      <div id="relatorio-impresso" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 lg:p-8 overflow-hidden">
        
        <div className="border-b-2 border-slate-800 pb-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">Engenharia Clínica IOFV</h2>
            <p className="text-slate-600 font-medium mt-1 text-xs md:text-sm">Relatório Analítico de Ordens de Serviço</p>
          </div>
          <div className="w-full md:w-auto text-left md:text-right text-xs md:text-sm text-slate-700 bg-slate-50 border border-slate-200 p-3 rounded-lg">
            <div><span className="font-bold">Período:</span> {new Date(periodoInicial + 'T00:00:00').toLocaleDateString('pt-BR')} a {new Date(periodoFinal + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
            <div className="mt-1"><span className="font-bold">Unidade:</span> {filtroUnidade === 'Todas' ? 'Múltiplas Unidades' : auxiliares.unidades.find(u => u.id === filtroUnidade)?.nome}</div>
            <div className="mt-1"><span className="font-bold">Total de Registros:</span> {dadosBrutos.length} OS listadas</div>
          </div>
        </div>

        {/* CONTAINER COM SCROLL NO MOBILE */}
        <div className="w-full overflow-x-auto print:overflow-visible custom-scrollbar pb-2">
          {dadosBrutos.length === 0 ? (
            <div className="text-center py-16 text-slate-400 font-medium text-sm md:text-base">Nenhum registro encontrado para este filtro.</div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px] print:min-w-full">
              <thead className="bg-slate-100 border-b border-slate-300">
                <tr>
                  <th className="py-2 px-3 md:py-3 md:px-4 text-[10px] md:text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[16%] md:w-[14%]">Data / OS</th>
                  <th className="py-2 px-3 md:py-3 md:px-4 text-[10px] md:text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[24%] md:w-[26%]">Equipamento</th>
                  <th className="py-2 px-3 md:py-3 md:px-4 text-[10px] md:text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[40%]">Serviço Realizado</th>
                  <th className="py-2 px-3 md:py-3 md:px-4 text-[10px] md:text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[20%]">Técnico / Solicitação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dadosBrutos.map((os) => {
                  
                  // Lógica Dinâmica para a Data e Status
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
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {os.tipo_intervencao}
                        </div>

                        <div className={`mt-1.5 text-[10px] md:text-xs font-bold ${os.status?.nome === 'Concluído' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {os.status?.nome || 'Aberto'}
                        </div>
                      </td>
                      
                      {/* COLUNA 2: EQUIPAMENTO */}
                      <td className="py-3 px-3 md:py-4 md:px-4 align-top">
                        <div className="font-black text-slate-900 text-xs md:text-sm uppercase leading-tight">{os.equipamento?.nome || 'Excluído'}</div>
                        <div className="mt-1 flex flex-col gap-0.5 text-[10px] md:text-[11px] text-slate-500">
                          <span><strong className="text-slate-400">PAT:</strong> {os.equipamento?.patrimonio || '-'}</span>
                          <span><strong className="text-slate-400">SÉRIE:</strong> {os.equipamento?.numero_serie || '-'}</span>
                        </div>
                        <div className="mt-1.5 md:mt-2 text-[10px] md:text-xs font-bold text-blue-600 flex items-center gap-1">
                          <MapPin size={10} className="md:w-3 md:h-3" /> {os.equipamento?.setor?.nome || 'Setor não informado'}
                        </div>
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