import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { Plus, Search, Filter, Activity, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Skeleton } from '../../../../components/ui/Skeleton'
import EquipamentoCard from '../EquipamentoCard'
import toast from 'react-hot-toast'
import ModalConfirmacao from '../../../../components/ModalConfirmacao'

export default function MedicosList({ setView, setEquipamentoSelecionado }) {
  const [equipamentos, setEquipamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [modalConfirm, setModalConfirm] = useState({ isOpen: false, idParaExcluir: null });
  
  // Filtros Críticos para Engenharia Clínica
  const [filtroUnidade, setFiltroUnidade] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroCalibracao, setFiltroCalibracao] = useState('todos') // todos, em_dia, atrasada
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('todos') // todos, com, sem

  const [unidades, setUnidades] = useState([])
  const [setores, setSetores] = useState([])

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [eqRes, unRes, setRes] = await Promise.all([
        supabase.from('equipamentos').select(`*, unidade:unidade_id(nome), setor:setor_id(nome)`).eq('modulo', 'medicos').order('nome'),
        supabase.from('unidades').select('*').order('nome'),
        supabase.from('setores').select('*').order('nome')
      ])

      setEquipamentos(eqRes.data || [])
      setUnidades(unRes.data || [])
      // Aplica o filtro de array para evitar o erro 400
      setSetores((setRes.data || []).filter(s => s.modulo && s.modulo.includes('medicos')))
    } catch (err) {
      toast.error('Erro ao carregar equipamentos médicos.')
    } finally {
      setLoading(false)
    }
  }

  const hoje = new Date().toISOString().split('T')[0]

  const dadosFiltrados = equipamentos.filter(item => {
    const termo = busca.toLowerCase()
    const matchBusca = (item.nome || '').toLowerCase().includes(termo) ||
                       (item.numero_serie || '').toLowerCase().includes(termo) ||
                       (item.patrimonio || '').toLowerCase().includes(termo)

    const matchUnidade = filtroUnidade === '' || item.unidade_id === filtroUnidade
    const matchSetor = filtroSetor === '' || item.setor_id === filtroSetor
    const matchStatus = filtroStatus === '' || item.status === filtroStatus
    
    // Lógica de Calibração (baseado na data_proxima_calibracao)
    let calcCalib = 'nao_aplica'
    if (item.data_proxima_calibracao) {
      calcCalib = item.data_proxima_calibracao < hoje ? 'atrasada' : 'em_dia'
    }
    
    const matchCalib = filtroCalibracao === 'todos' || calcCalib === filtroCalibracao
    
    // Lógica de Etiqueta
    let matchEtiqueta = true
    if (filtroEtiqueta === 'sem') matchEtiqueta = item.possui_etiqueta === false
    if (filtroEtiqueta === 'com') matchEtiqueta = item.possui_etiqueta === true

    return matchBusca && matchUnidade && matchSetor && matchStatus && matchCalib && matchEtiqueta
  })

  // Calcula o status de calibração para passar ao Card
  const getStatusCalib = (data) => {
    if (!data) return null;
    return data < hoje ? 'atrasada' : 'em_dia';
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
      if (eqAtual?.imagem_url) {
         const partesEq = eqAtual.imagem_url.split('/equipamentos/');
         if (partesEq[1]) await supabase.storage.from('equipamentos').remove([partesEq[1]]);
      }

      await supabase.from('equipamentos').delete().eq('id', id);
      toast.success('Equipamento excluído!');
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
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Activity className="text-emerald-600" /> Equipamentos Médicos
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-1">Gestão de engenharia clínica e controlo rigoroso de calibrações.</p>
        </div>
        <button onClick={() => setView('novo')} className="w-full md:w-auto bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0">
          <Plus size={20} /> Novo Equipamento Médico
        </button>
      </div>

      {/* FILTROS CLÍNICOS */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por equipamento, N/S ou património..." 
            value={busca} 
            onChange={(e) => setBusca(e.target.value)} 
            className="w-full pl-11 md:pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition-all" 
          />
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar min-w-0 w-full">
          <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
            <Filter size={14}/> Filtros:
          </span>
          
          <select value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 shrink-0">
            <option value="">Todas as unidades</option>
            {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>

          <select value={filtroSetor} onChange={(e) => setFiltroSetor(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 shrink-0">
            <option value="">Todos os setores</option>
            {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>

          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 shrink-0">
            <option value="">Todos os status</option>
            <option value="ATIVO">Ativo</option>
            <option value="MANUTENCAO">Em Manutenção</option>
            <option value="CALIBRACAO">Em Calibração</option>
          </select>
        </div>

        {/* Tags de Filtro Rápido - Foco em Risco Clínico */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center mr-2">Alertas:</span>
          
          <button onClick={() => setFiltroCalibracao(filtroCalibracao === 'atrasada' ? 'todos' : 'atrasada')} className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${filtroCalibracao === 'atrasada' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 border border-red-100 hover:bg-red-100'}`}>
            <AlertTriangle size={14} /> Calib. Atrasada
          </button>
          
          <button onClick={() => setFiltroEtiqueta(filtroEtiqueta === 'sem' ? 'todos' : 'sem')} className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${filtroEtiqueta === 'sem' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100'}`}>
            ⚠️ Sem Etiqueta
          </button>

          {(filtroCalibracao !== 'todos' || filtroEtiqueta !== 'todos') && (
            <button onClick={() => { setFiltroCalibracao('todos'); setFiltroEtiqueta('todos'); }} className="px-3 py-1.5 rounded-lg font-bold text-slate-500 hover:text-slate-700 ml-auto underline">
              Limpar alertas
            </button>
          )}
        </div>
      </div>

      {/* LISTA DE CARDS */}
      <div className="grid grid-cols-1 gap-4 min-w-0 w-full">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="space-y-2 w-full sm:w-1/2"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-3/4" /></div>
              <Skeleton className="h-10 w-28 rounded-xl shrink-0" />
            </div>
          ))
        ) : dadosFiltrados.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-medium bg-white rounded-2xl border border-slate-200 shadow-sm">
            Nenhum equipamento médico atende a estes critérios.
          </div>
        ) : (
          dadosFiltrados.map(item => (
            <EquipamentoCard 
              key={item.id} 
              eq={item} 
              moduloAtivo="medicos"
              statusCalib={getStatusCalib(item.data_proxima_calibracao)}
              onVerDetalhes={() => { setEquipamentoSelecionado(item); setView('detalhes'); }}
              onEditar={() => { setEquipamentoSelecionado(item); setView('editar'); }}
              onDuplicar={() => toast('Função de duplicar em breve', { icon: '🚧' })}
              onExcluir={() => setModalConfirm({ isOpen: true, idParaExcluir: item.id })}
            />
          ))
        )}
      </div>
    </div>
  )
}