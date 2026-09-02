import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useModulo } from '../../contexts/ModuloContext'
import { Plus, AlertCircle, Ticket, Search, Filter } from 'lucide-react'
import { Skeleton } from '../../components/ui/Skeleton'

import CardSolicitacao from './components/CardSolicitacao'
import ModalNovoChamado from './components/ModalNovoChamado'
import ModalDetalhesChamado from './components/ModalDetalhesChamado'

export default function PortalSuportePage() {
  const { profile } = useAuth()
  const { moduloAtivo } = useModulo()
  
  const [solicitacoes, setSolicitacoes] = useState([])
  const [equipamentos, setEquipamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [chamadoSelecionado, setChamadoSelecionado] = useState(null)

  const [termoPesquisa, setTermoPesquisa] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')

  const carregarDados = useCallback(async (isBackground = false) => {
    if (!profile?.id || !moduloAtivo) return
    if (!isBackground) setLoading(true)

    const [reqEquipamentos, reqSolicitacoes] = await Promise.all([
      supabase
        .from('equipamentos')
        .select('id, nome, patrimonio')
        .eq('modulo', moduloAtivo)
        .order('nome'),
      supabase
        .from('solicitacoes_suporte')
        .select('*, equipamento:equipamentos(nome, patrimonio, modulo), tecnico:perfis!tecnico_responsavel_id(nome)')
        .eq('solicitante_id', profile.id)
        .order('created_at', { ascending: false })
    ])

    if (reqEquipamentos.data) setEquipamentos(reqEquipamentos.data)
    if (reqSolicitacoes.data) {
      const chamadosModulo = reqSolicitacoes.data.filter(s => s.equipamento?.modulo === moduloAtivo)
      setSolicitacoes(chamadosModulo)
    }

    setLoading(false)
  }, [profile?.id, moduloAtivo])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  useEffect(() => {
    if (!profile?.id) return;
    const canalId = `portal-cliente-${profile.id}-${Date.now()}`;
    const channel = supabase.channel(canalId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacoes_suporte', filter: `solicitante_id=eq.${profile.id}` }, () => {
        carregarDados(true);
      }).subscribe();

    return () => { supabase.removeChannel(channel) };
  }, [profile?.id, carregarDados])

  const chamadosFiltrados = useMemo(() => {
    return solicitacoes.filter(req => {
      const statusEncerrados = ['Resolvido', 'Rejeitado', 'Cancelado pelo Utilizador'];
      const isEncerrado = statusEncerrados.includes(req.status);
      
      if (filtroStatus === 'abertos' && isEncerrado) return false;
      if (filtroStatus === 'encerrados' && !isEncerrado) return false;

      if (termoPesquisa.trim()) {
        const termo = termoPesquisa.toLowerCase();
        const numTicket = req.numero_ticket ? `#${String(req.numero_ticket).padStart(5, '0')}` : '';
        const matchTicket = numTicket.includes(termo);
        const matchTitulo = req.titulo?.toLowerCase().includes(termo);
        const matchEquip = req.equipamento?.nome?.toLowerCase().includes(termo);
        const matchPat = req.equipamento?.patrimonio?.toLowerCase().includes(termo);
        
        if (!matchTicket && !matchTitulo && !matchEquip && !matchPat) return false;
      }

      return true;
    })
  }, [solicitacoes, filtroStatus, termoPesquisa])

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300 pb-10">
      
      <div className="flex flex-col gap-4 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-800 flex items-center gap-3 tracking-tight uppercase">
              <AlertCircle className="text-indigo-600" size={32} /> Central de Suporte
            </h1>
            <p className="text-sm font-semibold text-slate-500 mt-1">
              Solicite manutenção ou comunique problemas à equipa técnica.
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => setModalAberto(true)} 
              className="px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/30 active:scale-95 flex items-center justify-center gap-2 flex-1 md:flex-initial shrink-0"
            >
              <Plus size={20} /> Relatar Problema
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por título, equipamento..." 
              value={termoPesquisa}
              onChange={e => setTermoPesquisa(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-sm font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="hidden sm:flex items-center justify-center w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 shrink-0">
              <Filter size={18} className="text-slate-400" />
            </div>
            <select 
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value)}
              className="w-full sm:w-auto px-4 py-3 bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option value="todos">Todos os Chamados</option>
              <option value="abertos">Apenas Em Andamento</option>
              <option value="encerrados">Apenas Encerrados/Cancelados</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-[2rem]" />)
        ) : chamadosFiltrados.length === 0 ? (
          <div className="col-span-full bg-slate-50 border border-slate-200 border-dashed rounded-[2rem] p-12 text-center flex flex-col items-center">
            <Ticket size={48} className="text-slate-300 mb-4" />
            <h3 className="text-lg font-black text-slate-500">Nenhum chamado encontrado</h3>
            <p className="text-sm font-semibold text-slate-400 mt-1">Ajuste os filtros de pesquisa ou abra um novo ticket.</p>
          </div>
        ) : (
          chamadosFiltrados.map(req => (
            <CardSolicitacao 
              key={req.id} 
              item={req} 
              onClick={() => setChamadoSelecionado(req)} 
            />
          ))
        )}
      </div>

      <ModalNovoChamado 
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        onSuccess={() => carregarDados(true)}
        equipamentos={equipamentos}
        usuarioId={profile?.id}
      />

      <ModalDetalhesChamado 
        isOpen={!!chamadoSelecionado}
        onClose={() => setChamadoSelecionado(null)}
        chamado={chamadoSelecionado}
        usuarioId={profile?.id}
        onAtualizar={() => carregarDados(true)}
      />
    </div>
  )
}