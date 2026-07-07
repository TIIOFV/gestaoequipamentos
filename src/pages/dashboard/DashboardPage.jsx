import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useModulo } from '../../contexts/ModuloContext'
import { Activity, Building2, X, AlertTriangle, ArrowRight } from 'lucide-react'

import DashboardKpis from './components/DashboardKpis'
import DashboardGraficos from './components/DashboardGraficos'
import DashboardListas from './components/DashboardListas'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { moduloAtivo } = useModulo()
  const [loading, setLoading] = useState(true)
  const [unidades, setUnidades] = useState([])
  const [filtroUnidade, setFiltroUnidade] = useState('Todas')
  const [modalInoperantes, setModalInoperantes] = useState({ aberto: false, lista: [] })
  
  const [kpis, setKpis] = useState({ totalEquip: 0, dispPercent: 0, osAbertas: 0, osAtrasadas: 0, concluidasMes: 0, inoperantes: 0, paginasMes: 0, custoMes: 0 })
  const [graficos, setGraficos] = useState({ tendencia: [], statusParque: [], tendenciaImpressoes: [] })
  const [listas, setListas] = useState({ atrasadas: [], proximas: [] })

  useEffect(() => {
    const consoleWarnOriginal = console.warn;
    console.warn = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('width(-1) and height(-1)')) return; 
      consoleWarnOriginal(...args);
    };
    return () => { console.warn = consoleWarnOriginal; };
  }, []);

  useEffect(() => {
    if (!moduloAtivo) return;
    carregarPainel()

    const canalDashboard = supabase
      .channel(`dashboard-updates-${moduloAtivo}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados', filter: `modulo=eq.${moduloAtivo}` }, () => carregarPainel(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipamentos', filter: `modulo=eq.${moduloAtivo}` }, () => carregarPainel(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leituras_impressoras' }, () => carregarPainel(false))
      .subscribe();

    return () => { supabase.removeChannel(canalDashboard); };
  }, [filtroUnidade, moduloAtivo])

  const carregarPainel = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    
    const { data: uniData } = await supabase.from('unidades').select('id, nome').order('nome')
    if (uniData) setUnidades(uniData)

    let eqQuery = supabase.from('equipamentos').select('id, nome, patrimonio, status_id, unidade_id, status:status_id(nome), unidade:unidade_id(nome), setor:setor_id(nome)').eq('modulo', moduloAtivo)
    let chQuery = supabase.from('chamados').select('*, status:status_id(nome), equipamento:equipamento_id(nome, patrimonio, unidade_id)').eq('modulo', moduloAtivo)

    if (filtroUnidade !== 'Todas') {
      eqQuery = eqQuery.eq('unidade_id', filtroUnidade)
      chQuery = chQuery.filter('equipamento.unidade_id', 'eq', filtroUnidade)
    }

    const [equipReq, chamadosReq] = await Promise.all([eqQuery, chQuery])
    const equipamentos = equipReq.data || []
    const chamados = (chamadosReq.data || []).filter(ch => ch.equipamento !== null)

    // Busca dados exclusivos de bilhetagem se for módulo de impressoras
    let leituras = []
    if (moduloAtivo === 'impressoras' && equipamentos.length > 0) {
      const equipIds = equipamentos.map(e => e.id)
      const { data } = await supabase.from('leituras_impressoras').select('*').in('equipamento_id', equipIds)
      if (data) leituras = data
    }

    processarDadosReais(equipamentos, chamados, leituras)
    if (showLoading) setLoading(false)
  }

  const processarDadosReais = (equipamentos, chamados, leituras) => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const mesAtual = hoje.getMonth()
    const anoAtual = hoje.getFullYear()

    const listaInoperantes = equipamentos.filter(eq => eq.status?.nome?.toLowerCase().includes('inoperante'))
    const osAbertas = chamados.filter(ch => ch.status?.nome !== 'Concluído')
    
    // Corrigido: Usamos 'data_prevista' para comparar atrasos, garantindo foco no prazo real
    const osAtrasadas = osAbertas.filter(ch => {
      if (!ch.data_prevista) return false
      const prev = new Date(ch.data_prevista)
      prev.setHours(0,0,0,0)
      return prev < hoje
    })

    // Corrigido: O filtro de concluídas agora olha especificamente para o mês da data_conclusao
    // Isso garante que lançamentos retroativos apareçam no mês correto da competência
    const concluidasMes = chamados.filter(ch => {
      if (ch.status?.nome !== 'Concluído' || !ch.data_conclusao) return false
      const conc = new Date(ch.data_conclusao)
      // Forçamos a comparação UTC para evitar bug de fuso horário
      return conc.getUTCMonth() === mesAtual && conc.getUTCFullYear() === anoAtual
    })

    // Processamento da Bilhetagem
    let paginasMes = 0; let custoMes = 0; const ultimos6MesesImpressoes = [];
    // ... (mantenha o seu código de processamento de leituras aqui, está correto)
    if (moduloAtivo === 'impressoras') {
      // ... (seu bloco de processamento de impressoras permanece igual)
    }

    setKpis({
      totalEquip: equipamentos.length,
      dispPercent: equipamentos.length > 0 ? (((equipamentos.length - listaInoperantes.length) / equipamentos.length) * 100).toFixed(1) : 0,
      osAbertas: osAbertas.length, 
      osAtrasadas: osAtrasadas.length, 
      concluidasMes: concluidasMes.length, 
      inoperantes: listaInoperantes.length, 
      paginasMes, 
      custoMes
    })

    setModalInoperantes(prev => ({ ...prev, lista: listaInoperantes }))

    // Ajuste nos Gráficos: Focar na data real do serviço (data_conclusao ou data_abertura)
    const ultimos6Meses = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(anoAtual, mesAtual - i, 1)
      ultimos6Meses.push({ mesReal: d.getMonth(), anoReal: d.getFullYear(), name: d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase(), "OS Registradas": 0 })
    }

    chamados.forEach(ch => {
      // Prioriza a data de conclusão, se não houver, usa a de abertura
      const dataRef = ch.data_conclusao ? new Date(ch.data_conclusao) : new Date(ch.data_abertura);
      if (!dataRef || isNaN(dataRef)) return;
      
      const index = ultimos6Meses.findIndex(m => m.mesReal === dataRef.getUTCMonth() && m.anoReal === dataRef.getUTCFullYear())
      if (index !== -1) ultimos6Meses[index]["OS Registradas"]++
    })

    // ... (seu código de coresStatus e setGraficos permanece igual)
    const coresStatus = { 'Operante': '#10b981', 'Em Manutenção': '#f59e0b', 'Inoperante': '#ef4444', 'Sem Status': '#94a3b8' }
    const mapaStatus = equipamentos.reduce((acc, eq) => {
      const nome = eq.status?.nome || 'Sem Status'
      acc[nome] = (acc[nome] || 0) + 1
      return acc
    }, {})

    setGraficos({
      tendencia: ultimos6Meses, 
      statusParque: Object.keys(mapaStatus).map(k => ({ name: k, value: mapaStatus[k], color: coresStatus[k] || '#3b82f6' })), 
      tendenciaImpressoes: ultimos6MesesImpressoes
    })

    setListas({
      atrasadas: [...osAtrasadas].sort((a, b) => new Date(a.data_prevista) - new Date(b.data_prevista)).slice(0, 5),
      proximas: osAbertas.filter(ch => ch.data_prevista && new Date(ch.data_prevista).setHours(0,0,0,0) >= hoje).sort((a, b) => new Date(a.data_prevista) - new Date(b.data_prevista)).slice(0, 5)
    })
  }

  const nomeAmbiente = { medicos: 'Equipamentos Médicos', ti: 'Tecnologia da Informação', infra: 'Nobreaks & Baterias', manutencao: 'Manutenção Predial', impressoras: 'Impressoras & Copiadoras' }[moduloAtivo] || 'Dashboard'

  if (loading) return <div className="flex h-full items-center justify-center text-slate-500 font-medium">Analisando dados do ambiente...</div>

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3"><Activity className="text-blue-600" size={28} /> {nomeAmbiente}</h1>
          <p className="text-sm md:text-base text-slate-500 mt-1">Indicadores em tempo real do setor.</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 w-full md:w-auto">
          <Building2 size={20} className="text-slate-400 shrink-0" />
          <div className="flex flex-col w-full">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filtrar Unidade</span>
            <select value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value)} className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 p-0 cursor-pointer w-full md:w-48 outline-none">
              <option value="Todas">Visão Geral (Todas)</option>
              {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
        </div>
      </div>

      <DashboardKpis kpis={kpis} moduloAtivo={moduloAtivo} navigate={navigate} setModalInoperantes={setModalInoperantes} />
      <DashboardGraficos graficos={graficos} moduloAtivo={moduloAtivo} />
      <DashboardListas listas={listas} moduloAtivo={moduloAtivo} navigate={navigate} />

      {/* MODAL INOPERANTES MANTIDO AQUI POR SIMPLICIDADE DO ESTADO */}
      {modalInoperantes.aberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in zoom-in duration-150 border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-red-50/50 rounded-t-2xl">
              <div className="flex items-center gap-3 text-red-700">
                <div className="bg-red-100 p-2 rounded-lg"><AlertTriangle size={20} /></div>
                <h2 className="text-xl font-bold">Equipamentos Inoperantes ({modalInoperantes.lista.length})</h2>
              </div>
              <button onClick={() => setModalInoperantes(prev => ({ ...prev, aberto: false }))} className="p-1.5 hover:bg-slate-200/50 rounded-full text-slate-500 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-4 overflow-y-auto divide-y divide-slate-100 flex-1">
              {modalInoperantes.lista.length === 0 ? (
                <div className="text-center py-10 text-slate-400 font-medium">Excelente! Nenhum equipamento inoperante. 🎉</div>
              ) : (
                modalInoperantes.lista.map(eq => (
                  <div key={eq.id} className="py-4 first:pt-2 last:pb-2 flex items-center justify-between group">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm md:text-base">{eq.nome}</h4>
                      <div className="flex flex-wrap gap-3 md:gap-4 text-xs text-slate-500 mt-1 font-medium">
                        <span><strong className="text-slate-400 uppercase text-[10px]">Pat:</strong> {eq.patrimonio || '-'}</span>
                        <span><strong className="text-slate-400 uppercase text-[10px]">Unid:</strong> {eq.unidade?.nome}</span>
                      </div>
                    </div>
                    <button onClick={() => { setModalInoperantes(prev => ({ ...prev, aberto: false })); navigate(`/${moduloAtivo}/equipamentos`, { state: { openDetailsId: eq.id } }); }} className="text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg border border-red-200 transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap ml-4">
                      Ver Equip. <ArrowRight size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}