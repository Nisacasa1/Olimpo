import type { ReactNode } from 'react'
import { fmt } from '../lib/format'
import { cx } from './ui'

export const ejeProps = {
  stroke: 'var(--faint)',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const

export const gridProps = { stroke: 'var(--line)', vertical: false } as const

export function TooltipCaja({ active, payload, label, formato }: { active?: boolean; payload?: { name: string; value: number; color: string; dataKey: string }[]; label?: string; formato?: (k: string, v: number) => string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-line-2 bg-surface px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-semibold text-text">{label && /^\d{4}-\d{2}-\d{2}$/.test(label) ? fmt.fecha(label, "EEE d MMM") : label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-muted">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <b className="num text-text">{formato ? formato(p.dataKey, p.value) : fmt.dec(p.value)}</b>
        </div>
      ))}
    </div>
  )
}

/** Embudo horizontal: cada etapa con su ancho relativo y la tasa al paso siguiente. */
export function EmbudoVisual({ etapas }: { etapas: { nombre: string; valor: number; color: string; nota?: ReactNode }[] }) {
  const max = Math.max(1, ...etapas.map((e) => e.valor))
  return (
    <div className="space-y-2.5">
      {etapas.map((e, i) => {
        const prev = etapas[i - 1]
        const paso = prev && prev.valor > 0 ? e.valor / prev.valor : null
        return (
          <div key={e.nombre}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
              <span className="font-medium text-muted">{e.nombre}</span>
              <span className="flex items-baseline gap-2">
                {paso != null && <span className="text-faint">{fmt.pct(paso)} del paso anterior</span>}
                <b className="num text-sm text-text">{fmt.n(e.valor)}</b>
              </span>
            </div>
            <div className="h-7 overflow-hidden rounded-lg bg-surface-2">
              <div
                className={cx('flex h-full items-center rounded-lg px-2 text-[10.5px] font-semibold text-white/90 transition-all duration-700')}
                style={{ width: `${Math.max(2, (e.valor / max) * 100)}%`, background: e.color }}
              >
                {e.nota}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
