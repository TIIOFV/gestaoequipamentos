import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useModulo } from '../../contexts/ModuloContext'
import { FileText, Printer, Loader2, ArrowRightLeft } from 'lucide-react'
import toast from 'react-hot-toast'

// COMPONENTES ISOLADOS
import FiltrosRelatorio from './components/FiltrosRelatorio'
import TabelaRelatorio from './components/TabelaRelatorio'

export default function RelatoriosPage() {
  const { moduloAtivo } = useModulo()
  const [loading, setLoading] = useState(false)
  const [dadosBrutos, setDadosBrutos] = useState([])
  const [auxiliares, setAuxiliares] = useState({ unidades: [], setores: [] })
  
  // Datas base
  const [periodoInicial, setPeriodoInicial] = useState(() => {
    const data = new Date()
    data.setDate(1) 
    return data.toISOString().split('T')[0]
  })
  const [periodoFinal, setPeriodoFinal] = useState(() => new Date().toISOString().split('T')[0])
  
  // Estados dos Filtros
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
    if (!moduloAtivo) return;
    gerarRelatorio() 
  }, [
    periodoInicial, periodoFinal, filtroUnidade, filtroSetor,
    filtroStatusOs, filtroPatrimonio, filtroEtiqueta, filtroCalibracao,
    moduloAtivo
  ])

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

      // 1. Filtro Unidade 
      if (filtroUnidade !== 'Todas') {
        chamadosFiltrados = chamadosFiltrados.filter(ch => ch.equipamento?.unidade?.id === filtroUnidade)
      }

      // 2. Filtro Setor
      if (filtroSetor !== 'Todos') {
        chamadosFiltrados = chamadosFiltrados.filter(ch => ch.equipamento?.setor?.id === filtroSetor)
      }

      // 3. Filtro Status OS
      if (filtroStatusOs === 'Concluidos') {
        chamadosFiltrados = chamadosFiltrados.filter(ch => ch.status?.nome === 'Concluído')
      } else if (filtroStatusOs === 'Pendentes') {
        chamadosFiltrados = chamadosFiltrados.filter(ch => ch.status?.nome !== 'Concluído')
      }

      // 4. Filtro Patrimônio
      if (filtroPatrimonio === 'Com') {
        chamadosFiltrados = chamadosFiltrados.filter(ch => ch.equipamento && !ch.equipamento.sem_patrimonio)
      } else if (filtroPatrimonio === 'Sem') {
        chamadosFiltrados = chamadosFiltrados.filter(ch => ch.equipamento && ch.equipamento.sem_patrimonio)
      }

      // 5. Filtro Etiqueta
      if (filtroEtiqueta === 'Com') {
        chamadosFiltrados = chamadosFiltrados.filter(ch => ch.equipamento && ch.equipamento.possui_etiqueta)
      } else if (filtroEtiqueta === 'Sem') {
        chamadosFiltrados = chamadosFiltrados.filter(ch => ch.equipamento && !ch.equipamento.possui_etiqueta)
      }

      // 6. Filtro Calibração
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
      console.error("Erro interno ao gerar relatório:", err)
      toast.error("Erro ao processar base de relatórios.")
    } finally {
      setLoading(false)
    }
  }

  const getResumoFiltros = () => {
    let ativos = []
    if (filtroStatusOs !== 'Todas') ativos.push(`Status: ${filtroStatusOs}`)
    if (filtroSetor !== 'Todos') ativos.push(`Setor: ${auxiliares.setores.find(s => s.id === filtroSetor)?.nome}`)
    if (filtroPatrimonio !== 'Todos') ativos.push(filtroPatrimonio === 'Sem' ? 'Falta Patrimônio' : 'Com Pat.')
    return ativos.length > 0 ? ativos.join(' | ') : 'Todos os registros técnicos do período'
  }

  const nomeAmbienteImpressao = {
    medicos: 'Engenharia Clínica',
    ti: 'Tecnologia da Informação',
    infra: 'Infraestrutura e Nobreaks',
    manutencao: 'Manutenção Predial'
  }[moduloAtivo] || 'Relatório Analítico'

  const filtrosTexto = {
    periodo: `${new Date(periodoInicial + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(periodoFinal + 'T00:00:00').toLocaleDateString('pt-BR')}`,
    setor: filtroSetor === 'Todos' ? 'Todos os Setores Hospitalares' : auxiliares.setores.find(s => s.id === filtroSetor)?.nome
  }

  return (
    <div className="relative min-h-full font-sans pb-10 animate-in fade-in duration-500">
      
      <style>{`
        @media print {
          /* 1. Oculta rigidamente os elementos da interface web */
          .no-print, nav, aside, header, sidebar, button, [role="navigation"] { 
            display: none !important; 
          }
          
          /* 2. Remove as travas de altura e overflow de TODOS os elementos pais (Isso habilita múltiplas páginas) */
          html, body, #root, main, div, section, article {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            position: static !important;
            background: #fff !important;
            display: block !important;
          }
          
          @page { 
            size: A4 landscape; 
            margin: 12mm 15mm;
          }
          
          /* 3. Ajuste do container principal do relatório */
          #relatorio-impresso { 
            display: block !important; 
            visibility: visible !important;
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
          }

          /* 4. Força a tabela a respeitar os limites laterais da página */
          table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }

          /* 5. Repete o cabeçalho em todas as folhas da impressão */
          thead {
            display: table-header-group !important;
          }

          /* 6. Impede que o navegador corte uma linha de OS pela metade */
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* 7. Alinhamento seguro dos textos para não estourarem as colunas */
          td, th {
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            white-space: pre-wrap !important;
          }
        }
      `}</style>

      {/* PAINEL SUPERIOR - NO-PRINT */}
      <div className="no-print mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
              <FileText className="text-blue-600" size={28} /> Relatório Analítico
            </h1>
            <p className="text-sm md:text-base text-slate-500 mt-1">Gere relatórios customizados para impressão e fiscalização.</p>
          </div>
          <button 
            onClick={() => window.print()}
            disabled={loading || dadosBrutos.length === 0}
            className="bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 text-sm"
          >
            <Printer size={20} /> Imprimir / Salvar PDF
          </button>
        </div>

        {/* COMPONENTE DE FILTROS */}
        <FiltrosRelatorio
          loading={loading} moduloAtivo={moduloAtivo} auxiliares={auxiliares}
          periodoInicial={periodoInicial} setPeriodoInicial={setPeriodoInicial}
          periodoFinal={periodoFinal} setPeriodoFinal={setPeriodoFinal}
          filtroUnidade={filtroUnidade} setFiltroUnidade={setFiltroUnidade}
          filtroSetor={filtroSetor} setFiltroSetor={setFiltroSetor}
          filtroStatusOs={filtroStatusOs} setFiltroStatusOs={setFiltroStatusOs}
          filtroPatrimonio={filtroPatrimonio} setFiltroPatrimonio={setFiltroPatrimonio}
          filtroEtiqueta={filtroEtiqueta} setFiltroEtiqueta={setFiltroEtiqueta}
          filtroCalibracao={filtroCalibracao} setFiltroCalibracao={setFiltroCalibracao}
        />
      </div>

    

      {/* COMPONENTE DA TABELA DE IMPRESSÃO */}
      <TabelaRelatorio
        dadosBrutos={dadosBrutos}
        moduloAtivo={moduloAtivo}
        nomeAmbienteImpressao={nomeAmbienteImpressao}
        resumoFiltros={getResumoFiltros()}
        filtrosTexto={filtrosTexto}
      />
    </div>
  )
}