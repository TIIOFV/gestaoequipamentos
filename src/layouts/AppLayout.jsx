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

  // Se estiver a verificar ou se perdeu o módulo (e vai ser redirecionado), mostra apenas a tela de carregamento
  if (!moduloAtivo && !isTrocaSenhaObrigatoria) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="text-sm font-bold">Ajustando ambiente...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* 1. O MENU LATERAL AGORA É APENAS UMA LINHA DE CÓDIGO AQUI */}
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
        {/* CABEÇALHO MOBILE */}
        <header className={`md:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 h-16 shrink-0 shadow-sm ${isTrocaSenhaObrigatoria ? 'hidden' : ''}`}>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-800 text-white rounded md flex items-center justify-center font-bold text-xs mr-2">IOFV</div>
            <span className="font-bold text-slate-800 text-sm">GESTÃO</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100">
              <Menu size={24} />
            </button>
          </div>
        </header>

        {/* ÁREA PRINCIPAL ONDE AS PÁGINAS RENDERIZAM */}
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