import { Rocket, Calendar, Eye, EyeOff, Trash2, CheckCircle2, Wrench } from 'lucide-react';

export default function ReleaseCard({ rel, isAdmin, onToggle, onDelete }) {
  const isDraft = !rel.publicado;
  const dataFormatada = rel.data_release
    ? new Date(`${rel.data_release}T00:00:00`).toLocaleDateString('pt-BR')
    : '';

  return (
    <div className="relative pl-10 last:pb-0">
      {/* Linha vertical da timeline */}
      <div className="absolute left-[11px] top-3 bottom-[-24px] w-px bg-slate-200 last:hidden" />
      {/* Marcador da versão */}
      <div
        className={`absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
          isDraft ? 'border-amber-300 bg-amber-50' : 'border-indigo-500 bg-indigo-500'
        }`}
      >
        <Rocket size={12} className={isDraft ? 'text-amber-500' : 'text-white'} />
      </div>

      <div
        className={`bg-white rounded-2xl border p-6 shadow-sm transition-shadow hover:shadow-md ${
          isDraft ? 'border-dashed border-slate-300' : 'border-slate-200'
        }`}
      >
        <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-lg font-black tracking-tight text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                {rel.versao}
              </span>
              <span
                className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                  isDraft ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {isDraft ? 'Rascunho' : 'Publicado'}
              </span>
            </div>
            <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
              <Calendar size={12} /> {dataFormatada}
            </span>
          </div>

          {isAdmin && (
            <div className="flex gap-1">
              <button
                onClick={() => onToggle(rel.id, rel.publicado)}
                title={isDraft ? 'Publicar' : 'Ocultar'}
                className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                {rel.publicado ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <button
                onClick={() => onDelete(rel.id)}
                title="Excluir"
                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          )}
        </div>

        {rel.adicionado?.length > 0 || rel.corrigido?.length > 0 ? (
          <div className="space-y-2">
            {rel.adicionado?.map((item, i) => (
              <div key={`a-${i}`} className="flex items-start gap-2 text-sm text-emerald-800">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" /> {item}
              </div>
            ))}
            {rel.corrigido?.map((item, i) => (
              <div key={`c-${i}`} className="flex items-start gap-2 text-sm text-blue-800">
                <Wrench size={16} className="mt-0.5 shrink-0 text-blue-500" /> {item}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">Sem itens registrados nesta versão.</p>
        )}
      </div>
    </div>
  );
}
