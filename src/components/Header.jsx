import logoEscola from '../assets/logo-escola.jpeg'

export default function Header() {
  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-center px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <img
          src={logoEscola}
          alt="Logo da E.E. Padre Manuel da Nóbrega"
          className="w-12 h-12 rounded-xl object-contain flex-shrink-0 opacity-90 shadow-sm ring-1 ring-gray-200/70"
        />
        <div className="min-w-0 leading-none">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
            E.E. Tempo Integral
          </p>
          <p className="mt-1.5 text-base font-bold text-gray-800 truncate">
            Padre Manuel da Nóbrega
          </p>
        </div>
      </div>
    </header>
  )
}
