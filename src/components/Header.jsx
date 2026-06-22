export default function Header() {
  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 sticky top-0 z-20">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
          EC
        </div>
        <div className="leading-tight">
          <span className="block font-bold text-gray-800 text-lg">Escola Conectada</span>
          <span className="block text-xs font-medium text-gray-500">
            Colégio Estadual Vandyr de Almeida
          </span>
        </div>
      </div>
    </header>
  )
}
