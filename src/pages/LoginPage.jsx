import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LogIn, ShieldCheck } from 'lucide-react'

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
    
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) setError('E-mail ou senha incorretos.')
    else navigate('/dashboard')
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-100 p-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>

        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
            <span className="text-2xl font-black tracking-tighter">IOFV</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Gestão de Equipamentos</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Acesso Restrito</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <input
            type="email"
            placeholder="E-mail corporativo (@iofv.com)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            required
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            required
          />

          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-bold text-center">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            {loading ? 'Entrando...' : <><LogIn size={18}/> Entrar no Painel</>}
          </button>
        </form>
      </div>

      <div className="mt-8 flex flex-col items-center opacity-40">
        <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold tracking-[0.2em] uppercase">
          <ShieldCheck size={12} />
          Desenvolvido por Pedro Oliveira - IOFV
        </div>
      </div>
    </div>
  )
}