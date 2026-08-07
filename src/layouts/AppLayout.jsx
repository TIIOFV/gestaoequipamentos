import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Menu, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useModulo } from '../contexts/ModuloContext'
import ModalAlterarSenha from '../components/ModalAlterarSenha'

// O NOSSO NOVO COMPONENTE DE MENU
import MenuSidebar from './components/MenuSidebar' 

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const { moduloAtivo, limparModulo } = useModulo()

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [modalSenhaAberto, setModalSenhaAberto] = useState(false)

  // REGRAS DE SEGURANÇA E ACESSO
  const hasFullAccess = profile?.perfil === 'administrador' || profile?.perfil === 'analista'
  const isAgendaRoute = location.pathname.includes('/agenda')
  const isTrocaSenhaObrigatoria = profile?.precisa_trocar_senha === true

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

  // 1. TRAVA DE SEGURANÇA CONTRA O "/null/":
  // Se terminou de verificar e não encontrou módulo ativo, volta para a seleção
  useEffect(() => {
    if (!isVerifying && !moduloAtivo && !isTrocaSenhaObrigatoria) {
      navigate('/modulos', { replace: true })
    }
  }, [isVerifying, moduloAtivo, isTrocaSenhaObrigatoria, navigate])

  // 2. REDIRECIONAMENTO POR PERFIL:
  useEffect(() => {
    if (!isVerifying && !hasFullAccess && !isAgendaRoute && !isTrocaSenhaObrigatoria && moduloAtivo) {
      navigate(`/${moduloAtivo}/agenda`, { replace: true })
    }
  }, [isVerifying, hasFullAccess, isAgendaRoute, isTrocaSenhaObrigatoria, navigate, moduloAtivo])

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

  // TELA DE CARREGAMENTO INICIAL
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
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* MENU LATERAL */}
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
        
        {/* CABEÇALHO MOBILE (Corrigido erro do Tailwind "rounded md") */}
        <header className={`md:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 h-16 shrink-0 shadow-sm transition-all duration-300 ${isTrocaSenhaObrigatoria ? 'hidden' : ''}`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-black text-xs shadow-inner">
              IO
            </div>
            <span className="font-black text-slate-800 text-sm tracking-tight">IOFV <span className="text-indigo-600">GESTÃO</span></span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors active:scale-95">
            <Menu size={24} />
          </button>
        </header>

        {/* ÁREA PRINCIPAL ONDE AS PÁGINAS RENDERIZAM */}
        <main className={`flex-1 overflow-x-hidden overflow-y-auto bg-slate-50/50 transition-all duration-500 ${isTrocaSenhaObrigatoria ? 'blur-md pointer-events-none select-none brightness-95' : ''}`}>
          
          {/* 🚀 A MÁGICA ACONTECE AQUI: w-full e max-w-[1800px] para esticar nas telas grandes! */}
          <div className="p-4 md:p-6 lg:p-8 w-full max-w-[1800px] mx-auto min-h-full flex flex-col">
            {isVerifying ? (
               <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                 <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                 <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Autenticando acesso...</span>
               </div>
            ) : (!hasFullAccess && !isAgendaRoute && !isTrocaSenhaObrigatoria) ? (
               <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in duration-300">
                 <span className="text-sm font-bold text-slate-400 bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm">
                   Redirecionando para área permitida...
                 </span>
               </div>
            ) : (
              // 🚀 Todas as páginas (Dashboard, Bilhetagem, Releases) caem aqui dentro!
              <Outlet />
            )}
          </div>
        </main>
      </div>
      
      {/* MODAL DE SENHA */}
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