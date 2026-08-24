import { useState, useEffect } from 'react'
import { X, Smartphone, Download } from 'lucide-react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // 1. Verifica se já está instalado (se está a abrir como App)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsStandalone(true)
      return
    }

    // 2. Deteta se é iOS (iPhone/iPad)
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIosDevice)

    if (isIosDevice) {
      // A Apple não permite um botão de instalação direto, então mostramos uma dica após 3 segundos
      const timer = setTimeout(() => setShowPrompt(true), 3000)
      return () => clearTimeout(timer)
    }

    // 3. Sistema Android / Windows (Deteta o evento nativo de instalação)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault() // Impede o banner feio padrão do Google Chrome
      setDeferredPrompt(e) // Guarda o evento para o nosso botão personalizado
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    
    // Mostra o pop-up nativo de instalação do sistema
    deferredPrompt.prompt()
    
    // Aguarda a resposta do utilizador
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  // Se já estiver instalado ou se o utilizador fechar, não renderiza nada
  if (!showPrompt || isStandalone) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-96 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl z-[99999] animate-in slide-in-from-bottom-8 fade-in duration-500 flex items-start gap-4 border border-slate-700">
      <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
        <Smartphone size={24} className="text-white" />
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-black text-sm uppercase tracking-widest mb-1 text-slate-100">App IOFV Gestão</h4>
        
        {isIOS ? (
          <p className="text-xs font-medium text-slate-400 leading-relaxed">
            Para instalar, toque no botão de Partilhar <span className="inline-block border border-slate-600 rounded px-1.5 mx-0.5 bg-slate-800 text-[10px]">⬆</span> no rodapé do Safari e selecione <strong>Adicionar ao Ecrã Principal</strong>.
          </p>
        ) : (
          <>
            <p className="text-xs font-medium text-slate-400 leading-relaxed mb-3">
              Instale o sistema no seu telemóvel para um acesso nativo, mais rápido e em ecrã inteiro.
            </p>
            <button 
              onClick={handleInstallClick}
              className="bg-indigo-600 text-white font-bold text-xs px-4 py-2 rounded-lg hover:bg-indigo-500 transition-colors shadow-sm active:scale-95 flex items-center gap-2"
            >
              <Download size={14} /> Instalar Agora
            </button>
          </>
        )}
      </div>

      <button onClick={() => setShowPrompt(false)} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0 active:scale-95">
        <X size={18} />
      </button>
    </div>
  )
}