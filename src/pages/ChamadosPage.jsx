import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  Plus, Search, ArrowLeft, CheckCircle2, AlertCircle, 
  X, Ticket, Clock, User, Edit, FileText, Calendar, Trash2
} from 'lucide-react'

export default function ChamadosPage() {
  const location = useLocation()
  
  const [view, setView] = useState('lista')
  const [chamados, setChamados] = useState([])
  const [chamadoSelecionado, setChamadoSelecionado] = useState(null)
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  const [usuarioAtual, setUsuarioAtual] = useState({ id: '', nome: 'Carregando...' })

  const [auxiliares, setAuxiliares] = useState({
    equipamentos: [],
    status: [],
    prestadores: []
  })

  const getDataHoraAtual = () => {
    const agora = new Date()
    agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset())
    return agora.toISOString().slice(0, 16)
  }

  const estadoInicialForm = {
    id: null,
    equipamento_id: '',
    tipo_intervencao: 'Corretiva',
    status_id: '',
    prestador_id: '',
    protocolo_externo: '',
    descricao: '',
    data_abertura: getDataHoraAtual(),
    data_prevista: '',
    aberto_por_id: ''
  }
  
  const [formData, setFormData] = useState(estadoInicialForm)

  useEffect(() => {
    inicializarPagina()
  }, [])

  const inicializarPagina = async () => {
    setLoading(true)
    await identificarUsuario()
    await carregarAuxiliares()
    await buscarChamados()
    
    if (location.state?.action === 'novo') {
      setView('novo')
      if (location.state.equipamentoId) {
        setFormData(prev => ({ ...prev, equipamento_id: location.state.equipamentoId }))
      }
      window.history.replaceState({}, document.title)
    }

    setLoading(false)
  }

  const identificarUsuario = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const { data: perfil } = await supabase
        .from('perfis')
        .select('id, nome')
        .eq('user_id', session.user.id)
        .single()
      
      if (perfil) {
        setUsuarioAtual(perfil)
        setFormData(prev => ({ ...prev, aberto_por_id: perfil.id }))
      }
    }
  }

  const carregarAuxiliares = async () => {
    const [eq, st, pr] = await Promise.all([
      supabase.from('equipamentos').select('id, nome, patrimonio').order('nome'),
      supabase.from('status_chamado').select('*').order('nome'),
      supabase.from('prestadores').select('*').order('nome')
    ])

    setAuxiliares({
      equipamentos: eq.data || [],
      status: st.data || [],
      prestadores: pr.data || []
    })
  }

  const buscarChamados = async () => {
    const { data, error } = await supabase
      .from('chamados')
      .select(`
        *,
        equipamento:equipamento_id(nome, patrimonio),
        status:status_id(nome),
        prestador:prestador_id(nome),
        aberto_por:aberto_por_id(nome)
      `)
      .order('created_at', { ascending: false })

    if (!error) setChamados(data || [])
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const payload = { ...formData }
    if (view === 'novo') delete payload.id
    if (!payload.aberto_por_id) payload.aberto_por_id = usuarioAtual.id

    if (!payload.data_prevista) payload.data_prevista = null

    const statusSelecionado = auxiliares.status.find(s => s.id === payload.status_id)
    if (statusSelecionado?.nome === 'Concluído' && view === 'editar') {
      payload.data_conclusao = new Date().toISOString()
    }

    const query = view === 'novo' 
      ? supabase.from('chamados').insert([payload])
      : supabase.from('chamados').update(payload).eq('id', formData.id)

    const { error } = await query
    
    if (error) {
      mostrarToast('Erro ao salvar chamado: ' + error.message, 'error')
    } else {
      mostrarToast(view === 'novo' ? 'Chamado aberto com sucesso!' : 'Chamado atualizado!')
      voltarParaLista()
      buscarChamados()
    }
    setLoading(false)
  }

  const handleExcluir = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta Ordem de Serviço? Esta ação apagará o registro do histórico do equipamento.')) {
      setLoading(true)
      const { error } = await supabase.from('chamados').delete().eq('id', id)
      
      if (error) {
        mostrarToast('Erro ao excluir: ' + error.message, 'error')
      } else {
        mostrarToast('Ordem de Serviço excluída com sucesso!')
        voltarParaLista()
        buscarChamados()
      }
      setLoading(false)
    }
  }

  const iniciarEdicao = (ch) => {
    setFormData({
      id: ch.id,
      equipamento_id: ch.equipamento_id || '',
      tipo_intervencao: ch.tipo_intervencao || 'Corretiva',
      status_id: ch.status_id || '',
      prestador_id: ch.prestador_id || '',
      protocolo_externo: ch.protocolo_externo || '',
      descricao: ch.descricao || '',
      data_abertura: ch.data_abertura ? new Date(ch.data_abertura).toISOString().slice(0, 16) : getDataHoraAtual(),
      data_prevista: ch.data_prevista || '',
      aberto_por_id: ch.aberto_por_id || usuarioAtual.id
    })
    setView('editar')
  }

  const voltarParaLista = () => {
    setView('lista')
    setChamadoSelecionado(null)
    setFormData({
      ...estadoInicialForm,
      aberto_por_id: usuarioAtual.id,
      data_abertura: getDataHoraAtual()
    })
  }

  const mostrarToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000)
  }

  const chamadosFiltrados = chamados.filter(ch => 
    ch.equipamento?.nome.toLowerCase().includes(busca.toLowerCase()) || 
    ch.protocolo_externo?.includes(busca) ||
    ch.descricao?.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="relative min-h-full font-sans pb-10 animate-in fade-in duration-500">
      
      {/* ALERTA RESPONSIVO */}
      {toast.show && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-6 md:top-6 z-50 animate-in slide-in-from-top-4 md:slide-in-from-right fade-in duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 md:px-5 md:py-4 rounded-xl shadow-2xl border ${
            toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'
          }`}>
            {toast.type === 'error' ? <AlertCircle size={20} className="shrink-0" /> : <CheckCircle2 size={20} className="shrink-0" />}
            <span className="font-bold text-xs md:text-sm flex-1">{toast.message}</span>
            <button onClick={() => setToast({...toast, show: false})} className="ml-2 opacity-50 hover:opacity-100 p-1 shrink-0">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* TELA DE LISTA */}
      {view === 'lista' && (
        <div className="space-y-4 md:space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
                <Ticket className="text-blue-600" /> Chamados e OS
              </h1>
              <p className="text-sm md:text-base text-slate-500 mt-1">Gerencie as corretivas, preventivas, calibrações e qualificações.</p>
            </div>
            <button 
              onClick={() => setView('novo')}
              className="w-full md:w-auto bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 md:py-3 px-6 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus size={20} /> Novo chamado
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por equipamento, protocolo ou descrição..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-11 md:pl-12 pr-4 py-3 md:py-3.5 text-sm md:text-base bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              <div className="text-center py-10 text-slate-500 font-medium">Carregando chamados...</div>
            ) : chamadosFiltrados.length === 0 ? (
              <div className="text-center py-10 text-slate-500 font-medium bg-white rounded-2xl border border-slate-100">Nenhum chamado encontrado.</div>
            ) : chamadosFiltrados.map((ch) => (
              <div key={ch.id} className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-4 items-start md:items-center justify-between group">
                <div className="flex-1 w-full">
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                    <span className={`text-[10px] md:text-xs font-bold px-2 py-0.5 md:px-2.5 md:py-1 rounded-md border ${
                      ch.tipo_intervencao === 'Preventiva' ? 'bg-green-50 text-green-700 border-green-200' :
                      ch.tipo_intervencao === 'Calibração' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      ch.tipo_intervencao === 'Qualificação' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {ch.tipo_intervencao || 'Corretiva'}
                    </span>
                    <span className="font-bold text-slate-800 text-base md:text-lg">{ch.equipamento?.nome}</span>
                    <span className="bg-slate-100 text-slate-600 text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded font-mono border border-slate-200">
                      #{ch.equipamento?.patrimonio}
                    </span>
                    <span className={`text-[10px] md:text-xs font-bold px-2.5 py-0.5 md:py-1 rounded-full border ${
                      ch.status?.nome === 'Concluído' ? 'bg-green-50 text-green-700 border-green-200' :
                      ch.status?.nome === 'Aberto' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {ch.status?.nome}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs md:text-sm line-clamp-2 md:line-clamp-1 mt-1">{ch.descricao}</p>
                  <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-3 text-[11px] md:text-xs font-medium text-slate-400">
                    <div className="flex items-center gap-1"><Clock size={12} className="md:w-3.5 md:h-3.5" /> Aberto: {new Date(ch.data_abertura).toLocaleDateString('pt-BR')}</div>
                    {ch.data_prevista && (
                      <div className="flex items-center gap-1 text-blue-600"><Calendar size={12} className="md:w-3.5 md:h-3.5" /> Agendado: {new Date(ch.data_prevista).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</div>
                    )}
                    <div className="flex items-center gap-1"><User size={12} className="md:w-3.5 md:h-3.5" /> {ch.aberto_por?.nome}</div>
                  </div>
                </div>
                <button 
                  onClick={() => { setChamadoSelecionado(ch); setView('detalhes'); }}
                  className="w-full md:w-auto mt-2 md:mt-0 px-5 py-2 md:py-2.5 text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors flex justify-center items-center whitespace-nowrap"
                >
                  Ver detalhes
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TELA DE DETALHES */}
      {view === 'detalhes' && chamadoSelecionado && (
        <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1 md:mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Detalhes da OS</h1>
                <span className={`px-2.5 py-1 rounded-md text-[10px] md:text-sm font-bold border ${
                  chamadoSelecionado.tipo_intervencao === 'Preventiva' ? 'bg-green-100 text-green-800 border-green-200' :
                  chamadoSelecionado.tipo_intervencao === 'Calibração' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                  chamadoSelecionado.tipo_intervencao === 'Qualificação' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                  'bg-red-100 text-red-800 border-red-200'
                }`}>
                  {chamadoSelecionado.tipo_intervencao || 'Corretiva'}
                </span>
              </div>
              <p className="text-sm md:text-base text-slate-500">Acompanhamento do chamado técnico.</p>
            </div>
            
            {/* BOTÕES DO CABEÇALHO RESPONSIVOS */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-3 w-full md:w-auto">
              <button onClick={voltarParaLista} className="flex-1 sm:flex-none justify-center px-4 md:px-5 py-2.5 text-xs md:text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2 shadow-sm">
                <ArrowLeft size={16} /> Voltar
              </button>
              <button onClick={() => iniciarEdicao(chamadoSelecionado)} className="flex-1 sm:flex-none justify-center px-4 md:px-5 py-2.5 text-xs md:text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl transition-colors flex items-center gap-2 shadow-sm">
                <Edit size={16} /> Editar OS
              </button>
              <button onClick={() => handleExcluir(chamadoSelecionado.id)} className="w-full sm:w-auto justify-center px-4 md:px-5 py-2.5 text-xs md:text-sm font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-xl transition-colors flex items-center gap-2 shadow-sm">
                <Trash2 size={16} /> Excluir OS
              </button>
            </div>
          </div>

          <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 md:mb-6 flex items-center gap-2">
              <FileText className="text-blue-600" size={18} md:size={20} /> Informações principais
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 md:gap-y-5 gap-x-6 md:gap-x-10 text-xs md:text-sm">
              <div className="flex flex-col border-b border-slate-50 pb-2">
                <span className="text-slate-500 font-semibold mb-0.5 md:mb-1">Equipamento</span>
                <span className="font-medium text-slate-800">{chamadoSelecionado.equipamento?.nome || '-'}</span>
              </div>
              <div className="flex flex-col border-b border-slate-50 pb-2">
                <span className="text-slate-500 font-semibold mb-0.5 md:mb-1">Status atual</span>
                <span className="font-medium text-slate-800">
                  <span className={`inline-block px-2 md:px-2.5 py-0.5 md:py-1 rounded-md text-[10px] md:text-xs font-bold border ${
                    chamadoSelecionado.status?.nome === 'Aberto' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    chamadoSelecionado.status?.nome === 'Concluído' ? 'bg-green-50 text-green-700 border-green-200' :
                    'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {chamadoSelecionado.status?.nome || 'Sem Status'}
                  </span>
                </span>
              </div>
              <div className="flex flex-col border-b border-slate-50 pb-2">
                <span className="text-slate-500 font-semibold mb-0.5 md:mb-1">Data e hora de abertura</span>
                <span className="font-medium text-slate-800">{chamadoSelecionado.data_abertura ? new Date(chamadoSelecionado.data_abertura).toLocaleString('pt-BR') : '-'}</span>
              </div>
              <div className="flex flex-col border-b border-slate-50 pb-2">
                <span className="text-slate-500 font-semibold mb-0.5 md:mb-1 flex items-center gap-1"><Calendar size={12}/> Data Prevista (Agenda)</span>
                <span className="font-medium text-slate-800">{chamadoSelecionado.data_prevista ? new Date(chamadoSelecionado.data_prevista).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Não agendado'}</span>
              </div>
              <div className="flex flex-col border-b border-slate-50 pb-2">
                <span className="text-slate-500 font-semibold mb-0.5 md:mb-1">Fornecedor / Prestador</span>
                <span className="font-medium text-slate-800">{chamadoSelecionado.prestador?.nome || '-'}</span>
              </div>
              <div className="flex flex-col border-b border-slate-50 pb-2">
                <span className="text-slate-500 font-semibold mb-0.5 md:mb-1">Protocolo Externo (OS)</span>
                <span className="font-medium text-slate-800">{chamadoSelecionado.protocolo_externo || '-'}</span>
              </div>
            </div>

            <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-slate-100">
              <span className="text-slate-500 font-semibold text-xs md:text-sm block mb-2 md:mb-3">Descrição do chamado:</span>
              <p className="text-slate-700 text-xs md:text-sm bg-slate-50 p-4 md:p-5 rounded-xl border border-slate-100 min-h-[80px] whitespace-pre-wrap">
                {chamadoSelecionado.descricao || 'Sem descrição.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FORMULÁRIO */}
      {(view === 'novo' || view === 'editar') && (
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
                {view === 'novo' ? 'Nova Ordem de Serviço' : 'Editar OS'}
              </h1>
              <p className="text-sm md:text-base text-slate-500 mt-1">Registre a manutenção que integrará a agenda técnica.</p>
            </div>
            <button onClick={voltarParaLista} className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 md:px-5 py-2.5 text-sm text-blue-800 font-bold bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-xl transition-colors">
              <ArrowLeft size={18} /> Voltar
            </button>
          </div>

          <form onSubmit={handleSalvar} className="space-y-4 md:space-y-6">
            <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4 md:space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Equipamento</label>
                  <select required value={formData.equipamento_id} onChange={e => setFormData({...formData, equipamento_id: e.target.value})} className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">Selecione o equipamento...</option>
                    {auxiliares.equipamentos.map(eq => <option key={eq.id} value={eq.id}>{eq.nome} (Pat: {eq.patrimonio})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Status atual</label>
                  <select required value={formData.status_id} onChange={e => setFormData({...formData, status_id: e.target.value})} className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">Selecione...</option>
                    {auxiliares.status.map(st => <option key={st.id} value={st.id}>{st.nome}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 p-4 md:p-5 bg-blue-50/50 border border-blue-100 rounded-xl">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Tipo de Intervenção</label>
                  <select value={formData.tipo_intervencao} onChange={e => setFormData({...formData, tipo_intervencao: e.target.value})} className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="Corretiva">Corretiva</option>
                    <option value="Preventiva">Preventiva</option>
                    <option value="Calibração">Calibração</option>
                    <option value="Qualificação">Qualificação</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Data Prevista (Agendamento)</label>
                  <input type="date" value={formData.data_prevista} onChange={e => setFormData({...formData, data_prevista: e.target.value})} className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  <p className="text-[10px] md:text-xs text-slate-500 mt-1 md:mt-1.5">Deixe em branco se for apenas um registro corretivo imediato.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Fornecedor / prestador</label>
                  <select value={formData.prestador_id} onChange={e => setFormData({...formData, prestador_id: e.target.value})} className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">Selecione...</option>
                    {auxiliares.prestadores.map(pr => <option key={pr.id} value={pr.id}>{pr.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Protocolo externo (OS)</label>
                  <input value={formData.protocolo_externo} onChange={e => setFormData({...formData, protocolo_externo: e.target.value})} placeholder="Nº da OS do prestador" className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Descrição da Manutenção</label>
                <textarea required rows="4" value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none" placeholder="Descreva o problema relatado ou os procedimentos da preventiva..."></textarea>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-3.5 md:py-4 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70 text-base md:text-lg">
              {loading ? 'Salvando...' : 'Salvar Ordem de Serviço'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}