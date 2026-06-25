import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { Plus, Trash2, Edit2, Check, X, Globe } from 'lucide-react'
import toast from 'react-hot-toast'
import ModalConfirmacao from '../../../components/ModalConfirmacao'
import { Skeleton } from '../../../components/ui/Skeleton'

export default function TabAuxiliares({ abaAtiva, tabelaAtual, nomeAba, modulosDisponiveis }) {
  const [dados, setDados] = useState([])
  const [unidades, setUnidades] = useState([])
  const [loading, setLoading] = useState(false)
  
  // Estados Locais de Cadastro/Edição
  const [novoItem, setNovoItem] = useState('')
  const [unidadeSelecionada, setUnidadeSelecionada] = useState('')
  const [moduloVinculo, setModuloVinculo] = useState(modulosDisponiveis.map(m => m.id))
  
  const [editandoId, setEditandoId] = useState(null)
  const [textoEdicao, setTextoEdicao] = useState('')
  const [unidadeEdicao, setUnidadeEdicao] = useState('')
  const [moduloVinculoEdicao, setModuloVinculoEdicao] = useState([])
  const [modalConfirm, setModalConfirm] = useState({ isOpen: false, idExcluir: null })

  useEffect(() => {
    setEditandoId(null)
    setModuloVinculo(modulosDisponiveis.map(m => m.id))
    buscarDados()
    if (abaAtiva === 'setores') buscarUnidades()
  }, [abaAtiva])

  const buscarUnidades = async () => {
    const { data } = await supabase.from('unidades').select('*').order('nome')
    setUnidades(data || [])
    if (data && data.length > 0) setUnidadeSelecionada(data[0].id)
  }

  const buscarDados = async () => {
    setLoading(true)
    let query = abaAtiva === 'setores' ? supabase.from('setores').select(`id, nome, modulo, unidade_id, unidade:unidade_id(nome)`).order('nome') : supabase.from(tabelaAtual).select('*').order('nome')
    const { data, error } = await query
    if (!error) setDados(data || [])
    setLoading(false)
  }

  const handleCadastrarItem = async (e) => {
    e.preventDefault()
    if (!novoItem.trim() || moduloVinculo.length === 0) return
    setLoading(true)
    let payload = { nome: novoItem, modulo: moduloVinculo }
    if (abaAtiva === 'setores') payload.unidade_id = unidadeSelecionada
    const { error } = await supabase.from(tabelaAtual).insert([payload])
    if (!error) { toast.success('Cadastrado com sucesso!'); setNovoItem(''); buscarDados(); } 
    else { toast.error('Erro ao cadastrar.'); }
    setLoading(false)
  }

  const salvarEdicao = async (id) => {
    if (!textoEdicao.trim() || moduloVinculoEdicao.length === 0) return
    setLoading(true)
    let payload = { nome: textoEdicao, modulo: moduloVinculoEdicao }
    if (abaAtiva === 'setores') payload.unidade_id = unidadeEdicao
    const { error } = await supabase.from(tabelaAtual).update(payload).eq('id', id)
    if (!error) { toast.success('Atualizado com sucesso!'); setEditandoId(null); buscarDados(); } 
    else { toast.error('Erro ao atualizar.'); }
    setLoading(false)
  }

  const confirmarExclusao = async () => {
    const { error } = await supabase.from(tabelaAtual).delete().eq('id', modalConfirm.idExcluir)
    if (!error) { toast.success('Excluído com sucesso!'); buscarDados() } 
    else { toast.error('Erro: Item vinculado a algum registro do sistema.') }
    setModalConfirm({ isOpen: false, idExcluir: null })
  }

  const renderBadgeModulo = (modulosArray) => {
    if (!modulosArray || modulosArray.length === 0) return null;
    if (modulosArray.length >= modulosDisponiveis.length) return <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1 w-max shrink-0"><Globe size={10}/> Global</span>
    return (
      <div className="flex flex-wrap gap-1">
        {modulosArray.map(modId => {
          const mod = modulosDisponiveis.find(m => m.id === modId)
          if (!mod) return null;
          return <span key={modId} className={`text-[9px] font-bold text-${mod.cor}-700 bg-${mod.cor}-50 px-1.5 py-0.5 rounded border border-${mod.cor}-200 shrink-0`}>{mod.nome.substring(0, 15)}</span>
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ModalConfirmacao isOpen={modalConfirm.isOpen} onClose={() => setModalConfirm({ isOpen: false, idExcluir: null })} onConfirm={confirmarExclusao} titulo="Excluir Registro" mensagem="Certeza que deseja excluir este item?" isDestructive={true} textoConfirmar="Sim, excluir" />
      
      <form onSubmit={handleCadastrarItem} className="flex flex-col gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" value={novoItem} onChange={(e) => setNovoItem(e.target.value)} placeholder={`Novo nome para ${nomeAba}...`} className="w-full sm:flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" disabled={loading} />
          {abaAtiva === 'setores' && (
            <select value={unidadeSelecionada || ''} onChange={(e) => setUnidadeSelecionada(e.target.value)} className="w-full sm:w-1/3 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm" disabled={unidades.length === 0}>
              <option value="" disabled>Selecione a Unidade</option>
              {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          )}
          <button type="submit" disabled={loading || !novoItem.trim() || moduloVinculo.length === 0} className="px-6 py-2 bg-blue-700 text-white font-bold rounded-lg hover:bg-blue-800 disabled:opacity-50"><Plus className="w-4 h-4 inline mr-1" /> Cadastrar</button>
        </div>
        <div className="bg-white border border-slate-200 p-3 rounded-lg">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Visível nos módulos:</p>
          <div className="flex flex-wrap gap-4">
            {modulosDisponiveis.map(mod => (
              <label key={mod.id} className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={moduloVinculo.includes(mod.id)} onChange={() => setModuloVinculo(prev => prev.includes(mod.id) ? prev.filter(m => m !== mod.id) : [...prev, mod.id])} className="w-4 h-4 text-blue-600 rounded border-slate-300" />
                <span className="text-xs font-medium text-slate-700">{mod.nome}</span>
              </label>
            ))}
          </div>
        </div>
      </form>

      <div className="border border-slate-100 rounded-lg divide-y divide-slate-100">
        {loading && dados.length === 0 ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between items-center p-2 gap-3">
                <div className="space-y-2 w-1/2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : dados.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-sm">Nenhum registro encontrado.</div>
        ) : dados.map((item) => (
          <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-slate-50 gap-3">
            {editandoId === item.id ? (
              <div className="flex-1 w-full bg-white p-3 rounded-xl border border-blue-100 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input type="text" value={textoEdicao} onChange={(e) => setTextoEdicao(e.target.value)} className="w-full sm:flex-1 px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 text-sm" autoFocus />
                  {abaAtiva === 'setores' && <select value={unidadeEdicao || ''} onChange={(e) => setUnidadeEdicao(e.target.value)} className="w-full sm:w-1/3 px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 text-sm bg-white"><option value="" disabled>Selecione...</option>{unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select>}
                </div>
                <div className="flex flex-wrap gap-3">
                  {modulosDisponiveis.map(mod => (
                    <label key={mod.id} className="flex items-center gap-1"><input type="checkbox" checked={moduloVinculoEdicao.includes(mod.id)} onChange={() => setModuloVinculoEdicao(prev => prev.includes(mod.id) ? prev.filter(m => m !== mod.id) : [...prev, mod.id])} className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300" /><span className="text-[10px] font-bold text-slate-600">{mod.nome.substring(0,10)}...</span></label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="overflow-hidden flex-1 w-full">
                <div className="flex items-center gap-2"><span className="font-bold text-slate-800 text-sm">{item.nome}</span>{renderBadgeModulo(item.modulo)}</div>
                {abaAtiva === 'setores' && item.unidade && <span className="text-[10px] text-slate-500 mt-1 block">Unidade: {item.unidade.nome}</span>}
              </div>
            )}
            <div className="flex gap-2">
              {editandoId === item.id ? (
                <><button onClick={() => salvarEdicao(item.id)} className="p-1.5 text-green-600 hover:bg-green-100 bg-white border border-green-200 rounded-lg"><Check className="w-4 h-4" /></button><button onClick={() => setEditandoId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 bg-white border border-slate-200 rounded-lg"><X className="w-4 h-4" /></button></>
              ) : (
                <><button onClick={() => { setEditandoId(item.id); setTextoEdicao(item.nome); setModuloVinculoEdicao(item.modulo || []); if(abaAtiva === 'setores') setUnidadeEdicao(item.unidade_id); }} className="p-1.5 text-slate-500 hover:text-blue-600 bg-white border border-slate-200 rounded-lg"><Edit2 className="w-4 h-4" /></button><button onClick={() => setModalConfirm({ isOpen: true, idExcluir: item.id })} className="p-1.5 text-slate-500 hover:text-red-600 bg-white border border-slate-200 rounded-lg"><Trash2 className="w-4 h-4" /></button></>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}