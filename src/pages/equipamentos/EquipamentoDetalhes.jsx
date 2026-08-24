import { useState, useEffect, useRef, useCallback } from 'react' 
import { createPortal } from 'react-dom' 
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase' 
import { useModulo } from '../../contexts/ModuloContext'
import { 
  ArrowLeft, Edit, Wrench, FileText, CheckCircle2, AlertTriangle, Factory, 
  Image as ImageIcon, Activity, ZoomIn, ZoomOut, X, ChevronLeft, ChevronRight, Loader2,
  Network, Printer as PrinterIcon, ShieldCheck, MapPin, Hash, Barcode, CalendarDays, Clock
} from 'lucide-react'

import DetalheBilhetagem from './components/DetalheBilhetagem'
import DetalheHistorico from './components/DetalheHistorico'

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
          alt="Ampliada"
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

export default function EquipamentoDetalhes({ equipamento, onVoltar, onEditar }) {
  const navigate = useNavigate()
  const { moduloAtivo } = useModulo()
  
  const [historicoLocal, setHistoricoLocal] = useState([])
  const [imagemAtiva, setImagemAtiva] = useState(null)
  const [todasAsImagens, setTodasAsImagens] = useState([])
  const [lightboxAberto, setLightboxAberto] = useState(false)
  const [imagemPrincipalCarregada, setImagemPrincipalCarregada] = useState(false)

  useEffect(() => {
    if (equipamento?.id) {
      buscarHistorico();
      
      const galeria = [];
      if (equipamento.imagem_url) galeria.push(equipamento.imagem_url);
      if (equipamento.fotos_adicionais && equipamento.fotos_adicionais.length > 0) {
        galeria.push(...equipamento.fotos_adicionais);
      }
      setTodasAsImagens(galeria);
      setImagemAtiva(galeria[0] || null);

      galeria.forEach(url => { const img = new Image(); img.src = url; });
    }
  }, [equipamento]);

  const buscarHistorico = async () => {
    const { data } = await supabase
      .from('chamados')
      .select(`*, status:status_id(nome), aberto_por:aberto_por_id(nome), prestador:prestador_id(nome)`)
      .eq('equipamento_id', equipamento.id)
      .order('data_abertura', { ascending: false });

    if (data) setHistoricoLocal(data);
  };

  if (!equipamento) return <div className="p-10 text-center text-slate-500">Equipamento não encontrado.</div>;

  const isModuloTecnologia = ['ti', 'impressoras'].includes(moduloAtivo)

  const formatarData = (dataString) => {
    if (!dataString) return '-';
    const data = new Date(dataString);
    data.setMinutes(data.getMinutes() + data.getTimezoneOffset());
    return data.toLocaleDateString('pt-BR');
  }

  return (
    <div className="w-full mx-auto space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-300">
      
      {/* CABEÇALHO COM PROTEÇÃO CONTRA ESTOURO DE TEXTO (min-w-0 e break-words) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm w-full overflow-hidden">
        
        {/* 🚀 AQUI ESTÁ A CORREÇÃO DA PÁGINA DE DETALHES: flex-1 e min-w-0 */}
        <div className="flex-1 min-w-0 pr-0 md:pr-4">
          <div className="flex items-center gap-3 mb-2.5">
            <span className={`shrink-0 px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase border flex items-center gap-1.5 shadow-sm ${equipamento.status?.nome?.toLowerCase() === 'ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
               <div className={`w-1.5 h-1.5 rounded-full ${equipamento.status?.nome?.toLowerCase() === 'ativo' ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
               {equipamento.status?.nome || 'Sem status'}
            </span>
            {equipamento.fabricante?.nome && (
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest truncate">{equipamento.fabricante.nome}</span>
            )}
          </div>
          {/* 🚀 h1 com break-words, assegurando que o texto quebra de linha sem esticar a tela */}
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 uppercase tracking-tight break-words leading-[1.1] w-full">
            {equipamento.nome}
          </h1>
        </div>
        
        <div className="flex flex-wrap md:flex-nowrap items-center gap-3 shrink-0 w-full md:w-auto mt-4 md:mt-0">
          <button onClick={onVoltar} className="flex-1 md:flex-none justify-center px-5 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95">
            <ArrowLeft size={18} /> Voltar
          </button>
          <button onClick={() => onEditar(equipamento)} className="flex-1 md:flex-none justify-center px-5 py-3 text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95">
            <Edit size={18} /> Editar
          </button>
          <button onClick={() => navigate(`/${moduloAtivo}/chamados`, { state: { action: 'novo', equipamentoId: equipamento.id } })} className="w-full md:w-auto justify-center px-5 py-3 text-sm font-bold text-white bg-blue-800 hover:bg-blue-900 rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-95">
            <Wrench size={18} /> Registrar OS
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full min-w-0">
        
        <div className="lg:col-span-4 xl:col-span-3 space-y-6 w-full min-w-0">
          <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-4">
            
            <div 
              onClick={() => setLightboxAberto(true)}
              className="w-full aspect-square bg-slate-50 rounded-3xl flex items-center justify-center border border-slate-100 overflow-hidden cursor-pointer group relative shadow-inner"
            >
              {imagemAtiva ? (
                <>
                  {!imagemPrincipalCarregada && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
                      <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                    </div>
                  )}
                  <img 
                    src={imagemAtiva} 
                    alt="Equipamento" 
                    onLoad={() => setImagemPrincipalCarregada(true)}
                    className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${imagemPrincipalCarregada ? 'opacity-100' : 'opacity-0'}`} 
                  />
                  <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/30 transition-colors duration-300 flex items-center justify-center z-20">
                    <div className="bg-white text-slate-800 px-4 py-2 rounded-xl flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 font-bold text-xs shadow-lg">
                      <ZoomIn size={16} /> Ampliar
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-slate-400">
                  <ImageIcon size={48} className="mx-auto mb-2 opacity-40" />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Sem imagem</span>
                </div>
              )}
            </div>

            {todasAsImagens.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar px-1">
                {todasAsImagens.map((img, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setImagemAtiva(img)}
                    className={`w-16 h-16 shrink-0 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 shadow-sm ${imagemAtiva === img ? 'border-2 border-indigo-500 opacity-100 ring-2 ring-indigo-500/20' : 'border-2 border-transparent opacity-50 hover:opacity-100'}`}
                  >
                    <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-3">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-1">Status do Equipamento</h4>
             {equipamento.sem_patrimonio && <div className="bg-rose-50 text-rose-700 p-3 rounded-xl text-xs font-bold border border-rose-200 flex items-center gap-2"><AlertTriangle size={16}/> Sem Patrimônio</div>}
             {equipamento.possui_etiqueta ? <div className="bg-indigo-50 text-indigo-700 p-3 rounded-xl text-xs font-bold border border-indigo-100 flex items-center gap-2">🏷️ Possui Etiqueta</div> : <div className="bg-amber-50 text-amber-700 p-3 rounded-xl text-xs font-bold border border-amber-200 flex items-center gap-2">⚠️ Sem Etiqueta</div>}
             {!isModuloTecnologia && (equipamento.possui_manual ? <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-xs font-bold border border-emerald-100 flex items-center gap-2">📖 Manual Físico Localizado</div> : <div className="bg-slate-50 text-slate-500 p-3 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-2">Nenhum manual físico</div>)}
          </div>
        </div>

        <div className="lg:col-span-8 xl:col-span-9 space-y-6 w-full min-w-0">
          
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
            <h3 className="text-[11px] font-black text-slate-400 mb-6 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-3">
              <FileText className="text-slate-400" size={16} /> Informações Técnicas
            </h3>

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
              
              <div className="flex flex-col gap-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100 min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest flex items-center gap-1.5"><Hash size={12}/> Série</span>
                <span className="font-bold text-slate-800 text-sm truncate">{equipamento.numero_serie || '-'}</span>
              </div>

              <div className="flex flex-col gap-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100 min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest flex items-center gap-1.5"><Barcode size={12}/> Patrimônio</span>
                <span className="font-bold text-slate-800 text-sm truncate">{equipamento.patrimonio || '-'}</span>
              </div>

              <div className="flex flex-col gap-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100 min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Modelo</span>
                <span className="font-bold text-slate-800 text-sm truncate">{equipamento.modelo || '-'}</span>
              </div>

              <div className="flex flex-col gap-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100 min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Fabricante</span>
                <span className="font-bold text-slate-800 text-sm truncate">{equipamento.fabricante?.nome || '-'}</span>
              </div>

              {moduloAtivo === 'medicos' && (
                <div className="flex flex-col gap-1.5 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 col-span-2 lg:col-span-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-widest flex items-center gap-1.5"><Activity size={12}/> Reg. ANVISA</span>
                  <span className="font-black text-emerald-800 text-sm truncate">{equipamento.registro_anvisa || 'N/A'}</span>
                </div>
              )}

              {moduloAtivo === 'impressoras' && (
                <div className="flex flex-col gap-1.5 p-4 bg-purple-50/50 rounded-2xl border border-purple-100 col-span-2 lg:col-span-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-purple-600 tracking-widest flex items-center gap-1.5"><PrinterIcon size={12}/> Impressora</span>
                  <span className="font-bold text-purple-900 text-sm truncate">{equipamento.tipo_impressora || 'Não definido'}</span>
                </div>
              )}

              {isModuloTecnologia ? (
                <>
                  <div className="flex flex-col gap-1.5 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 col-span-2 lg:col-span-1 min-w-0">
                    <span className="text-[10px] uppercase font-bold text-blue-600 tracking-widest flex items-center gap-1.5"><Network size={12}/> IP / MAC</span>
                    <span className="font-bold text-slate-800 text-sm truncate font-mono">{equipamento.ip_mac_address || '-'}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 col-span-2 lg:col-span-1 min-w-0">
                    <span className="text-[10px] uppercase font-bold text-blue-600 tracking-widest flex items-center gap-1.5"><ShieldCheck size={12}/> Garantia</span>
                    <span className="font-bold text-slate-800 text-sm truncate">{formatarData(equipamento.data_garantia)}</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100 col-span-2 lg:col-span-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest flex items-center gap-1.5"><Factory size={12}/> Fabricação</span>
                  <span className="font-bold text-slate-800 text-sm truncate">{formatarData(equipamento.data_fabricacao)}</span>
                </div>
              )}
              
              <div className="flex flex-col gap-1.5 p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100 col-span-2 lg:col-span-3 xl:col-span-2 min-w-0">
                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-widest flex items-center gap-1.5"><MapPin size={12}/> Local / Setor</span>
                <span className="font-bold text-indigo-800 text-sm truncate">
                  {equipamento.unidade?.nome || '-'} {equipamento.setor?.nome ? `/ ${equipamento.setor?.nome}` : ''}
                </span>
              </div>
            </div>

            {equipamento.observacoes && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block mb-3">Observações adicionais:</span>
                <p className="text-slate-700 bg-amber-50/50 p-5 rounded-2xl border border-amber-100/50 text-sm leading-relaxed">{equipamento.observacoes}</p>
              </div>
            )}
          </div>

          {moduloAtivo === 'impressoras' && (
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm w-full min-w-0">
               <DetalheBilhetagem equipamento={equipamento} />
            </div>
          )}
          
          <DetalheHistorico historico={historicoLocal} equipamento={equipamento} />
          
        </div>
      </div>

      {lightboxAberto && (
        <GaleriaLightbox 
          imagens={todasAsImagens} 
          indexInicial={todasAsImagens.indexOf(imagemAtiva)} 
          onClose={() => setLightboxAberto(false)} 
        />
      )}

    </div>
  )
}