import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { VERSAO_SISTEMA } from '../../config'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useModulo } from '../../contexts/ModuloContext'
import { 
  LayoutDashboard, Monitor, Wrench, CalendarDays, FileText, 
  Settings, LogOut, Bell, X, Key, Droplet, Rocket,
  ChevronLeft, ChevronRight, AlertCircle, Clock, ShieldAlert, Tag,
  ChevronsUpDown, Stethoscope, BatteryCharging, Printer, 
  ShieldCheck, Inbox, Ticket, CheckCircle2
} from 'lucide-react'

const NOMES_MODULOS = {
  medicos: 'Equipamentos Médicos',
  ti: 'Tecnologia da Informação',
  infra: 'Nobreaks & Baterias',
  manutencao: 'Manutenção Predial',
  impressoras: 'Impressoras & Copiadoras'
}

const ICONES_MODULOS = {
  medicos: Stethoscope,
  ti: Monitor,
  infra: BatteryCharging,
  manutencao: Wrench,
  impressoras: Printer
}

export default function MenuSidebar({ 
  profile, hasFullAccess, isTrocaSenhaObrigatoria, 
  isMobileMenuOpen, setIsMobileMenuOpen, handleLogout, setModalSenhaAberto 
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const { moduloAtivo, limparModulo } = useModulo()
  
  const [showNotif, setShowNotif] = useState(false)
  const [abaNotif, setAbaNotif] = useState('mensagens')
  const [alertas, setAlertas] = useState([])
  const [notificacoes, setNotificacoes] = useState([])
  const [abertas, setAbertas] = useState({})
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  const unreadAnterior = useRef(0)
  const isRetraido = isCollapsed && !isMobileMenuOpen;
  const ActiveModuleIcon = ICONES_MODULOS[moduloAtivo] || LayoutDashboard

  const tocarSomPessoal = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') ctx.resume();
      
      const playTone = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };
      playTone(880, 0, 0.15); 
    } catch (e) { console.error("Erro no áudio:", e); }
  }, []);

  const buscarNotificacoes = useCallback(async (tocarSom = false) => {
    if (!profile?.id) return;
    
    const { data } = await supabase
      .from('notificacoes')
      .select('*')
      .eq('usuario_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20)
      
    if (data) {
      const unreadAtual = data.filter(n => !n.lida).length;
      if (tocarSom && unreadAtual > unreadAnterior.current) {
        tocarSomPessoal();
      }
      unreadAnterior.current = unreadAtual;
      setNotificacoes(data);
    }
  }, [profile?.id, tocarSomPessoal])

  const buscarAlertas = useCallback(async () => {
    let novosAlertas = []
    const isModuloTecnologia = ['ti', 'impressoras'].includes(moduloAtivo)

    try {
      const [reqEtiqueta, reqPatrimonio, reqEquipCalib, reqStatusConcluido] = await Promise.all([
        !isModuloTecnologia ? supabase.from('equipamentos').select('id, nome, patrimonio').eq('possui_etiqueta', false).eq('modulo', moduloAtivo) : Promise.resolve({ data: null }),
        supabase.from('equipamentos').select('id, nome').eq('sem_patrimonio', true).eq('modulo', moduloAtivo),
        supabase.from('equipamentos').select('id, nome, patrimonio, data_proxima_calibracao').eq('modulo', moduloAtivo).not('data_proxima_calibracao', 'is', null),
        supabase.from('status_chamado').select('id').ilike('nome', '%Concluído%').maybeSingle()
      ]);

      if (reqEtiqueta.data) reqEtiqueta.data.forEach(eq => novosAlertas.push({ id: `eq-${eq.id}`, tipo: 'etiqueta', texto: `${eq.nome} (${eq.patrimonio || 'S/N'}) sem etiqueta.`, link: `/${moduloAtivo}/equipamentos`, targetId: eq.id }))
      if (reqPatrimonio.data) reqPatrimonio.data.forEach(eq => novosAlertas.push({ id: `pat-${eq.id}`, tipo: 'patrimonio', texto: `URGENTE: ${eq.nome} sem patrimônio.`, link: `/${moduloAtivo}/equipamentos`, targetId: eq.id }))

      const hojeStr = new Date().toISOString().split('T')[0]
      let query = supabase.from('chamados').select('id, tipo_intervencao, data_prevista, equipamento:equipamento_id(nome)').lte('data_prevista', hojeStr).eq('modulo', moduloAtivo)
      if (reqStatusConcluido.data) query = query.neq('status_id', reqStatusConcluido.data.id)
      
      const { data: chamadosAtrasados } = await query
      if (chamadosAtrasados) chamadosAtrasados.forEach(ch => novosAlertas.push({ id: `ch-${ch.id}`, tipo: 'manutencao', texto: `${ch.tipo_intervencao} PENDENTE: ${ch.equipamento?.nome || 'Equipamento'}`, link: `/${moduloAtivo}/chamados`, targetId: ch.id }))

      if (reqEquipCalib.data) {
        const hojeObj = new Date()
        hojeObj.setHours(0, 0, 0, 0)
        reqEquipCalib.data.forEach(eq => {
          const dataRef = new Date(eq.data_proxima_calibracao)
          dataRef.setHours(12, 0, 0, 0) 
          const diffDias = Math.ceil((dataRef - hojeObj) / (1000 * 60 * 60 * 24))

          if (diffDias <= 10 && diffDias >= 0) {
              novosAlertas.push({ id: `calib-${eq.id}`, tipo: 'calibracao', texto: `${eq.nome}: ${diffDias === 0 ? 'VENCE HOJE!' : `Vence em ${diffDias} dias`}`, link: `/${moduloAtivo}/equipamentos`, targetId: eq.id })
          } else if (diffDias < 0) {
              novosAlertas.push({ id: `calib-atr-${eq.id}`, tipo: 'calibracao_atrasada', texto: `${eq.nome}: Atrasada há ${Math.abs(diffDias)} dias!`, link: `/${moduloAtivo}/equipamentos`, targetId: eq.id })
          }
        })
      }
      setAlertas(novosAlertas)
    } catch (error) { console.error("Erro ao buscar alertas:", error) }
  }, [moduloAtivo])

  useEffect(() => {
    if (!profile?.id || isTrocaSenhaObrigatoria) return;

    buscarNotificacoes(false);

    const intervalo = setInterval(() => {
      buscarNotificacoes(true);
    }, 10000);

    const canalNotifId = `sino-sidebar-${profile.id}-${Date.now()}`
    const channelNotif = supabase
      .channel(canalNotifId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes' }, (payload) => {
        if (payload.new && payload.new.usuario_id === profile.id) {
          buscarNotificacoes(true);
        }
      })
      .subscribe()

    let canalAlertasSys = null;
    let timeoutId = null;

    if (moduloAtivo && hasFullAccess && !profile.esta_bloqueado) {
      buscarAlertas()
      const handleMudancaComDebounce = () => { clearTimeout(timeoutId); timeoutId = setTimeout(() => buscarAlertas(), 1000); };
      
      canalAlertasSys = supabase.channel(`fluxo-alertas-${moduloAtivo}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados', filter: `modulo=eq.${moduloAtivo}` }, handleMudancaComDebounce)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'equipamentos', filter: `modulo=eq.${moduloAtivo}` }, handleMudancaComDebounce)
        .subscribe();
    }

    return () => { 
      clearInterval(intervalo);
      supabase.removeChannel(channelNotif);
      if (timeoutId) clearTimeout(timeoutId);
      if (canalAlertasSys) supabase.removeChannel(canalAlertasSys);
    };
  }, [profile?.id, isTrocaSenhaObrigatoria, moduloAtivo, buscarAlertas, buscarNotificacoes, hasFullAccess])

  const unreadCount = notificacoes.filter(n => !n.lida).length
  const totalNotificacoes = (hasFullAccess ? alertas.length : 0) + unreadCount

  const marcarComoLida = async (id) => {
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id)
  }

  const marcarTodasLidas = async () => {
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })))
    await supabase.from('notificacoes').update({ lida: true }).eq('usuario_id', profile.id).eq('lida', false)
  }

  const toggleCategoria = (key) => setAbertas(prev => ({ ...prev, [key]: !prev[key] }))
  const handleTrocarModulo = () => { limparModulo(); navigate('/modulos'); }
  const isActive = (path) => location.pathname.includes(path)
  
  const handleMainMenuClick = (e, path) => {
    setIsMobileMenuOpen(false);
    if (location.pathname === path) { e.preventDefault(); window.location.href = path; }
  }

  // 🚀 Função unificada de redirecionamento do sino
  const handleNotifClick = (e, targetPath, targetId) => {
    e.preventDefault(); 
    setIsMobileMenuOpen(false); 
    setShowNotif(false); 
    const statePayload = targetId ? { openDetailsId: targetId, _t: Date.now() } : { _t: Date.now() };
    navigate(targetPath, { state: statePayload });
  }

  const handleNotifToggle = () => {
    setShowNotif(prev => !prev);
    setAbaNotif('mensagens');
  };

  const gruposRenderizados = useMemo(() => {
    if (alertas.length === 0) return null;
    const gruposPendencias = {
      calibracao_atrasada: { titulo: 'Calibrações Vencidas', icone: <ShieldAlert size={12}/>, corBadge: 'bg-red-100 text-red-800', alertas: alertas.filter(a => a.tipo === 'calibracao_atrasada') },
      manutencao: { titulo: 'Chamados Abertos', icone: <AlertCircle size={12}/>, corBadge: 'bg-amber-100 text-amber-800', alertas: alertas.filter(a => a.tipo === 'manutencao') },
      calibracao: { titulo: 'Preventivas Próximas', icone: <Clock size={12}/>, corBadge: 'bg-orange-100 text-orange-800', alertas: alertas.filter(a => a.tipo === 'calibracao') },
      patrimonio: { titulo: 'Sem Patrimônio', icone: <AlertCircle size={12}/>, corBadge: 'bg-rose-100 text-rose-800', alertas: alertas.filter(a => a.tipo === 'patrimonio') },
      etiqueta: { titulo: 'Falta Etiqueta', icone: <Tag size={12}/>, corBadge: 'bg-blue-100 text-blue-800', alertas: alertas.filter(a => a.tipo === 'etiqueta') }
    }

    return Object.entries(gruposPendencias).map(([key, grupo]) => {
      if (grupo.alertas.length === 0) return null
      const estaAberta = abertas[key]

      return (
        <div key={key} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all mb-2">
          <div onClick={() => toggleCategoria(key)} className="bg-slate-50 hover:bg-slate-100/80 px-3 py-2 cursor-pointer flex items-center justify-between text-[11px] font-bold text-slate-700 transition-colors select-none">
            <span className="flex items-center gap-1.5 text-slate-500">{grupo.icone} <span className="text-slate-700">{grupo.titulo}</span></span>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${grupo.corBadge}`}>{grupo.alertas.length}</span>
              <span className="text-slate-400 text-[10px] font-bold">{estaAberta ? '▲' : '▼'}</span>
            </div>
          </div>
          {estaAberta && (
            <div className="p-1.5 space-y-1 bg-slate-50/40 border-t border-slate-100">
              {grupo.alertas.map(al => (
                <div key={al.id} onClick={(e) => handleNotifClick(e, al.link, al.targetId)} className="cursor-pointer block text-[11px] p-2 rounded-lg bg-white border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/50 transition-all shadow-sm">
                  <span className="font-medium text-slate-700 leading-tight block">{al.texto}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    })
  }, [alertas, abertas, moduloAtivo]); 

  const menuItems = [
    { path: `/${moduloAtivo}/dashboard`, name: 'Dashboard', icon: LayoutDashboard, roles: ['administrador', 'analista'] },
    { path: `/${moduloAtivo}/equipamentos`, name: 'Equipamentos', icon: Monitor, roles: ['administrador', 'analista'] },
    { path: `/${moduloAtivo}/chamados`, name: 'Central de O.S.', icon: Wrench, roles: ['administrador', 'analista'] },
    { path: `/${moduloAtivo}/agenda`, name: 'Agenda', icon: CalendarDays, roles: ['administrador', 'analista', 'usuario'] },
    { path: `/${moduloAtivo}/suporte`, name: 'Meu Suporte', icon: AlertCircle, roles: ['usuario'] },
    { path: `/${moduloAtivo}/relatorios`, name: 'Relatórios', icon: FileText, roles: ['administrador', 'analista'] },
  ]

  return (
    <>
      {isMobileMenuOpen && <div className="fixed inset-0 bg-slate-900/70 z-40 md:hidden transition-opacity duration-300" onClick={() => setIsMobileMenuOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 bg-slate-50 border-r border-slate-200 flex flex-col z-50 transition-all duration-300 ease-in-out select-none shadow-2xl md:shadow-none ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full'} ${isTrocaSenhaObrigatoria ? 'md:hidden' : 'md:relative md:translate-x-0'} ${isRetraido ? 'md:w-20' : 'md:w-64'}`}>
        
        <div className="h-20 flex items-center justify-between px-4 bg-white border-b border-slate-100 shrink-0 relative z-10">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-700 to-blue-900 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-md shadow-blue-900/20 shrink-0">IO</div>
            {!isRetraido && (
              <div className="whitespace-nowrap transition-opacity duration-300">
                <h1 className="font-black text-slate-800 tracking-tight leading-none text-base">IOFV GESTÃO</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Sistema Integrado</p>
              </div>
            )}
          </div>
          
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="hidden md:flex absolute -right-3 top-7 w-6 h-6 bg-white border border-slate-200 rounded-full items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-300 shadow-sm transition-all z-20">
            {isRetraido ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
          <button className="md:hidden text-slate-400" onClick={() => setIsMobileMenuOpen(false)}><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col custom-scrollbar">
          <div className={`px-4 py-4 space-y-4 bg-white border-b border-slate-100 shrink-0 ${isRetraido ? 'flex flex-col items-center' : ''}`}>
            <div onClick={handleTrocarModulo} title={isRetraido ? `Mudar Ambiente: ${NOMES_MODULOS[moduloAtivo]}` : ''} className={`flex items-center gap-3 border border-transparent hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm rounded-xl cursor-pointer transition-all group ${isRetraido ? 'p-1.5 justify-center' : 'p-2'}`}>
              <div className={`rounded-xl flex items-center justify-center shrink-0 transition-colors ${isRetraido ? 'w-10 h-10 bg-slate-50 text-slate-500 group-hover:bg-blue-600 group-hover:text-white' : 'w-9 h-9 bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                <ActiveModuleIcon size={isRetraido ? 20 : 18} className="transition-transform group-hover:scale-110" />
              </div>
              {!isRetraido && (
                <>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Módulo Ativo</p>
                    <p className="font-bold text-slate-700 text-xs truncate leading-none group-hover:text-blue-800 transition-colors">{NOMES_MODULOS[moduloAtivo] || 'Carregando...'}</p>
                  </div>
                  <ChevronsUpDown size={16} className="text-slate-400 group-hover:text-blue-600 shrink-0 mr-1" />
                </>
              )}
            </div>

            {!isRetraido && (
              <div className="flex items-center justify-between px-1">
                <div className="truncate pr-2">
                  <p className="font-bold text-slate-800 text-sm truncate">{profile ? profile.nome : 'Carregando...'}</p>
                  <p className="text-[10px] font-semibold text-slate-500 capitalize mt-0.5">{hasFullAccess ? profile?.perfil : 'Acesso Limitado'}</p>
                </div>
              </div>
            )}
          </div>

          <div className={`px-3 py-3 shrink-0 relative ${isRetraido ? 'flex justify-center' : ''}`}>
            <button 
              onClick={handleNotifToggle} 
              title={isRetraido ? "Notificações & Pendências" : ""}
              className={`flex items-center ${isRetraido ? 'justify-center w-10 h-10 p-0' : 'justify-between w-full p-2.5'} bg-white border ${totalNotificacoes > 0 && !isRetraido ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200'} rounded-xl hover:border-slate-300 hover:shadow-sm transition-all group relative`}
            >
              <div className="flex items-center text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                <Bell className={`w-4 h-4 transition-transform group-hover:scale-110 ${totalNotificacoes > 0 ? 'text-rose-500' : 'text-slate-400'} ${!isRetraido && 'mr-2'}`} />
                {!isRetraido && "Notificações"}
              </div>
              {totalNotificacoes > 0 && (
                <span className={`${isRetraido ? 'absolute -top-1 -right-1 flex h-3 w-3' : 'bg-rose-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm shadow-rose-500/30'}`}>
                  {isRetraido ? (
                    <><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span></>
                  ) : ( totalNotificacoes > 99 ? '99+' : totalNotificacoes )}
                </span>
              )}
            </button>

            {/* 🚀 PAINEL FLUTUANTE CENTRALIZADO (MODAL LATERAL) À PROVA DE BUGS */}
            {showNotif && (
              <>
                <div className="fixed inset-0 z-[90] bg-slate-900/20 backdrop-blur-sm transition-all" onClick={() => setShowNotif(false)} />
                <div className={`fixed z-[100] bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200 flex flex-col w-[calc(100vw-2rem)] sm:w-[420px] max-h-[85vh] animate-in fade-in slide-in-from-left-4 duration-200
                  top-1/2 -translate-y-1/2
                  left-4
                  ${isRetraido ? 'md:left-[96px]' : 'md:left-[272px]'}
                  rounded-[2rem] overflow-hidden
                `}>
                  
                  <div className="p-5 flex items-center justify-between shrink-0 bg-slate-50/80 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100"><Bell size={18} /></div>
                      <div>
                        <h3 className="font-black text-slate-800 text-sm leading-none tracking-tight">Notificações</h3>
                        <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">Central de alertas do sistema</p>
                      </div>
                    </div>
                    <button onClick={() => setShowNotif(false)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-200 text-slate-400 transition-colors"><X size={16} /></button>
                  </div>

                  <div className="flex border-b border-slate-100 px-5 gap-5 shrink-0 bg-white pt-2">
                    <button onClick={() => setAbaNotif('mensagens')} className={`pb-3 pt-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors flex items-center gap-1.5 ${abaNotif === 'mensagens' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                      Chat & Status
                      {unreadCount > 0 && <span className="bg-rose-500 text-white px-1.5 py-0.5 rounded-md text-[9px] shadow-sm">{unreadCount}</span>}
                    </button>
                    {hasFullAccess && (
                      <button onClick={() => setAbaNotif('alertas')} className={`pb-3 pt-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors flex items-center gap-1.5 ${abaNotif === 'alertas' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                        Pendências Técnicas
                        {alertas.length > 0 && <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md text-[9px]">{alertas.length}</span>}
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-slate-50/40">
                    {abaNotif === 'mensagens' ? (
                      <div className="space-y-3">
                        <div className="flex justify-end px-1 mb-1">
                          {unreadCount > 0 && (
                            <button onClick={marcarTodasLidas} className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg transition-colors"><CheckCircle2 size={12}/> Marcar todas lidas</button>
                          )}
                        </div>
                        {notificacoes.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 rounded-2xl bg-white shadow-sm">Sem notificações novas.</div>
                        ) : (
                          notificacoes.map(notif => (
                            <div key={notif.id} onClick={(e) => { 
                                marcarComoLida(notif.id); 
                                const destinoRoute = hasFullAccess ? `/${moduloAtivo}/triagem` : `/${moduloAtivo}/suporte`;
                                handleNotifClick(e, destinoRoute, notif.chamado_id); 
                            }} className={`p-4 rounded-2xl cursor-pointer flex gap-3.5 border transition-all ${!notif.lida ? 'bg-indigo-50/70 border-indigo-200 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'}`}>
                               <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${!notif.lida ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'bg-slate-100 text-slate-400'}`}><Ticket size={16} /></div>
                               <div className="min-w-0 flex-1 pt-0.5">
                                 <p className={`text-[11px] truncate ${!notif.lida ? 'font-black text-slate-800' : 'font-bold text-slate-600'}`}>{notif.titulo}</p>
                                 <p className="text-[10px] font-medium text-slate-500 line-clamp-2 mt-1 leading-relaxed">{notif.mensagem}</p>
                                 <span className="text-[9px] font-bold text-slate-400 mt-2 block uppercase tracking-wider">{new Date(notif.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                               </div>
                               {!notif.lida && <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 mt-1 shadow-sm border-2 border-white" />}
                            </div>
                          ))
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {alertas.length === 0 ? (
                          <div className="p-8 text-center text-emerald-600 text-xs font-bold border-2 border-dashed border-emerald-200 bg-emerald-50 rounded-2xl shadow-sm">Tudo em dia! Nenhuma pendência técnica. 🎉</div>
                        ) : (
                          gruposRenderizados
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <nav className="flex-1 px-3 pb-4 space-y-1.5 pt-2">
            {menuItems.filter(item => item.roles.includes(profile?.perfil)).map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <Link key={item.path} to={item.path} title={isRetraido ? item.name : ""} onClick={(e) => handleMainMenuClick(e, item.path)} className={`group flex items-center ${isRetraido ? 'justify-center p-3' : 'px-4 py-3'} rounded-xl text-xs font-bold transition-all duration-200 ${active ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-md shadow-blue-900/20' : 'text-slate-600 hover:bg-white hover:text-blue-700 hover:shadow-sm border border-transparent hover:border-slate-200'}`}>
                  <Icon className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-blue-100' : 'text-slate-400 group-hover:text-blue-600'} ${!isRetraido && 'mr-3'}`} /> 
                  {!isRetraido && <span className="whitespace-nowrap">{item.name}</span>}
                </Link>
              )
            })}

            {moduloAtivo === 'impressoras' && hasFullAccess && (
              <Link to={`/${moduloAtivo}/bilhetagem`} title={isRetraido ? "Auditoria de Cor" : ""} onClick={(e) => handleMainMenuClick(e, `/${moduloAtivo}/bilhetagem`)} className={`group flex items-center ${isRetraido ? 'justify-center p-3' : 'px-4 py-3'} rounded-xl text-xs font-bold transition-all duration-200 ${isActive('/bilhetagem') ? 'bg-gradient-to-r from-rose-500 to-rose-700 text-white shadow-md shadow-rose-900/20' : 'text-slate-600 hover:bg-white hover:text-rose-700 hover:shadow-sm border border-transparent hover:border-slate-200'}`}>
                <Droplet className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${isActive('/bilhetagem') ? 'text-rose-100' : 'text-slate-400 group-hover:text-rose-600'} ${!isRetraido && 'mr-3'}`} /> 
                {!isRetraido && <span className="whitespace-nowrap">Auditoria de Cor</span>}
              </Link>
            )}

            <div className={`pt-4 mt-4 border-t border-slate-200/60 space-y-1.5 ${isRetraido ? 'flex flex-col items-center' : ''}`}>
              {(profile?.perfil === 'administrador' || profile?.perfil === 'analista') && (
                <Link to={`/${moduloAtivo}/triagem`} title={isRetraido ? "Triagem (Help Desk)" : ""} onClick={(e) => handleMainMenuClick(e, `/${moduloAtivo}/triagem`)} className={`group flex items-center ${isRetraido ? 'justify-center p-3' : 'px-4 py-3'} rounded-xl text-xs font-bold transition-all duration-200 ${isActive('/triagem') ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-md shadow-blue-900/20' : 'text-slate-600 hover:bg-white hover:text-blue-700 hover:shadow-sm border border-transparent hover:border-slate-200'}`}>
                  <Inbox className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${isActive('/triagem') ? 'text-blue-100' : 'text-slate-400 group-hover:text-blue-600'} ${!isRetraido && 'mr-3'}`} /> 
                  {!isRetraido && <span className="whitespace-nowrap">Triagem (Help Desk)</span>}
                </Link>
              )}

              {profile?.perfil === 'administrador' && (
                <>
                  <Link to={`/${moduloAtivo}/configuracoes`} title={isRetraido ? "Configurações" : ""} onClick={(e) => handleMainMenuClick(e, `/${moduloAtivo}/configuracoes`)} className={`group flex items-center ${isRetraido ? 'justify-center p-3 w-10 h-10' : 'px-4 py-3'} rounded-xl text-xs font-bold transition-all duration-200 ${isActive('/configuracoes') ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm border border-transparent hover:border-slate-200'}`}>
                    <Settings className={`w-4 h-4 transition-transform duration-200 group-hover:rotate-90 ${isActive('/configuracoes') ? 'text-slate-300' : 'text-slate-400 group-hover:text-slate-800'} ${!isRetraido && 'mr-3'}`} /> 
                    {!isRetraido && <span className="whitespace-nowrap">Configurações</span>}
                  </Link>

                  <Link to={`/${moduloAtivo}/logs`} title={isRetraido ? "Auditoria do Sistema" : ""} onClick={(e) => handleMainMenuClick(e, `/${moduloAtivo}/logs`)} className={`group flex items-center ${isRetraido ? 'justify-center p-3 w-10 h-10' : 'px-4 py-3'} rounded-xl text-xs font-bold transition-all duration-200 ${isActive('/logs') ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm border border-transparent hover:border-slate-200'}`}>
                    <ShieldCheck className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${isActive('/logs') ? 'text-slate-300' : 'text-slate-400 group-hover:text-slate-800'} ${!isRetraido && 'mr-3'}`} /> 
                    {!isRetraido && <span className="whitespace-nowrap">Auditoria (Logs)</span>}
                  </Link>
                </>
              )}
              
              <Link to={`/${moduloAtivo}/releases`} title={isRetraido ? "Notas de Atualização" : ""} onClick={(e) => handleMainMenuClick(e, `/${moduloAtivo}/releases`)} className={`group flex items-center ${isRetraido ? 'justify-center p-3 w-10 h-10' : 'px-4 py-3'} rounded-xl text-xs font-bold transition-all duration-200 ${isActive('/releases') ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-white hover:text-indigo-700 hover:shadow-sm border border-transparent hover:border-slate-200'}`}>
                <Rocket className={`w-4 h-4 transition-transform duration-200 group-hover:-translate-y-1 group-hover:translate-x-1 ${isActive('/releases') ? 'text-indigo-200' : 'text-slate-400 group-hover:text-indigo-600'} ${!isRetraido && 'mr-3'}`} /> 
                {!isRetraido && <span className="whitespace-nowrap">Notas de Atualização</span>}
              </Link>
            </div>
          </nav>
        </div> 

        <div className={`p-4 bg-white border-t border-slate-100 shrink-0 relative z-10 ${isRetraido ? 'flex flex-col gap-2' : 'space-y-2'}`}>
          <div className={`flex ${isRetraido ? 'flex-col' : ''} gap-2`}>
            <button onClick={() => setModalSenhaAberto(true)} title={isRetraido ? "Mudar Senha" : ""} className={`flex-1 flex ${isRetraido ? 'flex-col p-2' : 'flex-col py-2'} items-center justify-center text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors group`}>
              <Key className={`w-4 h-4 transition-transform group-hover:scale-110 ${!isRetraido && 'mb-1'}`} />
              {!isRetraido && <span className="text-[9px] font-bold uppercase tracking-wider">Senha</span>}
            </button>
            <button onClick={handleLogout} title={isRetraido ? "Sair" : ""} className={`flex-1 flex ${isRetraido ? 'flex-col p-2' : 'flex-col py-2'} items-center justify-center text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors group`}>
              <LogOut className={`w-4 h-4 transition-transform group-hover:scale-110 ${!isRetraido && 'mb-1'}`} />
              {!isRetraido && <span className="text-[9px] font-bold uppercase tracking-wider">Sair</span>}
            </button>
          </div>
          {!isRetraido && (
            <div className="text-center pt-2 overflow-hidden">
              <span className="text-[9px] font-black text-slate-300 tracking-widest whitespace-nowrap">RELEASE {VERSAO_SISTEMA}</span>
            </div>
          )}
        </div>

      </aside>
    </>
  )
}