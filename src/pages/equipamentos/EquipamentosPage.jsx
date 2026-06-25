import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useModulo } from '../../contexts/ModuloContext'
import { Plus, Search, Filter } from 'lucide-react'
import ModalConfirmacao from '../../components/ModalConfirmacao'
import toast from 'react-hot-toast'

import EquipamentoForm from './EquipamentoForm'
import EquipamentoDetalhes from './EquipamentoDetalhes'
import EquipamentoCard from './components/EquipamentoCard'

export default function EquipamentosPage() {
  const navigate = useNavigate()
  const location = useLocation() 
  const { moduloAtivo } = useModulo()
  
  const [view, setView] = useState('lista')
  const [scrollPosition, setScrollPosition] = useState(0) 
  const [equipamentos, setEquipamentos] = useState([])
  const [equipSelecionado, setEquipSelecionado] = useState(null)
  
  const [busca, setBusca] = useState('')
  const [filtroUnidade, setFiltroUnidade] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('') 
  const [filtroStatus, setFiltroStatus] = useState('') 
  const [filtroPrestador, setFiltroPrestador] = useState('') 
  const [filtroFabricante, setFiltroFabricante] = useState('') 
  const [filtroRapido, setFiltroRapido] = useState('Todos') 
  
  const [loading, setLoading] = useState(true)
  const [historicoManutencoes, setHistoricoManutencoes] = useState([])
  const [auxiliares, setAuxiliares] = useState({ fabricantes: [], prestadores: [], unidades: [], setores: [], status: [] })

  const [modalConfirm, setModalConfirm] = useState({ isOpen: false, titulo: '', mensagem: '', textoConfirmar: 'Confirmar', onConfirm: () => {} });

  const estadoInicialForm = {
    id: null, nome: '', numero_serie: '', patrimonio: '', modelo: '',
    fabricante_id: '', prestador_id: '', unidade_id: '', setor_id: '', 
    status_id: '', observacoes: '', imagem_url: '',
    data_fabricacao: '', desconhece_fabricacao: false, 
    possui_etiqueta: false, possui_manual: false, sem_numero_serie: false,
    sem_patrimonio: false, data_ultima_calibracao: '', data_proxima_calibracao: '',
    fotos_adicionais: [], data_garantia: '', ip_mac_address: '', tipo_impressora: ''
  }
  const [formData, setFormData] = useState(estadoInicialForm)

  useEffect(() => {
    if (!moduloAtivo) return;
    buscarEquipamentos()
    carregarAuxiliares()
    const canalEquipamentos = supabase.channel(`lista-viva-eq-${moduloAtivo}`).on('postgres_changes', { event: '*', schema: 'public', table: 'equipamentos', filter: `modulo=eq.${moduloAtivo}` }, () => buscarEquipamentos()).subscribe();
    return () => { supabase.removeChannel(canalEquipamentos); };
  }, [moduloAtivo])

  const carregarAuxiliares = async () => {
    const [fab, pres, uni, set, sta] = await Promise.all([
      supabase.from('fabricantes').select('*').contains('modulo', [moduloAtivo]).order('nome'),
      supabase.from('prestadores').select('*').contains('modulo', [moduloAtivo]).order('nome'),
      supabase.from('unidades').select('*').contains('modulo', [moduloAtivo]).order('nome'),
      supabase.from('setores').select('*').contains('modulo', [moduloAtivo]).order('nome'),
      supabase.from('status_equipamento').select('*').contains('modulo', [moduloAtivo]).order('nome')
    ])
    setAuxiliares({ fabricantes: fab.data || [], prestadores: pres.data || [], unidades: uni.data || [], setores: set.data || [], status: sta.data || [] })
  }

  const buscarEquipamentos = async () => {
    setLoading(true)
    const { data } = await supabase.from('equipamentos').select('*, fabricante:fabricante_id(nome), prestador:prestador_id(nome), unidade:unidade_id(nome), setor:setor_id(nome), status:status_id(nome)').eq('modulo', moduloAtivo).order('nome')
    if (data) setEquipamentos(data)
    setLoading(false)
  }

  const abrirDetalhes = async (eq) => {
    setScrollPosition(window.scrollY); setEquipSelecionado(eq); setView('detalhes'); setHistoricoManutencoes([]); window.scrollTo(0, 0); 
    const { data } = await supabase.from('chamados').select('*, status:status_id(nome), prestador:prestador_id(nome), aberto_por:aberto_por_id(nome)').eq('equipamento_id', eq.id).order('data_abertura', { ascending: false })
    if (data) setHistoricoManutencoes(data)
  }

  const iniciarEdicao = (eq) => {
    if (view === 'lista') setScrollPosition(window.scrollY);
    setFormData({ ...estadoInicialForm, ...eq,
      data_ultima_calibracao: eq.data_ultima_calibracao ? eq.data_ultima_calibracao.split('T')[0] : '',
      data_proxima_calibracao: eq.data_proxima_calibracao ? eq.data_proxima_calibracao.split('T')[0] : '',
      data_garantia: eq.data_garantia ? eq.data_garantia.split('T')[0] : '',
      desconhece_fabricacao: eq.data_fabricacao ? false : true
    }); setView('editar'); window.scrollTo(0, 0);
  }

  const duplicarEquipamento = (eq) => {
    if (view === 'lista') setScrollPosition(window.scrollY);
    setFormData({ ...estadoInicialForm, ...eq, id: null, numero_serie: '', patrimonio: '', imagem_url: '', fotos_adicionais: [], data_garantia: '', ip_mac_address: '' })
    setView('novo'); window.scrollTo(0, 0);
    toast.success('Equipamento clonado! Altere o Patrimônio e N/S para salvar.');
  }

  const handleExcluir = (id) => {
    setModalConfirm({
      isOpen: true, titulo: 'Excluir Equipamento', mensagem: 'CUIDADO: Tem certeza que deseja excluir? Se possuir histórico de OS, será bloqueado.', textoConfirmar: 'Sim, Excluir',
      onConfirm: async () => {
        setLoading(true); const { error } = await supabase.from('equipamentos').delete().eq('id', id)
        if (error) toast.error('Erro ao excluir. O equipamento provavelmente tem OS vinculadas.'); else { toast.success('Excluído!'); buscarEquipamentos() }
        setLoading(false)
      }
    })
  }

  const chimneysCalibracao = (dataProxima) => {
    if (!dataProxima) return null;
    const dataRef = new Date(dataProxima); dataRef.setHours(0,0,0,0);
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    return dataRef < hoje ? 'atrasada' : 'em_dia';
  }

  const equipamentosFiltrados = equipamentos.filter(eq => {
    const term = busca.toLowerCase(); 
    const atendeBusca = (eq.nome?.toLowerCase() || '').includes(term) || (eq.patrimonio?.toLowerCase() || '').includes(term) || (eq.numero_serie?.toLowerCase() || '').includes(term);
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

  // GERENCIAMENTO DAS VIEWS
  if (view === 'novo' || view === 'editar') {
    return <EquipamentoForm formDataInicial={formData} auxiliaresGlobais={auxiliares} onVoltar={() => { setView('lista'); setTimeout(() => window.scrollTo({ top: scrollPosition, behavior: 'instant' }), 50) }} onSucesso={() => { setView('lista'); buscarEquipamentos(); setTimeout(() => window.scrollTo({ top: scrollPosition, behavior: 'instant' }), 50) }} />
  }

  if (view === 'detalhes' && equipSelecionado) {
    return <EquipamentoDetalhes equipamento={equipSelecionado} historico={historicoManutencoes} onVoltar={() => { setView('lista'); setTimeout(() => window.scrollTo({ top: scrollPosition, behavior: 'instant' }), 50) }} onEditar={iniciarEdicao} />
  }

  return (
    <div className="relative min-h-full font-sans pb-10">
      <ModalConfirmacao isOpen={modalConfirm.isOpen} onClose={() => setModalConfirm({...modalConfirm, isOpen: false})} onConfirm={modalConfirm.onConfirm} titulo={modalConfirm.titulo} mensagem={modalConfirm.mensagem} textoConfirmar={modalConfirm.textoConfirmar} />

      <div className="space-y-6 animate-in fade-in duration-500">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Equipamentos</h1>
            <p className="text-slate-500 mt-1">Inventário e acompanhamento do parque tecnológico.</p>
          </div>
          <button onClick={() => { setScrollPosition(window.scrollY); setFormData(estadoInicialForm); setView('novo'); window.scrollTo(0,0); }} className="bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
            <Plus size={20} /> Novo equipamento
          </button>
        </div>

        {/* FILTROS */}
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input type="text" placeholder="Buscar por nome, N/S ou patrimônio" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
            <select value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-700"><option value="">Todas as unidades</option>{auxiliares.unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select>
            <select value={filtroSetor} onChange={(e) => setFiltroSetor(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-700"><option value="">Todos os setores</option>{auxiliares.setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-700"><option value="">Todos os status</option>{auxiliares.status.map(st => <option key={st.id} value={st.id}>{st.nome}</option>)}</select>
            <select value={filtroPrestador} onChange={(e) => setFiltroPrestador(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-700"><option value="">Todos os prestadores</option>{auxiliares.prestadores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
            <select value={filtroFabricante} onChange={(e) => setFiltroFabricante(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-700"><option value="">Todos os fabricantes</option>{auxiliares.fabricantes.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}</select>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-400 mr-2 flex items-center gap-1"><Filter size={14}/> Filtros:</span>
            <button onClick={() => setFiltroRapido('Todos')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${filtroRapido === 'Todos' ? 'bg-slate-800 text-white' : 'bg-white'}`}>Todos</button>
            <button onClick={() => setFiltroRapido('sem_patrimonio')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${filtroRapido === 'sem_patrimonio' ? 'bg-rose-100 text-rose-800' : 'bg-white'}`}>🚨 Sem Patrimônio</button>
            {moduloAtivo !== 'ti' && (
              <>
                <button onClick={() => setFiltroRapido('sem_etiqueta')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${filtroRapido === 'sem_etiqueta' ? 'bg-amber-100 text-amber-800' : 'bg-white'}`}>⚠️ Falta Etiqueta</button>
                <button onClick={() => setFiltroRapido('calib_atrasada')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${filtroRapido === 'calib_atrasada' ? 'bg-red-100 text-red-800' : 'bg-white'}`}>⏱️ Prev./Calib. Atrasada</button>
              </>
            )}
          </div>
        </div>

        {/* LISTAGEM DOS EQUIPAMENTOS USANDO O NOVO COMPONENTE */}
        <div className="grid grid-cols-1 gap-6">
          {loading ? (
            <div className="text-center py-10 text-slate-500 font-medium">Carregando inventário...</div>
          ) : equipamentosFiltrados.length === 0 ? (
            <div className="text-center py-10 text-slate-500 font-medium bg-white rounded-2xl border border-slate-100">Nenhum equipamento encontrado.</div>
          ) : equipamentosFiltrados.map((eq) => (
            <EquipamentoCard 
              key={eq.id} 
              eq={eq} 
              moduloAtivo={moduloAtivo}
              statusCalib={chimneysCalibracao(eq.data_proxima_calibracao)}
              onVerDetalhes={abrirDetalhes}
              onEditar={iniciarEdicao}
              onDuplicar={duplicarEquipamento}
              onExcluir={handleExcluir}
            />
          ))}
        </div>
      </div>
    </div>
  )
}