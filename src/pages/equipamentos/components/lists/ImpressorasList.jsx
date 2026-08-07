import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useAuth } from '../../../../contexts/AuthContext'
import { Plus, Search, Filter, Printer } from 'lucide-react'
import { Skeleton } from '../../../../components/ui/Skeleton'
import EquipamentoCard from '../EquipamentoCard'
import ModalConfirmacao from '../../../../components/ModalConfirmacao'
import Paginacao from '../../../../components/Paginacao'
import toast from 'react-hot-toast'
import { useLocation, useNavigate } from 'react-router-dom'

// Recebe o refreshTrigger do pai
export default function ImpressorasList({ setView, setEquipamentoSelecionado, refreshTrigger }) {
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
  const [filtroPatrimonio, setFiltroPatrimonio] = useState('todos')

  const [unidades, setUnidades] = useState([])
  const [setores, setSetores] = useState([])

  const [paginaAtual, setPaginaAtual] = useState(1);
  const ITENS_POR_PAGINA = 15;

  // Rastreia a mudança de filtros para voltar à página 1
  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, filtroUnidade, filtroSetor, filtroStatus, filtroPatrimonio]);

  // Rastreia a mudança de página e força o scroll suave para o topo
  useEffect(() => {
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [paginaAtual]);

  // Atualiza os dados na montagem e sempre que o Formulário salvar algo
  useEffect(() => {
    carregarDados()
  }, [refreshTrigger]) 

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
        supabase.from('equipamentos').select(`*, unidade:unidade_id(nome), setor:setor_id(nome), status:status_id(nome), fabricante:fabricante_id(nome)`).eq('modulo', 'impressoras').order('nome'),
        supabase.from('unidades').select('*').order('nome'),
        supabase.from('setores').select('*').order('nome'),
        supabase.from('status_equipamento').select('*').order('nome')
      ])

      setEquipamentos(eqRes.data || [])
      setUnidades(unRes.data || [])
      setSetores(setRes.data || [])
      setStatusLista((stRes.data || []).filter(s => !s.modulo || s.modulo.includes('impressoras')))
    } catch (err) {
      toast.error('Erro ao carregar dados do parque de impressão.')
    } finally {
      setLoading(false)
    }
  }

  // 🚀 OTIMIZAÇÃO DE PERFORMANCE: O useMemo "blinda" o filtro contra lentidão na digitação[cite: 9]
  const dadosFiltrados = useMemo(() => {
    return equipamentos.filter(item => {
      const termo = busca.toLowerCase()
      const matchBusca = (item.nome || '').toLowerCase().includes(termo) ||
                         (item.numero_serie || '').toLowerCase().includes(termo) ||
                         (item.patrimonio || '').toLowerCase().includes(termo)

      const matchUnidade = filtroUnidade === '' || String(item.unidade_id) === String(filtroUnidade)
      const matchSetor = filtroSetor === '' || String(item.setor_id) === String(filtroSetor)
      
      const statusLimpo = item.status?.nome?.toLowerCase().trim() || ''
      const matchStatus = filtroStatus === '' || statusLimpo === filtroStatus.toLowerCase().trim()
      
      let matchPat = true
      if (filtroPatrimonio === 'sem-patrimonio') matchPat = !item.patrimonio || item.patrimonio === 'PENDENTE'
      if (filtroPatrimonio === 'com-patrimonio') matchPat = item.patrimonio && item.patrimonio !== 'PENDENTE'

      return matchBusca && matchUnidade && matchSetor && matchStatus && matchPat
    })
  }, [equipamentos, busca, filtroUnidade, filtroSetor, filtroStatus, filtroPatrimonio]);

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
          modulo: 'impressoras',
          detalhes: `Excluiu a impressora: ${eqAtual.nome} (Patrimônio: ${eqAtual.patrimonio || 'S/N'}) e todo o seu histórico.`
        }]);
      }

      if (eqAtual?.imagem_url) {
         const partesEq = eqAtual.imagem_url.split('/equipamentos/');
         if (partesEq[1]) await supabase.storage.from('equipamentos').remove([partesEq[1]]);
      }

      await supabase.from('equipamentos').delete().eq('id', id);
      toast.success('Impressora excluída permanentemente!');
      carregarDados();
    } catch (error) { toast.error('Erro na exclusão: ' + error.message); } 
    finally { setLoading(false); setModalConfirm({ isOpen: false, idParaExcluir: null }); }
  }

  return (
    <div className="w-full space-y-6">
      <ModalConfirmacao 
        isOpen={modalConfirm.isOpen} 
        onClose={() => setModalConfirm({ isOpen: false, idParaExcluir: null })}
        onConfirm={() => handleExcluir(modalConfirm.idParaExcluir)}
        titulo="Apagar Impressora"
        mensagem="CUIDADO: Esta ação apagará a impressora, todo o histórico de OS e fotos definitivamente."
        textoConfirmar="Excluir Tudo"
      />

      {/* 🚀 CABEÇALHO ATUALIZADO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 flex items-center gap-3 tracking-tight uppercase">
            <Printer className="text-blue-600" size={32} /> Parque de Impressoras
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">Inventário, alocações e monitorização ativa do parque de cópias.</p>
        </div>
        <button onClick={() => setView('novo')} className="w-full md:w-auto bg-blue-800 hover:bg-blue-900 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-blue-800/20 transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0">
          <Plus size={20} /> Nova Impressora
        </button>
      </div>

      {/* 🚀 BARRA DE PESQUISA E FILTROS ATUALIZADOS */}
      <div className="bg-white p-5 md:p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-5">
        <div className="relative w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por modelo, N/S ou património..." 
            value={busca} 
            onChange={(e) => setBusca(e.target.value)} 
            className="w-full pl-12 pr-5 py-4 text-sm md:text-base bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all shadow-inner" 
          />
        </div>

        <div className="flex flex-wrap lg:flex-nowrap gap-3 items-center pt-2 border-t border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-1.5 shrink-0">
            <Filter size={14}/> Filtros
          </span>
          <select value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value)} className="flex-1 min-w-[140px] px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-700 cursor-pointer"><option value="">Todas as unidades</option>{unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select>
          <select value={filtroSetor} onChange={(e) => setFiltroSetor(e.target.value)} className="flex-1 min-w-[140px] px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-700 cursor-pointer"><option value="">Todos os setores</option>{setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="flex-1 min-w-[140px] px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-700 cursor-pointer">
            <option value="">Todos os status</option>
            {statusLista.map(st => <option key={st.id} value={st.nome}>{st.nome}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 text-xs">
          <button onClick={() => setFiltroPatrimonio('todos')} className={`px-4 py-2 rounded-xl font-bold transition-all ${filtroPatrimonio === 'todos' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Todas</button>
          <button onClick={() => setFiltroPatrimonio('sem-patrimonio')} className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${filtroPatrimonio === 'sem-patrimonio' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 border border-red-100 hover:bg-red-100'}`}>🚨 Sem Património</button>
          <button onClick={() => setFiltroPatrimonio('com-patrimonio')} className={`px-4 py-2 rounded-xl font-bold transition-all ${filtroPatrimonio === 'com-patrimonio' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 border border-green-100 hover:bg-green-100'}`}>Com Património</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 min-w-0 w-full">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center">
              <div className="space-y-3 w-full xl:w-1/2">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <Skeleton className="h-10 w-full xl:w-48 rounded-xl shrink-0" />
            </div>
          ))
        ) : dadosFiltrados.length === 0 ? (
          <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-[2rem] border border-slate-200 border-dashed flex flex-col items-center">
            <Printer size={48} className="mb-4 opacity-50 text-slate-300" />
            <span className="font-bold text-lg">Nenhuma impressora encontrada.</span>
          </div>
        ) : (
          <>
            {dadosFiltrados
              .slice((paginaAtual - 1) * ITENS_POR_PAGINA, paginaAtual * ITENS_POR_PAGINA)
              .map(item => (
                <EquipamentoCard 
                  key={item.id} 
                  eq={item}  
                  moduloAtivo="impressoras"
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