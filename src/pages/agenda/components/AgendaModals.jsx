import { X, CalendarIcon, MapPin, Clock, Wrench, ArrowRight, AlertTriangle, CheckCircle2, Target } from 'lucide-react'

export function ModalDiaAgenda({ diaSelecionado, setDiaSelecionado, eventosDoDiaSelecionado, getCorEvento, canEdit, navigate, moduloAtivo }) {
  if (!diaSelecionado) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-slate-50 rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col animate-in zoom-in duration-200 overflow-hidden border border-slate-200">
        
        <div className="bg-white px-6 py-6 md:px-8 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Atividades do dia</h2>
            <p className="text-blue-600 text-sm font-bold uppercase tracking-widest mt-1">
              {new Date(diaSelecionado + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button onClick={() => setDiaSelecionado(null)} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors active:scale-95">
            <X size={24} />
          </button>
        </div>

        {/* 🚀 OTIMIZAÇÃO: Barra de rolagem invisível estilo App Nativo */}
        <div className="p-4 md:p-8 overflow-y-auto space-y-4 md:space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {eventosDoDiaSelecionado.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-200 shadow-sm">
                <CalendarIcon className="text-slate-300" size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-700 tracking-tight">Dia livre</h3>
              <p className="text-sm font-medium text-slate-500 mt-2">Nenhuma manutenção planeada para esta data.</p>
            </div>
          ) : (
            eventosDoDiaSelecionado.map(evento => (
              <div key={evento.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                
                <div className="bg-slate-50/80 px-5 py-4 md:px-6 md:py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 md:gap-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white shadow-sm ${getCorEvento(evento.tipo_intervencao, evento.status?.nome).split(' ')[0]}`}>
                      {evento.statusExibicao}
                    </span>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{evento.tipo_intervencao}</h3>
                  </div>
                  <div className="text-xs font-bold text-slate-500 flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm w-fit">
                    <MapPin size={14} className="text-blue-500 shrink-0" />
                    <span className="truncate">{evento.equipamento?.unidade?.nome || 'S/ Unidade'} - {evento.equipamento?.setor?.nome || 'S/ Setor'}</span>
                  </div>
                </div>

                <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                  <div className="space-y-4">
                    <div>
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Equipamento</span>
                      <span className="text-slate-800 font-black text-base">{evento.equipamento?.nome || 'Equipamento Excluído'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Património</span>
                        <span className="text-slate-700 font-bold text-sm">{evento.equipamento?.patrimonio || '-'}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Série</span>
                        <span className="text-slate-700 font-bold text-sm">{evento.equipamento?.numero_serie || '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                      <Wrench className="text-slate-400 shrink-0" size={16}/>
                      <div>
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Empresa / Prestador</span>
                        <span className="text-slate-700 font-bold text-sm">{evento.prestador?.nome || 'Manutenção Interna'}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status OS</span>
                        <span className="text-slate-700 font-black text-sm">{evento.status?.nome || '-'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data Registo</span>
                        <span className="text-slate-700 font-bold text-sm flex items-center gap-1">
                          {new Date(evento.data_abertura).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    {canEdit && (
                      <button 
                        onClick={() => navigate(`/${moduloAtivo}/chamados`, { state: { openDetailsId: evento.id } })}
                        className="w-full sm:w-auto text-sm font-black uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 px-6 py-3.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 shrink-0"
                      >
                        Abrir OS Completa <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export function ModalListaAnual({ modalListaAnual, setModalListaAnual, navigate, moduloAtivo, canEdit }) {
  if (!modalListaAnual.aberto) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-slate-50 rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col animate-in zoom-in duration-150 border border-slate-200 overflow-hidden">
        
        <div className={`p-6 md:p-8 border-b border-slate-200 flex justify-between items-center shrink-0 bg-white`}>
          <div className="flex items-center gap-3">
            {modalListaAnual.cor === 'red' ? <AlertTriangle size={32} className="text-red-600" /> : 
             modalListaAnual.cor === 'emerald' ? <CheckCircle2 size={32} className="text-emerald-600" /> :
             modalListaAnual.cor === 'amber' ? <Clock size={32} className="text-amber-600" /> :
             <Target size={32} className="text-blue-600" />
            }
            <h2 className={`text-xl md:text-2xl font-black tracking-tight ${
              modalListaAnual.cor === 'blue' ? 'text-blue-900' : 
              modalListaAnual.cor === 'emerald' ? 'text-emerald-900' : 
              modalListaAnual.cor === 'amber' ? 'text-amber-900' : 'text-red-900'
            }`}>
              {modalListaAnual.titulo}
            </h2>
          </div>
          <button 
            onClick={() => setModalListaAnual({ ...modalListaAnual, aberto: false })} 
            className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors shadow-sm active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        {/* 🚀 OTIMIZAÇÃO: Barra de rolagem invisível estilo App Nativo */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {modalListaAnual.lista.map(os => {
            const dataShow = os.data_prevista 
                ? new Date(os.data_prevista + 'T12:00:00').toLocaleDateString('pt-BR') 
                : new Date(os.data_abertura + 'T12:00:00').toLocaleDateString('pt-BR')
            
            return (
              <div key={os.id} className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4 group">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] md:text-xs font-black px-3 py-1.5 rounded-xl uppercase tracking-widest border shadow-sm ${
                      os.tipo_intervencao === 'Preventiva' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      os.tipo_intervencao === 'Calibração' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      os.tipo_intervencao === 'Qualificação' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {os.tipo_intervencao}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl uppercase tracking-wider border border-slate-200">
                      {os.status?.nome || 'Pendente'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 w-fit">
                    <CalendarIcon size={14} className="shrink-0" />
                    <span className="text-xs font-bold">{dataShow}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-black text-slate-800 text-lg">{os.equipamento?.nome || 'Equipamento Excluído'}</h4>
                  
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs text-slate-600 font-medium">
                    <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <strong className="text-slate-400 font-black">PAT:</strong> {os.equipamento?.patrimonio || '-'}
                    </span>
                    <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <strong className="text-slate-400 font-black">N/S:</strong> {os.equipamento?.numero_serie || '-'}
                    </span>
                    <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <MapPin size={14} className="text-slate-400"/> {os.equipamento?.unidade?.nome || 'S/ Unidade'}
                    </span>
                  </div>
                </div>
                
                {canEdit && (
                  <div className="pt-3 mt-1 border-t border-slate-100 flex justify-end">
                    <button 
                      onClick={() => navigate(`/${moduloAtivo}/chamados`, { state: { openDetailsId: os.id } })}
                      className="w-full sm:w-auto text-xs font-black uppercase tracking-widest text-indigo-600 bg-white border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 px-5 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                    >
                      Ver OS Completa <ArrowRight size={14} />
                    </button>
                  </div>
                )}
                
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}