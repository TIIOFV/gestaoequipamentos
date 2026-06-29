import { ArrowLeft, Edit, Wrench, FileText, CheckCircle2, AlertTriangle, Factory, Image as ImageIcon, Images, Activity } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useModulo } from '../../contexts/ModuloContext'

// IMPORTANDO OS COMPONENTES
import DetalheBilhetagem from './components/DetalheBilhetagem'
import DetalheHistorico from './components/DetalheHistorico'

export default function EquipamentoDetalhes({ equipamento, historico, onVoltar, onEditar }) {
  const navigate = useNavigate()
  const { moduloAtivo } = useModulo()
  
  // Blindagem contra objetos nulos
  if (!equipamento) return <div className="p-10 text-center text-slate-500">Equipamento não encontrado.</div>;

  const isModuloTecnologia = ['ti', 'impressoras'].includes(moduloAtivo)

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500 p-4">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{equipamento.nome}</h1>
          <p className="text-slate-500 mt-1">Detalhes completos do equipamento.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={onVoltar} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border hover:bg-slate-50 rounded-xl flex items-center gap-2"><ArrowLeft size={16} /> Voltar</button>
          <button onClick={() => onEditar(equipamento)} className="px-5 py-2.5 text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl flex items-center gap-2"><Edit size={16} /> Editar</button>
          <button onClick={() => navigate(`/${moduloAtivo}/chamados`, { state: { action: 'novo', equipamentoId: equipamento.id } })} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-800 hover:bg-blue-900 rounded-xl flex items-center gap-2"><Wrench size={16} /> Registrar manutenção</button>
        </div>
      </div>

      {/* DADOS PRINCIPAIS */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><FileText className="text-blue-600" size={20} /> Dados principais</h3>

        <div className="flex flex-col md:flex-row gap-8 mb-6">
          <div className="w-full md:w-64 flex flex-col gap-4">
            <div className="w-full h-52 bg-slate-50 rounded-2xl flex items-center justify-center border overflow-hidden">
              {equipamento.imagem_url ? <img src={equipamento.imagem_url} alt="Equipamento" className="w-full h-full object-cover" /> : <div className="text-center text-slate-400"><ImageIcon size={48} className="mx-auto mb-2 opacity-50" /><span className="text-xs">Sem imagem</span></div>}
            </div>
            {!isModuloTecnologia && (
              <div className="flex flex-col gap-2">
                {equipamento.possui_etiqueta && <span className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-indigo-100 flex justify-center gap-2"><CheckCircle2 size={14}/> Possui Etiqueta</span>}
                {equipamento.sem_patrimonio && <span className="bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-rose-200 flex justify-center gap-2"><AlertTriangle size={14}/> Sem Patrimônio</span>}
              </div>
            )}
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-10 text-sm">
            <div className="flex flex-col border-b border-slate-50 pb-2"><span className="text-slate-500 font-semibold mb-1">Número de série</span><span className="font-medium">{equipamento.numero_serie || '-'}</span></div>
            <div className="flex flex-col border-b border-slate-50 pb-2"><span className="text-slate-500 font-semibold mb-1">Patrimônio</span><span className="font-medium">{equipamento.patrimonio || '-'}</span></div>
            <div className="flex flex-col border-b border-slate-50 pb-2"><span className="text-slate-500 font-semibold mb-1">Modelo</span><span className="font-medium">{equipamento.modelo || '-'}</span></div>
            <div className="flex flex-col border-b border-slate-50 pb-2"><span className="text-slate-500 font-semibold mb-1">Fabricante</span><span className="font-medium">{equipamento.fabricante?.nome || '-'}</span></div>
            
            {/* NOVO: REGISTRO ANVISA (VIGILÂNCIA SANITÁRIA) */}
            {moduloAtivo === 'medicos' && (
              <div className="flex flex-col border-b border-emerald-50 pb-2 md:col-span-2">
                <span className="text-emerald-700 font-bold mb-1 flex items-center gap-1"><Activity size={14} /> Registro ANVISA</span>
                <span className="font-black text-slate-800 text-base">{equipamento.registro_anvisa || 'Não informado'}</span>
              </div>
            )}

            {moduloAtivo === 'impressoras' && (
               <div className="flex flex-col border-b border-slate-50 pb-2 md:col-span-2"><span className="text-purple-600 font-bold mb-1">Tipo de Impressora</span><span className="font-black text-slate-800">{equipamento.tipo_impressora || 'Não definido'}</span></div>
            )}

            {isModuloTecnologia ? (
              <>
                <div className="flex flex-col border-b border-slate-50 pb-2"><span className="text-blue-600 font-semibold mb-1">IP / MAC Address</span><span className="font-medium">{equipamento.ip_mac_address || '-'}</span></div>
                <div className="flex flex-col border-b border-slate-50 pb-2"><span className="text-blue-600 font-semibold mb-1">Garantia/Contrato</span><span className="font-medium">{equipamento.data_garantia ? new Date(equipamento.data_garantia).toLocaleDateString('pt-BR') : '-'}</span></div>
              </>
            ) : (
              <div className="flex flex-col border-b border-slate-50 pb-2"><span className="text-slate-500 font-semibold mb-1 flex items-center gap-1"><Factory size={14}/> Data de Fabricação</span><span className="font-medium">{equipamento.data_fabricacao ? new Date(equipamento.data_fabricacao).toLocaleDateString('pt-BR') : 'Desconhecida'}</span></div>
            )}
            <div className="flex flex-col border-b border-slate-50 pb-2 md:col-span-2"><span className="text-slate-500 font-semibold mb-1">Local / Setor</span><span className="font-medium">{equipamento.unidade?.nome || '-'} / {equipamento.setor?.nome || '-'}</span></div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <span className="text-slate-500 font-semibold block mb-3">Observações adicionais:</span>
          <p className="text-slate-700 bg-slate-50 p-5 rounded-xl border min-h-[80px]">{equipamento.observacoes || 'Nenhuma observação.'}</p>
        </div>

        {equipamento.fotos_adicionais?.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2"><Images className="text-blue-600" size={18} /> Galeria ({equipamento.fotos_adicionais.length})</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {equipamento.fotos_adicionais.map((foto, index) => (
                <a key={index} href={foto} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-xl overflow-hidden border"><img src={foto} className="w-full h-full object-cover hover:scale-105 transition-transform" /></a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RENDERIZAÇÃO ISOLADA DAS EXTENSÕES */}
      <div className="grid grid-cols-1 gap-6">
        {moduloAtivo === 'impressoras' && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
             <DetalheBilhetagem equipamento={equipamento} />
          </div>
        )}
        
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
           <DetalheHistorico historico={historico || []} equipamento={equipamento} />
        </div>
      </div>
      
    </div>
  )
}