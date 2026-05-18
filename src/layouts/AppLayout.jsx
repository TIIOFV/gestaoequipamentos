import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  LayoutDashboard, Monitor, Wrench, CalendarDays, 
  FileText, Settings, LogOut, Bell, Menu, X 
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [alertas, setAlertas] = useState([])

  useEffect(() => {
    if (profile?.perfil === 'visualizador' && location.pathname !== '/agenda') {
      navigate('/agenda')
    }

    if (profile) {
      buscarAlertas()
    }

    // OUVINTE REALTIME: Atualiza o contador de pendências sem Refresh
    const canalNotificacoes = supabase
      .channel('fluxo-alertas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados' }, () => buscarAlertas())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipamentos' }, () => buscarAlertas())
      .subscribe();

    return () => { supabase.removeChannel(canalNotificacoes); };
  }, [profile, location, navigate])

  const buscarAlertas = async () => {
    let novosAlertas = []

    try {
      const { data: semEtiqueta } = await supabase
        .from('equipamentos')
        .select('id, nome, patrimonio')
        .eq('possui_etiqueta', false)
      
      if (semEtiqueta) {
        semEtiqueta.forEach(eq => {
          novosAlertas.push({
            id: `eq-${eq.id}`,
            tipo: 'etiqueta',
            texto: `${eq.nome} (${eq.patrimonio || 'Sem Patr.'}) está sem etiqueta.`,
            link: '/equipamentos',
            targetId: eq.id // ID PARA REDIRECIONAMENTO DIRETO
          })
        })
      }

      const { data: semPatrimonio } = await supabase
        .from('equipamentos')
        .select('id, nome')
        .eq('sem_patrimonio', true)

      if (semPatrimonio) {
        semPatrimonio.forEach(eq => {
          novosAlertas.push({
            id: `pat-${eq.id}`,
            tipo: 'patrimonio',
            texto: `URGENTE: ${eq.nome} aguardando colagem de patrimônio.`,
            link: '/equipamentos',
            targetId: eq.id // ID PARA REDIRECIONAMENTO DIRETO
          })
        })
      }

      const hoje = new Date().toISOString().split('T')[0]
      
      const { data: statusConcluido } = await supabase
        .from('status_chamado')
        .select('id')
        .ilike('nome', '%Concluído%')
        .maybeSingle()

      let query = supabase
        .from('chamados')
        .select('id, tipo_intervencao, data_prevista, equipamento:equipamento_id(nome)')
        .in('tipo_intervencao', ['Calibração', 'Preventiva', 'Qualificação'])
        .lte('data_prevista', hoje)

      if (statusConcluido) {
        query = query.neq('status_id', statusConcluido.id)
      }

      const { data: chamadosAtrasados } = await query

      if (chamadosAtrasados) {
        chamadosAtrasados.forEach(ch => {
          novosAlertas.push({
            id: `ch-${ch.id}`,
            tipo: 'manutencao',
            texto: `${ch.tipo_intervencao} PENDENTE: ${ch.equipamento?.nome} (${new Date(ch.data_prevista).toLocaleDateString('pt-BR', {timeZone: 'UTC'})})`,
            link: '/chamados'
          })
        })
      }

      setAlertas(novosAlertas)
    } catch (error) {
      console.error("Erro ao buscar alertas:", error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const isActive = (path) => location.pathname.includes(path)
  const handleMenuClick = () => setIsMobileMenuOpen(false)

  const menuItems = [
    { path: '/dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['administrador', 'analista'] },
    { path: '/equipamentos', name: 'Equipamentos', icon: Monitor, roles: ['administrador', 'analista'] },
    { path: '/chamados', name: 'Chamados', icon: Wrench, roles: ['administrador', 'analista'] },
    { path: '/agenda', name: 'Agenda', icon: CalendarDays, roles: ['administrador', 'analista', 'visualizador'] },
    { path: '/relatorios', name: 'Relatórios', icon: FileText, roles: ['administrador', 'analista'] },
  ]

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col shadow-2xl md:shadow-sm z-50 
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:relative md:translate-x-0
      `}>
        
        <div className="h-16 md:h-20 flex items-center justify-between px-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center">
            <div className="w-10 h-10 md:w-11 md:h-10 bg-blue-800 text-white rounded-lg flex items-center justify-center font-bold text-lg mr-2 shadow-sm">
              IOFV
            </div>
            <div>
              <h1 className="font-bold text-slate-800 leading-tight">IOFV - GESTÃO</h1>
              <p className="text-[10px] md:text-xs text-slate-500">Gestão de Equipamentos</p>
            </div>
          </div>
          <button className="md:hidden text-slate-500 hover:text-slate-800" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <p className="font-semibold text-slate-800 truncate">{profile?.nome || 'Carregando...'}</p>
          <span className="inline-flex items-center px-2 py-1 mt-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 capitalize">
            {profile?.perfil || 'Usuário'}
          </span>
        </div>

        <div className="px-4 py-3 border-b border-slate-100 shrink-0">
          <button 
            onClick={() => setShowNotif(!showNotif)} 
            className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-slate-50 transition-colors group"
          >
            <div className="flex items-center text-sm font-bold text-slate-700 group-hover:text-blue-700">
              <Bell className={`w-4 h-4 mr-2 ${alertas.length > 0 ? 'text-red-500' : 'text-slate-400'}`} />
              Pendências
            </div>
            {alertas.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                {alertas.length}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar animate-in slide-in-from-top-2">
              {alertas.length === 0 ? (
                <div className="p-3 text-center bg-emerald-50 border border-emerald-100 rounded-lg">
                  <p className="text-xs font-bold text-emerald-700">Tudo em dia! 🎉</p>
                </div>
              ) : (
                alertas.map(al => (
                  <Link 
                    to={profile?.perfil === 'visualizador' ? '/agenda' : al.link} 
                    state={al.targetId ? { openDetailsId: al.targetId } : {}} // PASSA O ID PRO ROUTER
                    key={al.id} 
                    onClick={handleMenuClick}
                    className={`block text-xs p-2.5 rounded-lg border transition-all ${
                      al.tipo === 'etiqueta' ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100' :
                      al.tipo === 'patrimonio' ? 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100' :
                      'bg-red-50 text-red-900 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    <span className="font-bold block mb-0.5">
                      {al.tipo === 'etiqueta' ? '🏷️ Falta Etiqueta' : 
                       al.tipo === 'patrimonio' ? '🚨 Sem Patrimônio' : 
                       '⚠️ OS Atrasada/Hoje'}
                    </span>
                    {al.texto}
                  </Link>
                ))
              )}
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 custom-scrollbar">
          {menuItems
            .filter(item => item.roles.includes(profile?.perfil)) 
            .map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleMenuClick}
                  className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active 
                      ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 mr-3 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              )
            })}

          {profile?.perfil !== 'visualizador' && (
            <div className="pt-4 mt-4 border-t border-slate-100">
              <Link
                to="/configuracoes"
                onClick={handleMenuClick}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/configuracoes') 
                    ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Settings className="w-5 h-5 mr-3 text-slate-400" />
                Configurações
              </Link>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100 shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair do sistema
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="md:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 h-16 shrink-0 shadow-sm">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-800 text-white rounded md flex items-center justify-center font-bold text-xs mr-2">
              IOFV
            </div>
            <span className="font-bold text-slate-800 text-sm">GESTÃO</span>
          </div>
          
          <div className="flex items-center gap-4">
            {alertas.length > 0 && (
              <div className="relative">
                <Bell className="w-5 h-5 text-red-500 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 border border-white rounded-full"></span>
              </div>
            )}
            
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Menu size={24} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-slate-50/50">
          <div className="p-4 md:p-8 max-w-7xl mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>
      
    </div>
  )
}