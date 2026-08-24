import { ChevronLeft, ChevronRight, Filter } from 'lucide-react'

export default function AgendaCalendario({ 
  ano, mes, dataAtual, tituloMes, diasDoCalendario, eventosFiltrados, 
  mudarAno, mudarMes, irParaHoje, setDiaSelecionado, getCorEvento,
  filtroResponsavel, setFiltroResponsavel, responsaveis
}) {
  return (
    <div className="space-y-6">
      {/* FILTROS */}
      <div className="bg-white p-5 md:p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-4 w-full">
        <div className="flex items-center justify-between w-full sm:w-auto bg-slate-50 p-2 rounded-2xl border border-slate-200 shrink-0">
          <button onClick={() => mudarAno(-1)} className="p-2 hover:bg-white rounded-xl transition-colors shadow-sm"><ChevronLeft size={20}/></button>
          <span className="font-black text-xl text-slate-800 tracking-wider min-w-[80px] text-center">{ano}</span>
          <button onClick={() => mudarAno(1)} className="p-2 hover:bg-white rounded-xl transition-colors shadow-sm"><ChevronRight size={20}/></button>
        </div>
        
        <div className="w-full relative flex-1">
          <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <select 
            value={filtroResponsavel}
            onChange={(e) => setFiltroResponsavel(e.target.value)}
            className="w-full pl-11 pr-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 hover:bg-white transition-colors text-sm font-bold text-slate-700 cursor-pointer"
          >
            <option value="Todos">Todos os técnicos / responsáveis</option>
            {responsaveis.map(resp => <option key={resp.id} value={resp.id}>{resp.nome}</option>)}
          </select>
        </div>
      </div>

      {/* 🚀 LEGENDA CORRIGIDA: Usa flex-wrap em vez de scroll horizontal */}
      <div className="bg-white p-4 md:p-6 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 w-full">
          <span className="px-3 md:px-4 py-2 bg-[#009e49] text-white text-[10px] md:text-xs font-black uppercase tracking-wider rounded-xl shadow-sm">Prev. Agendada</span>
          <span className="px-3 md:px-4 py-2 bg-[#1a5ce5] text-white text-[10px] md:text-xs font-black uppercase tracking-wider rounded-xl shadow-sm">Calib. Agendada</span>
          <span className="px-3 md:px-4 py-2 bg-purple-600 text-white text-[10px] md:text-xs font-black uppercase tracking-wider rounded-xl shadow-sm">Quali. Agendada</span>
          <span className="px-3 md:px-4 py-2 bg-[#d82128] text-white text-[10px] md:text-xs font-black uppercase tracking-wider rounded-xl shadow-sm">Corr. Agendada</span>
          
          <div className="hidden lg:block w-px h-6 bg-slate-200 shrink-0 mx-2"></div>
          
          <span className="px-3 md:px-4 py-2 bg-[#bcf0cf] text-[#006b31] text-[10px] md:text-xs font-black uppercase tracking-wider rounded-xl border border-[#009e49]/20">Prev. Realizada</span>
          <span className="px-3 md:px-4 py-2 bg-[#b8d1ff] text-[#103a94] text-[10px] md:text-xs font-black uppercase tracking-wider rounded-xl border border-[#1a5ce5]/20">Calib. Realizada</span>
          <span className="px-3 md:px-4 py-2 bg-purple-100 text-purple-800 text-[10px] md:text-xs font-black uppercase tracking-wider rounded-xl border border-purple-600/20">Quali. Realizada</span>
          <span className="px-3 md:px-4 py-2 bg-[#ffc2c4] text-[#8c1216] text-[10px] md:text-xs font-black uppercase tracking-wider rounded-xl border border-[#d82128]/20">Corr. Realizada</span>
        </div>
      </div>

      {/* GRADE DO CALENDÁRIO */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-center p-5 md:p-8 border-b border-slate-100 bg-slate-50/50 gap-4">
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">{tituloMes}</h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button onClick={irParaHoje} className="flex-1 sm:flex-none px-5 py-3 md:py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-black uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95 text-xs md:text-sm">Hoje</button>
            <div className="flex items-center bg-[#1e293b] text-white rounded-xl overflow-hidden shadow-sm shrink-0">
              <button onClick={() => mudarMes(-1)} className="p-3 md:p-3.5 hover:bg-slate-700 transition-colors active:scale-95"><ChevronLeft size={20} /></button>
              <button onClick={() => mudarMes(1)} className="p-3 md:p-3.5 hover:bg-slate-700 transition-colors border-l border-slate-700 active:scale-95"><ChevronRight size={20} /></button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-100 bg-white">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
            <div key={dia} className="py-3 md:py-4 text-center text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 last:border-0">{dia}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-fr bg-white">
          {diasDoCalendario.map((diaObj, index) => {
            const hojeLocal = new Date();
            const hojeStr = `${hojeLocal.getFullYear()}-${String(hojeLocal.getMonth() + 1).padStart(2, '0')}-${String(hojeLocal.getDate()).padStart(2, '0')}`;
            const isHoje = diaObj?.dataCompleta === hojeStr;
            const eventosNesteDia = diaObj ? eventosFiltrados.filter(m => m.dataPlotagem === diaObj.dataCompleta) : [];
            
            return (
              <div 
                key={index} 
                onClick={() => diaObj && setDiaSelecionado(diaObj.dataCompleta)}
                className={`min-h-[70px] md:min-h-[140px] p-1.5 md:p-2 border-b border-r border-slate-100 last:border-r-0 relative group transition-colors ${diaObj ? 'cursor-pointer' : ''} ${isHoje ? 'bg-blue-50/40 hover:bg-blue-50/80' : 'hover:bg-slate-50'}`}
              >
                {diaObj && (
                  <>
                    <div className="flex justify-center md:justify-end mb-1 md:mb-2">
                      <span className={`flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full text-xs md:text-sm font-bold transition-all ${isHoje ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 group-hover:text-slate-800'}`}>
                        {diaObj.dia}
                      </span>
                    </div>
                    
                    <div className="flex flex-row flex-wrap md:flex-col justify-center md:justify-start gap-1 md:gap-1.5 px-0.5 md:px-1 overflow-hidden">
                      {eventosNesteDia.map(evento => {
                        const corClasse = getCorEvento(evento.tipo_intervencao, evento.status?.nome);
                        return (
                          <div 
                            key={evento.id}
                            className={`rounded-full md:rounded-md shadow-sm border border-black/5 ${corClasse} 
                                        w-2 h-2 md:w-auto md:h-auto md:px-2 md:py-1.5 md:text-[10px] xl:text-xs truncate font-bold`}
                            title={`${evento.tipo_intervencao}: ${evento.equipamento?.patrimonio || 'S/N'}`}
                          >
                            <span className="hidden md:inline">
                              <span className="xl:hidden">{evento.tipo_intervencao?.substring(0, 4)}: </span>
                              <span className="hidden xl:inline">{evento.tipo_intervencao}: </span>
                              {evento.equipamento?.patrimonio || 'S/N'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}