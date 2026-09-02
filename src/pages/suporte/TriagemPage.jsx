import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Inbox, Search, CheckCircle2, Ticket, PauseCircle, Layers, AlertCircle, User, Wrench, Monitor, X, Maximize2 } from 'lucide-react'
import toast from 'react-hot-toast'
import CartaoKanban from './components/CartaoKanban'
import ModalTriagem from './components/ModalTriagem'
import { enviarNotificacao } from '../../utils/notificacoes'

const COLUNAS_KANBAN = [
  { id: 'Enviado', titulo: 'Fila / Entrada', icone: Inbox, corBg: 'bg-slate-100', corHeader: 'bg-slate-200', corTexto: 'text-slate-700' },
  { id: 'Em Análise', titulo: 'Em Triagem (Analista)', icone: Search, corBg: 'bg-amber-50', corHeader: 'bg-amber-200', corTexto: 'text-amber-800' },
  { id: 'Pausado', titulo: 'Pausados', icone: PauseCircle, corBg: 'bg-purple-50', corHeader: 'bg-purple-200', corTexto: 'text-purple-800' },
  { id: 'O.S. Gerada', titulo: 'Em Execução (O.S.)', icone: Wrench, corBg: 'bg-blue-50', corHeader: 'bg-blue-200', corTexto: 'text-blue-800' },
  { id: 'Encerrados', titulo: 'Encerrados/Concluidos', icone: CheckCircle2, corBg: 'bg-green-50', corHeader: 'bg-green-200', corTexto: 'text-slate-700' }
]

const TODOS_MODULOS_SISTEMA = [
  { id: 'medicos', nome: 'Equipamentos Médicos' },
  { id: 'ti', nome: 'Tecnologia da Informação' },
  { id: 'infra', nome: 'Nobreaks & Baterias' },
  { id: 'impressoras', nome: 'Impressoras & Copiadoras' },
  { id: 'manutencao', nome: 'Manutenção Predial' }
]

let globalAudioCtx = null;
const inicializarAudioGlobal = () => {
  try {
    if (!globalAudioCtx) globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (globalAudioCtx.state === 'suspended') globalAudioCtx.resume();
  } catch (e) { console.error(e) }
};

