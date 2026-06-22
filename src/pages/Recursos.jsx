import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Tablet, Laptop, Monitor, PlusCircle, Info } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const DEMO_RECURSOS = [
  {
    id: 1, nome: 'Tablets', tipo: 'tablet', quantidade_total: 30,
    descricao: 'Tablets Samsung Galaxy Tab para uso educacional. Ideais para pesquisa, leitura de materiais e atividades interativas em sala de aula.',
  },
  {
    id: 2, nome: 'Chromebooks', tipo: 'chromebook', quantidade_total: 25,
    descricao: 'Chromebooks leves e rápidos para tarefas escolares, produção de textos, apresentações e acesso à internet com segurança.',
  },
  {
    id: 3, nome: 'Sala de Informática', tipo: 'sala', quantidade_total: 1,
    descricao: 'Sala equipada com 40 computadores desktop de alto desempenho, projetor e quadro interativo para aulas especializadas.',
  },
  {
    id: 4, nome: 'Notebooks', tipo: 'notebook', quantidade_total: 15,
    descricao: 'Notebooks para projetos avançados, programação, edição de mídia e atividades que exigem mais poder de processamento.',
  },
]

const TYPE_CONFIG = {
  tablet:     { icon: Tablet,  color: 'bg-blue-100 text-blue-600',   badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  chromebook: { icon: Laptop,  color: 'bg-purple-100 text-purple-600', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  notebook:   { icon: Laptop,  color: 'bg-indigo-100 text-indigo-600', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  sala:       { icon: Monitor, color: 'bg-emerald-100 text-emerald-600', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

const TYPE_LABELS = {
  tablet: 'Tablet', chromebook: 'Chromebook', notebook: 'Notebook', sala: 'Sala',
}

export default function Recursos() {
  const [recursos, setRecursos] = useState(DEMO_RECURSOS)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const location = useLocation()

  // Read ?tipo= filter from URL
  const tipoFilter = new URLSearchParams(location.search).get('tipo')
  const [activeFilter, setActiveFilter] = useState(tipoFilter || 'todos')

  useEffect(() => {
    if (tipoFilter) setActiveFilter(tipoFilter)
  }, [tipoFilter])

  useEffect(() => {
    if (!isSupabaseConfigured()) { setLoading(false); return }
    supabase.from('recursos').select('*').order('nome').then(({ data }) => {
      if (data?.length) setRecursos(data)
      setLoading(false)
    })
  }, [])

  const filtered = activeFilter === 'todos' ? recursos : recursos.filter(r => r.tipo === activeFilter)

  const FILTERS = [
    { key: 'todos', label: 'Todos' },
    { key: 'tablet', label: 'Tablets' },
    { key: 'chromebook', label: 'Chromebooks' },
    { key: 'notebook', label: 'Notebooks' },
    { key: 'sala', label: 'Sala Informática' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Recursos disponíveis</h1>
        <p className="text-gray-500 text-sm mt-1">
          Conheça todos os equipamentos tecnológicos disponíveis para agendamento
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all border
              ${activeFilter === f.key
                ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="w-14 h-14 bg-gray-200 rounded-2xl mb-4" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-1" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(r => {
            const cfg = TYPE_CONFIG[r.tipo] ?? TYPE_CONFIG.notebook
            const Icon = cfg.icon
            return (
              <div
                key={r.id}
                className="card p-6 hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Icon and badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${cfg.color}`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.badge}`}>
                    {TYPE_LABELS[r.tipo] ?? r.tipo}
                  </span>
                </div>

                {/* Info */}
                <h3 className="font-bold text-gray-800 text-lg mb-1">{r.nome}</h3>
                <p className="text-gray-500 text-sm leading-relaxed flex-1 mb-4">{r.descricao}</p>

                {/* Quantity */}
                <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 rounded-xl border border-green-100">
                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-sm text-green-700 font-semibold">
                    {r.tipo === 'sala' ? `Capacidade: 40 computadores` : `${r.quantidade_total} unidades disponíveis`}
                  </span>
                </div>

                {/* Details toggle */}
                <button
                  onClick={() => setSelected(selected === r.id ? null : r.id)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 mb-3 transition-colors"
                >
                  <Info className="w-3.5 h-3.5" />
                  {selected === r.id ? 'Ocultar detalhes' : 'Ver detalhes'}
                </button>

                {selected === r.id && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-xl text-xs text-gray-600 leading-relaxed border border-gray-100">
                    <p className="font-semibold text-gray-700 mb-1">Sobre este recurso:</p>
                    <p>{r.descricao}</p>
                    {r.tipo !== 'sala' && (
                      <p className="mt-2">
                        Máximo por agendamento: <strong>sem limite específico</strong> (respeitando a disponibilidade).
                      </p>
                    )}
                    <p className="mt-1">Duração máxima: <strong>2 horas</strong> por agendamento.</p>
                  </div>
                )}

                {/* CTA */}
                <Link
                  to={`/agendamentos?recurso=${r.id}`}
                  className="btn-primary w-full text-center text-sm flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  Agendar {r.nome}
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {filtered.length === 0 && !loading && (
        <div className="card p-12 text-center">
          <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum recurso encontrado para este filtro.</p>
        </div>
      )}
    </div>
  )
}
