import { AlertTriangle, Clock, ArrowRight, CalendarClock, Wrench } from 'lucide-react'

export default function DashboardListas({ listas, moduloAtivo, navigate }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden flex flex-col">
        <div className="bg-red-50/50 p-5 border-b border-red-100 flex justify-between items-center">
          <h3 className="font-bold text-red-800 flex items-center gap-2"><AlertTriangle size={18} className="text-red-600" /> OS Atrasadas</h3>
          <button onClick={() => navigate(`/${moduloAtivo}/chamados`)} className="text-xs font-bold text-red-600 hover:text-red-800 hover:underline px-2 py-1 rounded transition-colors">Resolver pendências</button>
        </div>
        <div className="divide-y divide-slate-100 flex-1">
          {listas.atrasadas.length === 0 ? <div className="p-8 text-center text-slate-400 text-sm">Nenhuma OS em atraso! 🎉</div> : listas.atrasadas.map(ch => (
            <div key={ch.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 text-red-600 rounded-lg"><Clock size={16} /></div>
                <div>
                  <p className="text-sm font-bold text-slate-800 line-clamp-1">{ch.equipamento?.nome}</p>
                  <p className="text-xs text-slate-500">{ch.tipo_intervencao} • Previsão era {new Date(ch.data_prevista).toLocaleDateString('pt-BR', {timeZone:'UTC'})}</p>
                </div>
              </div>
              <button onClick={() => navigate(`/${moduloAtivo}/chamados`, { state: { openDetailsId: ch.id } })} className="p-2 hover:bg-white rounded-full transition-colors"><ArrowRight size={16} className="text-slate-300 hover:text-red-500" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden flex flex-col">
        <div className="bg-blue-50/50 p-5 border-b border-blue-100 flex justify-between items-center">
          <h3 className="font-bold text-blue-800 flex items-center gap-2"><CalendarClock size={18} className="text-blue-600" /> Próximas na Agenda</h3>
          <button onClick={() => navigate(`/${moduloAtivo}/agenda`)} className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline px-2 py-1 rounded transition-colors">Ver Agenda Completa</button>
        </div>
        <div className="divide-y divide-slate-100 flex-1">
          {listas.proximas.length === 0 ? <div className="p-8 text-center text-slate-400 text-sm">Nenhum agendamento futuro no sistema.</div> : listas.proximas.map(ch => (
            <div key={ch.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Wrench size={16} /></div>
                <div>
                  <p className="text-sm font-bold text-slate-800 line-clamp-1">{ch.equipamento?.nome}</p>
                  <p className="text-xs text-slate-500">{ch.tipo_intervencao} • Agendado: {new Date(ch.data_prevista).toLocaleDateString('pt-BR', {timeZone:'UTC'})}</p>
                </div>
              </div>
              <button onClick={() => navigate(`/${moduloAtivo}/chamados`, { state: { openDetailsId: ch.id } })} className="p-2 hover:bg-white rounded-full transition-colors"><ArrowRight size={16} className="text-slate-300 hover:text-blue-500" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}