export const tocarAlarmeGlobal = () => {
  if (!globalAudioCtx || globalAudioCtx.state === 'suspended') return;
  try {
    const notas = [523.25, 659.25, 783.99];
    notas.forEach((freq, index) => {
      const startTime = globalAudioCtx.currentTime + (index * 0.1);
      const osc = globalAudioCtx.createOscillator();
      const gain = globalAudioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.5);
      osc.connect(gain);
      gain.connect(globalAudioCtx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  } catch (e) { console.error(e) }
};

const ColunaTriagem = ({ coluna, chamadosFiltrados, setChamadoSelecionado, handleDrop, isTvMode }) => {
  const Icone = coluna.icone;
  const tickets = chamadosFiltrados.filter(c => coluna.id === 'Encerrados' ? ['Resolvido', 'Cancelado pelo Utilizador', 'Rejeitado'].includes(c.status) : c.status === coluna.id);

  return (
    <div onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }} onDrop={(e) => handleDrop(e, coluna.id)} 
         className={`flex-1 flex flex-col h-full rounded-[2rem] border border-slate-200 overflow-hidden ${coluna.corBg} transition-colors snap-center
         ${isTvMode ? 'min-w-[320px] max-w-[450px]' : 'min-w-[280px] max-w-[340px]'}`}>
      <div className={`p-4 ${coluna.corHeader} flex items-center justify-between shrink-0`}>
        <div className={`flex items-center gap-2 font-black uppercase tracking-widest text-xs ${coluna.corTexto}`}>
          <Icone size={16} /> {coluna.titulo}
        </div>
        <span className="bg-white/70 text-slate-800 text-[10px] font-black px-2.5 py-1 rounded-lg shadow-sm">{tickets.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {tickets.length === 0 ? (
          <div className="h-24 border-2 border-dashed border-slate-300/50 rounded-2xl flex items-center justify-center text-slate-400 text-xs font-bold">Sem tickets</div>
        ) : (
          tickets.map(ticket => <CartaoKanban key={ticket.id} ticket={ticket} onOpen={setChamadoSelecionado} />)
        )}
      </div>
    </div>
  )
}

export default function TriagemPage() {
  const { profile } = useAuth()
  const [chamados, setChamados] = useState([])
  const [loading, setLoading] = useState(true)
  const [chamadoSelecionado, setChamadoSelecionado] = useState(null)
  const [opcoesFilas, setOpcoesFilas] = useState([])
  const [filaSelecionada, setFilaSelecionada] = useState('')
  const [termoPesquisa, setTermoPesquisa] = useState('')
  const [filtroResponsavel, setFiltroResponsavel] = useState('todos')
  const [modalAcao, setModalAcao] = useState({ aberto: false, tipo: '', chamadoId: null, novoStatus: '' })
  const [justificativaDrop, setJustificativaDrop] = useState('')
  const [modoMonitorAberto, setModoMonitorAberto] = useState(false)

  const filaRef = useRef(filaSelecionada)
  const opcoesRef = useRef(opcoesFilas)
  const ultimoIdConhecidoRef = useRef(null)
  const primeiraCargaRef = useRef(true)

  useEffect(() => {
    filaRef.current = filaSelecionada; opcoesRef.current = opcoesFilas;
  }, [filaSelecionada, opcoesFilas])

  useEffect(() => {
    const destravar = () => inicializarAudioGlobal();
    window.addEventListener('click', destravar);
    window.addEventListener('keydown', destravar);
    return () => { window.removeEventListener('click', destravar); window.removeEventListener('keydown', destravar); }
  }, []);

  useEffect(() => {
    if (!profile) return;
    let modulosPermitidos = profile.perfil === 'administrador' ? TODOS_MODULOS_SISTEMA.map(m => m.id) : (profile.modulos_acesso || []);
    const opcoesGeradas = [];
    if (modulosPermitidos.length > 0) {
      opcoesGeradas.push({ id: 'todas', nome: 'Todas as Minhas Filas', modulos: modulosPermitidos });
      modulosPermitidos.forEach(modId => {
        const modInfo = TODOS_MODULOS_SISTEMA.find(m => m.id === modId);
        if (modInfo) opcoesGeradas.push({ id: modId, nome: modInfo.nome, modulos: [modId] });
      });
    }
    setOpcoesFilas(opcoesGeradas);
    if (opcoesGeradas.length > 0) setFilaSelecionada('todas');
    else setLoading(false);
  }, [profile])

  const buscarChamadosInstantaneo = useCallback(async (isPolling = false) => {
    const filaAtual = filaRef.current;
    const opcoesAtuais = opcoesRef.current;
    if (!filaAtual || opcoesAtuais.length === 0) { setChamados([]); setLoading(false); return; }

    const filaObj = opcoesAtuais.find(f => f.id === filaAtual);
    const modulosAlvo = filaObj ? filaObj.modulos : [];

    if (modulosAlvo.length === 0) { setChamados([]); setLoading(false); return; }

    try {
      const { data: equipData } = await supabase.from('equipamentos').select('id').in('modulo', modulosAlvo);
      const idsEquips = (equipData || []).map(e => e.id);
      
      if (idsEquips.length === 0) { setChamados([]); return; }

      const { data } = await supabase
        .from('solicitacoes_suporte')
        .select(`*, equipamento:equipamentos(id, nome, patrimonio, modulo), solicitante:perfis!solicitante_id(nome, setor, ramal), tecnico:perfis!tecnico_responsavel_id(nome), sla:slas(id, nome, cor, tempo_resolucao_horas)`)
        .in('equipamento_id', idsEquips)
        .order('created_at', { ascending: false });

      if (data) {
        if (data.length > 0) {
          const idMaisRecente = data[0].id;
          if (isPolling && !primeiraCargaRef.current && ultimoIdConhecidoRef.current !== idMaisRecente) {
            tocarAlarmeGlobal();
          }
          ultimoIdConhecidoRef.current = idMaisRecente;
        }
        primeiraCargaRef.current = false;
        
        setChamados(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [])

  useEffect(() => { if (filaSelecionada) buscarChamadosInstantaneo(false); }, [filaSelecionada, buscarChamadosInstantaneo])

  useEffect(() => {
    const onFocus = () => buscarChamadosInstantaneo(true);
    window.addEventListener('focus', onFocus);
    
    const intervalo = setInterval(() => {
      if (document.hidden) return;
      buscarChamadosInstantaneo(true);
    }, 5000);

    const canalId = `triagem-rt-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const channel = supabase.channel(canalId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacoes_suporte' }, (payload) => {
        if (payload.eventType === 'INSERT') tocarAlarmeGlobal();
        buscarChamadosInstantaneo(false);
      }).subscribe();

    return () => { 
      clearInterval(intervalo);
      window.removeEventListener('focus', onFocus);
      supabase.removeChannel(channel); 
    };
  }, [buscarChamadosInstantaneo]);

  const abrirModoMonitor = () => {
    inicializarAudioGlobal(); tocarAlarmeGlobal(); setModoMonitorAberto(true);
    setTimeout(() => {
      const elemento = document.documentElement;
      if (elemento.requestFullscreen) elemento.requestFullscreen().catch(() => {});
      else if (elemento.webkitRequestFullscreen) elemento.webkitRequestFullscreen();
    }, 100);
  }

  const fecharModoMonitor = () => {
    setModoMonitorAberto(false);
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  }

  const chamadosFiltrados = useMemo(() => {
    return chamados.filter(c => {
      if (filtroResponsavel === 'meus' && c.tecnico_responsavel_id !== profile?.id) return false;
      if (filtroResponsavel === 'sem_dono' && c.tecnico_responsavel_id !== null) return false;
      if (termoPesquisa.trim()) {
        const termo = termoPesquisa.toLowerCase();
        const numTicket = c.numero_ticket ? `#${String(c.numero_ticket).padStart(5, '0')}` : '';
        if (!numTicket.includes(termo) && !c.titulo?.toLowerCase().includes(termo) && !c.equipamento?.nome?.toLowerCase().includes(termo) && !c.equipamento?.patrimonio?.toLowerCase().includes(termo)) return false;
      }
      return true;
    });
  }, [chamados, filtroResponsavel, termoPesquisa, profile?.id]);

  const executarMovimentoKanban = async (id, novoStatus, justificativa, tecnicoIdAtribuido) => {
    const payloadUpdate = { status: novoStatus, justificativa: justificativa };
    if (tecnicoIdAtribuido !== undefined) payloadUpdate.tecnico_responsavel_id = tecnicoIdAtribuido;

    // 🚀 ADICIONE ISTO: Se arrastar o card para os Encerrados, regista a hora
    if (['Resolvido', 'Encerrado', 'Concluído'].includes(novoStatus)) {
      payloadUpdate.data_resolucao = new Date().toISOString()
    }

    setChamados(prev => prev.map(c => c.id === id ? { ...c, ...payloadUpdate, tecnico: tecnicoIdAtribuido === profile.id ? { nome: profile.nome } : c.tecnico } : c));
    const { error } = await supabase.from('solicitacoes_suporte').update(payloadUpdate).eq('id', id);
    if (error) { 
      toast.error('Erro ao mover.'); 
      buscarChamadosInstantaneo(false); 
    } else {
      // 🚀 NOTIFICAR O CLIENTE DA MUDANÇA DE STATUS NO KANBAN
      const chamadoMovido = chamados.find(c => c.id === id);
      if (chamadoMovido && chamadoMovido.solicitante_id) {
        const numTicket = chamadoMovido.numero_ticket ? `#${String(chamadoMovido.numero_ticket).padStart(5, '0')}` : '#00001';
        await enviarNotificacao(
          chamadoMovido.solicitante_id, 
          'Atualização no Chamado', 
          `O seu chamado ${numTicket} avançou para o status: ${novoStatus}.`, 
          id
        );
      }
    }
    setModalAcao({ aberto: false, tipo: '', chamadoId: null, novoStatus: '' }); setJustificativaDrop('');
  }

  const handleConfirmarAcaoDrop = (statusSobrescrito) => {
    const statusFinal = typeof statusSobrescrito === 'string' ? statusSobrescrito : modalAcao.novoStatus;
    if (['pausar', 'encerrar', 'rejeitar'].includes(modalAcao.tipo) && !justificativaDrop.trim()) { toast.error('Justificativa é obrigatória.'); return; }
    executarMovimentoKanban(modalAcao.chamadoId, statusFinal, justificativaDrop.trim(), modalAcao.tipo === 'assumir' ? profile.id : undefined);
  }

  const handleDrop = (e, colunaId) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId) return;

    const chamadoArrastado = chamados.find(c => c.id === draggedId);
    if (!chamadoArrastado || chamadoArrastado.status === colunaId || (colunaId === 'Encerrados' && ['Resolvido', 'Rejeitado'].includes(chamadoArrastado.status))) return;
    if (colunaId === 'O.S. Gerada' && chamadoArrastado.status !== 'O.S. Gerada') { toast.error('Abra o ticket e clique em "Gerar O.S".'); return; }

    if (colunaId === 'Encerrados') return setModalAcao({ aberto: true, tipo: 'encerrar', chamadoId: draggedId, novoStatus: 'Resolvido' });
    if (colunaId === 'Pausado') return setModalAcao({ aberto: true, tipo: 'pausar', chamadoId: draggedId, novoStatus: 'Pausado' });
    if (colunaId === 'Em Análise' && !chamadoArrastado.tecnico_responsavel_id && profile?.id) return setModalAcao({ aberto: true, tipo: 'assumir', chamadoId: draggedId, novoStatus: 'Em Análise' });

    executarMovimentoKanban(draggedId, colunaId, chamadoArrastado.justificativa, undefined);
  }

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold">A carregar interface...</div>;

  return (
    <div className="w-full h-[calc(100vh-100px)] flex flex-col space-y-6 animate-in fade-in duration-300 min-w-0 relative">
      
      {modoMonitorAberto && (
        <div className="fixed inset-0 bg-slate-950 z-[99999] flex flex-col p-6 overflow-hidden animate-in fade-in duration-200">
          <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black"><Monitor size={22} /></div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Painel Monitor de Triagem (Tempo Real)</h2>
              </div>
            </div>
            <button onClick={fecharModoMonitor} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold uppercase transition-colors flex items-center gap-2"><X size={16} /> Fechar Monitor</button>
          </div>
          <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar">
            <div className="flex gap-6 h-full min-w-[1350px] items-start justify-center">
              {COLUNAS_KANBAN.map(coluna => <ColunaTriagem key={coluna.id} coluna={coluna} chamadosFiltrados={chamadosFiltrados} setChamadoSelecionado={() => {}} handleDrop={() => {}} isTvMode={true} />)}
            </div>
          </div>
        </div>
      )}

      {modalAcao.aberto && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-6 max-w-md w-full shadow-2xl flex flex-col items-center text-center space-y-4">
            {modalAcao.tipo === 'assumir' ? (
              <>
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-2"><AlertCircle size={32} /></div>
                <div><h3 className="text-xl font-black text-slate-800">Capturar Ticket?</h3></div>
                <div className="w-full space-y-2 pt-2">
                  <button onClick={handleConfirmarAcaoDrop} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-black uppercase text-xs">Sim, Assumir</button>
                  <button onClick={() => executarMovimentoKanban(modalAcao.chamadoId, modalAcao.novoStatus, null, null)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-xl font-bold uppercase text-xs">Não, Apenas Mover</button>
                </div>
              </>
            ) : (
              <>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${modalAcao.tipo === 'encerrar' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'}`}>
                  {modalAcao.tipo === 'encerrar' ? <CheckCircle2 size={32} /> : <PauseCircle size={32} />}
                </div>
                <div className="w-full">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">{modalAcao.tipo === 'encerrar' ? 'Encerrar Chamado' : 'Pausar Chamado'}</h3>
                  <textarea rows="3" autoFocus placeholder="Justificativa..." value={justificativaDrop} onChange={e => setJustificativaDrop(e.target.value)} className="w-full mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-slate-700 font-medium" />
                </div>
                <div className="w-full flex gap-2 pt-2">
                  {modalAcao.tipo === 'encerrar' ? (
                    <>
                      <button onClick={() => handleConfirmarAcaoDrop('Resolvido')} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-black uppercase text-[10px]">Resolvido</button>
                      <button onClick={() => handleConfirmarAcaoDrop('Rejeitado')} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-black uppercase text-[10px]">Rejeitar</button>
                    </>
                  ) : (
                    <button onClick={() => handleConfirmarAcaoDrop()} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-black uppercase text-[10px]">Confirmar</button>
                  )}
                </div>
              </>
            )}
            <button onClick={() => { setModalAcao({ aberto: false, tipo: '', chamadoId: null, novoStatus: '' }); setJustificativaDrop('') }} className="w-full text-xs font-bold text-slate-400 py-2 mt-2">Cancelar</button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm shrink-0">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight uppercase"><Ticket className="text-indigo-600" size={32} /> Central de Triagem</h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={abrirModoMonitor} className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2"><Maximize2 size={16} /> Modo TV</button>
            <div className="flex items-center gap-2 bg-indigo-50/50 p-2 rounded-2xl border border-indigo-100 shrink-0">
              <Layers size={18} className="text-indigo-600 ml-2" />
              <select value={filaSelecionada} onChange={(e) => setFilaSelecionada(e.target.value)} className="px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 outline-none cursor-pointer">
                {opcoesFilas.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Buscar por título ou ticket..." value={termoPesquisa} onChange={e => setTermoPesquisa(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"/>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 shrink-0"><User size={16} className="text-slate-400" /></div>
            <select value={filtroResponsavel} onChange={e => setFiltroResponsavel(e.target.value)} className="w-full sm:w-auto px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer">
              <option value="todos">Todos os Responsáveis</option>
              <option value="meus">Meus Chamados</option>
              <option value="sem_dono">Aguardando Captura</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0 pb-4 custom-scrollbar snap-x snap-mandatory overscroll-x-contain">
        <div className="flex gap-6 h-full min-w-[1450px] items-start px-2 md:px-0">
          {COLUNAS_KANBAN.map(coluna => <ColunaTriagem key={coluna.id} coluna={coluna} chamadosFiltrados={chamadosFiltrados} setChamadoSelecionado={setChamadoSelecionado} handleDrop={handleDrop} isTvMode={false} />)}
        </div>
      </div>

      <ModalTriagem isOpen={!!chamadoSelecionado} onClose={() => setChamadoSelecionado(null)} chamado={chamadoSelecionado} onAtualizar={() => buscarChamadosInstantaneo(false)} />
    </div>
  )
}