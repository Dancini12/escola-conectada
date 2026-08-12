import Sidebar from './Sidebar'
import { Wifi } from 'lucide-react'

export default function Layout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="relative flex-1 overflow-y-auto p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none fixed left-[220px] right-0 top-0 bottom-0 z-0 flex items-center justify-start overflow-hidden pl-2"
          >
            <div className="translate-y-24 -rotate-6 flex items-center gap-5 select-none whitespace-nowrap text-primary-500 opacity-[0.075]">
              <div className="w-20 h-20 rounded-3xl border-[6px] border-current flex items-center justify-center">
                <Wifi className="w-10 h-10" strokeWidth={2.5} />
              </div>
              <div className="leading-none">
                <span className="block text-3xl font-semibold uppercase tracking-[0.28em]">Escola</span>
                <span className="block mt-2 text-6xl lg:text-7xl font-black uppercase tracking-wide">Conectada</span>
              </div>
            </div>
          </div>
          <div className="relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
