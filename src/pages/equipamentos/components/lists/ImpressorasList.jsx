import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { Plus, Search, Filter, Printer } from 'lucide-react'
import { Skeleton } from '../../../../components/ui/Skeleton'
import EquipamentoCard from '../EquipamentoCard' // Importando o seu Card original
import toast from 'react-hot-toast'

export default function ImpressorasList({ setView, setEquipamentoSelecionado }) {
  const [equipamentos, setEquipamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  
  // Filtros limpos e focados em impressoras
  const [filtroUnidade, setFiltroUnidade] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroPatrimonio, setFiltroPatrimonio] = useState('todos') // todos, sem-patrimonio, com-patrimonio

  const [unidades, setUnidades] = useState([])
  const [setores, setSetores] = useState([])

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [eqRes, unRes, setRes] = await Promise.all([
        // Query corrigida (exatamente como funcionava antes)
        supabase.from('equipamentos').select(`*, unidade:unidade_id(nome), setor:setor_id(nome), status:status_id(nome)`).eq('modulo', 'impressoras').order('nome'),
        supabase.from('unidades').select('*').order('nome'),
        supabase.from('setores').select('*').order('nome')
      ])

      setEquipamentos(eqRes.data || [])
      setUnidades(unRes.data || [])
      setSetores(setRes.data || [])
    } catch (err) {
      toast.error('Erro ao carregar dados do parque de impressão.')
    } finally {
      setLoading(false)
    }
  }

  const dadosFiltrados = equipamentos.filter(item => {
    const termo = busca.toLowerCase()
    const matchBusca = (item.nome || '').toLowerCase().includes(termo) ||
                       (item.numero_serie || '').toLowerCase().includes(termo) ||
                       (item.patrimonio || '').toLowerCase().includes(termo)

    const matchUnidade = filtroUnidade === '' || item.unidade_id === filtroUnidade
    const matchSetor = filtroSetor === '' || item.setor_id === filtroSetor
    const matchStatus = filtroStatus === '' || item.status === filtroStatus
    
    let matchPat = true
    if (filtroPatrimonio === 'sem-patrimonio') matchPat = !item.patrimonio || item.patrimonio === 'PENDENTE'
    if (filtroPatrimonio === 'com-patrimonio') matchPat = item.patrimonio && item.patrimonio !== 'PENDENTE'

    return matchBusca && matchUnidade && matchSetor && matchStatus && matchPat
  })

  // Funções temporárias para ações do Card
  const handleDuplicar = () => toast('Função de duplicar impressora em breve', { icon: '🚧' })
  const handleExcluir = () => toast('Função de excluir impressora em breve', { icon: '🚧' })

  return (
    <div className="space-y-4 md:space-y-6">
      {/* CABEÇALHO DA LISTA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Printer className="text-blue-600" /> Parque de Impressoras
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-1">Inventário, alocações e monitorização ativa do parque de cópias.</p>
        </div>
        <button onClick={() => setView('novo')} className="w-full md:w-auto bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0">
          <Plus size={20} /> Nova Impressora
        </button>
      </div>

      {/* FILTROS INTELIGENTES */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por modelo, N/S ou património..." 
            value={busca} 
            onChange={(e) => setBusca(e.target.value)} 
            className="w-full pl-11 md:pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all" 
          />
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar min-w-0 w-full">
          <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
            <Filter size={14}/> Filtros:
          </span>
          
          <select value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 shrink-0">
            <option value="">Todas as unidades</option>
            {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>

          <select value={filtroSetor} onChange={(e) => setFiltroSetor(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 shrink-0">
            <option value="">Todos os setores</option>
            {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>

          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 shrink-0">
            <option value="">Todos os status</option>
            <option value="ATIVO">Ativo</option>
            <option value="MANUTENCAO">Em Manutenção</option>
            <option value="RESERVA">Reserva Técnica</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100 text-xs">
          <button onClick={() => setFiltroPatrimonio('todos')} className={`px-3 py-1.5 rounded-lg font-bold transition-all ${filtroPatrimonio === 'todos' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Todas</button>
          <button onClick={() => setFiltroPatrimonio('sem-patrimonio')} className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${filtroPatrimonio === 'sem-patrimonio' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 border border-red-100 hover:bg-red-100'}`}>🚨 Sem Património</button>
          <button onClick={() => setFiltroPatrimonio('com-patrimonio')} className={`px-3 py-1.5 rounded-lg font-bold transition-all ${filtroPatrimonio === 'com-patrimonio' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 border border-green-100 hover:bg-green-100'}`}>Com Património</button>
        </div>
      </div>

      {/* LISTA DE CARDS RESPONSIVA COM SKELETON */}
      <div className="grid grid-cols-1 gap-4 min-w-0 w-full">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="space-y-2 w-full sm:w-1/2">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <Skeleton className="h-10 w-28 rounded-xl shrink-0" />
            </div>
          ))
        ) : dadosFiltrados.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-medium bg-white rounded-2xl border border-slate-200 shadow-sm">
            Nenhuma impressora encontrada para os critérios selecionados.
          </div>
        ) : (
          dadosFiltrados.map(item => (
            <EquipamentoCard 
              key={item.id} 
              eq={item}  // <-- A CORREÇÃO DE OURO QUE FEZ O ECRÃ VOLTAR À VIDA
              moduloAtivo="impressoras"
              onVerDetalhes={() => { setEquipamentoSelecionado(item); setView('detalhes'); }}
              onEditar={() => { setEquipamentoSelecionado(item); setView('editar'); }}
              onDuplicar={handleDuplicar}
              onExcluir={handleExcluir}
            />
          ))
        )}
      </div>
    </div>
  )
}