import { Activity, Wrench, AlertTriangle, CheckCircle, MonitorPlay, FileText } from 'lucide-react'

export default function DashboardKpis({ kpis, moduloAtivo, navigate, setModalInoperantes }) {
  const isImpressoras = moduloAtivo === 'impressoras';

  return (
    <div className="flex flex-wrap gap-4">
      <div className="w-[calc(25%-12px)] min-w-[150px] flex-grow"><KpiCard titulo="Total de Equipamentos" valor={kpis.totalEquip} icone={<MonitorPlay />} cor="blue" onClick={() => navigate(`/${moduloAtivo}/equipamentos`)} /></div>
      <div className="w-[calc(25%-12px)] min-w-[150px] flex-grow"><KpiCard titulo="Disponibilidade" valor={`${kpis.dispPercent}%`} icone={<CheckCircle />} cor={kpis.dispPercent > 90 ? 'emerald' : 'amber'} /></div>
      <div className="w-[calc(25%-12px)] min-w-[150px] flex-grow"><KpiCard titulo="OS Abertas" valor={kpis.osAbertas} icone={<Wrench />} cor="indigo" onClick={() => navigate(`/${moduloAtivo}/chamados`)} /></div>
      <div className="w-[calc(25%-12px)] min-w-[150px] flex-grow" onClick={() => setModalInoperantes(prev => ({ ...prev, aberto: true }))}>
        <div className="cursor-pointer group"><KpiCard titulo="Inoperantes" valor={kpis.inoperantes} icone={<AlertTriangle />} cor="red" pulse={kpis.inoperantes > 0} /></div>
      </div>

      {isImpressoras && (
        <>
          <div className="w-[calc(50%-8px)] min-w-[200px] flex-grow"><KpiCard titulo="OS Concluídas no Mês" valor={kpis.concluidasMes} icone={<Activity />} cor="sky" onClick={() => navigate(`/${moduloAtivo}/chamados`)} /></div>
          <div className="w-[calc(50%-8px)] min-w-[200px] flex-grow"><KpiCard titulo="Consumo Faturável (Último)" valor={`${kpis.paginasMes?.toLocaleString('pt-BR')} págs`} icone={<FileText />} cor="fuchsia" /></div>
        </>
      )}
      {!isImpressoras && <div className="w-[calc(25%-12px)] min-w-[150px] flex-grow"><KpiCard titulo="Concluídas Mês" valor={kpis.concluidasMes} icone={<Activity />} cor="sky" onClick={() => navigate(`/${moduloAtivo}/chamados`)} /></div>}
    </div>
  )
}

function KpiCard({ titulo, valor, icone, cor, pulse, onClick }) {
  // Paleta Premium (Fundo clarinho + ícone forte + sombra colorida suave)
  const estilos = {
    blue: 'bg-blue-50 text-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.15)]',
    emerald: 'bg-emerald-50 text-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    amber: 'bg-amber-50 text-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
    red: 'bg-red-50 text-red-600 shadow-[0_0_15px_rgba(225,29,72,0.15)]',
    indigo: 'bg-indigo-50 text-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.15)]',
    fuchsia: 'bg-fuchsia-50 text-fuchsia-600 shadow-[0_0_15px_rgba(217,70,239,0.15)]',
    sky: 'bg-sky-50 text-sky-600 shadow-[0_0_15px_rgba(14,165,233,0.15)]',
  }
  
  return (
    <div onClick={onClick} className={`bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 h-full transition-all duration-300 ${pulse ? 'ring-2 ring-red-400 ring-offset-2 animate-pulse' : ''} ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:border-slate-200' : ''}`}>
      <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shrink-0 ${estilos[cor]} transition-transform duration-300 group-hover:scale-110`}>
        <span className="scale-110">{icone}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest truncate mb-1">{titulo}</p>
        <h3 className="text-xl md:text-2xl font-black text-slate-800 leading-none truncate">{valor}</h3>
      </div>
    </div>
  )
}