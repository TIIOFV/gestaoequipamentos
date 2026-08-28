import { useState, useEffect } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '../../../../lib/supabase'
import { useAuth } from '../../../../contexts/AuthContext'
import { Plus, Search, Filter, Activity, AlertTriangle } from 'lucide-react'
import { Skeleton } from '../../../../components/ui/Skeleton'
import EquipamentoCard from '../EquipamentoCard'
import toast from 'react-hot-toast'
import ModalConfirmacao from '../../../../components/ModalConfirmacao'
import Paginacao from '../../../../components/Paginacao'
import { useLocation, useNavigate } from 'react-router-dom'

// 🚀 BUSCA NO SERVIDOR: O Supabase faz todo o trabalho pesado de filtrar e paginar no banco de dados
const buscarEquipamentosPaginados = async ({ pagina, busca, unidade, setor, status, calibracao, etiqueta }) => {
  const ITENS_POR_PAGINA = 15;
  const from = (pagina - 1) * ITENS_POR_PAGINA;
  const to = from + ITENS_POR_PAGINA - 1;

  let query = supabase
    .from('equipamentos')
    .select(`
      id, nome, numero_serie, patrimonio, sem_patrimonio, possui_etiqueta,
      imagem_url, modelo, registro_anvisa, data_proxima_calibracao,
      unidade_id, setor_id, status_id, fabricante_id,
      unidade:unidade_id(nome), 
      setor:setor_id(nome), 
      status:status_id(nome), 
      fabricante:fabricante_id(nome)
    `, { count: 'exact' }) // Pede ao banco de dados o número total de resultados reais
    .eq('modulo', 'medicos')
    .order('nome');

  // Filtros aplicados diretamente no PostgreSQL
  if (busca) {
    query = query.or(`nome.ilike.%${busca}%,numero_serie.ilike.%${busca}%,patrimonio.ilike.%${busca}%`);
  }
  if (unidade) query = query.eq('unidade_id', unidade);
  if (setor) query = query.eq('setor_id', setor);
  if (status) query = query.eq('status_id', status);
  if (etiqueta === 'sem') query = query.eq('possui_etiqueta', false);
  if (etiqueta === 'com') query = query.eq('possui_etiqueta', true);

  if (calibracao === 'atrasada') {
    const hoje = new Date().toISOString().split('T')[0];
    query = query.lt('data_proxima_calibracao', hoje);
  } else if (calibracao === 'em_dia') {
    const hoje = new Date().toISOString().split('T')[0];
    query = query.gte('data_proxima_calibracao', hoje);
  }

  // Corta apenas os 15 que precisamos para a tela atual
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;

  return { itens: data || [], total: count || 0 };
}

const buscarAuxiliaresMedicos = async () => {
  const [unRes, setRes, stRes] = await Promise.all([
    supabase.from('unidades').select('id, nome').order('nome'),
    supabase.from('setores').select('id, nome, modulo').order('nome'),
    supabase.from('status_equipamento').select('id, nome, modulo').order('nome')
  ])

  return {
    unidades: unRes.data || [],
    setores: (setRes.data || []).filter(s => s.modulo && s.modulo.includes('medicos')),
    statusLista: (stRes.data || []).filter(s => !s.modulo || s.modulo.includes('medicos'))
  }
}

