import { ChevronLeft, ChevronRight, Filter } from 'lucide-react'

export default function AgendaCalendario({ 
  ano, mes, dataAtual, tituloMes, diasDoCalendario, eventosFiltrados, 
  mudarAno, mudarMes, irParaHoje, setDiaSelecionado, getCorEvento,
  filtroResponsavel, setFiltroResponsavel, responsaveis
}) {
  return (
    <>
      {/* Controles do Calendário (Filtros de Responsável e Ano) */}
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full mb-4">
        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200 shrink-0">
          <button onClick={() => mudarAno(-1)} className="p-1 hover:bg-white rounded-lg transition-colors"><ChevronLeft size={20}/></button>
          <span className="font-black text-xl text-slate-800 tracking-wider min-w-[60px] text-center">{ano}</span>
          <button onClick={() => mudarAno(1)} className="p-1 hover:bg-white rounded-lg transition-colors"><ChevronRight size={20}/></button>
        </div>
        
        <div className="w-full sm:w-64 relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select 
            value={filtroResponsavel}
            onChange={(e) => setFiltroResponsavel(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm font-bold text-slate-700"
          >
            <option value="Todos">Todos os técnicos</option>
            {responsaveis.map(resp => <option key={resp.id} value={resp.id}>{resp.nome}</option>)}
          </select>
        </div>
      </div>

      {/* Legenda */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 w-full">
          <span className="px-2 md:px-3 py-2 bg-[#009e49] text-white text-[10px] md:text-xs font-bold rounded-lg text-center shadow-sm">Prev. Agendada</span>
          <span className="px-2 md:px-3 py-2 bg-[#1a5ce5] text-white text-[10px] md:text-xs font-bold rounded-lg text-center shadow-sm">Calib. Agendada</span>
          <span className="px-2 md:px-3 py-2 bg-purple-600 text-white text-[10px] md:text-xs font-bold rounded-lg text-center shadow-sm">Quali. Agendada</span>
          <span className="px-2 md:px-3 py-2 bg-[#d82128] text-white text-[10px] md:text-xs font-bold rounded-lg text-center shadow-sm">Corr. Agendada</span>
          
          <span className="px-2 md:px-3 py-2 bg-[#bcf0cf] text-[#006b31] text-[10px] md:text-xs font-bold rounded-lg text-center border border-[#009e49]/20">Prev. Realizada</span>
          <span className="px-2 md:px-3 py-2 bg-[#b8d1ff] text-[#103a94] text-[10px] md:text-xs font-bold rounded-lg text-center border border-[#1a5ce5]/20">Calib. Realizada</span>
          <span className="px-2 md:px-3 py-2 bg-purple-100 text-purple-800 text-[10px] md:text-xs font-bold rounded-lg text-center border border-purple-600/20">Quali. Realizada</span>
          <span className="px-2 md:px-3 py-2 bg-[#ffc2c4] text-[#8c1216] text-[10px] md:text-xs font-bold rounded-lg text-center border border-[#d82128]/20">Corr. Realizada</span>
        </div>
      </div>

      {/* Grade do Calendário */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-center p-4 md:p-6 border-b border-slate-100 bg-slate-50/50 gap-4">
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">{tituloMes}</h2>
          <div className="flex items-center gap-2 md:gap-3">
            <button onClick={irParaHoje} className="px-4 md:px-5 py-2 md:py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors shadow-sm text-xs md:text-sm">Hoje</button>
            <div className="flex items-center bg-[#1e293b] text-white rounded-xl overflow-hidden shadow-sm">
              <button onClick={() => mudarMes(-1)} className="p-2 md:p-2.5 hover:bg-slate-700 transition-colors"><ChevronLeft size={20} /></button>
              <button onClick={() => mudarMes(1)} className="p-2 md:p-2.5 hover:bg-slate-700 transition-colors border-l border-slate-700"><ChevronRight size={20} /></button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-100 bg-white">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
            <div key={dia} className="py-2 md:py-4 text-center text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider border-r border-slate-100 last:border-0">{dia}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-fr bg-white">
          {diasDoCalendario.map((diaObj, index) => {
            const hojeLocal = new Date();
            const hojeStr = `${hojeLocal.getFullYear()}-${String(hojeLocal.getMonth() + 1).padStart(2, '0')}-${String(hojeLocal.getDate()).padStart(2, '0')}`;
            const isHoje = diaObj?.dataCompleta === hojeStr;
            
            return (
              <div 
                key={index} 
                onClick={() => diaObj && setDiaSelecionado(diaObj.dataCompleta)}
                className={`min-h-[80px] md:min-h-[140px] p-1 md:p-2 border-b border-r border-slate-100 last:border-r-0 relative group transition-colors cursor-pointer ${isHoje ? 'bg-blue-50/30 hover:bg-blue-50/60' : 'hover:bg-slate-50'}`}
              >
                {diaObj && (
                  <>
                    <div className="flex justify-center md:justify-end mb-1 md:mb-2">
                      <span className={`flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full text-xs md:text-sm font-bold transition-all ${isHoje ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 group-hover:text-slate-800'}`}>
                        {diaObj.dia}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-1 md:gap-1.5 px-0 md:px-1 overflow-hidden">
                      {eventosFiltrados
                        .filter(m => m.dataPlotagem === diaObj.dataCompleta)
                        .map(evento => (
                          <div 
                            key={evento.id}
                            className={`text-[9px] md:text-xs px-1 md:px-2 py-0.5 md:py-1.5 rounded-sm md:rounded-md truncate font-bold shadow-sm border border-black/5 ${getCorEvento(evento.tipo_intervencao, evento.status?.nome)}`}
                            title={`${evento.tipo_intervencao}: ${evento.equipamento?.patrimonio || 'S/N'}`}
                          >
                            <span className="hidden md:inline">{evento.tipo_intervencao?.substring(0, 4)}: </span>
                            {evento.equipamento?.patrimonio || 'S/N'}
                          </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}