import { useState } from 'react'
import { Calendar, Users, CheckCircle, Clock, Filter, Search, Check, X, Tablet, Laptop, Monitor } from 'lucide-react'
import { useAgendamentos } from '../hooks/useAgendamentos'
import { useAuth } from '../hooks/useAuth'

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

function ResourceIcon({ tipo }) {
  if (tipo === 'tablet') return <Tablet className="w-4 h-4" />
  if (tipo === 'sala') return <Monitor className="w-4 h-4" />
  return <Laptop className="w-4 h-4" />
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

export default function Admin() {
  const { agendamentos, loading, aprovarAgendamento, cancelarAgendamento } = useAgendamentos()
  const { profile } = useAuth()

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterRecurso, setFilterRecurso] = useState('todos')

  const today = new Date().toISOString().split('T')[0]

  // Stats
  const todayBookings = agendamentos.filter(a => a.data === today)
  const pending = agendamentos.filter(a => a.status === 'pendente')
  const confirmed = agendamentos.filter(a => a.status === 'confirmado')

  // Resource usage count
  const usageMap = {}
  agendamentos.filter(a => a.status !== 'cancelado').forEach(a => {
    const nome = a.recursos?.nome ?? 'Desconhecido'
    usageMap[nome] = (usageMap[nome] ?? 0) + 1
  })
  const usageEntries = Object.entries(usageMap).sort((a, b) => b[1] - a[1])
  const maxUsage = usageEntries[0]?.[1] ?? 1

  // Unique recursos for filter
  const uniqueRecursos = [...new Set(agendamentos.map(a => a.recursos?.nome).filter(Boolean))]

  // Filtered table
  const filtered = agendamentos.filter(a => {
    const s = search.toLowerCase()
    const matchSearch =
      a.recursos?.nome?.toLowerCase().includes(s) ||
      a.usuarios?.nome?.toLowerCase().includes(s) ||
      a.finalidade?.toLowerCase().includes(s) ||
      a.data?.includes(s)
    const matchStatus = filterStatus === 'todos' || a.status === filterStatus
    const matchRecurso = filterRecurso === 'todos' || a.recursos?.nome === filterRecurso
    return matchSearch && matchStatus && matchRecurso
  })

  function formatDate(dateStr) {
    if (!dateStr) return '–'
    const [y, m, d] = dateStr.split('-')
    return new Date(Number(y), Number(m)-1, Number(d)).toLocaleDateString('pt-BR', {
      day: 'numeric', month: 'short',
    })
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Painel Administrativo</h1>
        <p className="text-gray-500 text-sm mt-1">
          Bem-vindo(a), {profile?.nome}. Gerencie os agendamentos da escola.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Calendar} label="Agendamentos hoje" value={todayBookings.length} color="bg-blue-100 text-primary-600" />
        <StatCard icon={Clock}    label="Pendentes" value={pending.length} sub="Aguardando aprovação" color="bg-yellow-100 text-yellow-600" />
        <StatCard icon={CheckCircle} label="Confirmados" value={confirmed.length} color="bg-green-100 text-green-600" />
        <StatCard icon={Users} label="Total geral" value={agendamentos.length} color="bg-purple-100 text-purple-600" />
      </div>

      {/* Usage chart */}
      {usageEntries.length > 0 && (
        <div className="card p-5 mb-6">
          <h2 className="font-bold text-gray-800 mb-4">Recursos mais utilizados</h2>
          <div className="space-y-3">
            {usageEntries.map(([nome, count]) => (
              <div key={nome} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-40 flex-shrink-0 truncate">{nome}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all"
                    style={{ width: `${Math.max(4, (count / maxUsage) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-700 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending approvals */}
      {pending.length > 0 && (
        <div className="card p-5 mb-6 border-yellow-200 bg-yellow-50/30">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-yellow-500" />
            <h2 className="font-bold text-gray-800">Aprovações pendentes ({pending.length})</h2>
          </div>
          <div className="space-y-3">
            {pending.map(a => (
              <div key={a.id} className="flex items-center justify-between bg-white rounded-xl border border-yellow-100 p-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600 flex-shrink-0">
                    <ResourceIcon tipo={a.recursos?.tipo} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-700 text-sm truncate">
                      {a.recursos?.nome} · {a.usuarios?.nome}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(a.data)} · {a.horario_inicio}–{a.horario_fim} · {a.quantidade} un. · {a.finalidade}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => cancelarAgendamento(a.id)}
                    className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    title="Rejeitar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => aprovarAgendamento(a.id)}
                    className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                    title="Aprovar"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterRecurso}
              onChange={e => setFilterRecurso(e.target.value)}
              className="input w-auto text-sm"
            >
              <option value="todos">Todos os recursos</option>
              {uniqueRecursos.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="input w-auto text-sm"
            >
              <option value="todos">Todos os status</option>
              <option value="confirmado">Confirmados</option>
              <option value="pendente">Pendentes</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Recurso', 'Solicitante', 'Data', 'Horário', 'Qtd', 'Finalidade', 'Status', 'Ações'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">
                      Nenhum agendamento encontrado.
                    </td>
                  </tr>
                ) : filtered.map(a => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary-100 rounded-md flex items-center justify-center text-primary-600">
                          <ResourceIcon tipo={a.recursos?.tipo} />
                        </div>
                        <span className="font-medium text-gray-700 whitespace-nowrap">{a.recursos?.nome ?? '–'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{a.usuarios?.nome ?? '–'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(a.data)}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {a.horario_inicio} – {a.horario_fim}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.quantidade}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs">{a.finalidade}</span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-3">
                      {a.status === 'pendente' ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => cancelarAgendamento(a.id)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                            title="Rejeitar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => aprovarAgendamento(a.id)}
                            className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                            title="Aprovar"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
