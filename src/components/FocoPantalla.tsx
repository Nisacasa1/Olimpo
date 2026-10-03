import { Maximize2, Minimize2, Minus, Pause, Play, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { mmss, reloj, trabajadoMs, useReloj } from '../lib/foco'
import { Distraccion } from './foco/Distraccion'
import { cx } from './ui'

/**
 * El reloj a pantalla completa. Un cuarto oscuro con un solo número: el halo y el anillo
 * respiran mientras trabajas, se quedan quietos en pausa y se tiñen de rojo si te distrajiste.
 * Los controles se esconden a los 3 segundos sin mover el mouse.
 */
export function FocoPantalla({ onTerminar, onMinimizar, bloqueado }: { onTerminar: () => void; onMinimizar: () => void; bloqueado: boolean }) {
  const r = useReloj()
  const corriendo = !!r.tramo
  const ms = trabajadoMs(r)
  const objetivo = r.objetivoMin * 60_000
  const temporizador = r.modo === 'temporizador'
  const pasado = temporizador && ms >= objetivo
  const tiempo = temporizador ? (pasado ? `+${mmss(ms - objetivo)}` : mmss(objetivo - ms)) : mmss(ms)
  const [motivos, setMotivos] = useState(false)
  const [quieto, setQuieto] = useState(false)
  const [completa, setCompleta] = useState(() => !!document.fullscreenElement)
  const timer = useRef<number | undefined>(undefined)

  // Controles que se apagan solos
  useEffect(() => {
    const despertar = () => {
      setQuieto(false)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setQuieto(true), 3000)
    }
    despertar()
    window.addEventListener('mousemove', despertar)
    window.addEventListener('touchstart', despertar)
    window.addEventListener('keydown', despertar)
    return () => {
      window.clearTimeout(timer.current)
      window.removeEventListener('mousemove', despertar)
      window.removeEventListener('touchstart', despertar)
      window.removeEventListener('keydown', despertar)
    }
  }, [])

  // El tiempo en la pestaña, y la pantalla del celular encendida mientras dura
  useEffect(() => {
    const antes = document.title
    const scroll = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.title = antes
      document.body.style.overflow = scroll
    }
  }, [])
  useEffect(() => {
    document.title = `${tiempo} · ${r.distraido ? 'distraído' : corriendo ? r.tarea || 'Foco' : 'en pausa'}`
  })
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock
      ?.request('screen')
      .then((l) => (lock = l))
      .catch(() => {})
    return () => void lock?.release().catch(() => {})
  }, [])

  useEffect(() => {
    const f = () => setCompleta(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', f)
    return () => document.removeEventListener('fullscreenchange', f)
  }, [])
  const alternarCompleta = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.().catch(() => {})
  }
  const salir = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    onMinimizar()
  }

  // Teclado: espacio pausa, D distracción, F pantalla completa, Esc sale de la vista
  useEffect(() => {
    if (bloqueado) return
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable) return
      const k = e.key.toLowerCase()
      if (k === ' ') {
        e.preventDefault()
        if (r.distraido) reloj.volvi()
        else if (corriendo) reloj.pausar()
        else reloj.seguir()
      } else if (k === 'd' && corriendo) setMotivos((m) => !m)
      else if (k === 'f') alternarCompleta()
      else if (k === 'escape' && !document.fullscreenElement) {
        if (motivos) setMotivos(false)
        else onMinimizar()
      }
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  })

  // El anillo cede espacio cuando abajo se abre el panel de distracción, que es más alto
  const anillo = `min(78vmin, 540px, calc(100dvh - ${motivos ? 400 : 230}px))`
  const pct = temporizador ? Math.min(1, ms / objetivo) : (ms % 60_000) / 60_000
  const R = 47
  const C = 2 * Math.PI * R
  const vivo = corriendo && !r.distraido
  const ocultar = quieto && vivo && !motivos
  const color = r.distraido ? 'var(--red)' : pasado ? 'var(--violet)' : '#e4e4e4'
  const estado = r.distraido ? 'distraído · el reloj está parado' : !corriendo ? 'en pausa' : pasado ? 'pasaste el objetivo · sigue o termina' : temporizador ? `de ${r.objetivoMin} min` : 'trabajo real'

  return createPortal(
    <div
      className={cx('foco-entra fixed inset-0 z-[45] flex flex-col overflow-hidden bg-[#050505] text-white select-none', vivo && 'foco-vivo', pasado && 'foco-pasado', r.distraido && 'foco-distraido', ocultar && 'cursor-none')}
      role="dialog"
      aria-label="Foco"
    >
      <div className="foco-halo" />

      {/* Arriba */}
      <div className={cx('relative z-10 flex items-center justify-between px-5 pt-[max(20px,env(safe-area-inset-top))] transition-opacity duration-700 md:px-8', ocultar ? 'opacity-0' : 'opacity-100')}>
        <div className="text-[10.5px] font-medium tracking-[0.32em] text-white/35 uppercase">Olimpo · Foco</div>
        <div className="flex items-center gap-1">
          <button onClick={alternarCompleta} className="rounded-full p-2.5 text-white/40 transition hover:bg-white/5 hover:text-white/80" title="Pantalla completa (F)">
            {completa ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button onClick={salir} className="rounded-full p-2.5 text-white/40 transition hover:bg-white/5 hover:text-white/80" title="Salir de la vista (Esc). El reloj sigue corriendo">
            <Minus size={18} />
          </button>
        </div>
      </div>

      {/* El reloj */}
      <div className="foco-crece relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        <div className="mb-[4vmin] max-w-[80vw] truncate text-center text-[12px] font-medium tracking-[0.28em] text-white/45 uppercase md:text-[13px]">{r.tarea}</div>
        <div className="foco-anillo relative grid place-items-center transition-[width,height] duration-500" style={{ width: anillo, height: anillo }}>
          <svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90">
            <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.6" />
            <circle className="foco-arco" cx="50" cy="50" r={R} fill="none" stroke={color} strokeWidth="0.75" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} opacity={r.distraido ? 0.6 : 1} />
          </svg>
          <div className="text-center">
            <div className={cx('num leading-none font-extralight tracking-[-0.04em] transition-colors duration-700', r.distraido ? 'text-white/35' : pasado ? 'text-violet' : !corriendo ? 'text-white/55' : 'text-white/95')} style={{ fontSize: `clamp(40px, calc(${anillo} * 0.3), 168px)` }}>
              {tiempo}
            </div>
            <div className="mt-[2.4vmin] flex items-center justify-center gap-2 text-[11.5px] tracking-[0.14em] text-white/40 uppercase">
              <span className={cx('size-1.5 rounded-full', vivo && 'foco-latido', r.distraido ? 'bg-red' : pasado ? 'bg-violet' : corriendo ? 'bg-white' : 'bg-white/30')} />
              {estado}
            </div>
          </div>
        </div>
        {r.interrupciones.length > 0 && !r.distraido && <div className="mt-[3vmin] text-[11px] tracking-[0.12em] text-white/25 uppercase">{r.interrupciones.length} {r.interrupciones.length === 1 ? 'interrupción' : 'interrupciones'}</div>}
      </div>

      {/* Abajo */}
      <div className={cx('relative z-10 flex flex-col items-center gap-4 px-5 pb-[max(28px,env(safe-area-inset-bottom))] transition-opacity duration-700', ocultar ? 'pointer-events-none opacity-0' : 'opacity-100')}>
        {r.distraido ? (
          <div className="flex flex-col items-center gap-3">
            <div className="text-sm text-white/55">
              Te sacó: <span className="text-white/90">{r.interrupciones.at(-1)?.motivo}</span>
            </div>
            <button onClick={() => reloj.volvi()} className="rounded-full bg-white px-10 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90">
              Volví
            </button>
          </div>
        ) : motivos ? (
          <Distraccion oscuro onListo={() => setMotivos(false)} />
        ) : (
          <div className="flex items-center gap-3">
            {corriendo && (
              <button onClick={() => setMotivos(true)} className="rounded-full border border-white/10 px-5 py-3 text-sm text-white/55 transition hover:border-white/25 hover:text-white">
                Me distraje
              </button>
            )}
            <button onClick={() => (corriendo ? reloj.pausar() : reloj.seguir())} className="grid size-16 place-items-center rounded-full bg-white text-black transition hover:scale-[1.04] hover:bg-white/90" title={corriendo ? 'Pausa (espacio)' : 'Seguir (espacio)'}>
              {corriendo ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="translate-x-px" />}
            </button>
            <button onClick={onTerminar} className="flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm text-white/55 transition hover:border-white/25 hover:text-white">
              <Square size={13} /> Terminar
            </button>
          </div>
        )}
        <div className="hidden text-[10.5px] tracking-[0.12em] text-white/20 uppercase md:block">espacio pausa · D distracción · F pantalla completa · Esc salir</div>
      </div>
    </div>,
    document.body,
  )
}
