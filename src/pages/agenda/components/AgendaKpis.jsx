import { Target, CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react'

export default function AgendaKpis({ ano, estatisticasAno, abrirModalLista }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col xl:flex-row gap-6 justify-between items-center">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 w-full">
        
        <div 
          onClick={() => abrirModalLista(`Planejamento Total - ${ano}`, 'blue', estatisticasAno.total.lista)}
          className={`p-3 rounded-xl border flex flex-col items-center justify-center relative group transition-all ${estatisticasAno.total.count > 0 ? 'bg-blue-50 border-blue-200 hover:bg-blue-100 cursor-pointer' : 'bg-slate-50 border-slate-100 opacity-70'}`}
        >
          <span className={`text-[10px] uppercase font-bold flex items-center gap-1 mb-1 ${estatisticasAno.total.count > 0 ? 'text-blue-600' : 'text-slate-400'}`}><Target size={12}/> Planejado no Ano</span>
          <span className={`text-2xl font-black ${estatisticasAno.total.count > 0 ? 'text-blue-800' : 'text-slate-400'}`}>{estatisticasAno.total.count}</span>
          {estatisticasAno.total.count > 0 && <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight size={14} className="text-blue-500"/></div>}
        </div>

        <div 
          onClick={() => abrirModalLista(`Manutenções Realizadas - ${ano}`, 'emerald', estatisticasAno.realizados.lista)}
          className={`p-3 rounded-xl border flex flex-col items-center justify-center relative group transition-all ${estatisticasAno.realizados.count > 0 ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 cursor-pointer' : 'bg-slate-50 border-slate-100 opacity-70'}`}
        >
          <span className={`text-[10px] uppercase font-bold flex items-center gap-1 mb-1 ${estatisticasAno.realizados.count > 0 ? 'text-emerald-600' : 'text-slate-400'}`}><CheckCircle2 size={12}/> Realizados</span>
          <span className={`text-2xl font-black ${estatisticasAno.realizados.count > 0 ? 'text-emerald-800' : 'text-slate-400'}`}>{estatisticasAno.realizados.count}</span>
          {estatisticasAno.realizados.count > 0 && <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight size={14} className="text-emerald-500"/></div>}
        </div>

        <div 
          onClick={() => abrirModalLista(`A Fazer / Pendentes - ${ano}`, 'amber', estatisticasAno.aFazer.lista)}
          className={`p-3 rounded-xl border flex flex-col items-center justify-center relative group transition-all ${estatisticasAno.aFazer.count > 0 ? 'bg-amber-50 border-amber-200 hover:bg-amber-100 cursor-pointer' : 'bg-slate-50 border-slate-100 opacity-70'}`}
        >
          <span className={`text-[10px] uppercase font-bold flex items-center gap-1 mb-1 ${estatisticasAno.aFazer.count > 0 ? 'text-amber-600' : 'text-slate-400'}`}><Clock size={12}/> A Fazer (Pendentes)</span>
          <span className={`text-2xl font-black ${estatisticasAno.aFazer.count > 0 ? 'text-amber-800' : 'text-slate-400'}`}>{estatisticasAno.aFazer.count}</span>
          {estatisticasAno.aFazer.count > 0 && <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight size={14} className="text-amber-500"/></div>}
        </div>

        <div 
          onClick={() => abrirModalLista(`OS Atrasadas - ${ano}`, 'red', estatisticasAno.atrasados.lista)}
          className={`p-3 rounded-xl flex flex-col items-center justify-center border relative group transition-all ${estatisticasAno.atrasados.count > 0 ? 'bg-red-50 border-red-200 hover:bg-red-100 cursor-pointer' : 'bg-slate-50 border-slate-100 opacity-70'}`}
        >
          <span className={`text-[10px] uppercase font-bold flex items-center gap-1 mb-1 ${estatisticasAno.atrasados.count > 0 ? 'text-red-600' : 'text-slate-400'}`}><AlertTriangle size={12}/> Atrasados</span>
          <span className={`text-2xl font-black ${estatisticasAno.atrasados.count > 0 ? 'text-red-700' : 'text-slate-600'}`}>{estatisticasAno.atrasados.count}</span>
          {estatisticasAno.atrasados.count > 0 && <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight size={14} className="text-red-500"/></div>}
        </div>

      </div>
    </div>
  )
}