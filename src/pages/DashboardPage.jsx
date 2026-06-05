import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useModulo } from '../contexts/ModuloContext' // 1. Importado o contexto
import { 
  Activity, Wrench, AlertTriangle, CheckCircle, 
  ArrowRight, Clock, MonitorPlay, Building2, 
  TrendingUp, CalendarClock, PieChart as PieIcon, X
} from 'lucide-react'
import { 
  AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { moduloAtivo } = useModulo() // 2. Puxando o módulo atual
  const [loading, setLoading] = useState(true)
  
  const [unidades, setUnidades] = useState([])
  const [filtroUnidade, setFiltroUnidade] = useState('Todas')
  
  const [modalInoperantes, setModalInoperantes] = useState({ aberto: false, lista: [] })
  
  const [kpis, setKpis] = useState({
    totalEquip: 0,
    dispPercent: 0,
    osAbertas: 0,
    osAtrasadas: 0,
    concluidasMes: 0,
    inoperantes: 0
  })

  const [graficos, setGraficos] = useState({
    tendencia: [],
    statusParque: []
  })

  const [listas, setListas] = useState({
    atrasadas: [],
    proximas: []
  })

  // =========================================================================
  // SILENCIADOR DO AVISO FANTASMA DO RECHARTS
  // =========================================================================
  useEffect(() => {
    const consoleWarnOriginal = console.warn;
    console.warn = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('width(-1) and height(-1)')) return; 
      consoleWarnOriginal(...args);
    };
    return () => { console.warn = consoleWarnOriginal; };
  }, []);

  // =========================================================================
  // CARREGAMENTO INICIAL E REAL-TIME ISOLADO POR MÓDULO
  // =========================================================================
  useEffect(() => {
    if (!moduloAtivo) return; // Aguarda o módulo estar disponível

    carregarPainel()

    // 3. Websocket isolado pelo módulo
    const canalDashboard = supabase
      .channel(`dashboard-updates-${moduloAtivo}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chamados',
        filter: `modulo=eq.${moduloAtivo}`
      }, () => carregarPainel(false))
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'equipamentos',
        filter: `modulo=eq.${moduloAtivo}`
      }, () => carregarPainel(false))
      .subscribe();

    return () => { supabase.removeChannel(canalDashboard); };
  }, [filtroUnidade, moduloAtivo]) // Recarrega se trocar de módulo ou unidade

  const carregarPainel = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    
    const { data: uniData } = await supabase.from('unidades').select('id, nome').order('nome')
    if (uniData) setUnidades(uniData)

    // 4. Filtrando as consultas no banco pelo módulo atual
    let eqQuery = supabase.from('equipamentos')
      .select('id, nome, patrimonio, status_id, unidade_id, status:status_id(nome), unidade:unidade_id(nome), setor:setor_id(nome)')
      .eq('modulo', moduloAtivo)

    let chQuery = supabase.from('chamados')
      .select('*, status:status_id(nome), equipamento:equipamento_id(nome, patrimonio, unidade_id)')
      .eq('modulo', moduloAtivo)

    // Mantém o filtro de unidade (prédio/local) em conjunto com o módulo
    if (filtroUnidade !== 'Todas') {
      eqQuery = eqQuery.eq('unidade_id', filtroUnidade)
      chQuery = chQuery.filter('equipamento.unidade_id', 'eq', filtroUnidade)
    }

    const [equipReq, chamadosReq] = await Promise.all([eqQuery, chQuery])
    const equipamentos = equipReq.data || []
    const chamados = (chamadosReq.data || []).filter(ch => ch.equipamento !== null)

    processarDadosReais(equipamentos, chamados)
    if (showLoading) setLoading(false)
  }

  const processarDadosReais = (equipamentos, chamados) => {
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
      return conc.getMonth() === mesAtual && conc.getFullYear() === anoAtual
    })

    setKpis({
      totalEquip: equipamentos.length,
      dispPercent: equipamentos.length > 0 ? (((equipamentos.length - listaInoperantes.length) / equipamentos.length) * 100).toFixed(1) : 0,
      osAbertas: osAbertas.length,
      osAtrasadas: osAtrasadas.length,
      concluidasMes: concluidasMes.length,
      inoperantes: listaInoperantes.length
    })

    setModalInoperantes(prev => ({ ...prev, lista: listaInoperantes }))

    const ultimos6Meses = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(anoAtual, mesAtual - i, 1)
      ultimos6Meses.push({
        mesReal: d.getMonth(),
        anoReal: d.getFullYear(),
        name: d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase(),
        "OS Registradas": 0
      })
    }

    chamados.forEach(ch => {
      if (!ch.data_abertura) return
      const dAbertura = new Date(ch.data_abertura)
      const index = ultimos6Meses.findIndex(m => m.mesReal === dAbertura.getMonth() && m.anoReal === dAbertura.getFullYear())
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
      statusParque: Object.keys(mapaStatus).map(k => ({ name: k, value: mapaStatus[k], color: coresStatus[k] || '#3b82f6' }))
    })

    setListas({
      atrasadas: [...osAtrasadas].sort((a, b) => new Date(a.data_prevista) - new Date(b.data_prevista)).slice(0, 5),
      proximas: osAbertas.filter(ch => ch.data_prevista && new Date(ch.data_prevista).setHours(0,0,0,0) >= hoje)
        .sort((a, b) => new Date(a.data_prevista) - new Date(b.data_prevista)).slice(0, 5)
    })
  }

  // Define um nome bonito para mostrar no título do Dashboard
  const nomeAmbiente = {
    medicos: 'Equipamentos Médicos',
    ti: 'Tecnologia da Informação',
    infra: 'Nobreaks & Baterias',
    manutencao: 'Manutenção Predial'
  }[moduloAtivo] || 'Dashboard'

  if (loading) return <div className="flex h-full items-center justify-center text-slate-500 font-medium">Analisando dados do ambiente...</div>

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500 font-sans">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Activity className="text-blue-600" size={28} /> {nomeAmbiente}
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-1">Indicadores em tempo real do setor.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 w-full md:w-auto">
          <Building2 size={20} className="text-slate-400 shrink-0" />
          <div className="flex flex-col w-full">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filtrar Unidade</span>
            <select 
              value={filtroUnidade}
              onChange={(e) => setFiltroUnidade(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 p-0 cursor-pointer w-full md:w-48 outline-none"
            >
              <option value="Todas">Visão Geral (Todas)</option>
              {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* KPIS INTERATIVOS COM ROTAS DINÂMICAS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <KpiCard 
          titulo="Total de Equip." valor={kpis.totalEquip} icone={<MonitorPlay />} cor="slate" 
          onClick={() => navigate(`/${moduloAtivo}/equipamentos`)}
        />
        <KpiCard 
          titulo="Disponibilidade" valor={`${kpis.dispPercent}%`} icone={<CheckCircle />} 
          cor={kpis.dispPercent > 90 ? 'emerald' : 'amber'} 
        />
        <KpiCard 
          titulo="OS Abertas" valor={kpis.osAbertas} icone={<Wrench />} cor="blue" 
          onClick={() => navigate(`/${moduloAtivo}/chamados`)}
        />
        
        <div 
          onClick={() => setModalInoperantes(prev => ({ ...prev, aberto: true }))}
          className="cursor-pointer group hover:-translate-y-1 transition-all relative"
          title="Ver equipamentos inoperantes"
        >
          <KpiCard 
            titulo="Inoperantes" valor={kpis.inoperantes} icone={<AlertTriangle />} cor="red" pulse={kpis.inoperantes > 0} 
          />
          <div className="absolute top-3 right-3 bg-red-50 p-1.5 rounded-full text-red-400 opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-red-100">
            <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">Ver Lista <ArrowRight size={12}/></span>
          </div>
        </div>

        <KpiCard 
          titulo="Concluídas no Mês" valor={kpis.concluidasMes} icone={<Activity />} cor="indigo" 
          onClick={() => navigate(`/${moduloAtivo}/chamados`)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[350px]">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><TrendingUp size={18} className="text-blue-500" /> Volume de OS Registradas (6 Meses)</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="99%" height="100%">
              <AreaChart data={graficos.tendencia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="corOS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="OS Registradas" stroke="#3b82f6" strokeWidth={3} fill="url(#corOS)" activeDot={{ r: 6, strokeWidth: 0, fill: '#2563eb' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[350px]">
          <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><PieIcon size={18} className="text-emerald-500" /> Status do Parque</h3>
          <div className="flex-1 w-full min-h-0 relative">
            {graficos.statusParque.length === 0 ? (
               <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm font-medium">Nenhum equipamento neste ambiente</div>
            ) : (
              <ResponsiveContainer width="99%" height="100%">
                <PieChart>
                  <Pie data={graficos.statusParque} innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                    {graficos.statusParque.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [value, 'Equipamentos']} 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '20px', fontWeight: '500', color: '#475569'}} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-red-50/50 p-5 border-b border-red-100 flex justify-between items-center">
            <h3 className="font-bold text-red-800 flex items-center gap-2"><AlertTriangle size={18} className="text-red-600" /> OS Atrasadas</h3>
            {/* ROTAS DINÂMICAS NAS LISTAS */}
            <button onClick={() => navigate(`/${moduloAtivo}/chamados`)} className="text-xs font-bold text-red-600 hover:text-red-800 hover:underline px-2 py-1 rounded transition-colors">Resolver pendências</button>
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            {listas.atrasadas.length === 0 ? <div className="p-8 text-center text-slate-400 text-sm">Nenhuma OS em atraso! 🎉</div> : listas.atrasadas.map(ch => (
              <div key={ch.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 text-red-600 rounded-lg"><Clock size={16} /></div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 line-clamp-1">{ch.equipamento?.nome}</p>
                    <p className="text-xs text-slate-500">{ch.tipo_intervencao} • Previsão era {new Date(ch.data_prevista).toLocaleDateString('pt-BR', {timeZone:'UTC'})}</p>
                  </div>
                </div>
                <button onClick={() => navigate(`/${moduloAtivo}/chamados`, { state: { openDetailsId: ch.id } })} className="p-2 hover:bg-white rounded-full transition-colors"><ArrowRight size={16} className="text-slate-300 hover:text-red-500" /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-blue-50/50 p-5 border-b border-blue-100 flex justify-between items-center">
            <h3 className="font-bold text-blue-800 flex items-center gap-2"><CalendarClock size={18} className="text-blue-600" /> Próximas na Agenda</h3>
            <button onClick={() => navigate(`/${moduloAtivo}/agenda`)} className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline px-2 py-1 rounded transition-colors">Ver Agenda Completa</button>
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            {listas.proximas.length === 0 ? <div className="p-8 text-center text-slate-400 text-sm">Nenhum agendamento futuro no sistema.</div> : listas.proximas.map(ch => (
              <div key={ch.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Wrench size={16} /></div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 line-clamp-1">{ch.equipamento?.nome}</p>
                    <p className="text-xs text-slate-500">{ch.tipo_intervencao} • Agendado: {new Date(ch.data_prevista).toLocaleDateString('pt-BR', {timeZone:'UTC'})}</p>
                  </div>
                </div>
                <button onClick={() => navigate(`/${moduloAtivo}/chamados`, { state: { openDetailsId: ch.id } })} className="p-2 hover:bg-white rounded-full transition-colors"><ArrowRight size={16} className="text-slate-300 hover:text-blue-500" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {modalInoperantes.aberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in zoom-in duration-150 border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-red-50/50 rounded-t-2xl">
              <div className="flex items-center gap-3 text-red-700">
                <div className="bg-red-100 p-2 rounded-lg"><AlertTriangle size={20} /></div>
                <h2 className="text-xl font-bold">Equipamentos Inoperantes ({modalInoperantes.lista.length})</h2>
              </div>
              <button 
                onClick={() => setModalInoperantes(prev => ({ ...prev, aberto: false }))} 
                className="p-1.5 hover:bg-slate-200/50 rounded-full text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>
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
                        <span><strong className="text-slate-400 uppercase text-[10px]">Setor:</strong> {eq.setor?.nome || '-'}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setModalInoperantes(prev => ({ ...prev, aberto: false }));
                        navigate(`/${moduloAtivo}/equipamentos`, { state: { openDetailsId: eq.id } }); // NAVEGAÇÃO CORRETA AQUI TAMBÉM
                      }}
                      className="text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg border border-red-200 transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap ml-4"
                    >
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

function KpiCard({ titulo, valor, icone, cor, pulse, onClick }) {
  const estilos = {
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  }
  
  return (
    <div 
      onClick={onClick}
      className={`bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 md:gap-4 h-full transition-all ${pulse ? 'ring-2 ring-red-200 ring-offset-2' : ''} ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-md hover:border-slate-300' : ''}`}
    >
      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-inner ${estilos[cor]}`}>
        {icone}
      </div>
      <div>
        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">{titulo}</p>
        <h3 className="text-xl md:text-2xl font-black text-slate-800 leading-none">{valor}</h3>
      </div>
    </div>
  )
}