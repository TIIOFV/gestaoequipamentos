import { Image as ImageIcon, AlertTriangle, CheckCircle2, Clock, Copy, Edit, Trash2, CalendarDays, Network, Printer as PrinterIcon, ShieldCheck, MapPin, Hash, Barcode } from 'lucide-react'

const formatarDataLocal = (dataString) => {
  if (!dataString) return '-';
  const data = new Date(dataString);
  data.setMinutes(data.getMinutes() + data.getTimezoneOffset());
  return data.toLocaleDateString('pt-BR');
}

export default function EquipamentoCard({ 
  eq, 
  moduloAtivo, 
  statusCalib, 
  onVerDetalhes, 
  onEditar, 
  onDuplicar, 
  onExcluir 
}) {
  const isTecnologia = ['ti', 'impressoras'].includes(moduloAtivo);

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col xl:flex-row p-3 md:p-4 gap-6 group w-full overflow-hidden">
      
      {/* 📷 ÁREA DA IMAGEM */}
      <div className="w-full xl:w-80 h-64 xl:h-auto bg-slate-50 rounded-3xl flex items-center justify-center shrink-0 relative overflow-hidden border border-slate-100 shadow-inner">
        {eq.imagem_url ? (
          <img src={eq.imagem_url} alt={eq.nome} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
        ) : (
          <div className="flex flex-col items-center text-slate-300 bg-slate-100/50 w-full h-full justify-center">
            <ImageIcon size={56} className="mb-3 opacity-40" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Sem Imagem</span>
          </div>
        )}
        <div className="absolute top-4 left-4">
          <span className="bg-white/95 backdrop-blur-md text-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase border border-white shadow-sm flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${eq.status?.nome?.toLowerCase() === 'ativo' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-400'}`}></div>
            {eq.status?.nome || 'Sem Status'}
          </span>
        </div>
      </div>

      {/* 📄 ÁREA DE CONTEÚDO E DADOS (AGORA COM min-w-0 PARA BLOQUEAR ESTOURO) */}
      <div className="flex-1 flex flex-col justify-between py-2 xl:pr-2 min-w-0">
        
        {/* Cabeçalho do Card */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6 min-w-0">
          
          {/* 🚀 AQUI ESTÁ A CORREÇÃO PRINCIPAL: flex-1 e min-w-0 forçam o container a respeitar o limite, e line-clamp-2 corta o texto graciosamente */}
          <div className="flex-1 min-w-0 w-full">
            <h3 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tight leading-none mb-3 break-words line-clamp-2" title={eq.nome}>
              {eq.nome}
            </h3>
            
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-slate-500 font-bold min-w-0">
              {eq.fabricante?.nome && (
                <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg border border-slate-200 shadow-sm truncate max-w-full">
                  {eq.fabricante.nome}
                </span>
              )}
              {eq.modelo && (
                <span className="flex items-center gap-1 bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-sm truncate max-w-full">
                  Mod: <strong className="text-slate-800 truncate">{eq.modelo}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap md:justify-end gap-2 shrink-0 w-full md:w-auto">
            {eq.sem_patrimonio && <span className="bg-rose-50 text-rose-700 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-rose-200 uppercase flex items-center gap-1.5 shadow-sm"><AlertTriangle size={14}/> Sem Patrimônio</span>}
            {eq.possui_etiqueta ? <span className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-indigo-100 uppercase flex items-center gap-1.5 shadow-sm">🏷️ Etiquetado</span> : <span className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-amber-200 uppercase flex items-center gap-1.5 shadow-sm">⚠️ Sem Etiqueta</span>}
            {statusCalib === 'atrasada' && <span className="bg-red-50 text-red-700 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-red-200 uppercase flex items-center gap-1.5 shadow-sm"><Clock size={14}/> Calib. Atrasada</span>}
            {statusCalib === 'em_dia' && <span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-emerald-200 uppercase flex items-center gap-1.5 shadow-sm"><CheckCircle2 size={14}/> Calib. em Dia</span>}
          </div>
        </div>

        <div className="bg-slate-50/70 rounded-3xl p-5 border border-slate-100 shadow-inner mb-6 w-full">
          <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4">
            
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest flex items-center gap-1.5"><Hash size={12}/> Série</span>
              <span className="font-bold text-slate-800 text-sm truncate bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-sm" title={eq.numero_serie}>{eq.numero_serie || '-'}</span>
            </div>

            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest flex items-center gap-1.5"><Barcode size={12}/> Patrimônio</span>
              <span className="font-bold text-slate-800 text-sm truncate bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-sm" title={eq.patrimonio}>{eq.patrimonio || '-'}</span>
            </div>

            <div className="flex flex-col col-span-2 lg:col-span-1 2xl:col-span-2 gap-1.5 min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest flex items-center gap-1.5"><MapPin size={12}/> Local / Setor</span>
              <span className="font-bold text-blue-700 text-sm truncate bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-sm" title={`${eq.unidade?.nome} - ${eq.setor?.nome}`}>
                {eq.unidade?.nome || 'Não definido'} 
                <span className="text-slate-500 font-medium truncate">{eq.setor?.nome ? ` (${eq.setor?.nome})` : ''}</span>
              </span>
            </div>

            {moduloAtivo === 'impressoras' && (
              <div className="flex flex-col gap-1.5 min-w-0">
                <span className="text-[10px] uppercase font-bold text-purple-500 tracking-widest flex items-center gap-1.5"><PrinterIcon size={12}/> Impressora</span>
                <span className="font-bold text-purple-900 text-sm truncate bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-sm">{eq.tipo_impressora || 'Não definido'}</span>
              </div>
            )}

            {isTecnologia && (
              <>
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-blue-500 tracking-widest flex items-center gap-1.5"><Network size={12}/> IP / MAC</span>
                  <span className="font-bold text-slate-800 text-sm truncate font-mono bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-sm">{eq.ip_mac_address || '-'}</span>
                </div>
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-amber-600 tracking-widest flex items-center gap-1.5"><ShieldCheck size={12}/> Garantia</span>
                  <span className="font-bold text-slate-800 text-sm truncate bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-sm">{formatarDataLocal(eq.data_garantia)}</span>
                </div>
              </>
            )}

            {moduloAtivo === 'medicos' && (
              <>
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-widest">Reg. ANVISA</span>
                  <span className="font-black text-emerald-700 text-sm truncate bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-sm">{eq.registro_anvisa || 'N/A'}</span>
                </div>
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-orange-500 tracking-widest flex items-center gap-1.5"><CalendarDays size={12}/> Próx. Calib.</span>
                  <span className="font-bold text-slate-800 text-sm truncate bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-sm">{formatarDataLocal(eq.data_proxima_calibracao)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end flex-wrap gap-3 mt-auto w-full">
          <button onClick={() => onDuplicar(eq)} className="px-5 py-3 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl transition-colors flex items-center justify-center gap-2 md:mr-auto shadow-sm active:scale-95 flex-1 md:flex-none">
            <Copy size={16} /> Duplicar
          </button>
          <button onClick={() => onVerDetalhes(eq)} className="px-6 py-3 text-xs font-bold text-white bg-slate-800 border border-slate-800 hover:bg-slate-900 rounded-xl transition-colors shadow-sm active:scale-95 flex-1 md:flex-none">
            Ver detalhes
          </button>
          <button onClick={() => onEditar(eq)} className="px-6 py-3 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm active:scale-95 flex-1 md:flex-none">
            <Edit size={16} /> Editar
          </button>
          <button onClick={() => onExcluir(eq.id)} className="px-5 py-3 text-xs font-bold text-red-600 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm active:scale-95">
            <Trash2 size={16} />
          </button>
        </div>

      </div>
    </div>
  )
}