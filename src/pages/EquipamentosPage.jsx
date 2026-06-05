import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useModulo } from '../contexts/ModuloContext'
import { 
  Plus, Search, ArrowLeft, Image as ImageIcon, 
  CheckCircle2, AlertCircle, X, Edit, FileText, Wrench, Calendar, Clock, User, Trash2, Upload, Copy,
  Images, AlertTriangle, Filter, Factory
} from 'lucide-react'
import toast from 'react-hot-toast'
import ModalConfirmacao from '../components/ModalConfirmacao'

export default function EquipamentosPage() {
  const navigate = useNavigate()
  const location = useLocation() 
  
  // 1. PUXANDO O MÓDULO ATUAL DO CONTEXTO
  const { moduloAtivo } = useModulo()
  
  const [view, setView] = useState('lista')
  const [scrollPosition, setScrollPosition] = useState(0) 
  const [equipamentos, setEquipamentos] = useState([])
  const [equipSelecionado, setEquipSelecionado] = useState(null)
  
  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroUnidade, setFiltroUnidade] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('') 
  const [filtroStatus, setFiltroStatus] = useState('') 
  const [filtroPrestador, setFiltroPrestador] = useState('') 
  const [filtroFabricante, setFiltroFabricante] = useState('') 
  const [filtroRapido, setFiltroRapido] = useState('Todos') 
  
  const [loading, setLoading] = useState(true)

  const [modalConfirm, setModalConfirm] = useState({
    isOpen: false,
    titulo: '',
    mensagem: '',
    textoConfirmar: 'Confirmar',
    onConfirm: () => {}
  });

  const [auxiliares, setAuxiliares] = useState({
    fabricantes: [], prestadores: [], unidades: [], setores: [], status: []
  })

  const [historicoManutencoes, setHistoricoManutencoes] = useState([])
  const [osDetalheSelecionada, setOsDetalheSelecionada] = useState(null)

  const [arquivoImagem, setArquivoImagem] = useState(null)
  const [previewImagem, setPreviewImagem] = useState(null)

  const estadoInicialForm = {
    id: null, nome: '', numero_serie: '', patrimonio: '', modelo: '',
    fabricante_id: '', prestador_id: '', unidade_id: '', setor_id: '', 
    status_id: '', observacoes: '', imagem_url: '',
    data_fabricacao: '', desconhece_fabricacao: false, 
    possui_etiqueta: false, possui_manual: false, sem_numero_serie: false,
    sem_patrimonio: false, data_ultima_calibracao: '', data_proxima_calibracao: '',
    fotos_adicionais: [] 
  }
  const [formData, setFormData] = useState(estadoInicialForm)

  useEffect(() => {
    if (!moduloAtivo) return; // Aguarda o módulo ser carregado

    buscarEquipamentos()
    carregarAuxiliares()

    // FILTRO EM TEMPO REAL: Só escuta atualizações do módulo ativo
    const canalEquipamentos = supabase
      .channel(`lista-viva-eq-${moduloAtivo}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'equipamentos',
        filter: `modulo=eq.${moduloAtivo}` 
      }, () => buscarEquipamentos())
      .subscribe();

    return () => { supabase.removeChannel(canalEquipamentos); };
  }, [moduloAtivo]) // Recarrega se o módulo mudar

  useEffect(() => {
    if (equipamentos.length > 0 && location.state?.openDetailsId) {
      const eqTarget = equipamentos.find(e => e.id === location.state.openDetailsId);
      if (eqTarget) abrirDetalhes(eqTarget);
      window.history.replaceState({}, document.title);
    }
  }, [equipamentos, location.state]);

  const carregarAuxiliares = async () => {
    // AQUI ESTÁ A CORREÇÃO SÊNIOR: .contains('modulo', [moduloAtivo])
    // Garante que só os itens liberados para este módulo apareçam nos Selects!
    const [fab, pres, uni, set, sta] = await Promise.all([
      supabase.from('fabricantes').select('*').contains('modulo', [moduloAtivo]).order('nome'),
      supabase.from('prestadores').select('*').contains('modulo', [moduloAtivo]).order('nome'),
      supabase.from('unidades').select('*').contains('modulo', [moduloAtivo]).order('nome'),
      supabase.from('setores').select('*').contains('modulo', [moduloAtivo]).order('nome'),
      supabase.from('status_equipamento').select('*').contains('modulo', [moduloAtivo]).order('nome')
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
      .eq('modulo', moduloAtivo) // Puxa só os do ambiente atual
      .order('nome')

    if (!error) setEquipamentos(data)
    setLoading(false)
  }

  const abrirDetalhes = async (eq) => {
    setScrollPosition(window.scrollY);
    setEquipSelecionado(eq)
    setView('detalhes')
    setHistoricoManutencoes([])
    window.scrollTo(0, 0); 

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

  const handleRemoverImagemPrincipal = () => {
    setArquivoImagem(null);
    setPreviewImagem(null);
    setFormData(prev => ({ ...prev, imagem_url: '' }));
  }

  const handleUploadFotosAdicionais = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setLoading(true);
    toast.loading('Enviando fotos para a galeria...', { id: 'upload-fotos' });

    try {
      const novasUrls = [];
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `galeria_${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('equipamentos').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('equipamentos').getPublicUrl(fileName);
        novasUrls.push(publicUrl);
      }

      setFormData(prev => ({ ...prev, fotos_adicionais: [...(prev.fotos_adicionais || []), ...novasUrls] }));
      toast.success(`${files.length} foto(s) adicionada(s) à galeria!`, { id: 'upload-fotos' });
    } catch (error) {
      toast.error('Erro ao enviar as fotos.', { id: 'upload-fotos' });
    } finally {
      setLoading(false);
    }
  };

  const removerFotoAdicional = (urlRemover) => {
    setFormData(prev => ({ ...prev, fotos_adicionais: prev.fotos_adicionais.filter(url => url !== urlRemover) }));
  };

  const handleSalvar = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      let urlImagemFinal = formData.imagem_url

      if (arquivoImagem) {
        toast.loading('Fazendo upload da imagem principal...', { id: 'salvar-eq' });
        const extensao = arquivoImagem.name.split('.').pop()
        const nomeArquivo = `${Date.now()}-${Math.random().toString(36).substring(2)}.${extensao}`

        const { error: uploadError } = await supabase.storage.from('equipamentos').upload(nomeArquivo, arquivoImagem)
        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage.from('equipamentos').getPublicUrl(nomeArquivo)
        urlImagemFinal = publicUrlData.publicUrl
      }

      const payload = { 
        ...formData, 
        modulo: moduloAtivo, // SALVANDO O EQUIPAMENTO NO MÓDULO CORRETO
        imagem_url: urlImagemFinal,
        fabricante_id: formData.fabricante_id === "" ? null : formData.fabricante_id,
        prestador_id: formData.prestador_id === "" ? null : formData.prestador_id,
        unidade_id: formData.unidade_id === "" ? null : formData.unidade_id,
        setor_id: formData.setor_id === "" ? null : formData.setor_id,
        status_id: formData.status_id === "" ? null : formData.status_id,
        data_ultima_calibracao: formData.data_ultima_calibracao === "" ? null : formData.data_ultima_calibracao,
        data_proxima_calibracao: formData.data_proxima_calibracao === "" ? null : formData.data_proxima_calibracao,
        data_fabricacao: formData.desconhece_fabricacao ? null : (formData.data_fabricacao === "" ? null : formData.data_fabricacao)
      }
      
      delete payload.desconhece_fabricacao; 
      
      if (view === 'novo') delete payload.id

      let equipamentoId = formData.id;

      if (view === 'novo') {
        const { data: novoEq, error: dbError } = await supabase.from('equipamentos').insert([payload]).select().single()
        if (dbError) throw dbError
        equipamentoId = novoEq.id
      } else {
        const { error: dbError } = await supabase.from('equipamentos').update(payload).eq('id', formData.id)
        if (dbError) throw dbError
      }

      // =========================================================================
      // LÓGICA INTELIGENTE DE OS AUTOMÁTICA
      // =========================================================================
      const { data: authData } = await supabase.auth.getUser()
      let perfilId = null;
      if (authData?.user?.id) {
         const { data: perfilData } = await supabase.from('perfis').select('id').eq('user_id', authData.user.id).maybeSingle()
         if (perfilData) perfilId = perfilData.id;
      }

      // 1. Tratamento da ÚLTIMA calibração (OS Concluída)
      if (payload.data_ultima_calibracao) {
        const { data: osPassada } = await supabase.from('chamados')
          .select('id')
          .eq('equipamento_id', equipamentoId)
          .ilike('descricao', '%(Lançamento automático)%')
          .maybeSingle();

        if (osPassada) {
          await supabase.from('chamados').update({
            data_abertura: payload.data_ultima_calibracao,
            data_prevista: payload.data_ultima_calibracao,
            data_conclusao: payload.data_ultima_calibracao
          }).eq('id', osPassada.id);
        } else {
          const { data: stConcluido } = await supabase.from('status_chamado').select('id').ilike('nome', '%Concluído%').limit(1).maybeSingle();
          await supabase.from('chamados').insert([{
            equipamento_id: equipamentoId, 
            modulo: moduloAtivo, 
            tipo_intervencao: 'Preventiva', 
            data_abertura: payload.data_ultima_calibracao,
            data_prevista: payload.data_ultima_calibracao, 
            data_conclusao: payload.data_ultima_calibracao,
            descricao: `Registro de Manutenção Preventiva/Calibração realizada anteriormente. (Lançamento automático)`,
            status_id: stConcluido?.id, 
            aberto_por_id: perfilId
          }]);
        }
      }

      // 2. Tratamento da PRÓXIMA calibração (OS Aberta / Agendada)
      if (payload.data_proxima_calibracao) {
        const { data: osFutura } = await supabase.from('chamados')
          .select('id')
          .eq('equipamento_id', equipamentoId)
          .ilike('descricao', '%programada.%')
          .maybeSingle();

        if (osFutura) {
          await supabase.from('chamados').update({
            data_prevista: payload.data_proxima_calibracao
          }).eq('id', osFutura.id);
        } else {
          const { data: stAberto } = await supabase.from('status_chamado').select('id').ilike('nome', '%Aberto%').limit(1).maybeSingle();
          await supabase.from('chamados').insert([{
            equipamento_id: equipamentoId, 
            modulo: moduloAtivo, 
            tipo_intervencao: 'Preventiva', 
            data_abertura: new Date().toISOString(),
            data_prevista: payload.data_proxima_calibracao, 
            descricao: `Manutenção Preventiva / Calibração programada.`,
            status_id: stAberto?.id, 
            aberto_por_id: perfilId
          }]);
        }
      }
      
      toast.success(view === 'novo' ? 'Equipamento cadastrado com sucesso!' : 'Equipamento atualizado!', { id: 'salvar-eq' });
      resetarFormulario()
      buscarEquipamentos() 

    } catch (error) {
      toast.error('Erro ao salvar: ' + error.message, { id: 'salvar-eq' });
    } finally {
      setLoading(false)
    }
  }

  const handleExcluir = (id) => {
    setModalConfirm({
      isOpen: true,
      titulo: 'Excluir Equipamento',
      mensagem: 'CUIDADO: Tem certeza que deseja excluir este equipamento? Se ele possuir um histórico de Ordens de Serviço, o sistema bloqueará a exclusão para evitar perda de dados.',
      textoConfirmar: 'Sim, Excluir',
      onConfirm: async () => {
        setLoading(true)
        const { error } = await supabase.from('equipamentos').delete().eq('id', id)
        
        if (error) {
          toast.error('Erro ao excluir. O equipamento provavelmente tem OS vinculadas.');
        } else {
          toast.success('Equipamento excluído com sucesso!');
          resetarFormulario()
          buscarEquipamentos() 
        }
        setLoading(false)
      }
    });
  }

  const iniciarEdicao = (eq) => {
    if (view === 'lista') setScrollPosition(window.scrollY);
    setFormData({
      id: eq.id, nome: eq.nome || '', numero_serie: eq.numero_serie || '', 
      patrimonio: eq.patrimonio || '', modelo: eq.modelo || '',
      fabricante_id: eq.fabricante_id || '', prestador_id: eq.prestador_id || '', 
      unidade_id: eq.unidade_id || '', setor_id: eq.setor_id || '', 
      status_id: eq.status_id || '', observacoes: eq.observacoes || '',
      imagem_url: eq.imagem_url || '',
      data_fabricacao: eq.data_fabricacao || '', 
      desconhece_fabricacao: eq.data_fabricacao ? false : true,
      possui_etiqueta: eq.possui_etiqueta || false, possui_manual: eq.possui_manual || false,
      sem_numero_serie: eq.sem_numero_serie || false, sem_patrimonio: eq.sem_patrimonio || false,
      data_ultima_calibracao: eq.data_ultima_calibracao ? eq.data_ultima_calibracao.split('T')[0] : '',
      data_proxima_calibracao: eq.data_proxima_calibracao ? eq.data_proxima_calibracao.split('T')[0] : '',
      fotos_adicionais: eq.fotos_adicionais || []
    })
    setArquivoImagem(null)
    setPreviewImagem(eq.imagem_url || null)
    setView('editar')
    window.scrollTo(0, 0);
  }

  const duplicarEquipamento = (eq) => {
    if (view === 'lista') setScrollPosition(window.scrollY);
    setFormData({
      ...estadoInicialForm, 
      nome: eq.nome || '', modelo: eq.modelo || '', fabricante_id: eq.fabricante_id || '',
      prestador_id: eq.prestador_id || '', unidade_id: eq.unidade_id || '', setor_id: eq.setor_id || '',
      status_id: eq.status_id || '', observacoes: eq.observacoes || '',
      data_fabricacao: eq.data_fabricacao || '',
      desconhece_fabricacao: eq.data_fabricacao ? false : true,
      possui_etiqueta: eq.possui_etiqueta || false, possui_manual: eq.possui_manual || false,
    })
    setArquivoImagem(null)
    setPreviewImagem(null)
    setView('novo')
    window.scrollTo(0, 0);
    toast.success('Equipamento clonado! Altere o Patrimônio e N/S para salvar.');
  }

  const resetarFormulario = () => {
    setView('lista')
    setFormData(estadoInicialForm)
    setArquivoImagem(null)
    setPreviewImagem(null)
    
    setTimeout(() => {
      window.scrollTo({ top: scrollPosition, behavior: 'instant' });
    }, 50);
  }

  const chimneysCalibracao = (dataProxima) => {
    if (!dataProxima) return null;
    const dataRef = new Date(dataProxima);
    dataRef.setHours(0,0,0,0);
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    return dataRef < hoje ? 'atrasada' : 'em_dia';
  }

  const equipamentosFiltrados = equipamentos.filter(eq => {
    const term = busca.toLowerCase(); 
    
    const atendeBusca = (eq.nome?.toLowerCase() || '').includes(term) || 
                        (eq.patrimonio?.toLowerCase() || '').includes(term) || 
                        (eq.numero_serie?.toLowerCase() || '').includes(term);
                        
    const atendeUnidade = filtroUnidade === '' || eq.unidade_id === filtroUnidade;
    const atendeSetor = filtroSetor === '' || eq.setor_id === filtroSetor;
    const atendeStatus = filtroStatus === '' || eq.status_id === filtroStatus;
    const atendePrestador = filtroPrestador === '' || eq.prestador_id === filtroPrestador;
    const atendeFabricante = filtroFabricante === '' || eq.fabricante_id === filtroFabricante;
    
    let atendeFiltroRapido = true;
    if (filtroRapido === 'sem_etiqueta') atendeFiltroRapido = !eq.possui_etiqueta;
    if (filtroRapido === 'sem_patrimonio') atendeFiltroRapido = eq.sem_patrimonio;
    if (filtroRapido === 'calib_atrasada') atendeFiltroRapido = chimneysCalibracao(eq.data_proxima_calibracao) === 'atrasada';

    return atendeBusca && atendeUnidade && atendeSetor && atendeStatus && atendePrestador && atendeFabricante && atendeFiltroRapido;
  })

  return (
    <div className="relative min-h-full font-sans pb-10">
      
      <ModalConfirmacao
        isOpen={modalConfirm.isOpen}
        onClose={() => setModalConfirm({ ...modalConfirm, isOpen: false })}
        onConfirm={modalConfirm.onConfirm}
        titulo={modalConfirm.titulo}
        mensagem={modalConfirm.mensagem}
        textoConfirmar={modalConfirm.textoConfirmar}
      />

      {view === 'lista' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Equipamentos</h1>
              <p className="text-slate-500 mt-1">Inventário e acompanhamento do parque tecnológico.</p>
            </div>
            <button onClick={() => { setScrollPosition(window.scrollY); resetarFormulario(); setView('novo'); window.scrollTo(0,0); }} className="bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
              <Plus size={20} /> Novo equipamento
            </button>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input type="text" placeholder="Buscar por nome, N/S ou patrimônio" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
              <select value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-700">
                <option value="">Todas as unidades</option>
                {auxiliares.unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
              
              <select value={filtroSetor} onChange={(e) => setFiltroSetor(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-700">
                <option value="">Todos os setores</option>
                {auxiliares.setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>

              <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-700">
                <option value="">Todos os status</option>
                {auxiliares.status.map(st => <option key={st.id} value={st.id}>{st.nome}</option>)}
              </select>

              <select value={filtroPrestador} onChange={(e) => setFiltroPrestador(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-700">
                <option value="">Todos os prestadores</option>
                {auxiliares.prestadores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>

              <select value={filtroFabricante} onChange={(e) => setFiltroFabricante(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-700">
                <option value="">Todos os fabricantes</option>
                {auxiliares.fabricantes.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-400 mr-2 flex items-center gap-1"><Filter size={14}/> Filtros Rápidos:</span>
              
              <button onClick={() => setFiltroRapido('Todos')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${filtroRapido === 'Todos' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                Todos
              </button>
              <button onClick={() => setFiltroRapido('sem_etiqueta')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${filtroRapido === 'sem_etiqueta' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                ⚠️ Falta Etiqueta
              </button>
              <button onClick={() => setFiltroRapido('sem_patrimonio')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${filtroRapido === 'sem_patrimonio' ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                🚨 Sem Patrimônio
              </button>
              <button onClick={() => setFiltroRapido('calib_atrasada')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${filtroRapido === 'calib_atrasada' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                ⏱️ Prev./Calib. Atrasada
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {loading ? (
              <div className="text-center py-10 text-slate-500 font-medium">Carregando inventário...</div>
            ) : equipamentosFiltrados.length === 0 ? (
              <div className="text-center py-10 text-slate-500 font-medium bg-white rounded-2xl border border-slate-100">Nenhum equipamento encontrado para este ambiente.</div>
            ) : equipamentosFiltrados.map((eq) => {
              
              const statusCalib = chimneysCalibracao(eq.data_proxima_calibracao);
              
              return (
              <div key={eq.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col md:flex-row group">
                
                <div className="w-full md:w-64 h-48 md:h-auto bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100 flex items-center justify-center shrink-0 relative">
                  {eq.imagem_url ? (
                    <img src={eq.imagem_url} alt={eq.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-300">
                      <ImageIcon size={48} className="mb-2" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Sem Imagem</span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="bg-white/90 backdrop-blur text-blue-800 px-3 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase border border-white/50 shadow-sm">
                      {eq.status?.nome || 'Sem Status'}
                    </span>
                  </div>
                </div>

                <div className="flex-1 p-5 md:p-6 flex flex-col justify-center gap-5">
                  <div>
                    <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-tight mb-2">{eq.nome}</h3>
                    <div className="flex flex-wrap gap-2">
                      {eq.sem_patrimonio && <span className="bg-rose-50 text-rose-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-rose-200 uppercase flex items-center gap-1.5"><AlertTriangle size={12}/> Sem Patrimônio</span>}
                      {eq.possui_etiqueta ? (
                        <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-indigo-100 uppercase flex items-center gap-1.5">🏷️ Etiquetado</span>
                      ) : (
                        <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-amber-200 uppercase flex items-center gap-1.5">⚠️ Sem Etiqueta</span>
                      )}
                      {statusCalib === 'atrasada' && <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-red-200 uppercase flex items-center gap-1.5"><Clock size={12}/> Prev./Calib. Atrasada</span>}
                      {statusCalib === 'em_dia' && <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-emerald-200 uppercase flex items-center gap-1.5"><CheckCircle2 size={12}/> Prev./Calib. em Dia</span>}
                    </div>
                  </div>

                  <div className="bg-slate-50/80 rounded-xl p-4 md:p-5 grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 border border-slate-100 shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Série</span>
                      <span className="font-bold text-slate-800 text-sm truncate" title={eq.numero_serie}>{eq.numero_serie || '-'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Patrimônio</span>
                      <span className="font-bold text-slate-800 text-sm truncate" title={eq.patrimonio}>{eq.patrimonio || '-'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Modelo</span>
                      <span className="font-bold text-slate-800 text-sm truncate" title={eq.modelo}>{eq.modelo || '-'}</span>
                    </div>
                    <div className="flex flex-col col-span-2 lg:col-span-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Local / Setor</span>
                      <span className="font-bold text-blue-700 text-sm truncate" title={`${eq.unidade?.nome} ${eq.setor?.nome ? `- ${eq.setor?.nome}` : ''}`}>
                        {eq.unidade?.nome} <span className="text-slate-500 font-medium">{eq.setor?.nome ? `(${eq.setor?.nome})` : ''}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end flex-wrap gap-3 mt-1">
                    <button onClick={() => duplicarEquipamento(eq)} className="px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1.5 mr-auto">
                      <Copy size={14} /> Duplicar
                    </button>
                    <button onClick={() => abrirDetalhes(eq)} className="px-5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-800 rounded-lg transition-colors">
                      Ver detalhes
                    </button>
                    <button onClick={() => iniciarEdicao(eq)} className="px-5 py-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-1.5">
                      <Edit size={14} /> Editar
                    </button>
                    <button onClick={() => handleExcluir(eq.id)} className="px-5 py-2 text-xs font-bold text-red-600 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 rounded-lg transition-colors flex items-center gap-1.5">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      {view === 'detalhes' && equipSelecionado && (
        <div className="max-w-5xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">{equipSelecionado.nome}</h1>
              <p className="text-slate-500 mt-1">Detalhes completos do equipamento.</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button onClick={resetarFormulario} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2 shadow-sm">
                <ArrowLeft size={16} /> Voltar
              </button>
              <button onClick={() => iniciarEdicao(equipSelecionado)} className="px-5 py-2.5 text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl transition-colors flex items-center gap-2 shadow-sm">
                <Edit size={16} /> Editar
              </button>
              <button onClick={() => navigate(`/${moduloAtivo}/chamados`, { state: { action: 'novo', equipamentoId: equipSelecionado.id } })} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-800 hover:bg-blue-900 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2">
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
                  {equipSelecionado.sem_patrimonio && <span className="bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-rose-200 flex items-center gap-2 justify-center"><AlertTriangle size={14}/> Sem Patrimônio</span>}
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-10 text-sm">
                <div className="flex flex-col border-b border-slate-50 pb-2"><span className="text-slate-500 font-semibold mb-1">Número de série</span><span className="font-medium text-slate-800">{equipSelecionado.numero_serie || '-'}</span></div>
                <div className="flex flex-col border-b border-slate-50 pb-2"><span className="text-slate-500 font-semibold mb-1">Patrimônio</span><span className="font-medium text-slate-800">{equipSelecionado.patrimonio || '-'}</span></div>
                <div className="flex flex-col border-b border-slate-50 pb-2"><span className="text-slate-500 font-semibold mb-1">Modelo</span><span className="font-medium text-slate-800">{equipSelecionado.modelo || '-'}</span></div>
                <div className="flex flex-col border-b border-slate-50 pb-2"><span className="text-slate-500 font-semibold mb-1">Fabricante</span><span className="font-medium text-slate-800">{equipSelecionado.fabricante?.nome || '-'}</span></div>
                
                <div className="flex flex-col border-b border-slate-50 pb-2">
                  <span className="text-slate-500 font-semibold mb-1 flex items-center gap-1"><Factory size={14}/> Data de Fabricação</span>
                  <span className="font-medium text-slate-800">
                    {equipSelecionado.data_fabricacao ? new Date(equipSelecionado.data_fabricacao).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'Desconhecida'}
                  </span>
                </div>
                
                <div className="flex flex-col border-b border-slate-50 pb-2"><span className="text-slate-500 font-semibold mb-1">Prestador</span><span className="font-medium text-slate-800">{equipSelecionado.prestador?.nome || '-'}</span></div>
                <div className="flex flex-col border-b border-slate-50 pb-2 md:col-span-2"><span className="text-slate-500 font-semibold mb-1">Unidade / Setor</span><span className="font-medium text-slate-800">{equipSelecionado.unidade?.nome || '-'} / {equipSelecionado.setor?.nome || '-'}</span></div>
              </div>
            </div>

            {(equipSelecionado.data_ultima_calibracao || equipSelecionado.data_proxima_calibracao) && (
              <div className="mb-6 p-5 bg-orange-50 border border-orange-100 rounded-xl flex flex-col md:flex-row gap-8">
                {equipSelecionado.data_ultima_calibracao && (
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-200 p-2 rounded-lg text-orange-700"><Calendar size={20}/></div>
                    <div>
                      <span className="text-xs font-bold text-orange-600 uppercase block">Última Prev./Calib.</span>
                      <span className="font-bold text-slate-800">{new Date(equipSelecionado.data_ultima_calibracao).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                    </div>
                  </div>
                )}
                {equipSelecionado.data_proxima_calibracao && (
                  <div className="flex items-center gap-3">
                    <div className="bg-red-200 p-2 rounded-lg text-red-700"><Clock size={20}/></div>
                    <div>
                      <span className="text-xs font-bold text-red-600 uppercase block">Próxima Prev./Calib. Agendada</span>
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

            {equipSelecionado.fotos_adicionais && equipSelecionado.fotos_adicionais.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Images className="text-blue-600" size={18} /> Galeria de Fotos ({equipSelecionado.fotos_adicionais.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                  {equipSelecionado.fotos_adicionais.map((foto, index) => (
                    <a key={index} href={foto} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md hover:opacity-90 transition-all cursor-zoom-in">
                      <img src={foto} alt={`Foto detalhe ${index + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    </a>
                  ))}
                </div>
              </div>
            )}
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
                  <div key={manutencao.id} onClick={() => setOsDetalheSelecionada(manutencao)} className="flex flex-col md:flex-row gap-5 p-5 border border-slate-200 rounded-xl bg-slate-50 hover:bg-blue-50 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group">
                    <div className="flex-1">
                      <div className="flex flex-wrap justify-between items-start gap-4 mb-3">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                            manutencao.tipo_intervencao === 'Preventiva' ? 'bg-green-100 text-green-800 border-green-200' :
                            manutencao.tipo_intervencao === 'Calibração' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            manutencao.tipo_intervencao === 'Qualificação' ? 'bg-purple-100 text-purple-800 border-purple-200' :
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
                          {manutencao.data_prevista ? `Previsto: ${new Date(manutencao.data_prevista).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}` : new Date(manutencao.data_abertura).toLocaleDateString('pt-BR')}
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

      {osDetalheSelecionada && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 animate-in zoom-in duration-200 relative border border-slate-200">
            <button onClick={() => setOsDetalheSelecionada(null)} className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"><X size={20} /></button>
            <div className="flex items-center gap-3 mb-6">
               <span className={`px-3 py-1.5 rounded-md text-sm font-bold border ${osDetalheSelecionada.tipo_intervencao === 'Preventiva' ? 'bg-green-100 text-green-800 border-green-200' : osDetalheSelecionada.tipo_intervencao === 'Calibração' ? 'bg-blue-100 text-blue-800 border-blue-200' : osDetalheSelecionada.tipo_intervencao === 'Qualificação' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                {osDetalheSelecionada.tipo_intervencao || 'Corretiva'}
              </span>
              <span className={`text-sm font-bold px-3 py-1.5 rounded-md border ${osDetalheSelecionada.status?.nome === 'Concluído' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
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
              <p className="text-slate-600 text-sm whitespace-pre-wrap bg-white border border-slate-200 p-5 rounded-xl min-h-[100px]">{osDetalheSelecionada.descricao || 'Nenhum relato técnico registrado nesta OS.'}</p>
            </div>
          </div>
        </div>
      )}

      {(view === 'novo' || view === 'editar') && (
        <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
          <div className="flex items-center justify-between">
            <div><h1 className="text-3xl font-bold text-slate-800">{view === 'novo' ? 'Novo equipamento' : 'Editar equipamento'}</h1></div>
            <button onClick={resetarFormulario} className="flex items-center gap-2 px-5 py-2.5 text-blue-800 font-bold bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-xl transition-colors"><ArrowLeft size={18} /> Voltar</button>
          </div>

          <form onSubmit={handleSalvar} className="space-y-6">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              
              <div className="flex flex-col md:flex-row gap-6 items-start p-5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="w-32 h-32 bg-white rounded-xl flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden shadow-sm relative group">
                  {previewImagem ? <img src={previewImagem} alt="Preview" className="w-full h-full object-cover" /> : <ImageIcon size={32} className="text-slate-300" />}
                  {previewImagem && <div onClick={handleRemoverImagemPrincipal} className="absolute inset-0 bg-red-500/80 hidden group-hover:flex items-center justify-center text-white cursor-pointer transition-all"><Trash2 size={24} /></div>}
                </div>
                <div className="flex-1 w-full space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Foto de Capa do Equipamento</label>
                    <label className="flex items-center justify-center w-full px-4 py-4 border-2 border-dashed border-blue-300 rounded-xl hover:bg-blue-50 hover:border-blue-400 transition-colors cursor-pointer group">
                      <div className="flex flex-col items-center gap-1 text-blue-600"><Upload size={20} className="group-hover:-translate-y-1 transition-transform" /><span className="font-bold text-sm">Escolher foto principal</span></div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleSelecionarArquivo} />
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Galeria de Fotos Adicionais</label>
                    <input type="file" multiple accept="image/*" onChange={handleUploadFotosAdicionais} disabled={loading} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
                    {formData.fotos_adicionais && formData.fotos_adicionais.length > 0 && (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-3">
                        {formData.fotos_adicionais.map((foto, index) => (
                          <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                            <img src={foto} alt={`Miniatura ${index}`} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => removerFotoAdicional(foto)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-80 hover:opacity-100 transition-opacity" title="Remover foto"><X size={10} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-8 p-5 bg-slate-50 border border-slate-200 rounded-xl">
                 <label className="flex items-center gap-3 cursor-pointer font-bold text-slate-700 select-none"><input type="checkbox" checked={formData.possui_etiqueta} onChange={e => setFormData({...formData, possui_etiqueta: e.target.checked})} className="w-5 h-5 text-blue-600 rounded" />🏷️ Possui Etiqueta de Manutenção</label>
                 <label className="flex items-center gap-3 cursor-pointer font-bold text-slate-700 select-none"><input type="checkbox" checked={formData.possui_manual} onChange={e => setFormData({...formData, possui_manual: e.target.checked})} className="w-5 h-5 text-blue-600 rounded" />📖 Possui Manual Físico</label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="block text-sm font-bold text-slate-700 mb-2">Nome do equipamento</label><input required value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-slate-700">Número de série</label>
                    <label className="flex items-center gap-1 text-xs cursor-pointer font-bold text-slate-500 hover:text-slate-800 bg-slate-100 px-2 py-1 rounded"><input type="checkbox" checked={formData.sem_numero_serie} onChange={e => setFormData({...formData, sem_numero_serie: e.target.checked, numero_serie: e.target.checked ? 'N/A' : ''})} />Sem Nº Série</label>
                  </div>
                  <input required disabled={formData.sem_numero_serie} value={formData.numero_serie} onChange={e => setFormData({...formData, numero_serie: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed" />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-slate-700">Patrimônio</label>
                    <label className="flex items-center gap-1 text-xs cursor-pointer font-bold text-red-500 hover:text-red-700 bg-red-50 px-2 py-1 rounded border border-red-100"><input type="checkbox" checked={formData.sem_patrimonio} onChange={e => setFormData({...formData, sem_patrimonio: e.target.checked, patrimonio: e.target.checked ? 'PENDENTE' : ''})} />Falta Patrimônio</label>
                  </div>
                  <input required={!formData.sem_patrimonio} disabled={formData.sem_patrimonio} value={formData.patrimonio} onChange={e => setFormData({...formData, patrimonio: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:bg-red-50/30 disabled:text-red-600 disabled:font-bold" />
                </div>
                
                <div><label className="block text-sm font-bold text-slate-700 mb-2">Modelo</label><input value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div>
                <div><label className="block text-sm font-bold text-slate-700 mb-2">Fabricante</label><select value={formData.fabricante_id} onChange={e => setFormData({...formData, fabricante_id: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="">Selecione...</option>{auxiliares.fabricantes.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}</select></div>
                <div><label className="block text-sm font-bold text-slate-700 mb-2">Prestador</label><select value={formData.prestador_id} onChange={e => setFormData({...formData, prestador_id: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="">Selecione...</option>{auxiliares.prestadores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
              </div>

              <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-xl">
                 <div className="flex justify-between items-center mb-3">
                   <label className="text-sm font-bold text-indigo-900 flex items-center gap-2"><Factory size={16}/> Data de Fabricação</label>
                   <label className="flex items-center gap-1 text-xs cursor-pointer font-bold text-rose-600 hover:text-rose-800 bg-rose-50 px-2 py-1.5 rounded border border-rose-200 transition-colors">
                     <input type="checkbox" checked={formData.desconhece_fabricacao} onChange={e => setFormData({...formData, desconhece_fabricacao: e.target.checked, data_fabricacao: e.target.checked ? '' : formData.data_fabricacao})} className="w-3.5 h-3.5" />
                     Desconhecida
                   </label>
                 </div>
                 <input type="date" disabled={formData.desconhece_fabricacao} value={formData.data_fabricacao} onChange={e => setFormData({...formData, data_fabricacao: e.target.value})} className="w-full md:w-1/2 px-4 py-3 rounded-xl border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-100 pt-6">
                <div><label className="block text-sm font-bold text-slate-700 mb-2">Unidade</label><select required value={formData.unidade_id} onChange={e => setFormData({...formData, unidade_id: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="">Selecione...</option>{auxiliares.unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></div>
                <div><label className="block text-sm font-bold text-slate-700 mb-2">Setor</label><select required value={formData.setor_id} onChange={e => setFormData({...formData, setor_id: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="">Selecione...</option>{auxiliares.setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></div>
                <div><label className="block text-sm font-bold text-slate-700 mb-2">Status</label><select required value={formData.status_id} onChange={e => setFormData({...formData, status_id: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="">Selecione...</option>{auxiliares.status.map(st => <option key={st.id} value={st.id}>{st.nome}</option>)}</select></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-orange-50 border border-orange-100 rounded-xl">
                 <div>
                   <label className="block text-sm font-bold text-slate-800 mb-2">Data da Última Prev./Calib.</label>
                   <input type="date" value={formData.data_ultima_calibracao} onChange={e => setFormData({...formData, data_ultima_calibracao: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500 bg-white text-slate-700 font-medium" />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-slate-800 mb-2 flex items-center justify-between">Próxima Data Prevista<span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider animate-pulse shadow-sm">Gera OS Automática</span></label>
                   <input type="date" value={formData.data_proxima_calibracao} onChange={e => setFormData({...formData, data_proxima_calibracao: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 bg-white text-slate-700 font-bold" />
                 </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Observações Adicionais</label>
                <textarea rows="4" value={formData.observacoes} onChange={e => setFormData({...formData, observacoes: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none" placeholder="Qualquer outra informação relevante..."></textarea>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70 text-lg">
              {loading ? 'Processando...' : 'Salvar equipamento'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
