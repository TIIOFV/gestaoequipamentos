import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (authUser) => {
    try {
      // Usamos maybeSingle() em vez de single() para não dar erro se não achar nada
      const { data, error } = await supabase
        .from('perfis')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle() 

      if (error) throw error

      if (data) {
        setProfile(data)
      } else {
        // CINTO DE SEGURANÇA: Se não achar, cria o perfil automaticamente agora!
        const novoPerfil = {
          user_id: authUser.id,
          email: authUser.email,
          nome: 'Pedro Augusto', // Já deixa o seu nome preenchido
          perfil: 'administrador'
        }

        const { data: insertedData, error: insertError } = await supabase
          .from('perfis')
          .insert([novoPerfil])
          .select()
          .single()

        if (!insertError) {
          setProfile(insertedData)
        }
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Carregando sistema...</div>
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, isAdmin: profile?.perfil === 'administrador' }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)