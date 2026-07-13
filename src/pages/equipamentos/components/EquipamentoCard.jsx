import { Image as ImageIcon, AlertTriangle, CheckCircle2, Clock, Copy, Edit, Trash2 } from 'lucide-react'

export default function EquipamentoCard({ 
  eq, 
  moduloAtivo, 
  statusCalib, 
  onVerDetalhes, 
  onEditar, 
  onDuplicar, 
  onExcluir 
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col md:flex-row group">
      <div className="w-full md:w-64 h-48 md:h-auto bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100 flex items-center justify-center shrink-0 relative">
        {eq.imagem_url ? (
          <img src={eq.imagem_url} alt={eq.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="flex flex-col items-center text-slate-300">
            <ImageIcon size={48} className="mb-2" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Sem Imagem</span>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="bg-white/90 backdrop-blur text-blue-800 px-3 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase border border-white/50 shadow-sm">
            {eq.status?.nome || 'Sem Status'}
          </span>
        </div>
      </div>

      <div className="flex-1 p-5 md:p-6 flex flex-col justify-center gap-5">
        <div>
          <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-tight mb-2">{eq.nome}</h3>
          <div className="flex flex-wrap gap-2">
            {eq.sem_patrimonio && <span className="bg-rose-50 text-rose-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-rose-200 uppercase flex items-center gap-1.5"><AlertTriangle size={12}/> Sem Patrimônio</span>}
            {eq.possui_etiqueta ? <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-indigo-100 uppercase flex items-center gap-1.5">🏷️ Etiquetado</span> : <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-amber-200 uppercase flex items-center gap-1.5">⚠️ Sem Etiqueta</span>}
            {statusCalib === 'atrasada' && <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-red-200 uppercase flex items-center gap-1.5"><Clock size={12}/> Prev./Calib. Atrasada</span>}
            {statusCalib === 'em_dia' && <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-emerald-200 uppercase flex items-center gap-1.5"><CheckCircle2 size={12}/> Prev./Calib. em Dia</span>}
          </div>
        </div>

        <div className="bg-slate-50/80 rounded-xl p-4 md:p-5 grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 border border-slate-100 shadow-sm">
          {/* Coluna 1: Série */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Série</span>
            <span className="font-bold text-slate-800 text-sm truncate" title={eq.numero_serie}>{eq.numero_serie || '-'}</span>
          </div>

          {/* Coluna 2: Patrimônio */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Patrimônio</span>
            <span className="font-bold text-slate-800 text-sm truncate" title={eq.patrimonio}>{eq.patrimonio || '-'}</span>
          </div>

          {/* Coluna 3: Modelo OU ANVISA (Lógica Condicional) */}
          {moduloAtivo === 'medicos' ? (
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider mb-1">Reg. ANVISA</span>
              <span className="font-bold text-emerald-700 text-sm truncate" title={eq.registro_anvisa}>{eq.registro_anvisa || 'N/A'}</span>
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Modelo</span>
              <span className="font-bold text-slate-800 text-sm truncate" title={eq.modelo}>{eq.modelo || '-'}</span>
            </div>
          )}

          {/* Coluna 4 e 5: Local / Setor (Ocupa as 2 colunas restantes) */}
          <div className="flex flex-col col-span-2 lg:col-span-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Local / Setor</span>
            <span className="font-bold text-blue-700 text-sm truncate" title={`${eq.unidade?.nome} ${eq.setor?.nome ? `- ${eq.setor?.nome}` : ''}`}>
              {eq.unidade?.nome} 
              <span className="text-slate-500 font-medium">{eq.setor?.nome ? ` (${eq.setor?.nome})` : ''}</span>
            </span>
          </div>
        </div>

        <div className="flex justify-end flex-wrap gap-3 mt-1">
          <button onClick={() => onDuplicar(eq)} className="px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1.5 mr-auto">
            <Copy size={14} /> Duplicar
          </button>
          <button onClick={() => onVerDetalhes(eq)} className="px-5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-800 rounded-lg transition-colors">
            Ver detalhes
          </button>
          <button onClick={() => onEditar(eq)} className="px-5 py-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-1.5">
            <Edit size={14} /> Editar
          </button>
          <button onClick={() => onExcluir(eq.id)} className="px-5 py-2 text-xs font-bold text-red-600 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 rounded-lg transition-colors flex items-center gap-1.5">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}