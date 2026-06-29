import { useState } from 'react'
import { Calendar, Clock, User, Wrench, X, Printer } from 'lucide-react'

// NOVO: Agora recebe o 'equipamento' como prop para montar o relatório impresso
export default function DetalheHistorico({ historico, equipamento }) {
  const [osDetalheSelecionada, setOsDetalheSelecionada] = useState(null)

  const handleImprimir = () => {
    window.print()
  }

  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm mt-6 print:hidden">
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

      {/* MODAL DA FICHA (COM LAYOUT DE IMPRESSÃO) */}
      {osDetalheSelecionada && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:p-0 print:bg-white print:absolute print:inset-0">
          
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-8 relative border border-slate-200 print:shadow-none print:border-none print:rounded-none print:p-0">
            
            {/* Botões ocultos na impressão */}
            <div className="absolute top-6 right-6 flex gap-2 print:hidden">
              <button onClick={handleImprimir} className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full transition-colors flex items-center gap-2 px-4 font-bold text-sm">
                <Printer size={18} /> Imprimir Ficha
              </button>
              <button onClick={() => setOsDetalheSelecionada(null)} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Cabeçalho Oficial (Aparece formatado na impressão) */}
            <div className="mb-8 border-b-2 border-slate-800 pb-4">
              <h2 className="text-2xl font-black text-slate-900 uppercase">Relatório de Intervenção Técnica</h2>
              <p className="text-slate-500 text-sm font-bold mt-1">Ordem de Serviço #{osDetalheSelecionada.id.split('-')[0]}</p>
            </div>

            {/* Dados do Equipamento para o Fiscal */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-slate-50 p-5 rounded-2xl border border-slate-200 print:border-slate-800 print:bg-white">
              <div className="col-span-2 md:col-span-4 mb-2"><span className="text-xs font-bold text-slate-500 block uppercase">Equipamento</span><span className="font-bold text-lg text-slate-800">{equipamento?.nome}</span></div>
              <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 uppercase">Patrimônio</span><span className="font-bold text-slate-800">{equipamento?.patrimonio || 'N/A'}</span></div>
              <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 uppercase">Série</span><span className="font-bold text-slate-800">{equipamento?.numero_serie || 'N/A'}</span></div>
              <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 uppercase">Reg. ANVISA</span><span className="font-bold text-slate-800">{equipamento?.registro_anvisa || 'N/A'}</span></div>
              <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 uppercase">Setor</span><span className="font-bold text-slate-800">{equipamento?.setor?.nome || 'N/A'}</span></div>
            </div>
            
            {/* Dados da Intervenção */}
            <div className="grid grid-cols-2 gap-y-5 gap-x-8 text-sm mb-8 print:mb-6">
              <div className="flex flex-col"><span className="font-bold text-slate-500 uppercase text-xs">Data do Serviço</span><span className="font-bold text-base">{new Date(osDetalheSelecionada.data_abertura).toLocaleDateString('pt-BR')}</span></div>
              <div className="flex flex-col"><span className="font-bold text-slate-500 uppercase text-xs">Tipo</span><span className="font-bold text-base text-blue-700">{osDetalheSelecionada.tipo_intervencao}</span></div>
              <div className="flex flex-col"><span className="font-bold text-slate-500 uppercase text-xs">Responsável Técnico</span><span className="font-bold text-base">{osDetalheSelecionada.aberto_por?.nome || osDetalheSelecionada.prestador?.nome || '-'}</span></div>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 mb-2 uppercase text-sm border-b pb-1">Relato Técnico / Descrição do Serviço</h4>
              <p className="text-slate-800 text-sm whitespace-pre-wrap bg-white border p-5 rounded-xl print:border-none print:p-0 print:pt-2 min-h-[150px]">
                {osDetalheSelecionada.descricao}
              </p>
            </div>

            {/* Campo de Assinatura exclusivo para impressão */}
            <div className="hidden print:flex justify-between items-end mt-24 pt-8">
               <div className="w-64 border-t-2 border-slate-800 text-center pt-2 font-bold text-xs">Responsável Técnico (Assinatura)</div>
               <div className="w-64 border-t-2 border-slate-800 text-center pt-2 font-bold text-xs">Visto da Coordenação / Fiscal</div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}