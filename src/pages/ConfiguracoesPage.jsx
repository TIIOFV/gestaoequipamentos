import { useState, useEffect } from 'react'
import { supabase, supabaseAdmin } from '../lib/supabase'
import { 
  Settings, Plus, Trash2, Edit2, 
  Check, X, KeyRound, UserX, UserCheck, LayoutGrid, Globe
} from 'lucide-react'
import toast from 'react-hot-toast'
import ModalConfirmacao from '../components/ModalConfirmacao'

const MODULOS_DISPONIVEIS = [
  { id: 'medicos', nome: 'Equipamentos Médicos', cor: 'emerald' },
  { id: 'ti', nome: 'Tecnologia da Informação', cor: 'blue' },
  { id: 'infra', nome: 'Nobreaks & Baterias', cor: 'amber' },
  { id: 'manutencao', nome: 'Manutenção Predial', cor: 'slate' }
]

export default function ConfiguracoesPage() {
  const [abaAtiva, setAbaAtiva] = useState('usuarios')
  const [dados, setDados] = useState([])
  const [unidades, setUnidades] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(false)

  // Estados para Cadastro Padrão
  const [novoItem, setNovoItem] = useState('')
  const [unidadeSelecionada, setUnidadeSelecionada] = useState('')
  const [moduloVinculo, setModuloVinculo] = useState(MODULOS_DISPONIVEIS.map(m => m.id)) // NOVO: Array com todos por padrão

  const [novoUsuario, setNovoUsuario] = useState({ 
    nome: '', email: '', senha: '', perfil: 'analista', modulos: [] 
  })

  // Estados para Edição Inline
  const [editandoId, setEditandoId] = useState(null)
  const [textoEdicao, setTextoEdicao] = useState('')
  const [unidadeEdicao, setUnidadeEdicao] = useState('')
  const [moduloVinculoEdicao, setModuloVinculoEdicao] = useState([]) // NOVO: Edição do array de módulos

  const [modalSenha, setModalSenha] = useState({ aberto: false, userId: '', email: '', novaSenha: '' })
  const [modalAcessos, setModalAcessos] = useState({ aberto: false, userId: '', nome: '', modulos: [] })

  const [modalConfirm, setModalConfirm] = useState({
    isOpen: false, titulo: '', mensagem: '', isDestructive: true, textoConfirmar: 'Confirmar', onConfirm: () => {}
  });

  const abas = [
    { id: 'usuarios', nome: 'Usuários', tabela: 'perfis' },
    { id: 'fabricantes', nome: 'Fabricantes', tabela: 'fabricantes' },
    { id: 'prestadores', nome: 'Prestadores', tabela: 'prestadores' },
    { id: 'unidades', nome: 'Unidades', tabela: 'unidades' },
    { id: 'setores', nome: 'Setores', tabela: 'setores' },
    { id: 'status_equipmento', nome: 'Status do Equipamento', tabela: 'status_equipamento' },
  ]

  const tabelaAtual = abas.find(a => a.id === abaAtiva).tabela

  useEffect(() => {
    setEditandoId(null)
    setModuloVinculo(MODULOS_DISPONIVEIS.map(m => m.id)) // Reseta o array ao trocar de aba
    if (abaAtiva === 'usuarios') {
      buscarUsuarios()
    } else {
      buscarDados()
      if (abaAtiva === 'setores') buscarUnidades()
    }
  }, [abaAtiva])

  // --- FUNÇÕES DA ABA USUÁRIOS (Sem Alterações) ---
  const buscarUsuarios = async () => {
    setLoading(true)
    const { data } = await supabase.from('perfis').select('*').order('nome')
    setUsuarios(data || [])
    setLoading(false)
  }

  const alternarCargo = async (id, novoCargo) => {
    setLoading(true);
    const modulosAtualizados = novoCargo === 'administrador' ? MODULOS_DISPONIVEIS.map(m => m.id) : undefined;
    const payload = { perfil: novoCargo }
    if (modulosAtualizados) payload.modulos_acesso = modulosAtualizados

    const { error } = await supabase.from('perfis').update(payload).eq('id', id); 

    if (error) {
      toast.error(`Erro ao atualizar. Verifique suas permissões.`);
    } else {
      setUsuarios(usuarios.map(u => u.id === id ? { ...u, perfil: novoCargo, modulos_acesso: modulosAtualizados || u.modulos_acesso } : u));
      toast.success('Permissão atualizada com sucesso!');
    }
    setLoading(false);
  };

  const handleToggleModuloNovoUsuario = (moduloId) => {
    setNovoUsuario(prev => {
      const jaTem = prev.modulos.includes(moduloId)
      return { ...prev, modulos: jaTem ? prev.modulos.filter(m => m !== moduloId) : [...prev.modulos, moduloId] }
    })
  }

  const handleCriarUsuario = async (e) => {
    e.preventDefault()
    let modulosParaSalvar = novoUsuario.perfil === 'administrador' ? MODULOS_DISPONIVEIS.map(m => m.id) : novoUsuario.modulos;

    if (novoUsuario.perfil !== 'administrador' && modulosParaSalvar.length === 0) {
      toast.error('Selecione pelo menos um ambiente de acesso para este usuário.');
      return;
    }

    setLoading(true)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: novoUsuario.email, password: novoUsuario.senha, email_confirm: true 
    })

    if (authError) { toast.error('Erro ao criar conta: ' + authError.message); setLoading(false); return }

    try {
      const { error: profileError } = await supabaseAdmin.from('perfis').insert([{ 
        user_id: authData.user.id, email: novoUsuario.email, nome: novoUsuario.nome, 
        perfil: novoUsuario.perfil, cargo: novoUsuario.perfil === 'administrador' ? 'Administrador' : 'Analista',
        esta_bloqueado: false, modulos_acesso: modulosParaSalvar
      }])

      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        toast.error('Erro ao salvar o perfil: ' + profileError.message)
      } else {
        toast.success(`Usuário ${novoUsuario.nome} cadastrado com sucesso!`)
        setNovoUsuario({ nome: '', email: '', senha: '', perfil: 'analista', modulos: [] })
        buscarUsuarios()
      }
    } catch (err) { toast.error('Erro inesperado: ' + err.message) } 
    finally { setLoading(false) }
  }

  const handleSalvarEdicaoModulos = async () => {
    if (modalAcessos.modulos.length === 0) { toast.error("O usuário precisa ter acesso a pelo menos um módulo."); return; }
    setLoading(true);
    const { error } = await supabaseAdmin.from('perfis').update({ modulos_acesso: modalAcessos.modulos }).eq('id', modalAcessos.userId);

    if (error) { toast.error('Erro ao atualizar acessos: ' + error.message); } 
    else {
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
          toast.success(`Acesso de ${nome} modificado!`)
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
        let err = null;
        if (authUserId) { err = (await supabaseAdmin.from('perfis').delete().eq('user_id', authUserId)).error; } 
        else { err = (await supabaseAdmin.from('perfis').delete().eq('id', profileId)).error; }

        if (!err) {
          if (authUserId) { try { await supabaseAdmin.auth.admin.deleteUser(authUserId) } catch (e) {} }
          toast.success('Usuário removido!'); buscarUsuarios()
        }
        setLoading(false)
      }
    });
  }

  const handleForcarTrocaSenha = async () => {
    if (modalSenha.novaSenha.length < 6) { toast.error("Mínimo de 6 caracteres."); return; }
    setLoading(true);
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(modalSenha.userId, { password: modalSenha.novaSenha });
    if (authError) { toast.error("Erro ao alterar senha."); setLoading(false); return; }
    await supabaseAdmin.from('perfis').update({ precisa_trocar_senha: true }).eq('user_id', modalSenha.userId);
    toast.success('Senha redefinida! O usuário deverá alterá-la no próximo login.');
    setModalSenha({ aberto: false, userId: '', email: '', novaSenha: '' });
    buscarUsuarios(); setLoading(false);
  }

  // --- FUNÇÕES DAS OUTRAS ABAS ---
  const buscarUnidades = async () => {
    const { data } = await supabase.from('unidades').select('*').order('nome')
    setUnidades(data || [])
    if (data && data.length > 0) setUnidadeSelecionada(data[0].id)
  }

  const buscarDados = async () => {
    setLoading(true)
    let query = supabase.from(tabelaAtual).select('*').order('nome')
    if (abaAtiva === 'setores') {
      query = supabase.from('setores').select(`id, nome, modulo, unidade_id, unidade:unidade_id(nome)`).order('nome')
    }
    const { data, error } = await query
    if (!error) setDados(data || [])
    setLoading(false)
  }

  const handleToggleModuloCadastro = (moduloId) => {
    setModuloVinculo(prev => {
      const jaTem = prev.includes(moduloId)
      return jaTem ? prev.filter(m => m !== moduloId) : [...prev, moduloId]
    })
  }

  const handleCadastrarItem = async (e) => {
    e.preventDefault()
    if (!novoItem.trim()) return
    if (moduloVinculo.length === 0) { toast.error('Selecione ao menos um módulo!'); return; }

    setLoading(true)
    let payload = { nome: novoItem, modulo: moduloVinculo }

    if (abaAtiva === 'setores') {
      if (!unidadeSelecionada) { toast.error('Por favor, selecione uma unidade.'); setLoading(false); return; }
      payload.unidade_id = unidadeSelecionada
    }

    const { error } = await supabase.from(tabelaAtual).insert([payload])
    if (!error) { 
      toast.success('Cadastrado com sucesso!');
      setNovoItem(''); 
      buscarDados();
    } else { toast.error('Erro ao cadastrar.'); }
    setLoading(false)
  }

  const handleExcluir = (id) => {
    setModalConfirm({
      isOpen: true, titulo: 'Excluir Registro',
      mensagem: 'Certeza que deseja excluir este item? Ação não pode ser desfeita.',
      isDestructive: true, textoConfirmar: 'Sim, excluir',
      onConfirm: async () => {
        const { error } = await supabase.from(tabelaAtual).delete().eq('id', id)
        if (!error) { toast.success('Excluído com sucesso!'); buscarDados() } 
        else { toast.error('Erro: Item vinculado a algum equipamento/OS.') }
      }
    });
  }

  const handleToggleModuloEdicao = (moduloId) => {
    setModuloVinculoEdicao(prev => {
      const jaTem = prev.includes(moduloId)
      return jaTem ? prev.filter(m => m !== moduloId) : [...prev, moduloId]
    })
  }

  const salvarEdicao = async (id) => {
    if (!textoEdicao.trim()) return
    if (moduloVinculoEdicao.length === 0) { toast.error('Selecione ao menos um módulo!'); return; }
    
    setLoading(true)
    let payload = { nome: textoEdicao, modulo: moduloVinculoEdicao }

    if (abaAtiva === 'setores') {
      if (!unidadeEdicao) { toast.error('Selecione uma unidade.'); setLoading(false); return; }
      payload.unidade_id = unidadeEdicao
    }

    const { error } = await supabase.from(tabelaAtual).update(payload).eq('id', id)
    if (!error) { 
      toast.success('Atualizado com sucesso!'); setEditandoId(null); buscarDados();
    } else { toast.error('Erro ao atualizar.'); }
    setLoading(false)
  }

  // Helper para renderizar a badge do módulo bonito
  const renderBadgeModulo = (modulosArray) => {
    if (!modulosArray || modulosArray.length === 0) return null;
    
    // Se tiver os 4, é Global
    if (modulosArray.length >= MODULOS_DISPONIVEIS.length) {
      return <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1 w-max shrink-0"><Globe size={10}/> Global</span>
    }

    // Se tiver 1, 2 ou 3, exibe as badges
    return (
      <div className="flex flex-wrap gap-1">
        {modulosArray.map(modId => {
          const mod = MODULOS_DISPONIVEIS.find(m => m.id === modId)
          if (!mod) return null;
          return <span key={modId} className={`text-[9px] font-bold text-${mod.cor}-700 bg-${mod.cor}-50 px-1.5 py-0.5 rounded border border-${mod.cor}-200 shrink-0`}>{mod.nome.substring(0, 15)}</span>
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 font-sans relative pb-10">
      
      <div className="mb-2 md:mb-0">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center">
          <Settings className="w-6 h-6 md:w-8 md:h-8 mr-3 text-blue-600" />
          Configurações Gerais
        </h1>
        <p className="text-sm md:text-base text-slate-500 mt-1">Gerencie os cadastros auxiliares e acessos (Acesso exclusivo da Administração).</p>
      </div>

      <div className="flex space-x-2 border-b border-slate-200 overflow-x-auto pb-px custom-scrollbar w-full">
        {abas.map((aba) => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            className={`px-3 md:px-4 py-2.5 text-xs md:text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              abaAtiva === aba.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {aba.nome}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
        {abaAtiva === 'usuarios' ? (
          <div className="space-y-6 md:space-y-8">
            <div className="bg-slate-50 p-4 md:p-6 rounded-xl border border-slate-100">
              <h3 className="text-xs md:text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Novo Colaborador</h3>
              <form onSubmit={handleCriarUsuario} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <input
                    type="text" placeholder="Nome Completo" required
                    value={novoUsuario.nome} onChange={e => setNovoUsuario({...novoUsuario, nome: e.target.value})}
                    className="px-4 py-2.5 md:py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm md:text-base"
                  />
                  <input
                    type="email" placeholder="email@iofv.com" required
                    value={novoUsuario.email} onChange={e => setNovoUsuario({...novoUsuario, email: e.target.value})}
                    className="px-4 py-2.5 md:py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm md:text-base"
                  />
                  <input
                    type="password" placeholder="Senha Inicial (mín. 6)" required minLength={6}
                    value={novoUsuario.senha} onChange={e => setNovoUsuario({...novoUsuario, senha: e.target.value})}
                    className="px-4 py-2.5 md:py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm md:text-base"
                  />
                  <select 
                    value={novoUsuario.perfil} 
                    onChange={e => setNovoUsuario({...novoUsuario, perfil: e.target.value})}
                    className="px-4 py-2.5 md:py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm md:text-base"
                  >
                    <option value="analista">Analista</option>
                    <option value="administrador">Administrador</option>
                    <option value="visualizador">Visualizador (Apenas Agenda)</option>
                  </select>
                </div>

                {novoUsuario.perfil === 'administrador' ? (
                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-sm text-blue-700 font-medium">
                    Administradores recebem acesso total a todos os ambientes do sistema automaticamente.
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 p-4 rounded-lg">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Ambientes Permitidos</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {MODULOS_DISPONIVEIS.map(mod => (
                        <label key={mod.id} className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            checked={novoUsuario.modulos.includes(mod.id)}
                            onChange={() => handleToggleModuloNovoUsuario(mod.id)}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700 transition-colors">{mod.nome}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button disabled={loading} className="w-full sm:w-auto bg-slate-800 text-white px-8 py-2.5 rounded-lg font-bold hover:bg-slate-900 transition-colors disabled:opacity-50">
                    {loading ? 'Criando...' : 'Criar Conta'}
                  </button>
                </div>
              </form>
            </div>

            <div className="border border-slate-100 rounded-lg divide-y divide-slate-100">
              {loading && usuarios.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">Carregando usuários...</div>
              ) : usuarios.map((user) => (
                <div key={user.id} className="flex flex-col lg:flex-row lg:items-center justify-between p-4 hover:bg-slate-50 transition-colors gap-4">
                  <div className="overflow-hidden flex items-center gap-3 w-full lg:w-1/3 shrink-0">
                    <div>
                      <span className={`font-bold block truncate text-sm md:text-base ${user.esta_bloqueado ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {user.nome || 'Sem Nome'}
                      </span>
                      <span className="text-xs text-slate-500 break-all">{user.email}</span>
                    </div>
                    {user.esta_bloqueado && (
                      <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded border border-red-200 uppercase tracking-wider animate-pulse">
                        Bloqueado
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto mt-1 lg:mt-0 justify-start lg:justify-end">
                    <select 
                      value={user.perfil || 'analista'} 
                      disabled={user.esta_bloqueado}
                      onChange={(e) => alternarCargo(user.id, e.target.value)}
                      className={`px-3 py-2 md:py-1.5 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 border ${
                        user.esta_bloqueado ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' :
                        user.perfil === 'administrador' ? 'bg-purple-50 text-purple-800 border-purple-100' : 
                        user.perfil === 'visualizador' ? 'bg-orange-50 text-orange-800 border-orange-100' :
                        'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <option value="analista">Analista</option>
                      <option value="administrador">Administrador</option>
                      <option value="visualizador">Visualizador</option>
                    </select>

                    <button 
                      disabled={user.esta_bloqueado}
                      onClick={() => setModalAcessos({ aberto: true, userId: user.id, nome: user.nome, modulos: user.modulos_acesso || [] })}
                      className="flex justify-center items-center gap-1.5 px-3 py-2 md:py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" /> Ambientes
                    </button>
                    
                    <button 
                      onClick={() => setModalSenha({ aberto: true, userId: user.user_id, email: user.email, novaSenha: '' })}
                      className="flex justify-center items-center gap-1.5 px-3 py-2 md:py-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <KeyRound className="w-3.5 h-3.5" /> Senha
                    </button>

                    <button 
                      onClick={() => toggleBloqueio(user.id, user.esta_bloqueado, user.nome)}
                      className={`flex justify-center items-center gap-1.5 px-3 py-2 md:py-1.5 text-xs font-bold border rounded-lg transition-colors whitespace-nowrap ${
                        user.esta_bloqueado 
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' 
                          : 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                      }`}
                      title={user.esta_bloqueado ? 'Liberar Acesso' : 'Bloquear Acesso'}
                    >
                      {user.esta_bloqueado ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                      {user.esta_bloqueado ? 'Desbloquear' : 'Bloquear'}
                    </button>

                    <button 
                      onClick={() => handleExcluirUsuario(user.id, user.user_id, user.nome)}
                      className="p-2 md:p-1.5 text-slate-400 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 rounded-lg transition-colors"
                      title="Excluir Usuário Permanentemente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* ÁREA DE CADASTRO COM VÍNCULO DE MÓDULOS (CHECKBOXES) */}
            <form onSubmit={handleCadastrarItem} className="flex flex-col gap-4 mb-6 bg-slate-50 p-4 md:p-5 rounded-xl border border-slate-100">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text" value={novoItem} onChange={(e) => setNovoItem(e.target.value)}
                  placeholder={`Novo nome para ${abas.find(a => a.id === abaAtiva).nome}...`}
                  className="w-full sm:flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                  disabled={loading}
                />
                
                {abaAtiva === 'setores' && (
                  <select
                    value={unidadeSelecionada || ''} 
                    onChange={(e) => setUnidadeSelecionada(e.target.value)}
                    className="w-full sm:w-1/3 px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm md:text-base"
                    disabled={unidades.length === 0}
                  >
                    <option value="" disabled>Selecione a Unidade</option>
                    {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                )}

                <button
                  type="submit" disabled={loading || !novoItem.trim() || moduloVinculo.length === 0 || (abaAtiva === 'setores' && !unidadeSelecionada)}
                  className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 bg-blue-700 text-white font-bold rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 mr-2" /> Cadastrar
                </button>
              </div>

              <div className="bg-white border border-slate-200 p-3 rounded-lg">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Visível nos módulos:</p>
                <div className="flex flex-wrap gap-4">
                  {MODULOS_DISPONIVEIS.map(mod => (
                    <label key={mod.id} className="flex items-center gap-1.5 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={moduloVinculo.includes(mod.id)}
                        onChange={() => handleToggleModuloCadastro(mod.id)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-xs font-medium text-slate-700 group-hover:text-blue-700 transition-colors">{mod.nome}</span>
                    </label>
                  ))}
                </div>
              </div>
            </form>

            <div className="border border-slate-100 rounded-lg divide-y divide-slate-100">
              {loading && dados.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">Carregando dados...</div>
              ) : dados.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">Nenhum registro encontrado.</div>
              ) : (
                dados.map((item) => (
                  <div key={item.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 hover:bg-slate-50 transition-colors gap-3">
                    
                    {editandoId === item.id ? (
                      <div className="flex-1 flex flex-col gap-3 w-full md:mr-4 bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text" value={textoEdicao} onChange={(e) => setTextoEdicao(e.target.value)}
                            className="w-full sm:flex-1 px-3 py-2 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            autoFocus
                          />
                          {abaAtiva === 'setores' && (
                            <select
                              value={unidadeEdicao || ''} 
                              onChange={(e) => setUnidadeEdicao(e.target.value)}
                              className="w-full sm:w-1/3 px-3 py-2 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                            >
                              <option value="" disabled>Selecione...</option>
                              {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                            </select>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {MODULOS_DISPONIVEIS.map(mod => (
                            <label key={mod.id} className="flex items-center gap-1 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={moduloVinculoEdicao.includes(mod.id)}
                                onChange={() => handleToggleModuloEdicao(mod.id)}
                                className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300"
                              />
                              <span className="text-[10px] font-bold text-slate-600">{mod.nome.substring(0,10)}...</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-hidden flex-1 w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className="font-bold text-slate-800 block truncate text-sm md:text-base">{item.nome}</span>
                          {renderBadgeModulo(item.modulo)}
                        </div>
                        {abaAtiva === 'setores' && item.unidade && (
                          <span className="text-[10px] md:text-xs font-medium text-slate-500 truncate block mt-1.5">Unidade: {item.unidade.nome}</span>
                        )}
                      </div>
                    )}

                    <div className="flex gap-1.5 md:gap-2 shrink-0 self-end md:self-auto w-full md:w-auto justify-end mt-2 md:mt-0">
                      {editandoId === item.id ? (
                        <>
                          <button onClick={() => salvarEdicao(item.id)} className="p-2 md:p-1.5 flex-1 md:flex-none flex justify-center text-green-600 hover:bg-green-100 bg-white border border-green-200 rounded-lg transition-colors" title="Salvar">
                            <Check className="w-5 h-5 md:w-4 md:h-4" />
                          </button>
                          <button onClick={() => setEditandoId(null)} className="p-2 md:p-1.5 flex-1 md:flex-none flex justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 bg-white border border-slate-200 rounded-lg transition-colors" title="Cancelar">
                            <X className="w-5 h-5 md:w-4 md:h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditandoId(item.id); setTextoEdicao(item.nome); setModuloVinculoEdicao(item.modulo || []); if(abaAtiva === 'setores') setUnidadeEdicao(item.unidade_id); }} className="p-2 md:p-1.5 text-slate-500 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-200 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleExcluir(item.id)} className="p-2 md:p-1.5 text-slate-500 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* MODAL DE ALTERAÇÃO DE SENHA */}
      {modalSenha.aberto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-100 animate-in zoom-in duration-200">
            <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-1">Definir Nova Senha</h3>
            <p className="text-xs md:text-sm text-slate-500 mb-5">
              Criando nova credencial para <span className="font-bold text-slate-800 break-all">{modalSenha.email}</span>
            </p>
            
            <div className="space-y-4">
              <input
                type="password"
                placeholder="Nova senha (mín. 6 caracteres)"
                value={modalSenha.novaSenha}
                onChange={(e) => setModalSenha({...modalSenha, novaSenha: e.target.value})}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                autoFocus
              />
              
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setModalSenha({ aberto: false, userId: '', email: '', novaSenha: '' })}
                  className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleForcarTrocaSenha}
                  disabled={loading || modalSenha.novaSenha.length < 6}
                  className="flex-1 px-4 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE AMBIENTES (ACESSOS USUÁRIOS) */}
      {modalAcessos.aberto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-100 animate-in zoom-in duration-200">
            <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-1 flex items-center gap-2">
              <LayoutGrid className="text-emerald-600" /> Ambientes
            </h3>
            <p className="text-xs md:text-sm text-slate-500 mb-5">
              Quais setores <span className="font-bold text-slate-800">{modalAcessos.nome}</span> pode acessar?
            </p>
            
            <div className="space-y-3 mb-6 bg-slate-50 border border-slate-200 p-4 rounded-xl">
              {MODULOS_DISPONIVEIS.map(mod => (
                <label key={mod.id} className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={modalAcessos.modulos.includes(mod.id)}
                    onChange={() => {
                      setModalAcessos(prev => {
                        const jaTem = prev.modulos.includes(mod.id);
                        return {
                          ...prev,
                          modulos: jaTem ? prev.modulos.filter(m => m !== mod.id) : [...prev.modulos, mod.id]
                        }
                      })
                    }}
                    className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-bold text-slate-700 group-hover:text-emerald-700 transition-colors">{mod.nome}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setModalAcessos({ aberto: false, userId: '', nome: '', modulos: [] })}
                className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSalvarEdicaoModulos}
                disabled={loading}
                className="flex-1 px-4 py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO GENÉRICO */}
      <ModalConfirmacao
        isOpen={modalConfirm.isOpen}
        onClose={() => setModalConfirm({ ...modalConfirm, isOpen: false })}
        onConfirm={modalConfirm.onConfirm}
        titulo={modalConfirm.titulo}
        mensagem={modalConfirm.mensagem}
        isDestructive={modalConfirm.isDestructive}
        textoConfirmar={modalConfirm.textoConfirmar}
      />

    </div>
  )
}