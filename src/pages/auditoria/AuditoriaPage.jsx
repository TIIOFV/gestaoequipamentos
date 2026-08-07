import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ShieldCheck, Search, Filter, Clock, Activity, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LogsAuditoriaPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroAcao, setFiltroAcao] = useState('Todas')
  const [filtroModulo, setFiltroModulo] = useState('Todos')

  useEffect(() => {
    carregarLogs()
  }, [])

  const carregarLogs = async () => {
    setLoading(true)
    try {
      // Trazemos os últimos 300 logs para não sobrecarregar a tela
      const { data, error } = await supabase
        .from('logs_auditoria')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300)

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      toast.error('Erro ao carregar o registo de auditoria.')
    } finally {
      setLoading(false)
    }
  }

  // 🚀 Lógica de Cores para as Tags de Ação
  const getCorAcao = (acao) => {
    const a = acao.toUpperCase();
    if (a.includes('EXCLU') || a.includes('DELETE')) return 'bg-red-50 text-red-600 border-red-200';
    if (a.includes('CRI') || a.includes('NOVO') || a.includes('INSERT')) return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    if (a.includes('EDIT') || a.includes('ATUALIZ') || a.includes('UPDATE')) return 'bg-blue-50 text-blue-600 border-blue-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  }

  // Extrair listas únicas para os filtros
  const acoesDisponiveis = [...new Set(logs.map(l => l.acao.toUpperCase()))]
  const modulosDisponiveis = [...new Set(logs.map(l => l.modulo))]

  const dadosFiltrados = logs.filter(log => {
    const matchBusca = log.usuario_nome.toLowerCase().includes(busca.toLowerCase()) || 
                       log.detalhes.toLowerCase().includes(busca.toLowerCase())
    const matchAcao = filtroAcao === 'Todas' || log.acao.toUpperCase() === filtroAcao
    const matchModulo = filtroModulo === 'Todos' || log.modulo === filtroModulo

    return matchBusca && matchAcao && matchModulo
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <ShieldCheck className="text-indigo-600" size={28} /> Auditoria do Sistema
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-1">Rastreabilidade completa de ações críticas, edições e exclusões.</p>
        </div>
        <div className="bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 text-indigo-700 text-sm font-bold flex items-center gap-2">
          <Activity size={16}/> Central de Segurança
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative w-full lg:flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por utilizador ou detalhe da ação..." 
            value={busca} 
            onChange={(e) => setBusca(e.target.value)} 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium transition-all" 
          />
        </div>

        <div className="flex w-full lg:w-auto gap-3">
          <div className="flex-1 lg:w-48">
            <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1"><Filter size={12}/> Tipo de Ação</label>
            <select value={filtroAcao} onChange={e => setFiltroAcao(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="Todas">Todas as Ações</option>
              {acoesDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex-1 lg:w-48">
            <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1"><Filter size={12}/> Módulo</label>
            <select value={filtroModulo} onChange={e => setFiltroModulo(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="Todos">Todos os Módulos</option>
              {modulosDisponiveis.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* TABELA DE LOGS */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="font-bold">A investigar registos...</p>
          </div>
        ) : dadosFiltrados.length === 0 ? (
          <div className="p-16 text-center text-slate-500 font-medium bg-slate-50">
            Nenhum registo de auditoria encontrado com estes filtros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider w-48"><div className="flex items-center gap-2"><Clock size={14}/> Data / Hora</div></th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider w-48">Agente / Utilizador</th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider w-32">Módulo</th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider w-40">Ação</th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider"><div className="flex items-center gap-2"><FileText size={14}/> Rastreio Técnico</div></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dadosFiltrados.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="text-sm font-black text-slate-700">{new Date(log.created_at).toLocaleDateString('pt-BR')}</div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5">{new Date(log.created_at).toLocaleTimeString('pt-BR')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-800">{log.usuario_nome}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                        {log.modulo}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border flex w-fit ${getCorAcao(log.acao)}`}>
                        {log.acao}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-600 leading-relaxed max-w-2xl">{log.detalhes}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
} 