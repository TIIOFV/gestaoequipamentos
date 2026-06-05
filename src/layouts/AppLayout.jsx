import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  LayoutDashboard, Monitor, Wrench, CalendarDays, 
  FileText, Settings, LogOut, Bell, Menu, X, Loader2, Key, ArrowLeftRight
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useModulo } from '../contexts/ModuloContext'
import ModalAlterarSenha from '../components/ModalAlterarSenha'

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const { moduloAtivo, limparModulo } = useModulo()

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [alertas, setAlertas] = useState([])
  const [isVerifying, setIsVerifying] = useState(true)
  
  const [modalSenhaAberto, setModalSenhaAberto] = useState(false)

  // ==========================================
  // TRAVA DE SEGURANÇA E TROCA DE SENHA OBRIGATÓRIA
  // ==========================================
  const hasFullAccess = profile?.perfil === 'administrador' || profile?.perfil === 'analista'
  const isAgendaRoute = location.pathname.includes('/agenda')
  
  // A variável chave: Se o perfil diz que precisa trocar, travamos a tela.
  const isTrocaSenhaObrigatoria = profile?.precisa_trocar_senha === true

  // Dicionário para o card de módulo
  const nomesModulos = {
    medicos: 'Equipamentos Médicos',
    ti: 'Tecnologia da Informação',
    infra: 'Nobreaks & Baterias',
    manutencao: 'Manutenção Predial'
  }

  useEffect(() => {
    // 1. EXPULSA USUÁRIO BLOQUEADO
    if (profile?.esta_bloqueado) {
      alert("Seu acesso foi suspenso temporariamente pelo Administrador.");
      handleLogout();
      return;
    }

    if (profile !== undefined && profile !== null) {
      setIsVerifying(false)
    }
    const timer = setTimeout(() => setIsVerifying(false), 1000)
    return () => clearTimeout(timer)
  }, [profile])

  useEffect(() => {
    // Se a troca de senha é obrigatória, não redirecionamos ele por falta de acesso ainda
    if (!isVerifying && !hasFullAccess && !isAgendaRoute && !isTrocaSenhaObrigatoria && moduloAtivo) {
      navigate(`/${moduloAtivo}/agenda`, { replace: true })
    }
  }, [isVerifying, hasFullAccess, isAgendaRoute, isTrocaSenhaObrigatoria, navigate, moduloAtivo])

  // Atualizado para reagir às mudanças do módulo
  useEffect(() => {
    if (!moduloAtivo) return; // Aguarda o ambiente ser carregado

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
    try {
      // Filtro de Módulo aplicado
      const { data: semEtiqueta } = await supabase.from('equipamentos')
        .select('id, nome, patrimonio')
        .eq('possui_etiqueta', false)
        .eq('modulo', moduloAtivo)

      if (semEtiqueta) {
        semEtiqueta.forEach(eq => {
          novosAlertas.push({
            id: `eq-${eq.id}`, tipo: 'etiqueta',
            texto: `${eq.nome} (${eq.patrimonio || 'Sem Patr.'}) está sem etiqueta.`,
            link: `/${moduloAtivo}/equipamentos`, targetId: eq.id
          })
        })
      }

      // Filtro de Módulo aplicado
      const { data: semPatrimonio } = await supabase.from('equipamentos')
        .select('id, nome')
        .eq('sem_patrimonio', true)
        .eq('modulo', moduloAtivo)

      if (semPatrimonio) {
        semPatrimonio.forEach(eq => {
          novosAlertas.push({
            id: `pat-${eq.id}`, tipo: 'patrimonio',
            texto: `URGENTE: ${eq.nome} aguardando colagem de patrimônio.`,
            link: `/${moduloAtivo}/equipamentos`, targetId: eq.id
          })
        })
      }

      const hoje = new Date().toISOString().split('T')[0]
      const { data: statusConcluido } = await supabase.from('status_chamado').select('id').ilike('nome', '%Concluído%').maybeSingle()

      // Filtro de Módulo aplicado
      let query = supabase.from('chamados')
        .select('id, tipo_intervencao, data_prevista, equipamento:equipamento_id(nome)')
        .in('tipo_intervencao', ['Calibração', 'Preventiva', 'Qualificação'])
        .lte('data_prevista', hoje)
        .eq('modulo', moduloAtivo)

      if (statusConcluido) query = query.neq('status_id', statusConcluido.id)

      const { data: chamadosAtrasados } = await query
      if (chamadosAtrasados) {
        chamadosAtrasados.forEach(ch => {
          novosAlertas.push({
            id: `ch-${ch.id}`, tipo: 'manutencao',
            texto: `${ch.tipo_intervencao} PENDENTE: ${ch.equipamento?.nome} (${new Date(ch.data_prevista).toLocaleDateString('pt-BR', {timeZone: 'UTC'})})`,
            link: `/${moduloAtivo}/chamados`
          })
        })
      }
      setAlertas(novosAlertas)
    } catch (error) {
      console.error("Erro ao buscar alertas:", error)
    }
  }

  // Bloco blindado para garantir que o usuário consiga sair do sistema
  const handleLogout = async () => {
    try {
      limparModulo() 
      if (signOut) {
        await signOut()
      } else {
        await supabase.auth.signOut()
      }
    } catch (error) {
      console.error('Erro silencioso no logout:', error)
    } finally {
      // O finally garante que o redirecionamento aconteça de qualquer jeito
      navigate('/login', { replace: true })
    }
  }

  const handleTrocarModulo = () => {
    limparModulo()
    navigate('/modulos')
  }

  const isActive = (path) => location.pathname.includes(path)

  const handleNotifClick = (e, path, targetId) => {
    e.preventDefault()
    setIsMobileMenuOpen(false)
    const targetPath = !hasFullAccess ? `/${moduloAtivo}/agenda` : path
    const statePayload = targetId ? { openDetailsId: targetId, _t: Date.now() } : { _t: Date.now() }
    navigate(targetPath, { state: statePayload })
  }

  const handleMainMenuClick = (e, path) => {
    setIsMobileMenuOpen(false)
    if (location.pathname === path) {
      e.preventDefault(); 
      window.location.href = path; 
    }
  }

  const menuItems = [
    { path: `/${moduloAtivo}/dashboard`, name: 'Dashboard', icon: LayoutDashboard, roles: ['administrador', 'analista'] },
    { path: `/${moduloAtivo}/equipamentos`, name: 'Equipamentos', icon: Monitor, roles: ['administrador', 'analista'] },
    { path: `/${moduloAtivo}/chamados`, name: 'Chamados', icon: Wrench, roles: ['administrador', 'analista'] },
    { path: `/${moduloAtivo}/agenda`, name: 'Agenda', icon: CalendarDays, roles: ['administrador', 'analista', 'visualizador'] },
    { path: `/${moduloAtivo}/relatorios`, name: 'Relatórios', icon: FileText, roles: ['administrador', 'analista'] },
  ]

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* SE O USUÁRIO ESTIVER TRAVADO NA TROCA DE SENHA, ESCONDEMOS O MENU LATERAL VISUALMENTE PARA ELE FOCAR NO MODAL */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col shadow-2xl md:shadow-sm z-50 
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        ${isTrocaSenhaObrigatoria ? 'md:hidden' : 'md:relative md:translate-x-0'}
      `}>
        
        <div className="h-16 md:h-20 flex items-center justify-between px-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center">
            <div className="w-10 h-10 md:w-11 md:h-10 bg-blue-800 text-white rounded-lg flex items-center justify-center font-bold text-lg mr-2 shadow-sm">
              IOFV
            </div>
            <div>
              <h1 className="font-bold text-slate-800 leading-tight">IOFV - GESTÃO</h1>
              <p className="text-[10px] md:text-xs text-slate-500">Sistema Integrado</p>
            </div>
          </div>
          <button className="md:hidden text-slate-500 hover:text-slate-800" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* INDICADOR DE MÓDULO */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <div 
            onClick={handleTrocarModulo} 
            className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between group cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
            title="Trocar de ambiente"
          >
            <div className="overflow-hidden">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Ambiente Atual</p>
              <p className="font-bold text-slate-700 text-xs truncate">
                {nomesModulos[moduloAtivo] || 'Carregando...'}
              </p>
            </div>
            <div className="w-6 h-6 rounded bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
              <ArrowLeftRight size={14} />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-slate-100 shrink-0">
          <p className="font-semibold text-slate-800 truncate">
            {isVerifying ? 'Carregando perfil...' : (profile?.nome || 'Visualizador (Sem Perfil)')}
          </p>
          {!isVerifying && (
            <span className={`inline-flex items-center px-2 py-1 mt-1 rounded-md text-[10px] md:text-xs font-bold capitalize ${
              hasFullAccess ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {hasFullAccess ? profile?.perfil : 'Visualizador Restrito'}
            </span>
          )}
        </div>

        <div className="px-4 py-3 border-b border-slate-100 shrink-0">
          <button onClick={() => setShowNotif(!showNotif)} className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-slate-50 transition-colors group">
            <div className="flex items-center text-sm font-bold text-slate-700 group-hover:text-blue-700">
              <Bell className={`w-4 h-4 mr-2 ${alertas.length > 0 ? 'text-red-500' : 'text-slate-400'}`} />
              Pendências
            </div>
            {alertas.length > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">{alertas.length}</span>}
          </button>

          {showNotif && (
            <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar animate-in slide-in-from-top-2">
              {alertas.length === 0 ? (
                <div className="p-3 text-center bg-emerald-50 border border-emerald-100 rounded-lg"><p className="text-xs font-bold text-emerald-700">Tudo em dia! 🎉</p></div>
              ) : (
                alertas.map(al => (
                  <div 
                    key={al.id} 
                    onClick={(e) => handleNotifClick(e, al.link, al.targetId)}
                    className={`cursor-pointer block text-xs p-2.5 rounded-lg border transition-all ${
                      al.tipo === 'etiqueta' ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100' :
                      al.tipo === 'patrimonio' ? 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100' : 'bg-red-50 text-red-900 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    <span className="font-bold block mb-0.5">{al.tipo === 'etiqueta' ? '🏷️ Falta Etiqueta' : al.tipo === 'patrimonio' ? '🚨 Sem Patrimônio' : '⚠️ OS Atrasada/Hoje'}</span>
                    {al.texto}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 custom-scrollbar">
          {menuItems.filter(item => {
            if (!hasFullAccess) return item.path.includes('/agenda');
            return item.roles.includes(profile?.perfil);
          }).map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                onClick={(e) => handleMainMenuClick(e, item.path)} 
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <Icon className={`w-5 h-5 mr-3 ${active ? 'text-blue-600' : 'text-slate-400'}`} /> {item.name}
              </Link>
            )
          })}

          {/* EXCLUSIVO PARA ADMINISTRADORES */}
          {profile?.perfil === 'administrador' && (
            <div className="pt-4 mt-4 border-t border-slate-100">
              <Link to={`/${moduloAtivo}/configuracoes`} onClick={(e) => handleMainMenuClick(e, `/${moduloAtivo}/configuracoes`)} className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/configuracoes') ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                <Settings className="w-5 h-5 mr-3 text-slate-400" /> Configurações Gerais
              </Link>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100 shrink-0 space-y-2">
          <button 
            onClick={() => setModalSenhaAberto(true)} 
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-bold text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
          >
            <Key className="w-4 h-4 mr-2" /> Alterar senha
          </button>
          
          <button 
            onClick={handleLogout} 
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-bold text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
          >
            <LogOut className="w-4 h-4 mr-2" /> Sair do sistema
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <header className={`md:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 h-16 shrink-0 shadow-sm ${isTrocaSenhaObrigatoria ? 'hidden' : ''}`}>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-800 text-white rounded md flex items-center justify-center font-bold text-xs mr-2">IOFV</div>
            <span className="font-bold text-slate-800 text-sm">GESTÃO</span>
          </div>
          <div className="flex items-center gap-4">
            {alertas.length > 0 && (
              <div className="relative"><Bell className="w-5 h-5 text-red-500 animate-pulse" /><span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 border border-white rounded-full"></span></div>
            )}
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100"><Menu size={24} /></button>
          </div>
        </header>

        <main className={`flex-1 overflow-auto bg-slate-50/50 ${isTrocaSenhaObrigatoria ? 'blur-sm pointer-events-none select-none' : ''}`}>
          <div className="p-4 md:p-8 max-w-7xl mx-auto h-full">
            {isVerifying ? (
               <div className="h-full flex flex-col items-center justify-center gap-3">
                 <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                 <span className="text-sm font-bold text-slate-500">Autenticando acesso...</span>
               </div>
            ) : (!hasFullAccess && !isAgendaRoute && !isTrocaSenhaObrigatoria) ? (
               <div className="h-full flex flex-col items-center justify-center">
                 <span className="text-sm font-bold text-slate-400">Redirecionando para área permitida...</span>
               </div>
            ) : (
              <Outlet />
            )}
          </div>
        </main>
      </div>
      
      {(modalSenhaAberto || isTrocaSenhaObrigatoria) && (
        <ModalAlterarSenha 
          isOpen={true} 
          onClose={() => setModalSenhaAberto(false)} 
          obrigatorio={isTrocaSenhaObrigatoria}
          userId={profile?.user_id}
        />
      )}
    </div>
  )
}