export default function MedicosList({ setView, setEquipamentoSelecionado, refreshTrigger }) {
  const { profile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Estados dos Filtros
  const [busca, setBusca] = useState('')
  const [filtroUnidade, setFiltroUnidade] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('') // Agora armazena o ID do status
  const [filtroCalibracao, setFiltroCalibracao] = useState('todos') 
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('todos') 
  const [paginaAtual, setPaginaAtual] = useState(1)
  
  const ITENS_POR_PAGINA = 15

  // 🚀 REQUISIÇÃO CACHEADA E REATIVA: Refaz a busca no servidor automaticamente se um filtro mudar
  const { 
    data: dadosTabela = { itens: [], total: 0 }, 
    isPending: loadingEquipamentos,
    isFetching
  } = useQuery({
    queryKey: ['equipamentos', 'medicos', paginaAtual, busca, filtroUnidade, filtroSetor, filtroStatus, filtroCalibracao, filtroEtiqueta],
    queryFn: () => buscarEquipamentosPaginados({ pagina: paginaAtual, busca, unidade: filtroUnidade, setor: filtroSetor, status: filtroStatus, calibracao: filtroCalibracao, etiqueta: filtroEtiqueta }),
    placeholderData: keepPreviousData // Mantém os dados antigos na tela enquanto a nova página carrega (evita piscar a tela toda)
  })

  const { 
    data: auxiliares = { unidades: [], setores: [], statusLista: [] } 
  } = useQuery({
    queryKey: ['auxiliares', 'medicos'],
    queryFn: buscarAuxiliaresMedicos
  })

  const [modalConfirm, setModalConfirm] = useState({ isOpen: false, idParaExcluir: null })

  // Volta à página 1 sempre que o utilizador digitar ou mudar um filtro
  useEffect(() => {
    setPaginaAtual(1)
  }, [busca, filtroUnidade, filtroSetor, filtroStatus, filtroCalibracao, filtroEtiqueta])

  useEffect(() => {
    const mainContent = document.querySelector('main')
    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [paginaAtual])

  useEffect(() => {
    if (refreshTrigger) {
      queryClient.invalidateQueries({ queryKey: ['equipamentos', 'medicos'] })
    }
  }, [refreshTrigger, queryClient])

  useEffect(() => {
    if (!loadingEquipamentos && dadosTabela.itens.length > 0 && location.state?.openDetailsId) {
      const eqAlerta = dadosTabela.itens.find(e => e.id === location.state.openDetailsId)
      if (eqAlerta) {
        navigate(location.pathname, { replace: true, state: {} })
        setEquipamentoSelecionado(eqAlerta)
        setView('detalhes')
      }
    }
  }, [loadingEquipamentos, dadosTabela.itens, location.state, navigate, setView, setEquipamentoSelecionado])

  const hoje = new Date().toISOString().split('T')[0]

  const getStatusCalib = (data) => {
    if (!data) return null
    return data < hoje ? 'atrasada' : 'em_dia'
  }

  const handleDuplicar = (item) => {
    const copia = { ...item }
    delete copia.id
    delete copia.created_at
    copia.numero_serie = ''
    copia.patrimonio = 'PENDENTE'
    copia.sem_patrimonio = true
    copia.imagem_url = null
    setEquipamentoSelecionado(copia)
    setView('novo')
    toast.success('Molde copiado! Preencha N/S e Patrimônio da nova máquina.')
  }

  const handleExcluir = async (id) => {
    try {
      const { data: chamadosDoEq, error: errorChamados } = await supabase.from('chamados').select('id, anexos').eq('equipamento_id', id)
      if (errorChamados) throw errorChamados

      if (chamadosDoEq?.length > 0) {
        let todosOsAnexosPaths = []
        chamadosDoEq.forEach(ch => {
          if (ch.anexos?.length > 0) ch.anexos.forEach(url => { const partes = url.split('/equipamentos/'); if (partes[1]) todosOsAnexosPaths.push(partes[1]) })
        })
        if (todosOsAnexosPaths.length > 0) await supabase.storage.from('equipamentos').remove(todosOsAnexosPaths)
        await supabase.from('chamados').delete().in('id', chamadosDoEq.map(ch => ch.id))
      }

      const eqAtual = dadosTabela.itens.find(e => e.id === id)
      
      if (eqAtual) {
        await supabase.from('logs_auditoria').insert([{
          usuario_nome: profile?.nome || 'Usuário Desconhecido',
          acao: 'EXCLUSÃO EM CASCATA',
          modulo: 'medicos',
          detalhes: `Excluiu o equipamento: ${eqAtual.nome} (Patrimônio: ${eqAtual.patrimonio || 'S/N'}) e todo o seu histórico.`
        }])
      }

      if (eqAtual?.imagem_url) {
         const partesEq = eqAtual.imagem_url.split('/equipamentos/')
         if (partesEq[1]) await supabase.storage.from('equipamentos').remove([partesEq[1]])
      }

      await supabase.from('equipamentos').delete().eq('id', id)
      
      queryClient.invalidateQueries({ queryKey: ['equipamentos', 'medicos'] })
      toast.success('Equipamento excluído!')
    } catch (error) { 
      toast.error('Erro na exclusão: ' + error.message) 
    } finally { 
      setModalConfirm({ isOpen: false, idParaExcluir: null }) 
    }
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      <ModalConfirmacao 
        isOpen={modalConfirm.isOpen} 
        onClose={() => setModalConfirm({ isOpen: false, idParaExcluir: null })}
        onConfirm={() => handleExcluir(modalConfirm.idParaExcluir)}
        titulo="Apagar Equipamento"
        mensagem="CUIDADO: Esta ação apagará TUDO (Histórico, Fotos, Laudos) definitivamente."
        textoConfirmar="Excluir Tudo"
      />
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm w-full overflow-hidden">
        <div className="min-w-0">
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 flex items-center gap-3 tracking-tight uppercase truncate">
            <Activity className="text-emerald-600 shrink-0" size={32} /> Equipamentos Médicos
          </h1>
          <p className="text-sm md:text-base font-semibold text-slate-500 mt-1 truncate">Gestão de engenharia clínica e controlo rigoroso de calibrações.</p>
        </div>
        <button onClick={() => setView('novo')} className="w-full md:w-auto bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-emerald-700/20 transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0">
          <Plus size={20} /> Novo Equipamento
        </button>
      </div>

      {/* BARRA DE PESQUISA E FILTROS */}
      <div className="bg-white p-5 md:p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-5 w-full min-w-0 relative">
        {/* Indicador sutil de busca em andamento */}
        {isFetching && <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-100 overflow-hidden rounded-t-[2rem]"><div className="w-1/3 h-full bg-emerald-500 animate-[pulse_1s_ease-in-out_infinite] rounded-t-[2rem]"></div></div>}
        
        <div className="relative w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Buscar por equipamento, N/S ou património..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full pl-12 pr-5 py-4 text-sm md:text-base bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium transition-all shadow-inner" />
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] min-w-0 w-full items-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-1.5 shrink-0"><Filter size={14}/> Filtros:</span>
          <select value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value)} className="flex-1 min-w-[140px] px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-bold text-slate-700 cursor-pointer shrink-0">
            <option value="">Todas as unidades</option>
            {auxiliares.unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
          <select value={filtroSetor} onChange={(e) => setFiltroSetor(e.target.value)} className="flex-1 min-w-[140px] px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-bold text-slate-700 cursor-pointer shrink-0">
            <option value="">Todos os setores</option>
            {auxiliares.setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="flex-1 min-w-[140px] px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-bold text-slate-700 cursor-pointer shrink-0">
            <option value="">Todos os status</option>
            {auxiliares.statusLista.map(st => <option key={st.id} value={st.id}>{st.nome}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center mr-2">Alertas:</span>
          <button onClick={() => setFiltroCalibracao(filtroCalibracao === 'atrasada' ? 'todos' : 'atrasada')} className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${filtroCalibracao === 'atrasada' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 border border-red-100 hover:bg-red-100'}`}><AlertTriangle size={14} /> Calib. Atrasada</button>
          <button onClick={() => setFiltroEtiqueta(filtroEtiqueta === 'sem' ? 'todos' : 'sem')} className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${filtroEtiqueta === 'sem' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100'}`}>⚠️ Sem Etiqueta</button>
          {(filtroCalibracao !== 'todos' || filtroEtiqueta !== 'todos') && (<button onClick={() => { setFiltroCalibracao('todos'); setFiltroEtiqueta('todos'); }} className="px-4 py-2 rounded-xl font-bold text-slate-500 hover:text-slate-800 ml-auto underline">Limpar alertas</button>)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 min-w-0 w-full">
        {loadingEquipamentos ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="space-y-3 w-full sm:w-1/2"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-3/4" /></div>
              <Skeleton className="h-10 w-28 rounded-xl shrink-0" />
            </div>
          ))
        ) : dadosTabela.itens.length === 0 ? (
          <div className="text-center py-16 text-slate-500 font-bold bg-white rounded-[2rem] border border-slate-200 shadow-sm">Nenhum equipamento médico atende a estes critérios.</div>
        ) : (
          <>
            {dadosTabela.itens.map(item => (
                <EquipamentoCard 
                  key={item.id} 
                  eq={item} 
                  moduloAtivo="medicos"
                  statusCalib={getStatusCalib(item.data_proxima_calibracao)}
                  onVerDetalhes={() => { setEquipamentoSelecionado(item); setView('detalhes'); }}
                  onEditar={() => { setEquipamentoSelecionado(item); setView('editar'); }}
                  onDuplicar={() => handleDuplicar(item)}
                  onExcluir={() => setModalConfirm({ isOpen: true, idParaExcluir: item.id })}
                />
            ))}
            <Paginacao 
              paginaAtual={paginaAtual} 
              totalItens={dadosTabela.total} 
              itensPorPagina={ITENS_POR_PAGINA} 
              setPaginaAtual={setPaginaAtual} 
            />
          </>
        )}
      </div>
    </div>
  )
}