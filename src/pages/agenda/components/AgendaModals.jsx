import { X, CalendarIcon, MapPin, Clock, Wrench, ArrowRight, AlertTriangle, CheckCircle2, Target } from 'lucide-react'

export function ModalDiaAgenda({ diaSelecionado, setDiaSelecionado, eventosDoDiaSelecionado, getCorEvento, canEdit, navigate, moduloAtivo }) {
  if (!diaSelecionado) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-slate-50 rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] md:max-h-[85vh] flex flex-col animate-in zoom-in duration-200 relative overflow-hidden border border-slate-200">
        
        <div className="bg-white px-4 py-4 md:px-8 md:py-6 border-b border-slate-200 flex justify-between items-start md:items-center shrink-0">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800">Atividades do dia</h2>
            <p className="text-blue-600 text-xs md:text-sm font-medium mt-1 capitalize">
              {new Date(diaSelecionado + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button onClick={() => setDiaSelecionado(null)} className="p-1.5 md:p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 md:p-8 overflow-y-auto space-y-4 md:space-y-6">
          {eventosDoDiaSelecionado.length === 0 ? (
            <div className="text-center py-10 md:py-12">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-sm">
                <CalendarIcon className="text-slate-300" size={24} />
              </div>
              <h3 className="text-base md:text-lg font-bold text-slate-700">Dia livre</h3>
              <p className="text-sm text-slate-500 mt-1">Nenhuma manutenção agendada nesta data.</p>
            </div>
          ) : (
            eventosDoDiaSelecionado.map(evento => (
              <div key={evento.id} className="bg-white rounded-xl md:rounded-2xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                <div className="bg-slate-50/80 px-4 py-3 md:px-6 md:py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 md:gap-4">
                  <div className="flex items-center gap-2 md:gap-3">
                    <span className={`px-2 md:px-3 py-1 rounded-md text-[10px] md:text-xs font-bold uppercase tracking-wider text-white shadow-sm ${getCorEvento(evento.tipo_intervencao, evento.status?.nome).split(' ')[0]}`}>
                      {evento.statusExibicao}
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-slate-800">{evento.tipo_intervencao}</h3>
                  </div>
                  <div className="text-xs md:text-sm font-bold text-slate-500 flex items-center gap-1.5 md:gap-2">
                    <MapPin size={14} className="text-blue-500 shrink-0" />
                    <span className="truncate">{evento.equipamento?.unidade?.nome || 'Sem Unidade'} - {evento.equipamento?.setor?.nome || 'Sem Setor'}</span>
                  </div>
                </div>

                <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-3 md:space-y-4">
                    <div>
                      <span className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5 md:mb-1">Equipamento</span>
                      <span className="text-slate-800 font-bold text-sm md:text-base">{evento.equipamento?.nome || 'Equipamento Excluído'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <span className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5 md:mb-1">Patrimônio</span>
                        <span className="text-slate-700 font-medium text-xs md:text-sm">{evento.equipamento?.patrimonio || '-'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5 md:mb-1">Série</span>
                        <span className="text-slate-700 font-medium text-xs md:text-sm">{evento.equipamento?.numero_serie || '-'}</span>
                      </div>
                    </div>
                    <div>
                      <span className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5 md:mb-1">Empresa / Prestador</span>
                      <span className="text-slate-700 font-medium text-xs md:text-sm">{evento.prestador?.nome || 'Manutenção Interna'}</span>
                    </div>
                  </div>

                  <div className="space-y-3 md:space-y-4">
                    <div>
                      <span className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5 md:mb-1">Responsável</span>
                      <span className="text-slate-700 font-medium text-xs md:text-sm">{evento.aberto_por?.nome || '-'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <span className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5 md:mb-1">Status OS</span>
                        <span className="text-slate-700 font-bold text-xs md:text-sm">{evento.status?.nome || '-'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5 md:mb-1">Protocolo / OS</span>
                        <span className="text-slate-700 font-medium text-xs md:text-sm">{evento.protocolo_externo || '-'}</span>
                      </div>
                    </div>
                    <div>
                      <span className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5 md:mb-1">Data do Registro</span>
                      <span className="text-slate-700 font-medium text-xs md:text-sm flex items-center gap-1">
                        <Clock size={12} className="text-slate-400" />
                        {new Date(evento.data_abertura).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  <div className="md:col-span-2 pt-3 md:pt-4 border-t border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1 w-full">
                      <span className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 md:mb-2 flex items-center gap-1">
                        <Wrench size={12} /> Descrição da Manutenção / Relato
                      </span>
                      <p className="text-slate-600 text-xs md:text-sm whitespace-pre-wrap bg-slate-50 p-3 md:p-4 rounded-xl border border-slate-200">
                        {evento.descricao || 'Nenhuma descrição registrada para esta atividade.'}
                      </p>
                    </div>
                    
                    {canEdit && (
                      <button 
                        onClick={() => navigate(`/${moduloAtivo}/chamados`, { state: { openDetailsId: evento.id } })}
                        className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md w-full md:w-auto shrink-0"
                      >
                        Ir para OS completa <ArrowRight size={14} />
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col animate-in zoom-in duration-150 border border-slate-200 overflow-hidden">
        
        <div className={`p-5 md:p-6 border-b border-slate-100 flex justify-between items-center shrink-0 ${
          modalListaAnual.cor === 'blue' ? 'bg-blue-50/50' : 
          modalListaAnual.cor === 'emerald' ? 'bg-emerald-50/50' : 
          modalListaAnual.cor === 'amber' ? 'bg-amber-50/50' : 'bg-red-50/50'
        }`}>
          <div className="flex items-center gap-2">
            {modalListaAnual.cor === 'red' ? <AlertTriangle className="text-red-600" /> : 
             modalListaAnual.cor === 'emerald' ? <CheckCircle2 className="text-emerald-600" /> :
             modalListaAnual.cor === 'amber' ? <Clock className="text-amber-600" /> :
             <Target className="text-blue-600" />
            }
            <h2 className={`text-lg md:text-xl font-bold ${
              modalListaAnual.cor === 'blue' ? 'text-blue-900' : 
              modalListaAnual.cor === 'emerald' ? 'text-emerald-900' : 
              modalListaAnual.cor === 'amber' ? 'text-amber-900' : 'text-red-900'
            }`}>
              {modalListaAnual.titulo} ({modalListaAnual.lista.length})
            </h2>
          </div>
          <button 
            onClick={() => setModalListaAnual({ ...modalListaAnual, aberto: false })} 
            className="p-1.5 hover:bg-slate-200/50 rounded-full text-slate-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 md:p-6 overflow-y-auto divide-y divide-slate-100 flex-1">
          {modalListaAnual.lista.map(os => {
            // Correção da data aqui também
            const dataShow = os.data_prevista 
                ? new Date(os.data_prevista + 'T12:00:00').toLocaleDateString('pt-BR') 
                : new Date(os.data_abertura + 'T12:00:00').toLocaleDateString('pt-BR')
            
            return (
              <div key={os.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      os.tipo_intervencao === 'Preventiva' ? 'bg-green-100 text-green-800' :
                      os.tipo_intervencao === 'Calibração' ? 'bg-blue-100 text-blue-800' :
                      os.tipo_intervencao === 'Qualificação' ? 'bg-purple-100 text-purple-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {os.tipo_intervencao}
                    </span>
                    <h4 className="font-bold text-slate-800 text-sm md:text-base line-clamp-1">{os.equipamento?.nome || 'Equipamento Excluído'}</h4>
                  </div>
                  
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                    <span><strong className="text-slate-400 font-semibold uppercase text-[10px]">Patr:</strong> {os.equipamento?.patrimonio || '-'}</span>
                    <span className="flex items-center gap-1"><MapPin size={12} className="text-slate-400"/> {os.equipamento?.unidade?.nome}</span>
                    <span className="flex items-center gap-1 text-slate-700 font-bold bg-slate-100 px-1.5 rounded"><CalendarIcon size={12}/> {dataShow}</span>
                  </div>
                </div>
                
                {canEdit && (
                  <button 
                    onClick={() => navigate(`/${moduloAtivo}/chamados`, { state: { openDetailsId: os.id } })}
                    className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-all flex items-center justify-center gap-1 w-full sm:w-auto shrink-0"
                  >
                    Ir para OS <ArrowRight size={12} />
                  </button>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}