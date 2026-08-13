import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Tablet, Laptop, Monitor,
  Check, Info, Clock, Users, Calendar, AlertTriangle, X,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAgendamentos } from '../hooks/useAgendamentos'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { isSchoolEmail, SCHOOL_EMAIL_DOMAIN } from '../lib/emailValidation'
import {
  fetchOccupiedBookings,
  isBookingConflictError,
  isPastSlot,
  overlapsBooking,
} from '../lib/bookingAvailability'

// ─── Constants ───────────────────────────────────────────────
const DEMO_RECURSOS = [
  { id: 2, nome: 'Chromebooks', tipo: 'chromebook', quantidade_total: 35, descricao: 'Chromebooks para navegação e tarefas escolares' },
]

const SLOT_STARTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']
const SLOT_NEXT   = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']

const MONTHS_PT  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const WEEKDAYS_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

const STEPS = ['Recurso', 'Data e Horário', 'Quantidade']

// ─── Sub-components ──────────────────────────────────────────
function ResourceIcon({ tipo, size = 6 }) {
  const cls = `w-${size} h-${size}`
  if (tipo === 'tablet') return <Tablet className={cls} />
  if (tipo === 'sala') return <Monitor className={cls} />
  return <Laptop className={cls} />
}

function StepIndicator({ current }) {
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((label, i) => {
        const idx = i + 1
        const done = idx < current
        const active = idx === current
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                ${done || active ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {done ? <Check className="w-4 h-4" /> : idx}
              </div>
              <span className={`text-xs mt-1 font-medium whitespace-nowrap
                ${active ? 'text-primary-600' : done ? 'text-primary-400' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 transition-colors
                ${done ? 'bg-primary-500' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────
export default function Agendamentos() {
  const { profile } = useAuth()
  const { criarAgendamento } = useAgendamentos()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [recursos, setRecursos] = useState(DEMO_RECURSOS)
  const [selectedRecurso, setSelectedRecurso] = useState(DEMO_RECURSOS[0])

  // Step 2
  const [calDate, setCalDate] = useState(new Date())  // month being displayed
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSlotIdx, setSelectedSlotIdx] = useState(null) // index in SLOT_STARTS (start)
  const [slotDuration, setSlotDuration] = useState(1) // 1 or 2 hours
  const [ocupados, setOcupados] = useState([]) // [{horario_inicio, horario_fim, quantidade}]

  // Step 3
  const [quantidade, setQuantidade] = useState('')
  const [disponivel, setDisponivel] = useState(0)

  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Confirmation modal
  const [showModal, setShowModal]   = useState(false)
  const [modalNome, setModalNome]   = useState('')
  const [modalEmail, setModalEmail] = useState('')

  // ── Fetch recursos on mount ──
  useEffect(() => {
    if (!isSupabaseConfigured()) return
    supabase.from('recursos').select('*').then(({ data }) => {
      if (data?.length) {
        setRecursos(data)
        setSelectedRecurso(data[0])
      }
    })
  }, [])

  const fetchOcupados = async () => {
    if (!selectedDate || !selectedRecurso || !isSupabaseConfigured()) {
      setOcupados([])
      return []
    }

    try {
      const bookings = await fetchOccupiedBookings(selectedRecurso.id, fmtDate(selectedDate))
      setOcupados(bookings)
      return bookings
    } catch {
      setOcupados([])
      return []
    }
  }

  // ── Fetch ocupados when resource or date changes ──
  useEffect(() => {
    fetchOcupados()
    if (!selectedDate || !selectedRecurso || !isSupabaseConfigured()) return

    const intervalId = window.setInterval(fetchOcupados, 5000)
    const handleFocus = () => fetchOcupados()
    window.addEventListener('focus', handleFocus)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
    }
  }, [selectedDate, selectedRecurso])

  // ── Recalculate disponivel when slot or ocupados changes ──
  useEffect(() => {
    if (!selectedRecurso || selectedSlotIdx === null) return
    const slotStart = SLOT_STARTS[selectedSlotIdx]
    const used = ocupados
      .filter(o => o.horario_inicio <= slotStart && o.horario_fim > slotStart)
      .reduce((s, o) => s + (o.quantidade || 0), 0)
    setDisponivel(selectedRecurso.quantidade_total - used)
    setQuantidade(q => q === '' ? '' : Math.min(Number(q), selectedRecurso.quantidade_total - used))
  }, [selectedSlotIdx, ocupados, selectedRecurso])

  useEffect(() => {
    if (selectedSlotIdx === null) return

    const start = SLOT_STARTS[selectedSlotIdx]
    const end = slotDuration === 2
      ? SLOT_NEXT[selectedSlotIdx + 1]
      : SLOT_NEXT[selectedSlotIdx]

    if (overlapsBooking(ocupados, start, end)) {
      setSelectedSlotIdx(null)
      setSlotDuration(1)
      setQuantidade('')
      setShowModal(false)
      setSubmitError('O horário selecionado acabou de ser reservado. Escolha outro horário.')
      if (step === 3) setStep(2)
    }
  }, [ocupados, selectedSlotIdx, slotDuration, step])

  // ─── Calendar helpers ────────────────────────────────────
  function buildCalendar() {
    const y = calDate.getFullYear(), m = calDate.getMonth()
    const total = new Date(y, m + 1, 0).getDate()
    const firstWD = new Date(y, m, 1).getDay()
    const today = new Date(); today.setHours(0,0,0,0)
    const days = []

    // leading blanks from prev month
    const prevTotal = new Date(y, m, 0).getDate()
    for (let i = firstWD - 1; i >= 0; i--) {
      days.push({ d: prevTotal - i, cur: false, past: true, dt: null })
    }
    // current month
    for (let d = 1; d <= total; d++) {
      const dt = new Date(y, m, d)
      days.push({
        d, cur: true, dt,
        past: dt < today,
        isToday: dt.toDateString() === today.toDateString(),
        isSel: selectedDate?.toDateString() === dt.toDateString(),
      })
    }
    // trailing
    while (days.length % 7 !== 0) {
      days.push({ d: days.length - total - firstWD + 1, cur: false, past: false, dt: null })
    }
    return days
  }

  function prevMonth() { setCalDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)) }
  function nextMonth() { setCalDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)) }

  function selectDay(day) {
    if (!day.cur || day.past) return
    setSelectedDate(day.dt)
    setSelectedSlotIdx(null)
    setSlotDuration(1)
  }

  // ─── Slot helpers ───────────────────────────────────────
  function isSlotOcupado(idx) {
    const start = SLOT_STARTS[idx]
    const end = SLOT_NEXT[idx]
    const dateStr = selectedDate ? fmtDate(selectedDate) : null
    return overlapsBooking(ocupados, start, end) || isPastSlot(dateStr, start)
  }

  function handleSlotClick(idx) {
    if (isSlotOcupado(idx)) return
    setSubmitError('')
    if (selectedSlotIdx === null) {
      setSelectedSlotIdx(idx)
      setSlotDuration(1)
    } else if (idx === selectedSlotIdx) {
      // deselect
      setSelectedSlotIdx(null)
      setSlotDuration(1)
    } else if (idx === selectedSlotIdx + 1 && slotDuration === 1 && !isSlotOcupado(idx)) {
      // extend to 2h
      setSlotDuration(2)
    } else {
      // start fresh
      setSelectedSlotIdx(idx)
      setSlotDuration(1)
    }
  }

  function slotClass(idx) {
    if (isSlotOcupado(idx)) return 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
    if (idx === selectedSlotIdx) return 'bg-primary-500 text-white border-primary-500 shadow'
    if (slotDuration === 2 && idx === selectedSlotIdx + 1) return 'bg-primary-100 text-primary-700 border-primary-400'
    return 'bg-white text-gray-700 border-gray-200 hover:border-primary-400 hover:bg-primary-50 cursor-pointer'
  }

  // ─── Summary values ─────────────────────────────────────
  function summaryTime() {
    if (selectedSlotIdx === null) return '–'
    const end = slotDuration === 2 ? SLOT_NEXT[selectedSlotIdx + 1] : SLOT_NEXT[selectedSlotIdx]
    return `${SLOT_STARTS[selectedSlotIdx]} – ${end ?? SLOT_NEXT[selectedSlotIdx]}`
  }

  // ─── Validation per step ────────────────────────────────
  function canContinue() {
    if (step === 1) return !!selectedRecurso
    if (step === 2) return !!selectedDate && selectedSlotIdx !== null
    if (step === 3) return quantidade !== '' && Number(quantidade) >= 1
    return false
  }

  // ─── Submit ─────────────────────────────────────────────
  function fmtDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }

  function openModal() {
    if (Number(quantidade) > disponivel) {
      setSubmitError(
        `Apenas ${disponivel} unidade${disponivel !== 1 ? 's' : ''} disponível${disponivel !== 1 ? 'is' : ''} para este horário.`
      )
      return
    }
    setModalNome(profile?.nome ?? '')
    setModalEmail(profile?.email ?? '')
    setSubmitError('')
    setShowModal(true)
  }

  async function handleSubmit() {
    if (!modalNome.trim() || !modalEmail.trim()) return
    if (!isSchoolEmail(modalEmail)) {
      setSubmitError(`Use seu e-mail institucional (${SCHOOL_EMAIL_DOMAIN}) para agendar.`)
      return
    }
    setSubmitting(true)
    setSubmitError('')

    const endIdx = selectedSlotIdx + slotDuration
    const horario_fim = endIdx < SLOT_NEXT.length ? SLOT_NEXT[endIdx - 1] : '17:00'
    const horario_inicio = SLOT_STARTS[selectedSlotIdx]
    const cancel_token = crypto.randomUUID()

    const latestBookings = await fetchOcupados()
    if (overlapsBooking(latestBookings, horario_inicio, horario_fim)) {
      setSubmitError('Este horário acabou de ser reservado. Escolha outro horário.')
      setSubmitting(false)
      return
    }

    const payload = {
      usuario_id: profile?.id,
      recurso_id: selectedRecurso.id,
      data: fmtDate(selectedDate),
      horario_inicio,
      horario_fim,
      quantidade,
      status: 'pendente',
      cancel_token,
      email: modalEmail.trim(),
    }

    if (!isSupabaseConfigured()) {
      await criarAgendamento({
        ...payload,
        finalidade: '',
        recursos: { nome: selectedRecurso.nome, tipo: selectedRecurso.tipo },
      })
    } else {
      const { error } = await supabase.from('agendamentos').insert(payload)
      if (error) {
        setSubmitError(
          isBookingConflictError(error)
            ? 'Este horário acabou de ser reservado. Escolha outro horário.'
            : error.message
        )
        await fetchOcupados()
        setSubmitting(false)
        return
      }

      supabase.functions.invoke('send-booking-email', {
        body: {
          token: cancel_token,
          email: modalEmail.trim(),
          nome: modalNome.trim(),
          recurso: selectedRecurso.nome,
          data: fmtDate(selectedDate),
          horario_inicio,
          horario_fim,
          quantidade,
          cancel_url: `${window.location.origin}/cancelar?token=${cancel_token}`,
        },
      })
    }

    setSubmitting(false)
    setShowModal(false)
    setSuccess(true)
    setTimeout(() => navigate('/meus-agendamentos'), 2200)
  }

  // ─── Success screen ─────────────────────────────────────
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Agendamento enviado!</h2>
        <p className="text-gray-500">Aguarde a confirmação. Redirecionando...</p>
      </div>
    )
  }

  const calDays = buildCalendar()

  return (
    <>
    <div className="flex gap-6 items-start">
      {/* ── Main Wizard ── */}
      <div className="flex-1 min-w-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Agendamento</h1>
        </div>

        <StepIndicator current={step} />

        {/* Card */}
        <div className="card p-6">

          {/* ── STEP 1: Recurso ── */}
          {step === 1 && (
            <div>
              <h2 className="text-base font-semibold text-gray-700 mb-4">Selecione o recurso</h2>

              <div className="grid grid-cols-2 gap-3">
                {recursos.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { setSelectedRecurso(r); setStep(2) }}
                    className={`p-4 rounded-xl border-2 text-left transition-all hover:border-primary-500
                      ${selectedRecurso?.id === r.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${selectedRecurso?.id === r.id ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        <ResourceIcon tipo={r.tipo} size={6} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{r.nome}</p>
                        <p className="text-xs text-gray-500">{r.quantidade_total} unidades</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 line-clamp-2">{r.descricao}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 2: Data e Horário ── */}
          {step === 2 && (
            <div>
              <h2 className="text-base font-semibold text-gray-700 mb-5">Escolha a data e o horário</h2>

              {/* Calendar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                    <ChevronLeft className="w-5 h-5 text-gray-500" />
                  </button>
                  <span className="font-semibold text-gray-700">
                    {MONTHS_PT[calDate.getMonth()]} {calDate.getFullYear()}
                  </span>
                  <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {WEEKDAYS_PT.map(d => (
                    <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
                  ))}
                  {calDays.map((day, i) => (
                    <button
                      key={i}
                      onClick={() => selectDay(day)}
                      disabled={!day.cur || day.past}
                      className={`
                        text-center text-sm py-2 rounded-lg transition-all font-medium
                        ${!day.cur ? 'text-gray-200 cursor-default' : ''}
                        ${day.cur && day.past ? 'text-gray-300 cursor-not-allowed' : ''}
                        ${day.isSel ? 'bg-primary-500 text-white shadow-md scale-105' : ''}
                        ${day.isToday && !day.isSel ? 'ring-2 ring-primary-500 text-primary-600' : ''}
                        ${day.cur && !day.past && !day.isSel ? 'hover:bg-primary-50 text-gray-700' : ''}
                      `}
                    >
                      {day.d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time slots */}
              {selectedDate ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-700 text-sm">
                      Horários disponíveis —{' '}
                      <span className="text-primary-600">
                        {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 mb-3 p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span className="text-xs text-amber-700">
                      Os agendamentos podem ter duração máxima de 2 horas. Clique em dois slots consecutivos para reservar 2h.
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {SLOT_STARTS.map((start, idx) => (
                      <button
                        key={start}
                        onClick={() => handleSlotClick(idx)}
                        disabled={isSlotOcupado(idx)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border-2 transition-all ${slotClass(idx)}`}
                      >
                        {start} – {SLOT_NEXT[idx]}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-primary-500 inline-block" /> Selecionado
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-primary-100 border border-primary-400 inline-block" /> 2ª hora
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-gray-100 inline-block" /> Ocupado
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <Calendar className="w-10 h-10 mb-2 text-gray-300" />
                  <p className="text-sm">Selecione uma data no calendário</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Quantidade ── */}
          {step === 3 && (
            <div>
              <h2 className="text-base font-semibold text-gray-700 mb-6">Quantas unidades você precisa?</h2>
              <div className="flex flex-col items-center gap-6 py-6">
                <div className="flex items-center gap-8">
                  <button
                    onClick={() => setQuantidade(q => Math.max(1, (Number(q) || 1) - 1))}
                    className="w-14 h-14 rounded-2xl border-2 border-primary-500 flex items-center justify-center text-primary-500 text-2xl font-bold hover:bg-primary-50 active:scale-95 transition-all"
                  >
                    −
                  </button>
                  <div className="text-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={quantidade}
                      onChange={e => {
                        const raw = e.target.value.replace(/\D/g, '')
                        if (raw === '') { setQuantidade(''); return }
                        setQuantidade(Math.max(1, Number(raw)))
                      }}
                      className="w-20 text-center text-5xl font-bold text-gray-800 leading-none border-2 border-gray-200 rounded-2xl py-2 focus:outline-none focus:border-primary-400"
                    />
                    <p className="text-sm text-gray-400 mt-1">unidade{Number(quantidade) !== 1 ? 's' : ''}</p>
                  </div>
                  <button
                    onClick={() => setQuantidade(q => (Number(q) || 0) + 1)}
                    className="w-14 h-14 rounded-2xl border-2 border-primary-500 flex items-center justify-center text-primary-500 text-2xl font-bold hover:bg-primary-50 active:scale-95 transition-all"
                  >
                    +
                  </button>
                </div>

                <input
                  type="range"
                  min={1}
                  max={Math.max(1, disponivel)}
                  value={Number(quantidade) || 1}
                  onChange={e => setQuantidade(Number(e.target.value))}
                  className="w-64 accent-primary-500"
                />

                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-5 py-3">
                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-green-700 text-sm font-semibold">
                    {disponivel} unidade{disponivel !== 1 ? 's' : ''} disponível{disponivel !== 1 ? 'is' : ''}
                  </span>
                  <span className="text-gray-400 text-sm">para o horário selecionado</span>
                </div>

              </div>
            </div>
          )}

          {submitError && step >= 2 && (
            <div className="mt-4 flex items-center gap-2 bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm">
              <AlertTriangle className="w-4 h-4" /> {submitError}
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-4">
          {step > 1 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 font-medium text-sm px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
          ) : <div />}
        </div>
      </div>

      {/* ── Summary Panel ── */}
      <div className="w-72 flex-shrink-0">
        <div className="sticky top-6 space-y-4">
          {/* Summary card */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-800 mb-4">Resumo do agendamento</h3>

            {/* Resource header */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
              <div className="bg-primary-500 text-white rounded-xl p-3">
                <ResourceIcon tipo={selectedRecurso?.tipo} size={6} />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-800 truncate">{selectedRecurso?.nome ?? '–'}</p>
                <p className="text-xs text-gray-400 truncate">{selectedRecurso?.descricao ?? ''}</p>
              </div>
            </div>

            {/* Details */}
            <ul className="space-y-3 text-sm mb-5">
              {[
                { icon: Calendar, label: 'Data', value: selectedDate?.toLocaleDateString('pt-BR') ?? '–' },
                { icon: Clock, label: 'Horário', value: summaryTime() },
                { icon: Clock, label: 'Duração', value: slotDuration === 2 ? '2 horas' : selectedSlotIdx !== null ? '1 hora' : '–' },
                { icon: Users, label: 'Quantidade', value: String(quantidade) },
                { icon: null, label: 'Solicitante', value: profile?.nome ?? '–' },
              ].map(({ icon: Icon, label, value }) => (
                <li key={label} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-gray-400 min-w-0">
                    {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
                    <span className="truncate">{label}</span>
                  </div>
                  <span className="font-medium text-gray-700 text-right flex-shrink-0 max-w-[120px] truncate">
                    {value}
                  </span>
                </li>
              ))}
            </ul>

            {step > 1 && <button
              onClick={() => {
                if (!canContinue()) return
                if (step < 3) setStep(s => s + 1)
                else openModal()
              }}
              disabled={!canContinue() || submitting}
              className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enviando...
                </>
              ) : step < 3 ? (
                <>Continuar <ChevronRight className="w-4 h-4" /></>
              ) : (
                'Confirmar Agendamento'
              )}
            </button>}
          </div>

          {/* Info card */}
          <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-semibold text-primary-600">Informações importantes</span>
            </div>
            <ul className="space-y-2">
              {[
                'Duração máxima de 2 horas por agendamento',
                'Cancelamento disponível até 1 hora antes do uso',
                'Cuide dos equipamentos e devolva no prazo combinado',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
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

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Seu nome</label>
                  <input
                    type="text"
                    value={modalNome}
                    onChange={e => setModalNome(e.target.value)}
                    placeholder="Ex: Marcel Dancini"
                    className="input"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Seu e-mail</label>
                  <input
                    type="email"
                    value={modalEmail}
                    onChange={e => setModalEmail(e.target.value)}
                    placeholder="Ex: marcel@escola.pr.gov.br"
                    className="input"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    Use seu e-mail institucional, terminado em {SCHOOL_EMAIL_DOMAIN}
                  </p>
                </div>
              </div>

              {submitError && (
                <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm mt-4">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {submitError}
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
                onClick={handleSubmit}
                disabled={!modalNome.trim() || !modalEmail.trim() || !isSchoolEmail(modalEmail) || submitting}
                className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : 'Enviar confirmação'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
