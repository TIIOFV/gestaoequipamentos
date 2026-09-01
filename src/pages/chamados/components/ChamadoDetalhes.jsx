import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom' 
import { useModulo } from '../../../contexts/ModuloContext' 
import { 
  ArrowLeft, Edit, Trash2, Monitor, Hash, FileText, Paperclip, 
  CheckCircle2, Clock, AlertCircle, Ticket, Calendar, Building, 
  User, Printer, ZoomIn, ZoomOut, X, ChevronLeft, ChevronRight, ExternalLink 
} from 'lucide-react'

// 🚀 OTIMIZAÇÃO: Função de formatação para 5 dígitos
const formatarNumeroOS = (numero) => {
  if (!numero) return '00000';
  return String(numero).padStart(5, '0');
}

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

export default function ChamadoDetalhes({ chamado, voltarParaLista, iniciarEdicao, handleExcluir }) {
  const navigate = useNavigate() 
  const { moduloAtivo } = useModulo() 

  const isPDF = (url) => url?.toLowerCase().includes('.pdf')
  
  const imagens = chamado.anexos?.filter(url => !isPDF(url)) || []
  const documentos = chamado.anexos?.filter(url => isPDF(url)) || []

  const [lightboxAberto, setLightboxAberto] = useState(false)
  const [imagemAtiva, setImagemAtiva] = useState(null)

  const handleImprimir = () => window.print()

  const irParaEquipamento = () => {
    if (chamado.equipamento_id) {
      navigate(`/${moduloAtivo}/equipamentos`, { 
        state: { openDetailsId: chamado.equipamento_id, _t: Date.now() } 
      });
    }
  }

  return (
    <div className="w-full mx-auto space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-300 print:p-0 print:bg-white relative min-w-0">
      
      <style>{`
        @media print {
          @page { margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
          body * { visibility: hidden !important; }
          .print-container, .print-container * { visibility: visible !important; }
          .print-container { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; padding: 0 !important; display: flex !important; flex-direction: column !important; gap: 20px !important; }
          .no-print { display: none !important; }
          .print-break-inside-avoid { break-inside: avoid; }
        }
      `}</style>

      {/* CABEÇALHO */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm no-print w-full min-w-0">
        <div className="flex-1 min-w-0 pr-0 xl:pr-4">
          <div className="flex items-center gap-3 mb-2.5 min-w-0">
            <span className={`shrink-0 px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase border flex items-center gap-1.5 shadow-sm ${chamado.tipo_intervencao === 'Preventiva' ? 'bg-green-50 text-green-700 border-green-200' : chamado.tipo_intervencao === 'Calibração' ? 'bg-blue-50 text-blue-700 border-blue-200' : chamado.tipo_intervencao === 'Qualificação' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
               <div className={`w-1.5 h-1.5 rounded-full ${chamado.tipo_intervencao === 'Preventiva' ? 'bg-green-500' : chamado.tipo_intervencao === 'Calibração' ? 'bg-blue-500' : chamado.tipo_intervencao === 'Qualificação' ? 'bg-purple-500' : 'bg-red-500'}`}></div>
               {chamado.tipo_intervencao || 'Corretiva'}
            </span>
            {/* 🚀 AQUI APARECE A O.S. DE 5 DÍGITOS DESTACADA */}
            <span className="text-[11px] font-black text-indigo-700 uppercase tracking-widest bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg shrink-0">
              OS #{formatarNumeroOS(chamado.numero_os)}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 uppercase tracking-tight break-words leading-[1.1] w-full">
            Ordem de Serviço Técnica
          </h1>
        </div>
        
        {/* BOTÕES NO MOBILE (Organizados lado a lado) */}
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 shrink-0 w-full xl:w-auto mt-2 xl:mt-0 min-w-0">
          <div className="flex gap-3 w-full sm:w-auto min-w-0">
            <button onClick={voltarParaLista} className="flex-1 sm:flex-none justify-center px-4 py-3.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95 min-w-0">
              <ArrowLeft size={18} className="shrink-0" /> <span className="truncate">Voltar</span>
            </button>
            <button onClick={handleImprimir} className="flex-1 sm:flex-none justify-center px-4 py-3.5 text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95 min-w-0">
              <Printer size={18} className="shrink-0" /> <span className="truncate">Imprimir</span>
            </button>
          </div>
          <div className="flex gap-3 w-full sm:w-auto min-w-0">
            <button onClick={() => iniciarEdicao(chamado)} className="flex-1 sm:flex-none justify-center px-4 py-3.5 text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95 min-w-0">
              <Edit size={18} className="shrink-0" /> <span className="truncate">Editar</span>
            </button>
            <button onClick={() => handleExcluir(chamado.id)} className="flex-1 sm:flex-none justify-center px-4 py-3.5 text-sm font-bold text-red-600 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95 min-w-0">
              <Trash2 size={18} className="shrink-0" /> <span className="truncate">Excluir</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start print-container w-full min-w-0">
        
        <div className="hidden print:block w-full border-b-2 border-slate-800 pb-4 mb-2">
           <h2 className="text-2xl font-black text-slate-900 uppercase">Ordem de Serviço Técnica</h2>
           <p className="text-slate-500 font-bold mt-1">OS #{formatarNumeroOS(chamado.numero_os)} - Emitida em {new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        <div className="lg:col-span-8 space-y-6 print:w-full min-w-0">
          
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm print:border-slate-800 print:shadow-none print:p-4 print-break-inside-avoid min-w-0">
            <h3 className="text-[11px] font-black text-slate-400 mb-6 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-3 print:border-slate-800 truncate">
              <FileText className="text-slate-400 no-print shrink-0" size={16} /> Relato / Descrição Técnica
            </h3>
            <p className="text-slate-700 text-sm md:text-base bg-amber-50/50 p-6 rounded-2xl border border-amber-100/50 min-h-[200px] whitespace-pre-wrap leading-relaxed shadow-inner print:shadow-none print:border-slate-300 print:bg-white font-medium break-words max-w-full">
              {chamado.descricao || 'Nenhum detalhe técnico foi inserido.'}
            </p>
          </div>

          {(imagens.length > 0 || documentos.length > 0) && (
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm no-print min-w-0 w-full">
              <h3 className="text-[11px] font-black text-slate-400 mb-6 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-3 truncate">
                <Paperclip className="text-slate-400 shrink-0" size={16} /> Documentos e Anexos
              </h3>
              
              {imagens.length > 0 && (
                <div className="mb-8">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Fotos / Imagens ({imagens.length})</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {imagens.map((imgUrl, index) => (
                      <div 
                        key={index} 
                        onClick={() => { setImagemAtiva(imgUrl); setLightboxAberto(true); }}
                        className="group relative flex flex-col items-center justify-center border border-slate-200 rounded-2xl overflow-hidden cursor-pointer hover:border-indigo-400 transition-all h-32 md:h-40 shadow-sm bg-slate-50"
                      >
                        <img src={imgUrl} alt={`Foto OS ${index}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-colors duration-300 flex items-center justify-center">
                           <span className="opacity-0 group-hover:opacity-100 bg-white/95 text-slate-800 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all shadow-lg">
                             <ZoomIn size={16}/> Ampliar
                           </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {documentos.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Laudos PDF ({documentos.length})</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {documentos.map((docUrl, index) => (
                      <a 
                        key={index} 
                        href={docUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="group relative flex flex-col items-center justify-center p-4 border border-slate-200 rounded-2xl bg-rose-50/30 hover:bg-rose-50 hover:border-rose-300 transition-all text-center h-32 md:h-40 shadow-sm"
                      >
                        <FileText size={48} className="text-rose-500 mb-4 group-hover:-translate-y-2 transition-transform duration-300 drop-shadow-sm" />
                        <span className="text-xs font-bold text-slate-700 bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-100 group-hover:border-rose-200 transition-colors truncate w-full">Abrir PDF</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6 print:static print:w-full min-w-0">
          
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm print:border-slate-800 print:shadow-none print:p-4 min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 print:text-black truncate">Status Atual da OS</p>
            <div className={`flex items-center gap-4 p-5 rounded-2xl border print:border-slate-300 print:text-black print:bg-white shadow-inner min-w-0 ${chamado.status?.nome === 'Concluído' ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800' : chamado.status?.nome === 'Aberto' ? 'bg-amber-50/80 border-amber-200 text-amber-800' : 'bg-blue-50/80 border-blue-200 text-blue-800'}`}>
              {chamado.status?.nome === 'Concluído' ? <CheckCircle2 size={32} className="no-print shrink-0" /> : chamado.status?.nome === 'Aberto' ? <Clock size={32} className="no-print shrink-0" /> : <AlertCircle size={32} className="no-print shrink-0" />}
              <span className="text-xl md:text-2xl font-black uppercase tracking-tight truncate">{chamado.status?.nome || 'Sem Status'}</span>
            </div>
          </div>

          <div 
            onClick={irParaEquipamento}
            className={`bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4 print:border-slate-800 print:shadow-none print:p-4 group transition-all relative min-w-0 ${chamado.equipamento_id ? 'cursor-pointer hover:border-indigo-300 hover:shadow-md hover:bg-indigo-50/30' : ''}`}
          >
            {chamado.equipamento_id && (
              <div className="absolute top-5 right-5 text-slate-300 group-hover:text-indigo-500 transition-colors no-print">
                <ExternalLink size={20} />
              </div>
            )}
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100 no-print group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-inner"><Monitor size={24} /></div>
            
            <div className="flex-1 min-w-0 pr-6 print:pr-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-500 transition-colors truncate">Equipamento Vinculado</p>
              <h3 className="text-base font-black text-slate-800 leading-tight tracking-tight uppercase group-hover:text-indigo-900 transition-colors truncate w-full block">{chamado.equipamento?.nome || 'Excluído'}</h3>
              <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1 truncate w-full"><Hash size={12} className="shrink-0"/> Patrimônio: <span className="truncate">{chamado.equipamento?.patrimonio || 'S/N'}</span></p>
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm print:border-slate-800 print:shadow-none print:p-4 min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 print:text-black border-b border-slate-100 pb-2 print:border-slate-800 truncate">Cronograma da Intervenção</p>
            
            <div className="relative space-y-6">
              <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-slate-100 no-print"></div>

              <div className="flex items-start gap-4 relative z-10 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center text-slate-400 shrink-0 no-print shadow-sm"><Ticket size={20}/></div>
                <div className="pt-1 min-w-0"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 print:text-black truncate">Data de Abertura</p><p className="text-sm font-bold text-slate-800 truncate">{chamado.data_abertura ? new Date(chamado.data_abertura).toLocaleString('pt-BR') : '-'}</p></div>
              </div>
              
              <div className="flex items-start gap-4 relative z-10 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-white border-2 border-blue-200 flex items-center justify-center text-blue-500 shrink-0 no-print shadow-sm"><Calendar size={20}/></div>
                <div className="pt-1 min-w-0"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 print:text-black truncate">Previsão Agendada</p><p className="text-sm font-bold text-slate-800 truncate">{chamado.data_prevista ? new Date(chamado.data_prevista).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Não agendado'}</p></div>
              </div>

              {chamado.data_conclusao && (
                <div className="flex items-start gap-4 relative z-10 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 border-2 border-emerald-500 flex items-center justify-center text-white shrink-0 no-print shadow-md"><CheckCircle2 size={20}/></div>
                  <div className="pt-1 min-w-0"><p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mb-0.5 print:text-black truncate">Data de Conclusão</p><p className="text-sm font-black text-emerald-800 print:text-black truncate">{new Date(chamado.data_conclusao).toLocaleString('pt-BR')}</p></div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm print:border-slate-800 print:shadow-none print:p-4 min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 print:text-black border-b border-slate-100 pb-2 print:border-slate-800 truncate">Execução & Responsáveis</p>
            <div className="space-y-5">
              <div className="flex flex-col gap-1 border-b border-slate-50 pb-4 print:border-slate-300 min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 print:text-black truncate"><Building size={12} className="no-print shrink-0"/> Fornecedor / Prestador</span>
                <span className="text-sm font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 inline-block w-fit mt-1 print:bg-white print:border-none print:px-0 print:py-0 truncate max-w-full">{chamado.prestador?.nome || 'Manutenção Interna'}</span>
              </div>
              <div className="flex flex-col gap-1 border-b border-slate-50 pb-4 print:border-slate-300 min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 print:text-black truncate"><Hash size={12} className="no-print shrink-0"/> Protocolo Externo (OS)</span>
                <span className="text-sm font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 inline-block w-fit mt-1 print:bg-white print:border-none print:px-0 print:py-0 truncate max-w-full">{chamado.protocolo_externo || 'S/ Protocolo'}</span>
              </div>
              {/* 🚀 DESTAQUE DO TÉCNICO RESPONSÁVEL */}
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 print:text-black truncate"><User size={12} className="no-print shrink-0"/> Técnico Responsável</span>
                <span className="text-sm font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 inline-block w-fit mt-1 print:bg-white print:border-none print:px-0 print:py-0 truncate max-w-full">{chamado.aberto_por?.nome || 'Técnico N/D'}</span>
              </div>
            </div>
          </div>

        </div>

        <div className="hidden print:flex w-full justify-between items-end mt-16 pt-8">
           <div className="w-64 border-t-2 border-slate-800 text-center pt-2 font-bold text-xs uppercase tracking-wider">Assinatura do Técnico</div>
           <div className="w-64 border-t-2 border-slate-800 text-center pt-2 font-bold text-xs uppercase tracking-wider">Visto do Solicitante / Fiscal</div>
        </div>

      </div>

      {lightboxAberto && (
         <GaleriaLightbox imagens={imagens} indexInicial={imagens.indexOf(imagemAtiva)} onClose={() => setLightboxAberto(false)} />
      )}
    </div>
  )
}