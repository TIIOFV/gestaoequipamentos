import { Target, CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react'

export default function AgendaKpis({ ano, estatisticasAno, abrirModalLista }) {
  return (
    <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col xl:flex-row gap-6 justify-between items-center">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 w-full">
        
        <div 
          onClick={() => abrirModalLista(`Planeamento Total - ${ano}`, 'blue', estatisticasAno.total.lista)}
          className={`p-5 md:p-6 rounded-2xl border flex flex-col items-center justify-center relative group transition-all ${estatisticasAno.total.count > 0 ? 'bg-blue-50/50 border-blue-200 hover:bg-blue-100 cursor-pointer shadow-sm hover:shadow-md' : 'bg-slate-50 border-slate-100 opacity-70'}`}
        >
          <span className={`text-[10px] md:text-xs uppercase font-black tracking-widest flex items-center gap-1.5 mb-2 text-center ${estatisticasAno.total.count > 0 ? 'text-blue-600' : 'text-slate-400'}`}><Target size={14}/> Total no Ano</span>
          <span className={`text-4xl md:text-5xl font-black ${estatisticasAno.total.count > 0 ? 'text-blue-800' : 'text-slate-400'}`}>{estatisticasAno.total.count}</span>
          {estatisticasAno.total.count > 0 && <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight size={18} className="text-blue-500"/></div>}
        </div>

        <div 
          onClick={() => abrirModalLista(`Manutenções Realizadas - ${ano}`, 'emerald', estatisticasAno.realizados.lista)}
          className={`p-5 md:p-6 rounded-2xl border flex flex-col items-center justify-center relative group transition-all ${estatisticasAno.realizados.count > 0 ? 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-100 cursor-pointer shadow-sm hover:shadow-md' : 'bg-slate-50 border-slate-100 opacity-70'}`}
        >
          <span className={`text-[10px] md:text-xs uppercase font-black tracking-widest flex items-center gap-1.5 mb-2 text-center ${estatisticasAno.realizados.count > 0 ? 'text-emerald-600' : 'text-slate-400'}`}><CheckCircle2 size={14}/> Realizados</span>
          <span className={`text-4xl md:text-5xl font-black ${estatisticasAno.realizados.count > 0 ? 'text-emerald-800' : 'text-slate-400'}`}>{estatisticasAno.realizados.count}</span>
          {estatisticasAno.realizados.count > 0 && <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight size={18} className="text-emerald-500"/></div>}
        </div>

        <div 
          onClick={() => abrirModalLista(`A Fazer / Pendentes - ${ano}`, 'amber', estatisticasAno.aFazer.lista)}
          className={`p-5 md:p-6 rounded-2xl border flex flex-col items-center justify-center relative group transition-all ${estatisticasAno.aFazer.count > 0 ? 'bg-amber-50/50 border-amber-200 hover:bg-amber-100 cursor-pointer shadow-sm hover:shadow-md' : 'bg-slate-50 border-slate-100 opacity-70'}`}
        >
          <span className={`text-[10px] md:text-xs uppercase font-black tracking-widest flex items-center gap-1.5 mb-2 text-center ${estatisticasAno.aFazer.count > 0 ? 'text-amber-600' : 'text-slate-400'}`}><Clock size={14}/> A Fazer (Pendente)</span>
          <span className={`text-4xl md:text-5xl font-black ${estatisticasAno.aFazer.count > 0 ? 'text-amber-800' : 'text-slate-400'}`}>{estatisticasAno.aFazer.count}</span>
          {estatisticasAno.aFazer.count > 0 && <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight size={18} className="text-amber-500"/></div>}
        </div>

        <div 
          onClick={() => abrirModalLista(`OS Atrasadas - ${ano}`, 'red', estatisticasAno.atrasados.lista)}
          className={`p-5 md:p-6 rounded-2xl flex flex-col items-center justify-center border relative group transition-all ${estatisticasAno.atrasados.count > 0 ? 'bg-red-50/50 border-red-200 hover:bg-red-100 cursor-pointer shadow-sm hover:shadow-md' : 'bg-slate-50 border-slate-100 opacity-70'}`}
        >
          <span className={`text-[10px] md:text-xs uppercase font-black tracking-widest flex items-center gap-1.5 mb-2 text-center ${estatisticasAno.atrasados.count > 0 ? 'text-red-600' : 'text-slate-400'}`}><AlertTriangle size={14}/> Atrasados</span>
          <span className={`text-4xl md:text-5xl font-black ${estatisticasAno.atrasados.count > 0 ? 'text-red-700' : 'text-slate-600'}`}>{estatisticasAno.atrasados.count}</span>
          {estatisticasAno.atrasados.count > 0 && <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight size={18} className="text-red-500"/></div>}
        </div>

      </div>
    </div>
  )
}