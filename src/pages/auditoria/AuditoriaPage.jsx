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

  const getCorAcao = (acao) => {
    const a = acao.toUpperCase();
    if (a.includes('EXCLU') || a.includes('DELETE')) return 'bg-red-50 text-red-600 border-red-200';
    if (a.includes('CRI') || a.includes('NOVO') || a.includes('INSERT')) return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    if (a.includes('EDIT') || a.includes('ATUALIZ') || a.includes('UPDATE')) return 'bg-blue-50 text-blue-600 border-blue-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  }

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
    <div className="w-full mx-auto space-y-6 animate-in fade-in duration-500 pb-10 min-w-0">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm w-full min-w-0 overflow-hidden">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 flex items-center gap-3 tracking-tight uppercase truncate max-w-full">
            <ShieldCheck className="text-indigo-600 shrink-0" size={32} /> Auditoria do Sistema
          </h1>
          <p className="text-sm md:text-base font-semibold text-slate-500 mt-1 truncate max-w-full">Rastreabilidade completa de ações críticas, edições e exclusões.</p>
        </div>
        <div className="bg-indigo-50 px-5 py-3 rounded-2xl border border-indigo-100 text-indigo-700 text-sm font-bold flex items-center justify-center gap-2 shrink-0 mt-2 md:mt-0 shadow-sm w-full md:w-auto">
          <Activity size={18} className="shrink-0"/> <span className="truncate">Central de Segurança</span>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-5 items-center w-full min-w-0">
        <div className="relative w-full lg:flex-1 min-w-0">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por utilizador ou detalhe da ação..." 
            value={busca} 
            onChange={(e) => setBusca(e.target.value)} 
            className="w-full pl-12 pr-5 py-4 text-sm md:text-base bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all shadow-inner" 
          />
        </div>

        <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-4 shrink-0 min-w-0">
          <div className="flex-1 sm:w-48 min-w-0">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2 truncate"><Filter size={12} className="shrink-0"/> Tipo de Ação</label>
            <select value={filtroAcao} onChange={e => setFiltroAcao(e.target.value)} className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-all">
              <option value="Todas">Todas as Ações</option>
              {acoesDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex-1 sm:w-48 min-w-0">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2 truncate"><Filter size={12} className="shrink-0"/> Módulo</label>
            <select value={filtroModulo} onChange={e => setFiltroModulo(e.target.value)} className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-all">
              <option value="Todos">Todos os Módulos</option>
              {modulosDisponiveis.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ÁREA DE RESULTADOS */}
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden w-full min-w-0">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-indigo-600"></div>
            <p className="font-bold uppercase tracking-widest">A investigar registos...</p>
          </div>
        ) : dadosFiltrados.length === 0 ? (
          <div className="p-20 text-center text-slate-500 font-bold bg-slate-50 text-lg">
            Nenhum registo de auditoria encontrado com estes filtros.
          </div>
        ) : (
          <>
            {/* 🚀 VISÃO MOBILE: CARTÕES */}
            <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
              {dadosFiltrados.map((log) => (
                <div key={log.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-black text-slate-800 truncate">{log.usuario_nome}</div>
                      <div className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1.5">
                        <Clock size={12} className="shrink-0" /> 
                        <span className="truncate">{new Date(log.created_at).toLocaleDateString('pt-BR')} às {new Date(log.created_at).toLocaleTimeString('pt-BR')}</span>
                      </div>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border shrink-0 flex items-center justify-center ${getCorAcao(log.acao)}`}>
                      {log.acao}
                    </span>
                  </div>
                  
                  <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100/50">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                      <FileText size={12}/> Detalhes da Ação
                    </span>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed break-words">{log.detalhes}</p>
                  </div>

                  <div className="flex items-center gap-2 mt-auto pt-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                      Módulo: {log.modulo}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 🚀 VISÃO DESKTOP: TABELA (Corrigida) */}
            <div className="hidden md:block overflow-x-auto w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {/* Removido o whitespace-nowrap min-w-max da table para permitir quebra de linha na última coluna */}
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    {/* Classes whitespace-nowrap aplicadas apenas nas colunas que não podem quebrar */}
                    <th className="px-6 py-5 font-black text-[11px] uppercase tracking-widest w-48 whitespace-nowrap"><div className="flex items-center gap-2"><Clock size={14} className="shrink-0"/> Data / Hora</div></th>
                    <th className="px-6 py-5 font-black text-[11px] uppercase tracking-widest w-48 whitespace-nowrap">Agente / Utilizador</th>
                    <th className="px-6 py-5 font-black text-[11px] uppercase tracking-widest w-32 whitespace-nowrap">Módulo</th>
                    <th className="px-6 py-5 font-black text-[11px] uppercase tracking-widest w-40 whitespace-nowrap">Ação</th>
                    <th className="px-6 py-5 font-black text-[11px] uppercase tracking-widest w-auto"><div className="flex items-center gap-2"><FileText size={14} className="shrink-0"/> Rastreio Técnico</div></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dadosFiltrados.map((log) => (
                    <tr key={log.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-black text-slate-700">{new Date(log.created_at).toLocaleDateString('pt-BR')}</div>
                        <div className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">{new Date(log.created_at).toLocaleTimeString('pt-BR')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-black text-slate-800">{log.usuario_nome}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                          {log.modulo}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border flex w-fit ${getCorAcao(log.acao)}`}>
                          {log.acao}
                        </span>
                      </td>
                      {/* O texto descritivo recebe permissão total para quebrar a linha */}
                      <td className="px-6 py-4 w-full">
                        <p className="text-sm font-semibold text-slate-600 leading-relaxed break-words whitespace-normal">{log.detalhes}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}