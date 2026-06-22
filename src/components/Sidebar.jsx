import { NavLink } from 'react-router-dom'
import { Calendar, List, PlusSquare } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/reservar',          icon: PlusSquare, label: 'Reservar' },
  { to: '/agendamentos',      icon: Calendar,   label: 'Agendamentos' },
  { to: '/meus-agendamentos', icon: List,        label: 'Meus Agendamentos' },
]

export default function Sidebar() {
  return (
    <aside className="w-[220px] flex-shrink-0 h-screen bg-white border-r border-gray-100 flex flex-col sticky top-0 overflow-y-auto">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            EC
          </div>
          <span className="font-bold text-gray-800 text-base leading-tight">
            Escola<br />
            <span className="text-primary-500">Conectada</span>
          </span>
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
    </aside>
  )
}
