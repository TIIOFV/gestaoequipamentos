import { Activity, CheckCircle2, AlertTriangle, Wrench } from 'lucide-react'

export default function DashboardMatriz({ matriz }) {
  if (!matriz || matriz.length === 0) return null;

  return (
    <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm w-full min-w-0 mt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
          <Activity size={20} className="text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Matriz de Saúde Operacional</h2>
          <p className="text-xs font-bold text-slate-500 mt-0.5">Disponibilidade do parque agrupada por Unidade</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-5">
        {matriz.map((unidade, index) => {
          const saude = parseFloat(unidade.saude);
          let corSaude = 'bg-emerald-500';
          let bgSaude = 'bg-emerald-100';
          if (saude < 90) { corSaude = 'bg-amber-500'; bgSaude = 'bg-amber-100'; }
          if (saude < 75) { corSaude = 'bg-red-500'; bgSaude = 'bg-red-100'; }

          return (
            <div key={index} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:border-indigo-200 hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-black text-slate-700 text-base truncate pr-3" title={unidade.nome}>
                  {unidade.nome}
                </h3>
                <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${saude >= 90 ? 'bg-emerald-100 text-emerald-700' : saude >= 75 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                  {saude}%
                </span>
              </div>

              {/* Barra de Progresso */}
              <div className="w-full h-2 bg-slate-200 rounded-full mb-5 overflow-hidden flex">
                <div className={`h-full ${corSaude} transition-all duration-1000`} style={{ width: `${saude}%` }}></div>
                {unidade.manutencao > 0 && <div className="h-full bg-amber-400 transition-all duration-1000" style={{ width: `${(unidade.manutencao / unidade.total) * 100}%` }}></div>}
                {unidade.inoperantes > 0 && <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${(unidade.inoperantes / unidade.total) * 100}%` }}></div>}
              </div>

              {/* Indicadores */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <CheckCircle2 size={14} className="text-emerald-500 mb-1" />
                  <span className="text-lg font-black text-slate-700 leading-none">{unidade.operantes}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">Ativos</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <Wrench size={14} className="text-amber-500 mb-1" />
                  <span className="text-lg font-black text-slate-700 leading-none">{unidade.manutencao}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">Manut.</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <AlertTriangle size={14} className="text-red-500 mb-1" />
                  <span className="text-lg font-black text-slate-700 leading-none">{unidade.inoperantes}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">Inop.</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}