import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useModulo } from '../contexts/ModuloContext'
import { 
  Plus, Search, ArrowLeft, CheckCircle2, AlertCircle, 
  X, Ticket, Clock, User, Edit, FileText, Calendar, Trash2,
  Paperclip, Image as ImageIcon, Filter, Wrench,
  Monitor, Building, Hash
} from 'lucide-react'
import toast from 'react-hot-toast'
import ModalConfirmacao from '../components/ModalConfirmacao'

export default function ChamadosPage() {
  const location = useLocation()
  const { moduloAtivo } = useModulo() 
  
  const [view, setView] = useState('lista')
  const [chamados, setChamados] = useState([])
  const [chamadoSelecionado, setChamadoSelecionado] = useState(null)
  
  // FILTROS AVANÇADOS
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroPrestador, setFiltroPrestador] = useState('')

  const [loading, setLoading] = useState(true)
  const [usuarioAtual, setUsuarioAtual] = useState({ id: '', nome: 'Carregando...' })

  const [modalConfirm, setModalConfirm] = useState({
    isOpen: false,
    titulo: '',
    mensagem: '',
    textoConfirmar: 'Confirmar',
    onConfirm: () => {}
  });

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
    id: null, equipamento_id: '', tipo_intervencao: 'Corretiva',
    status_id: '', prestador_id: '', protocolo_externo: '',
    descricao: '', data_abertura: getDataHoraAtual(), data_prevista: '',
    aberto_por_id: '',
    anexos: [] 
  }
  
  const [formData, setFormData] = useState(estadoInicialForm)

  useEffect(() => {
    if (!moduloAtivo) return;
    inicializarPagina()
  }, [location.state, moduloAtivo])

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
      const { data: perfil } = await supabase.from('perfis').select('id, nome').eq('user_id', session.user.id).single()
      if (perfil) {
        setUsuarioAtual(perfil)
        setFormData(prev => ({ ...prev, aberto_por_id: perfil.id }))
      }
    }
  }

  const carregarAuxiliares = async () => {
    const [eq, st, pr] = await Promise.all([
      // Equipamento é um vínculo de 1 pra 1, então usamos .eq
      supabase.from('equipamentos').select('id, nome, patrimonio').eq('modulo', moduloAtivo).order('nome'),
      // Status do chamado (Aberto/Concluído) é padrão do sistema, não precisa de filtro
      supabase.from('status_chamado').select('*').order('nome'),
      // Prestadores agora usa a lógica do Array, usamos .contains
      supabase.from('prestadores').select('*').contains('modulo', [moduloAtivo]).order('nome')
    ])
    setAuxiliares({
      equipamentos: eq.data || [], status: st.data || [], prestadores: pr.data || []
    })
  }

  const buscarChamados = async () => {
    const { data, error } = await supabase
      .from('chamados')
      .select(`*, equipamento:equipamento_id(nome, patrimonio), status:status_id(nome), prestador:prestador_id(nome), aberto_por:aberto_por_id(nome)`)
      .eq('modulo', moduloAtivo) 
      .order('created_at', { ascending: false })

    if (!error) {
      setChamados(data || [])
      
      if (location.state?.openDetailsId && data) {
        const chTarget = data.find(c => String(c.id) === String(location.state.openDetailsId));
        if (chTarget) {
          setChamadoSelecionado(chTarget);
          setView('detalhes');
          window.scrollTo(0, 0);
          window.history.replaceState({}, document.title);
        }
      }
    }
  }

  const handleUploadAnexos = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setLoading(true);
    toast.loading('Enviando anexos...', { id: 'upload-anexo' });

    try {
      const novasUrls = [];
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `os_anexo_${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('equipamentos').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('equipamentos').getPublicUrl(fileName);
        novasUrls.push(publicUrl);
      }

      setFormData(prev => ({ ...prev, anexos: [...(prev.anexos || []), ...novasUrls] }));
      toast.success(`${files.length} anexo(s) carregado(s)!`, { id: 'upload-anexo' });
    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar os arquivos no Storage.', { id: 'upload-anexo' });
    } finally {
      setLoading(false);
    }
  };

  const removerAnexo = (urlRemover) => {
    setFormData(prev => ({ ...prev, anexos: prev.anexos.filter(url => url !== urlRemover) }));
  };

  const handleSalvar = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const payload = { 
      ...formData,
      modulo: moduloAtivo, // Injeta o módulo ao salvar
      equipamento_id: formData.equipamento_id || null,
      status_id: formData.status_id || null,
      prestador_id: formData.prestador_id === "" ? null : formData.prestador_id,
      aberto_por_id: formData.aberto_por_id || usuarioAtual.id || null,
      data_prevista: formData.data_prevista === "" ? null : formData.data_prevista
    }

    if (view === 'novo') delete payload.id

    const statusSelecionado = auxiliares.status.find(s => s.id === payload.status_id)
    if (statusSelecionado?.nome === 'Concluído' && view === 'editar') {
      payload.data_conclusao = new Date().toISOString()
    }

    const query = view === 'novo' ? supabase.from('chamados').insert([payload]) : supabase.from('chamados').update(payload).eq('id', formData.id)
    const { error } = await query
    
    if (error) {
      toast.error('Erro ao salvar chamado: ' + error.message)
    } else {
      toast.success(view === 'novo' ? 'Chamado aberto com sucesso!' : 'Chamado atualizado!')
      voltarParaLista()
      buscarChamados()
    }
    setLoading(false)
  }

  const handleExcluir = (id) => {
    setModalConfirm({
      isOpen: true,
      titulo: 'Excluir Ordem de Serviço',
      mensagem: 'Tem certeza que deseja excluir esta OS? Esta ação apagará definitivamente este registro do histórico do equipamento.',
      textoConfirmar: 'Sim, Excluir OS',
      onConfirm: async () => {
        setLoading(true)
        const { error } = await supabase.from('chamados').delete().eq('id', id)
        
        if (error) {
          toast.error('Erro ao excluir: ' + error.message)
        } else {
          toast.success('Ordem de Serviço excluída com sucesso!')
          voltarParaLista()
          buscarChamados()
        }
        setLoading(false)
      }
    });
  }

  const iniciarEdicao = (ch) => {
    setFormData({
      id: ch.id, equipamento_id: ch.equipamento_id || '', tipo_intervencao: ch.tipo_intervencao || 'Corretiva',
      status_id: ch.status_id || '', prestador_id: ch.prestador_id || '', protocolo_externo: ch.protocolo_externo || '',
      descricao: ch.descricao || '', data_abertura: ch.data_abertura ? new Date(ch.data_abertura).toISOString().slice(0, 16) : getDataHoraAtual(),
      data_prevista: ch.data_prevista || '', aberto_por_id: ch.aberto_por_id || usuarioAtual.id,
      anexos: ch.anexos || []
    })
    setView('editar')
  }

  const voltarParaLista = () => {
    setView('lista')
    setChamadoSelecionado(null)
    setFormData({ ...estadoInicialForm, aberto_por_id: usuarioAtual.id, data_abertura: getDataHoraAtual() })
    window.history.replaceState({}, document.title)
  }

  const chamadosFiltrados = chamados.filter(ch => {
    const term = busca.toLowerCase()
    
    const nomeEq = ch.equipamento?.nome || ''
    const protExt = ch.protocolo_externo || ''
    const desc = ch.descricao || ''

    const matchBusca = 
      nomeEq.toLowerCase().includes(term) || 
      protExt.toLowerCase().includes(term) || 
      desc.toLowerCase().includes(term)

    const matchTipo = filtroTipo === '' || ch.tipo_intervencao === filtroTipo
    const matchStatus = filtroStatus === '' || ch.status_id === filtroStatus
    const matchPrestador = filtroPrestador === '' || ch.prestador_id === filtroPrestador
    
    return matchBusca && matchTipo && matchStatus && matchPrestador
  })

  const isPDF = (url) => {
    if (!url) return false;
    return url.toLowerCase().includes('.pdf')
  }

  return (
    <div className="relative min-h-full font-sans pb-10 animate-in fade-in duration-500">
      
      <ModalConfirmacao
        isOpen={modalConfirm.isOpen}
        onClose={() => setModalConfirm({ ...modalConfirm, isOpen: false })}
        onConfirm={modalConfirm.onConfirm}
        titulo={modalConfirm.titulo}
        mensagem={modalConfirm.mensagem}
        textoConfirmar={modalConfirm.textoConfirmar}
      />

      {view === 'lista' && (
        <div className="space-y-4 md:space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3"><Ticket className="text-blue-600" /> Chamados e OS</h1>
              <p className="text-sm md:text-base text-slate-500 mt-1">Gerencie as corretivas, preventivas, calibrações e qualificações.</p>
            </div>
            <button onClick={() => setView('novo')} className="w-full md:w-auto bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 md:py-3 px-6 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
              <Plus size={20} /> Novo chamado
            </button>
          </div>

          <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input type="text" placeholder="Buscar por equipamento, protocolo externo ou descrição do chamado..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full pl-11 md:pl-12 pr-4 py-3 md:py-3.5 text-sm md:text-base bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
              <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1 shrink-0"><Filter size={14}/> Filtros:</span>
              
              <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="w-auto min-w-[140px] shrink-0 px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-700">
                <option value="">Tipo de Serviço</option>
                <option value="Corretiva">Corretiva</option>
                <option value="Preventiva">Preventiva</option>
                <option value="Calibração">Calibração</option>
                <option value="Qualificação">Qualificação</option>
              </select>

              <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="w-auto min-w-[140px] shrink-0 px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-700">
                <option value="">Status da OS</option>
                {auxiliares.status.map(st => <option key={st.id} value={st.id}>{st.nome}</option>)}
              </select>

              <select value={filtroPrestador} onChange={(e) => setFiltroPrestador(e.target.value)} className="w-auto min-w-[140px] shrink-0 px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-700">
                <option value="">Empresa/Prestador</option>
                <option value="Interno">Manutenção Interna</option>
                {auxiliares.prestadores.map(pr => <option key={pr.id} value={pr.id}>{pr.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              <div className="text-center py-10 text-slate-500 font-medium">Carregando chamados...</div>
            ) : chamadosFiltrados.length === 0 ? (
              <div className="text-center py-10 text-slate-500 font-medium bg-white rounded-2xl border border-slate-100">Nenhum chamado encontrado para este ambiente ou com esses filtros.</div>
            ) : chamadosFiltrados.map((ch) => {
              
              const temPDF = ch.anexos && ch.anexos.some(a => isPDF(a));
              
              return (
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
                    <span className="font-bold text-slate-800 text-base md:text-lg">{ch.equipamento?.nome || 'Equipamento Excluído'}</span>
                    <span className="bg-slate-100 text-slate-600 text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded font-mono border border-slate-200">
                      #{ch.equipamento?.patrimonio || 'S/N'}
                    </span>
                    <span className={`text-[10px] md:text-xs font-bold px-2.5 py-0.5 md:py-1 rounded-full border ${
                      ch.status?.nome === 'Concluído' ? 'bg-green-50 text-green-700 border-green-200' :
                      ch.status?.nome === 'Aberto' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {ch.status?.nome}
                    </span>
                    
                    {ch.anexos && ch.anexos.length > 0 && (
                      <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border shadow-sm ${temPDF ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`} title={temPDF ? 'Possui Laudo PDF' : 'Possui Fotos'}>
                        {temPDF ? <FileText size={12} /> : <Paperclip size={12} />} {ch.anexos.length}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs md:text-sm line-clamp-2 md:line-clamp-1 mt-1">{ch.descricao}</p>
                  <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-3 text-[11px] md:text-xs font-medium text-slate-400">
                    <div className="flex items-center gap-1"><Clock size={12} className="md:w-3.5 md:h-3.5" /> Aberto: {new Date(ch.data_abertura).toLocaleDateString('pt-BR')}</div>
                    {ch.data_prevista && (
                      <div className="flex items-center gap-1 text-blue-600"><Calendar size={12} className="md:w-3.5 md:h-3.5" /> Agendado: {new Date(ch.data_prevista).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</div>
                    )}
                    <div className="flex items-center gap-1"><Wrench size={12} className="md:w-3.5 md:h-3.5" /> {ch.prestador?.nome || 'Interno'}</div>
                  </div>
                </div>
                <button onClick={() => { setChamadoSelecionado(ch); setView('detalhes'); }} className="w-full md:w-auto mt-2 md:mt-0 px-5 py-2 md:py-2.5 text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors flex justify-center items-center whitespace-nowrap">
                  Ver detalhes
                </button>
              </div>
            )})}
          </div>
        </div>
      )}

      {view === 'detalhes' && chamadoSelecionado && (
        <div className="max-w-6xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1">
                <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Detalhes da OS</h1>
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold border uppercase tracking-wider ${
                  chamadoSelecionado.tipo_intervencao === 'Preventiva' ? 'bg-green-100 text-green-800 border-green-200' :
                  chamadoSelecionado.tipo_intervencao === 'Calibração' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                  chamadoSelecionado.tipo_intervencao === 'Qualificação' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                  'bg-red-100 text-red-800 border-red-200'
                }`}>
                  {chamadoSelecionado.tipo_intervencao || 'Corretiva'}
                </span>
              </div>
              <p className="text-sm text-slate-500 font-medium">Acompanhamento e ficha técnica da ordem de serviço.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full md:w-auto">
              <button onClick={voltarParaLista} className="flex-1 sm:flex-none justify-center px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2 shadow-sm"><ArrowLeft size={16} /> Voltar</button>
              <button onClick={() => iniciarEdicao(chamadoSelecionado)} className="flex-1 sm:flex-none justify-center px-5 py-2.5 text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl transition-colors flex items-center gap-2 shadow-sm"><Edit size={16} /> Editar OS</button>
              <button onClick={() => handleExcluir(chamadoSelecionado.id)} className="w-full sm:w-auto justify-center px-5 py-2.5 text-sm font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-xl transition-colors flex items-center gap-2 shadow-sm"><Trash2 size={16} /> Excluir OS</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100">
                  <Monitor size={28} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Equipamento Vinculado</p>
                  <h3 className="text-lg md:text-xl font-bold text-slate-800 leading-tight">{chamadoSelecionado.equipamento?.nome || 'Equipamento Excluído'}</h3>
                  <div className="flex items-center gap-3 mt-2 text-xs font-medium text-slate-500">
                    <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1 font-mono"><Hash size={12}/> Pat: {chamadoSelecionado.equipamento?.patrimonio || 'S/N'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <FileText className="text-blue-600" size={18} /> Relato / Descrição Técnica
                </h3>
                <p className="text-slate-700 text-sm bg-slate-50/80 p-5 rounded-xl border border-slate-100 min-h-[140px] whitespace-pre-wrap leading-relaxed shadow-inner">
                  {chamadoSelecionado.descricao || 'Nenhum detalhe técnico foi inserido na descrição desta OS.'}
                </p>
              </div>

              {chamadoSelecionado.anexos && chamadoSelecionado.anexos.length > 0 && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Paperclip className="text-blue-600" size={18} /> Documentos e Anexos ({chamadoSelecionado.anexos.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {chamadoSelecionado.anexos.map((anexo, index) => (
                      <a key={index} href={anexo} target="_blank" rel="noopener noreferrer" className="group relative flex flex-col items-center justify-center p-4 border border-slate-200 rounded-xl bg-slate-50 hover:bg-blue-50 hover:border-blue-200 hover:shadow-md transition-all text-center h-32">
                        {isPDF(anexo) ? (
                          <>
                            <FileText size={40} className="text-red-500 mb-2 group-hover:-translate-y-1 transition-transform" />
                            <span className="text-xs font-bold text-slate-700 line-clamp-1">Laudo_Tecnico.pdf</span>
                          </>
                        ) : (
                          <>
                            <div className="absolute inset-0 overflow-hidden rounded-xl">
                              <img src={anexo} alt="Anexo" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all" />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent rounded-xl" />
                            <span className="relative z-10 mt-auto text-xs font-bold text-white w-full truncate px-2 pb-1">Imagem Anexada</span>
                          </>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Status Atual</p>
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${
                    chamadoSelecionado.status?.nome === 'Concluído' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                    chamadoSelecionado.status?.nome === 'Aberto' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                    'bg-blue-50 border-blue-200 text-blue-800'
                  }`}>
                  {chamadoSelecionado.status?.nome === 'Concluído' ? <CheckCircle2 size={24} /> : 
                   chamadoSelecionado.status?.nome === 'Aberto' ? <Clock size={24} /> : 
                   <AlertCircle size={24} />}
                  <span className="text-lg font-bold">{chamadoSelecionado.status?.nome || 'Sem Status'}</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Cronograma (Linha do Tempo)</p>
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"><Ticket size={14}/></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Data de Abertura</p>
                      <p className="text-sm font-bold text-slate-800">{chamadoSelecionado.data_abertura ? new Date(chamadoSelecionado.data_abertura).toLocaleString('pt-BR') : '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0"><Calendar size={14}/></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Previsão (Agenda)</p>
                      <p className="text-sm font-bold text-slate-800">{chamadoSelecionado.data_prevista ? new Date(chamadoSelecionado.data_prevista).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Não agendado'}</p>
                    </div>
                  </div>
                  {chamadoSelecionado.data_conclusao && (
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0"><CheckCircle2 size={14}/></div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Data de Conclusão</p>
                        <p className="text-sm font-bold text-slate-800">{new Date(chamadoSelecionado.data_conclusao).toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Execução & Responsáveis</p>
                <div className="space-y-4">
                  <div className="flex flex-col gap-1 border-b border-slate-50 pb-3">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Building size={14}/> Fornecedor / Prestador</span>
                    <span className="text-sm font-bold text-slate-800 ml-5">{chamadoSelecionado.prestador?.nome || 'Manutenção Interna'}</span>
                  </div>
                  <div className="flex flex-col gap-1 border-b border-slate-50 pb-3">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Hash size={14}/> Protocolo Externo (OS)</span>
                    <span className="text-sm font-bold text-slate-800 ml-5">{chamadoSelecionado.protocolo_externo || 'Sem protocolo vinculado'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><User size={14}/> Aberto Por (Solicitante)</span>
                    <span className="text-sm font-bold text-slate-800 ml-5">{chamadoSelecionado.aberto_por?.nome || '-'}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {(view === 'novo' || view === 'editar') && (
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800">{view === 'novo' ? 'Nova Ordem de Serviço' : 'Editar OS'}</h1>
              <p className="text-sm md:text-base text-slate-500 mt-1">Registre a manutenção e anexe laudos técnicos.</p>
            </div>
            <button onClick={voltarParaLista} className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 md:px-5 py-2.5 text-sm text-blue-800 font-bold bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-xl transition-colors"><ArrowLeft size={18} /> Voltar</button>
          </div>

          <form onSubmit={handleSalvar} className="space-y-4 md:space-y-6">
            <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4 md:space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div><label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Equipamento</label><select required value={formData.equipamento_id} onChange={e => setFormData({...formData, equipamento_id: e.target.value})} className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="">Selecione o equipamento...</option>{auxiliares.equipamentos.map(eq => <option key={eq.id} value={eq.id}>{eq.nome} (Pat: {eq.patrimonio})</option>)}</select></div>
                <div><label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Status atual</label><select required value={formData.status_id} onChange={e => setFormData({...formData, status_id: e.target.value})} className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="">Selecione...</option>{auxiliares.status.map(st => <option key={st.id} value={st.id}>{st.nome}</option>)}</select></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 p-4 md:p-5 bg-blue-50/50 border border-blue-100 rounded-xl">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Tipo de Intervenção</label>
                  <select value={formData.tipo_intervencao} onChange={e => setFormData({...formData, tipo_intervencao: e.target.value})} className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="Corretiva">Corretiva</option><option value="Preventiva">Preventiva</option><option value="Calibração">Calibração</option><option value="Qualificação">Qualificação</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Data Prevista (Agendamento)</label>
                  <input type="date" value={formData.data_prevista} onChange={e => setFormData({...formData, data_prevista: e.target.value})} className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  <p className="text-[10px] md:text-xs text-slate-500 mt-1 md:mt-1.5">Deixe em branco se for apenas um registro corretivo imediato.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div><label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Fornecedor / prestador</label><select value={formData.prestador_id} onChange={e => setFormData({...formData, prestador_id: e.target.value})} className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="">Interno (Equipe IOFV)</option>{auxiliares.prestadores.map(pr => <option key={pr.id} value={pr.id}>{pr.nome}</option>)}</select></div>
                <div><label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Protocolo externo (OS)</label><input value={formData.protocolo_externo} onChange={e => setFormData({...formData, protocolo_externo: e.target.value})} placeholder="Nº da OS do prestador" className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div>
              </div>

              <div><label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5 md:mb-2">Descrição da Manutenção</label><textarea required rows="4" value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none" placeholder="Descreva o problema relatado ou os procedimentos realizados..."></textarea></div>

              <div className="bg-slate-50 border border-slate-200 p-4 md:p-5 rounded-xl">
                <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Paperclip size={16} className="text-slate-400" /> Anexos (Fotos ou PDF do Laudo/OS)</label>
                <input type="file" multiple accept="image/*,application/pdf" onChange={handleUploadAnexos} disabled={loading} className="block w-full text-xs md:text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
                {formData.anexos && formData.anexos.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mt-4">
                    {formData.anexos.map((anexo, index) => (
                      <div key={index} className="relative group rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white h-20 md:h-24 flex items-center justify-center">
                        {isPDF(anexo) ? (<div className="flex flex-col items-center p-2"><FileText size={24} className="text-red-500 mb-1" /><span className="text-[9px] font-bold text-slate-500">PDF</span></div>) : (<img src={anexo} alt={`Anexo ${index}`} className="w-full h-full object-cover" />)}
                        <button type="button" onClick={() => removerAnexo(anexo)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-80 hover:opacity-100 transition-opacity" title="Remover anexo"><X size={10} /></button>
                      </div>
                    ))}
                  </div>
                )}
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