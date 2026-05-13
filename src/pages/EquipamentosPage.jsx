import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  Plus, Search, ArrowLeft, Image as ImageIcon, 
  CheckCircle2, AlertCircle, X, Edit, FileText, Wrench, Calendar, Clock, User, Trash2, Upload, Copy
} from 'lucide-react'

export default function EquipamentosPage() {
  const navigate = useNavigate()
  
  const [view, setView] = useState('lista')
  const [equipamentos, setEquipamentos] = useState([])
  const [equipSelecionado, setEquipSelecionado] = useState(null)
  const [busca, setBusca] = useState('')
  const [filtroUnidade, setFiltroUnidade] = useState('')
  const [loading, setLoading] = useState(true)

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  const [auxiliares, setAuxiliares] = useState({
    fabricantes: [], prestadores: [], unidades: [], setores: [], status: []
  })

  const [historicoManutencoes, setHistoricoManutencoes] = useState([])
  const [osDetalheSelecionada, setOsDetalheSelecionada] = useState(null)

  // ESTADOS PARA O UPLOAD DA IMAGEM
  const [arquivoImagem, setArquivoImagem] = useState(null)
  const [previewImagem, setPreviewImagem] = useState(null)

  // NOVO: Adicionados campos booleanos e de data
  const estadoInicialForm = {
    id: null, nome: '', numero_serie: '', patrimonio: '', modelo: '',
    fabricante_id: '', prestador_id: '', unidade_id: '', setor_id: '', 
    status_id: '', observacoes: '', imagem_url: '',
    possui_etiqueta: false, possui_manual: false, sem_numero_serie: false,
    sem_patrimonio: false, data_ultima_calibracao: '', data_proxima_calibracao: ''
  }
  const [formData, setFormData] = useState(estadoInicialForm)

  useEffect(() => {
    buscarEquipamentos()
    carregarAuxiliares()
  }, [])

  const carregarAuxiliares = async () => {
    const [fab, pres, uni, set, sta] = await Promise.all([
      supabase.from('fabricantes').select('*').order('nome'),
      supabase.from('prestadores').select('*').order('nome'),
      supabase.from('unidades').select('*').order('nome'),
      supabase.from('setores').select('*').order('nome'),
      supabase.from('status_equipamento').select('*').order('nome')
    ])
    setAuxiliares({
      fabricantes: fab.data || [], prestadores: pres.data || [],
      unidades: uni.data || [], setores: set.data || [], status: sta.data || []
    })
  }

  const buscarEquipamentos = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('equipamentos')
      .select(`
        *,
        fabricante:fabricante_id(nome), prestador:prestador_id(nome),
        unidade:unidade_id(nome), setor:setor_id(nome), status:status_id(nome)
      `)
      .order('nome')

    if (!error) setEquipamentos(data)
    setLoading(false)
  }

  const abrirDetalhes = async (eq) => {
    setEquipSelecionado(eq)
    setView('detalhes')
    setHistoricoManutencoes([])

    const { data } = await supabase
      .from('chamados')
      .select(`
        id, tipo_intervencao, data_abertura, data_prevista, data_conclusao, descricao, protocolo_externo,
        status:status_id(nome),
        prestador:prestador_id(nome),
        aberto_por:aberto_por_id(nome)
      `)
      .eq('equipamento_id', eq.id)
      .order('data_abertura', { ascending: false })

    if (data) setHistoricoManutencoes(data)
  }

  const handleSelecionarArquivo = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setArquivoImagem(file)
      setPreviewImagem(URL.createObjectURL(file))
    }
  }

  // --- FUNÇÃO SALVAR COM AUTOMAÇÃO DE AGENDA ---
  const handleSalvar = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      let urlImagemFinal = formData.imagem_url

      if (arquivoImagem) {
        mostrarToast('Fazendo upload da imagem...', 'success')
        const extensao = arquivoImagem.name.split('.').pop()
        const nomeArquivo = `${Date.now()}-${Math.random().toString(36).substring(2)}.${extensao}`

        const { error: uploadError } = await supabase.storage
          .from('equipamentos')
          .upload(nomeArquivo, arquivoImagem)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('equipamentos')
          .getPublicUrl(nomeArquivo)

        urlImagemFinal = publicUrlData.publicUrl
      }

      // Prepara os dados pro banco (Trata datas vazias para evitar erro no banco)
      const payload = { ...formData, imagem_url: urlImagemFinal }
      if (view === 'novo') delete payload.id
      if (!payload.data_ultima_calibracao) payload.data_ultima_calibracao = null
      if (!payload.data_proxima_calibracao) payload.data_proxima_calibracao = null

      let equipamentoId = formData.id;

      // 1. Salva ou Atualiza o Equipamento
      if (view === 'novo') {
        const { data: novoEq, error: dbError } = await supabase.from('equipamentos').insert([payload]).select().single()
        if (dbError) throw dbError
        equipamentoId = novoEq.id // Pega o ID que acabou de ser criado
      } else {
        const { error: dbError } = await supabase.from('equipamentos').update(payload).eq('id', formData.id)
        if (dbError) throw dbError
      }

      // 2. AUTOMAÇÃO: Dispara a OS para a Agenda se houver Próxima Calibração
      if (payload.data_proxima_calibracao) {
        // Verifica se já não criamos isso antes para não duplicar OS sem querer
        const { data: chamadoExistente } = await supabase
          .from('chamados')
          .select('id')
          .eq('equipamento_id', equipamentoId)
          .eq('tipo_intervencao', 'Calibração')
          .eq('data_prevista', payload.data_proxima_calibracao)
          .maybeSingle()

        if (!chamadoExistente) {
          // Busca os IDs dinâmicos de Status(Aberto) e Usuário Atual para vincular certinho
          const { data: statusAberto } = await supabase.from('status_chamado').select('id').ilike('nome', '%Aberto%').limit(1).maybeSingle();
          const { data: authData } = await supabase.auth.getUser()
          
          let perfilId = null;
          if (authData?.user?.id) {
             const { data: perfilData } = await supabase.from('perfis').select('id').eq('user_id', authData.user.id).maybeSingle()
             if (perfilData) perfilId = perfilData.id;
          }

          // Cria a OS no banco!
          await supabase.from('chamados').insert([{
            equipamento_id: equipamentoId,
            tipo_intervencao: 'Calibração',
            data_prevista: payload.data_proxima_calibracao,
            descricao: `Calibração preventiva programada automaticamente a partir do cadastro do equipamento. \nModelo: ${payload.modelo} \nSérie: ${payload.numero_serie}`,
            status_id: statusAberto ? statusAberto.id : null,
            aberto_por_id: perfilId
          }]);
        }
      }
      
      mostrarToast(view === 'novo' ? 'Equipamento cadastrado com sucesso!' : 'Equipamento atualizado!')
      resetarFormulario()
      buscarEquipamentos()

    } catch (error) {
      mostrarToast('Erro ao salvar: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleExcluir = async (id) => {
    if (window.confirm('CUIDADO: Tem certeza que deseja excluir este equipamento? Se ele possuir um histórico de Ordens de Serviço, o sistema bloqueará a exclusão para evitar perda de dados médicos.')) {
      setLoading(true)
      const { error } = await supabase.from('equipamentos').delete().eq('id', id)
      
      if (error) {
        mostrarToast('Erro ao excluir. O equipamento provavelmente tem OS vinculadas.', 'error')
      } else {
        mostrarToast('Equipamento excluído com sucesso!', 'success')
        setView('lista')
        buscarEquipamentos()
      }
      setLoading(false)
    }
  }

  const iniciarEdicao = (eq) => {
    setFormData({
      id: eq.id, nome: eq.nome || '', numero_serie: eq.numero_serie || '', 
      patrimonio: eq.patrimonio || '', modelo: eq.modelo || '',
      fabricante_id: eq.fabricante_id || '', prestador_id: eq.prestador_id || '', 
      unidade_id: eq.unidade_id || '', setor_id: eq.setor_id || '', 
      status_id: eq.status_id || '', observacoes: eq.observacoes || '',
      imagem_url: eq.imagem_url || '',
      possui_etiqueta: eq.possui_etiqueta || false,
      possui_manual: eq.possui_manual || false,
      sem_numero_serie: eq.sem_numero_serie || false,
      sem_patrimonio: eq.sem_patrimonio || false,
      data_ultima_calibracao: eq.data_ultima_calibracao ? eq.data_ultima_calibracao.split('T')[0] : '',
      data_proxima_calibracao: eq.data_proxima_calibracao ? eq.data_proxima_calibracao.split('T')[0] : ''
    })
    setArquivoImagem(null)
    setPreviewImagem(eq.imagem_url || null)
    setView('editar')
  }

  // --- NOVA FUNÇÃO: DUPLICAR EQUIPAMENTO ---
  const duplicarEquipamento = (eq) => {
    setFormData({
      ...estadoInicialForm, // Reseta tudo
      nome: eq.nome || '',
      modelo: eq.modelo || '',
      fabricante_id: eq.fabricante_id || '',
      prestador_id: eq.prestador_id || '',
      unidade_id: eq.unidade_id || '',
      setor_id: eq.setor_id || '',
      status_id: eq.status_id || '',
      observacoes: eq.observacoes || '',
      possui_etiqueta: eq.possui_etiqueta || false,
      possui_manual: eq.possui_manual || false,
      // Propósito: Deixar Patrimônio, Nº Série e Datas em branco para o novo
    })
    setArquivoImagem(null)
    setPreviewImagem(null)
    setView('novo')
    mostrarToast('Equipamento clonado! Altere o Patrimônio e N/S para salvar.', 'success')
  }

  const resetarFormulario = () => {
    setView('lista')
    setFormData(estadoInicialForm)
    setArquivoImagem(null)
    setPreviewImagem(null)
  }

  const mostrarToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000)
  }

  const equipamentosFiltrados = equipamentos.filter(eq => {
    const atendeBusca = eq.nome?.toLowerCase().includes(busca.toLowerCase()) || 
                        eq.patrimonio?.includes(busca) ||
                        eq.numero_serie?.includes(busca);
    const atendeUnidade = filtroUnidade === '' || eq.unidade_id === filtroUnidade;
    return atendeBusca && atendeUnidade;
  })

  return (
    <div className="relative min-h-full font-sans pb-10">
      
      {toast.show && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-right fade-in duration-300">
          <div className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border ${
            toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'
          }`}>
            {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <span className="font-bold text-sm">{toast.message}</span>
            <button onClick={() => setToast({...toast, show: false})} className="ml-2 opacity-50 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* TELA DE LISTA */}
      {view === 'lista' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Equipamentos</h1>
              <p className="text-slate-500 mt-1">Lista de equipamentos cadastrados.</p>
            </div>
            <button 
              onClick={() => { resetarFormulario(); setView('novo') }}
              className="bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              <Plus size={20} /> Novo equipamento
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Buscar por nome, número de série ou patrimônio"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
              />
            </div>
            <select 
              value={filtroUnidade} 
              onChange={(e) => setFiltroUnidade(e.target.value)}
              className="md:w-64 px-4 py-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              <option value="">Todas as unidades</option>
              {auxiliares.unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {loading ? (
              <div className="text-center py-10 text-slate-500 font-medium">Carregando inventário...</div>
            ) : equipamentosFiltrados.length === 0 ? (
              <div className="text-center py-10 text-slate-500 font-medium bg-white rounded-2xl border border-slate-100">Nenhum equipamento encontrado.</div>
            ) : equipamentosFiltrados.map((eq) => (
              <div key={eq.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-6">
                
                <div className="w-full md:w-48 h-40 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 shrink-0 overflow-hidden relative">
                  {eq.imagem_url ? (
                    <img src={eq.imagem_url} alt={eq.nome} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={40} className="text-slate-300" />
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">{eq.nome}</h3>
                      
                      {/* BADGES PARA VISUALIZAÇÃO RÁPIDA */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {eq.possui_etiqueta ? (
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-100 uppercase">🏷️ Etiquetado</span>
                      ) : (
                        <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold border border-red-100 uppercase">⚠️ Sem Etiqueta</span>
                      )}
                      
                      {eq.possui_manual && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-100 uppercase">📖 Manual</span>}
                      {eq.sem_numero_serie && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200 uppercase">Sem N/S</span>}
                    </div>

                    </div>
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold border border-blue-100 whitespace-nowrap">
                      {eq.status?.nome || 'Sem Status'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8 text-sm mt-2">
                    <div className="flex justify-between md:justify-start md:gap-2"><span className="font-semibold text-slate-500">Série:</span><span className="font-medium text-slate-800">{eq.numero_serie || '-'}</span></div>
                    <div className="flex justify-between md:justify-start md:gap-2"><span className="font-semibold text-slate-500">Patrimônio:</span><span className="font-medium text-slate-800">{eq.patrimonio || '-'}</span></div>
                    <div className="flex justify-between md:justify-start md:gap-2"><span className="font-semibold text-slate-500">Modelo:</span><span className="font-medium text-slate-800">{eq.modelo || '-'}</span></div>
                    <div className="flex justify-between md:justify-start md:gap-2"><span className="font-semibold text-slate-500">Unidade:</span><span className="font-medium text-slate-800">{eq.unidade?.nome || '-'}</span></div>
                  </div>

                  <div className="flex justify-end flex-wrap gap-3 mt-6 pt-4 border-t border-slate-100">
                    <button onClick={() => duplicarEquipamento(eq)} className="px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl transition-colors flex items-center gap-2 mr-auto">
                      <Copy size={16} /> Duplicar
                    </button>
                    <button onClick={() => abrirDetalhes(eq)} className="px-5 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors">
                      Ver detalhes
                    </button>
                    <button onClick={() => iniciarEdicao(eq)} className="px-5 py-2 text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl transition-colors flex items-center gap-2">
                      <Edit size={16} /> Editar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TELA DE DETALHES */}
      {view === 'detalhes' && equipSelecionado && (
        <div className="max-w-5xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
          
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">{equipSelecionado.nome}</h1>
              <p className="text-slate-500 mt-1">Detalhes completos do equipamento.</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setView('lista')} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2 shadow-sm">
                <ArrowLeft size={16} /> Voltar
              </button>
              <button onClick={() => iniciarEdicao(equipSelecionado)} className="px-5 py-2.5 text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl transition-colors flex items-center gap-2 shadow-sm">
                <Edit size={16} /> Editar
              </button>
              <button onClick={() => navigate('/chamados', { state: { action: 'novo', equipamentoId: equipSelecionado.id } })} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-800 hover:bg-blue-900 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2">
                <Wrench size={16} /> Registrar manutenção
              </button>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <FileText className="text-blue-600" size={20} /> Dados principais
            </h3>

            <div className="flex flex-col md:flex-row gap-8 mb-6">
              <div className="w-full md:w-64 flex flex-col gap-4">
                <div className="w-full h-52 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden shadow-sm">
                  {equipSelecionado.imagem_url ? (
                    <img src={equipSelecionado.imagem_url} alt="Equipamento" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-slate-400">
                      <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
                      <span className="text-xs font-medium">Sem imagem</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {equipSelecionado.possui_etiqueta && <span className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-indigo-100 flex items-center gap-2 justify-center"><CheckCircle2 size={14}/> Possui Etiqueta</span>}
                  {equipSelecionado.possui_manual && <span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-100 flex items-center gap-2 justify-center"><CheckCircle2 size={14}/> Possui Manual</span>}
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-10 text-sm">
                <div className="flex flex-col border-b border-slate-50 pb-2"><span className="text-slate-500 font-semibold mb-1">Número de série</span><span className="font-medium text-slate-800">{equipSelecionado.numero_serie || '-'}</span></div>
                <div className="flex flex-col border-b border-slate-50 pb-2"><span className="text-slate-500 font-semibold mb-1">Patrimônio</span><span className="font-medium text-slate-800">{equipSelecionado.patrimonio || '-'}</span></div>
                <div className="flex flex-col border-b border-slate-50 pb-2"><span className="text-slate-500 font-semibold mb-1">Modelo</span><span className="font-medium text-slate-800">{equipSelecionado.modelo || '-'}</span></div>
                <div className="flex flex-col border-b border-slate-50 pb-2"><span className="text-slate-500 font-semibold mb-1">Fabricante</span><span className="font-medium text-slate-800">{equipSelecionado.fabricante?.nome || '-'}</span></div>
                <div className="flex flex-col border-b border-slate-50 pb-2"><span className="text-slate-500 font-semibold mb-1">Prestador</span><span className="font-medium text-slate-800">{equipSelecionado.prestador?.nome || '-'}</span></div>
                <div className="flex flex-col border-b border-slate-50 pb-2"><span className="text-slate-500 font-semibold mb-1">Unidade / Setor</span><span className="font-medium text-slate-800">{equipSelecionado.unidade?.nome || '-'} / {equipSelecionado.setor?.nome || '-'}</span></div>
              </div>
            </div>

            {/* PAINEL DE DATAS DE CALIBRAÇÃO */}
            {(equipSelecionado.data_ultima_calibracao || equipSelecionado.data_proxima_calibracao) && (
              <div className="mb-6 p-5 bg-orange-50 border border-orange-100 rounded-xl flex flex-col md:flex-row gap-8">
                {equipSelecionado.data_ultima_calibracao && (
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-200 p-2 rounded-lg text-orange-700"><Calendar size={20}/></div>
                    <div>
                      <span className="text-xs font-bold text-orange-600 uppercase block">Última Calibração</span>
                      <span className="font-bold text-slate-800">{new Date(equipSelecionado.data_ultima_calibracao).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                    </div>
                  </div>
                )}
                {equipSelecionado.data_proxima_calibracao && (
                  <div className="flex items-center gap-3">
                    <div className="bg-red-200 p-2 rounded-lg text-red-700"><Clock size={20}/></div>
                    <div>
                      <span className="text-xs font-bold text-red-600 uppercase block">Próxima Calibração Prevista</span>
                      <span className="font-bold text-slate-800">{new Date(equipSelecionado.data_proxima_calibracao).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <span className="text-slate-500 font-semibold block mb-3">Observações adicionais:</span>
              <p className="text-slate-700 bg-slate-50 p-5 rounded-xl border border-slate-100 min-h-[80px]">
                {equipSelecionado.observacoes || 'Nenhuma observação registrada para este equipamento.'}
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Calendar className="text-blue-600" size={20} /> Histórico de manutenções
            </h3>
            
            {historicoManutencoes.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                <div className="w-12 h-12 bg-white rounded-full border border-slate-200 flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <Wrench className="text-slate-400" size={20} />
                </div>
                <h4 className="text-slate-700 font-bold mb-1">Nenhuma manutenção encontrada</h4>
                <p className="text-sm text-slate-500 max-w-md mx-auto">O histórico de chamados e intervenções técnicas deste equipamento será listado aqui automaticamente.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {historicoManutencoes.map(manutencao => (
                  <div 
                    key={manutencao.id} 
                    onClick={() => setOsDetalheSelecionada(manutencao)}
                    className="flex flex-col md:flex-row gap-5 p-5 border border-slate-200 rounded-xl bg-slate-50 hover:bg-blue-50 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap justify-between items-start gap-4 mb-3">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                            manutencao.tipo_intervencao === 'Preventiva' ? 'bg-green-100 text-green-800 border-green-200' :
                            manutencao.tipo_intervencao === 'Calibração' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            'bg-red-100 text-red-800 border-red-200'
                          }`}>
                            {manutencao.tipo_intervencao || 'Corretiva'}
                          </span>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                            manutencao.status?.nome === 'Concluído' ? 'bg-green-50 text-green-700 border-green-200' :
                            manutencao.status?.nome === 'Aberto' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {manutencao.status?.nome}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200 group-hover:border-blue-200">
                          <Clock size={14} className="text-blue-500"/> 
                          {manutencao.data_prevista 
                            ? `Previsto: ${new Date(manutencao.data_prevista).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}` 
                            : new Date(manutencao.data_abertura).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      
                      <p className="text-sm text-slate-700 mb-4 whitespace-pre-wrap line-clamp-2">{manutencao.descricao}</p>
                      
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500 font-medium pt-3 border-t border-slate-200/60 group-hover:border-blue-200/60">
                        <span className="flex items-center gap-1"><User size={12}/> {manutencao.aberto_por?.nome || '-'}</span>
                        <span className="flex items-center gap-1"><Wrench size={12}/> {manutencao.prestador?.nome || 'Manutenção Interna'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE DETALHE DA OS */}
      {osDetalheSelecionada && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 animate-in zoom-in duration-200 relative border border-slate-200">
            <button onClick={() => setOsDetalheSelecionada(null)} className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
               <span className={`px-3 py-1.5 rounded-md text-sm font-bold border ${
                osDetalheSelecionada.tipo_intervencao === 'Preventiva' ? 'bg-green-100 text-green-800 border-green-200' :
                osDetalheSelecionada.tipo_intervencao === 'Calibração' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                'bg-red-100 text-red-800 border-red-200'
              }`}>
                {osDetalheSelecionada.tipo_intervencao || 'Corretiva'}
              </span>
              <span className={`text-sm font-bold px-3 py-1.5 rounded-md border ${
                osDetalheSelecionada.status?.nome === 'Concluído' ? 'bg-green-50 text-green-700 border-green-200' :
                'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {osDetalheSelecionada.status?.nome}
              </span>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-6">Ficha da Manutenção</h2>

            <div className="grid grid-cols-2 gap-y-5 gap-x-8 text-sm mb-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <div className="flex flex-col"><span className="font-semibold text-slate-500">Agendado/Aberto em</span><span className="font-bold text-slate-800">{osDetalheSelecionada.data_prevista ? new Date(osDetalheSelecionada.data_prevista).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : new Date(osDetalheSelecionada.data_abertura).toLocaleString('pt-BR')}</span></div>
              <div className="flex flex-col"><span className="font-semibold text-slate-500">Concluído em</span><span className="font-bold text-slate-800">{osDetalheSelecionada.data_conclusao ? new Date(osDetalheSelecionada.data_conclusao).toLocaleString('pt-BR') : 'Em andamento'}</span></div>
              <div className="flex flex-col"><span className="font-semibold text-slate-500">Responsável Interno</span><span className="font-bold text-slate-800">{osDetalheSelecionada.aberto_por?.nome || '-'}</span></div>
              <div className="flex flex-col"><span className="font-semibold text-slate-500">Empresa / Prestador</span><span className="font-bold text-slate-800">{osDetalheSelecionada.prestador?.nome || '-'}</span></div>
            </div>

            <div className="mb-2">
              <h4 className="font-bold text-slate-800 mb-2">Relato Técnico / Descrição</h4>
              <p className="text-slate-600 text-sm whitespace-pre-wrap bg-white border border-slate-200 p-5 rounded-xl min-h-[100px]">
                {osDetalheSelecionada.descricao || 'Nenhum relato técnico registrado nesta OS.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FORMULÁRIO DE CADASTRO / EDIÇÃO */}
      {(view === 'novo' || view === 'editar') && (
        <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                {view === 'novo' ? 'Novo equipamento' : 'Editar equipamento'}
              </h1>
            </div>
            <button 
              onClick={resetarFormulario}
              className="flex items-center gap-2 px-5 py-2.5 text-blue-800 font-bold bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-xl transition-colors"
            >
              <ArrowLeft size={18} /> Voltar
            </button>
          </div>

          <form onSubmit={handleSalvar} className="space-y-6">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              
              <div className="flex flex-col md:flex-row gap-6 items-center p-5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="w-32 h-32 bg-white rounded-xl flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden shadow-sm relative group">
                  {previewImagem ? (
                    <img src={previewImagem} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={32} className="text-slate-300" />
                  )}
                  {previewImagem && (
                    <div onClick={() => {setArquivoImagem(null); setPreviewImagem(null); setFormData({...formData, imagem_url: ''})}} className="absolute inset-0 bg-red-500/80 hidden group-hover:flex items-center justify-center text-white cursor-pointer transition-all">
                      <Trash2 size={24} />
                    </div>
                  )}
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Foto do Equipamento</label>
                  <label className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-blue-300 rounded-xl hover:bg-blue-50 hover:border-blue-400 transition-colors cursor-pointer group">
                    <div className="flex flex-col items-center gap-2 text-blue-600">
                      <Upload size={24} className="group-hover:-translate-y-1 transition-transform" />
                      <span className="font-bold text-sm">Clique para escolher o arquivo</span>
                      <span className="text-xs text-slate-500 font-medium">PNG, JPG ou JPEG (Máx. 5MB)</span>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleSelecionarArquivo} />
                  </label>
                </div>
              </div>

              {/* CHECKBOXES RÁPIDOS */}
              <div className="flex flex-wrap gap-8 p-5 bg-slate-50 border border-slate-200 rounded-xl">
                 <label className="flex items-center gap-3 cursor-pointer font-bold text-slate-700 select-none">
                   <input type="checkbox" checked={formData.possui_etiqueta} onChange={e => setFormData({...formData, possui_etiqueta: e.target.checked})} className="w-5 h-5 text-blue-600 rounded" />
                   🏷️ Possui Etiqueta de Manutenção
                 </label>
                 <label className="flex items-center gap-3 cursor-pointer font-bold text-slate-700 select-none">
                   <input type="checkbox" checked={formData.possui_manual} onChange={e => setFormData({...formData, possui_manual: e.target.checked})} className="w-5 h-5 text-blue-600 rounded" />
                   📖 Possui Manual Físico
                 </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="block text-sm font-bold text-slate-700 mb-2">Nome do equipamento</label><input required value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-slate-700">Número de série</label>
                    <label className="flex items-center gap-1 text-xs cursor-pointer font-bold text-slate-500 hover:text-slate-800 bg-slate-100 px-2 py-1 rounded">
                        <input type="checkbox" checked={formData.sem_numero_serie} onChange={e => setFormData({...formData, sem_numero_serie: e.target.checked, numero_serie: e.target.checked ? 'N/A' : ''})} />
                        Sem Nº Série
                    </label>
                  </div>
                  <input required disabled={formData.sem_numero_serie} value={formData.numero_serie} onChange={e => setFormData({...formData, numero_serie: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed" />
                </div>

                <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-slate-700">Patrimônio</label>
                  <label className="flex items-center gap-1 text-xs cursor-pointer font-bold text-red-500 hover:text-red-700 bg-red-50 px-2 py-1 rounded border border-red-100">
                      <input 
                        type="checkbox" 
                        checked={formData.sem_patrimonio} 
                        onChange={e => setFormData({...formData, sem_patrimonio: e.target.checked, patrimonio: e.target.checked ? 'PENDENTE' : ''})} 
                      />
                      Falta Patrimônio
                  </label>
                </div>
                <input 
                  required={!formData.sem_patrimonio}
                  disabled={formData.sem_patrimonio} 
                  value={formData.patrimonio} 
                  onChange={e => setFormData({...formData, patrimonio: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:bg-red-50/30 disabled:text-red-600 disabled:font-bold" 
                />
              </div>
              
                <div><label className="block text-sm font-bold text-slate-700 mb-2">Modelo</label><input value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div>
                <div><label className="block text-sm font-bold text-slate-700 mb-2">Fabricante</label><select value={formData.fabricante_id} onChange={e => setFormData({...formData, fabricante_id: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="">Selecione...</option>{auxiliares.fabricantes.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}</select></div>
                <div><label className="block text-sm font-bold text-slate-700 mb-2">Prestador</label><select value={formData.prestador_id} onChange={e => setFormData({...formData, prestador_id: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="">Selecione...</option>{auxiliares.prestadores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-100 pt-6">
                <div><label className="block text-sm font-bold text-slate-700 mb-2">Unidade</label><select required value={formData.unidade_id} onChange={e => setFormData({...formData, unidade_id: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="">Selecione...</option>{auxiliares.unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></div>
                <div><label className="block text-sm font-bold text-slate-700 mb-2">Setor</label><select required value={formData.setor_id} onChange={e => setFormData({...formData, setor_id: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="">Selecione...</option>{auxiliares.setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></div>
                <div><label className="block text-sm font-bold text-slate-700 mb-2">Status</label><select required value={formData.status_id} onChange={e => setFormData({...formData, status_id: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="">Selecione...</option>{auxiliares.status.map(st => <option key={st.id} value={st.id}>{st.nome}</option>)}</select></div>
              </div>

              {/* CONTROLE DE CALIBRAÇÃO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-orange-50 border border-orange-100 rounded-xl">
                 <div>
                   <label className="block text-sm font-bold text-slate-800 mb-2">Data da Última Calibração/Preventiva</label>
                   <input type="date" value={formData.data_ultima_calibracao} onChange={e => setFormData({...formData, data_ultima_calibracao: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500 bg-white text-slate-700 font-medium" />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-slate-800 mb-2 flex items-center justify-between">
                     Próxima Data Prevista
                     <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider animate-pulse shadow-sm">Gera OS Automática na Agenda</span>
                   </label>
                   <input type="date" value={formData.data_proxima_calibracao} onChange={e => setFormData({...formData, data_proxima_calibracao: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 bg-white text-slate-700 font-bold" />
                 </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Observações Adicionais</label>
                <textarea rows="4" value={formData.observacoes} onChange={e => setFormData({...formData, observacoes: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none" placeholder="Qualquer outra informação relevante que não se enquadre nos campos acima..."></textarea>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70 text-lg">
              {loading ? 'Processando e salvando na Agenda...' : 'Salvar equipamento'}
            </button>

          </form>
        </div>
      )}
    </div>
  )
}