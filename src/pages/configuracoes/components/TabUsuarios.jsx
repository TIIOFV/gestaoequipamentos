import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase' // Removido o supabaseAdmin (Segurança garantida!)
import { KeyRound, UserX, UserCheck, LayoutGrid, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import ModalConfirmacao from '../../../components/ModalConfirmacao'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select' // Importando o Select do UI Kit

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
    
    // Atualização normal via banco (permitida para administradores)
    const { error } = await supabase.from('perfis').update(payload).eq('id', id); 
    if (error) toast.error(`Erro ao atualizar. Verifique suas permissões.`);
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
    if (modalAcessos.modulos.length === 0) { toast.error("O usuário precisa de acesso a pelo menos um módulo."); return; }
    setLoading(true);
    // Atualização normal de perfil
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
      mensagem: `ATENÇÃO: Tem certeza que deseja excluir ${nome}? Ação irreversível.`,
      isDestructive: true, textoConfirmar: 'Excluir Definitivamente',
      onConfirm: async () => {
        setLoading(true)
        if (authUserId) {
          // Usa a Edge Function para deletar o usuário do Auth do Supabase
          const { data, error } = await supabase.functions.invoke('admin-usuarios', {
            body: { acao: 'excluir_usuario', dados: { user_id: authUserId } }
          })
          if (error || data?.error) toast.error('Erro ao excluir do sistema.')
        }
        // Deleta o perfil público
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
    
    // Usa a Edge Function para forçar a troca
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
    <div className="space-y-6 md:space-y-8">
      <ModalConfirmacao isOpen={modalConfirm.isOpen} onClose={() => setModalConfirm({ ...modalConfirm, isOpen: false })} onConfirm={modalConfirm.onConfirm} titulo={modalConfirm.titulo} mensagem={modalConfirm.mensagem} isDestructive={modalConfirm.isDestructive} textoConfirmar={modalConfirm.textoConfirmar} />
      
      {/* CADASTRO DE NOVO USUÁRIO */}
      <div className="bg-slate-50 p-4 md:p-6 rounded-xl border border-slate-100">
        <h3 className="text-xs md:text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Novo Colaborador</h3>
        <form onSubmit={handleCriarUsuario} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            
            {/* UTILIZANDO OS COMPONENTES DO UI KIT (Olha como o código fica mais limpo) */}
            <Input 
              type="text" 
              placeholder="Nome Completo" 
              required 
              value={novoUsuario.nome} 
              onChange={e => setNovoUsuario({...novoUsuario, nome: e.target.value})} 
              className="w-full"
            />
            
            <Input 
              type="email" 
              placeholder="email@iofv.com" 
              required 
              value={novoUsuario.email} 
              onChange={e => setNovoUsuario({...novoUsuario, email: e.target.value})} 
              className="w-full"
            />
            
            <Input 
              type="password" 
              placeholder="Senha Inicial (mín. 6)" 
              required 
              minLength={6} 
              value={novoUsuario.senha} 
              onChange={e => setNovoUsuario({...novoUsuario, senha: e.target.value})} 
              className="w-full"
            />
            
            <Select 
              value={novoUsuario.perfil} 
              onChange={e => setNovoUsuario({...novoUsuario, perfil: e.target.value})}
              className="w-full"
            >
              <option value="analista">Analista</option>
              <option value="administrador">Administrador</option>
              <option value="visualizador">Visualizador (Apenas Agenda)</option>
            </Select>
            
          </div>

          {novoUsuario.perfil === 'administrador' ? (
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-sm text-blue-700 font-medium">Administradores recebem acesso total a todos os ambientes.</div>
          ) : (
            <div className="bg-white border border-slate-200 p-4 rounded-lg">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Ambientes Permitidos</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {modulosDisponiveis.map(mod => (
                  <label key={mod.id} className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={novoUsuario.modulos.includes(mod.id)} onChange={() => handleToggleModuloNovoUsuario(mod.id)} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                    <span className="text-sm font-medium text-slate-700">{mod.nome}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end pt-2"><button disabled={loading} className="w-full sm:w-auto bg-slate-800 text-white px-8 py-2.5 rounded-lg font-bold hover:bg-slate-900 transition-colors disabled:opacity-50">{loading ? 'Criando...' : 'Criar Conta'}</button></div>
        </form>
      </div>

      {/* LISTA DE USUÁRIOS */}
      <div className="border border-slate-100 rounded-lg divide-y divide-slate-100">
        {loading && usuarios.length === 0 ? <div className="p-6 text-center text-slate-500 text-sm">Carregando usuários...</div> : usuarios.map((user) => (
          <div key={user.id} className="flex flex-col lg:flex-row lg:items-center justify-between p-4 hover:bg-slate-50 transition-colors gap-4">
            <div className="flex items-center gap-3 w-full lg:w-1/3 shrink-0">
              <div>
                <span className={`font-bold block truncate text-sm md:text-base ${user.esta_bloqueado ? 'line-through text-slate-400' : 'text-slate-800'}`}>{user.nome || 'Sem Nome'}</span>
                <span className="text-xs text-slate-500">{user.email}</span>
              </div>
              {user.esta_bloqueado && <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded border border-red-200 uppercase animate-pulse">Bloqueado</span>}
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
              <select value={user.perfil || 'analista'} disabled={user.esta_bloqueado} onChange={(e) => alternarCargo(user.id, e.target.value)} className={`px-3 py-1.5 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 border ${user.esta_bloqueado ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : user.perfil === 'administrador' ? 'bg-purple-50 text-purple-800 border-purple-100' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                <option value="analista">Analista</option><option value="administrador">Administrador</option><option value="visualizador">Visualizador</option>
              </select>
              <button disabled={user.esta_bloqueado} onClick={() => setModalAcessos({ aberto: true, userId: user.id, nome: user.nome, modulos: user.modulos_acesso || [] })} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg disabled:opacity-50"><LayoutGrid className="w-3.5 h-3.5" /> Ambientes</button>
              <button onClick={() => setModalSenha({ aberto: true, userId: user.user_id, email: user.email, novaSenha: '' })} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-lg"><KeyRound className="w-3.5 h-3.5" /> Senha</button>
              <button onClick={() => toggleBloqueio(user.id, user.esta_bloqueado, user.nome)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border rounded-lg ${user.esta_bloqueado ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>{user.esta_bloqueado ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />} {user.esta_bloqueado ? 'Desbloquear' : 'Bloquear'}</button>
              <button onClick={() => handleExcluirUsuario(user.id, user.user_id, user.nome)} className="p-1.5 text-slate-400 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE SENHA */}
      {modalSenha.aberto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Definir Nova Senha</h3>
            <p className="text-xs text-slate-500 mb-5">Nova credencial para <span className="font-bold text-slate-800">{modalSenha.email}</span></p>
            
            {/* APLICANDO UI KIT AQUI TAMBÉM */}
            <Input 
              type="password" 
              placeholder="Nova senha (mín. 6)" 
              value={modalSenha.novaSenha} 
              onChange={(e) => setModalSenha({...modalSenha, novaSenha: e.target.value})} 
              className="w-full mb-4" 
              autoFocus 
            />
            
            <div className="flex gap-3"><button onClick={() => setModalSenha({ aberto: false, userId: '', email: '', novaSenha: '' })} className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl">Cancelar</button><button onClick={handleForcarTrocaSenha} disabled={loading || modalSenha.novaSenha.length < 6} className="flex-1 px-4 py-3 text-sm font-bold text-white bg-blue-600 rounded-xl disabled:opacity-50">Salvar</button></div>
          </div>
        </div>
      )}

      {/* MODAL DE AMBIENTES */}
      {modalAcessos.aberto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2"><LayoutGrid className="text-emerald-600" /> Ambientes</h3>
            <p className="text-xs text-slate-500 mb-5">Quais setores <span className="font-bold text-slate-800">{modalAcessos.nome}</span> pode acessar?</p>
            <div className="space-y-3 mb-6 bg-slate-50 border border-slate-200 p-4 rounded-xl">
              {modulosDisponiveis.map(mod => (
                <label key={mod.id} className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={modalAcessos.modulos.includes(mod.id)} onChange={() => setModalAcessos(prev => ({ ...prev, modulos: prev.modulos.includes(mod.id) ? prev.modulos.filter(m => m !== mod.id) : [...prev.modulos, mod.id] }))} className="w-5 h-5 text-emerald-600 rounded border-slate-300" />
                  <span className="text-sm font-bold text-slate-700">{mod.nome}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3"><button onClick={() => setModalAcessos({ aberto: false, userId: '', nome: '', modulos: [] })} className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl">Cancelar</button><button onClick={handleSalvarEdicaoModulos} disabled={loading} className="flex-1 px-4 py-3 text-sm font-bold text-white bg-emerald-600 rounded-xl disabled:opacity-50">Salvar</button></div>
          </div>
        </div>
      )}
    </div>
  )
}