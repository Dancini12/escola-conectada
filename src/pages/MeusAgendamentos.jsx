import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Clock, Tablet, Laptop, Monitor, Search, PlusCircle, XCircle, AlertCircle } from 'lucide-react'
import { useAgendamentos } from '../hooks/useAgendamentos'

function ResourceIcon({ tipo }) {
  const cls = 'w-4 h-4'
  if (tipo === 'tablet') return <Tablet className={cls} />
  if (tipo === 'sala') return <Monitor className={cls} />
  return <Laptop className={cls} />
}

const STATUS_CONFIG = {
  confirmado: { label: 'Confirmado', cls: 'bg-green-100 text-green-700 border-green-200' },
  pendente:   { label: 'Pendente',   cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  cancelado:  { label: 'Cancelado',  cls: 'bg-red-100 text-red-600 border-red-200' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function canCancel(agendamento) {
  const dateTime = new Date(`${agendamento.data}T${agendamento.horario_inicio}`)
  const cutoff = new Date(dateTime.getTime() - 60 * 60 * 1000) // 1h before
  return new Date() < cutoff && agendamento.status !== 'cancelado'
}

export default function MeusAgendamentos() {
  const { agendamentos, loading, cancelarAgendamento } = useAgendamentos()

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [cancelId, setCancelId] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  const filtered = agendamentos.filter(a => {
    const matchSearch =
      a.recursos?.nome?.toLowerCase().includes(search.toLowerCase()) ||
      a.finalidade?.toLowerCase().includes(search.toLowerCase()) ||
      a.usuarios?.nome?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'todos' || a.status === filterStatus
    return matchSearch && matchStatus
  })

  async function handleCancel() {
    setCancelling(true)
    await cancelarAgendamento(cancelId)
    setCancelling(false)
    setCancelId(null)
  }

  function formatDate(dateStr) {
    const [y, m, d] = dateStr.split('-')
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('pt-BR', {
      weekday: 'short', day: 'numeric', month: 'short',
    })
  }

  function formatTime(timeStr) {
    return timeStr?.slice(0, 5) ?? timeStr
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Meus Agendamentos
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {filtered.length} agendamento{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          to="/agendamentos"
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Novo agendamento
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por recurso, finalidade ou solicitante..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="input w-auto min-w-[160px]"
        >
          <option value="todos">Todos os status</option>
          <option value="confirmado">Confirmados</option>
          <option value="pendente">Pendentes</option>
          <option value="cancelado">Cancelados</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card p-12 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <Calendar className="w-12 h-12 text-gray-300 mb-3" />
          <p className="font-semibold text-gray-600 mb-1">Nenhum agendamento encontrado</p>
          <p className="text-gray-400 text-sm mb-4">Crie seu primeiro agendamento clicando no botão acima.</p>
          <Link to="/agendamentos" className="btn-primary text-sm">
            Fazer agendamento
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Recurso</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Data</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Horário</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Qtd</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Finalidade</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr
                    key={a.id}
                    className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors
                      ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600">
                          <ResourceIcon tipo={a.recursos?.tipo} />
                        </div>
                        <span className="font-medium text-gray-700">{a.recursos?.nome ?? '–'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {a.data ? formatDate(a.data) : '–'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {formatTime(a.horario_inicio)} – {formatTime(a.horario_fim)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.quantidade}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
                        {a.finalidade}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canCancel(a) ? (
                        <button
                          onClick={() => setCancelId(a.id)}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors ml-auto"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancelar
                        </button>
                      ) : (
                        <span className="text-gray-300 text-xs">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cancel confirmation modal */}
      {cancelId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Cancelar agendamento?</h3>
                <p className="text-gray-500 text-sm">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setCancelId(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors text-sm"
              >
                Manter
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors text-sm disabled:opacity-60"
              >
                {cancelling ? 'Cancelando...' : 'Sim, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
