import { useState } from 'react'
import { Calendar, Clock, User, Wrench, X, Printer, FileText, Paperclip, ExternalLink } from 'lucide-react'

const formatDataPura = (dataString) => {
  if (!dataString) return '-';
  const apenasData = dataString.split('T')[0];
  const [ano, mes, dia] = apenasData.split('-');
  return `${dia}/${mes}/${ano}`;
}

export default function DetalheHistorico({ historico, equipamento }) {
  const [osDetalheSelecionada, setOsDetalheSelecionada] = useState(null)

  const handleImprimir = () => {
    window.print()
  }

  const isPDF = (url) => url?.toLowerCase().includes('.pdf')

  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm mt-6 print:hidden">
      <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
        <Calendar className="text-blue-600" size={20} /> Histórico de manutenções
      </h3>
      
      {historico.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
          <Wrench className="mx-auto text-slate-400 mb-3" size={20} />
          <h4 className="text-slate-700 font-bold mb-1">Nenhuma manutenção encontrada</h4>
        </div>
      ) : (
        <div className="space-y-4">
          {historico.map(manutencao => {
            let rotuloData = 'Data:'
            let valorData = formatDataPura(manutencao.data_abertura)
            
            if (manutencao.status?.nome?.toLowerCase().includes('concluído') && manutencao.data_conclusao) {
              rotuloData = 'Concluído:'
              valorData = formatDataPura(manutencao.data_conclusao)
            } else if (manutencao.data_prevista && !manutencao.status?.nome?.toLowerCase().includes('concluído')) {
              rotuloData = 'Agendado:'
              valorData = formatDataPura(manutencao.data_prevista)
            }

            const statusNome = manutencao.status?.nome || 'Aberto';
            const isConcluido = statusNome.toLowerCase().includes('concluído');

            return (
              <div key={manutencao.id} onClick={() => setOsDetalheSelecionada(manutencao)} className="flex flex-col md:flex-row gap-5 p-5 border border-slate-200 rounded-xl bg-slate-50 hover:bg-blue-50 transition-all cursor-pointer group">
                <div className="flex-1">
                  <div className="flex flex-wrap justify-between items-start gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold border bg-blue-100 text-blue-800">{manutencao.tipo_intervencao || 'Corretiva'}</span>
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${isConcluido ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {statusNome}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border">
                      <Clock size={14} className="text-blue-500"/> <span className="text-slate-400 font-normal">{rotuloData}</span> {valorData}
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 mb-4 line-clamp-2">{manutencao.descricao}</p>
                  <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-slate-500 font-medium pt-3 border-t">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1"><User size={12}/> {manutencao.aberto_por?.nome || '-'}</span>
                      <span className="flex items-center gap-1"><Wrench size={12}/> {manutencao.prestador?.nome || 'Manutenção Interna'}</span>
                    </div>
                    {manutencao.anexos?.length > 0 && (
                      <span className="flex items-center gap-1 text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        <Paperclip size={12} /> {manutencao.anexos.length} anexo(s)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL DA FICHA (COM ANEXOS E IMPRESSÃO BLINDADA) */}
      {osDetalheSelecionada && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:p-0 print:bg-white print:absolute print:inset-0">
          
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              .modal-impressao-conteudo, .modal-impressao-conteudo * { visibility: visible !important; }
              .modal-impressao-conteudo { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 20px !important; background: white !important; }
              .no-print { display: none !important; }
            }
          `}</style>

          <div className="modal-impressao-conteudo bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-8 relative border border-slate-200 print:shadow-none print:border-none print:rounded-none print:p-0 max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            {/* Botões ocultos na impressão */}
            <div className="absolute top-6 right-6 flex gap-2 no-print">
              <button onClick={handleImprimir} className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full transition-colors flex items-center gap-2 px-4 font-bold text-sm">
                <Printer size={18} /> Imprimir Ficha
              </button>
              <button onClick={() => setOsDetalheSelecionada(null)} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Cabeçalho Oficial */}
            <div className="mb-6 border-b-2 border-slate-800 pb-4">
              <h2 className="text-2xl font-black text-slate-900 uppercase">Relatório de Intervenção Técnica</h2>
              <p className="text-slate-500 text-sm font-bold mt-1">Ordem de Serviço #{osDetalheSelecionada.id.split('-')[0]}</p>
            </div>

            {/* Dados do Equipamento */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-slate-50 p-5 rounded-2xl border border-slate-200 print:border-slate-800 print:bg-white">
              <div className="col-span-2 md:col-span-4 mb-1"><span className="text-[10px] font-bold text-slate-400 block uppercase">Equipamento</span><span className="font-bold text-base text-slate-800">{equipamento?.nome}</span></div>
              <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 uppercase">Patrimônio</span><span className="font-bold text-slate-800 text-sm">{equipamento?.patrimonio || 'N/A'}</span></div>
              <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 uppercase">Série</span><span className="font-bold text-slate-800 text-sm">{equipamento?.numero_serie || 'N/A'}</span></div>
              <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 uppercase">Reg. ANVISA</span><span className="font-bold text-slate-800 text-sm">{equipamento?.registro_anvisa || 'N/A'}</span></div>
              <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 uppercase">Setor</span><span className="font-bold text-slate-800 text-sm">{equipamento?.setor?.nome || 'N/A'}</span></div>
            </div>
            
            {/* Dados da Intervenção com Status */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6 bg-white p-4 border border-slate-200 rounded-xl print:border-slate-800">
              <div className="flex flex-col"><span className="font-bold text-slate-400 uppercase text-[10px]">Data do Serviço</span><span className="font-bold text-slate-800">{formatDataPura(osDetalheSelecionada.data_conclusao || osDetalheSelecionada.data_prevista || osDetalheSelecionada.data_abertura)}</span></div>
              <div className="flex flex-col"><span className="font-bold text-slate-400 uppercase text-[10px]">Tipo</span><span className="font-bold text-blue-700">{osDetalheSelecionada.tipo_intervencao}</span></div>
              <div className="flex flex-col"><span className="font-bold text-slate-400 uppercase text-[10px]">Status</span><span className="font-bold text-emerald-700">{osDetalheSelecionada.status?.nome || 'Aberto'}</span></div>
              <div className="flex flex-col"><span className="font-bold text-slate-400 uppercase text-[10px]">Responsável</span><span className="font-bold text-slate-800 truncate">{osDetalheSelecionada.aberto_por?.nome || osDetalheSelecionada.prestador?.nome || '-'}</span></div>
            </div>

            <div className="mb-6">
              <h4 className="font-bold text-slate-800 mb-2 uppercase text-xs border-b pb-1">Relato Técnico / Descrição do Serviço</h4>
              <p className="text-slate-800 text-sm whitespace-pre-wrap bg-slate-50/50 border p-4 rounded-xl print:bg-white print:border-slate-300 min-h-[100px]">
                {osDetalheSelecionada.descricao}
              </p>
            </div>

            {/* SECÇÃO DE ANEXOS E LAUDOS (Oculta na Impressão) */}
            {osDetalheSelecionada.anexos && osDetalheSelecionada.anexos.length > 0 && (
              <div className="mb-6 no-print">
                <h4 className="font-bold text-slate-800 mb-3 uppercase text-xs border-b pb-1 flex items-center gap-2">
                  <Paperclip size={14} className="text-blue-600" /> Documentos e Laudos Anexados ({osDetalheSelecionada.anexos.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {osDetalheSelecionada.anexos.map((anexo, idx) => (
                    <a 
                      key={idx} 
                      href={anexo} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="group relative flex flex-col items-center justify-center p-3 border border-slate-200 rounded-xl bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition-all text-center h-28"
                    >
                      {isPDF(anexo) ? (
                        <>
                          <FileText size={32} className="text-red-500 mb-2 group-hover:scale-110 transition-transform" />
                          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                            Laudo_PDF #{idx + 1} <ExternalLink size={10} />
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="absolute inset-0 overflow-hidden rounded-xl">
                            <img src={anexo} alt="Anexo OS" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all" />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent rounded-xl" />
                          <span className="relative z-10 mt-auto text-[11px] font-bold text-white px-2 pb-1 flex items-center gap-1">
                            Ver Imagem <ExternalLink size={10} />
                          </span>
                        </>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Campo de Assinatura para Impressão */}
            <div className="hidden print:flex justify-between items-end mt-20 pt-8">
               <div className="w-64 border-t-2 border-slate-800 text-center pt-2 font-bold text-xs">Responsável Técnico (Assinatura)</div>
               <div className="w-64 border-t-2 border-slate-800 text-center pt-2 font-bold text-xs">Visto da Coordenação / Fiscal</div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
} 