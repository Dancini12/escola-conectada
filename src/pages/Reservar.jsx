import { useState, useEffect, useCallback } from 'react'
import { Laptop, Check, AlertTriangle, RefreshCw, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAgendamentos } from '../hooks/useAgendamentos'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  fetchOccupiedBookings,
  getRemainingQuantity,
  isBookingConflictError,
  isPastSlot,
} from '../lib/bookingAvailability'
import { useNavigate } from 'react-router-dom'

const SLOT_STARTS = ['07:30','08:20','09:25','11:05','12:55','13:45','14:55','15:45']
const SLOT_ENDS   = ['08:20','09:10','10:15','11:55','13:45','14:35','15:45','16:35']

const MONTHS_PT  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const WEEKDAYS_PT = ['D','S','T','Q','Q','S','S']

const RECURSOS = [
  {
    id: 2, tipo: 'chromebook', nome: 'Chromebooks', total: 35, Icon: Laptop,
    iconBg: 'bg-violet-100', iconText: 'text-violet-600', bar: 'bg-violet-500',
  },
]

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function nowHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function fmtTime(d) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function Reservar() {
  const { profile } = useAuth()
  const { criarAgendamento } = useAgendamentos()
  const navigate = useNavigate()

  const [live, setLive] = useState(() => Object.fromEntries(
    RECURSOS.map(recurso => [
      recurso.id,
      { emUso: 0, disponivel: recurso.total },
    ])
  ))
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)

  const [selected, setSelected] = useState(null)
  const [formDate, setFormDate]   = useState(todayStr())
  const [calMonth, setCalMonth]   = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [formSlots, setFormSlots] = useState([]) // array of selected slot starts
  const [ocupados, setOcupados]   = useState([]) // bookings for selected date+resource
  const [formQtd, setFormQtd]     = useState('')
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)

  // Confirmation modal
  const [showModal, setShowModal]     = useState(false)
  const [submitting, setSubmitting]   = useState(false)

  const fetchLive = useCallback(async (showRefreshing = true) => {
    if (showRefreshing) setRefreshing(true)
    if (!isSupabaseConfigured()) {
      setLastRefresh(new Date())
      if (showRefreshing) setRefreshing(false)
      return
    }
    const now = nowHHMM()
    const today = todayStr()
    const next = {}
    for (const r of RECURSOS) {
      let bookings = []
      try {
        bookings = await fetchOccupiedBookings(r.id, today)
      } catch {
        bookings = []
      }
      const emUso = bookings
        .filter(booking => booking.horario_inicio <= now && booking.horario_fim > now)
        .reduce((total, booking) => total + (booking.quantidade || 0), 0)
      next[r.id] = { emUso, disponivel: r.total - emUso }
    }
    setLive(next)
    setLastRefresh(new Date())
    if (showRefreshing) setRefreshing(false)
  }, [])

  useEffect(() => {
    fetchLive(false)
    if (!isSupabaseConfigured()) return

    const intervalId = window.setInterval(() => fetchLive(false), 5000)
    const handleFocus = () => fetchLive(false)
    window.addEventListener('focus', handleFocus)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchLive])

  const fetchOcupados = useCallback(async () => {
    if (!selected || !formDate || !isSupabaseConfigured()) {
      setOcupados([])
      return []
    }

    try {
      const bookings = await fetchOccupiedBookings(selected.id, formDate)
      setOcupados(bookings)
      return bookings
    } catch {
      setOcupados([])
      return []
    }
  }, [selected, formDate])

  // Atualiza ao trocar a data/recurso e enquanto a grade estiver aberta.
  useEffect(() => {
    fetchOcupados()
    if (!selected || !formDate || !isSupabaseConfigured()) return

    const intervalId = window.setInterval(fetchOcupados, 5000)
    const handleFocus = () => fetchOcupados()
    window.addEventListener('focus', handleFocus)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchOcupados, selected, formDate])

  useEffect(() => {
    const precisa = Number(formQtd) || 1
    const selectedSlotBecameUnavailable = formSlots.some(slotStart => {
      const idx = SLOT_STARTS.indexOf(slotStart)
      const remaining = getRemainingQuantity(ocupados, slotStart, SLOT_ENDS[idx], selected?.total ?? 0)
      return remaining < precisa
    })

    if (selectedSlotBecameUnavailable) {
      setFormSlots([])
      setFormQtd('')
      setShowModal(false)
      setError('Esse horário não tem mais unidades disponíveis para a quantidade selecionada. Escolha outro horário ou quantidade.')
    }
  }, [ocupados, formSlots])

  function getSlotDisponivel(slotStart) {
    if (!selected) return 0
    if (isPastSlot(formDate, slotStart)) return 0
    const idx = SLOT_STARTS.indexOf(slotStart)
    const end = SLOT_ENDS[idx]
    return getRemainingQuantity(ocupados, slotStart, end, selected.total)
  }

  // Minimum available across all selected slots
  const slotDisponivel = formSlots.length === 0
    ? (selected?.total ?? 0)
    : Math.min(...formSlots.map(getSlotDisponivel))

  function buildCalendar() {
    const y = calMonth.getFullYear(), m = calMonth.getMonth()
    const total = new Date(y, m + 1, 0).getDate()
    const firstWD = new Date(y, m, 1).getDay()
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const days = []

    const prevTotal = new Date(y, m, 0).getDate()
    for (let i = firstWD - 1; i >= 0; i--) {
      days.push({ d: prevTotal - i, cur: false, dt: null })
    }
    for (let d = 1; d <= total; d++) {
      const dt = new Date(y, m, d)
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({
        d, cur: true, dt, dateStr,
        past: dt < today,
        isToday: dt.toDateString() === today.toDateString(),
        isSel: formDate === dateStr,
      })
    }
    while (days.length % 7 !== 0) {
      days.push({ d: '', cur: false, dt: null })
    }
    return days
  }

  function prevMonth() { setCalMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)) }
  function nextMonth() { setCalMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)) }

  function selectDay(day) {
    if (!day.cur || day.past) return
    setFormDate(day.dateStr)
    setFormSlots([])
    setFormQtd('')
  }

  function toggleSlot(start) {
    setError('')
    setFormSlots(prev =>
      prev.includes(start) ? prev.filter(s => s !== start) : [...prev, start]
    )
  }

  function selectRecurso(r) {
    setSelected(r)
    setOcupados([])
    setFormSlots([])
    setFormQtd("")
    setError('')
    setSuccess(false)
  }

  function openModal(e) {
    e.preventDefault()
    setError('')
    setShowModal(true)
  }

  async function submitBooking() {
    setSubmitting(true)
    setError('')

    const sorted = [...formSlots].sort()
    const horario_inicio = sorted[0]
    const lastIdx = SLOT_STARTS.indexOf(sorted[sorted.length - 1])
    const horario_fim = SLOT_ENDS[lastIdx]
    const cancel_token = crypto.randomUUID()

    const latestBookings = await fetchOcupados()
    const minRemaining = Math.min(
      ...sorted.map(slotStart => {
        const idx = SLOT_STARTS.indexOf(slotStart)
        return getRemainingQuantity(latestBookings, slotStart, SLOT_ENDS[idx], selected.total)
      })
    )
    if (minRemaining < Number(formQtd)) {
      setError('Esse horário não tem mais unidades suficientes disponíveis. Escolha outro horário ou quantidade.')
      setSubmitting(false)
      return
    }

    const payload = {
      usuario_id: profile?.id,
      recurso_id: selected.id,
      data: formDate,
      horario_inicio,
      horario_fim,
      quantidade: formQtd,
      status: 'pendente',
      cancel_token,
      email: profile?.email ?? '',
    }

    if (!isSupabaseConfigured()) {
      await criarAgendamento({ ...payload, recursos: { nome: selected.nome, tipo: selected.tipo } })
    } else {
      const { error: err } = await supabase.from('agendamentos').insert(payload)
      if (err) {
        setError(
          isBookingConflictError(err)
            ? 'Este horário acabou de ser reservado. Escolha outro horário.'
            : err.message
        )
        await fetchOcupados()
        setSubmitting(false)
        return
      }

      supabase.functions.invoke('send-booking-email', {
        body: {
          token: cancel_token,
          email: profile?.email ?? '',
          nome: profile?.nome ?? '',
          recurso: selected.nome,
          data: formDate,
          horario_inicio,
          horario_fim,
          quantidade: formQtd,
          cancel_url: `${window.location.origin}/cancelar?token=${cancel_token}`,
        },
      })

      fetchLive()
    }

    setSubmitting(false)
    setShowModal(false)
    setSuccess(true)
    setTimeout(() => navigate('/meus-agendamentos'), 2200)
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">Agendamento enviado!</h2>
        <p className="text-gray-500 text-sm">Reserva registrada. Redirecionando...</p>
      </div>
    )
  }

  return (
    <>
      <div className="max-w-xl">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Reservar Equipamento</h1>
            <p className="text-gray-500 text-sm mt-0.5">Selecione o equipamento e preencha o formulário</p>
          </div>
          <button
            onClick={() => fetchLive()}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mt-1 transition-colors"
            title="Atualizar disponibilidade"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {fmtTime(lastRefresh)}
          </button>
        </div>

        {/* Resource Cards */}
        <div className="flex gap-4 mb-6">
          {RECURSOS.map(r => {
            const { emUso, disponivel } = live[r.id] ?? { emUso: 0, disponivel: r.total }
            const pct = Math.round((emUso / r.total) * 100)
            const isSel = selected?.id === r.id

            return (
              <button
                key={r.id}
                onClick={() => selectRecurso(r)}
                className={`flex-1 p-5 rounded-2xl border-2 text-left transition-all
                  ${isSel
                    ? 'border-primary-500 bg-primary-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2.5 rounded-xl ${isSel ? 'bg-primary-500 text-white' : `${r.iconBg} ${r.iconText}`}`}>
                    <r.Icon className="w-5 h-5" />
                  </div>
                  {isSel && (
                    <span className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                  )}
                </div>

                <p className="font-bold text-gray-800 text-base mb-3">{r.nome}</p>

                <div className="flex justify-between text-sm font-semibold mb-1.5">
                  <span className="text-green-600">{disponivel} disponíveis</span>
                  <span className="text-gray-400">{emUso} em uso</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                  <div className={`h-full rounded-full transition-all ${r.bar}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-gray-400">{r.total} unidades no total</p>
              </button>
            )
          })}
        </div>

        {/* Booking Form */}
        {selected && (
          <div className="card p-6">
            <h2 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
              <selected.Icon className="w-4 h-4 text-gray-500" />
              Agendar {selected.nome}
            </h2>

            <form onSubmit={openModal} className="space-y-5">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Data</label>
                <div className="border-2 border-gray-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <button type="button" onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                      <ChevronLeft className="w-4 h-4 text-gray-500" />
                    </button>
                    <span className="text-sm font-semibold text-gray-700">
                      {MONTHS_PT[calMonth.getMonth()]} {calMonth.getFullYear()}
                    </span>
                    <button type="button" onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {WEEKDAYS_PT.map((w, i) => (
                      <div key={i} className="text-center text-[10px] font-semibold text-gray-400 py-1">{w}</div>
                    ))}
                    {buildCalendar().map((day, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectDay(day)}
                        disabled={!day.cur || day.past}
                        className={`text-center text-xs py-1.5 rounded-lg font-medium transition-all
                          ${!day.cur ? 'text-transparent cursor-default' : ''}
                          ${day.cur && day.past ? 'text-gray-300 cursor-not-allowed' : ''}
                          ${day.isSel ? 'bg-primary-500 text-white shadow-sm' : ''}
                          ${day.isToday && !day.isSel ? 'ring-1 ring-primary-400 text-primary-600 font-bold' : ''}
                          ${day.cur && !day.past && !day.isSel ? 'hover:bg-primary-50 text-gray-700' : ''}
                        `}
                      >
                        {day.d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Horário
                  {formSlots.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-primary-600">
                      {(() => {
                        const sorted = [...formSlots].sort()
                        const lastIdx = SLOT_STARTS.indexOf(sorted[sorted.length - 1])
                        return `${sorted[0]} – ${SLOT_ENDS[lastIdx]}`
                      })()}
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SLOT_STARTS.map((s, i) => {
                    const disp = getSlotDisponivel(s)
                    const esgotado = disp <= 0
                    const sel = formSlots.includes(s)
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => !esgotado && toggleSlot(s)}
                        disabled={esgotado}
                        className={`py-2 px-2 rounded-xl text-xs font-semibold border-2 transition-all
                          ${esgotado
                            ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                            : sel
                              ? 'border-primary-500 bg-primary-500 text-white'
                              : 'border-gray-200 text-gray-600 hover:border-primary-300 hover:bg-primary-50'
                          }`}
                      >
                        {s}–{SLOT_ENDS[i]}
                      </button>
                    )
                  })}
                </div>
                {formSlots.length > 1 && (
                  <p className="text-xs text-gray-400 mt-2">
                    {formSlots.length} horários selecionados
                  </p>
                )}
              </div>

              {formSlots.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Quantidade
                    <span className="ml-2 text-xs font-normal text-green-600">
                      {slotDisponivel} equipamento{slotDisponivel !== 1 ? 's' : ''} disponível{slotDisponivel !== 1 ? 'is' : ''} neste horário
                    </span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setFormQtd(q => Math.max(1, (Number(q) || 1) - 1))}
                      className="w-10 h-10 rounded-xl border-2 border-gray-200 text-gray-600 text-xl font-bold hover:border-primary-400 transition-colors"
                    >
                      −
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formQtd}
                      onChange={e => {
                        const raw = e.target.value.replace(/\D/g, '')
                        if (raw === '') { setFormQtd(''); return }
                        setFormQtd(Math.min(slotDisponivel, Math.max(1, Number(raw))))
                      }}
                      className="w-14 text-center text-2xl font-bold text-gray-800 tabular-nums border-2 border-gray-200 rounded-xl py-1.5 focus:outline-none focus:border-primary-400"
                    />
                    <button
                      type="button"
                      onClick={() => setFormQtd(q => Math.min(slotDisponivel, (Number(q) || 0) + 1))}
                      disabled={Number(formQtd) >= slotDisponivel}
                      className="w-10 h-10 rounded-xl border-2 border-gray-200 text-gray-600 text-xl font-bold hover:border-primary-400 transition-colors disabled:opacity-40"
                    >
                      +
                    </button>
                    <input
                      type="range"
                      min={1}
                      max={Math.max(1, slotDisponivel)}
                      value={Number(formQtd) || 1}
                      onChange={e => setFormQtd(Number(e.target.value))}
                      className="flex-1 accent-primary-500"
                    />
                  </div>
                </div>
              )}

              {error && !showModal && (
                <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={formSlots.length === 0}
                className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                Confirmar Agendamento
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">

            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-lg">Confirmar agendamento</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm text-gray-500 mb-5">
                Sua reserva ficará registrada e poderá ser cancelada em "Meus Agendamentos".
              </p>

              <div className="bg-gray-50 rounded-xl p-4 text-sm">
                <p className="text-gray-400 text-xs mb-1">Reservando como</p>
                <p className="font-semibold text-gray-800">{profile?.nome}</p>
                <p className="text-gray-500">{profile?.email}</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm mt-4">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-5 pt-0">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={submitBooking}
                disabled={submitting}
                className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Enviar confirmação'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
