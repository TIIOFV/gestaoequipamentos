import { useState, useEffect } from 'react'
import { VERSAO_SISTEMA } from '../../config'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useModulo } from '../../contexts/ModuloContext'
import { 
  LayoutDashboard, Monitor, Wrench, CalendarDays, FileText, 
  Settings, LogOut, Bell, X, Key, ArrowLeftRight, Droplet, Rocket 
} from 'lucide-react'

export default function MenuSidebar({ 
  profile, 
  hasFullAccess, 
  isTrocaSenhaObrigatoria, 
  isMobileMenuOpen, 
  setIsMobileMenuOpen, 
  handleLogout, 
  setModalSenhaAberto 
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const { moduloAtivo, limparModulo } = useModulo()
  
  const [showNotif, setShowNotif] = useState(false)
  const [alertas, setAlertas] = useState([])

  // 🏷️ VERSÃO DA RELEASE ATUAL DO SISTEMA

  const nomesModulos = {
    medicos: 'Equipamentos Médicos',
    ti: 'Tecnologia da Informação',
    infra: 'Nobreaks & Baterias',
    manutencao: 'Manutenção Predial',
    impressoras: 'Impressoras & Copiadoras'
  }

  useEffect(() => {
    if (!moduloAtivo) return;

    if (profile && !profile.esta_bloqueado && !isTrocaSenhaObrigatoria) {
      buscarAlertas()
      
      const canalNotificacoes = supabase
        .channel(`fluxo-alertas-${moduloAtivo}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados', filter: `modulo=eq.${moduloAtivo}` }, () => buscarAlertas())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'equipamentos', filter: `modulo=eq.${moduloAtivo}` }, () => buscarAlertas())
        .subscribe();

      return () => { supabase.removeChannel(canalNotificacoes); };
    }
  }, [profile, isTrocaSenhaObrigatoria, moduloAtivo])

  const buscarAlertas = async () => {
    let novosAlertas = []
    const isModuloTecnologia = ['ti', 'impressoras'].includes(moduloAtivo)

    try {
      if (!isModuloTecnologia) {
        const { data: semEtiqueta } = await supabase.from('equipamentos').select('id, nome, patrimonio').eq('possui_etiqueta', false).eq('modulo', moduloAtivo)
        if (semEtiqueta) semEtiqueta.forEach(eq => novosAlertas.push({ id: `eq-${eq.id}`, tipo: 'etiqueta', texto: `${eq.nome} (${eq.patrimonio || 'S/N'}) sem etiqueta.`, link: `/${moduloAtivo}/equipamentos`, targetId: eq.id }))
      }

      const { data: semPatrimonio } = await supabase.from('equipamentos').select('id, nome').eq('sem_patrimonio', true).eq('modulo', moduloAtivo)
      if (semPatrimonio) semPatrimonio.forEach(eq => novosAlertas.push({ id: `pat-${eq.id}`, tipo: 'patrimonio', texto: `URGENTE: ${eq.nome} sem património.`, link: `/${moduloAtivo}/equipamentos`, targetId: eq.id }))

      const hojeStr = new Date().toISOString().split('T')[0]
      const { data: statusConcluido } = await supabase.from('status_chamado').select('id').ilike('nome', '%Concluído%').maybeSingle()
      
      let query = supabase.from('chamados').select('id, tipo_intervencao, data_prevista, equipamento:equipamento_id(nome)').lte('data_prevista', hojeStr).eq('modulo', moduloAtivo)
      if (statusConcluido) query = query.neq('status_id', statusConcluido.id)

      const { data: chamadosAtrasados } = await query
      if (chamadosAtrasados) chamadosAtrasados.forEach(ch => novosAlertas.push({ id: `ch-${ch.id}`, tipo: 'manutencao', texto: `${ch.tipo_intervencao} PENDENTE: ${ch.equipamento?.nome || 'Equipamento'}`, link: `/${moduloAtivo}/chamados`, targetId: ch.id }))

      const { data: equipamentosCalib } = await supabase.from('equipamentos').select('id, nome, patrimonio, data_proxima_calibracao').eq('modulo', moduloAtivo).not('data_proxima_calibracao', 'is', null)
      if (equipamentosCalib) {
        const hojeObj = new Date()
        hojeObj.setHours(0, 0, 0, 0)
        equipamentosCalib.forEach(eq => {
          const dataRef = new Date(eq.data_proxima_calibracao)
          dataRef.setHours(12, 0, 0, 0) 
          const diffDias = Math.ceil((dataRef - hojeObj) / (1000 * 60 * 60 * 24))

          if (diffDias <= 10 && diffDias >= 0) {
              let msg = diffDias === 0 ? 'VENCE HOJE!' : `Vence em ${diffDias} dias`
              novosAlertas.push({ id: `calib-${eq.id}`, tipo: 'calibracao', texto: `${eq.nome}: ${msg}`, link: `/${moduloAtivo}/equipamentos`, targetId: eq.id })
          } else if (diffDias < 0) {
              novosAlertas.push({ id: `calib-atr-${eq.id}`, tipo: 'calibracao_atrasada', texto: `${eq.nome}: Atrasada há ${Math.abs(diffDias)} dias!`, link: `/${moduloAtivo}/equipamentos`, targetId: eq.id })
          }
        })
      }
      setAlertas(novosAlertas)
    } catch (error) { console.error("Erro ao buscar alertas:", error) }
  }

  const handleTrocarModulo = () => {
    limparModulo()
    navigate('/modulos')
  }

  const handleNotifClick = (e, path, targetId) => {
    e.preventDefault(); setIsMobileMenuOpen(false);
    const targetPath = !hasFullAccess ? `/${moduloAtivo}/agenda` : path;
    const statePayload = targetId ? { openDetailsId: targetId, _t: Date.now() } : { _t: Date.now() };
    navigate(targetPath, { state: statePayload });
  }

  const isActive = (path) => location.pathname.includes(path)
  const handleMainMenuClick = (e, path) => {
    setIsMobileMenuOpen(false);
    if (location.pathname === path) { e.preventDefault(); window.location.href = path; }
  }

  const menuItems = [
    { path: `/${moduloAtivo}/dashboard`, name: 'Dashboard', icon: LayoutDashboard, roles: ['administrador', 'analista'] },
    { path: `/${moduloAtivo}/equipamentos`, name: 'Equipamentos', icon: Monitor, roles: ['administrador', 'analista'] },
    { path: `/${moduloAtivo}/chamados`, name: 'Chamados', icon: Wrench, roles: ['administrador', 'analista'] },
    { path: `/${moduloAtivo}/agenda`, name: 'Agenda', icon: CalendarDays, roles: ['administrador', 'analista', 'visualizador'] },
    { path: `/${moduloAtivo}/relatorios`, name: 'Relatórios', icon: FileText, roles: ['administrador', 'analista'] },
  ]

  return (
    <>
      {/* OVERLAY MOBILE: Fundo escuro desfocado quando o menu abre no celular */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 w-72 md:w-64 bg-slate-50 border-r border-slate-200 flex flex-col shadow-2xl md:shadow-none h-screen z-50 
        transform transition-transform duration-300 ease-in-out select-none
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        ${isTrocaSenhaObrigatoria ? 'md:hidden' : 'md:relative md:translate-x-0'}
      `}>
        
        {/* LOGO AREA */}
        <div className="h-20 flex items-center justify-between px-5 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-700 to-blue-900 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-md shadow-blue-900/20">
              IO
            </div>
            <div>
              <h1 className="font-black text-slate-800 tracking-tight leading-none text-lg">IOFV GESTÃO</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Sistema Integrado</p>
            </div>
          </div>
          <button className="md:hidden text-slate-400 hover:text-slate-800 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* INFO CARDS (Ambiente e Perfil) */}
        <div className="px-4 py-4 space-y-3 bg-white border-b border-slate-100 shrink-0">
          {/* Card Ambiente */}
          <div onClick={handleTrocarModulo} className="bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl p-3 flex items-center justify-between group cursor-pointer transition-all duration-200">
            <div className="overflow-hidden">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Ambiente Atual</p>
              <p className="font-bold text-slate-700 text-xs truncate group-hover:text-blue-800 transition-colors">{nomesModulos[moduloAtivo] || 'Carregando...'}</p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all shadow-sm shrink-0">
              <ArrowLeftRight size={14} />
            </div>
          </div>

          {/* Card Perfil */}
          <div className="flex items-center justify-between px-1">
            <div className="truncate pr-2">
              <p className="font-bold text-slate-800 text-sm truncate">{profile ? profile.nome : 'Carregando...'}</p>
              <p className="text-[10px] font-semibold text-slate-500 capitalize mt-0.5">{hasFullAccess ? profile?.perfil : 'Acesso Limitado'}</p>
            </div>
          </div>
        </div>

        {/* PENDÊNCIAS */}
        <div className="px-4 py-3 shrink-0">
          <button onClick={() => setShowNotif(!showNotif)} className="flex items-center justify-between w-full p-2.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all group">
            <div className="flex items-center text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
              <Bell className={`w-4 h-4 mr-2 transition-transform group-hover:scale-110 ${alertas.length > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
              Pendências
            </div>
            {alertas.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm shadow-rose-500/30 animate-pulse">
                {alertas.length > 99 ? '99+' : alertas.length}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar transition-all">
              {alertas.length === 0 ? (
                <div className="p-3 text-center bg-emerald-50/50 border border-emerald-100 rounded-xl">
                  <p className="text-[11px] font-bold text-emerald-700">Tudo em dia! 🎉</p>
                </div>
              ) : (
                alertas.map(al => {
                  let classesCores = '';
                  let icone = '';
                  
                  if (al.tipo === 'etiqueta') { classesCores = 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 hover:shadow-sm'; icone = '🏷️ Falta Etiqueta'; }
                  else if (al.tipo === 'patrimonio') { classesCores = 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100 hover:shadow-sm'; icone = '🚨 Sem Patrimônio'; }
                  else if (al.tipo === 'manutencao') { classesCores = 'bg-red-50 text-red-900 border-red-200 hover:bg-red-100 hover:shadow-sm'; icone = '⚠️ OS Pendente'; }
                  else if (al.tipo === 'calibracao') { classesCores = 'bg-orange-50 text-orange-900 border-orange-200 hover:bg-orange-100 hover:shadow-sm'; icone = '⏳ Preventiva Próxima'; }
                  else if (al.tipo === 'calibracao_atrasada') { classesCores = 'bg-red-50 text-red-900 border-red-200 hover:bg-red-100 hover:shadow-sm'; icone = '❌ Preventiva Atrasada'; }

                  return (
                    <div key={al.id} onClick={(e) => handleNotifClick(e, al.link, al.targetId)} className={`cursor-pointer block text-[11px] p-2.5 rounded-xl border transition-all ${classesCores}`}>
                      <span className="font-bold block text-[10px] mb-1 opacity-80">{icone}</span>
                      <span className="font-medium leading-tight block">{al.texto}</span>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* NAVEGAÇÃO PRINCIPAL */}
        <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto custom-scrollbar">
          {menuItems.filter(item => (!hasFullAccess ? item.path.includes('/agenda') : item.roles.includes(profile?.perfil))).map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                onClick={(e) => handleMainMenuClick(e, item.path)} 
                className={`group flex items-center px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${
                  active 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-md shadow-blue-900/20' 
                    : 'text-slate-600 hover:bg-white hover:text-blue-700 hover:shadow-sm border border-transparent hover:border-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 mr-3 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-blue-100' : 'text-slate-400 group-hover:text-blue-600'}`} /> 
                {item.name}
              </Link>
            )
          })}

          {moduloAtivo === 'impressoras' && hasFullAccess && (
            <Link 
              to={`/${moduloAtivo}/bilhetagem`} 
              onClick={(e) => handleMainMenuClick(e, `/${moduloAtivo}/bilhetagem`)} 
              className={`group flex items-center px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${
                isActive('/bilhetagem') 
                  ? 'bg-gradient-to-r from-rose-500 to-rose-700 text-white shadow-md shadow-rose-900/20' 
                  : 'text-slate-600 hover:bg-white hover:text-rose-700 hover:shadow-sm border border-transparent hover:border-slate-200'
              }`}
            >
              <Droplet className={`w-4 h-4 mr-3 transition-transform duration-200 group-hover:scale-110 ${isActive('/bilhetagem') ? 'text-rose-100' : 'text-slate-400 group-hover:text-rose-600'}`} /> 
              Auditoria de Cor
            </Link>
          )}

          {/* CONFIGURAÇÕES E RELEASES */}
          {hasFullAccess && (
            <div className="pt-4 mt-4 border-t border-slate-200/60 space-y-1.5">
              {profile?.perfil === 'administrador' && (
                <Link to={`/${moduloAtivo}/configuracoes`} onClick={(e) => handleMainMenuClick(e, `/${moduloAtivo}/configuracoes`)} className={`group flex items-center px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${isActive('/configuracoes') ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm border border-transparent hover:border-slate-200'}`}>
                  <Settings className={`w-4 h-4 mr-3 transition-transform duration-200 group-hover:rotate-90 ${isActive('/configuracoes') ? 'text-slate-300' : 'text-slate-400 group-hover:text-slate-800'}`} /> Configurações
                </Link>
              )}
              
              <Link to={`/${moduloAtivo}/releases`} onClick={(e) => handleMainMenuClick(e, `/${moduloAtivo}/releases`)} className={`group flex items-center px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${isActive('/releases') ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-white hover:text-indigo-700 hover:shadow-sm border border-transparent hover:border-slate-200'}`}>
                <Rocket className={`w-4 h-4 mr-3 transition-transform duration-200 group-hover:-translate-y-1 group-hover:translate-x-1 ${isActive('/releases') ? 'text-indigo-200' : 'text-slate-400 group-hover:text-indigo-600'}`} /> Notas de Atualização
              </Link>
            </div>
          )}
        </nav>

        {/* RODAPÉ DO MENU */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0 space-y-2">
          <div className="flex gap-2">
            <button onClick={() => setModalSenhaAberto(true)} className="flex-1 flex flex-col items-center justify-center py-2 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors group">
              <Key className="w-4 h-4 mb-1 transition-transform group-hover:scale-110" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Senha</span>
            </button>
            <button onClick={handleLogout} className="flex-1 flex flex-col items-center justify-center py-2 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors group">
              <LogOut className="w-4 h-4 mb-1 transition-transform group-hover:scale-110" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Sair</span>
            </button>
          </div>
          <div className="text-center pt-2">
            <span className="text-[9px] font-black text-slate-300 tracking-widest">RELEASE {VERSAO_SISTEMA}</span>
          </div>
        </div>
      </aside>
    </>
  )
}