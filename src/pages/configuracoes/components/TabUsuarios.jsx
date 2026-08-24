import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { KeyRound, UserX, UserCheck, LayoutGrid, Trash2, UserPlus, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import ModalConfirmacao from '../../../components/ModalConfirmacao'

export default function TabUsuarios({ modulosDisponiveis }) {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(false)
  const [novoUsuario, setNovoUsuario] = useState({ nome: '', email: '', senha: '', perfil: 'analista', modulos: [] })
  
  const [modalSenha, setModalSenha] = useState({ aberto: false, userId: '', email: '', novaSenha: '' })
  const [modalAcessos, setModalAcessos] = useState({ aberto: false, userId: '', nome: '', modulos: [] })
  const [modalConfirm, setModalConfirm] = useState({ isOpen: false, titulo: '', mensagem: '', isDestructive: true, textoConfirmar: 'Confirmar', onConfirm: () => {} })

  useEffect(() => { buscarUsuarios() }, [])

  const buscarUsuarios = async () => {
    setLoading(true)
    const { data } = await supabase.from('perfis').select('*').order('nome')
    setUsuarios(data || [])
    setLoading(false)
  }

  const alternarCargo = async (id, novoCargo) => {
    setLoading(true);
    const modulosAtualizados = novoCargo === 'administrador' ? modulosDisponiveis.map(m => m.id) : undefined;
    const payload = { perfil: novoCargo }
    if (modulosAtualizados) payload.modulos_acesso = modulosAtualizados
    
    const { error } = await supabase.from('perfis').update(payload).eq('id', id); 
    if (error) toast.error(`Erro ao atualizar. Verifique as suas permissões.`);
    else {
      setUsuarios(usuarios.map(u => u.id === id ? { ...u, perfil: novoCargo, modulos_acesso: modulosAtualizados || u.modulos_acesso } : u));
      toast.success('Permissão atualizada!');
    }
    setLoading(false);
  }

  const handleToggleModuloNovoUsuario = (moduloId) => {
    setNovoUsuario(prev => ({
      ...prev, 
      modulos: prev.modulos.includes(moduloId) ? prev.modulos.filter(m => m !== moduloId) : [...prev.modulos, moduloId]
    }))
  }

  const handleCriarUsuario = async (e) => {
    e.preventDefault()
    let modulosParaSalvar = novoUsuario.perfil === 'administrador' ? modulosDisponiveis.map(m => m.id) : novoUsuario.modulos;
    
    setLoading(true)
    const { data, error } = await supabase.functions.invoke('admin-usuarios', {
      body: { 
        acao: 'criar_usuario', 
        dados: { ...novoUsuario, modulos: modulosParaSalvar } 
      }
    })

    if (error || data?.error) {
      toast.error('Erro ao criar conta: ' + (error?.message || data?.error));
    } else {
      toast.success(`Usuário ${novoUsuario.nome} cadastrado!`)
      setNovoUsuario({ nome: '', email: '', senha: '', perfil: 'analista', modulos: [] })
      buscarUsuarios()
    }
    setLoading(false)
  }

  const handleSalvarEdicaoModulos = async () => {
    if (modalAcessos.modulos.length === 0) { toast.error("O utilizador precisa de acesso a pelo menos um módulo."); return; }
    setLoading(true);
    const { error } = await supabase.from('perfis').update({ modulos_acesso: modalAcessos.modulos }).eq('id', modalAcessos.userId);
    if (!error) {
      toast.success(`Acessos de ${modalAcessos.nome} atualizados!`);
      setUsuarios(usuarios.map(u => u.id === modalAcessos.userId ? { ...u, modulos_acesso: modalAcessos.modulos } : u));
      setModalAcessos({ aberto: false, userId: '', nome: '', modulos: [] });
    }
    setLoading(false);
  }

  const toggleBloqueio = (id, statusAtual, nome) => {
    setModalConfirm({
      isOpen: true, titulo: statusAtual ? 'Desbloquear Usuário' : 'Bloquear Usuário',
      mensagem: `Deseja realmente ${statusAtual ? 'liberar' : 'suspender'} o acesso de ${nome}?`,
      isDestructive: !statusAtual, textoConfirmar: statusAtual ? 'Sim, Desbloquear' : 'Sim, Bloquear',
      onConfirm: async () => {
        setLoading(true)
        const { error } = await supabase.from('perfis').update({ esta_bloqueado: !statusAtual }).eq('id', id)
        if (!error) {
          setUsuarios(usuarios.map(u => u.id === id ? { ...u, esta_bloqueado: !statusAtual } : u))
          toast.success(`Acesso modificado!`)
        }
        setLoading(false)
      }
    });
  }

  const handleExcluirUsuario = (profileId, authUserId, nome) => {
    setModalConfirm({
      isOpen: true, titulo: 'Excluir Usuário',
      mensagem: `ATENÇÃO: Tem certeza que deseja excluir ${nome}? Esta ação é irreversível.`,
      isDestructive: true, textoConfirmar: 'Excluir Definitivamente',
      onConfirm: async () => {
        setLoading(true)
        if (authUserId) {
          const { data, error } = await supabase.functions.invoke('admin-usuarios', {
            body: { acao: 'excluir_usuario', dados: { user_id: authUserId } }
          })
          if (error || data?.error) toast.error('Erro ao excluir do sistema principal.')
        }
        await supabase.from('perfis').delete().eq('id', profileId)
        toast.success('Usuário removido!'); 
        buscarUsuarios()
        setLoading(false)
      }
    });
  }

  const handleForcarTrocaSenha = async () => {
    if (modalSenha.novaSenha.length < 6) { toast.error("Mínimo de 6 caracteres."); return; }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('admin-usuarios', {
      body: { acao: 'forcar_senha', dados: { user_id: modalSenha.userId, senha: modalSenha.novaSenha } }
    })

    if (error || data?.error) { 
      toast.error("Erro ao alterar senha: " + (error?.message || data?.error)); 
    } else {
      toast.success('Senha redefinida com sucesso!');
      setModalSenha({ aberto: false, userId: '', email: '', novaSenha: '' });
      buscarUsuarios(); 
    }
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <ModalConfirmacao isOpen={modalConfirm.isOpen} onClose={() => setModalConfirm({ ...modalConfirm, isOpen: false })} onConfirm={modalConfirm.onConfirm} titulo={modalConfirm.titulo} mensagem={modalConfirm.mensagem} isDestructive={modalConfirm.isDestructive} textoConfirmar={modalConfirm.textoConfirmar} />
      
      {/* 🚀 FORMULÁRIO DE NOVO USUÁRIO (Design Enterprise) */}
      <div className="bg-slate-50 p-6 md:p-8 rounded-[2rem] border border-slate-200">
        <h3 className="text-xs font-black text-slate-400 mb-6 uppercase tracking-widest flex items-center gap-2">
          <UserPlus size={16} /> Novo Colaborador
        </h3>
        
        <form onSubmit={handleCriarUsuario} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <input type="text" placeholder="Nome Completo" required value={novoUsuario.nome} onChange={e => setNovoUsuario({...novoUsuario, nome: e.target.value})} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
            
            <input type="email" placeholder="email@iofv.com" required value={novoUsuario.email} onChange={e => setNovoUsuario({...novoUsuario, email: e.target.value})} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
            
            <input type="password" placeholder="Senha Inicial (mín. 6 caracteres)" required minLength={6} value={novoUsuario.senha} onChange={e => setNovoUsuario({...novoUsuario, senha: e.target.value})} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
            
            <select value={novoUsuario.perfil} onChange={e => setNovoUsuario({...novoUsuario, perfil: e.target.value})} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer">
              <option value="analista">Analista</option>
              <option value="administrador">Administrador</option>
              <option value="visualizador">Visualizador (Apenas Agenda)</option>
            </select>
          </div>

          {novoUsuario.perfil === 'administrador' ? (
            <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-2xl flex items-center gap-3">
              <ShieldAlert className="text-indigo-600 shrink-0" size={24} />
              <p className="text-sm text-indigo-800 font-medium leading-relaxed"><strong>Atenção:</strong> Administradores recebem automaticamente acesso total e irrestrito a todos os ambientes do sistema.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ambientes Permitidos</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {modulosDisponiveis.map(mod => (
                  <label key={mod.id} className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-slate-50 rounded-lg transition-colors">
                    <input type="checkbox" checked={novoUsuario.modulos.includes(mod.id)} onChange={() => handleToggleModuloNovoUsuario(mod.id)} className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 transition-colors" />
                    <span className="text-sm font-bold text-slate-700">{mod.nome}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-end pt-2">
            <button disabled={loading} className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50">
              {loading ? 'Criando Conta...' : 'Criar Conta'}
            </button>
          </div>
        </form>
      </div>

      {/* 🚀 LISTA DE USUÁRIOS (Mobile First / High-Density Grid) */}
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden divide-y divide-slate-100">
        {loading && usuarios.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-medium">Carregando utilizadores...</div>
        ) : usuarios.map((user) => (
          <div key={user.id} className="flex flex-col lg:flex-row lg:items-center justify-between p-5 md:p-6 hover:bg-slate-50 transition-colors gap-4">
            
            {/* Bloco 1: Informação do Utilizador */}
            <div className="flex items-center gap-4 w-full lg:w-1/3 shrink-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white shrink-0 shadow-sm ${user.esta_bloqueado ? 'bg-red-400' : user.perfil === 'administrador' ? 'bg-indigo-600' : 'bg-slate-400'}`}>
                {user.nome ? user.nome.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <span className={`font-black block truncate text-base md:text-lg tracking-tight ${user.esta_bloqueado ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                  {user.nome || 'Sem Nome'}
                </span>
                <span className="text-xs font-medium text-slate-500 truncate block">{user.email}</span>
              </div>
            </div>
            
            {/* Bloco 2: Ações (Grid Inteligente no Mobile) */}
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end mt-2 lg:mt-0">
              
              {/* Select de Perfil (Ocupa 100% no mobile, auto no desktop) */}
              <select value={user.perfil || 'analista'} disabled={user.esta_bloqueado} onChange={(e) => alternarCargo(user.id, e.target.value)} className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-colors border ${user.esta_bloqueado ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : user.perfil === 'administrador' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 cursor-pointer'}`}>
                <option value="analista">Analista</option>
                <option value="administrador">Administrador</option>
                <option value="visualizador">Visualizador</option>
              </select>
              
              {/* Botões de Ação (Grid de 2 colunas no mobile) */}
              <div className="grid grid-cols-2 sm:flex gap-2.5 w-full sm:w-auto">
                <button disabled={user.esta_bloqueado} onClick={() => setModalAcessos({ aberto: true, userId: user.id, nome: user.nome, modulos: user.modulos_acesso || [] })} className="w-full sm:w-auto flex justify-center items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl disabled:opacity-50 transition-colors">
                  <LayoutGrid size={16} /> Ambientes
                </button>
                <button onClick={() => setModalSenha({ aberto: true, userId: user.user_id, email: user.email, novaSenha: '' })} className="w-full sm:w-auto flex justify-center items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl transition-colors">
                  <KeyRound size={16} /> Senha
                </button>
                <button onClick={() => toggleBloqueio(user.id, user.esta_bloqueado, user.nome)} className={`w-full sm:w-auto flex justify-center items-center gap-1.5 px-4 py-2.5 text-xs font-bold border rounded-xl transition-colors col-span-2 sm:col-span-1 ${user.esta_bloqueado ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' : 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'}`}>
                  {user.esta_bloqueado ? <UserCheck size={16} /> : <UserX size={16} />} {user.esta_bloqueado ? 'Desbloquear' : 'Bloquear'}
                </button>
              </div>

              {/* Botão de Excluir Separado para evitar cliques acidentais */}
              <button onClick={() => handleExcluirUsuario(user.id, user.user_id, user.nome)} className="hidden sm:flex p-2.5 text-slate-400 hover:text-white hover:bg-red-500 bg-white border border-slate-200 rounded-xl transition-all shadow-sm">
                <Trash2 size={16} />
              </button>
              {/* Botão de Excluir no Mobile ocupa a linha inteira para segurança */}
              <button onClick={() => handleExcluirUsuario(user.id, user.user_id, user.nome)} className="sm:hidden w-full flex justify-center items-center gap-2 p-2.5 text-red-600 bg-red-50 border border-red-200 rounded-xl transition-all font-bold text-xs mt-1">
                <Trash2 size={16} /> Excluir Conta
              </button>

            </div>
          </div>
        ))}
      </div>

      {/* 🚀 MODAL DE TROCA DE SENHA (Design Padronizado) */}
      {modalSenha.aberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 animate-in zoom-in duration-200">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4"><KeyRound size={24} /></div>
            <h3 className="text-xl font-black text-slate-800 mb-1 tracking-tight">Definir Nova Senha</h3>
            <p className="text-sm font-medium text-slate-500 mb-6 leading-relaxed">Criar nova credencial para <strong className="text-slate-800">{modalSenha.email}</strong></p>
            
            <input type="password" placeholder="Nova senha (mín. 6 carac.)" value={modalSenha.novaSenha} onChange={(e) => setModalSenha({...modalSenha, novaSenha: e.target.value})} className="w-full mb-6 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all" autoFocus />
            
            <div className="flex gap-3">
              <button onClick={() => setModalSenha({ aberto: false, userId: '', email: '', novaSenha: '' })} className="flex-1 px-4 py-3.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
              <button onClick={handleForcarTrocaSenha} disabled={loading || modalSenha.novaSenha.length < 6} className="flex-1 px-4 py-3.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 transition-colors shadow-md active:scale-95">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 MODAL DE AMBIENTES (Design Padronizado) */}
      {modalAcessos.aberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 animate-in zoom-in duration-200">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4"><LayoutGrid size={24} /></div>
            <h3 className="text-xl font-black text-slate-800 mb-1 tracking-tight">Ambientes</h3>
            <p className="text-sm font-medium text-slate-500 mb-6 leading-relaxed">Quais módulos <strong className="text-slate-800">{modalAcessos.nome}</strong> pode aceder?</p>
            
            <div className="space-y-2 mb-8 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
              {modulosDisponiveis.map(mod => (
                <label key={mod.id} className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-white rounded-xl transition-colors">
                  <input type="checkbox" checked={modalAcessos.modulos.includes(mod.id)} onChange={() => setModalAcessos(prev => ({ ...prev, modulos: prev.modulos.includes(mod.id) ? prev.modulos.filter(m => m !== mod.id) : [...prev.modulos, mod.id] }))} className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" />
                  <span className="text-sm font-bold text-slate-700">{mod.nome}</span>
                </label>
              ))}
            </div>
            
            <div className="flex gap-3">
              <button onClick={() => setModalAcessos({ aberto: false, userId: '', nome: '', modulos: [] })} className="flex-1 px-4 py-3.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
              <button onClick={handleSalvarEdicaoModulos} disabled={loading} className="flex-1 px-4 py-3.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50 transition-colors shadow-md active:scale-95">Salvar Acessos</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}