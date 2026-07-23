import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom' // 🚀 Importação do Navigate
import { useModulo } from '../../contexts/ModuloContext' // 🚀 Importação do Contexto
import { 
  ArrowLeft, Edit, Trash2, Monitor, Hash, FileText, Paperclip, 
  CheckCircle2, Clock, AlertCircle, Ticket, Calendar, Building, 
  User, Printer, ZoomIn, ZoomOut, X, ChevronLeft, ChevronRight, ExternalLink 
} from 'lucide-react'

// ============================================================================
// COMPONENTE: LIGHTBOX (Mantido Intacto)
// ============================================================================
const GaleriaLightbox = ({ imagens, indexInicial, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(indexInicial || 0)
  const [zoomVisual, setZoomVisual] = useState(1)

  const imgRef = useRef(null)
  const pan = useRef({ x: 0, y: 0 })
  const zoomLevel = useRef(1)
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const resetTransform = useCallback(() => {
    pan.current = { x: 0, y: 0 }
    zoomLevel.current = 1
    setZoomVisual(1)
    if (imgRef.current) {
      imgRef.current.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
      imgRef.current.style.transform = `translate3d(0px, 0px, 0) scale(1)`
    }
  }, [])

  const applyZoom = (newZoom) => {
    zoomLevel.current = Math.min(Math.max(newZoom, 1), 6)
    if (zoomLevel.current === 1) pan.current = { x: 0, y: 0 }
    setZoomVisual(zoomLevel.current)
    if (imgRef.current) {
      imgRef.current.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
      imgRef.current.style.transform = `translate3d(${pan.current.x}px, ${pan.current.y}px, 0) scale(${zoomLevel.current})`
    }
  }

  const handleZoomIn = (e) => { e?.stopPropagation(); applyZoom(zoomLevel.current + 0.5); }
  const handleZoomOut = (e) => { e?.stopPropagation(); applyZoom(zoomLevel.current - 0.5); }

  const handleWheel = (e) => {
    e.stopPropagation();
    const adjustment = e.deltaY < 0 ? 0.25 : -0.25;
    applyZoom(zoomLevel.current + adjustment);
  }

  const prevFoto = (e) => {
    e?.stopPropagation();
    resetTransform();
    setCurrentIndex(prev => (prev === 0 ? imagens.length - 1 : prev - 1));
  }

  const nextFoto = (e) => {
    e?.stopPropagation();
    resetTransform();
    setCurrentIndex(prev => (prev === imagens.length - 1 ? 0 : prev + 1));
  }

  const handlePointerDown = (e) => {
    if (zoomLevel.current <= 1) return;
    e.preventDefault();
    isDragging.current = true;
    e.target.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX - pan.current.x, y: e.clientY - pan.current.y };
    if (imgRef.current) imgRef.current.style.transition = 'none'; 
  }

  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    pan.current = { x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y };
    if (imgRef.current) {
      imgRef.current.style.transform = `translate3d(${pan.current.x}px, ${pan.current.y}px, 0) scale(${zoomLevel.current})`;
    }
  }

  const handlePointerUp = (e) => {
    isDragging.current = false;
    e.target.releasePointerCapture(e.pointerId);
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && imagens.length > 1) nextFoto();
      if (e.key === 'ArrowLeft' && imagens.length > 1) prevFoto();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, imagens.length]);

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-slate-900/95 flex flex-col animate-in fade-in duration-200">
      <div className="absolute top-0 left-0 right-0 h-20 px-6 flex items-center justify-between text-white z-50 bg-gradient-to-b from-slate-900/80 to-transparent pointer-events-none">
        <div className="text-sm font-bold text-slate-300 bg-slate-800/80 px-4 py-2 rounded-xl pointer-events-auto border border-white/10 shadow-sm">
          {imagens.length > 1 ? `${currentIndex + 1} / ${imagens.length}` : 'Modo Visualização'}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto bg-slate-800/80 p-1.5 rounded-2xl border border-white/10 shadow-sm">
          <button onClick={handleZoomOut} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-300 hover:text-white" title="Reduzir"><ZoomOut size={20} /></button>
          <button onClick={(e) => { e.stopPropagation(); resetTransform(); }} className="text-xs font-bold w-12 text-center text-slate-300 hover:text-white transition-colors cursor-pointer" title="Voltar ao original">{Math.round(zoomVisual * 100)}%</button>
          <button onClick={handleZoomIn} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-300 hover:text-white" title="Ampliar"><ZoomIn size={20} /></button>
          <div className="w-px h-6 bg-white/20 mx-1"></div>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 hover:bg-red-500/20 text-red-400 hover:text-red-500 rounded-xl transition-colors" title="Fechar (Esc)"><X size={24} /></button>
        </div>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden w-full h-full" onWheel={handleWheel}>
        <div className="absolute inset-0 z-0" onClick={(e) => { e.stopPropagation(); if (zoomLevel.current === 1) onClose(); }}></div>

        {imagens.length > 1 && (
          <>
            <button onClick={prevFoto} className="absolute left-6 md:left-10 z-50 p-4 bg-slate-800/50 hover:bg-slate-800 border border-white/10 text-white rounded-full transition-all hover:scale-110 shadow-lg"><ChevronLeft size={32} strokeWidth={2.5} /></button>
            <button onClick={nextFoto} className="absolute right-6 md:right-10 z-50 p-4 bg-slate-800/50 hover:bg-slate-800 border border-white/10 text-white rounded-full transition-all hover:scale-110 shadow-lg"><ChevronRight size={32} strokeWidth={2.5} /></button>
          </>
        )}

        <img
          ref={imgRef}
          src={imagens[currentIndex]}
          alt="Anexo"
          draggable="false"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={(e) => { e.stopPropagation(); e.preventDefault(); resetTransform(); }}
          style={{ transform: 'translate3d(0px, 0px, 0) scale(1)', willChange: 'transform' }}
          className={`max-w-full max-h-[85vh] object-contain origin-center select-none relative z-10 rounded-lg shadow-2xl ${zoomVisual > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
        />
      </div>
    </div>,
    document.body
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function ChamadoDetalhes({ chamado, voltarParaLista, iniciarEdicao, handleExcluir }) {
  const navigate = useNavigate() // 🚀
  const { moduloAtivo } = useModulo() // 🚀

  const isPDF = (url) => url?.toLowerCase().includes('.pdf')
  
  const imagens = chamado.anexos?.filter(url => !isPDF(url)) || []
  const documentos = chamado.anexos?.filter(url => isPDF(url)) || []

  const [lightboxAberto, setLightboxAberto] = useState(false)
  const [imagemAtiva, setImagemAtiva] = useState(null)

  const handleImprimir = () => {
    window.print()
  }

  // 🚀 NOVO: Navegação Direta para o Equipamento
  const irParaEquipamento = () => {
    if (chamado.equipamento_id) {
      navigate(`/${moduloAtivo}/equipamentos`, { 
        state: { openDetailsId: chamado.equipamento_id, _t: Date.now() } 
      });
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 bg-slate-50/30 p-2 md:p-6 rounded-3xl print:p-0 print:bg-white relative">
      
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-container, .print-container * { visibility: visible !important; }
          .print-container { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .print-break-inside-avoid { break-inside: avoid; }
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Detalhes da OS</h1>
            <span className={`px-2.5 py-1 rounded-md text-xs font-bold border uppercase ${chamado.tipo_intervencao === 'Preventiva' ? 'bg-green-100 text-green-800 border-green-200' : chamado.tipo_intervencao === 'Calibração' ? 'bg-blue-100 text-blue-800 border-blue-200' : chamado.tipo_intervencao === 'Qualificação' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-red-100 text-red-800 border-red-200'}`}>{chamado.tipo_intervencao || 'Corretiva'}</span>
          </div>
          <p className="text-sm text-slate-500 font-medium">Acompanhamento e ficha técnica da ordem de serviço.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 w-full md:w-auto">
          <button onClick={voltarParaLista} className="flex-1 sm:flex-none justify-center px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-sm"><ArrowLeft size={16} className="inline mr-2" /> Voltar</button>
          <button onClick={handleImprimir} className="flex-1 sm:flex-none justify-center px-4 py-2.5 text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl transition-all shadow-sm"><Printer size={16} className="inline mr-2" /> Imprimir OS</button>
          <button onClick={() => iniciarEdicao(chamado)} className="flex-1 sm:flex-none justify-center px-4 py-2.5 text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl transition-all shadow-sm"><Edit size={16} className="inline mr-2" /> Editar</button>
          <button onClick={() => handleExcluir(chamado.id)} className="w-full sm:w-auto justify-center px-4 py-2.5 text-sm font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-xl transition-all shadow-sm"><Trash2 size={16} className="inline mr-2" /> Excluir</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print-container">
        
        <div className="hidden print:block col-span-3 border-b-2 border-slate-800 pb-4 mb-4">
           <h2 className="text-2xl font-black text-slate-900 uppercase">Ordem de Serviço Técnica</h2>
           <p className="text-slate-500 font-bold mt-1">OS #{chamado.id || 'N/A'} - Emitida em {new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        <div className="lg:col-span-2 space-y-6">
          
          {/* 🚀 NOVO: Card de Equipamento Transformado em Botão Navegável */}
          <div 
            onClick={irParaEquipamento}
            className={`bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5 print:border-slate-800 print:shadow-none print:p-4 group transition-all relative ${chamado.equipamento_id ? 'cursor-pointer hover:border-blue-400 hover:shadow-md' : ''}`}
          >
            {chamado.equipamento_id && (
              <div className="absolute top-4 right-4 text-slate-300 group-hover:text-blue-500 transition-colors no-print">
                <ExternalLink size={20} />
              </div>
            )}
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100 no-print group-hover:bg-blue-600 group-hover:text-white transition-colors"><Monitor size={32} /></div>
            <div className="pr-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 group-hover:text-blue-500 transition-colors">Equipamento Vinculado</p>
              <h3 className="text-xl md:text-2xl font-black text-slate-800 leading-tight tracking-tight uppercase group-hover:text-blue-900 transition-colors">{chamado.equipamento?.nome || 'Equipamento Excluído'}</h3>
              <div className="flex items-center gap-3 mt-3 text-sm font-bold text-slate-600">
                <span className="bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5 group-hover:border-blue-200 group-hover:bg-blue-50 transition-colors"><Hash size={14} className="text-slate-400 group-hover:text-blue-500"/> Patrimônio: <span className="text-slate-800 group-hover:text-blue-900">{chamado.equipamento?.patrimonio || 'S/N'}</span></span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm print:border-slate-800 print:shadow-none print:p-4 print-break-inside-avoid">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 print:border-slate-800 uppercase text-sm tracking-wider"><FileText className="text-blue-600 no-print" size={20} /> Relato / Descrição Técnica</h3>
            <p className="text-slate-700 text-sm md:text-base bg-slate-50/80 p-5 rounded-2xl border border-slate-100 min-h-[140px] whitespace-pre-wrap leading-relaxed shadow-inner print:shadow-none print:border-slate-300 print:bg-white">{chamado.descricao || 'Nenhum detalhe técnico foi inserido.'}</p>
          </div>

          {(imagens.length > 0 || documentos.length > 0) && (
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm no-print">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3"><Paperclip className="text-blue-600" size={20} /> Documentos e Anexos</h3>
              
              {imagens.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Imagens / Fotos ({imagens.length})</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {imagens.map((imgUrl, index) => (
                      <div 
                        key={index} 
                        onClick={() => { setImagemAtiva(imgUrl); setLightboxAberto(true); }}
                        className="group relative flex flex-col items-center justify-center border-2 border-slate-200 rounded-2xl overflow-hidden cursor-pointer hover:border-blue-400 transition-all h-32 md:h-40 shadow-sm"
                      >
                        <img src={imgUrl} alt={`Foto OS ${index}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/30 transition-colors flex items-center justify-center">
                           <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transform translate-y-4 group-hover:translate-y-0 transition-all"><ZoomIn size={14}/> Ampliar</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {documentos.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Documentos PDF ({documentos.length})</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {documentos.map((docUrl, index) => (
                      <a 
                        key={index} 
                        href={docUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="group relative flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-2xl bg-slate-50 hover:bg-red-50 hover:border-red-200 transition-all text-center h-32 md:h-40 shadow-sm"
                      >
                        <FileText size={40} className="text-red-500 mb-3 group-hover:-translate-y-2 transition-transform duration-300" />
                        <span className="text-xs font-bold text-slate-700">Ver Laudo/Doc</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm print:border-slate-800 print:shadow-none print:p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 print:text-black">Status Atual</p>
            <div className={`flex items-center gap-3 p-4 rounded-2xl border print:border-slate-300 print:text-black print:bg-white ${chamado.status?.nome === 'Concluído' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : chamado.status?.nome === 'Aberto' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
              {chamado.status?.nome === 'Concluído' ? <CheckCircle2 size={24} className="no-print" /> : chamado.status?.nome === 'Aberto' ? <Clock size={24} className="no-print" /> : <AlertCircle size={24} className="no-print" />}
              <span className="text-lg font-black uppercase tracking-wide">{chamado.status?.nome || 'Sem Status'}</span>
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm print:border-slate-800 print:shadow-none print:p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-5 print:text-black border-b border-slate-100 pb-2 print:border-slate-800">Cronograma</p>
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 no-print"><Ticket size={18}/></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5 print:text-black">Data de Abertura</p><p className="text-sm font-bold text-slate-800">{chamado.data_abertura ? new Date(chamado.data_abertura).toLocaleString('pt-BR') : '-'}</p></div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0 no-print"><Calendar size={18}/></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5 print:text-black">Previsão (Agenda)</p><p className="text-sm font-bold text-slate-800">{chamado.data_prevista ? new Date(chamado.data_prevista).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Não agendado'}</p></div>
              </div>
              {chamado.data_conclusao && (
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0 no-print"><CheckCircle2 size={18}/></div>
                  <div><p className="text-[10px] font-bold text-emerald-600/70 uppercase mb-0.5 print:text-black">Data de Conclusão</p><p className="text-sm font-black text-emerald-800 print:text-black">{new Date(chamado.data_conclusao).toLocaleString('pt-BR')}</p></div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm print:border-slate-800 print:shadow-none print:p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-5 print:text-black border-b border-slate-100 pb-2 print:border-slate-800">Execução & Responsáveis</p>
            <div className="space-y-4">
              <div className="flex flex-col gap-1 border-b border-slate-50 pb-3 print:border-slate-300"><span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5 print:text-black"><Building size={14} className="no-print"/> Fornecedor / Prestador</span><span className="text-sm font-bold text-slate-800 md:ml-5 print:ml-0">{chamado.prestador?.nome || 'Manutenção Interna'}</span></div>
              <div className="flex flex-col gap-1 border-b border-slate-50 pb-3 print:border-slate-300"><span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5 print:text-black"><Hash size={14} className="no-print"/> Protocolo Externo (OS)</span><span className="text-sm font-bold text-slate-800 md:ml-5 print:ml-0">{chamado.protocolo_externo || 'Sem protocolo vinculado'}</span></div>
              <div className="flex flex-col gap-1"><span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5 print:text-black"><User size={14} className="no-print"/> Solicitante</span><span className="text-sm font-bold text-slate-800 md:ml-5 print:ml-0">{chamado.aberto_por?.nome || '-'}</span></div>
            </div>
          </div>
        </div>

        <div className="hidden print:flex col-span-3 justify-between items-end mt-24 pt-8">
           <div className="w-64 border-t-2 border-slate-800 text-center pt-2 font-bold text-xs uppercase tracking-wider">Assinatura do Técnico</div>
           <div className="w-64 border-t-2 border-slate-800 text-center pt-2 font-bold text-xs uppercase tracking-wider">Visto do Solicitante / Fiscal</div>
        </div>

      </div>

      {lightboxAberto && (
        <GaleriaLightbox 
          imagens={imagens} 
          indexInicial={imagens.indexOf(imagemAtiva)} 
          onClose={() => setLightboxAberto(false)} 
        />
      )}

    </div>
  )
}