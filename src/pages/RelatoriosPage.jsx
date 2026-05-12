import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Calendar as CalendarIcon, Filter, FileText, 
  Printer, Loader2, MapPin, Wrench, User
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
  // Clonamos o relatório para FORA do layout do sistema, imprimimos limpo, e apagamos.
  const exportarPDF = () => {
    const printContainer = document.createElement('div')
    printContainer.id = 'print-container'
    
    // Pega apenas a área do relatório e faz um "clone"
    const relatorio = document.getElementById('relatorio-impresso').cloneNode(true)
    printContainer.appendChild(relatorio)
    
    // Adiciona o clone direto no Body (Livre do Menu Lateral)
    document.body.appendChild(printContainer)
    
    // Abre a tela de impressão
    window.print()
    
    // Após fechar a tela, limpa o clone da memória
    document.body.removeChild(printContainer)
  }

  return (
    <div className="relative min-h-full font-sans pb-10 animate-in fade-in duration-500">
      
      {/* CSS MAGNÍFICO PARA IMPRESSÃO ISOLADA */}
      <style>{`
        /* Esconde o clone de impressão do uso normal do usuário */
        #print-container { display: none; }

        @media print {
          @page { 
            size: A4 landscape; /* Folha Deitada */
            margin: 10mm 15mm; 
          }
          
          /* Esconde todo o layout original da sua aplicação (Menu, NavBar, etc) */
          #root, #__next { display: none !important; }
          
          /* Exibe APENAS a nossa folha clonada e limpa */
          #print-container { 
            display: block !important; 
            width: 100% !important;
            background-color: white !important;
          }

          /* Tira sombras e bordas do card na hora do papel */
          #print-container #relatorio-impresso {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }

          /* Força a Tabela a não quebrar no meio e repetir o cabeçalho */
          #print-container table { 
            width: 100% !important; 
            min-width: 100% !important;
            table-layout: fixed !important;
          }
          #print-container tr { 
            page-break-inside: avoid !important; /* Tesoura não corta as letras */
            break-inside: avoid !important; 
          }
          #print-container thead { display: table-header-group !important; }
          
          /* Mantém as cores (como o verde do Preventiva) ativas no papel */
          * { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
        }
      `}</style>

      {/* CABEÇALHO DA PÁGINA (Não sai no PDF) */}
      <div className="no-print mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <FileText className="text-blue-600" size={32} /> Relatório Analítico
            </h1>
            <p className="text-slate-500 mt-1">Histórico detalhado de serviços para impressão e exportação.</p>
          </div>
          <button 
            onClick={exportarPDF}
            disabled={loading || dadosBrutos.length === 0}
            className="bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-70"
          >
            <Printer size={20} />
            Imprimir / Salvar PDF
          </button>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-5 items-end relative overflow-hidden">
          {loading && <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex items-center justify-center font-bold text-blue-600 gap-2"><Loader2 size={20} className="animate-spin"/> Atualizando...</div>}
          
          <div className="w-full lg:w-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div><label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2"><CalendarIcon size={14} /> Data Inicial</label><input type="date" value={periodoInicial} onChange={(e) => setPeriodoInicial(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-medium" /></div>
            <div><label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2"><CalendarIcon size={14} /> Data Final</label><input type="date" value={periodoFinal} onChange={(e) => setPeriodoFinal(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-medium" /></div>
          </div>
          <div className="w-full lg:w-1/3">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2"><Filter size={14} /> Filtrar Unidade</label>
            <select value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm font-medium">
              <option value="Todas">Todas as Unidades</option>
              {auxiliares.unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ÁREA DE IMPRESSÃO - Esta é a div clonada para virar PDF */}
      <div id="relatorio-impresso" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
        
        <div className="border-b-2 border-slate-800 pb-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Engenharia Clínica IOFV</h2>
            <p className="text-slate-600 font-medium mt-1 text-sm">Relatório Analítico de Ordens de Serviço</p>
          </div>
          <div className="text-left md:text-right text-sm text-slate-700 bg-slate-50 border border-slate-200 p-3 rounded-lg">
            <div><span className="font-bold">Período Selecionado:</span> {new Date(periodoInicial + 'T00:00:00').toLocaleDateString('pt-BR')} a {new Date(periodoFinal + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
            <div className="mt-1"><span className="font-bold">Unidade:</span> {filtroUnidade === 'Todas' ? 'Múltiplas Unidades' : auxiliares.unidades.find(u => u.id === filtroUnidade)?.nome}</div>
            <div className="mt-1"><span className="font-bold">Total de Registros:</span> {dadosBrutos.length} OS listadas</div>
          </div>
        </div>

        <div className="w-full overflow-x-auto print:overflow-visible">
          {dadosBrutos.length === 0 ? (
            <div className="text-center py-16 text-slate-400 font-medium">Nenhum registro encontrado para este filtro.</div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px] print:min-w-full">
              <thead className="bg-slate-100 border-b border-slate-300">
                <tr>
                  <th className="py-3 px-4 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[14%]">Data / OS</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[26%]">Equipamento</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[40%]">Serviço Realizado</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[20%]">Técnico / Solicitação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dadosBrutos.map((os) => {
                  
                  // Lógica Dinâmica para a Data e Status (Aberto, Agendado ou Concluído)
                  let tituloData = 'Aberto:'
                  let valorData = new Date(os.data_abertura).toLocaleDateString('pt-BR')
                  let corData = 'text-slate-800'

                  if (os.status?.nome === 'Concluído' && os.data_conclusao) {
                    tituloData = 'Concluído:'
                    valorData = new Date(os.data_conclusao).toLocaleDateString('pt-BR')
                    corData = 'text-emerald-700'
                  } else if (os.data_prevista && os.status?.nome !== 'Concluído') {
                    tituloData = 'Agendado:'
                    valorData = new Date(os.data_prevista).toLocaleDateString('pt-BR')
                    corData = 'text-blue-700'
                  }

                  return (
                    <tr key={os.id} className="hover:bg-slate-50">
                      
                      {/* COLUNA 1: DATAS E STATUS */}
                      <td className="py-4 px-4 align-top">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{tituloData}</div>
                        <div className={`font-bold text-sm mb-2 ${corData}`}>{valorData}</div>
                        
                        <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          os.tipo_intervencao === 'Preventiva' ? 'bg-green-50 text-green-700 border-green-200' :
                          os.tipo_intervencao === 'Calibração' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {os.tipo_intervencao}
                        </div>

                        <div className={`mt-1.5 text-xs font-bold ${os.status?.nome === 'Concluído' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {os.status?.nome || 'Aberto'}
                        </div>
                      </td>
                      
                      {/* COLUNA 2: EQUIPAMENTO */}
                      <td className="py-4 px-4 align-top">
                        <div className="font-black text-slate-900 text-sm uppercase">{os.equipamento?.nome || 'Excluído'}</div>
                        <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-slate-500">
                          <span><strong className="text-slate-400">PAT:</strong> {os.equipamento?.patrimonio || '-'}</span>
                          <span><strong className="text-slate-400">SÉRIE:</strong> {os.equipamento?.numero_serie || '-'}</span>
                        </div>
                        <div className="mt-2 text-xs font-bold text-blue-600 flex items-center gap-1">
                          <MapPin size={12} /> {os.equipamento?.setor?.nome || 'Setor não informado'}
                        </div>
                      </td>

                      {/* COLUNA 3: RELATO TÉCNICO */}
                      <td className="py-4 px-4 align-top">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {os.descricao || '-'}
                        </p>
                      </td>

                      {/* COLUNA 4: RESPONSÁVEIS */}
                      <td className="py-4 px-4 align-top">
                        <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                          <Wrench size={14} className="text-slate-400" /> {os.prestador?.nome || 'Equipe Interna'}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                          <User size={12} className="text-slate-400" /> Solicitante: {os.aberto_por?.nome || '-'}
                        </div>
                        {os.protocolo_externo && (
                          <div className="mt-2 text-[11px] text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded inline-block">
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