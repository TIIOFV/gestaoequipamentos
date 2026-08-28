import { useState, useEffect } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '../../../../lib/supabase'
import { useAuth } from '../../../../contexts/AuthContext'
import { Plus, Search, Filter, MonitorDot, Wrench, Settings } from 'lucide-react'
import { Skeleton } from '../../../../components/ui/Skeleton'
import EquipamentoCard from '../EquipamentoCard'
import ModalConfirmacao from '../../../../components/ModalConfirmacao'
import Paginacao from '../../../../components/Paginacao'
import toast from 'react-hot-toast'
import { useLocation, useNavigate } from 'react-router-dom'

const buscarPadraoPaginados = async ({ pagina, busca, unidade, setor, status, modulo }) => {
  const ITENS_POR_PAGINA = 15;
  const from = (pagina - 1) * ITENS_POR_PAGINA;
  const to = from + ITENS_POR_PAGINA - 1;

  let query = supabase
    .from('equipamentos')
    .select(`
      id, nome, numero_serie, patrimonio, sem_patrimonio, possui_etiqueta,
      imagem_url, modelo, ip_mac_address, data_garantia,
      unidade_id, setor_id, status_id, fabricante_id,
      unidade:unidade_id(nome), setor:setor_id(nome), 
      status:status_id(nome), fabricante:fabricante_id(nome)
    `, { count: 'exact' })
    .eq('modulo', modulo)
    .order('nome');

  if (busca) query = query.or(`nome.ilike.%${busca}%,numero_serie.ilike.%${busca}%,patrimonio.ilike.%${busca}%`);
  if (unidade) query = query.eq('unidade_id', unidade);
  if (setor) query = query.eq('setor_id', setor);
  if (status) query = query.eq('status_id', status);

  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;
  return { itens: data || [], total: count || 0 };
}

const buscarAuxiliaresPadrao = async (modulo) => {
  const [unRes, setRes, stRes] = await Promise.all([
    supabase.from('unidades').select('id, nome').order('nome'),
    supabase.from('setores').select('id, nome, modulo').order('nome'),
    supabase.from('status_equipamento').select('id, nome, modulo').order('nome')
  ])
  return {
    unidades: unRes.data || [],
    setores: (setRes.data || []).filter(s => s.modulo && s.modulo.includes(modulo)),
    statusLista: (stRes.data || []).filter(s => !s.modulo || s.modulo.includes(modulo))
  }
}

