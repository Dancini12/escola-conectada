import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from './useAuth'

// Demo data when Supabase is not configured
const DEMO_AGENDAMENTOS = [
  {
    id: 1,
    usuario_id: 'demo-user-id',
    recurso_id: 1,
    data: new Date().toISOString().split('T')[0],
    horario_inicio: '09:00',
    horario_fim: '11:00',
    quantidade: 5,
    finalidade: 'Aula',
    status: 'confirmado',
    created_at: new Date().toISOString(),
    recursos: { nome: 'Tablets', tipo: 'tablet' },
    usuarios: { nome: 'Prof. Demo' },
  },
  {
    id: 2,
    usuario_id: 'demo-user-id',
    recurso_id: 2,
    data: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    horario_inicio: '14:00',
    horario_fim: '15:00',
    quantidade: 15,
    finalidade: 'Pesquisa',
    status: 'pendente',
    created_at: new Date().toISOString(),
    recursos: { nome: 'Chromebooks', tipo: 'chromebook' },
    usuarios: { nome: 'Prof. Demo' },
  },
  {
    id: 3,
    usuario_id: 'demo-user-id',
    recurso_id: 3,
    data: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    horario_inicio: '10:00',
    horario_fim: '11:00',
    quantidade: 3,
    finalidade: 'Avaliação',
    status: 'cancelado',
    created_at: new Date().toISOString(),
    recursos: { nome: 'Notebooks', tipo: 'notebook' },
    usuarios: { nome: 'Prof. Demo' },
  },
]

const AgendamentosContext = createContext(null)

export function AgendamentosProvider({ children }) {
  const { user, profile } = useAuth()
  const [agendamentos, setAgendamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAgendamentos = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (!isSupabaseConfigured()) {
      setAgendamentos(DEMO_AGENDAMENTOS)
      setLoading(false)
      return
    }

    if (!user) {
      setAgendamentos([])
      setLoading(false)
      return
    }

    const query = supabase
      .from('agendamentos')
      .select('*, recursos(nome, tipo), usuarios(nome)')
      .order('data', { ascending: false })
      .order('horario_inicio', { ascending: true })

    const { data, error: err } = await query
    if (err) setError(err.message)
    else setAgendamentos(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchAgendamentos()
  }, [fetchAgendamentos])

  async function criarAgendamento(payload) {
    if (!isSupabaseConfigured()) {
      const novo = {
        ...payload,
        id: Date.now(),
        created_at: new Date().toISOString(),
        recursos: payload.recursos ?? { nome: 'Tablets', tipo: 'tablet' },
        usuarios: { nome: profile?.nome },
      }
      setAgendamentos(prev => [novo, ...prev])
      return { data: novo, error: null }
    }

    const { data, error: err } = await supabase
      .from('agendamentos')
      .insert(payload)
      .select('*, recursos(nome, tipo), usuarios(nome)')
      .single()

    if (!err) {
      setAgendamentos(prev => [data, ...prev])
    }
    return { data, error: err }
  }

  async function cancelarAgendamento(id) {
    if (!isSupabaseConfigured()) {
      setAgendamentos(prev =>
        prev.map(a => a.id === id ? { ...a, status: 'cancelado' } : a)
      )
      return { error: null }
    }

    const { error: err } = await supabase
      .from('agendamentos')
      .update({ status: 'cancelado' })
      .eq('id', id)

    if (!err) {
      const cancelado = agendamentos.find(a => a.id === id)
      setAgendamentos(prev =>
        prev.map(a => a.id === id ? { ...a, status: 'cancelado' } : a)
      )
      if (cancelado?.email) {
        supabase.functions.invoke('send-booking-email', {
          body: {
            tipo: 'cancelamento',
            token: cancelado.cancel_token,
            email: cancelado.email,
            nome: cancelado.usuarios?.nome ?? '',
            recurso: cancelado.recursos?.nome,
            data: cancelado.data,
            horario_inicio: cancelado.horario_inicio,
            horario_fim: cancelado.horario_fim,
            quantidade: cancelado.quantidade,
          },
        })
      }
    }
    return { error: err }
  }

  async function aprovarAgendamento(id) {
    if (!isSupabaseConfigured()) {
      setAgendamentos(prev =>
        prev.map(a => a.id === id ? { ...a, status: 'confirmado' } : a)
      )
      return { error: null }
    }

    const { error: err } = await supabase
      .from('agendamentos')
      .update({ status: 'confirmado' })
      .eq('id', id)

    if (!err) {
      setAgendamentos(prev =>
        prev.map(a => a.id === id ? { ...a, status: 'confirmado' } : a)
      )
    }
    return { error: err }
  }

  return (
    <AgendamentosContext.Provider
      value={{
        agendamentos,
        loading,
        error,
        criarAgendamento,
        cancelarAgendamento,
        aprovarAgendamento,
        refetch: fetchAgendamentos,
      }}
    >
      {children}
    </AgendamentosContext.Provider>
  )
}

export function useAgendamentos() {
  const ctx = useContext(AgendamentosContext)
  if (!ctx) throw new Error('useAgendamentos must be used within AgendamentosProvider')
  return ctx
}
