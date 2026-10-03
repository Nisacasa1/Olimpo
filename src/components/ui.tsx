import clsx from 'clsx'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, useState, type ComponentProps, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import type { Tono } from '../lib/metricas'
import { useAvisos } from '../lib/store'

export const cx = clsx

// ── Contenedores ──────────────────────────────────────────────────────

export function Card({ className, children, ...p }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('min-w-0 rounded-2xl border border-line bg-surface/80 backdrop-blur-sm', className)} {...p}>
      {children}
    </div>
  )
}

export function CardHead({ titulo, sub, accion, icono }: { titulo: ReactNode; sub?: ReactNode; accion?: ReactNode; icono?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[13px] font-semibold tracking-wide text-text">
          {icono && <span className="text-muted">{icono}</span>}
          {titulo}
        </div>
        {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
      </div>
      {accion}
    </div>
  )
}

export function Pagina({ titulo, sub, acciones, children }: { titulo: string; sub?: ReactNode; acciones?: ReactNode; children: ReactNode }) {
  return (
    <div className="rise mx-auto w-full max-w-[1280px] px-4 pt-6 pb-28 md:px-8 md:pt-8 md:pb-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[34px] leading-none tracking-tight text-text md:text-[42px]">{titulo}</h1>
          {sub && <p className="mt-2 hidden max-w-2xl text-sm text-muted md:block">{sub}</p>}
        </div>
        {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
      </div>
      {children}
    </div>
  )
}

// ── Tonos ─────────────────────────────────────────────────────────────

export const tonoClase: Record<Tono, { text: string; bg: string; dot: string; label: string }> = {
  ok: { text: 'text-green', bg: 'bg-green-soft', dot: 'bg-green', label: 'En KPI' },
  alerta: { text: 'text-amber', bg: 'bg-amber-soft', dot: 'bg-amber', label: 'Bajo la meta' },
  critico: { text: 'text-red', bg: 'bg-red-soft', dot: 'bg-red', label: 'Fuera de KPI' },
  muestra: { text: 'text-blue-2', bg: 'bg-blue-soft', dot: 'bg-blue', label: 'Falta muestra' },
  nada: { text: 'text-muted', bg: 'bg-surface-2', dot: 'bg-faint', label: 'Sin umbral' },
}

export function Pill({ tono, children, className }: { tono: Tono; children?: ReactNode; className?: string }) {
  const t = tonoClase[tono]
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold', t.bg, t.text, className)}>
      <span className={cx('size-1.5 rounded-full', t.dot)} />
      {children ?? t.label}
    </span>
  )
}

export function Badge({ children, className, color }: { children: ReactNode; className?: string; color?: string }) {
  return (
    <span
      className={cx('inline-flex items-center rounded-md border border-line px-1.5 py-0.5 text-[11px] font-medium text-muted', className)}
      style={color ? { color, borderColor: color + '55', background: color + '18' } : undefined}
    >
      {children}
    </span>
  )
}

// ── KPI ───────────────────────────────────────────────────────────────

export function Kpi({
  etiqueta,
  valor,
  sub,
  tono = 'nada',
  muestra,
  icono,
  grande,
  onClick,
}: {
  etiqueta: ReactNode
  valor: ReactNode
  sub?: ReactNode
  tono?: Tono
  muestra?: { n: number; requerida: number }
  icono?: ReactNode
  grande?: boolean
  onClick?: () => void
}) {
  const t = tonoClase[tono]
  const avance = muestra ? Math.min(1, muestra.n / muestra.requerida) : null
  return (
    <Card
      onClick={onClick}
      className={cx('relative overflow-hidden p-4', onClick && 'cursor-pointer transition hover:border-line-2')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
          {icono}
          {etiqueta}
        </div>
        {tono !== 'nada' && <span className={cx('size-2 rounded-full', t.dot)} title={t.label} />}
      </div>
      <div className={cx('num mt-2 font-semibold tracking-tight', grande ? 'text-4xl' : 'text-[26px]', tono === 'nada' ? 'text-text' : t.text)}>
        {valor}
      </div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
      {avance != null && avance < 1 && (
        <div className="mt-3">
          <div className="h-1 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-blue" style={{ width: `${avance * 100}%` }} />
          </div>
          <div className="mt-1 text-[10.5px] text-faint">
            muestra {muestra!.n}/{muestra!.requerida} para juzgar
          </div>
        </div>
      )}
    </Card>
  )
}

// ── Botones y campos ──────────────────────────────────────────────────

type BtnVar = 'primario' | 'secundario' | 'fantasma' | 'peligro'
export function Btn({ variante = 'secundario', className, children, chico, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: BtnVar; chico?: boolean }) {
  return (
    <button
      className={cx(
        'pop inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-40',
        chico ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm',
        variante === 'primario' && 'bg-blue text-on-accent shadow-[0_12px_30px_-16px_rgba(0,0,0,0.9)] hover:bg-blue-2',
        variante === 'secundario' && 'border border-line-2 bg-surface-2 text-text hover:border-faint',
        variante === 'fantasma' && 'text-muted hover:bg-surface-2 hover:text-text',
        variante === 'peligro' && 'border border-red/30 bg-red-soft text-red hover:bg-red/20',
        className,
      )}
      {...p}
    >
      {children}
    </button>
  )
}

const campo = 'w-full rounded-xl border border-line-2 bg-bg-2 px-3 text-[16px] text-text md:text-sm outline-none transition placeholder:text-faint focus:border-blue focus:ring-2 focus:ring-blue/25'

export function Input({ className, ...p }: ComponentProps<'input'>) {
  return <input className={cx(campo, 'h-10', className)} {...p} />
}

export function Num({ value, onChange, className, ...p }: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & { value: number | null | undefined; onChange: (n: number | null) => void }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      className={cx(campo, 'num h-10', className)}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      {...p}
    />
  )
}

export function Select({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(campo, 'h-10 appearance-none bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-8', className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238b91a5' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...p}>
      {children}
    </select>
  )
}

export function Area({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(campo, 'min-h-20 py-2', className)} {...p} />
}

export function Campo({ etiqueta, children, ayuda, className }: { etiqueta: ReactNode; children: ReactNode; ayuda?: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 block text-xs font-medium text-muted">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-[11px] text-faint">{ayuda}</span>}
    </label>
  )
}

export function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cx('pop inline-flex items-center gap-2 text-sm', checked ? 'text-text' : 'text-muted')}
    >
      <span className={cx('grid size-5 place-items-center rounded-md border transition', checked ? 'border-blue bg-blue text-on-accent' : 'border-line-2 bg-bg-2')}>
        {checked && (
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3.5">
            <path d="m5 12 5 5L20 7" />
          </svg>
        )}
      </span>
      {children}
    </button>
  )
}

