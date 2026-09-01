import { Calendar, XCircle, Shield, Ban, CheckCircle2 } from 'lucide-react'

const NOMES_MODULOS = {
  medicos: 'Médicos',
  ti: 'TI',
  infra: 'Nobreaks',
  manutencao: 'Predial',
  impressoras: 'Impressoras'
}

const CORES_MODULOS = {
  medicos: 'bg-blue-50 text-blue-700 border-blue-200',
  ti: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  infra: 'bg-amber-50 text-amber-700 border-amber-200',
  manutencao: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  impressoras: 'bg-rose-50 text-rose-700 border-rose-200'
}

const formatarDataCompleta = (dataString) => {
  if (!dataString) return '';
  const data = new Date(dataString);
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' às ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const obterClasseCorSla = (corId) => {
  const mapa = { red: 'bg-red-500', orange: 'bg-orange-500', amber: 'bg-amber-500', emerald: 'bg-emerald-500', blue: 'bg-blue-500' }
  return mapa[corId] || 'bg-amber-500'
}

export default function CartaoKanban({ ticket, onOpen }) {
  const dataFormatada = formatarDataCompleta(ticket.created_at)
  
  const isCanceladoCliente = ticket.status === 'Cancelado pelo Utilizador';
  const isRejeitadoEquipa = ticket.status === 'Rejeitado';
  const isResolvido = ticket.status === 'Resolvido';

  const numeroProtocolo = ticket.numero_ticket ? `#${String(ticket.numero_ticket).padStart(5, '0')}` : '#00001'
  const slaNome = ticket.sla?.nome || 'SLA Padrão'
  const slaCor = ticket.sla?.cor || 'amber'
  const moduloKey = ticket.equipamento?.modulo || 'ti'
  const nomeModuloFormatado = NOMES_MODULOS[moduloKey] || 'Geral'
  const classeModulo = CORES_MODULOS[moduloKey] || 'bg-slate-50 text-slate-700 border-slate-200'
  const tituloExibicao = ticket.titulo || ticket.equipamento?.nome || 'Chamado sem título'

  return (
    <div 
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', ticket.id)
        e.dataTransfer.effectAllowed = 'move'
        setTimeout(() => { e.target.style.opacity = '0.4' }, 0)
      }}
      onDragEnd={(e) => { e.target.style.opacity = '1' }}
      onClick={() => onOpen(ticket)}
      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-grab active:cursor-grabbing group relative select-none"
    >
      <div className="flex justify-between items-start mb-2 gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
            {numeroProtocolo}
          </span>
          <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md border font-extrabold ${classeModulo}`}>
            {nomeModuloFormatado}
          </span>
        </div>
        
        {isCanceladoCliente && (
          <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1 shrink-0">
            <XCircle size={10} /> Cancelado (Cliente)
          </span>
        )}
        {isRejeitadoEquipa && (
          <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1 shrink-0">
            <Ban size={10} /> Rejeitado (Equipa)
          </span>
        )}
        {isResolvido && (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1 shrink-0">
            <CheckCircle2 size={10} /> Resolvido
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
          <Calendar size={12} className="text-slate-400 shrink-0" />
          <span>{dataFormatada}</span>
        </div>
        <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md border bg-slate-50 text-slate-700 border-slate-200 font-bold flex items-center gap-1 shrink-0">
          <span className={`w-2 h-2 rounded-full inline-block ${obterClasseCorSla(slaCor)}`}></span>
          {slaNome}
        </span>
      </div>

      <h4 className="font-black text-slate-800 text-sm leading-tight mb-1 group-hover:text-indigo-600 transition-colors line-clamp-2" title={tituloExibicao}>
        {tituloExibicao}
      </h4>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 truncate" title={`${ticket.equipamento?.nome} - Pat: ${ticket.equipamento?.patrimonio}`}>
        {ticket.equipamento?.nome || 'Equipamento'} • {ticket.equipamento?.patrimonio || 'S/N'}
      </p>

      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3">
        <p className="text-xs font-medium text-slate-600 line-clamp-2 leading-relaxed" title={ticket.descricao}>
          {ticket.descricao}
        </p>
      </div>

      {ticket.justificativa && (
        <div className="bg-slate-100 p-2 rounded-lg border border-slate-200 mb-3">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">Motivo / Resolução:</p>
          <p className="text-[10px] font-bold text-slate-700 line-clamp-2 leading-tight" title={ticket.justificativa}>
            {ticket.justificativa}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[10px]">
        <div className="flex items-center gap-1.5 font-bold text-slate-500 truncate pr-2">
          <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-black shrink-0">
            {ticket.solicitante?.nome?.charAt(0) || 'U'}
          </div>
          <span className="truncate">{ticket.solicitante?.nome || 'Utilizador'}</span>
        </div>

        <div className="flex items-center gap-1 bg-indigo-50/80 text-indigo-700 px-2 py-1 rounded-lg border border-indigo-100 font-bold shrink-0">
          <Shield size={12} />
          <span>{ticket.tecnico?.nome ? ticket.tecnico.nome.split(' ')[0] : 'Pendente'}</span>
        </div>
      </div>
    </div>
  )
}