import {
  BookOpen,
  Calculator,
  Clock,
  Cloud,
  HardDrive,
  LayoutGrid,
  Megaphone,
  Brain,
  Moon,
  Phone,
  PhoneCall,
  Settings,
  Stethoscope,
  Sun,
  Target,
  Users,
  UserPlus,
  Wallet,
  Handshake,
  MoreHorizontal,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { backend } from '../lib/store'
import { cx, Logo, Modal } from './ui'

export const NAV: { grupo: string; items: { a: string; nombre: string; icono: ReactNode }[] }[] = [
  {
    grupo: 'Operar',
    items: [
      { a: '/', nombre: 'Hoy', icono: <LayoutGrid size={17} /> },
      { a: '/mentalidad', nombre: 'Mentalidad', icono: <Brain size={17} /> },
      { a: '/llamar', nombre: 'Llamar', icono: <PhoneCall size={17} /> },
      { a: '/prospectos', nombre: 'Prospectos', icono: <Users size={17} /> },
      { a: '/ventas', nombre: 'Ventas', icono: <Handshake size={17} /> },
      { a: '/clientes', nombre: 'Clientes', icono: <Target size={17} /> },
    ],
  },
  {
    grupo: 'Medir',
    items: [
      { a: '/outreach', nombre: 'Outreach', icono: <Phone size={17} /> },
      { a: '/pauta', nombre: 'Pauta', icono: <Megaphone size={17} /> },
      { a: '/finanzas', nombre: 'Finanzas', icono: <Wallet size={17} /> },
      { a: '/tiempo', nombre: 'Tiempo', icono: <Clock size={17} /> },
    ],
  },
  {
    grupo: 'Analizar',
    items: [
      { a: '/diagnostico', nombre: 'Cuello de botella', icono: <Stethoscope size={17} /> },
      { a: '/calculadoras', nombre: 'Calculadoras', icono: <Calculator size={17} /> },
    ],
  },
  {
    grupo: 'Sistema',
    items: [
      { a: '/boveda', nombre: 'Bóveda', icono: <BookOpen size={17} /> },
      { a: '/equipo', nombre: 'Equipo', icono: <UserPlus size={17} /> },
      { a: '/ajustes', nombre: 'Ajustes', icono: <Settings size={17} /> },
    ],
  },
]

const MOVIL = ['/', '/llamar', '/prospectos', '/diagnostico']

function useTema() {
  const [tema, setTema] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem('imperium-os:tema') as 'dark' | 'light') || 'dark'
    } catch {
      return 'dark'
    }
  })
  useEffect(() => {
    document.documentElement.dataset.theme = tema
    try {
      localStorage.setItem('imperium-os:tema', tema)
    } catch {
      /* sin almacenamiento */
    }
  }, [tema])
  return [tema, setTema] as const
}

export function Layout({ children }: { children: ReactNode }) {
  const [tema, setTema] = useTema()
  const [mas, setMas] = useState(false)
  const loc = useLocation()
  useEffect(() => setMas(false), [loc.pathname])

  const link = (it: { a: string; nombre: string; icono: ReactNode }) => (
    <NavLink
      key={it.a}
      to={it.a}
      end={it.a === '/'}
      className={({ isActive }) =>
        cx(
          'group flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition',
          isActive ? 'bg-blue-soft text-text ring-1 ring-line-2' : 'text-muted hover:bg-surface-2 hover:text-text',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className={cx(isActive ? 'text-blue-2' : 'text-faint group-hover:text-muted')}>{it.icono}</span>
          {it.nombre}
        </>
      )}
    </NavLink>
  )

  return (
    <div className="flex min-h-screen">
      {/* Barra lateral */}
      <aside className="sticky top-0 hidden h-screen w-[244px] shrink-0 flex-col border-r border-line bg-bg/60 px-3 py-5 backdrop-blur md:flex">
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <Logo className="h-9" />
          <div className="leading-tight">
            <div className="font-serif text-2xl tracking-tight">Olimpo</div>
            <div className="text-[10px] font-semibold tracking-[0.22em] text-faint uppercase">Acquisition</div>
          </div>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto">
          {NAV.map((g) => (
            <div key={g.grupo}>
              <div className="mb-1.5 px-3 text-[10.5px] font-semibold tracking-[0.14em] text-faint uppercase">{g.grupo}</div>
              <div className="space-y-0.5">{g.items.map(link)}</div>
            </div>
          ))}
        </nav>
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-line px-2 pt-4">
          <div className="flex items-center gap-1.5 text-[11px] text-faint" title={backend === 'local' ? 'Los datos viven en este navegador' : 'Los datos viven en la nube'}>
            {backend === 'local' ? <HardDrive size={13} /> : <Cloud size={13} className="text-green" />}
            {backend === 'local' ? 'Modo local' : 'En la nube'}
          </div>
          <button onClick={() => setTema(tema === 'dark' ? 'light' : 'dark')} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-text" aria-label="Cambiar tema">
            {tema === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>

      {/* Navegación móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 px-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5">
          {NAV.flatMap((g) => g.items)
            .filter((i) => MOVIL.includes(i.a))
            .map((it) => (
              <NavLink
                key={it.a}
                to={it.a}
                end={it.a === '/'}
                className={({ isActive }) => cx('flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10.5px] font-medium', isActive ? 'text-blue-2' : 'text-faint')}
              >
                {it.icono}
                {it.nombre === 'Cuello de botella' ? 'Cuello' : it.nombre}
              </NavLink>
            ))}
          <button onClick={() => setMas(true)} className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10.5px] font-medium text-faint">
            <MoreHorizontal size={17} />
            Más
          </button>
        </div>
      </nav>

      <Modal abierto={mas} onCerrar={() => setMas(false)} titulo="Olimpo">
        <div className="space-y-5 pb-2">
          {NAV.map((g) => (
            <div key={g.grupo}>
              <div className="mb-1.5 px-1 text-[10.5px] font-semibold tracking-[0.14em] text-faint uppercase">{g.grupo}</div>
              <div className="grid grid-cols-2 gap-1">{g.items.map(link)}</div>
            </div>
          ))}
          <button onClick={() => setTema(tema === 'dark' ? 'light' : 'dark')} className="flex items-center gap-2 px-3 text-sm text-muted">
            {tema === 'dark' ? <Sun size={16} /> : <Moon size={16} />} Cambiar a modo {tema === 'dark' ? 'claro' : 'oscuro'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
