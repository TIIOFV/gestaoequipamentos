import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Filter, Clock, Calendar, Wrench, Paperclip, FileText, CheckCircle2, AlertTriangle, Monitor, ChevronRight, Ticket } from 'lucide-react'
import { Skeleton } from '../../../components/ui/Skeleton'
import Paginacao from '../../../components/Paginacao'

const formatDataSegura = (dataString) => {
  if (!dataString) return '-';
  const apenasData = dataString.split('T')[0];
  const [ano, mes, dia] = apenasData.split('-');
  return `${dia}/${mes}/${ano}`;
}

export default function ChamadosList({ chamados, loading, auxiliares, setView, setChamadoSelecionado }) {
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroPrestador, setFiltroPrestador] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState('') 

  const [paginaAtual, setPaginaAtual] = useState(1);
  const ITENS_POR_PAGINA = 15;

  useEffect(() => {
    setPaginaAtual(1); 
  }, [busca, filtroTipo, filtroStatus, filtroPrestador, filtroPeriodo]);

  useEffect(() => {
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [paginaAtual]);

  const isPDF = (url) => url?.toLowerCase().includes('.pdf')

  const chamadosFiltrados = useMemo(() => {
    return chamados.filter(ch => {
      const term = busca.toLowerCase()
      const matchBusca = (ch.equipamento?.nome || '').toLowerCase().includes(term) || 
                         (ch.protocolo_externo || '').toLowerCase().includes(term) || 
                         (ch.descricao || '').toLowerCase().includes(term)

      const matchTipo = filtroTipo === '' || ch.tipo_intervencao === filtroTipo
      const matchStatus = filtroStatus === '' || ch.status_id === filtroStatus
      const matchPrestador = filtroPrestador === '' || ch.prestador_id === filtroPrestador
      
      let matchPeriodo = true;
      if (filtroPeriodo !== '') {
        const hoje = new Date();
        const hojeStr = hoje.toISOString().split('T')[0];
        
        if (filtroPeriodo === 'atrasados') {
          matchPeriodo = ch.status?.nome !== 'Concluído' && ch.data_prevista && ch.data_prevista < hojeStr;
        } else {
          const dataRef = ch.data_abertura ? new Date(ch.data_abertura) : new Date(ch.created_at);
          if (filtroPeriodo === 'hoje') {
            matchPeriodo = dataRef.toISOString().split('T')[0] === hojeStr;
          } else if (filtroPeriodo === 'semana') {
            const umaSemanaAtras = new Date();
            umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);
            matchPeriodo = dataRef >= umaSemanaAtras;
          } else if (filtroPeriodo === 'mes') {
            matchPeriodo = dataRef.getMonth() === hoje.getMonth() && dataRef.getFullYear() === hoje.getFullYear();
          }
        }
      }
      
      return matchBusca && matchTipo && matchStatus && matchPrestador && matchPeriodo
    })
  }, [chamados, busca, filtroTipo, filtroStatus, filtroPrestador, filtroPeriodo]);

  return (
    <div className="w-full space-y-6 min-w-0">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm w-full overflow-hidden">
        <div className="flex-1 min-w-0 pr-0 md:pr-4">
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 flex items-center gap-3 tracking-tight uppercase truncate">
            <Ticket className="text-indigo-600 shrink-0" size={32} /> Central de O.S
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1 truncate">Gestão, histórico e controlo de intervenções técnicas.</p>
        </div>
        <button onClick={() => setView('novo')} className="w-full md:w-auto shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4 md:mt-0">
          <Plus size={20} /> Abrir Nova OS
        </button>
      </div>

      <div className="bg-white p-5 md:p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-5 min-w-0 w-full">
        <div className="relative w-full min-w-0">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Buscar por equipamento, protocolo externo ou palavra-chave..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full pl-12 pr-5 py-4 text-sm md:text-base bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all shadow-inner" />
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] min-w-0 w-full items-center pt-2 border-t border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-1.5 shrink-0">
            <Filter size={14}/> Filtros
          </span>
          
          <select value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value)} className={`flex-1 min-w-[140px] px-4 py-3 border rounded-xl outline-none focus:ring-2 text-xs font-bold transition-all cursor-pointer shrink-0 ${filtroPeriodo === 'atrasados' ? 'bg-red-50 border-red-200 text-red-700 focus:ring-red-500 shadow-sm' : 'bg-white border-slate-200 text-slate-700 focus:ring-indigo-500'}`}>
            <option value="">Histórico Completo</option>
            <option value="hoje">Abertos Hoje</option>
            <option value="semana">Últimos 7 dias</option>
            <option value="mes">Este Mês</option>
            <option value="atrasados">🚨 Atrasados / Vencidos</option>
          </select>

          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="flex-1 min-w-[140px] px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-700 cursor-pointer shrink-0">
            <option value="">Qualquer Intervenção</option>
            <option value="Corretiva">Corretiva</option>
            <option value="Preventiva">Preventiva</option>
            <option value="Calibração">Calibração</option>
            <option value="Qualificação">Qualificação</option>
          </select>

          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="flex-1 min-w-[140px] px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-700 cursor-pointer shrink-0">
            <option value="">Qualquer Status</option>
            {auxiliares.status.map(st => <option key={st.id} value={st.id}>{st.nome}</option>)}
          </select>

          <select value={filtroPrestador} onChange={(e) => setFiltroPrestador(e.target.value)} className="flex-1 min-w-[140px] px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-700 cursor-pointer shrink-0">
            <option value="">Qualquer Prestador</option>
            <option value="Interno">Manutenção Interna</option>
            {auxiliares.prestadores.map(pr => <option key={pr.id} value={pr.id}>{pr.nome}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 w-full min-w-0">
        {loading ? (
           [1, 2, 3].map(i => (
            <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center">
              <div className="space-y-3 w-full xl:w-2/3">
                <Skeleton className="h-6 w-3/4 md:w-1/2" />
                <Skeleton className="h-4 w-full md:w-2/3" />
              </div>
              <Skeleton className="h-10 w-full xl:w-48 rounded-xl shrink-0" />
            </div>
          ))
        ) : chamadosFiltrados.length === 0 ? (
          <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-[2rem] border border-slate-200 border-dashed flex flex-col items-center">
            <Ticket size={48} className="mb-4 opacity-50 text-slate-300" />
            <span className="font-bold text-lg">Nenhuma OS encontrada para estes filtros.</span>
          </div>
        ) : (
          <>
            {chamadosFiltrados
              .slice((paginaAtual - 1) * ITENS_POR_PAGINA, paginaAtual * ITENS_POR_PAGINA)
              .map((ch) => {
                const temPDF = ch.anexos && ch.anexos.some(a => isPDF(a));
                const qtdAnexos = ch.anexos ? ch.anexos.length : 0;
                
                let tituloData = 'Aberto:'
                let valorData = formatDataSegura(ch.data_abertura)
                let corData = 'text-slate-500'
                let IconeData = Clock

                const hojeStr = new Date().toISOString().split('T')[0];
                const estaAtrasado = ch.status?.nome !== 'Concluído' && ch.data_prevista && ch.data_prevista < hojeStr;

                if (ch.status?.nome === 'Concluído' && ch.data_conclusao) {
                  tituloData = 'Concluído:'
                  valorData = formatDataSegura(ch.data_conclusao)
                  corData = 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                  IconeData = CheckCircle2
                } else if (ch.data_prevista && ch.status?.nome !== 'Concluído') {
                  tituloData = 'Previsão:'
                  valorData = formatDataSegura(ch.data_prevista)
                  corData = estaAtrasado ? 'text-red-700 font-bold bg-red-50 border border-red-200' : 'text-blue-700 bg-blue-50 border border-blue-200'
                  IconeData = estaAtrasado ? AlertTriangle : Calendar
                } else {
                  corData = 'text-slate-600 bg-slate-50 border border-slate-200'
                }

                return (
                  <div 
                    key={ch.id} 
                    onClick={() => { setChamadoSelecionado(ch); setView('detalhes'); }}
                    className="bg-white p-5 md:p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col xl:flex-row gap-5 xl:gap-8 items-start xl:items-center justify-between group cursor-pointer relative overflow-hidden min-w-0"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${ch.status?.nome === 'Concluído' ? 'bg-emerald-400' : ch.status?.nome === 'Aberto' ? 'bg-amber-400' : 'bg-blue-400'}`}></div>

                    <div className="flex-1 w-full pl-2 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2.5 min-w-0">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border truncate ${ch.tipo_intervencao === 'Preventiva' ? 'bg-green-50 text-green-700 border-green-200' : ch.tipo_intervencao === 'Calibração' ? 'bg-blue-50 text-blue-700 border-blue-200' : ch.tipo_intervencao === 'Qualificação' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                          {ch.tipo_intervencao || 'Corretiva'}
                        </span>
                        
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg shrink-0">
                          OS #{ch.id}
                        </span>
                        
                        {ch.status?.nome && (
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border flex items-center gap-1.5 truncate ${ch.status.nome === 'Concluído' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ch.status.nome === 'Aberto' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ch.status.nome === 'Concluído' ? 'bg-emerald-500' : ch.status.nome === 'Aberto' ? 'bg-amber-500' : 'bg-indigo-500'}`}></div>
                            {ch.status.nome}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mb-1 min-w-0 w-full">
                        <Monitor size={16} className="text-slate-400 shrink-0" />
                        <h3 className="font-black text-slate-800 text-lg md:text-xl uppercase tracking-tight truncate group-hover:text-indigo-700 transition-colors w-full block">
                          {ch.equipamento?.nome || 'Equipamento Excluído'}
                        </h3>
                      </div>
                      
                      <p className="text-slate-500 text-sm font-medium line-clamp-2 md:line-clamp-1 pl-6 leading-relaxed w-full break-words">
                        {ch.descricao}
                      </p>
                    </div>

                    <div className="w-full xl:w-auto flex flex-wrap xl:flex-col items-center xl:items-end justify-between xl:justify-center gap-3 shrink-0 pl-2 xl:pl-0 border-t xl:border-t-0 border-slate-100 pt-4 xl:pt-0">
                      
                      <div className="flex items-center gap-3 w-full xl:w-auto xl:justify-end">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold ${corData} shrink-0`}>
                          <IconeData size={14} className="shrink-0" /> 
                          {estaAtrasado ? <span className="uppercase tracking-wider">Atrasada ({valorData})</span> : <span className="truncate">{tituloData} {valorData}</span>}
                        </div>
                        
                        {qtdAnexos > 0 && (
                          <div className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border shadow-sm shrink-0 ${temPDF ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                            {temPDF ? <FileText size={14} /> : <Paperclip size={14} />} {qtdAnexos}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between w-full xl:w-auto xl:justify-end gap-4 text-xs font-bold text-slate-400 min-w-0">
                        <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 truncate">
                          <Wrench size={12} className="text-slate-400 shrink-0" /> <span className="truncate">{ch.prestador?.nome || 'Manutenção Interna'}</span>
                        </span>
                        
                        <div className="hidden xl:flex w-8 h-8 rounded-full bg-slate-50 text-slate-400 items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm shrink-0">
                          <ChevronRight size={16} />
                        </div>
                      </div>

                    </div>
                  </div>
                )
              })}
            
            <Paginacao 
              paginaAtual={paginaAtual} 
              totalItens={chamadosFiltrados.length} 
              itensPorPagina={ITENS_POR_PAGINA} 
              setPaginaAtual={setPaginaAtual} 
            />
          </>
        )}
      </div>
    </div>
  )
}