import { MapPin, Wrench, User, Activity } from 'lucide-react'

// Função auxiliar à prova de bugs de fuso horário
const formatDataSegura = (dataString) => {
  if (!dataString) return '-';
  const apenasData = dataString.split('T')[0];
  const [ano, mes, dia] = apenasData.split('-');
  return `${dia}/${mes}/${ano}`;
}

export default function TabelaRelatorio({ dadosBrutos, moduloAtivo, nomeAmbienteImpressao, resumoFiltros, filtrosTexto }) {
  return (
    <div id="relatorio-impresso" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 lg:p-8 overflow-hidden">
      
      {/* Cabeçalho do Documento para o Fiscal */}
      <div className="border-b-2 border-slate-800 pb-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">{nomeAmbienteImpressao} - IOFV</h2>
          <p className="text-slate-600 font-medium mt-1 text-xs md:text-sm">Relatório Analítico Consolidado de Intervenções</p>
          <p className="text-[10px] md:text-xs text-blue-700 font-bold mt-2 bg-blue-50 inline-block px-2 py-1 rounded">
            Filtros Ativos: {resumoFiltros}
          </p>
        </div>
        <div className="w-full md:w-auto text-left md:text-right text-xs md:text-sm text-slate-700 bg-slate-50 border border-slate-200 p-3 rounded-lg">
          <div><span className="font-bold">Período:</span> {filtrosTexto.periodo}</div>
          <div className="mt-1"><span className="font-bold">Setor Gerado:</span> {filtrosTexto.setor}</div>
          <div className="mt-1"><span className="font-bold">Quantidade de OS:</span> {dadosBrutos.length} listadas</div>
        </div>
      </div>

      <div className="w-full overflow-x-auto print:overflow-visible custom-scrollbar pb-2">
        {dadosBrutos.length === 0 ? (
          <div className="text-center py-16 text-slate-400 font-medium text-sm md:text-base">Nenhum registro atende aos critérios deste filtro.</div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[800px] print:min-w-full">
            <thead className="bg-slate-100 border-b border-slate-300">
                <tr>
                <th className="py-2 px-3 md:py-3 md:px-4 text-[10px] md:text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[12%]">Data / OS</th>
                <th className="py-2 px-3 md:py-3 md:px-4 text-[10px] md:text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[25%]">Equipamento / Identificação</th>
                <th className="py-2 px-3 md:py-3 md:px-4 text-[10px] md:text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[45%]">Descrição Técnica do Serviço</th>
                <th className="py-2 px-3 md:py-3 md:px-4 text-[10px] md:text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[18%]">Responsáveis</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {dadosBrutos.map((os) => {
                
                // LÓGICA DE DATA CORRIGIDA
                let tituloData = 'Aberto:'
                let valorData = formatDataSegura(os.data_abertura)
                let corData = 'text-slate-800'

                // Se o chamado foi concluído e existe uma data de conclusão, priorizamos ela!
                if (os.status?.nome === 'Concluído' && os.data_conclusao) {
                  tituloData = 'Concluído:'
                  valorData = formatDataSegura(os.data_conclusao)
                  corData = 'text-emerald-700'
                } else if (os.data_prevista && os.status?.nome !== 'Concluído') {
                  // Se não foi concluído ainda, mas tem data prevista (agendada)
                  tituloData = 'Agendado:'
                  valorData = formatDataSegura(os.data_prevista)
                  corData = 'text-blue-700'
                }

                return (
                  <tr key={os.id} className="hover:bg-slate-50 transition-colors">
                    {/* DATA E STATUS */}
                    <td className="py-3 px-3 md:py-4 md:px-4 align-top">
                      <div className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{tituloData}</div>
                      <div className={`font-bold text-xs md:text-sm mb-2 ${corData}`}>{valorData}</div>
                      
                      <div className={`inline-block px-1.5 py-0.5 rounded text-[9px] md:text-[10px] font-bold uppercase tracking-wider border ${
                        os.tipo_intervencao === 'Preventiva' ? 'bg-green-50 text-green-700 border-green-200' :
                        os.tipo_intervencao === 'Calibração' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        os.tipo_intervencao === 'Qualificação' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {os.tipo_intervencao}
                      </div>
                      <div className={`mt-1.5 text-[10px] md:text-xs font-bold ${os.status?.nome === 'Concluído' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {os.status?.nome || 'Aberto'}
                      </div>
                    </td>

                    {/* EQUIPAMENTO E EXIGÊNCIAS SANITÁRIAS */}
                    <td className="py-3 px-3 md:py-4 md:px-4 align-top">
                      <div className="font-black text-slate-900 text-xs md:text-sm uppercase leading-tight">{os.equipamento?.nome || 'Excluído'}</div>
                      <div className="mt-1 flex flex-col gap-0.5 text-[10px] md:text-[11px] text-slate-500">
                        <span>
                          <strong className="text-slate-400">PAT:</strong>{' '}
                          {os.equipamento?.sem_patrimonio ? (
                            <span className="text-rose-600 font-bold bg-rose-50 px-1 rounded inline-block">PENDENTE</span>
                          ) : (
                            os.equipamento?.patrimonio || '-'
                          )}
                        </span>
                        <span><strong className="text-slate-400">SÉRIE:</strong> {os.equipamento?.numero_serie || '-'}</span>
                        
                        {/* ATUALIZAÇÃO REQUERIDA PELA VIGILÂNCIA SANITÁRIA */}
                        {moduloAtivo === 'medicos' && os.equipamento?.registro_anvisa && (
                          <span className="text-emerald-700 font-bold flex items-center gap-0.5 mt-0.5">
                            <Activity size={10} className="shrink-0"/> ANVISA: {os.equipamento.registro_anvisa}
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-1.5 text-[10px] md:text-xs font-bold text-blue-600 flex items-start gap-1">
                        <MapPin size={10} className="mt-0.5 shrink-0" />
                        <span className="leading-tight">
                          {os.equipamento?.unidade?.nome || 'Não informada'}
                          {os.equipamento?.setor?.nome ? ` (${os.equipamento.setor.nome})` : ''}
                        </span>
                      </div>
                    </td>

                    {/* DESCRIÇÃO DO SERVIÇO REALIZADO */}
                    <td className="py-3 px-3 md:py-4 md:px-4 align-top">
                      <p className="text-xs md:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {os.descricao || '-'}
                      </p>
                    </td>

                    {/* RESPONSÁVEIS */}
                    <td className="py-3 px-3 md:py-4 md:px-4 align-top">
                      <div className="text-xs md:text-sm font-bold text-slate-800 flex items-start gap-1.5 mb-1.5">
                        <Wrench size={12} className="text-slate-400 mt-0.5 shrink-0" />
                        <span className="leading-tight">{os.prestador?.nome || 'Equipe Interna'}</span>
                      </div>
                      <div className="text-[10px] md:text-xs text-slate-500 flex items-start gap-1.5">
                        <User size={10} className="text-slate-400 mt-0.5 shrink-0" />
                        <span className="leading-tight">Solicitante: {os.aberto_por?.nome || '-'}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}