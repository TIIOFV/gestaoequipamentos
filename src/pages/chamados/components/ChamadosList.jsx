import { useState } from 'react'
import { Plus, Search, Filter, Clock, Calendar, Wrench, Paperclip, FileText, CheckCircle2 } from 'lucide-react'

// Função auxiliar antibug de fuso horário
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

  const isPDF = (url) => url?.toLowerCase().includes('.pdf')

  const chamadosFiltrados = chamados.filter(ch => {
    const term = busca.toLowerCase()
    const matchBusca = (ch.equipamento?.nome || '').toLowerCase().includes(term) || 
                       (ch.protocolo_externo || '').toLowerCase().includes(term) || 
                       (ch.descricao || '').toLowerCase().includes(term)

    const matchTipo = filtroTipo === '' || ch.tipo_intervencao === filtroTipo
    const matchStatus = filtroStatus === '' || ch.status_id === filtroStatus
    const matchPrestador = filtroPrestador === '' || ch.prestador_id === filtroPrestador
    
    return matchBusca && matchTipo && matchStatus && matchPrestador
  })

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">Chamados e OS</h1>
          <p className="text-sm md:text-base text-slate-500 mt-1">Gerencie as corretivas, preventivas, calibrações e qualificações.</p>
        </div>
        <button onClick={() => setView('novo')} className="w-full md:w-auto bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
          <Plus size={20} /> Novo chamado
        </button>
      </div>

      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Buscar por equipamento, protocolo externo ou descrição..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full pl-11 md:pl-12 pr-4 py-3 md:py-3.5 text-sm md:text-base bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
          <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1 shrink-0"><Filter size={14}/> Filtros:</span>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="w-auto min-w-[140px] shrink-0 px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-700">
            <option value="">Tipo de Serviço</option>
            <option value="Corretiva">Corretiva</option><option value="Preventiva">Preventiva</option><option value="Calibração">Calibração</option><option value="Qualificação">Qualificação</option>
          </select>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="w-auto min-w-[140px] shrink-0 px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-700">
            <option value="">Status da OS</option>
            {auxiliares.status.map(st => <option key={st.id} value={st.id}>{st.nome}</option>)}
          </select>
          <select value={filtroPrestador} onChange={(e) => setFiltroPrestador(e.target.value)} className="w-auto min-w-[140px] shrink-0 px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-700">
            <option value="">Empresa/Prestador</option><option value="Interno">Manutenção Interna</option>
            {auxiliares.prestadores.map(pr => <option key={pr.id} value={pr.id}>{pr.nome}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-center py-10 text-slate-500 font-medium">Carregando chamados...</div>
        ) : chamadosFiltrados.length === 0 ? (
          <div className="text-center py-10 text-slate-500 font-medium bg-white rounded-2xl border border-slate-100">Nenhum chamado encontrado.</div>
        ) : chamadosFiltrados.map((ch) => {
          const temPDF = ch.anexos && ch.anexos.some(a => isPDF(a));
          
          // --- NOVA LÓGICA INTELIGENTE DE DATAS ---
          let tituloData = 'Aberto:'
          let valorData = formatDataSegura(ch.data_abertura)
          let corData = 'text-slate-500'
          let IconeData = Clock

          if (ch.status?.nome === 'Concluído' && ch.data_conclusao) {
            tituloData = 'Concluído:'
            valorData = formatDataSegura(ch.data_conclusao)
            corData = 'text-emerald-600'
            IconeData = CheckCircle2
          } else if (ch.data_prevista && ch.status?.nome !== 'Concluído') {
            tituloData = 'Agendado:'
            valorData = formatDataSegura(ch.data_prevista)
            corData = 'text-blue-600'
            IconeData = Calendar
          }

          return (
            <div key={ch.id} className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-4 items-start md:items-center justify-between group">
              <div className="flex-1 w-full">
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                  <span className={`text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-md border ${ch.tipo_intervencao === 'Preventiva' ? 'bg-green-50 text-green-700 border-green-200' : ch.tipo_intervencao === 'Calibração' ? 'bg-blue-50 text-blue-700 border-blue-200' : ch.tipo_intervencao === 'Qualificação' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{ch.tipo_intervencao || 'Corretiva'}</span>
                  <span className="font-bold text-slate-800 text-base md:text-lg">{ch.equipamento?.nome || 'Equipamento Excluído'}</span>
                  <span className="bg-slate-100 text-slate-600 text-[10px] md:text-xs px-2 py-1 rounded font-mono border border-slate-200">#{ch.equipamento?.patrimonio || 'S/N'}</span>
                  <span className={`text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-full border ${ch.status?.nome === 'Concluído' ? 'bg-green-50 text-green-700 border-green-200' : ch.status?.nome === 'Aberto' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{ch.status?.nome}</span>
                  {ch.anexos?.length > 0 && (
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border shadow-sm ${temPDF ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {temPDF ? <FileText size={12} /> : <Paperclip size={12} />} {ch.anexos.length}
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-xs md:text-sm line-clamp-2 md:line-clamp-1 mt-1">{ch.descricao}</p>
                <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-3 text-[11px] md:text-xs font-medium text-slate-400">
                  
                  {/* DATA RENDERIZADA DINAMICAMENTE */}
                  <div className={`flex items-center gap-1 ${corData}`}>
                    <IconeData size={12} /> {tituloData} {valorData}
                  </div>
                  
                  <div className="flex items-center gap-1"><Wrench size={12} /> {ch.prestador?.nome || 'Interno'}</div>
                </div>
              </div>
              <button onClick={() => { setChamadoSelecionado(ch); setView('detalhes'); }} className="w-full md:w-auto px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors whitespace-nowrap">Ver detalhes</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}