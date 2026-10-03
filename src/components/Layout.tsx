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
  TrendingUp,
  Timer,
  Clapperboard,
  Map as MapIcon,
  CalendarCheck,
  RefreshCw,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { avisar, backend, refrescar } from '../lib/store'
import { supabase } from '../lib/supabase'
import { cx, Logo, Modal } from './ui'

export const NAV: { grupo: string; items: { a: string; nombre: string; icono: ReactNode }[] }[] = [
  {
    grupo: 'Operar',
    items: [
      { a: '/', nombre: 'Hoy', icono: <LayoutGrid size={17} /> },
      { a: '/foco', nombre: 'Foco', icono: <Timer size={17} /> },
      { a: '/mentalidad', nombre: 'Mentalidad', icono: <Brain size={17} /> },
    ],
  },
  {
    grupo: 'Adquisición',
    items: [
      { a: '/ads', nombre: 'Ads', icono: <Megaphone size={17} /> },
      { a: '/contenido', nombre: 'Contenido', icono: <Clapperboard size={17} /> },
    ],
  },
  {
    grupo: 'Ventas',
    items: [
      { a: '/ventas', nombre: 'Ventas', icono: <Handshake size={17} /> },
      { a: '/clientes', nombre: 'Clientes', icono: <Target size={17} /> },
    ],
  },
  {
    grupo: 'Números',
    items: [
      { a: '/proyeccion', nombre: 'Proyección', icono: <TrendingUp size={17} /> },
      { a: '/semana', nombre: 'Revisión semanal', icono: <CalendarCheck size={17} /> },
      { a: '/warmap', nombre: 'War Map', icono: <MapIcon size={17} /> },
      { a: '/diagnostico', nombre: 'Cuello de botella', icono: <Stethoscope size={17} /> },
      { a: '/finanzas', nombre: 'Finanzas', icono: <Wallet size={17} /> },
      { a: '/calculadoras', nombre: 'Calculadoras', icono: <Calculator size={17} /> },
    ],
  },
  {
    grupo: 'Sistema',
    items: [
      { a: '/boveda', nombre: 'Bóveda', icono: <BookOpen size={17} /> },
      { a: '/equipo', nombre: 'Equipo', icono: <UserPlus size={17} /> },
      { a: '/tiempo', nombre: 'Tiempo', icono: <Clock size={17} /> },
      { a: '/ajustes', nombre: 'Ajustes', icono: <Settings size={17} /> },
    ],
  },
  {
    grupo: 'Archivo · llamadas',
    items: [
      { a: '/llamar', nombre: 'Llamar', icono: <PhoneCall size={17} /> },
      { a: '/prospectos', nombre: 'Prospectos', icono: <Users size={17} /> },
      { a: '/outreach', nombre: 'Outreach', icono: <Phone size={17} /> },
    ],
  },
]

const MOVIL = ['/', '/foco', '/contenido', '/ads']

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

/** La cuenta con la que entraste: si el PC y el celular no coinciden, no van a ver lo mismo. */
function useCuenta() {
  const [correo, setCorreo] = useState<string | null>(null)
  useEffect(() => {
    void supabase?.auth.getUser().then(({ data }) => setCorreo(data.user?.email ?? null))
  }, [])
  return correo
}

function Sincronizar() {
  const [girando, setGirando] = useState(false)
  return (
    <button
      onClick={async () => {
        setGirando(true)
        await refrescar(true)
        setGirando(false)
        avisar('Sincronizado con la nube', 'ok')
      }}
      className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-text"
      aria-label="Sincronizar ahora"
      title="Traer lo último de la nube"
    >
      <RefreshCw size={15} className={cx(girando && 'animate-spin')} />
    </button>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const [tema, setTema] = useTema()
  const correo = useCuenta()
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
          {NAV.map((g) =>
            g.grupo.startsWith('Archivo') ? (
              <details key={g.grupo} className="group/arch" open={g.items.some((i) => loc.pathname === i.a)}>
                <summary className="mb-1.5 flex cursor-pointer list-none items-center gap-1 px-3 text-[10.5px] font-semibold tracking-[0.14em] text-faint uppercase hover:text-muted">
                  <span className="transition group-open/arch:rotate-90">›</span> {g.grupo}
                </summary>
                <div className="space-y-0.5 opacity-80">{g.items.map(link)}</div>
              </details>
            ) : (
              <div key={g.grupo}>
                <div className="mb-1.5 px-3 text-[10.5px] font-semibold tracking-[0.14em] text-faint uppercase">{g.grupo}</div>
                <div className="space-y-0.5">{g.items.map(link)}</div>
              </div>
            ),
          )}
        </nav>
        <div className="mt-4 flex items-center justify-between gap-1 border-t border-line px-2 pt-4">
          <div className="min-w-0 text-[11px] text-faint" title={backend === 'local' ? 'Los datos viven en este navegador' : 'Los datos viven en la nube'}>
            <div className="flex items-center gap-1.5">
              {backend === 'local' ? <HardDrive size={13} /> : <Cloud size={13} className="text-green" />}
              {backend === 'local' ? 'Modo local' : 'En la nube'}
            </div>
            {correo && <div className="mt-0.5 truncate">{correo}</div>}
          </div>
          {backend !== 'local' && <Sincronizar />}
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
                {it.nombre === 'Cuello de botella' ? 'Cuello' : it.nombre === 'Mentalidad' ? 'Mente' : it.nombre}
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
          <div className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-xs text-faint">
            <span className="min-w-0 truncate">
              {backend === 'local' ? 'Modo local: los datos viven en este celular' : `En la nube · ${correo ?? '…'}`}
            </span>
            {backend !== 'local' && <Sincronizar />}
          </div>
          <button onClick={() => setTema(tema === 'dark' ? 'light' : 'dark')} className="flex items-center gap-2 px-3 text-sm text-muted">
            {tema === 'dark' ? <Sun size={16} /> : <Moon size={16} />} Cambiar a modo {tema === 'dark' ? 'claro' : 'oscuro'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
