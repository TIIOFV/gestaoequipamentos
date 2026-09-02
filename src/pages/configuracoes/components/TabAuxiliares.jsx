import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { Plus, Trash2, Edit2, Check, X, Globe, Save } from 'lucide-react'
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
    // 🚀 LIMPEZA IMEDIATA: Força a exibição dos Skeletons e apaga a lista da aba anterior
    setDados([]) 
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
    let query = abaAtiva === 'setores' 
      ? supabase.from('setores').select(`id, nome, modulo, unidade_id, unidade:unidade_id(nome)`).order('nome') 
      : supabase.from(tabelaAtual).select('*').order('nome')
      
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
    else { toast.error('Erro: Este item já está vinculado a um registo do sistema e não pode ser apagado.') }
    setModalConfirm({ isOpen: false, idExcluir: null })
  }

  const renderBadgeModulo = (modulosArray) => {
    if (!modulosArray || modulosArray.length === 0) return null;
    if (modulosArray.length >= modulosDisponiveis.length) {
      return <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5 w-max shrink-0 uppercase tracking-widest"><Globe size={12}/> Global</span>
    }
    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {modulosArray.map(modId => {
          const mod = modulosDisponiveis.find(m => m.id === modId)
          if (!mod) return null;
          return <span key={modId} className={`text-[10px] font-bold text-${mod.cor}-700 bg-${mod.cor}-50 px-2 py-1 rounded-lg border border-${mod.cor}-200 shrink-0 uppercase tracking-wider`}>{mod.nome.substring(0, 15)}</span>
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <ModalConfirmacao isOpen={modalConfirm.isOpen} onClose={() => setModalConfirm({ isOpen: false, idExcluir: null })} onConfirm={confirmarExclusao} titulo="Excluir Registro" mensagem={`Tem a certeza que deseja excluir permanentemente este registo de ${nomeAba}?`} isDestructive={true} textoConfirmar="Sim, excluir" />
      
      {/* 🚀 FORMULÁRIO DE CADASTRO (Design Enterprise) */}
      <div className="bg-slate-50 p-6 md:p-8 rounded-[2rem] border border-slate-200">
        <h3 className="text-xs font-black text-slate-400 mb-5 uppercase tracking-widest flex items-center gap-2">
          <Plus size={16} /> Novo Registo: {nomeAba}
        </h3>

        <form onSubmit={handleCadastrarItem} className="space-y-5">
          <div className="flex flex-col lg:flex-row gap-4">
            <input 
              type="text" 
              value={novoItem} 
              onChange={(e) => setNovoItem(e.target.value)} 
              placeholder={`Digite o nome do novo ${nomeAba.toLowerCase()}...`} 
              className="w-full lg:flex-1 px-5 py-3.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
              disabled={loading} 
            />
            
            {abaAtiva === 'setores' && (
              <select 
                value={unidadeSelecionada || ''} 
                onChange={(e) => setUnidadeSelecionada(e.target.value)} 
                className="w-full lg:w-1/3 px-5 py-3.5 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 bg-white transition-all cursor-pointer" 
                disabled={unidades.length === 0}
              >
                <option value="" disabled>Selecione a Unidade Base...</option>
                {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            )}
            
            <button 
              type="submit" 
              disabled={loading || !novoItem.trim() || moduloVinculo.length === 0} 
              className="w-full lg:w-auto px-8 py-3.5 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Cadastrar
            </button>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Visível nos módulos:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {modulosDisponiveis.map(mod => (
                <label key={mod.id} className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-slate-50 rounded-lg transition-colors">
                  <input 
                    type="checkbox" 
                    checked={moduloVinculo.includes(mod.id)} 
                    onChange={() => setModuloVinculo(prev => prev.includes(mod.id) ? prev.filter(m => m !== mod.id) : [...prev, mod.id])} 
                    className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 transition-colors" 
                  />
                  <span className="text-sm font-bold text-slate-700">{mod.nome}</span>
                </label>
              ))}
            </div>
          </div>
        </form>
      </div>

      {/* 🚀 LISTA DE REGISTOS (Mobile First / High-Density Grid) */}
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden divide-y divide-slate-100">
        {loading && dados.length === 0 ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center gap-3">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-10 w-24 rounded-xl" />
              </div>
            ))}
          </div>
        ) : dados.length === 0 ? (
          <div className="p-10 text-center text-slate-500 font-medium">Nenhum registo encontrado para {nomeAba}.</div>
        ) : dados.map((item) => (
          <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 md:p-6 hover:bg-slate-50 transition-colors gap-4 group">
            
            {editandoId === item.id ? (
              // MODO EDIÇÃO
              <div className="flex-1 w-full bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 shadow-inner space-y-4 animate-in fade-in">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input type="text" value={textoEdicao} onChange={(e) => setTextoEdicao(e.target.value)} className="w-full sm:flex-1 px-4 py-3 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800" autoFocus />
                  {abaAtiva === 'setores' && (
                    <select value={unidadeEdicao || ''} onChange={(e) => setUnidadeEdicao(e.target.value)} className="w-full sm:w-1/3 px-4 py-3 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 bg-white">
                      <option value="" disabled>Selecione a Unidade...</option>
                      {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                    </select>
                  )}
                </div>
                <div className="bg-white p-4 rounded-xl border border-indigo-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {modulosDisponiveis.map(mod => (
                    <label key={mod.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={moduloVinculoEdicao.includes(mod.id)} onChange={() => setModuloVinculoEdicao(prev => prev.includes(mod.id) ? prev.filter(m => m !== mod.id) : [...prev, mod.id])} className="w-4 h-4 text-indigo-600 rounded border-slate-300" />
                      <span className="text-xs font-bold text-slate-700">{mod.nome.substring(0,20)}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              // MODO LEITURA
              <div className="flex-1 min-w-0 pr-4">
                <h4 className="font-black text-slate-800 text-lg md:text-xl tracking-tight break-words">{item.nome}</h4>
                {abaAtiva === 'setores' && item.unidade && (
                  <span className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1">Unidade Base: <strong className="text-slate-700">{item.unidade.nome}</strong></span>
                )}
                {renderBadgeModulo(item.modulo)}
              </div>
            )}

            <div className="flex flex-row sm:flex-col lg:flex-row gap-2.5 w-full md:w-auto shrink-0 mt-2 md:mt-0">
              {editandoId === item.id ? (
                <>
                  <button type="button" onClick={() => salvarEdicao(item.id)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md active:scale-95">
                    <Save size={18} /> Salvar
                  </button>
                  <button type="button" onClick={() => setEditandoId(null)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                    <X size={18} /> Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => { setEditandoId(item.id); setTextoEdicao(item.nome); setModuloVinculoEdicao(item.modulo || []); if(abaAtiva === 'setores') setUnidadeEdicao(item.unidade_id); }} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl transition-colors">
                    <Edit2 size={16} /> Editar
                  </button>
                  <button type="button" onClick={() => setModalConfirm({ isOpen: true, idExcluir: item.id })} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-red-600 bg-white border border-slate-200 hover:bg-red-50 hover:border-red-200 rounded-xl transition-colors shadow-sm">
                    <Trash2 size={16} className="md:hidden lg:block"/> <span className="md:hidden lg:block">Excluir</span>
                    <Trash2 size={18} className="hidden md:block lg:hidden"/>
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}