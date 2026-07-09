import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useAuth } from '../../../../contexts/AuthContext'
import { Plus, Search, Filter, MonitorDot, Wrench, Settings } from 'lucide-react'
import { Skeleton } from '../../../../components/ui/Skeleton'
import EquipamentoCard from '../EquipamentoCard'
import ModalConfirmacao from '../../../../components/ModalConfirmacao'
import Paginacao from '../../../../components/Paginacao'
import toast from 'react-hot-toast'
import { useLocation, useNavigate } from 'react-router-dom'

export default function PadraoList({ moduloAtivo, setView, setEquipamentoSelecionado }) {
  const { profile } = useAuth()
  
  const location = useLocation()
  const navigate = useNavigate()
  
  const [equipamentos, setEquipamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [modalConfirm, setModalConfirm] = useState({ isOpen: false, idParaExcluir: null });
  
  const [filtroUnidade, setFiltroUnidade] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [statusLista, setStatusLista] = useState([])

  const [unidades, setUnidades] = useState([])
  const [setores, setSetores] = useState([])

  const [paginaAtual, setPaginaAtual] = useState(1);
  const ITENS_POR_PAGINA = 15;

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, filtroUnidade, filtroSetor, filtroStatus]);

  const getHeaderInfo = () => {
    switch (moduloAtivo) {
      case 'ti': return { icone: <MonitorDot className="text-indigo-600" size={28} />, titulo: 'Equipamentos de TI' }
      case 'infra': return { icone: <Settings className="text-slate-600" size={28} />, titulo: 'Infraestrutura' }
      case 'manutencao': return { icone: <Wrench className="text-amber-600" size={28} />, titulo: 'Manutenção Predial' }
      default: return { icone: <Settings className="text-slate-600" size={28} />, titulo: 'Equipamentos' }
    }
  }

  const { icone, titulo } = getHeaderInfo()

  useEffect(() => {
    carregarDados()
  }, [moduloAtivo]) 

  // O BLOCO SEGURO DE ESCUTA DE NOTIFICAÇÕES
  useEffect(() => {
    if (!loading && equipamentos.length > 0 && location.state?.openDetailsId) {
      const eqAlerta = equipamentos.find(e => e.id === location.state.openDetailsId);
      if (eqAlerta) {
        navigate(location.pathname, { replace: true, state: {} });
        setEquipamentoSelecionado(eqAlerta);
        setView('detalhes');
      }
    }
  }, [loading, equipamentos, location.state, navigate, setView, setEquipamentoSelecionado]);

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [eqRes, unRes, setRes, stRes] = await Promise.all([
        supabase.from('equipamentos').select(`*, unidade:unidade_id(nome), setor:setor_id(nome), status:status_id(nome), fabricante:fabricante_id(nome)`).eq('modulo', moduloAtivo).order('nome'),
        supabase.from('unidades').select('*').order('nome'),
        supabase.from('setores').select('*').order('nome'),
        supabase.from('status_equipamento').select('*').order('nome')
      ])

      setEquipamentos(eqRes.data || [])
      setUnidades(unRes.data || [])
      setSetores((setRes.data || []).filter(s => s.modulo && s.modulo.includes(moduloAtivo)))
      setStatusLista((stRes.data || []).filter(s => !s.modulo || s.modulo.includes(moduloAtivo)))
    } catch (err) {
      toast.error('Erro ao carregar os equipamentos.')
    } finally {
      setLoading(false)
    }
  }

  const dadosFiltrados = equipamentos.filter(item => {
    const termo = busca.toLowerCase()
    const matchBusca = (item.nome || '').toLowerCase().includes(termo) ||
                       (item.numero_serie || '').toLowerCase().includes(termo) ||
                       (item.patrimonio || '').toLowerCase().includes(termo)

    const matchUnidade = filtroUnidade === '' || String(item.unidade_id) === String(filtroUnidade)
    const matchSetor = filtroSetor === '' || String(item.setor_id) === String(filtroSetor)
    
    // CORREÇÃO AQUI: Verifica o nome do status ignorando maiúsculas
    const statusLimpo = item.status?.nome?.toLowerCase().trim() || ''
    const matchStatus = filtroStatus === '' || statusLimpo === filtroStatus.toLowerCase().trim()
    
    return matchBusca && matchUnidade && matchSetor && matchStatus
  })

  const handleDuplicar = (item) => {
    const copia = { ...item };
    delete copia.id;
    delete copia.created_at;
    copia.numero_serie = '';
    copia.patrimonio = 'PENDENTE';
    copia.sem_patrimonio = true;
    copia.imagem_url = null;
    copia.ip_mac_address = ''; 
    setEquipamentoSelecionado(copia);
    setView('novo');
    toast.success('Molde copiado! Preencha N/S e Patrimônio da nova máquina.');
  }

  const handleExcluir = async (id) => {
    setLoading(true)
    try {
      const { data: chamadosDoEq, error: errorChamados } = await supabase.from('chamados').select('id, anexos').eq('equipamento_id', id);
      if (errorChamados) throw errorChamados;

      if (chamadosDoEq?.length > 0) {
        let todosOsAnexosPaths = [];
        chamadosDoEq.forEach(ch => {
          if (ch.anexos?.length > 0) ch.anexos.forEach(url => { const partes = url.split('/equipamentos/'); if (partes[1]) todosOsAnexosPaths.push(partes[1]); });
        });
        if (todosOsAnexosPaths.length > 0) await supabase.storage.from('equipamentos').remove(todosOsAnexosPaths);
        await supabase.from('chamados').delete().in('id', chamadosDoEq.map(ch => ch.id));
      }

      const eqAtual = equipamentos.find(e => e.id === id);
      
      if (eqAtual) {
        await supabase.from('logs_auditoria').insert([{
          usuario_nome: profile?.nome || 'Usuário Desconhecido',
          acao: 'EXCLUSÃO EM CASCATA',
          modulo: moduloAtivo,
          detalhes: `Excluiu o equipamento: ${eqAtual.nome} (Patrimônio: ${eqAtual.patrimonio || 'S/N'}) e todo o seu histórico.`
        }]);
      }

      if (eqAtual?.imagem_url) {
         const partesEq = eqAtual.imagem_url.split('/equipamentos/');
         if (partesEq[1]) await supabase.storage.from('equipamentos').remove([partesEq[1]]);
      }

      await supabase.from('equipamentos').delete().eq('id', id);
      toast.success('Equipamento e histórico excluídos permanentemente!');
      carregarDados();
    } catch (error) { toast.error('Erro na exclusão: ' + error.message); } 
    finally { setLoading(false); setModalConfirm({ isOpen: false, idParaExcluir: null }); }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <ModalConfirmacao 
        isOpen={modalConfirm.isOpen} 
        onClose={() => setModalConfirm({ isOpen: false, idParaExcluir: null })}
        onConfirm={() => handleExcluir(modalConfirm.idParaExcluir)}
        titulo="Apagar Equipamento"
        mensagem="CUIDADO: Esta ação apagará TUDO (Histórico, Fotos, Laudos) definitivamente."
        textoConfirmar="Excluir Tudo"
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            {icone} {titulo}
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-1">Gestão e inventário do parque tecnológico.</p>
        </div>
        <button onClick={() => setView('novo')} className="w-full md:w-auto bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0">
          <Plus size={20} /> Novo Equipamento
        </button>
      </div>

      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome, N/S ou patrimônio..." 
            value={busca} 
            onChange={(e) => setBusca(e.target.value)} 
            className="w-full pl-11 md:pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all" 
          />
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar min-w-0 w-full">
          <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
            <Filter size={14}/> Filtros:
          </span>
          <select value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 shrink-0"><option value="">Todas as unidades</option>{unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select>
          <select value={filtroSetor} onChange={(e) => setFiltroSetor(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 shrink-0"><option value="">Todos os setores</option>{setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 shrink-0"><option value="">Todos os status</option>{statusLista.map(st => <option key={st.id} value={st.nome}>{st.nome}</option>)}</select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 min-w-0 w-full">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="space-y-2 w-full sm:w-1/2"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-3/4" /></div>
              <Skeleton className="h-10 w-28 rounded-xl shrink-0" />
            </div>
          ))
        ) : dadosFiltrados.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-medium bg-white rounded-2xl border border-slate-200 shadow-sm">Nenhum equipamento encontrado.</div>
        ) : (
          <>
            {dadosFiltrados
              .slice((paginaAtual - 1) * ITENS_POR_PAGINA, paginaAtual * ITENS_POR_PAGINA)
              .map(item => (
                <EquipamentoCard 
                  key={item.id} 
                  eq={item} 
                  moduloAtivo={moduloAtivo}
                  onVerDetalhes={() => { setEquipamentoSelecionado(item); setView('detalhes'); }}
                  onEditar={() => { setEquipamentoSelecionado(item); setView('editar'); }}
                  onDuplicar={() => handleDuplicar(item)}
                  onExcluir={() => setModalConfirm({ isOpen: true, idParaExcluir: item.id })}
                />
            ))}
            <Paginacao 
              paginaAtual={paginaAtual} 
              totalItens={dadosFiltrados.length} 
              itensPorPagina={ITENS_POR_PAGINA} 
              setPaginaAtual={setPaginaAtual} 
            />
          </>
        )}
      </div>
    </div>
  )
}