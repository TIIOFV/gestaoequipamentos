import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Menu, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useModulo } from '../contexts/ModuloContext'
import ModalAlterarSenha from '../components/ModalAlterarSenha'
import MenuSidebar from './components/MenuSidebar' 
import NotificacoesBell from '../components/NotificacoesBell'

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const { moduloAtivo, limparModulo } = useModulo()

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [modalSenhaAberto, setModalSenhaAberto] = useState(false)

  const hasFullAccess = profile?.perfil === 'administrador' || profile?.perfil === 'analista'
  const isLimitedRoute = location.pathname.includes('/agenda') || location.pathname.includes('/suporte') || location.pathname.includes('/releases')
  const isTrocaSenhaObrigatoria = profile?.precisa_trocar_senha === true

  // Gerencia o estado inicial de verificação do perfil
  useEffect(() => {
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

  // 🚀 CORREÇÃO DO LOOP: Unificamos e blindamos as regras de redirecionamento 
  // para que não entrem em conflito umas com as outras.
  useEffect(() => {
    if (isVerifying) return;

    if (isTrocaSenhaObrigatoria) return;

    // 1. Se não houver módulo ativo, vai para a seleção de módulos
    if (!moduloAtivo) {
      if (location.pathname !== '/modulos') {
        navigate('/modulos', { replace: true })
      }
      return;
    }

    // 2. Se o utilizador não tiver acesso total e estiver numa rota proibida, redireciona com segurança
    if (!hasFullAccess && !isLimitedRoute) {
      const rotaDesejada = `/${moduloAtivo}/suporte`;
      if (location.pathname !== rotaDesejada) {
        navigate(rotaDesejada, { replace: true })
      }
    }
  }, [isVerifying, moduloAtivo, hasFullAccess, isLimitedRoute, isTrocaSenhaObrigatoria, location.pathname, navigate])

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
      navigate('/login', { replace: true })
    }
  }

  if (!moduloAtivo && !isTrocaSenhaObrigatoria) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4 text-slate-500 animate-in fade-in duration-500">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <span className="text-sm font-bold tracking-wide uppercase">Ajustando ambiente...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden overscroll-none pb-safe-bottom">
      
      <MenuSidebar 
        profile={profile}
        hasFullAccess={hasFullAccess}
        isTrocaSenhaObrigatoria={isTrocaSenhaObrigatoria}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        handleLogout={handleLogout}
        setModalSenhaAberto={setModalSenhaAberto}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        
        <header className={`md:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 h-16 shrink-0 shadow-sm transition-all duration-300 pt-safe-top sticky top-0 z-40 ${isTrocaSenhaObrigatoria ? 'hidden' : ''}`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-black text-xs shadow-inner">
              IO
            </div>
            <span className="font-black text-slate-800 text-sm tracking-tight">IOFV <span className="text-indigo-600">GESTÃO</span></span>
          </div>
          
          <div className="flex items-center gap-3">
            <NotificacoesBell />
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors active:scale-95">
              <Menu size={24} />
            </button>
          </div>
        </header>

        <main className={`flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain bg-slate-50/50 transition-all duration-500 ${isTrocaSenhaObrigatoria ? 'blur-md pointer-events-none select-none brightness-95' : ''}`}>
          
          <div className="w-full px-3 sm:px-6 md:px-8 py-4 md:py-8 max-w-[1800px] mx-auto min-h-full flex flex-col">
            {isVerifying ? (
               <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                 <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                 <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Autenticando acesso...</span>
               </div>
            ) : (!hasFullAccess && !isLimitedRoute && !isTrocaSenhaObrigatoria) ? (
               <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in duration-300">
                 <span className="text-sm font-bold text-slate-400 bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm">
                   Redirecionando para área permitida...
                 </span>
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