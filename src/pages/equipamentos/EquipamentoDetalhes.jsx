import { useState, useEffect, useRef, useCallback } from 'react' 
import { createPortal } from 'react-dom' 
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase' 
import { useModulo } from '../../contexts/ModuloContext'
import { 
  ArrowLeft, Edit, Wrench, FileText, CheckCircle2, AlertTriangle, Factory, 
  Image as ImageIcon, Activity, ZoomIn, ZoomOut, X, ChevronLeft, ChevronRight, Loader2 
} from 'lucide-react'

// Importação das listas específicas
import DetalheBilhetagem from './components/DetalheBilhetagem'
import DetalheHistorico from './components/DetalheHistorico'

// ============================================================================
// COMPONENTE ISOLADO: LIGHTBOX NÍVEL ENTERPRISE (Zero Lag, Zoom com Scroll e Física)
// ============================================================================
const GaleriaLightbox = ({ imagens, indexInicial, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(indexInicial || 0)
  const [zoomVisual, setZoomVisual] = useState(1)

  // Refs para manipulação direta da GPU
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

// ============================================================================
// COMPONENTE PRINCIPAL DA PÁGINA DE DETALHES
// ============================================================================
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

      // Pré-carrega as imagens na RAM silenciosamente
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

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-300 p-4 relative">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-slate-200 pb-4">
        <div className="flex-1 min-w-0 pr-4">
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tight break-words leading-tight">
            {equipamento.nome}
          </h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">Detalhes completos do equipamento.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button onClick={onVoltar} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-all">
            <ArrowLeft size={16} /> Voltar
          </button>
          <button onClick={() => onEditar(equipamento)} className="px-4 py-2 text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl flex items-center gap-2 transition-all">
            <Edit size={16} /> Editar
          </button>
          <button onClick={() => navigate(`/${moduloAtivo}/chamados`, { state: { action: 'novo', equipamentoId: equipamento.id } })} className="px-4 py-2 text-sm font-bold text-white bg-blue-800 hover:bg-blue-900 rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
            <Wrench size={16} /> Registrar OS
          </button>
        </div>
      </div>

      {/* DADOS PRINCIPAIS */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <FileText className="text-blue-600" size={20} /> Dados principais
        </h3>

        <div className="flex flex-col md:flex-row gap-8 mb-6">
          <div className="w-full md:w-72 flex flex-col gap-4 shrink-0">
            
            {/* FOTO PRINCIPAL */}
            <div 
              onClick={() => setLightboxAberto(true)}
              className="w-full h-64 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200 overflow-hidden cursor-pointer group relative shadow-inner"
            >
              {imagemAtiva ? (
                <>
                  {!imagemPrincipalCarregada && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
                      <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                    </div>
                  )}
                  <img 
                    src={imagemAtiva} 
                    alt="Equipamento" 
                    onLoad={() => setImagemPrincipalCarregada(true)}
                    // 🚀 AQUI ESTÁ A CORREÇÃO: Removida a transição de opacidade demorada e artificial
                    className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${imagemPrincipalCarregada ? 'opacity-100' : 'opacity-0'}`} 
                  />
                  <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors duration-300 flex items-center justify-center z-20">
                    <div className="bg-white text-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 font-bold text-xs shadow-lg">
                      <ZoomIn size={16} /> Ampliar Foto
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-slate-400">
                  <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
                  <span className="text-xs font-bold uppercase tracking-widest">Sem imagem</span>
                </div>
              )}
            </div>

            {/* MINIATURAS (Zero Delay) */}
            {todasAsImagens.length > 1 && (
              <div 
                className="flex gap-2 overflow-x-auto pb-2 pt-1 scroll-smooth" 
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} 
              >
                <style>{`div::-webkit-scrollbar { display: none; }`}</style>
                {todasAsImagens.map((img, idx) => (
                  <div 
                    key={idx} 
                    // 🚀 AQUI: Ao clicar, apenas altera o link da imagem (sem resets e loadings forçados)
                    onClick={() => setImagemAtiva(img)}
                    className={`w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 cursor-pointer transition-all duration-200 shadow-sm ${imagemAtiva === img ? 'border-blue-600 opacity-100 ring-2 ring-blue-600/20' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {!isModuloTecnologia && (
              <div className="flex flex-col gap-2 mt-2">
                {equipamento.possui_etiqueta && <span className="bg-indigo-50 text-indigo-700 px-3 py-2 rounded-xl text-xs font-bold border border-indigo-100 flex items-center justify-center gap-2"><CheckCircle2 size={16}/> Possui Etiqueta</span>}
                {equipamento.sem_patrimonio && <span className="bg-rose-50 text-rose-700 px-3 py-2 rounded-xl text-xs font-bold border border-rose-200 flex items-center justify-center gap-2"><AlertTriangle size={16}/> Sem Patrimônio</span>}
              </div>
            )}
          </div>

          {/* DADOS EM TEXTO */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-10 text-sm">
            <div className="flex flex-col border-b border-slate-50 pb-2"><span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-1">Número de série</span><span className="font-bold text-slate-800 text-base">{equipamento.numero_serie || '-'}</span></div>
            <div className="flex flex-col border-b border-slate-50 pb-2"><span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-1">Patrimônio</span><span className="font-bold text-slate-800 text-base">{equipamento.patrimonio || '-'}</span></div>
            <div className="flex flex-col border-b border-slate-50 pb-2"><span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-1">Modelo</span><span className="font-bold text-slate-800 text-base">{equipamento.modelo || '-'}</span></div>
            <div className="flex flex-col border-b border-slate-50 pb-2"><span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-1">Fabricante</span><span className="font-bold text-slate-800 text-base">{equipamento.fabricante?.nome || '-'}</span></div>
            
            {moduloAtivo === 'medicos' && (
              <div className="flex flex-col border-b border-emerald-50 pb-2 md:col-span-2">
                <span className="text-emerald-600 font-bold mb-1 flex items-center gap-1.5 uppercase text-[11px] tracking-wider"><Activity size={14} /> Registro ANVISA</span>
                <span className="font-black text-slate-800 text-lg">{equipamento.registro_anvisa || 'Não informado'}</span>
              </div>
            )}

            {moduloAtivo === 'impressoras' && (
               <div className="flex flex-col border-b border-slate-50 pb-2 md:col-span-2"><span className="text-purple-600 font-bold mb-1 uppercase text-[11px] tracking-wider">Tipo de Impressora</span><span className="font-black text-slate-800 text-base">{equipamento.tipo_impressora || 'Não definido'}</span></div>
            )}

            {isModuloTecnologia ? (
              <>
                <div className="flex flex-col border-b border-slate-50 pb-2"><span className="text-blue-600 font-bold mb-1 uppercase text-[11px] tracking-wider">IP / MAC Address</span><span className="font-bold text-slate-800 text-base">{equipamento.ip_mac_address || '-'}</span></div>
                <div className="flex flex-col border-b border-slate-50 pb-2"><span className="text-blue-600 font-bold mb-1 uppercase text-[11px] tracking-wider">Garantia/Contrato</span><span className="font-bold text-slate-800 text-base">{equipamento.data_garantia ? new Date(equipamento.data_garantia).toLocaleDateString('pt-BR') : '-'}</span></div>
              </>
            ) : (
              <div className="flex flex-col border-b border-slate-50 pb-2"><span className="text-slate-400 font-bold mb-1 flex items-center gap-1.5 uppercase text-[11px] tracking-wider"><Factory size={14}/> Data de Fabricação</span><span className="font-bold text-slate-800 text-base">{equipamento.data_fabricacao ? new Date(equipamento.data_fabricacao).toLocaleDateString('pt-BR') : 'Desconhecida'}</span></div>
            )}
            <div className="flex flex-col border-b border-slate-50 pb-2 md:col-span-2"><span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-1">Local / Setor</span><span className="font-bold text-blue-800 text-base">{equipamento.unidade?.nome || '-'} / {equipamento.setor?.nome || '-'}</span></div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-3">Observações adicionais:</span>
          <p className="text-slate-700 bg-slate-50 p-5 rounded-xl border border-slate-200 min-h-[80px] font-medium leading-relaxed">{equipamento.observacoes || 'Nenhuma observação cadastrada.'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {moduloAtivo === 'impressoras' && (
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
             <DetalheBilhetagem equipamento={equipamento} />
          </div>
        )}
        
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
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