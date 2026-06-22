import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Loader, AlertTriangle } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const DIAS  = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado']
const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

function fmtDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return `${DIAS[dt.getUTCDay()]}, ${d} de ${MESES[m-1]}. de ${y}`
}

export default function Cancelar() {
  const [params] = useSearchParams()
  const token = params.get('token')

  const [status, setStatus] = useState('loading') // loading | confirm | success | already | invalid | error
  const [booking, setBooking] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (!token) { setStatus('invalid'); return }
    if (!isSupabaseConfigured()) {
      // Demo: show a fake booking to preview the UI
      setBooking({
        id: 'demo',
        data: new Date().toISOString().slice(0, 10),
        horario_inicio: '10:00',
        horario_fim: '11:00',
        quantidade: 5,
        status: 'pendente',
        recursos: { nome: 'Tablets' },
      })
      setStatus('confirm')
      return
    }

    supabase
      .from('agendamentos')
      .select('id, data, horario_inicio, horario_fim, quantidade, status, recursos(nome)')
      .eq('cancel_token', token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setStatus('invalid'); return }
        if (data.status === 'cancelado') { setBooking(data); setStatus('already'); return }
        setBooking(data)
        setStatus('confirm')
      })
  }, [token])

  async function handleCancel() {
    setCancelling(true)
    if (!isSupabaseConfigured()) {
      setCancelling(false)
      setStatus('success')
      return
    }
    const { error } = await supabase
      .from('agendamentos')
      .update({ status: 'cancelado' })
      .eq('cancel_token', token)

    setCancelling(false)
    if (error) { setStatus('error'); return }
    setStatus('success')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-primary-500 px-8 py-6">
          <p className="text-primary-100 text-xs font-semibold uppercase tracking-wider mb-1">Escola Conectada</p>
          <h1 className="text-white text-xl font-bold">Cancelamento de Agendamento</h1>
        </div>

        <div className="px-8 py-8">

          {status === 'loading' && (
            <div className="flex flex-col items-center py-8 text-gray-400">
              <Loader className="w-8 h-8 animate-spin mb-3" />
              <p className="text-sm">Verificando agendamento...</p>
            </div>
          )}

          {status === 'confirm' && booking && (
            <>
              <p className="text-gray-600 text-sm mb-6">
                Você está prestes a cancelar o seguinte agendamento:
              </p>

              <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Equipamento</span>
                  <span className="font-semibold text-gray-800">{booking.recursos?.nome ?? '–'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Data</span>
                  <span className="font-semibold text-gray-800">{fmtDate(booking.data)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Horário</span>
                  <span className="font-semibold text-gray-800">{booking.horario_inicio} – {booking.horario_fim}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Quantidade</span>
                  <span className="font-semibold text-gray-800">{booking.quantidade} unidade{booking.quantidade !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <a
                  href="/"
                  className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-medium text-center hover:bg-gray-50 transition-colors"
                >
                  Manter agendamento
                </a>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {cancelling ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Cancelar agendamento'
                  )}
                </button>
              </div>
            </>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center py-6 text-center">
              <CheckCircle className="w-14 h-14 text-green-500 mb-4" />
              <h2 className="text-lg font-bold text-gray-800 mb-1">Agendamento cancelado</h2>
              <p className="text-gray-500 text-sm">O equipamento foi liberado e já está disponível para outros agendamentos.</p>
            </div>
          )}

          {status === 'already' && (
            <div className="flex flex-col items-center py-6 text-center">
              <AlertTriangle className="w-14 h-14 text-amber-400 mb-4" />
              <h2 className="text-lg font-bold text-gray-800 mb-1">Já cancelado</h2>
              <p className="text-gray-500 text-sm">Este agendamento já foi cancelado anteriormente.</p>
            </div>
          )}

          {status === 'invalid' && (
            <div className="flex flex-col items-center py-6 text-center">
              <XCircle className="w-14 h-14 text-red-400 mb-4" />
              <h2 className="text-lg font-bold text-gray-800 mb-1">Link inválido</h2>
              <p className="text-gray-500 text-sm">Este link de cancelamento não é válido ou já expirou.</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center py-6 text-center">
              <XCircle className="w-14 h-14 text-red-400 mb-4" />
              <h2 className="text-lg font-bold text-gray-800 mb-1">Erro ao cancelar</h2>
              <p className="text-gray-500 text-sm">Tente novamente ou entre em contato com a escola.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
