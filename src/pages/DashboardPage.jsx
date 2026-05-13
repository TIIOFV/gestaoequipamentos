import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  Activity, Wrench, AlertTriangle, CheckCircle, 
  ArrowRight, Clock, MonitorPlay, Building2, 
  TrendingUp, CalendarClock, ShieldCheck
} from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area, CartesianGrid
} from 'recharts'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [unidades, setUnidades] = useState([])
  const [filtroUnidade, setFiltroUnidade] = useState('Todas')
  
  // Estados de Dados
  const [kpis, setKpis] = useState({
    total: 0,
    inoperantes: 0,
    abertos: 0,
    disponibilidade: 0,
    atrasados: 0
  })

  const [graficos, setGraficos] = useState({
    status: [],
    intervencao: [],
    unidades: [],
    tendencia: []
  })

  const [listas, setListas] = useState({
    urgentes: [],
    proximos: []
  })

  useEffect(() => {
    carregarTudo()
  }, [filtroUnidade])

  const carregarTudo = async () => {
    setLoading(true)
    
    // Busca Unidades para o Filtro
    const { data: uniData } = await supabase.from('unidades').select('*').order('nome')
    setUnidades(uniData || [])

    // Busca Dados Brutos
    let eqQuery = supabase.from('equipamentos').select('*, status:status_id(nome), unidade:unidade_id(nome)')
    let chQuery = supabase.from('chamados').select('*, status:status_id(nome), equipamento:equipamento_id(nome, unidade_id)')

    if (filtroUnidade !== 'Todas') {
      eqQuery = eqQuery.eq('unidade_id', filtroUnidade)
      chQuery = chQuery.filter('equipamento.unidade_id', 'eq', filtroUnidade) // Nota: ajuste conforme sua estrutura de RLs
    }

    const [equipReq, chamadosReq] = await Promise.all([eqQuery, chQuery])
    const equipamentos = equipReq.data || []
    const chamados = chamadosReq.data || []

    processarMetricas(equipamentos, chamados)
    setLoading(false)
  }

  const processarMetricas = (equipamentos, chamados) => {
    const hoje = new Date()

    // 1. KPIs Básicos
    const inoperantes = equipamentos.filter(eq => eq.status?.nome?.toLowerCase().includes('inoperante')).length
    const abertos = chamados.filter(ch => ch.status?.nome !== 'Concluído').length
    const atrasados = chamados.filter(ch => {
      if (ch.status?.nome === 'Concluído') return false
      const dataRef = ch.data_prevista ? new Date(ch.data_prevista) : null
      return dataRef && dataRef < hoje
    }).length

    const disp = equipamentos.length > 0 
      ? (((equipamentos.length - inoperantes) / equipamentos.length) * 100).toFixed(1) 
      : 0

    setKpis({
      total: equipamentos.length,
      inoperantes,
      abertos,
      atrasados,
      disponibilidade: disp
    })

    // 2. Gráfico Status (Pizza)
    const coresStatus = { 'Operante': '#10b981', 'Em Manutenção': '#f59e0b', 'Inoperante': '#ef4444', 'Sem Status': '#94a3b8' }
    const statusMap = equipamentos.reduce((acc, eq) => {
      const nome = eq.status?.nome || 'Sem Status'
      acc[nome] = (acc[nome] || 0) + 1
      return acc
    }, {})
    setGraficos(prev => ({ ...prev, status: Object.keys(statusMap).map(k => ({ name: k, value: statusMap[k], color: coresStatus[k] || '#3b82f6' })) }))

    // 3. Gráfico Intervenção (Barras)
    const intervMap = chamados.reduce((acc, ch) => {
      acc[ch.tipo_intervencao] = (acc[intervMap] || 0) + 1
      return acc
    }, {})
    setGraficos(prev => ({ ...prev, intervencao: Object.keys(intervMap).map(k => ({ name: k, Quantidade: intervMap[k] })) }))

    // 4. Tendência Mensal (Simulação de últimos 6 meses baseado em data_abertura)
    // Aqui agruparíamos por mês/ano. Exemplo simplificado:
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun']
    const tendenciaMock = meses.map(m => ({ name: m, chamados: Math.floor(Math.random() * 20) + 5 }))
    setGraficos(prev => ({ ...prev, tendencia: tendenciaMock }))

    // 5. Listas
    setListas({
      urgentes: chamados.filter(ch => ch.status?.nome !== 'Concluído').slice(0, 5),
      proximos: chamados.filter(ch => {
        const d = new Date(ch.data_prevista)
        return d > hoje && d < new Date(hoje.getTime() + 15 * 24 * 60 * 60 * 1000)
      }).slice(0, 5)
    })
  }

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-700">
      
      {/* HEADER COM FILTRO ESTRATÉGICO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Activity className="text-blue-600" size={32} /> Dashboard Executivo
          </h1>
          <p className="text-slate-500 font-medium">Análise em tempo real do parque tecnológico.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <Building2 size={18} className="text-slate-400 ml-2" />
          <select 
            value={filtroUnidade}
            onChange={(e) => setFiltroUnidade(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 pr-8 cursor-pointer"
          >
            <option value="Todas">Todas as Unidades</option>
            {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs DE ALTO IMPACTO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard title="Inventário" value={kpis.total} icon={<MonitorPlay />} color="blue" />
        <KpiCard title="Disponibilidade" value={`${kpis.disponibilidade}%`} icon={<ShieldCheck />} color="emerald" sub="Equips. Operantes" />
        <KpiCard title="OS em Aberto" value={kpis.abertos} icon={<Wrench />} color="amber" />
        <KpiCard title="Inoperantes" value={kpis.inoperantes} icon={<AlertTriangle />} color="red" sub="Atenção Crítica" />
        <KpiCard title="OS Atrasadas" value={kpis.atrasados} icon={<Clock />} color="rose" sub="Fora do Prazo" />
      </div>

      {/* LINHA 1 DE GRÁFICOS: TENDÊNCIA E STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TENDÊNCIA DE CHAMADOS */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><TrendingUp size={20} className="text-blue-500" /> Fluxo de Manutenções</h3>
            <span className="text-[10px] font-black bg-blue-50 text-blue-700 px-2 py-1 rounded-lg uppercase">Últimos 6 meses</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={graficos.tendencia}>
                <defs>
                  <linearGradient id="colorCh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                <Area type="monotone" dataKey="chamados" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCh)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* STATUS DO PARQUE */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><MonitorPlay size={20} className="text-emerald-500" /> Saúde do Parque</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={graficos.status} innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value">
                  {graficos.status.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} cornerRadius={10} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '12px'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* LINHA 2: LISTAS TÉCNICAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LISTA 1: OS URGENTES */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><AlertTriangle size={18} className="text-red-500" /> OS Pendentes (Atenção)</h3>
            <button onClick={() => navigate('/chamados')} className="text-xs font-bold text-blue-600 hover:underline">Ver todas</button>
          </div>
          <div className="divide-y divide-slate-50">
            {listas.urgentes.map(ch => (
              <div key={ch.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${ch.tipo_intervencao === 'Corretiva' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                    <Wrench size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{ch.equipamento?.nome}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{ch.tipo_intervencao} • Aberta em {new Date(ch.data_abertura).toLocaleDateString()}</p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </div>
            ))}
          </div>
        </div>

        {/* LISTA 2: PRÓXIMAS PREVENTIVAS / CALIBRAÇÕES */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><CalendarClock size={18} className="text-blue-500" /> Próximos 15 dias</h3>
            <button onClick={() => navigate('/agenda')} className="text-xs font-bold text-blue-600 hover:underline">Ver Agenda</button>
          </div>
          <div className="divide-y divide-slate-50">
            {listas.proximos.length > 0 ? listas.proximos.map(ch => (
              <div key={ch.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{ch.equipamento?.nome}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{ch.tipo_intervencao} agendada para {new Date(ch.data_prevista).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                   <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Agendado</span>
                </div>
              </div>
            )) : (
              <div className="p-10 text-center text-slate-400 text-sm">Nenhum agendamento para os próximos dias.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

// Sub-componente para os Cards de KPI
function KpiCard({ title, value, icon, color, sub }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100'
  }

  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${colors[color]}`}>
          {cloneElement(icon, { size: 24 })}
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{title}</p>
          <h3 className="text-2xl font-black text-slate-800 leading-none">{value}</h3>
          {sub && <p className="text-[10px] font-bold text-slate-400 mt-1">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

// Helper para clonar o ícone e aplicar tamanho
import { cloneElement } from 'react'