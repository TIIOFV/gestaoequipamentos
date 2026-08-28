import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useModulo } from '../../contexts/ModuloContext'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, Building2, X, AlertTriangle, ArrowRight, Clock, Calendar, AlertCircle } from 'lucide-react'

import DashboardKpis from './components/DashboardKpis'
import DashboardGraficos from './components/DashboardGraficos'
import DashboardListas from './components/DashboardListas'
import DashboardMatriz from './components/DashboardMatriz'

const formatDataSegura = (dataString) => {
  if (!dataString) return '-';
  const data = new Date(dataString);
  data.setMinutes(data.getMinutes() + data.getTimezoneOffset());
  return data.toLocaleDateString('pt-BR');
}

const buscarDadosDashboard = async ({ moduloAtivo, filtroUnidade }) => {
  const { data: unidadesData } = await supabase.from('unidades').select('id, nome').order('nome')

  let eqQuery = supabase.from('equipamentos')
    .select('id, nome, patrimonio, status:status_id(nome), unidade:unidade_id(nome), setor:setor_id(nome)')
    .eq('modulo', moduloAtivo)
  
  // 🚀 ADICIONADO: descricao e tipo_intervencao para mostrar no modal dinâmico
  let chQuery = supabase.from('chamados')
    .select('id, descricao, tipo_intervencao, data_abertura, data_conclusao, data_prevista, status:status_id(nome), equipamento:equipamento_id(id, nome, patrimonio, unidade_id)')
    .eq('modulo', moduloAtivo)

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
    const hoje = new Date()
    const seisMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1).toISOString()
    
    const { data: leiturasData } = await supabase
      .from('leituras_impressoras')
      .select('equipamento_id, mes_referencia, contador_pb, contador_cor, contador_etiquetas, contador_pulseiras')
      .in('equipamento_id', equipIds)
      .gte('created_at', seisMesesAtras) 
      
    if (leiturasData) leituras = leiturasData

    const { data: ultimaAuditoria } = await supabase.from('auditoria_impressoes').select('mes_referencia').order('mes_referencia', { ascending: false }).limit(1)
    if (ultimaAuditoria && ultimaAuditoria.length > 0) {
      mesTop5 = ultimaAuditoria[0].mes_referencia;
      const { data: rankingData } = await supabase.from('auditoria_impressoes').select('*, equipamento:equipamento_id(nome)').eq('mes_referencia', mesTop5).order('paginas_cor', { ascending: false }).limit(5)
      top5Cor = rankingData || [];
    }
  }

  return { unidades: unidadesData || [], equipamentos, chamados, leituras, top5Cor, mesTop5 }
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { moduloAtivo } = useModulo()
  const queryClient = useQueryClient()
  
  const [filtroUnidade, setFiltroUnidade] = useState('Todas')
  
  // 🚀 NOVO ESTADO: Modal Dinâmico
  const [modalLista, setModalLista] = useState({ aberto: false, tipo: '', titulo: '', icone: null, cor: '', lista: [] })

  useEffect(() => {
    const consoleWarnOriginal = console.warn;
    console.warn = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('width(-1) and height(-1)')) return; 
      consoleWarnOriginal(...args);
    };
    return () => { console.warn = consoleWarnOriginal; };
  }, []);

  const { data: rawData = null, isLoading } = useQuery({
    queryKey: ['dashboard', moduloAtivo, filtroUnidade],
    queryFn: () => buscarDadosDashboard({ moduloAtivo, filtroUnidade }),
    enabled: !!moduloAtivo,
    staleTime: 1000 * 60 * 5, 
  })

  useEffect(() => {
    if (!moduloAtivo) return;

    const canalDashboard = supabase
      .channel(`dashboard-updates-${moduloAtivo}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados', filter: `modulo=eq.${moduloAtivo}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard', moduloAtivo] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipamentos', filter: `modulo=eq.${moduloAtivo}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard', moduloAtivo] })
      })
      .subscribe();

    return () => { supabase.removeChannel(canalDashboard); };
  }, [moduloAtivo, queryClient])

  const processado = useMemo(() => {
    if (!rawData) return { kpis: {}, graficos: {}, listas: {}, inoperantes: [], atrasadas: [], agendadas: [], proximas: [], matriz: [] }

    const { equipamentos, chamados, leituras, top5Cor, mesTop5 } = rawData
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const mesAtual = hoje.getMonth()
    const anoAtual = hoje.getFullYear()

    const listaInoperantes = equipamentos.filter(eq => eq.status?.nome?.toLowerCase().includes('inoperante'))
    const osAbertas = chamados.filter(ch => ch.status?.nome !== 'Concluído')
    
    // 🚀 LÓGICA DE DATAS PARA OS NOVOS KPIS
    const osAtrasadas = osAbertas.filter(ch => {
      if (!ch.data_prevista) return false
      const prev = new Date(ch.data_prevista)
      prev.setHours(0,0,0,0)
      return prev < hoje
    }).sort((a, b) => new Date(a.data_prevista) - new Date(b.data_prevista))

    const osAgendadas = osAbertas.filter(ch => {
      if (!ch.data_prevista) return false
      const prev = new Date(ch.data_prevista)
      prev.setHours(0,0,0,0)
      return prev >= hoje
    }).sort((a, b) => new Date(a.data_prevista) - new Date(b.data_prevista))

    const osProximas10Dias = osAgendadas.filter(ch => {
      const prev = new Date(ch.data_prevista)
      const diffTime = Math.abs(prev - hoje)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays <= 10
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

    const matrizUnidades = {}
    equipamentos.forEach(eq => {
      const uni = eq.unidade?.nome || 'Unidade Não Definida'
      if (!matrizUnidades[uni]) matrizUnidades[uni] = { nome: uni, total: 0, operantes: 0, inoperantes: 0, manutencao: 0 }
      
      matrizUnidades[uni].total++
      const statusEq = eq.status?.nome?.toLowerCase() || ''
      if (statusEq.includes('inoperante')) matrizUnidades[uni].inoperantes++
      else if (statusEq.includes('manutenção')) matrizUnidades[uni].manutencao++
      else matrizUnidades[uni].operantes++
    })

    const matrizProcessada = Object.values(matrizUnidades).map(u => ({
      ...u,
      saude: u.total > 0 ? (((u.total - u.inoperantes) / u.total) * 100).toFixed(1) : 0
    })).sort((a, b) => b.total - a.total)

    return {
      kpis: {
        totalEquip: equipamentos.length,
        dispPercent: equipamentos.length > 0 ? (((equipamentos.length - listaInoperantes.length) / equipamentos.length) * 100).toFixed(1) : 0,
        osAbertas: osAbertas.length, 
        osAtrasadas: osAtrasadas.length, 
        osAgendadas: osAgendadas.length,
        osProximas: osProximas10Dias.length,
        concluidasMes: concluidasMes.length, 
        inoperantes: listaInoperantes.length, 
        paginasMes
      },
      inoperantes: listaInoperantes,
      atrasadas: osAtrasadas,
      agendadas: osAgendadas,
      proximas: osProximas10Dias,
      graficos: {
        tendencia: ultimos6Meses, 
        statusParque: Object.keys(mapaStatus).map(k => ({ name: k, value: mapaStatus[k], color: coresStatus[k] || '#3b82f6' })), 
        tendenciaImpressoes: ultimos6MesesImpressoes
      },
      listas: {
        atrasadas: osAtrasadas.slice(0, 5),
        proximas: osAgendadas.slice(0, 5),
        top5Cor,
        mesTop5
      },
      matriz: matrizProcessada 
    }
  }, [rawData, moduloAtivo])

  const nomeAmbiente = { medicos: 'Equipamentos Médicos', ti: 'Tecnologia da Informação', infra: 'Nobreaks & Baterias', manutencao: 'Manutenção Predial', impressoras: 'Dashboard MPS' }[moduloAtivo] || 'Dashboard'

  // 🚀 FUNÇÃO PARA ABRIR O MODAL DINÂMICO
  const abrirModalLista = (tipo) => {
    if (tipo === 'inoperantes') setModalLista({ aberto: true, tipo, titulo: 'Equipamentos Inoperantes', icone: AlertTriangle, cor: 'red', lista: processado.inoperantes })
    if (tipo === 'atrasadas') setModalLista({ aberto: true, tipo, titulo: 'Ordens de Serviço Atrasadas', icone: Clock, cor: 'rose', lista: processado.atrasadas })
    if (tipo === 'agendadas') setModalLista({ aberto: true, tipo, titulo: 'Ordens de Serviço Agendadas', icone: Calendar, cor: 'blue', lista: processado.agendadas })
    if (tipo === 'proximas') setModalLista({ aberto: true, tipo, titulo: 'Agendadas para os Próximos 10 Dias', icone: AlertCircle, cor: 'amber', lista: processado.proximas })
  }

  if (isLoading || !rawData) return <div className="flex h-full items-center justify-center text-slate-500 font-medium">Analisando dados do ambiente...</div>

  return (
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
              {rawData.unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
        </div>
      </div>

      <DashboardKpis kpis={processado.kpis} moduloAtivo={moduloAtivo} abrirModalLista={abrirModalLista} />
      <DashboardGraficos graficos={processado.graficos} moduloAtivo={moduloAtivo} />
      <DashboardListas listas={processado.listas} moduloAtivo={moduloAtivo} navigate={navigate} />
      <DashboardMatriz matriz={processado.matriz} />

      {/* 🚀 MODAL DINÂMICO UNIFICADO */}
      {modalLista.aberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in zoom-in duration-150 border border-slate-200 overflow-hidden">
            
            <div className={`p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-${modalLista.cor}-50/50`}>
              <div className={`flex items-center gap-3 text-${modalLista.cor}-700`}>
                <div className={`bg-${modalLista.cor}-100 p-3 rounded-2xl`}>
                  {modalLista.icone && <modalLista.icone size={24} />}
                </div>
                <h2 className="text-xl md:text-2xl font-black tracking-tight">{modalLista.titulo} ({modalLista.lista.length})</h2>
              </div>
              <button onClick={() => setModalLista({ ...modalLista, aberto: false })} className="p-3 bg-white hover:bg-slate-100 rounded-full text-slate-500 transition-colors shadow-sm active:scale-95"><X size={20} /></button>
            </div>
            
            <div className="p-4 md:p-6 overflow-y-auto divide-y divide-slate-100 flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {modalLista.lista.length === 0 ? (
                <div className="text-center py-16 text-slate-400 font-bold">Nenhum registo encontrado para esta categoria. 🎉</div>
              ) : (
                modalLista.lista.map(item => (
                  <div key={item.id} className="py-5 first:pt-0 last:pb-0 flex items-center justify-between group hover:bg-slate-50 p-3 rounded-2xl transition-colors">
                    
                    {modalLista.tipo === 'inoperantes' ? (
                      // Renderização para Equipamentos
                      <div className="flex-1 min-w-0 pr-4">
                        <h4 className="font-black text-slate-800 text-base truncate">{item.nome}</h4>
                        <div className="flex flex-wrap gap-3 mt-1.5 font-bold text-xs">
                          <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500"><strong className="text-slate-400">PAT:</strong> {item.patrimonio || '-'}</span>
                        </div>
                      </div>
                    ) : (
                      // Renderização para Ordens de Serviço (Chamados)
                      <div className="flex-1 min-w-0 pr-4">
                        <h4 className="font-black text-slate-800 text-base truncate">{item.equipamento?.nome || 'Equipamento'}</h4>
                        <p className="text-sm text-slate-500 font-medium truncate mb-2">{item.descricao}</p>
                        <div className="flex flex-wrap gap-3 font-bold text-xs">
                          <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500"><strong className="text-slate-400">OS:</strong> #{item.id}</span>
                          <span className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 bg-${modalLista.cor}-50 text-${modalLista.cor}-700 border-${modalLista.cor}-200`}>
                            <Calendar size={12} /> {formatDataSegura(item.data_prevista)}
                          </span>
                        </div>
                      </div>
                    )}

                    <button onClick={() => { 
                      setModalLista({ ...modalLista, aberto: false }); 
                      if(modalLista.tipo === 'inoperantes') navigate(`/${moduloAtivo}/equipamentos`, { state: { openDetailsId: item.id } });
                      else navigate(`/${moduloAtivo}/chamados`, { state: { openDetailsId: item.id } });
                    }} className={`text-xs font-black uppercase tracking-widest text-${modalLista.cor}-700 bg-${modalLista.cor}-50 hover:bg-${modalLista.cor}-100 px-5 py-3 rounded-xl border border-${modalLista.cor}-200 transition-all flex items-center gap-2 shadow-sm whitespace-nowrap active:scale-95 shrink-0`}>
                      Ver {modalLista.tipo === 'inoperantes' ? 'Equip.' : 'O.S'} <ArrowRight size={14} />
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