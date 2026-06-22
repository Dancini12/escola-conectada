import { useState, useEffect, useCallback } from 'react'
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

export function useAgendamentos() {
  const { user, profile } = useAuth()
  const [agendamentos, setAgendamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAgendamentos = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    if (!isSupabaseConfigured()) {
      setAgendamentos(DEMO_AGENDAMENTOS)
      setLoading(false)
      return
    }

    let query = supabase
      .from('agendamentos')
      .select('*, recursos(nome, tipo), usuarios(nome)')
      .order('data', { ascending: false })
      .order('horario_inicio', { ascending: true })

    // RLS handles this, but if the user is not admin, also filter client side
    if (profile?.perfil === 'aluno') {
      query = query.eq('usuario_id', user.id)
    }

    const { data, error: err } = await query
    if (err) setError(err.message)
    else setAgendamentos(data || [])
    setLoading(false)
  }, [user, profile])

  useEffect(() => {
    fetchAgendamentos()
  }, [fetchAgendamentos])

  async function criarAgendamento(payload) {
    if (!isSupabaseConfigured()) {
      const novo = {
        ...payload,
        id: Date.now(),
        created_at: new Date().toISOString(),
        recursos: { nome: 'Tablets', tipo: 'tablet' },
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
      setAgendamentos(prev =>
        prev.map(a => a.id === id ? { ...a, status: 'cancelado' } : a)
      )
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

  return {
    agendamentos,
    loading,
    error,
    criarAgendamento,
    cancelarAgendamento,
    aprovarAgendamento,
    refetch: fetchAgendamentos,
  }
}
