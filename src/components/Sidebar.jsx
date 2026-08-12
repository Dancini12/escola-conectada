import { NavLink } from 'react-router-dom'
import { Calendar, List, PlusSquare } from 'lucide-react'
import logoEscola from '../assets/logo-escola.jpeg'

const NAV_ITEMS = [
  { to: '/reservar',          icon: PlusSquare, label: 'Reservar' },
  { to: '/agendamentos',      icon: Calendar,   label: 'Agendamentos' },
  { to: '/meus-agendamentos', icon: List,        label: 'Meus Agendamentos' },
]

export default function Sidebar() {
  return (
    <aside className="w-[220px] flex-shrink-0 h-screen bg-white border-r border-gray-100 flex flex-col sticky top-0 overflow-y-auto">
      <div className="h-16 flex items-center gap-2.5 px-3 border-b border-gray-100 flex-shrink-0">
        <img
          src={logoEscola}
          alt="Logo da E.E. Padre Manuel da Nóbrega"
          className="w-10 h-10 rounded-xl object-contain flex-shrink-0 opacity-90 shadow-sm ring-1 ring-gray-200/70"
        />
        <div className="min-w-0 leading-none">
          <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-gray-400">
            E.E. Tempo Integral
          </p>
          <p className="mt-1 text-xs font-bold leading-tight text-gray-800">
            Padre Manuel da Nóbrega
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
              ${isActive
                ? 'bg-primary-50 text-primary-600'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-100 px-4 py-3 text-center">
        <p className="text-[10px] uppercase tracking-wide text-gray-400">Proprietário</p>
        <p className="text-xs font-semibold text-gray-600">Lace Computer</p>
        <p className="text-[11px] text-gray-400">Marcel Dancini</p>
      </div>
    </aside>
  )
}
