import { useState, useEffect, useMemo, useCallback } from 'react'
import { VERSAO_SISTEMA } from '../../config'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useModulo } from '../../contexts/ModuloContext'
import { 
  LayoutDashboard, Monitor, Wrench, CalendarDays, FileText, 
  Settings, LogOut, Bell, X, Key, Droplet, Rocket,
  ChevronLeft, ChevronRight, AlertCircle, Clock, ShieldAlert, Tag,
  ChevronsUpDown, Stethoscope, BatteryCharging, Printer
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
  const [alertas, setAlertas] = useState([])
  const [abertas, setAbertas] = useState({})
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  const isRetraido = isCollapsed && !isMobileMenuOpen;
  const ActiveModuleIcon = ICONES_MODULOS[moduloAtivo] || LayoutDashboard

  const buscarAlertas = useCallback(async () => {
    let novosAlertas = []
    const isModuloTecnologia = ['ti', 'impressoras'].includes(moduloAtivo)

    try {
      const [reqEtiqueta, reqPatrimonio, reqEquipCalib, reqStatusConcluido] = await Promise.all([
        !isModuloTecnologia 
          ? supabase.from('equipamentos').select('id, nome, patrimonio').eq('possui_etiqueta', false).eq('modulo', moduloAtivo) 
          : Promise.resolve({ data: null }),
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
    if (!moduloAtivo) return;

    if (profile && !profile.esta_bloqueado && !isTrocaSenhaObrigatoria) {
      buscarAlertas()
      
      let timeoutId;
      const handleMudancaComDebounce = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => buscarAlertas(), 1000); 
      };
      
      const canalNotificacoes = supabase
        .channel(`fluxo-alertas-${moduloAtivo}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados', filter: `modulo=eq.${moduloAtivo}` }, handleMudancaComDebounce)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'equipamentos', filter: `modulo=eq.${moduloAtivo}` }, handleMudancaComDebounce)
        .subscribe();
        
      return () => { 
        clearTimeout(timeoutId);
        supabase.removeChannel(canalNotificacoes); 
      };
    }
  }, [profile, isTrocaSenhaObrigatoria, moduloAtivo, buscarAlertas])

  const toggleCategoria = (key) => setAbertas(prev => ({ ...prev, [key]: !prev[key] }))
  const handleTrocarModulo = () => { limparModulo(); navigate('/modulos'); }
  const isActive = (path) => location.pathname.includes(path)
  
  const handleMainMenuClick = (e, path) => {
    setIsMobileMenuOpen(false);
    if (location.pathname === path) { e.preventDefault(); window.location.href = path; }
  }

  const handleNotifClick = (e, path, targetId) => {
    e.preventDefault(); 
    setIsMobileMenuOpen(false);
    setShowNotif(false); 
    const targetPath = !hasFullAccess ? `/${moduloAtivo}/agenda` : path;
    const statePayload = targetId ? { openDetailsId: targetId, _t: Date.now() } : { _t: Date.now() };
    navigate(targetPath, { state: statePayload });
  }

  const handleNotifToggle = () => setShowNotif(prev => !prev);

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
          <div 
            onClick={() => toggleCategoria(key)}
            className="bg-slate-50 hover:bg-slate-100/80 px-3 py-2 cursor-pointer flex items-center justify-between text-[11px] font-bold text-slate-700 transition-colors select-none"
          >
            <span className="flex items-center gap-1.5 text-slate-500">
              {grupo.icone} <span className="text-slate-700">{grupo.titulo}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${grupo.corBadge}`}>
                {grupo.alertas.length}
              </span>
              <span className="text-slate-400 text-[10px] font-bold">{estaAberta ? '▲' : '▼'}</span>
            </div>
          </div>

          {estaAberta && (
            <div className="p-1.5 space-y-1 bg-slate-50/40 border-t border-slate-100">
              {grupo.alertas.map(al => (
                <div 
                  key={al.id} 
                  onClick={(e) => handleNotifClick(e, al.link, al.targetId)} 
                  className="cursor-pointer block text-[11px] p-2 rounded-lg bg-white border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/50 transition-all shadow-sm"
                >
                  <span className="font-medium text-slate-700 leading-tight block">{al.texto}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    })
  }, [alertas, abertas]); 

  const listaNotificacoes = alertas.length === 0 ? (
    <div className="p-3 text-center bg-emerald-50/50 border border-emerald-100 rounded-xl">
      <p className="text-[11px] font-bold text-emerald-700">Tudo em dia! 🎉</p>
    </div>
  ) : gruposRenderizados;

  const menuItems = [
    { path: `/${moduloAtivo}/dashboard`, name: 'Dashboard', icon: LayoutDashboard, roles: ['administrador', 'analista'] },
    { path: `/${moduloAtivo}/equipamentos`, name: 'Equipamentos', icon: Monitor, roles: ['administrador', 'analista'] },
    { path: `/${moduloAtivo}/chamados`, name: 'Chamados', icon: Wrench, roles: ['administrador', 'analista'] },
    { path: `/${moduloAtivo}/agenda`, name: 'Agenda', icon: CalendarDays, roles: ['administrador', 'analista', 'visualizador'] },
    { path: `/${moduloAtivo}/relatorios`, name: 'Relatórios', icon: FileText, roles: ['administrador', 'analista'] },
  ]

  return (
    <>
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 bg-slate-50 border-r border-slate-200 flex flex-col z-50 
        transition-all duration-300 ease-in-out select-none shadow-2xl md:shadow-none
        ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full'} 
        ${isTrocaSenhaObrigatoria ? 'md:hidden' : 'md:relative md:translate-x-0'}
        ${isRetraido ? 'md:w-20' : 'md:w-64'}
      `}>
        
        {/* CABEÇALHO / LOGO */}
        <div className="h-20 flex items-center justify-between px-4 bg-white border-b border-slate-100 shrink-0 relative z-10">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-700 to-blue-900 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-md shadow-blue-900/20 shrink-0">
              IO
            </div>
            {!isRetraido && (
              <div className="whitespace-nowrap transition-opacity duration-300">
                <h1 className="font-black text-slate-800 tracking-tight leading-none text-base">IOFV GESTÃO</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Sistema Integrado</p>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="hidden md:flex absolute -right-3 top-7 w-6 h-6 bg-white border border-slate-200 rounded-full items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-300 shadow-sm transition-all z-20"
          >
            {isRetraido ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          <button className="md:hidden text-slate-400" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* ÁREA DE SCROLL UNIFICADA */}
        <div className="flex-1 overflow-y-auto flex flex-col 
          [&::-webkit-scrollbar]:w-1.5 
          [&::-webkit-scrollbar-track]:bg-transparent 
          [&::-webkit-scrollbar-thumb]:bg-slate-200/60 
          [&::-webkit-scrollbar-thumb]:rounded-full 
          hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 transition-colors"
        >
          {/* SELETOR DE AMBIENTE */}
          <div className={`px-4 py-4 space-y-4 bg-white border-b border-slate-100 shrink-0 ${isRetraido ? 'flex flex-col items-center' : ''}`}>
            <div 
              onClick={handleTrocarModulo} 
              title={isRetraido ? `Mudar Ambiente: ${NOMES_MODULOS[moduloAtivo]}` : ''}
              className={`flex items-center gap-3 border border-transparent hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm rounded-xl cursor-pointer transition-all group ${isRetraido ? 'p-1.5 justify-center' : 'p-2'}`}
            >
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

          {/* PENDÊNCIAS */}
          <div className={`px-3 py-3 shrink-0 relative ${isRetraido ? 'flex justify-center' : ''}`}>
            <button 
              onClick={handleNotifToggle} 
              title={isRetraido ? "Central de Pendências" : ""}
              className={`flex items-center ${isRetraido ? 'justify-center w-10 h-10 p-0' : 'justify-between w-full p-2.5'} bg-white border ${alertas.length > 0 && !isRetraido ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200'} rounded-xl hover:border-slate-300 hover:shadow-sm transition-all group relative`}
            >
              <div className="flex items-center text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                <Bell className={`w-4 h-4 transition-transform group-hover:scale-110 ${alertas.length > 0 ? 'text-rose-500' : 'text-slate-400'} ${!isRetraido && 'mr-2'}`} />
                {!isRetraido && "Pendências"}
              </div>
              {alertas.length > 0 && (
                <span className={`${isRetraido ? 'absolute -top-1 -right-1 flex h-3 w-3' : 'bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm shadow-rose-500/30'}`}>
                  {isRetraido ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                    </>
                  ) : (
                    alertas.length > 99 ? '99+' : alertas.length
                  )}
                </span>
              )}
            </button>

            {/* MODO ACORDEÃO: Exibido apenas se o menu NÃO estiver retraído */}
            {!isRetraido && showNotif && (
              <div className="mt-2 transition-all">
                {listaNotificacoes}
              </div>
            )}
          </div>

          {/* NAVEGAÇÃO PRINCIPAL */}
          <nav className="flex-1 px-3 pb-4 space-y-1.5">
            {menuItems.filter(item => (!hasFullAccess ? item.path.includes('/agenda') : item.roles.includes(profile?.perfil))).map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <Link 
                  key={item.path} 
                  to={item.path}
                  title={isRetraido ? item.name : ""}
                  onClick={(e) => handleMainMenuClick(e, item.path)} 
                  className={`group flex items-center ${isRetraido ? 'justify-center p-3' : 'px-4 py-3'} rounded-xl text-xs font-bold transition-all duration-200 ${
                    active 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-md shadow-blue-900/20' 
                      : 'text-slate-600 hover:bg-white hover:text-blue-700 hover:shadow-sm border border-transparent hover:border-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-blue-100' : 'text-slate-400 group-hover:text-blue-600'} ${!isRetraido && 'mr-3'}`} /> 
                  {!isRetraido && <span className="whitespace-nowrap">{item.name}</span>}
                </Link>
              )
            })}

            {moduloAtivo === 'impressoras' && hasFullAccess && (
              <Link 
                to={`/${moduloAtivo}/bilhetagem`} 
                title={isRetraido ? "Auditoria de Cor" : ""}
                onClick={(e) => handleMainMenuClick(e, `/${moduloAtivo}/bilhetagem`)} 
                className={`group flex items-center ${isRetraido ? 'justify-center p-3' : 'px-4 py-3'} rounded-xl text-xs font-bold transition-all duration-200 ${
                  isActive('/bilhetagem') 
                    ? 'bg-gradient-to-r from-rose-500 to-rose-700 text-white shadow-md shadow-rose-900/20' 
                    : 'text-slate-600 hover:bg-white hover:text-rose-700 hover:shadow-sm border border-transparent hover:border-slate-200'
                }`}
              >
                <Droplet className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${isActive('/bilhetagem') ? 'text-rose-100' : 'text-slate-400 group-hover:text-rose-600'} ${!isRetraido && 'mr-3'}`} /> 
                {!isRetraido && <span className="whitespace-nowrap">Auditoria de Cor</span>}
              </Link>
            )}

            {hasFullAccess && (
              <div className={`pt-4 mt-4 border-t border-slate-200/60 space-y-1.5 ${isRetraido ? 'flex flex-col items-center' : ''}`}>
                {profile?.perfil === 'administrador' && (
                  <Link 
                    to={`/${moduloAtivo}/configuracoes`} 
                    title={isRetraido ? "Configurações" : ""}
                    onClick={(e) => handleMainMenuClick(e, `/${moduloAtivo}/configuracoes`)} 
                    className={`group flex items-center ${isRetraido ? 'justify-center p-3 w-10 h-10' : 'px-4 py-3'} rounded-xl text-xs font-bold transition-all duration-200 ${isActive('/configuracoes') ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm border border-transparent hover:border-slate-200'}`}
                  >
                    <Settings className={`w-4 h-4 transition-transform duration-200 group-hover:rotate-90 ${isActive('/configuracoes') ? 'text-slate-300' : 'text-slate-400 group-hover:text-slate-800'} ${!isRetraido && 'mr-3'}`} /> 
                    {!isRetraido && <span className="whitespace-nowrap">Configurações</span>}
                  </Link>
                )}
                
                <Link 
                  to={`/${moduloAtivo}/releases`} 
                  title={isRetraido ? "Notas de Atualização" : ""}
                  onClick={(e) => handleMainMenuClick(e, `/${moduloAtivo}/releases`)} 
                  className={`group flex items-center ${isRetraido ? 'justify-center p-3 w-10 h-10' : 'px-4 py-3'} rounded-xl text-xs font-bold transition-all duration-200 ${isActive('/releases') ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-white hover:text-indigo-700 hover:shadow-sm border border-transparent hover:border-slate-200'}`}
                >
                  <Rocket className={`w-4 h-4 transition-transform duration-200 group-hover:-translate-y-1 group-hover:translate-x-1 ${isActive('/releases') ? 'text-indigo-200' : 'text-slate-400 group-hover:text-indigo-600'} ${!isRetraido && 'mr-3'}`} /> 
                  {!isRetraido && <span className="whitespace-nowrap">Notas de Atualização</span>}
                </Link>
              </div>
            )}
          </nav>
        </div> 

        {/* RODAPÉ DO MENU */}
        <div className={`p-4 bg-white border-t border-slate-100 shrink-0 relative z-10 ${isRetraido ? 'flex flex-col gap-2' : 'space-y-2'}`}>
          <div className={`flex ${isRetraido ? 'flex-col' : ''} gap-2`}>
            <button 
              onClick={() => setModalSenhaAberto(true)} 
              title={isRetraido ? "Mudar Senha" : ""}
              className={`flex-1 flex ${isRetraido ? 'flex-col p-2' : 'flex-col py-2'} items-center justify-center text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors group`}
            >
              <Key className={`w-4 h-4 transition-transform group-hover:scale-110 ${!isRetraido && 'mb-1'}`} />
              {!isRetraido && <span className="text-[9px] font-bold uppercase tracking-wider">Senha</span>}
            </button>
            <button 
              onClick={handleLogout} 
              title={isRetraido ? "Sair" : ""}
              className={`flex-1 flex ${isRetraido ? 'flex-col p-2' : 'flex-col py-2'} items-center justify-center text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors group`}
            >
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

        {/* MODO FLUTUANTE (POPOVER): Exibido APENAS se o menu estiver retraído */}
        {isRetraido && showNotif && (
          <div className="absolute left-[90px] top-[140px] w-80 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 z-[100] p-4 flex flex-col max-h-[70vh]">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                  <Bell size={16} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm leading-none">Central de Pendências</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">Ações que exigem atenção</p>
                </div>
              </div>
              <button onClick={() => setShowNotif(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={16} />
              </button>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar pr-1">
              {listaNotificacoes}
            </div>
          </div>
        )}

      </aside>
    </>
  )
}