import { useState, useEffect, createContext, useContext } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

// Demo user for when Supabase is not configured
const DEMO_USER = {
  id: 'demo-user-id',
  email: 'professor@escola.edu.br',
}
const DEMO_PROFILE = {
  id: 'demo-user-id',
  nome: 'Prof. Demo',
  email: 'professor@escola.edu.br',
  perfil: 'admin',
  turma: null,
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // Demo mode: auto-login with demo user
      setUser(DEMO_USER)
      setProfile(DEMO_PROFILE)
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data ?? null)
    setLoading(false)
  }

  async function signIn(email, password) {
    if (!isSupabaseConfigured()) {
      // Demo mode
      setUser(DEMO_USER)
      setProfile(DEMO_PROFILE)
      return { error: null }
    }
    return supabase.auth.signInWithPassword({ email, password })
  }

  async function signUp(email, password, metadata) {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Configure o Supabase para criar contas.' } }
    }
    return supabase.auth.signUp({ email, password, options: { data: metadata } })
  }

  async function signOut() {
    if (!isSupabaseConfigured()) {
      setUser(null)
      setProfile(null)
      return
    }
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const isAdmin = profile?.perfil === 'admin' || profile?.perfil === 'professor'

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
