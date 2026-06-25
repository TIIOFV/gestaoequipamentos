import { useState } from 'react'
import { Calendar, Clock, User, Wrench, X } from 'lucide-react'

export default function DetalheHistorico({ historico }) {
  const [osDetalheSelecionada, setOsDetalheSelecionada] = useState(null)

  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm mt-6">
      <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
        <Calendar className="text-blue-600" size={20} /> Histórico de manutenções
      </h3>
      
      {historico.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
          <Wrench className="mx-auto text-slate-400 mb-3" size={20} />
          <h4 className="text-slate-700 font-bold mb-1">Nenhuma manutenção encontrada</h4>
        </div>
      ) : (
        <div className="space-y-4">
          {historico.map(manutencao => (
            <div key={manutencao.id} onClick={() => setOsDetalheSelecionada(manutencao)} className="flex flex-col md:flex-row gap-5 p-5 border border-slate-200 rounded-xl bg-slate-50 hover:bg-blue-50 transition-all cursor-pointer group">
              <div className="flex-1">
                <div className="flex flex-wrap justify-between items-start gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold border bg-blue-100 text-blue-800">{manutencao.tipo_intervencao || 'Corretiva'}</span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md border bg-slate-100 text-slate-700">{manutencao.status?.nome}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border">
                    <Clock size={14} className="text-blue-500"/> {new Date(manutencao.data_abertura).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <p className="text-sm text-slate-700 mb-4 line-clamp-2">{manutencao.descricao}</p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500 font-medium pt-3 border-t">
                  <span className="flex items-center gap-1"><User size={12}/> {manutencao.aberto_por?.nome || '-'}</span>
                  <span className="flex items-center gap-1"><Wrench size={12}/> {manutencao.prestador?.nome || 'Manutenção Interna'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {osDetalheSelecionada && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 relative border border-slate-200">
            <button onClick={() => setOsDetalheSelecionada(null)} className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 rounded-full"><X size={20} /></button>
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Ficha da Manutenção</h2>
            <div className="grid grid-cols-2 gap-y-5 gap-x-8 text-sm mb-6 bg-slate-50 p-5 rounded-2xl border">
              <div className="flex flex-col"><span className="font-semibold text-slate-500">Agendado/Aberto em</span><span className="font-bold">{new Date(osDetalheSelecionada.data_abertura).toLocaleString('pt-BR')}</span></div>
              <div className="flex flex-col"><span className="font-semibold text-slate-500">Responsável Interno</span><span className="font-bold">{osDetalheSelecionada.aberto_por?.nome || '-'}</span></div>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 mb-2">Relato Técnico / Descrição</h4>
              <p className="text-slate-600 text-sm whitespace-pre-wrap bg-white border p-5 rounded-xl">{osDetalheSelecionada.descricao}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}