import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LogIn, ShieldCheck, Mail, Lock, Loader2, AlertTriangle, Activity } from 'lucide-react'
import { VERSAO_SISTEMA } from '../config'

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
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    
    if (authError) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

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
        setError('ACESSO BLOQUEADO: Contate o administrador do sistema.')
        await supabase.auth.signOut()
      } else {
        navigate('/modulos')
      }
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-4 font-sans relative overflow-hidden">
      
      {/* BACKGROUND GLOW EFFECTS */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-md w-full bg-white/95 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-2xl border border-white/20 p-8 md:p-10 relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-400"></div>

        <div className="text-center mb-8 mt-2">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-700 to-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-blue-600/30 ring-4 ring-blue-50">
            <Activity size={32} className="animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">IOFV GESTÃO</h2>
          <p className="text-slate-500 text-xs font-semibold mt-1">Plataforma de Engenharia Hospitalar & TI</p>
          <div className="mt-3">
            <span className="text-blue-700 text-[10px] font-black uppercase tracking-[0.2em] bg-blue-50 border border-blue-200/60 px-3 py-1 rounded-full shadow-sm">
              Acesso Restrito
            </span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-3.5">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Mail size={18} />
              </div>
              <input
                type="email"
                placeholder="E-mail corporativo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50/80 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all outline-none text-slate-800 text-sm font-medium placeholder:text-slate-400"
                required
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </div>
              <input
                type="password"
                placeholder="Sua senha de acesso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50/80 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all outline-none text-slate-800 text-sm font-medium placeholder:text-slate-400"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold text-center animate-in shake duration-300 flex items-center justify-center gap-2 shadow-sm">
              {error.includes('BLOQUEADO') ? <AlertTriangle size={16} /> : <ShieldCheck size={16} />} 
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-700 to-blue-900 hover:from-blue-800 hover:to-blue-950 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 transition-all active:scale-95 mt-2 disabled:opacity-70 text-sm"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Autenticando cofre...</>
            ) : (
              <><LogIn size={18}/> Entrar no Painel</>
            )}
          </button>
        </form>
      </div>

      <div className="mt-8 flex flex-col items-center opacity-70 hover:opacity-100 transition-opacity relative z-10">
        <div className="flex items-center gap-2 text-slate-300 text-[10px] font-bold tracking-[0.2em] uppercase">
          <ShieldCheck size={14} className="text-blue-400" />
          Desenvolvido por Pedro Oliveira • {VERSAO_SISTEMA}
        </div>
      </div>
    </div>
  )
}