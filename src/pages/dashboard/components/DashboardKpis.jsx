import { Activity, Wrench, AlertTriangle, CheckCircle, MonitorPlay, FileText } from 'lucide-react'

export default function DashboardKpis({ kpis, moduloAtivo, navigate, setModalInoperantes }) {
  const isImpressoras = moduloAtivo === 'impressoras';

  return (
    // 🚀 GRELHA RESPONSIVA PERFEITA: 1 coluna no mobile, 2 em tablets e até 4 em desktop, com espaçamento (gap) generoso
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 w-full">
      <KpiCard 
        titulo="Total de Equipamentos" 
        valor={kpis.totalEquip} 
        icone={<MonitorPlay />} 
        cor="blue" 
        onClick={() => navigate(`/${moduloAtivo}/equipamentos`)} 
      />
      <KpiCard 
        titulo="Disponibilidade" 
        valor={`${kpis.dispPercent}%`} 
        icone={<CheckCircle />} 
        cor={kpis.dispPercent > 90 ? 'emerald' : 'amber'} 
      />
      <KpiCard 
        titulo="OS Abertas" 
        valor={kpis.osAbertas} 
        icone={<Wrench />} 
        cor="indigo" 
        onClick={() => navigate(`/${moduloAtivo}/chamados`)} 
      />
      
      <div onClick={() => setModalInoperantes(prev => ({ ...prev, aberto: true }))} className="cursor-pointer group h-full">
        <KpiCard 
          titulo="Inoperantes" 
          valor={kpis.inoperantes} 
          icone={<AlertTriangle />} 
          cor="red" 
          pulse={kpis.inoperantes > 0} 
        />
      </div>

      {isImpressoras && (
        <>
          <KpiCard 
            titulo="OS Concluídas no Mês" 
            valor={kpis.concluidasMes} 
            icone={<Activity />} 
            cor="sky" 
            onClick={() => navigate(`/${moduloAtivo}/chamados`)} 
          />
          <KpiCard 
            titulo="Consumo Faturável (Último)" 
            valor={`${kpis.paginasMes?.toLocaleString('pt-BR')} págs`} 
            icone={<FileText />} 
            cor="fuchsia" 
          />
        </>
      )}
      {!isImpressoras && (
        <KpiCard 
          titulo="Concluídas Mês" 
          valor={kpis.concluidasMes} 
          icone={<Activity />} 
          cor="sky" 
          onClick={() => navigate(`/${moduloAtivo}/chamados`)} 
        />
      )}
    </div>
  )
}

function KpiCard({ titulo, valor, icone, cor, pulse, onClick }) {
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
    <div 
      onClick={onClick} 
      className={`bg-white p-5 md:p-6 rounded-[2rem] border border-slate-200/80 shadow-sm flex items-center gap-4 md:gap-5 h-full transition-all duration-300 ${
        pulse ? 'ring-2 ring-red-400 ring-offset-2 animate-pulse' : ''
      } ${
        onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-md hover:border-slate-300' : ''
      }`}
    >
      <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shrink-0 ${estilos[cor]} transition-transform duration-300 group-hover:scale-110 shadow-sm`}>
        <span className="scale-125">{icone}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest truncate mb-1.5">{titulo}</p>
        <h3 className="text-2xl md:text-3xl font-black text-slate-800 leading-none truncate">{valor}</h3>
      </div>
    </div>
  )
}