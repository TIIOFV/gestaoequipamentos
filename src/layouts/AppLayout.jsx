import { useEffect } from 'react' // Adicione o useEffect
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LayoutDashboard, Monitor, Wrench, CalendarDays, FileText, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile } = useAuth()

  // --- TRAVA DE SEGURANÇA ---
  // Se for visualizador e tentar entrar em qualquer rota que não seja a agenda, manda de volta
  useEffect(() => {
    if (profile?.perfil === 'visualizador' && location.pathname !== '/agenda') {
      navigate('/agenda')
    }
  }, [profile, location, navigate])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const isActive = (path) => location.pathname.includes(path)

  // Adicionamos a lista de permissões em cada item
  const menuItems = [
    { path: '/dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['administrador', 'analista'] },
    { path: '/equipamentos', name: 'Equipamentos', icon: Monitor, roles: ['administrador', 'analista'] },
    { path: '/chamados', name: 'Chamados', icon: Wrench, roles: ['administrador', 'analista'] },
    { path: '/agenda', name: 'Agenda', icon: CalendarDays, roles: ['administrador', 'analista', 'visualizador'] },
    { path: '/relatorios', name: 'Relatórios', icon: FileText, roles: ['administrador', 'analista'] },
  ]

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
        <div className="h-20 flex items-center px-4 border-b border-slate-100">
          <div className="w-11 h-10 bg-blue-800 text-white rounded-lg flex items-center justify-center font-bold text-lg mr-2 shadow-sm">
            IOFV
          </div>
          <div>
            <h1 className="font-bold text-slate-800 leading-tight">IOFV - GESTÃO</h1>
            <p className="text-xs text-slate-500">Gestão de Equipamentos</p>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <p className="font-semibold text-slate-800 truncate">{profile?.nome || 'Carregando...'}</p>
          <span className="inline-flex items-center px-2 py-1 mt-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 capitalize">
            {profile?.perfil || 'Usuário'}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1.5">
          {/* FILTRO DE MENU BASEADO NO PERFIL */}
          {menuItems
            .filter(item => item.roles.includes(profile?.perfil)) 
            .map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 mr-3 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              )
            })}

          {/* SÓ MOSTRA CONFIGURAÇÕES SE NÃO FOR VISUALIZADOR */}
          {profile?.perfil !== 'visualizador' && (
            <div className="pt-4 mt-4 border-t border-slate-100">
              <Link
                to="/configuracoes"
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/configuracoes') 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Settings className="w-5 h-5 mr-3 text-slate-400" />
                Configurações
              </Link>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair do sistema
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}