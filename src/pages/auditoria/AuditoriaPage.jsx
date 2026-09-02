import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { ShieldCheck, Search, Filter, Clock, Activity, FileText, Download, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import Paginacao from '../../components/Paginacao'

const buscarLogsPaginados = async ({ pagina, busca, acao, modulo, dataInicio, dataFim }) => {
  const ITENS_POR_PAGINA = 15;
  const from = (pagina - 1) * ITENS_POR_PAGINA;
  const to = from + ITENS_POR_PAGINA - 1;

  let query = supabase
    .from('logs_auditoria')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (busca) query = query.or(`usuario_nome.ilike.%${busca}%,detalhes.ilike.%${busca}%`);
  if (acao !== 'Todas') query = query.eq('acao', acao);
  if (modulo !== 'Todos') query = query.eq('modulo', modulo);
  if (dataInicio) query = query.gte('created_at', new Date(`${dataInicio}T00:00:00`).toISOString());
  if (dataFim) query = query.lte('created_at', new Date(`${dataFim}T23:59:59`).toISOString());

  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;
  
  return { itens: data || [], total: count || 0 };
}

const buscarFiltrosDisponiveis = async () => {
  const { data, error } = await supabase.from('logs_auditoria').select('acao, modulo');
  if (error) return { acoes: [], modulos: [] };

  const acoesUnicas = [...new Set(data.map(l => l.acao.toUpperCase()))].sort();
  const modulosUnicos = [...new Set(data.map(l => l.modulo))].sort();

  return { acoes: acoesUnicas, modulos: modulosUnicos };
}

export default function LogsAuditoriaPage() {
  const [buscaLocal, setBuscaLocal] = useState('')
  const [buscaAtiva, setBuscaAtiva] = useState('')
  const [filtroAcao, setFiltroAcao] = useState('Todas')
  const [filtroModulo, setFiltroModulo] = useState('Todos')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [exportando, setExportando] = useState(false);
  
  const ITENS_POR_PAGINA = 15;

  useEffect(() => {
    const timeoutId = setTimeout(() => setBuscaAtiva(buscaLocal), 500);
    return () => clearTimeout(timeoutId);
  }, [buscaLocal]);

  const { data: auxiliares = { acoes: [], modulos: [] } } = useQuery({
    queryKey: ['auditoria_filtros'],
    queryFn: buscarFiltrosDisponiveis,
    staleTime: 1000 * 60 * 30
  })

  const { 
    data: dadosTabela = { itens: [], total: 0 }, 
    isPending: loading,
    isFetching
  } = useQuery({
    queryKey: ['auditoria', paginaAtual, buscaAtiva, filtroAcao, filtroModulo, dataInicio, dataFim],
    queryFn: () => buscarLogsPaginados({ pagina: paginaAtual, busca: buscaAtiva, acao: filtroAcao, modulo: filtroModulo, dataInicio, dataFim }),
    placeholderData: keepPreviousData
  })

  useEffect(() => { setPaginaAtual(1); }, [buscaAtiva, filtroAcao, filtroModulo, dataInicio, dataFim]);

  useEffect(() => {
    const mainContent = document.querySelector('main');
    if (mainContent) mainContent.scrollTo({ top: 0, behavior: 'smooth' });
  }, [paginaAtual]);

  const getCorAcao = (acao) => {
    const a = acao.toUpperCase();
    if (a.includes('EXCLU') || a.includes('DELETE') || a.includes('REJEIT')) return 'bg-red-50 text-red-600 border-red-200';
    if (a.includes('CRI') || a.includes('NOVO') || a.includes('INSERT')) return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    if (a.includes('EDIT') || a.includes('ATUALIZ') || a.includes('UPDATE')) return 'bg-blue-50 text-blue-600 border-blue-200';
    if (a.includes('STATUS') || a.includes('SLA') || a.includes('PAUSA')) return 'bg-purple-50 text-purple-600 border-purple-200';
    if (a.includes('TICKET') || a.includes('ASSUMI')) return 'bg-amber-50 text-amber-600 border-amber-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  }

  const exportarCSV = async () => {
    setExportando(true);
    const toastId = toast.loading('A compilar relatório CSV...');
    try {
      let query = supabase.from('logs_auditoria').select('*').order('created_at', { ascending: false }).limit(2000);
      if (buscaAtiva) query = query.or(`usuario_nome.ilike.%${buscaAtiva}%,detalhes.ilike.%${buscaAtiva}%`);
      if (filtroAcao !== 'Todas') query = query.eq('acao', filtroAcao);
      if (filtroModulo !== 'Todos') query = query.eq('modulo', filtroModulo);
      if (dataInicio) query = query.gte('created_at', new Date(`${dataInicio}T00:00:00`).toISOString());
      if (dataFim) query = query.lte('created_at', new Date(`${dataFim}T23:59:59`).toISOString());

      const { data, error } = await query;
      if (error) throw error;
      
      if (!data || data.length === 0) { toast.error('Nenhum dado para exportar.', { id: toastId }); return; }

      const headers = ['Data', 'Hora', 'Usuário', 'Módulo', 'Ação', 'Detalhes'];
      const csvContent = [
        headers.join(';'),
        ...data.map(log => [
          new Date(log.created_at).toLocaleDateString('pt-BR'),
          new Date(log.created_at).toLocaleTimeString('pt-BR'),
          `"${log.usuario_nome}"`,
          `"${log.modulo}"`,
          `"${log.acao}"`,
          `"${log.detalhes.replace(/"/g, '""')}"`
        ].join(';'))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `auditoria_iofv_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Relatório exportado com sucesso!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Falha ao exportar dados.', { id: toastId });
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="w-full mx-auto space-y-6 animate-in fade-in duration-500 pb-10 min-w-0">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm w-full min-w-0 overflow-hidden">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 flex items-center gap-3 tracking-tight uppercase truncate max-w-full">
            <ShieldCheck className="text-indigo-600 shrink-0" size={32} /> Auditoria do Sistema
          </h1>
          <p className="text-sm md:text-base font-semibold text-slate-500 mt-1 truncate max-w-full">Rastreabilidade completa de ações críticas, edições e exclusões.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto mt-2 md:mt-0">
          <div className="bg-indigo-50 px-5 py-3 rounded-xl border border-indigo-100 text-indigo-700 text-sm font-bold flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto">
            <Activity size={18} className="shrink-0"/> <span className="truncate">Central de Segurança</span>
          </div>
          <button onClick={exportarCSV} disabled={exportando} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors w-full sm:w-auto disabled:opacity-50">
            <Download size={18} className="shrink-0"/> Exportar CSV
          </button>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-5 items-start lg:items-center w-full min-w-0 relative overflow-hidden">
        {isFetching && <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-100"><div className="w-1/3 h-full bg-indigo-500 animate-[pulse_1s_ease-in-out_infinite]"></div></div>}
        
        <div className="relative w-full lg:flex-1 min-w-0">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por utilizador ou detalhe da ação..." 
            value={buscaLocal} 
            onChange={(e) => setBuscaLocal(e.target.value)} 
            className="w-full pl-12 pr-5 py-3.5 text-sm md:text-base bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all shadow-inner" 
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 w-full lg:w-auto gap-4 shrink-0 min-w-0">
          <div className="col-span-2 md:col-span-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2 truncate"><Calendar size={12} className="shrink-0"/> Data Inicial</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2 truncate"><Calendar size={12} className="shrink-0"/> Data Final</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2 truncate"><Filter size={12} className="shrink-0"/> Ação</label>
            <select value={filtroAcao} onChange={e => setFiltroAcao(e.target.value)} className="w-full px-3 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-[11px] md:text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
              <option value="Todas">Todas as Ações</option>
              {auxiliares.acoes.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2 truncate"><Filter size={12} className="shrink-0"/> Módulo</label>
            <select value={filtroModulo} onChange={e => setFiltroModulo(e.target.value)} className="w-full px-3 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-[11px] md:text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
              <option value="Todos">Todos os Módulos</option>
              {auxiliares.modulos.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden w-full min-w-0">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-indigo-600"></div>
            <p className="font-bold uppercase tracking-widest">A investigar registos...</p>
          </div>
        ) : dadosTabela.itens.length === 0 ? (
          <div className="p-20 text-center text-slate-500 font-bold bg-slate-50 text-lg">
            Nenhum registo de auditoria encontrado com estes filtros.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
              {dadosTabela.itens.map((log) => (
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

            <div className="hidden md:block overflow-x-auto w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-6 py-5 font-black text-[11px] uppercase tracking-widest w-48 whitespace-nowrap"><div className="flex items-center gap-2"><Clock size={14} className="shrink-0"/> Data / Hora</div></th>
                    <th className="px-6 py-5 font-black text-[11px] uppercase tracking-widest w-48 whitespace-nowrap">Agente / Utilizador</th>
                    <th className="px-6 py-5 font-black text-[11px] uppercase tracking-widest w-32 whitespace-nowrap">Módulo</th>
                    <th className="px-6 py-5 font-black text-[11px] uppercase tracking-widest w-40 whitespace-nowrap">Ação</th>
                    <th className="px-6 py-5 font-black text-[11px] uppercase tracking-widest w-auto"><div className="flex items-center gap-2"><FileText size={14} className="shrink-0"/> Rastreio Técnico</div></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dadosTabela.itens.map((log) => (
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
                      <td className="px-6 py-4 w-full">
                        <p className="text-sm font-semibold text-slate-600 leading-relaxed break-words whitespace-normal">{log.detalhes}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-slate-200">
              <Paginacao paginaAtual={paginaAtual} totalItens={dadosTabela.total} itensPorPagina={ITENS_POR_PAGINA} setPaginaAtual={setPaginaAtual} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}