export default function PadraoList({ moduloAtivo, setView, setEquipamentoSelecionado, refreshTrigger }) {
  const { profile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [busca, setBusca] = useState('')
  const [modalConfirm, setModalConfirm] = useState({ isOpen: false, idParaExcluir: null });
  const [filtroUnidade, setFiltroUnidade] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [paginaAtual, setPaginaAtual] = useState(1);
  const ITENS_POR_PAGINA = 15;

  const { data: auxiliares = { unidades: [], setores: [], statusLista: [] } } = useQuery({
    queryKey: ['auxiliares', moduloAtivo],
    queryFn: () => buscarAuxiliaresPadrao(moduloAtivo),
    enabled: !!moduloAtivo
  })

  const { 
    data: dadosTabela = { itens: [], total: 0 }, 
    isPending: loading,
    isFetching
  } = useQuery({
    queryKey: ['equipamentos', moduloAtivo, paginaAtual, busca, filtroUnidade, filtroSetor, filtroStatus],
    queryFn: () => buscarPadraoPaginados({ pagina: paginaAtual, busca, unidade: filtroUnidade, setor: filtroSetor, status: filtroStatus, modulo: moduloAtivo }),
    placeholderData: keepPreviousData,
    enabled: !!moduloAtivo
  })

  useEffect(() => { setPaginaAtual(1); }, [busca, filtroUnidade, filtroSetor, filtroStatus, moduloAtivo]);

  useEffect(() => {
    const mainContent = document.querySelector('main');
    if (mainContent) mainContent.scrollTo({ top: 0, behavior: 'smooth' });
  }, [paginaAtual]);

  useEffect(() => {
    if (refreshTrigger) queryClient.invalidateQueries({ queryKey: ['equipamentos', moduloAtivo] });
  }, [refreshTrigger, queryClient, moduloAtivo]) 

  useEffect(() => {
    if (!loading && dadosTabela.itens.length > 0 && location.state?.openDetailsId) {
      const eqAlerta = dadosTabela.itens.find(e => e.id === location.state.openDetailsId);
      if (eqAlerta) {
        navigate(location.pathname, { replace: true, state: {} });
        setEquipamentoSelecionado(eqAlerta);
        setView('detalhes');
      }
    }
  }, [loading, dadosTabela.itens, location.state, navigate, setView, setEquipamentoSelecionado]);

  const getHeaderInfo = () => {
    switch (moduloAtivo) {
      case 'ti': return { icone: <MonitorDot className="text-indigo-600" size={32} />, titulo: 'Equipamentos de TI' }
      case 'infra': return { icone: <Settings className="text-slate-600" size={32} />, titulo: 'Infraestrutura' }
      case 'manutencao': return { icone: <Wrench className="text-amber-600" size={32} />, titulo: 'Manutenção Predial' }
      default: return { icone: <Settings className="text-slate-600" size={32} />, titulo: 'Equipamentos' }
    }
  }

  const { icone, titulo } = getHeaderInfo()

  const handleDuplicar = (item) => {
    const copia = { ...item };
    delete copia.id; delete copia.created_at;
    copia.numero_serie = ''; copia.patrimonio = 'PENDENTE';
    copia.sem_patrimonio = true; copia.imagem_url = null; copia.ip_mac_address = ''; 
    setEquipamentoSelecionado(copia);
    setView('novo');
    toast.success('Molde copiado! Preencha N/S e Patrimônio da nova máquina.');
  }

  const handleExcluir = async (id) => {
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

      const eqAtual = dadosTabela.itens.find(e => e.id === id);
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
      queryClient.invalidateQueries({ queryKey: ['equipamentos', moduloAtivo] });
      toast.success('Equipamento e histórico excluídos permanentemente!');
    } catch (error) { toast.error('Erro na exclusão: ' + error.message); } 
    finally { setModalConfirm({ isOpen: false, idParaExcluir: null }); }
  }

  return (
    <div className="space-y-6 w-full relative">
      <ModalConfirmacao 
        isOpen={modalConfirm.isOpen} 
        onClose={() => setModalConfirm({ isOpen: false, idParaExcluir: null })}
        onConfirm={() => handleExcluir(modalConfirm.idParaExcluir)}
        titulo="Apagar Equipamento"
        mensagem="CUIDADO: Esta ação apagará TUDO (Histórico, Fotos, Laudos) definitivamente."
        textoConfirmar="Excluir Tudo"
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 flex items-center gap-3 tracking-tight uppercase">
            {icone} {titulo}
          </h1>
          <p className="text-sm md:text-base font-semibold text-slate-500 mt-1">Gestão e inventário do parque tecnológico.</p>
        </div>
        <button onClick={() => setView('novo')} className="w-full md:w-auto bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-slate-800/20 transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0">
          <Plus size={20} /> Novo Equipamento
        </button>
      </div>

      <div className="bg-white p-5 md:p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-5 relative overflow-hidden">
        {isFetching && <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100"><div className="w-1/3 h-full bg-slate-500 animate-[pulse_1s_ease-in-out_infinite]"></div></div>}

        <div className="relative w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" placeholder="Buscar por nome, N/S ou patrimônio..." value={busca} onChange={(e) => setBusca(e.target.value)} 
            className="w-full pl-12 pr-5 py-4 text-sm md:text-base bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all shadow-inner" 
          />
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] min-w-0 w-full items-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-1.5 shrink-0">
            <Filter size={14}/> Filtros:
          </span>
          <select value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value)} className="flex-1 min-w-[140px] px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-700 cursor-pointer shrink-0"><option value="">Todas as unidades</option>{auxiliares.unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select>
          <select value={filtroSetor} onChange={(e) => setFiltroSetor(e.target.value)} className="flex-1 min-w-[140px] px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-700 cursor-pointer shrink-0"><option value="">Todos os setores</option>{auxiliares.setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="flex-1 min-w-[140px] px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-700 cursor-pointer shrink-0"><option value="">Todos os status</option>{auxiliares.statusLista.map(st => <option key={st.id} value={st.id}>{st.nome}</option>)}</select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 min-w-0 w-full">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="space-y-3 w-full sm:w-1/2"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-3/4" /></div>
              <Skeleton className="h-10 w-28 rounded-xl shrink-0" />
            </div>
          ))
        ) : dadosTabela.itens.length === 0 ? (
          <div className="text-center py-16 text-slate-500 font-bold bg-white rounded-[2rem] border border-slate-200 shadow-sm">Nenhum equipamento encontrado.</div>
        ) : (
          <>
            {dadosTabela.itens.map(item => (
                <EquipamentoCard 
                  key={item.id} eq={item} moduloAtivo={moduloAtivo}
                  onVerDetalhes={() => { setEquipamentoSelecionado(item); setView('detalhes'); }}
                  onEditar={() => { setEquipamentoSelecionado(item); setView('editar'); }}
                  onDuplicar={() => handleDuplicar(item)}
                  onExcluir={() => setModalConfirm({ isOpen: true, idParaExcluir: item.id })}
                />
            ))}
            <Paginacao paginaAtual={paginaAtual} totalItens={dadosTabela.total} itensPorPagina={ITENS_POR_PAGINA} setPaginaAtual={setPaginaAtual} />
          </>
        )}
      </div>
    </div>
  )
}