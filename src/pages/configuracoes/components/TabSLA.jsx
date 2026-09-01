import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { Plus, Trash2, Edit2, Save, X, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import ModalConfirmacao from '../../../components/ModalConfirmacao'
import { Skeleton } from '../../../components/ui/Skeleton'

const CORES_SLA = [
  { id: 'red', nome: 'Vermelho (Crítico)', classeBg: 'bg-red-500' },
  { id: 'orange', nome: 'Laranja (Alto)', classeBg: 'bg-orange-500' },
  { id: 'amber', nome: 'Amarelo (Médio)', classeBg: 'bg-amber-500' },
  { id: 'emerald', nome: 'Verde (Baixo)', classeBg: 'bg-emerald-500' },
  { id: 'blue', nome: 'Azul (Planejado)', classeBg: 'bg-blue-500' }
]

export default function TabSLA() {
  const [slas, setSlas] = useState([])
  const [loading, setLoading] = useState(false)
  
  const [novoItem, setNovoItem] = useState({ nome: '', tempo_resolucao_horas: 24, cor: 'amber' })
  const [editandoId, setEditandoId] = useState(null)
  const [dadosEdicao, setDadosEdicao] = useState({ nome: '', tempo_resolucao_horas: 0, cor: '' })
  const [modalConfirm, setModalConfirm] = useState({ isOpen: false, idExcluir: null })

  useEffect(() => { buscarDados() }, [])

  const buscarDados = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('slas').select('*').order('tempo_resolucao_horas')
    if (!error) setSlas(data || [])
    setLoading(false)
  }

  const handleCadastrarItem = async (e) => {
    e.preventDefault()
    if (!novoItem.nome.trim() || novoItem.tempo_resolucao_horas <= 0) return
    setLoading(true)
    const { error } = await supabase.from('slas').insert([novoItem])
    if (!error) { toast.success('SLA cadastrado com sucesso!'); setNovoItem({ nome: '', tempo_resolucao_horas: 24, cor: 'amber' }); buscarDados(); } 
    else { toast.error('Erro ao cadastrar SLA.'); }
    setLoading(false)
  }

  const salvarEdicao = async (id) => {
    if (!dadosEdicao.nome.trim() || dadosEdicao.tempo_resolucao_horas <= 0) return
    setLoading(true)
    const { error } = await supabase.from('slas').update(dadosEdicao).eq('id', id)
    if (!error) { toast.success('SLA atualizado!'); setEditandoId(null); buscarDados(); } 
    else { toast.error('Erro ao atualizar SLA.'); }
    setLoading(false)
  }

  const confirmarExclusao = async () => {
    const { error } = await supabase.from('slas').delete().eq('id', modalConfirm.idExcluir)
    if (!error) { toast.success('SLA excluído!'); buscarDados() } 
    else { toast.error('Erro: Este SLA já está a ser utilizado em ordens de suporte.') }
    setModalConfirm({ isOpen: false, idExcluir: null })
  }

  const obterClasseCor = (corId) => {
    const encontrada = CORES_SLA.find(c => c.id === corId)
    return encontrada ? encontrada.classeBg : 'bg-amber-500'
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <ModalConfirmacao isOpen={modalConfirm.isOpen} onClose={() => setModalConfirm({ isOpen: false, idExcluir: null })} onConfirm={confirmarExclusao} titulo="Excluir SLA" mensagem="Tem a certeza que deseja excluir permanentemente este Nível de Serviço?" isDestructive={true} textoConfirmar="Sim, excluir" />
      
      <div className="bg-slate-50 p-6 md:p-8 rounded-[2rem] border border-slate-200">
        <h3 className="text-xs font-black text-slate-400 mb-5 uppercase tracking-widest flex items-center gap-2">
          <Plus size={16} /> Novo Nível de SLA
        </h3>

        <form onSubmit={handleCadastrarItem} className="flex flex-col lg:flex-row gap-4">
          <input type="text" required value={novoItem.nome} onChange={(e) => setNovoItem({...novoItem, nome: e.target.value})} placeholder="Ex: Crítico, Baixo, Planejado..." className="w-full lg:flex-1 px-5 py-3.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" disabled={loading} />
          
          <div className="w-full lg:w-48 relative">
             <input type="number" required min="1" value={novoItem.tempo_resolucao_horas} onChange={(e) => setNovoItem({...novoItem, tempo_resolucao_horas: Number(e.target.value)})} placeholder="Horas" className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all pr-12" disabled={loading} />
             <span className="absolute right-4 top-4 text-xs font-bold text-slate-400">HRS</span>
          </div>

          <select required value={novoItem.cor} onChange={(e) => setNovoItem({...novoItem, cor: e.target.value})} className="w-full lg:w-1/3 px-5 py-3.5 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 bg-white transition-all cursor-pointer">
            {CORES_SLA.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          
          <button type="submit" disabled={loading || !novoItem.nome.trim()} className="w-full lg:w-auto px-8 py-3.5 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2">
            <Plus size={18} /> Cadastrar
          </button>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden divide-y divide-slate-100">
        {loading && slas.length === 0 ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map((i) => (<Skeleton key={i} className="h-10 w-full rounded-xl" />))}
          </div>
        ) : slas.length === 0 ? (
          <div className="p-10 text-center text-slate-500 font-medium">Nenhum SLA configurado.</div>
        ) : slas.map((item) => (
          <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 md:p-6 hover:bg-slate-50 transition-colors gap-4 group">
            
            {editandoId === item.id ? (
              <div className="flex-1 w-full bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 shadow-inner flex flex-col sm:flex-row gap-3">
                <input type="text" value={dadosEdicao.nome} onChange={(e) => setDadosEdicao({...dadosEdicao, nome: e.target.value})} className="w-full sm:flex-1 px-4 py-3 border border-indigo-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500" autoFocus />
                <input type="number" min="1" value={dadosEdicao.tempo_resolucao_horas} onChange={(e) => setDadosEdicao({...dadosEdicao, tempo_resolucao_horas: Number(e.target.value)})} className="w-full sm:w-32 px-4 py-3 border border-indigo-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500" />
                <select value={dadosEdicao.cor} onChange={(e) => setDadosEdicao({...dadosEdicao, cor: e.target.value})} className="w-full sm:w-48 px-4 py-3 border border-indigo-200 rounded-xl font-bold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500">
                  {CORES_SLA.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            ) : (
              <div className="flex-1 min-w-0 flex items-center gap-4">
                {/* 🚀 MAPEAMENTO CORRETO DA COR */}
                <div className={`w-3 h-3 rounded-full ${obterClasseCor(item.cor)} shadow-sm shrink-0`}></div>
                <div>
                  <h4 className="font-black text-slate-800 text-lg md:text-xl tracking-tight">{item.nome}</h4>
                  <span className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1"><Clock size={12}/> Resolução exigida em: <strong className="text-slate-700">{item.tempo_resolucao_horas} Horas</strong></span>
                </div>
              </div>
            )}

            <div className="flex flex-row sm:flex-col lg:flex-row gap-2.5 w-full md:w-auto shrink-0 mt-2 md:mt-0">
              {editandoId === item.id ? (
                <>
                  <button onClick={() => salvarEdicao(item.id)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md active:scale-95"><Save size={18} /> Salvar</button>
                  <button onClick={() => setEditandoId(null)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"><X size={18} /> Cancelar</button>
                </>
              ) : (
                <>
                  <button onClick={() => { setEditandoId(item.id); setDadosEdicao({ nome: item.nome, tempo_resolucao_horas: item.tempo_resolucao_horas, cor: item.cor }); }} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl transition-colors"><Edit2 size={16} /> Editar</button>
                  <button onClick={() => setModalConfirm({ isOpen: true, idExcluir: item.id })} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-red-600 bg-white border border-slate-200 hover:bg-red-50 hover:border-red-200 rounded-xl transition-colors shadow-sm"><Trash2 size={16} className="md:hidden lg:block"/> <Trash2 size={18} className="hidden md:block lg:hidden"/></button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}