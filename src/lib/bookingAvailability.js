import { supabase } from './supabase'

export async function fetchOccupiedBookings(recursoId, data) {
  const rpcResult = await supabase.rpc('get_horarios_ocupados', {
    p_recurso_id: recursoId,
    p_data: data,
  })

  if (!rpcResult.error) return rpcResult.data || []

  // Mantém compatibilidade enquanto a migration ainda não foi aplicada.
  const fallbackResult = await supabase
    .from('agendamentos')
    .select('horario_inicio, horario_fim, quantidade')
    .eq('recurso_id', recursoId)
    .eq('data', data)
    .neq('status', 'cancelado')

  if (fallbackResult.error) throw fallbackResult.error
  return fallbackResult.data || []
}

export function overlapsBooking(bookings, start, end) {
  return bookings.some(booking =>
    booking.horario_inicio < end && booking.horario_fim > start
  )
}

// Quantas unidades ainda restam num horário, somando as reservas que
// se sobrepõem (várias pessoas podem reservar o mesmo horário desde
// que a soma não ultrapasse o total do recurso).
export function getRemainingQuantity(bookings, start, end, total) {
  const used = bookings
    .filter(b => b.horario_inicio < end && b.horario_fim > start)
    .reduce((sum, b) => sum + (b.quantidade || 0), 0)
  return Math.max(0, total - used)
}

export function isPastSlot(date, start) {
  if (!date) return false

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  if (date < today) return true
  if (date > today) return false

  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  return start <= currentTime
}

export function isBookingConflictError(error) {
  return error?.code === '23P01' || error?.message?.includes('horario_ja_reservado')
}
