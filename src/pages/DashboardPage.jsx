import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  Activity, Wrench, AlertTriangle, CheckCircle, 
  ArrowRight, Clock, MonitorPlay
} from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  
  // Estados para guardar os cálculos
  const [kpis, setKpis] = useState({
    totalEquipamentos: 0,
    equipamentosParados: 0,
    chamadosAbertos: 0,
    manutencoesMes: 0
  })

  const [dadosGraficoStatus, setDadosGraficoStatus] = useState([])
  const [dadosGraficoChamados, setDadosGraficoChamados] = useState([])
  const [chamadosRecentes, setChamadosRecentes] = useState([])

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    setLoading(true)

    // Busca dados brutos do Supabase
    const [equipReq, chamadosReq] = await Promise.all([
      supabase.from('equipamentos').select('id, status:status_id(nome)'),
      supabase.from('chamados').select('id, data_abertura, data_prevista, tipo_intervencao, status:status_id(nome), equipamento:equipamento_id(nome)')
        .order('data_abertura', { ascending: false })
    ])

    const equipamentos = equipReq.data || []
    const chamados = chamadosReq.data || []

    // --- CÁLCULO DOS KPIs (Caixinhas do topo) ---
    const parados = equipamentos.filter(eq => eq.status?.nome?.toLowerCase().includes('inoperante')).length
    const abertos = chamados.filter(ch => ch.status?.nome !== 'Concluído').length
    
    // Conta quantos chamados (prev/calib/corr) estão agendados/abertos para este mês atual
    const mesAtual = new Date().getMonth()
    const anoAtual = new Date().getFullYear()
    const manutencoesMes = chamados.filter(ch => {
      const dataRef = ch.data_prevista ? new Date(ch.data_prevista) : new Date(ch.data_abertura)
      return dataRef.getMonth() === mesAtual && dataRef.getFullYear() === anoAtual
    }).length

    setKpis({
      totalEquipamentos: equipamentos.length,
      equipamentosParados: parados,
      chamadosAbertos: abertos,
      manutencoesMes: manutencoesMes
    })

    // --- CÁLCULO PARA GRÁFICO DE PIZZA (Status dos Equipamentos) ---
    const contagemStatus = equipamentos.reduce((acc, curr) => {
      const nomeStatus = curr.status?.nome || 'Sem Status'
      acc[nomeStatus] = (acc[nomeStatus] || 0) + 1
      return acc
    }, {})

    // Cores dinâmicas baseadas no nome do status
    const coresStatus = {
      'Operante': '#10b981', // Verde
      'Em Manutenção': '#f59e0b', // Amarelo
      'Inoperante': '#ef4444', // Vermelho
      'Sem Status': '#94a3b8' // Cinza
    }

    const formatadoPizza = Object.keys(contagemStatus).map(key => ({
      name: key,
      value: contagemStatus[key],
      color: coresStatus[key] || '#3b82f6'
    }))
    setDadosGraficoStatus(formatadoPizza)

    // --- CÁLCULO PARA GRÁFICO DE BARRAS (Tipos de OS) ---
    const contagemTipos = chamados.reduce((acc, curr) => {
      const tipo = curr.tipo_intervencao || 'Corretiva'
      acc[tipo] = (acc[tipo] || 0) + 1
      return acc
    }, {})

    const formatadoBarras = Object.keys(contagemTipos).map(key => ({
      name: key,
      Quantidade: contagemTipos[key]
    }))
    setDadosGraficoChamados(formatadoBarras)

    // Pega apenas os 5 chamados mais recentes em aberto para a lista rápida
    setChamadosRecentes(chamados.filter(ch => ch.status?.nome !== 'Concluído').slice(0, 5))

    setLoading(false)
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center text-slate-500 font-medium">Carregando painel de controle...</div>
  }

  return (
    <div className="relative min-h-full font-sans pb-10 animate-in fade-in duration-500">
      
      {/* CABEÇALHO */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <Activity className="text-blue-600" size={32} /> Visão Geral
        </h1>
        <p className="text-slate-500 mt-1">Indicadores e métricas da Engenharia Clínica.</p>
      </div>

      {/* KPIs (GRID DE 4 CARTÕES) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <MonitorPlay size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Inventário</p>
            <h3 className="text-3xl font-black text-slate-800">{kpis.totalEquipamentos}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Inoperantes</p>
            <h3 className="text-3xl font-black text-slate-800">{kpis.equipamentosParados}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Wrench size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">OS Abertas</p>
            <h3 className="text-3xl font-black text-slate-800">{kpis.chamadosAbertos}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
            <CheckCircle size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Atividades no Mês</p>
            <h3 className="text-3xl font-black text-slate-800">{kpis.manutencoesMes}</h3>
          </div>
        </div>

      </div>

      {/* ÁREA CENTRAL: GRÁFICOS E LISTAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRÁFICO 1: DISPONIBILIDADE DO PARQUE (PIZZA) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-1">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Status do Parque</h3>
          {dadosGraficoStatus.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Sem dados de equipamentos</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosGraficoStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {dadosGraficoStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} Equip.`, 'Quantidade']} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* GRÁFICO 2: TIPOS DE MANUTENÇÃO (BARRAS) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-1">
          <h3 className="text-lg font-bold text-slate-800 mb-6">OS por Tipo</h3>
          {dadosGraficoChamados.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Sem dados de OS</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosGraficoChamados} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f1f5f9'}} borderRadius={10}/>
                  <Bar dataKey="Quantidade" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* LISTA RÁPIDA: OS RECENTES EM ABERTO */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-1 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">Atenção Necessária</h3>
            <button onClick={() => navigate('/chamados')} className="text-blue-600 hover:text-blue-800 text-sm font-bold flex items-center gap-1 transition-colors">
              Ver todas <ArrowRight size={14} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {chamadosRecentes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm text-center py-10">
                <CheckCircle size={32} className="text-green-300 mb-2"/>
                Nenhuma OS pendente!
              </div>
            ) : (
              chamadosRecentes.map(ch => (
                <div key={ch.id} onClick={() => navigate('/chamados')} className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-blue-50 hover:border-blue-100 transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-slate-800 group-hover:text-blue-800 line-clamp-1">{ch.equipamento?.nome}</span>
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                      ch.tipo_intervencao === 'Corretiva' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {ch.tipo_intervencao}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium text-slate-500">
                    <Clock size={12} /> Aberto: {new Date(ch.data_abertura).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}