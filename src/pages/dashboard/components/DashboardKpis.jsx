import { Activity, Wrench, AlertTriangle, CheckCircle, MonitorPlay, FileText, DollarSign, ArrowRight } from 'lucide-react'

export default function DashboardKpis({ kpis, moduloAtivo, navigate, setModalInoperantes }) {
  const isImpressoras = moduloAtivo === 'impressoras';

  return (
    // Removido o grid, usado flex-wrap para quebrar linha automaticamente
    // gap-3 garante o espaçamento entre cards
    <div className="flex flex-wrap gap-3">
      {/* Definimos uma largura flexível (w-...) que se ajusta */}
      <div className="w-[calc(25%-9px)] min-w-[140px] flex-grow"><KpiCard titulo="Total de Equip." valor={kpis.totalEquip} icone={<MonitorPlay />} cor="slate" onClick={() => navigate(`/${moduloAtivo}/equipamentos`)} /></div>
      <div className="w-[calc(25%-9px)] min-w-[140px] flex-grow"><KpiCard titulo="Disponibilidade" valor={`${kpis.dispPercent}%`} icone={<CheckCircle />} cor={kpis.dispPercent > 90 ? 'emerald' : 'amber'} /></div>
      <div className="w-[calc(25%-9px)] min-w-[140px] flex-grow"><KpiCard titulo="OS Abertas" valor={kpis.osAbertas} icone={<Wrench />} cor="blue" onClick={() => navigate(`/${moduloAtivo}/chamados`)} /></div>
      <div className="w-[calc(25%-9px)] min-w-[140px] flex-grow" onClick={() => setModalInoperantes(prev => ({ ...prev, aberto: true }))}>
        <div className="cursor-pointer group hover:-translate-y-1 transition-all"><KpiCard titulo="Inoperantes" valor={kpis.inoperantes} icone={<AlertTriangle />} cor="red" pulse={kpis.inoperantes > 0} /></div>
      </div>

      {isImpressoras && (
        <>
          <div className="w-[calc(33.3%-8px)] min-w-[140px] flex-grow"><KpiCard titulo="OS Concluídas" valor={kpis.concluidasMes} icone={<Activity />} cor="indigo" onClick={() => navigate(`/${moduloAtivo}/chamados`)} /></div>
          <div className="w-[calc(33.3%-8px)] min-w-[140px] flex-grow"><KpiCard titulo="Páginas Mês" valor={kpis.paginasMes?.toLocaleString('pt-BR')} icone={<FileText />} cor="purple" /></div>
          <div className="w-[calc(33.3%-8px)] min-w-[140px] flex-grow"><KpiCard titulo="Custo Fat." valor={`R$ ${kpis.custoMes?.toFixed(2).replace('.', ',')}`} icone={<DollarSign />} cor="emerald" /></div>
        </>
      )}
      {!isImpressoras && <div className="w-[calc(25%-9px)] min-w-[140px] flex-grow"><KpiCard titulo="Concl. Mês" valor={kpis.concluidasMes} icone={<Activity />} cor="indigo" onClick={() => navigate(`/${moduloAtivo}/chamados`)} /></div>}
    </div>
  )
}

function KpiCard({ titulo, valor, icone, cor, pulse, onClick }) {
  const estilos = {
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  }
  
  return (
    <div onClick={onClick} className={`bg-white p-2 md:p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 h-full transition-all ${pulse ? 'ring-2 ring-red-200 ring-offset-2' : ''} ${onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300' : ''}`}>
      <div className={`w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center shrink-0 border ${estilos[cor]}`}>
        <span className="scale-75 md:scale-90">{icone}</span>
      </div>
      <div className="min-w-0">
        {/* Usando text-[9px] para garantir que o título nunca quebre a linha */}
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider truncate">{titulo}</p>
        {/* Usando text-sm para o valor não ser maior que o container */}
        <h3 className="text-sm md:text-md font-black text-slate-800 leading-none truncate">{valor}</h3>
      </div>
    </div>
  )
}