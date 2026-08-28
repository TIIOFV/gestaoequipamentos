import { MonitorPlay, CheckCircle2, Wrench, AlertTriangle, Clock, Calendar, AlertCircle } from 'lucide-react'

export default function DashboardKpis({ kpis, moduloAtivo, abrirModalLista }) {
  const isImpressoras = moduloAtivo === 'impressoras'

  return (
    // 🚀 AJUSTE RESPONSIVO PWA: 2 colunas mobile, 3 tablet, 4 desktop
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
      
      {/* KPIS GERAIS (Não clicáveis) */}
      <div className="bg-white p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 hover:shadow-md transition-shadow">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
          <MonitorPlay size={22} className="text-blue-600" />
        </div>
        <div>
          <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Total de Equipamentos</p>
          <p className="text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-none mt-1">{kpis.totalEquip}</p>
        </div>
      </div>

      <div className="bg-white p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 hover:shadow-md transition-shadow">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
          <CheckCircle2 size={22} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Disponibilidade</p>
          <p className="text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-none mt-1">{kpis.dispPercent}%</p>
        </div>
      </div>

      <div className="bg-white p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 hover:shadow-md transition-shadow">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
          <Wrench size={22} className="text-indigo-600" />
        </div>
        <div>
          <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">OS Abertas</p>
          <p className="text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-none mt-1">{kpis.osAbertas}</p>
        </div>
      </div>

      {/* 🚀 BOTÕES DE AÇÃO DRIL-DOWN (Clicáveis que abrem o modal) */}
      <button 
        onClick={() => abrirModalLista('atrasadas')}
        className="text-left bg-white p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-rose-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 hover:shadow-md hover:bg-rose-50 transition-all group active:scale-95"
      >
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-rose-50 group-hover:bg-rose-100 flex items-center justify-center shrink-0 transition-colors">
          <Clock size={22} className="text-rose-600" />
        </div>
        <div>
          <p className="text-[9px] md:text-[10px] font-black text-rose-400 uppercase tracking-widest leading-tight">O.S Atrasadas</p>
          <p className="text-xl md:text-2xl font-black text-rose-700 tracking-tight leading-none mt-1">{kpis.osAtrasadas}</p>
        </div>
      </button>

      <button 
        onClick={() => abrirModalLista('inoperantes')}
        className="text-left bg-white p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-red-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 hover:shadow-md hover:bg-red-50 transition-all group active:scale-95"
      >
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-red-50 group-hover:bg-red-100 flex items-center justify-center shrink-0 transition-colors">
          <AlertTriangle size={22} className="text-red-600" />
        </div>
        <div>
          <p className="text-[9px] md:text-[10px] font-black text-red-400 uppercase tracking-widest leading-tight">Inoperantes</p>
          <p className="text-xl md:text-2xl font-black text-red-700 tracking-tight leading-none mt-1">{kpis.inoperantes}</p>
        </div>
      </button>

      <button 
        onClick={() => abrirModalLista('proximas')}
        className="text-left bg-white p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-amber-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 hover:shadow-md hover:bg-amber-50 transition-all group active:scale-95"
      >
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-amber-50 group-hover:bg-amber-100 flex items-center justify-center shrink-0 transition-colors">
          <AlertCircle size={22} className="text-amber-600" />
        </div>
        <div>
          <p className="text-[9px] md:text-[10px] font-black text-amber-500 uppercase tracking-widest leading-tight">Próximas (10 dias)</p>
          <p className="text-xl md:text-2xl font-black text-amber-700 tracking-tight leading-none mt-1">{kpis.osProximas}</p>
        </div>
      </button>

      {/* 🚀 O ÚLTIMO CARTÃO EXPANDE PARA PREENCHER OS ESPAÇOS VAZIOS NAS DIFERENTES GRELHAS */}
      <button 
        onClick={() => abrirModalLista('agendadas')}
        className="col-span-2 md:col-span-3 xl:col-span-2 text-left bg-white p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-sky-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 hover:shadow-md hover:bg-sky-50 transition-all group active:scale-95"
      >
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-sky-50 group-hover:bg-sky-100 flex items-center justify-center shrink-0 transition-colors">
          <Calendar size={22} className="text-sky-600" />
        </div>
        <div>
          <p className="text-[9px] md:text-[10px] font-black text-sky-500 uppercase tracking-widest leading-tight">Total Agendadas</p>
          <p className="text-xl md:text-2xl font-black text-sky-700 tracking-tight leading-none mt-1">{kpis.osAgendadas}</p>
        </div>
      </button>
      
    </div>
  )
}