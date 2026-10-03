import { format } from 'date-fns'
import { useState } from 'react'
import { MOTIVOS, minutosDelTramo, reloj, useReloj } from '../../lib/foco'
import { cx } from '../ui'

/**
 * «Me distraje», en dos preguntas: desde cuándo y qué te sacó. Uno casi nunca se da cuenta
 * en el momento, así que lo normal es decir «hace 10 min» — y ese tiempo sale del reloj.
 */
export function Distraccion({ oscuro, onListo }: { oscuro?: boolean; onListo: () => void }) {
  const r = useReloj()
  const max = minutosDelTramo(r)
  const [hace, setHace] = useState(0)
  const [hora, setHora] = useState('')
  const opciones = [0, 5, 10, 15, 20, 30, 45].filter((m) => m === 0 || m <= max)
  if (max > 0 && !opciones.includes(max) && max < 45) opciones.push(max)

  const desdeHora = (v: string) => {
    setHora(v)
    if (!v) return setHace(0)
    const [h, m] = v.split(':').map(Number)
    const d = new Date()
    d.setHours(h, m, 0, 0)
    setHace(Math.max(0, Math.min(max, Math.round((Date.now() - d.getTime()) / 60_000))))
  }

  const chip = (activo: boolean) =>
    oscuro
      ? cx('rounded-full border px-3.5 py-1.5 text-[13px] transition', activo ? 'border-white bg-white text-black' : 'border-white/12 text-white/65 hover:border-white/30 hover:text-white')
      : cx('rounded-full border px-3 py-1.5 text-xs transition', activo ? 'border-blue bg-blue text-on-accent' : 'border-line text-muted hover:border-line-2 hover:text-text')
  const etiqueta = oscuro ? 'text-[11px] tracking-[0.14em] text-white/40 uppercase' : 'text-[11px] font-semibold tracking-[0.1em] text-faint uppercase'

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-2">
        <div className={etiqueta}>¿Desde cuándo?</div>
        <div className="flex flex-wrap justify-center gap-1.5">
          {opciones
            .sort((a, b) => a - b)
            .map((m) => (
              <button
                key={m}
                onClick={() => {
                  setHace(m)
                  setHora('')
                }}
                className={chip(hace === m && !hora)}
              >
                {m === 0 ? 'Ahora mismo' : m === max ? `${r.interrupciones.length || r.acumuladoMs > 0 ? 'Desde que retomé' : 'Desde que arranqué'} · ${m} min` : `Hace ${m} min`}
              </button>
            ))}
          <label className={cx(chip(!!hora), 'flex items-center gap-1.5')}>
            A las
            <input
              type="time"
              value={hora}
              max={format(new Date(), 'HH:mm')}
              onChange={(e) => desdeHora(e.target.value)}
              className={cx('w-[88px] bg-transparent text-[16px] outline-none md:text-[13px]', oscuro ? '[color-scheme:dark]' : '')}
            />
          </label>
        </div>
        {hace > 0 && <div className={cx('text-xs', oscuro ? 'text-white/45' : 'text-muted')}>Se descuentan {hace} min del reloj</div>}
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className={etiqueta}>¿Qué te sacó?</div>
        <div className="flex flex-wrap justify-center gap-1.5">
          {MOTIVOS.map((m) => (
            <button
              key={m}
              onClick={() => {
                reloj.distraje(m, hace)
                onListo()
              }}
              className={oscuro ? 'rounded-full border border-white/12 px-4 py-2 text-sm text-white/75 transition hover:border-red/60 hover:text-white' : 'rounded-full border border-line px-3 py-1.5 text-xs text-muted transition hover:border-red/50 hover:text-red'}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <button onClick={onListo} className={cx('text-xs', oscuro ? 'text-white/35 hover:text-white/70' : 'text-faint hover:text-text')}>
        Cancelar
      </button>
    </div>
  )
}
