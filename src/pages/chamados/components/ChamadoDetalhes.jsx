import { ArrowLeft, Edit, Trash2, Monitor, Hash, FileText, Paperclip, CheckCircle2, Clock, AlertCircle, Ticket, Calendar, Building, User } from 'lucide-react'

export default function ChamadoDetalhes({ chamado, voltarParaLista, iniciarEdicao, handleExcluir }) {
  const isPDF = (url) => url?.toLowerCase().includes('.pdf')

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Detalhes da OS</h1>
            <span className={`px-2.5 py-1 rounded-md text-xs font-bold border uppercase ${chamado.tipo_intervencao === 'Preventiva' ? 'bg-green-100 text-green-800 border-green-200' : chamado.tipo_intervencao === 'Calibração' ? 'bg-blue-100 text-blue-800 border-blue-200' : chamado.tipo_intervencao === 'Qualificação' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-red-100 text-red-800 border-red-200'}`}>{chamado.tipo_intervencao || 'Corretiva'}</span>
          </div>
          <p className="text-sm text-slate-500 font-medium">Acompanhamento e ficha técnica da ordem de serviço.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full md:w-auto">
          <button onClick={voltarParaLista} className="flex-1 sm:flex-none justify-center px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2 shadow-sm"><ArrowLeft size={16} /> Voltar</button>
          <button onClick={() => iniciarEdicao(chamado)} className="flex-1 sm:flex-none justify-center px-5 py-2.5 text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl transition-colors flex items-center gap-2 shadow-sm"><Edit size={16} /> Editar OS</button>
          <button onClick={() => handleExcluir(chamado.id)} className="w-full sm:w-auto justify-center px-5 py-2.5 text-sm font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-xl transition-colors flex items-center gap-2 shadow-sm"><Trash2 size={16} /> Excluir OS</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100"><Monitor size={28} /></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Equipamento Vinculado</p>
              <h3 className="text-lg md:text-xl font-bold text-slate-800 leading-tight">{chamado.equipamento?.nome || 'Equipamento Excluído'}</h3>
              <div className="flex items-center gap-3 mt-2 text-xs font-medium text-slate-500">
                <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1 font-mono"><Hash size={12}/> Pat: {chamado.equipamento?.patrimonio || 'S/N'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2"><FileText className="text-blue-600" size={18} /> Relato / Descrição Técnica</h3>
            <p className="text-slate-700 text-sm bg-slate-50/80 p-5 rounded-xl border border-slate-100 min-h-[140px] whitespace-pre-wrap leading-relaxed shadow-inner">{chamado.descricao || 'Nenhum detalhe técnico foi inserido.'}</p>
          </div>

          {chamado.anexos && chamado.anexos.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2"><Paperclip className="text-blue-600" size={18} /> Documentos e Anexos ({chamado.anexos.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {chamado.anexos.map((anexo, index) => (
                  <a key={index} href={anexo} target="_blank" rel="noopener noreferrer" className="group relative flex flex-col items-center justify-center p-4 border border-slate-200 rounded-xl bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition-all text-center h-32">
                    {isPDF(anexo) ? (
                      <><FileText size={40} className="text-red-500 mb-2 group-hover:-translate-y-1 transition-transform" /><span className="text-xs font-bold text-slate-700 line-clamp-1">Laudo_Tecnico.pdf</span></>
                    ) : (
                      <><div className="absolute inset-0 overflow-hidden rounded-xl"><img src={anexo} alt="Anexo" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all" /></div><div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent rounded-xl" /><span className="relative z-10 mt-auto text-xs font-bold text-white px-2 pb-1">Imagem Anexada</span></>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Status Atual</p>
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${chamado.status?.nome === 'Concluído' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : chamado.status?.nome === 'Aberto' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
              {chamado.status?.nome === 'Concluído' ? <CheckCircle2 size={24} /> : chamado.status?.nome === 'Aberto' ? <Clock size={24} /> : <AlertCircle size={24} />}
              <span className="text-lg font-bold">{chamado.status?.nome || 'Sem Status'}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Cronograma</p>
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"><Ticket size={14}/></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase">Data de Abertura</p><p className="text-sm font-bold text-slate-800">{chamado.data_abertura ? new Date(chamado.data_abertura).toLocaleString('pt-BR') : '-'}</p></div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0"><Calendar size={14}/></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase">Previsão (Agenda)</p><p className="text-sm font-bold text-slate-800">{chamado.data_prevista ? new Date(chamado.data_prevista).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Não agendado'}</p></div>
              </div>
              {chamado.data_conclusao && (
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0"><CheckCircle2 size={14}/></div>
                  <div><p className="text-[10px] font-bold text-slate-400 uppercase">Data de Conclusão</p><p className="text-sm font-bold text-slate-800">{new Date(chamado.data_conclusao).toLocaleString('pt-BR')}</p></div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Execução & Responsáveis</p>
            <div className="space-y-4">
              <div className="flex flex-col gap-1 border-b border-slate-50 pb-3"><span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Building size={14}/> Fornecedor / Prestador</span><span className="text-sm font-bold text-slate-800 ml-5">{chamado.prestador?.nome || 'Manutenção Interna'}</span></div>
              <div className="flex flex-col gap-1 border-b border-slate-50 pb-3"><span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Hash size={14}/> Protocolo Externo (OS)</span><span className="text-sm font-bold text-slate-800 ml-5">{chamado.protocolo_externo || 'Sem protocolo vinculado'}</span></div>
              <div className="flex flex-col gap-1"><span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><User size={14}/> Solicitante</span><span className="text-sm font-bold text-slate-800 ml-5">{chamado.aberto_por?.nome || '-'}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}