// ── Segmentado ────────────────────────────────────────────────────────

export function Segmento<T extends string | number>({ opciones, valor, onChange, className }: { opciones: { valor: T; etiqueta: ReactNode }[]; valor: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cx('inline-flex rounded-xl border border-line bg-bg-2 p-1', className)}>
      {opciones.map((o) => (
        <button
          key={String(o.valor)}
          onClick={() => onChange(o.valor)}
          className={cx(
            'rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition',
            o.valor === valor ? 'bg-surface-2 text-text shadow-sm ring-1 ring-line-2' : 'text-muted hover:text-text',
          )}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────

/**
 * La parte de la pantalla que de verdad se ve. En el iPhone el teclado tapa la mitad de
 * abajo sin achicar la ventana: si el modal se centra en la ventana, queda debajo del teclado.
 */
function useAreaVisible(activo: boolean) {
  const [area, setArea] = useState<{ top: number; height: number } | null>(null)
  useEffect(() => {
    const vv = window.visualViewport
    if (!activo || !vv) return
    const f = () => setArea({ top: vv.offsetTop, height: vv.height })
    f()
    vv.addEventListener('resize', f)
    vv.addEventListener('scroll', f)
    return () => {
      vv.removeEventListener('resize', f)
      vv.removeEventListener('scroll', f)
    }
  }, [activo])
  return area
}

export function Modal({ abierto, onCerrar, titulo, children, ancho = 'max-w-lg', pie }: { abierto: boolean; onCerrar: () => void; titulo: ReactNode; children: ReactNode; ancho?: string; pie?: ReactNode }) {
  useEffect(() => {
    if (!abierto) return
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', f)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', f)
      document.body.style.overflow = ''
    }
  }, [abierto, onCerrar])
  const area = useAreaVisible(abierto)
  if (!abierto) return null
  // Portal al body: la animación de entrada de la página crea un contenedor que
  // atraparía al elemento fijo y lo desplazaría con el scroll.
  return createPortal(
    <div
      className="fixed inset-x-0 top-0 z-50 flex h-dvh items-center justify-center bg-black/60 p-3 backdrop-blur-sm md:p-6"
      style={area ? { top: area.top, height: area.height } : undefined}
      onMouseDown={onCerrar}
    >
      <div
        className={cx('rise flex max-h-full w-full flex-col rounded-3xl border border-line-2 bg-surface shadow-2xl', ancho)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="text-base font-semibold">{titulo}</div>
          <button onClick={onCerrar} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-text">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {pie && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{pie}</div>}
      </div>
    </div>,
    document.body,
  )
}

// ── Vacío ─────────────────────────────────────────────────────────────

export function Vacio({ icono, titulo, texto, accion }: { icono?: ReactNode; titulo: string; texto?: ReactNode; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icono && <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted">{icono}</div>}
      <div className="text-sm font-semibold">{titulo}</div>
      {texto && <div className="mt-1 max-w-sm text-xs text-muted">{texto}</div>}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  )
}

// ── Tabla ─────────────────────────────────────────────────────────────

export function Tabla({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  )
}
export const th = 'sticky top-0 bg-surface px-3 py-2.5 text-left text-[11px] font-semibold tracking-wide text-faint uppercase whitespace-nowrap border-b border-line'
export const td = 'px-3 py-2.5 border-b border-line whitespace-nowrap'

// ── Avisos ────────────────────────────────────────────────────────────

export function Avisos() {
  const avisos = useAvisos()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
      {avisos.map((a) => (
        <div
          key={a.id}
          className={cx(
            'rise pointer-events-auto max-w-md rounded-xl border px-4 py-2.5 text-sm shadow-xl backdrop-blur',
            a.tono === 'ok' ? 'border-green/30 bg-surface text-text' : 'border-red/30 bg-surface text-red',
          )}
        >
          {a.texto}
        </div>
      ))}
    </div>
  )
}

/** Barra de progreso horizontal simple. */
export function Barra({ valor, max, color = 'var(--blue)', className }: { valor: number; max: number; color?: string; className?: string }) {
  const p = max > 0 ? Math.min(1, valor / max) : 0
  return (
    <div className={cx('h-2 overflow-hidden rounded-full bg-surface-2', className)}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p * 100}%`, background: color }} />
    </div>
  )
}

/** El logo de Olimpo: blanco en el tema oscuro, negro en el claro. */
export function Logo({ className = 'h-9' }: { className?: string }) {
  return (
    <>
      <img src="/logo-blanco.png" alt="Olimpo" className={cx('logo-oscuro w-auto', className)} />
      <img src="/logo-negro.png" alt="Olimpo" className={cx('logo-claro w-auto', className)} />
    </>
  )
}
