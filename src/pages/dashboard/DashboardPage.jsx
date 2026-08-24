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
  
  const [kpis, setKpis] = useState({ totalEquip: 0, dispPercent: 0, osAbertas: 0, osAtrasadas: 0, concluidasMes: 0, inoperantes: 0, paginasMes: 0 })
  const [graficos, setGraficos] = useState({ tendencia: [], statusParque: [], tendenciaImpressoes: [] })
  const [listas, setListas] = useState({ atrasadas: [], proximas: [], top5Cor: [], mesTop5: '' })

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

    let leituras = []
    let top5Cor = []
    let mesTop5 = ''

    if (moduloAtivo === 'impressoras' && equipamentos.length > 0) {
      const equipIds = equipamentos.map(e => e.id)
      const { data: leiturasData } = await supabase.from('leituras_impressoras').select('*').in('equipamento_id', equipIds)
      if (leiturasData) leituras = leiturasData

      const { data: ultimaAuditoria } = await supabase.from('auditoria_impressoes').select('mes_referencia').order('mes_referencia', { ascending: false }).limit(1)
      if (ultimaAuditoria && ultimaAuditoria.length > 0) {
        mesTop5 = ultimaAuditoria[0].mes_referencia;
        const { data: rankingData } = await supabase.from('auditoria_impressoes').select('*, equipamento:equipamento_id(nome)').eq('mes_referencia', mesTop5).order('paginas_cor', { ascending: false }).limit(5)
        top5Cor = rankingData || [];
      }
    }

    processarDadosReais(equipamentos, chamados, leituras, top5Cor, mesTop5)
    if (showLoading) setLoading(false)
  }

  const processarDadosReais = (equipamentos, chamados, leituras, top5Cor, mesTop5) => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const mesAtual = hoje.getMonth()
    const anoAtual = hoje.getFullYear()

    const listaInoperantes = equipamentos.filter(eq => eq.status?.nome?.toLowerCase().includes('inoperante'))
    const osAbertas = chamados.filter(ch => ch.status?.nome !== 'Concluído')
    
    const osAtrasadas = osAbertas.filter(ch => {
      if (!ch.data_prevista) return false
      const prev = new Date(ch.data_prevista)
      prev.setHours(0,0,0,0)
      return prev < hoje
    })

    const concluidasMes = chamados.filter(ch => {
      if (ch.status?.nome !== 'Concluído' || !ch.data_conclusao) return false
      const conc = new Date(ch.data_conclusao)
      return conc.getUTCMonth() === mesAtual && conc.getUTCFullYear() === anoAtual
    })

    let paginasMes = 0; 
    const ultimos6MesesImpressoes = [];
    
    if (moduloAtivo === 'impressoras') {
      const consumoPorMes = {};
      const leiturasPorEquip = {};

      leituras.forEach(l => {
        if (!leiturasPorEquip[l.equipamento_id]) leiturasPorEquip[l.equipamento_id] = [];
        leiturasPorEquip[l.equipamento_id].push(l);
      });

      Object.keys(leiturasPorEquip).forEach(eqId => {
        const leits = leiturasPorEquip[eqId].sort((a, b) => new Date(a.mes_referencia) - new Date(b.mes_referencia));
        for (let i = 1; i < leits.length; i++) {
          const prev = leits[i-1];
          const curr = leits[i];
          if (!consumoPorMes[curr.mes_referencia]) consumoPorMes[curr.mes_referencia] = { pb: 0, cor: 0, termica: 0 };
          
          consumoPorMes[curr.mes_referencia].pb += Math.max(0, (curr.contador_pb || 0) - (prev.contador_pb || 0));
          consumoPorMes[curr.mes_referencia].cor += Math.max(0, (curr.contador_cor || 0) - (prev.contador_cor || 0));
          consumoPorMes[curr.mes_referencia].termica += Math.max(0, ((curr.contador_etiquetas || 0) + (curr.contador_pulseiras || 0)) - ((prev.contador_etiquetas || 0) + (prev.contador_pulseiras || 0)));
        }
      });

      const mesesComConsumo = Object.keys(consumoPorMes).sort((a,b) => new Date(b) - new Date(a));
      if (mesesComConsumo.length > 0) {
        const ultMes = consumoPorMes[mesesComConsumo[0]];
        paginasMes = ultMes.pb + ultMes.cor + ultMes.termica;
      }

      for (let i = 5; i >= 0; i--) {
        const d = new Date(anoAtual, mesAtual - i, 1)
        const mesStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
        
        const cons = consumoPorMes[mesStr] || { pb: 0, cor: 0, termica: 0 };
        ultimos6MesesImpressoes.push({ 
          name: d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase(), 
          "P&B": cons.pb, 
          "Cor": cons.cor,
          "Térmica": cons.termica
        })
      }
    }

    setKpis({
      totalEquip: equipamentos.length,
      dispPercent: equipamentos.length > 0 ? (((equipamentos.length - listaInoperantes.length) / equipamentos.length) * 100).toFixed(1) : 0,
      osAbertas: osAbertas.length, 
      osAtrasadas: osAtrasadas.length, 
      concluidasMes: concluidasMes.length, 
      inoperantes: listaInoperantes.length, 
      paginasMes
    })

    setModalInoperantes(prev => ({ ...prev, lista: listaInoperantes }))

    const ultimos6Meses = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(anoAtual, mesAtual - i, 1)
      ultimos6Meses.push({ mesReal: d.getMonth(), anoReal: d.getFullYear(), name: d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase(), "OS Registradas": 0 })
    }

    chamados.forEach(ch => {
      const dataRef = ch.data_conclusao ? new Date(ch.data_conclusao) : new Date(ch.data_abertura);
      if (!dataRef || isNaN(dataRef)) return;
      const index = ultimos6Meses.findIndex(m => m.mesReal === dataRef.getUTCMonth() && m.anoReal === dataRef.getUTCFullYear())
      if (index !== -1) ultimos6Meses[index]["OS Registradas"]++
    })

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
      proximas: osAbertas.filter(ch => ch.data_prevista && new Date(ch.data_prevista).setHours(0,0,0,0) >= hoje).sort((a, b) => new Date(a.data_prevista) - new Date(b.data_prevista)).slice(0, 5),
      top5Cor,
      mesTop5
    })
  }

  const nomeAmbiente = { medicos: 'Equipamentos Médicos', ti: 'Tecnologia da Informação', infra: 'Nobreaks & Baterias', manutencao: 'Manutenção Predial', impressoras: 'Dashboard MPS' }[moduloAtivo] || 'Dashboard'

  if (loading) return <div className="flex h-full items-center justify-center text-slate-500 font-medium">Analisando dados do ambiente...</div>

  return (
    // 🚀 DASHBOARD COM RESPIRO PERFEITO: w-full e espaçamento interno para afastar das bordas laterais
    <div className="w-full space-y-6 pb-10 animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 flex items-center gap-3 tracking-tight uppercase">
            <Activity className="text-blue-600" size={32} /> {nomeAmbiente}
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">Indicadores em tempo real de manutenção e consumo.</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 px-5 py-3.5 rounded-2xl border border-slate-200 w-full md:w-auto shadow-inner">
          <Building2 size={20} className="text-slate-400 shrink-0" />
          <div className="flex flex-col w-full">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrar Unidade</span>
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

      {modalInoperantes.aberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in zoom-in duration-150 border border-slate-200 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-red-50/50">
              <div className="flex items-center gap-3 text-red-700">
                <div className="bg-red-100 p-3 rounded-2xl"><AlertTriangle size={24} /></div>
                <h2 className="text-xl md:text-2xl font-black tracking-tight">Equipamentos Inoperantes ({modalInoperantes.lista.length})</h2>
              </div>
              <button onClick={() => setModalInoperantes(prev => ({ ...prev, aberto: false }))} className="p-3 bg-white hover:bg-slate-100 rounded-full text-slate-500 transition-colors shadow-sm active:scale-95"><X size={20} /></button>
            </div>
            <div className="p-4 md:p-6 overflow-y-auto divide-y divide-slate-100 flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {modalInoperantes.lista.length === 0 ? (
                <div className="text-center py-16 text-slate-400 font-bold">Excelente! Nenhum equipamento inoperante. 🎉</div>
              ) : (
                modalInoperantes.lista.map(eq => (
                  <div key={eq.id} className="py-5 first:pt-0 last:pb-0 flex items-center justify-between group hover:bg-slate-50 p-3 rounded-2xl transition-colors">
                    <div>
                      <h4 className="font-black text-slate-800 text-base">{eq.nome}</h4>
                      <div className="flex flex-wrap gap-3 md:gap-4 text-xs text-slate-500 mt-1.5 font-bold">
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200"><strong className="text-slate-400 font-black">PAT:</strong> {eq.patrimonio || '-'}</span>
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200"><strong className="text-slate-400 font-black">UNID:</strong> {eq.unidade?.nome}</span>
                      </div>
                    </div>
                    <button onClick={() => { setModalInoperantes(prev => ({ ...prev, aberto: false })); navigate(`/${moduloAtivo}/equipamentos`, { state: { openDetailsId: eq.id } }); }} className="text-xs font-black uppercase tracking-widest text-red-700 bg-red-50 hover:bg-red-100 px-5 py-3 rounded-xl border border-red-200 transition-all flex items-center gap-2 shadow-sm whitespace-nowrap ml-4 active:scale-95">
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