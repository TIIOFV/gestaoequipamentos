import { useState, useEffect } from 'react'
import { supabase, supabaseAdmin } from '../lib/supabase'
import { 
  Settings, Plus, Trash2, Edit2, 
  Check, X, KeyRound 
} from 'lucide-react'

export default function ConfiguracoesPage() {
  const [abaAtiva, setAbaAtiva] = useState('usuarios')
  const [dados, setDados] = useState([])
  const [unidades, setUnidades] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(false)

  // Estados para Cadastro Padrão (Fabricantes, etc)
  const [novoItem, setNovoItem] = useState('')
  const [unidadeSelecionada, setUnidadeSelecionada] = useState('')

  // Estados para Cadastro de Usuários (Apenas TI)
  const [novoUsuario, setNovoUsuario] = useState({ nome: '', email: '', senha: '', perfil: 'analista' })

  // Estados para Edição Inline
  const [editandoId, setEditandoId] = useState(null)
  const [textoEdicao, setTextoEdicao] = useState('')
  const [unidadeEdicao, setUnidadeEdicao] = useState('')

  // Estado para o Modal de Senha Manual
  const [modalSenha, setModalSenha] = useState({ aberto: false, userId: '', email: '', novaSenha: '' })

  const abas = [
    { id: 'usuarios', nome: 'Usuários', tabela: 'perfis' },
    { id: 'fabricantes', nome: 'Fabricantes', tabela: 'fabricantes' },
    { id: 'prestadores', nome: 'Prestadores', tabela: 'prestadores' },
    { id: 'unidades', nome: 'Unidades', tabela: 'unidades' },
    { id: 'setores', nome: 'Setores', tabela: 'setores' },
    { id: 'status_equipamento', nome: 'Status do Equipamento', tabela: 'status_equipamento' },
  ]

  const tabelaAtual = abas.find(a => a.id === abaAtiva).tabela

  useEffect(() => {
    setEditandoId(null)
    if (abaAtiva === 'usuarios') {
      buscarUsuarios()
    } else {
      buscarDados()
      if (abaAtiva === 'setores') buscarUnidades()
    }
  }, [abaAtiva])

  // --- FUNÇÕES DA ABA USUÁRIOS ---
  const buscarUsuarios = async () => {
    setLoading(true)
    const { data } = await supabase.from('perfis').select('*').order('nome')
    setUsuarios(data || [])
    setLoading(false)
  }

const alternarCargo = async (id, novoCargo) => {
  setLoading(true);
  
  const { error } = await supabase
    .from('perfis')
    .update({ perfil: novoCargo })
    .eq('id', id); // Certifique-se que o 'id' aqui é o da tabela perfis

  if (error) {
    console.error("Erro Supabase:", error);
    alert(`Erro ao atualizar: ${error.message}. Verifique se você tem permissão de Administrador no banco.`);
  } else {
    // Atualiza a lista localmente para refletir a mudança na hora
    setUsuarios(usuarios.map(u => u.id === id ? { ...u, perfil: novoCargo } : u));
    alert('Permissão atualizada com sucesso!');
  }
  
  setLoading(false);
};

  const handleCriarUsuario = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    // 1. Criar na Autenticação usando o Admin (Ignora limites de e-mail e confirma na hora)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: novoUsuario.email,
      password: novoUsuario.senha,
      email_confirm: true 
    })

    if (authError) {
      alert('Erro ao criar conta: ' + authError.message)
    } else {
      // 2. Vincular à tabela 'perfis' usando o EMAIL como chave de busca
      const { error: profileError } = await supabase
        .from('perfis')
        .update({ 
          user_id: authData.user.id, // Aqui salvamos o vínculo real
          nome: novoUsuario.nome, 
          perfil: novoUsuario.perfil 
        })
        .eq('email', novoUsuario.email) 

      if (profileError) {
        alert('Erro ao preencher dados do perfil: ' + profileError.message)
      } else {
        alert('Usuário ' + novoUsuario.nome + ' cadastrado com sucesso!')
        setNovoUsuario({ nome: '', email: '', senha: '', perfil: 'analista' })
        buscarUsuarios()
      }
    }
    setLoading(false)
  }

  const handleForcarTrocaSenha = async () => {
    if (modalSenha.novaSenha.length < 6) {
      alert("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setLoading(true);
    
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      modalSenha.userId,
      { password: modalSenha.novaSenha }
    );

    if (error) {
      alert("Erro ao alterar senha. Verifique as permissões de Admin API do Supabase.\nDetalhe: " + error.message);
    } else {
      alert(`Senha do usuário ${modalSenha.email} alterada com sucesso!`);
      setModalSenha({ aberto: false, userId: '', email: '', novaSenha: '' });
    }
    setLoading(false);
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
      query = supabase.from('setores').select(`id, nome, unidade_id, unidade:unidade_id(nome)`).order('nome')
    }
    const { data, error } = await query
    if (!error) setDados(data || [])
    setLoading(false)
  }

  const handleCadastrarItem = async (e) => {
    e.preventDefault()
    if (!novoItem.trim()) return

    setLoading(true)
    let payload = { nome: novoItem }

    if (abaAtiva === 'setores') {
      if (!unidadeSelecionada) {
        alert('Selecione uma unidade.')
        setLoading(false); return;
      }
      payload.unidade_id = unidadeSelecionada
    }

    const { error } = await supabase.from(tabelaAtual).insert([payload])
    if (!error) { setNovoItem(''); buscarDados() }
    setLoading(false)
  }

  const handleExcluir = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este item?')) return
    const { error } = await supabase.from(tabelaAtual).delete().eq('id', id)
    if (!error) buscarDados()
    else alert('Erro ao excluir. O item pode estar vinculado a algum equipamento.')
  }

  const salvarEdicao = async (id) => {
    if (!textoEdicao.trim()) return
    setLoading(true)
    let payload = { nome: textoEdicao }

    if (abaAtiva === 'setores') {
      if (!unidadeEdicao) { alert('Selecione uma unidade.'); setLoading(false); return; }
      payload.unidade_id = unidadeEdicao
    }

    const { error } = await supabase.from(tabelaAtual).update(payload).eq('id', id)
    if (!error) { setEditandoId(null); buscarDados() }
    setLoading(false)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans relative">
      
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center">
          <Settings className="w-6 h-6 mr-3 text-blue-600" />
          Configurações do Sistema
        </h1>
        <p className="text-slate-500 mt-1">Gerencie os cadastros auxiliares e permissões de acesso.</p>
      </div>

      {/* Navegação de Abas */}
      <div className="flex space-x-2 border-b border-slate-200 overflow-x-auto pb-px">
        {abas.map((aba) => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              abaAtiva === aba.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {aba.nome}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        
        {abaAtiva === 'usuarios' ? (
          <div className="space-y-8">
            {/* Formulário de Criação de Usuários pelo TI */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Novo Colaborador</h3>
              <form onSubmit={handleCriarUsuario} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text" placeholder="Nome Completo" required
                  value={novoUsuario.nome} onChange={e => setNovoUsuario({...novoUsuario, nome: e.target.value})}
                  className="px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <input
                  type="email" placeholder="email@iofv.com" required
                  value={novoUsuario.email} onChange={e => setNovoUsuario({...novoUsuario, email: e.target.value})}
                  className="px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <input
                  type="password" placeholder="Senha Inicial" required minLength={6}
                  value={novoUsuario.senha} onChange={e => setNovoUsuario({...novoUsuario, senha: e.target.value})}
                  className="px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <div className="flex gap-2">
                  <select 
                    value={novoUsuario.perfil || 'analista'} 
                    onChange={e => setNovoUsuario({...novoUsuario, perfil: e.target.value})}
                    className="..."
                  >
                    <option value="analista">Analista</option>
                    <option value="administrador">Administrador</option>
                    <option value="visualizador">Visualizador (Apenas Agenda)</option> {/* Nova opção */}
                  </select>
                  <button disabled={loading} className="bg-slate-800 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-900 transition-colors disabled:opacity-50 whitespace-nowrap">
                    Criar
                  </button>
                </div>
              </form>
            </div>

            {/* LISTA DE USUÁRIOS */}
            <div className="border border-slate-100 rounded-lg divide-y divide-slate-100">
              {loading && usuarios.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">Carregando...</div>
              ) : usuarios.map((user) => (
                <div key={user.id} className="flex flex-wrap sm:flex-nowrap items-center justify-between p-4 hover:bg-slate-50 transition-colors gap-4">
                  <div>
                    <span className="font-medium text-slate-700 block">{user.nome || 'Sem Nome'}</span>
                    <span className="text-xs text-slate-500">{user.email}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <select 
                      value={user.perfil || 'analista'} 
                      onChange={(e) => alternarCargo(user.id, e.target.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 border ${
                        user.perfil === 'administrador' ? 'bg-purple-50 text-purple-800 border-purple-100' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <option value="analista">Analista</option>
                      <option value="administrador">Administrador</option>
                    </select>
                    
                    {/* Botão de Abrir o Modal de Senha */}
                    <button 
                      onClick={() => setModalSenha({ aberto: true, userId: user.user_id, email: user.email, novaSenha: '' })}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <KeyRound className="w-3 h-3" /> Alterar Senha
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          
          /* LÓGICA DAS OUTRAS ABAS (CADASTROS + EDIÇÃO INLINE) */
          <>
            <form onSubmit={handleCadastrarItem} className="flex gap-3 mb-6 flex-wrap sm:flex-nowrap">
              <input
                type="text" value={novoItem} onChange={(e) => setNovoItem(e.target.value)}
                placeholder={`Novo nome para ${abas.find(a => a.id === abaAtiva).nome}...`}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              
              {abaAtiva === 'setores' && (
                <select
                  value={unidadeSelecionada || ''} 
                  onChange={(e) => setUnidadeSelecionada(e.target.value)}
                  className="w-full sm:w-1/3 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  disabled={unidades.length === 0}
                >
                  <option value="" disabled>Selecione a Unidade</option>
                  {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              )}

              <button
                type="submit" disabled={loading || !novoItem.trim() || (abaAtiva === 'setores' && !unidadeSelecionada)}
                className="w-full sm:w-auto flex items-center justify-center px-6 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900 transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4 mr-2" /> Cadastrar
              </button>
            </form>

            {/* LISTA COM EDIÇÃO INLINE */}
            <div className="border border-slate-100 rounded-lg divide-y divide-slate-100">
              {loading && dados.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">Carregando...</div>
              ) : dados.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">Nenhum registro encontrado.</div>
              ) : (
                dados.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    
                    {editandoId === item.id ? (
                      <div className="flex-1 flex flex-wrap sm:flex-nowrap items-center gap-2 mr-4">
                        <input
                          type="text" value={textoEdicao} onChange={(e) => setTextoEdicao(e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          autoFocus
                        />
                        {abaAtiva === 'setores' && (
                          <select
                            value={unidadeEdicao || ''} 
                            onChange={(e) => setUnidadeEdicao(e.target.value)}
                            className="w-full sm:w-1/3 px-3 py-1.5 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                          >
                            <option value="" disabled>Selecione...</option>
                            {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                          </select>
                        )}
                      </div>
                    ) : (
                      <div>
                        <span className="font-medium text-slate-700 block">{item.nome}</span>
                        {abaAtiva === 'setores' && item.unidade && (
                          <span className="text-xs text-slate-500">Unidade: {item.unidade.nome}</span>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {editandoId === item.id ? (
                        <>
                          <button onClick={() => salvarEdicao(item.id)} className="p-1.5 text-green-600 hover:bg-green-100 bg-white border border-green-200 rounded transition-colors" title="Salvar">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditandoId(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 bg-white border border-slate-200 rounded transition-colors" title="Cancelar">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditandoId(item.id); setTextoEdicao(item.nome); if(abaAtiva === 'setores') setUnidadeEdicao(item.unidade_id); }} className="p-1.5 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-200 rounded transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleExcluir(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 rounded transition-colors">
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

      {/* MODAL MANUAL DE ALTERAÇÃO DE SENHA */}
      {modalSenha.aberto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-slate-100 animate-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Definir Nova Senha</h3>
            <p className="text-sm text-slate-500 mb-5">
              Criando nova credencial para <span className="font-medium text-slate-800">{modalSenha.email}</span>
            </p>
            
            <div className="space-y-4">
              <input
                type="password"
                placeholder="Nova senha (mín. 6 caracteres)"
                value={modalSenha.novaSenha}
                onChange={(e) => setModalSenha({...modalSenha, novaSenha: e.target.value})}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setModalSenha({ aberto: false, userId: '', email: '', novaSenha: '' })}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleForcarTrocaSenha}
                  disabled={loading || modalSenha.novaSenha.length < 6}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar Senha'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}