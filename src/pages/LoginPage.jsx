import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LogIn, ShieldCheck, Mail, Lock, Loader2, AlertTriangle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    // 1. Tenta fazer o login no cofre de senhas
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    
    if (authError) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    // 2. Se a senha está certa, verifica se a conta está bloqueada
    if (authData?.user) {
      const { data: perfilData, error: perfilError } = await supabase
        .from('perfis')
        .select('esta_bloqueado')
        .eq('user_id', authData.user.id)
        .single()

      if (perfilError) {
        setError('Erro ao validar permissões da conta.')
        await supabase.auth.signOut()
      } else if (perfilData?.esta_bloqueado) {
        // Bloqueio ativado! Desloga imediatamente e avisa
        setError('ACESSO BLOQUEADO: Contate o administrador do sistema.')
        await supabase.auth.signOut()
      } else {
        // Tudo certo e liberado!
        navigate('/dashboard')
      }
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 font-sans relative overflow-hidden">
      
      {/* EFEITOS DE FUNDO MODERNOS */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/10 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/40 p-8 md:p-10 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-700 to-blue-400"></div>

        <div className="text-center mb-10 mt-2">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-700 to-blue-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-5 shadow-lg shadow-blue-500/30 ring-4 ring-blue-50">
            <span className="text-2xl font-black tracking-tighter">IOFV</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Gestão de Equipamentos</h2>
          <p className="text-blue-600 text-xs font-bold uppercase tracking-[0.2em] mt-2 bg-blue-50 inline-block px-3 py-1 rounded-full border border-blue-100">Acesso Restrito</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Mail size={18} />
              </div>
              <input
                type="email"
                placeholder="E-mail corporativo (@iofv.com)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-700 font-medium placeholder:text-slate-400"
                required
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </div>
              <input
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-700 font-medium placeholder:text-slate-400"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold text-center animate-in shake duration-300 flex items-center justify-center gap-2">
              {error.includes('BLOQUEADO') ? <AlertTriangle size={16} /> : <ShieldCheck size={16} />} 
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 mt-2 disabled:opacity-70"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Autenticando...</>
            ) : (
              <><LogIn size={18}/> Entrar no Painel</>
            )}
          </button>
        </form>
      </div>

      <div className="mt-8 md:mt-12 flex flex-col items-center opacity-60 hover:opacity-100 transition-opacity relative z-10">
        <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold tracking-[0.2em] uppercase">
          <ShieldCheck size={12} className="text-blue-500" />
          Desenvolvido por Pedro Oliveira - IOFV
        </div>
      </div>
    </div>
  )
}