import { AlertTriangle, Clock, ArrowRight, CalendarClock, Wrench, Droplet, Trophy } from 'lucide-react'

const formatarMesAnoExtenso = (dataString) => {
  if (!dataString) return '-';
  const partes = dataString.split('-'); 
  if (partes.length < 2) return dataString;
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${meses[parseInt(partes[1], 10) - 1]} ${partes[0]}`;
}

export default function DashboardListas({ listas, moduloAtivo, navigate }) {
  const isImpressoras = moduloAtivo === 'impressoras';

  // Função para renderizar a medalha do Top 3
  const renderMedalha = (index) => {
    if (index === 0) return "bg-gradient-to-br from-yellow-300 to-yellow-500 text-white shadow-md shadow-yellow-500/30 border-none" // Ouro
    if (index === 1) return "bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-md shadow-slate-500/30 border-none" // Prata
    if (index === 2) return "bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md shadow-orange-600/30 border-none" // Bronze
    return "bg-slate-100 text-slate-400 border border-slate-200" // Outros
  }

  return (
    <div className={`grid grid-cols-1 ${isImpressoras ? 'xl:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
      
      {/* 1. OS ATRASADAS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full min-h-[320px]">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-red-50/50 to-transparent">
          <h3 className="font-black text-slate-800 flex items-center gap-2"><AlertTriangle size={20} className="text-red-500" /> OS Atrasadas</h3>
          <button onClick={() => navigate(`/${moduloAtivo}/chamados`)} className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">Ver todas</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {listas.atrasadas.length === 0 ? <div className="p-8 text-center text-slate-400 text-sm h-full flex items-center justify-center font-medium">Nenhuma OS em atraso! 🎉</div> : listas.atrasadas.map(ch => (
            <div key={ch.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 group">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-red-50 text-red-500 rounded-xl shrink-0 group-hover:scale-110 transition-transform"><Clock size={18} /></div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-700 truncate">{ch.equipamento?.nome}</p>
                  <p className="text-xs font-medium text-slate-400 truncate mt-0.5">{ch.tipo_intervencao} • Previsto para {new Date(ch.data_prevista).toLocaleDateString('pt-BR', {timeZone:'UTC'})}</p>
                </div>
              </div>
              <button onClick={() => navigate(`/${moduloAtivo}/chamados`, { state: { openDetailsId: ch.id } })} className="p-2 bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 rounded-full transition-all ml-2 shadow-sm group-hover:shadow"><ArrowRight size={16} className="text-slate-400 hover:text-red-500" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* 2. PRÓXIMAS NA AGENDA */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full min-h-[320px]">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-sky-50/50 to-transparent">
          <h3 className="font-black text-slate-800 flex items-center gap-2"><CalendarClock size={20} className="text-sky-500" /> Próximas na Agenda</h3>
          <button onClick={() => navigate(`/${moduloAtivo}/agenda`)} className="text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg transition-colors">Abrir Agenda</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {listas.proximas.length === 0 ? <div className="p-8 text-center text-slate-400 text-sm h-full flex items-center justify-center font-medium">Nenhum agendamento futuro.</div> : listas.proximas.map(ch => (
            <div key={ch.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 group">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-sky-50 text-sky-500 rounded-xl shrink-0 group-hover:scale-110 transition-transform"><Wrench size={18} /></div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-700 truncate">{ch.equipamento?.nome}</p>
                  <p className="text-xs font-medium text-slate-400 truncate mt-0.5">{ch.tipo_intervencao} • Agendado para {new Date(ch.data_prevista).toLocaleDateString('pt-BR', {timeZone:'UTC'})}</p>
                </div>
              </div>
              <button onClick={() => navigate(`/${moduloAtivo}/chamados`, { state: { openDetailsId: ch.id } })} className="p-2 bg-white border border-slate-200 hover:border-sky-200 hover:bg-sky-50 rounded-full transition-all ml-2 shadow-sm group-hover:shadow"><ArrowRight size={16} className="text-slate-400 hover:text-sky-500" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* 3. TOP 5 GASTADORES DE COR */}
      {isImpressoras && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full min-h-[320px]">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-rose-50/50 to-transparent">
            <div>
              <h3 className="font-black text-slate-800 flex items-center gap-2"><Trophy size={20} className="text-rose-500" /> Top Gastadores Cor</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider">Ref: {formatarMesAnoExtenso(listas.mesTop5)}</p>
            </div>
            <button onClick={() => navigate(`/${moduloAtivo}/bilhetagem`)} className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors">Auditoria</button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {listas.top5Cor.length === 0 ? <div className="p-8 text-center text-slate-400 text-sm h-full flex items-center justify-center font-medium">Sem dados de auditoria lançados.</div> : listas.top5Cor.map((item, i) => (
              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-rose-50/30 transition-colors border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-4 w-full pr-4">
                  
                  {/* MEDALHAS */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black shrink-0 ${renderMedalha(i)}`}>
                    {i + 1}º
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{item.usuario_setor}</p>
                    <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">{item.equipamento?.nome}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right bg-rose-50/50 px-3 py-1.5 rounded-lg border border-rose-100/50">
                  <span className="text-sm font-black text-rose-600 block">{item.paginas_cor}</span>
                  <span className="text-[9px] text-rose-400 uppercase tracking-widest block font-bold">Págs</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}