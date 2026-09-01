import { Calendar, Clock } from 'lucide-react'

const calcularSLAUsuario = (createdAt, prazoSla, status) => {
  if (['Resolvido', 'Rejeitado', 'Cancelado pelo Utilizador'].includes(status)) {
    return { texto: 'Encerrado', corBolinha: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600 border-slate-200' }
  }
  if (status === 'O.S. Gerada') {
    return { texto: 'Em Atendimento (O.S.)', corBolinha: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200 font-bold' }
  }

  const agora = new Date();
  if (prazoSla) {
    const dataPrazo = new Date(prazoSla);
    const diffMs = dataPrazo - agora;
    const diffHoras = Math.abs(diffMs) / 36e5;

    if (diffMs < 0) {
      return { texto: `SLA Estourado`, corBolinha: 'bg-red-500', badge: 'bg-red-50 text-red-700 border-red-200 font-black' }
    }
    if (diffHoras <= 4) {
      return { texto: `Vence em breve`, corBolinha: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200 font-bold' }
    }
    return { texto: `No Prazo`, corBolinha: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium' }
  }
  
  if (status === 'Pausado') {
    return { texto: `Pausado`, corBolinha: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700 border-purple-200 font-medium' }
  }

  return { texto: `Em Análise`, corBolinha: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium' }
}

export default function CardSolicitacao({ item, onClick }) {
  const sla = calcularSLAUsuario(item.created_at, item.prazo_sla, item.status)
  const dataFormatada = new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const prazoFormatado = item.prazo_sla ? new Date(item.prazo_sla).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'A definir'
  
  const numeroProtocolo = item.numero_ticket ? `#${String(item.numero_ticket).padStart(5, '0')}` : '#00001'
  const tituloExibicao = item.titulo || item.equipamento?.nome || 'Chamado sem título'

  return (
    <div 
      onClick={onClick}
      className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between group h-full"
    >
      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
              {numeroProtocolo}
            </span>
            <div className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-lg border flex items-center gap-1.5 ${sla.badge}`}>
              <span className={`w-2 h-2 rounded-full inline-block ${sla.corBolinha}`}></span>
              <span className="font-bold">{sla.texto}</span>
            </div>
          </div>
          
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1 shrink-0">
            <Calendar size={12} /> {dataFormatada}
          </span>
        </div>

        <h3 className="font-black text-slate-800 text-base leading-snug mb-1 group-hover:text-indigo-600 transition-colors line-clamp-2" title={tituloExibicao}>
          {tituloExibicao}
        </h3>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 truncate" title={`${item.equipamento?.nome} - Pat: ${item.equipamento?.patrimonio}`}>
          {item.equipamento?.nome || 'Equipamento não definido'} • {item.equipamento?.patrimonio || 'S/N'}
        </p>

        <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
          <div className="min-w-0">
            <p className="text-[9px] font-black text-slate-400 uppercase">Prazo SLA</p>
            <p className="text-xs font-bold text-slate-700 flex items-center gap-1 mt-0.5 truncate">
              <Clock size={12} className="text-indigo-500 shrink-0"/> {prazoFormatado}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</p>
            <p className="text-xs font-bold text-indigo-600 mt-0.5 truncate">{item.status}</p>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Problema Relatado</p>
          <p className="text-xs font-medium text-slate-700 line-clamp-2 leading-relaxed" title={item.descricao}>
            {item.descricao}
          </p>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-3 mt-2 flex items-center justify-between text-xs font-bold text-slate-500">
        <span className="text-slate-400 text-[11px]">Clique para ver chat e anexos</span>
        <span className="text-indigo-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
          Ver detalhes &rarr;
        </span>
      </div>
    </div>
  )
}