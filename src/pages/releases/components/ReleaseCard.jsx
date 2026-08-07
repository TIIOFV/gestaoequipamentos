import { useState } from 'react';
import { Rocket, Calendar, Eye, EyeOff, Trash2, Sparkles, Wrench, ChevronDown } from 'lucide-react';

export default function ReleaseCard({ rel, isAdmin, onToggle, onDelete, isLatest }) {
  // A mais recente abre por padrão, as antigas ficam fechadas
  const [isExpanded, setIsExpanded] = useState(isLatest);
  
  const isDraft = !rel.publicado;
  const dataFormatada = rel.data_release
    ? new Date(`${rel.data_release}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  const qtdNovidades = rel.adicionado?.length || 0;
  const qtdCorrecoes = rel.corrigido?.length || 0;

  const handleAdminAction = (e, action) => {
    e.stopPropagation(); // Evita que o clique nos botões de admin abra/feche o card
    action();
  };

  return (
    <div className="relative sm:pl-16 group z-10">
      
      {/* 🚀 MARCADOR DA TIMELINE (Apenas Desktop) */}
      <div className={`hidden sm:flex absolute left-[15px] top-6 w-7 h-7 rounded-full items-center justify-center z-20 transition-transform group-hover:scale-110 shadow-sm
        ${isDraft ? 'bg-amber-500 border-4 border-amber-100' : 
          isLatest ? 'bg-indigo-600 border-4 border-indigo-100 shadow-indigo-500/30 shadow-lg' : 
          'bg-slate-400 border-4 border-white'}`}
      >
        <Rocket size={12} className="text-white" />
      </div>

      <div className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${
          isDraft ? 'border-dashed border-amber-300 bg-amber-50/10' : 
          isLatest ? 'border-indigo-200 shadow-lg shadow-indigo-100/50 ring-1 ring-indigo-50' : 'border-slate-200 hover:shadow-md hover:border-slate-300'
        }`}
      >
        {/* CABEÇALHO DO CARD (Agora é clicável para abrir/fechar) */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className={`p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start gap-4 cursor-pointer transition-colors ${
            isExpanded 
              ? (isLatest ? 'border-b border-indigo-50/50 bg-indigo-50/30' : 'border-b border-slate-100 bg-slate-50/50') 
              : 'hover:bg-slate-50'
          }`}
        >
          <div className="w-full flex justify-between items-center sm:block">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`text-xl font-black tracking-tight ${isLatest ? 'bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent' : 'text-slate-800'}`}>
                  {rel.versao}
                </span>
                
                {isLatest && !isDraft && (
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                    Mais Recente
                  </span>
                )}
                
                {isDraft && (
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 animate-pulse">
                    Rascunho Oculto
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm font-semibold text-slate-500 flex items-center gap-1.5 capitalize">
                  <Calendar size={14} className={isLatest ? 'text-indigo-400' : 'text-slate-400'} /> {dataFormatada}
                </span>

                {/* RESUMO INTELIGENTE (Só aparece se estiver fechado) */}
                {!isExpanded && (qtdNovidades > 0 || qtdCorrecoes > 0) && (
                  <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
                    {qtdNovidades > 0 && <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1"><Sparkles size={12}/> {qtdNovidades} Novidades</span>}
                    {qtdCorrecoes > 0 && <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1"><Wrench size={12}/> {qtdCorrecoes} Correções</span>}
                  </div>
                )}
              </div>
            </div>

            {/* SETINHA MOBILE (Se esconde no desktop para não poluir) */}
            <div className="sm:hidden text-slate-400">
              <ChevronDown size={20} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* CONTROLES DE ADMIN */}
            {isAdmin && (
              <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-xl border border-slate-200 shadow-sm shrink-0">
                <button
                  onClick={(e) => handleAdminAction(e, () => onToggle(rel.id, rel.publicado))}
                  title={isDraft ? 'Tornar Público' : 'Ocultar dos utilizadores'}
                  className={`p-2 rounded-lg font-bold flex items-center gap-2 text-xs transition-colors ${rel.publicado ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'}`}
                >
                  {rel.publicado ? <><EyeOff size={16} /> Ocultar</> : <><Eye size={16} /> Publicar</>}
                </button>
                <div className="w-px h-4 bg-slate-200"></div>
                <button
                  onClick={(e) => handleAdminAction(e, () => onDelete(rel.id))}
                  title="Excluir Permanentemente"
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
            
            {/* SETINHA DESKTOP */}
            <div className={`hidden sm:flex w-8 h-8 rounded-full items-center justify-center transition-colors ${isExpanded ? 'bg-slate-100 text-slate-600' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
              <ChevronDown size={18} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>

        {/* CORPO DO CARD (Só renderiza se isExpanded for true) */}
        {isExpanded && (
          <div className="p-5 sm:p-6 space-y-6 animate-in slide-in-from-top-2 fade-in duration-200">
            {(!rel.adicionado?.length && !rel.corrigido?.length) && (
              <p className="text-sm text-slate-400 italic text-center py-4">Sem notas detalhadas para esta versão.</p>
            )}

            {rel.adicionado?.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-500" /> Novidades & Recursos
                </h4>
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-3">
                  {rel.adicionado.map((item, i) => (
                    <div key={`a-${i}`} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0"></div>
                      <span className="text-sm font-medium text-emerald-900 leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {rel.corrigido?.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                  <Wrench size={16} className="text-blue-500" /> Ajustes & Correções
                </h4>
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3">
                  {rel.corrigido.map((item, i) => (
                    <div key={`c-${i}`} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0"></div>
                      <span className="text-sm font-medium text-blue-900 leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}