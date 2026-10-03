import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check as CheckIcon, Pause, Play, Plus, Square, Star, Trash2, Wind, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Area, Btn, Card, CardHead, cx, Input, Kpi, Modal, Num, Pagina, Segmento } from '../components/ui'
import { campana, MOTIVOS, mmss, reloj, trabajadoMs, useReloj, useTic, type TipoTrabajo } from '../lib/foco'
import { fmt, hoyISO } from '../lib/format'
import { actualizar, avisar, borrar, insertar, useTabla } from '../lib/store'
import type { CierreDia, Dia, PrioridadDia } from '../lib/types'

const TIPOS: { k: TipoTrabajo; n: string; d: string }[] = [
  { k: 'crear', n: 'Crear', d: 'producir: grabar, escribir, montar, vender' },
  { k: 'aprender', n: 'Aprender', d: 'consumir con intención: cursos, módulos' },
  { k: 'vaciar', n: 'Vaciar', d: 'dejar la mente en blanco: caminar, descansar' },
]

export default function Foco() {
  return (
    <Pagina titulo="Foco" sub="Tres prioridades y una cosa a la vez. El reloj cuenta solo el trabajo: cada distracción lo para y queda registrada, para que veas qué te está cortando el día.">
      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <Temporizador />
        <Prioridades />
      </div>
      <ElDia />
    </Pagina>
  )
}

// ── El reloj ──────────────────────────────────────────────────────────

function Temporizador() {
  const r = useReloj()
  const prioridades = useTabla('prioridades')
  const corriendo = !!r.tramo
  useTic(r.activo)
  const ms = trabajadoMs(r)
  const objetivo = r.objetivoMin * 60_000
  const pasado = r.modo === 'temporizador' && ms >= objetivo
  const [terminar, setTerminar] = useState(false)
  const [respirar, setRespirar] = useState(false)
  const [opciones, setOpciones] = useState(false)
  const deHoy = prioridades.filter((p) => p.fecha === hoyISO() && !p.hecha).sort((a, b) => a.orden - b.orden)

  // Al llegar al objetivo: suena una vez y sigue contando (el objetivo es una meta, no una guillotina)
  useEffect(() => {
    if (r.activo && r.modo === 'temporizador' && pasado && !r.avisado) {
      campana()
      if ('Notification' in window && Notification.permission === 'granted') new Notification('Olimpo · llegaste al objetivo', { body: `${r.objetivoMin} min en «${r.tarea || 'tu sesión'}». Termina cuando acabes.` })
      reloj.avisado()
    }
  })

  const pct = r.modo === 'temporizador' ? Math.min(1, ms / objetivo) : (ms % 3_600_000) / 3_600_000
  const R = 108
  const C = 2 * Math.PI * R

  return (
    <Card className="relative overflow-hidden p-6">
      {!r.activo ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Segmento
              valor={r.modo}
              onChange={(m) => reloj.config({ modo: m })}
              opciones={[
                { valor: 'temporizador', etiqueta: 'Temporizador' },
                { valor: 'contador', etiqueta: 'Contador' },
              ]}
            />
            <button onClick={() => setOpciones(!opciones)} className="text-xs text-muted hover:text-text">
              {opciones ? 'Menos' : 'Opciones'}
            </button>
          </div>
          <Input value={r.tarea} onChange={(e) => reloj.config({ tarea: e.target.value, prioridad_id: null })} placeholder="¿En qué vas a trabajar? Una sola cosa" className="h-12 text-base" />
          {deHoy.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {deHoy.map((p) => (
                <button key={p.id} onClick={() => reloj.config({ tarea: p.texto, prioridad_id: p.id })} className={cx('rounded-lg border px-2.5 py-1 text-xs transition', r.prioridad_id === p.id ? 'border-blue bg-blue-soft text-text' : 'border-line text-muted hover:border-line-2')}>
                  {p.texto}
                </button>
              ))}
            </div>
          )}
          {r.modo === 'temporizador' && (
            <div className="flex flex-wrap items-center gap-2">
              {[25, 50, 90].map((m) => (
                <button key={m} onClick={() => reloj.config({ objetivoMin: m })} className={cx('rounded-lg border px-3 py-1.5 text-sm transition', r.objetivoMin === m ? 'border-blue bg-blue-soft text-text' : 'border-line text-muted hover:border-line-2')}>
                  {m} min
                </button>
              ))}
              <Num className="h-9 w-24" value={r.objetivoMin} onChange={(n) => reloj.config({ objetivoMin: Math.max(1, n ?? 25) })} />
            </div>
          )}
          {opciones && (
            <div className="space-y-2 rounded-xl bg-surface-2/50 p-3">
              <div className="text-xs text-muted">Qué tipo de trabajo es</div>
              <Segmento valor={r.tipo} onChange={(t) => reloj.config({ tipo: t })} opciones={TIPOS.map((t) => ({ valor: t.k, etiqueta: t.n }))} />
              <div className="text-[11px] text-faint">{TIPOS.find((t) => t.k === r.tipo)?.d}. Un día que solo es «crear» es el que quema.</div>
              <Btn chico variante="fantasma" onClick={() => setRespirar(true)}>
                <Wind size={13} /> Respirar 1 minuto antes de empezar
              </Btn>
            </div>
          )}
          <Btn variante="primario" className="h-14 w-full text-base" onClick={() => reloj.empezar()} disabled={!r.tarea.trim()}>
            <Play size={18} /> Empezar
          </Btn>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="mb-2 max-w-full truncate text-center text-sm text-muted">{r.tarea}</div>
          <div className="relative grid place-items-center">
            <svg width="260" height="260" viewBox="0 0 260 260" className="-rotate-90">
              <circle cx="130" cy="130" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="10" />
              <circle cx="130" cy="130" r={R} fill="none" stroke={pasado ? 'var(--green)' : r.distraido ? 'var(--red)' : 'var(--blue)'} strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} className="transition-[stroke-dashoffset] duration-500" />
            </svg>
            <div className="absolute text-center">
              <div className={cx('num text-5xl font-semibold tracking-tight', pasado && 'text-green')}>
                {r.modo === 'temporizador' ? (pasado ? `+${mmss(ms - objetivo)}` : mmss(objetivo - ms)) : mmss(ms)}
              </div>
              <div className="mt-1 text-xs text-faint">
                {r.distraido ? 'distraído — el reloj está parado' : !corriendo ? 'en pausa' : r.modo === 'temporizador' ? (pasado ? 'pasaste el objetivo · sigue o termina' : `de ${r.objetivoMin} min`) : 'trabajo real'}
              </div>
            </div>
          </div>
          {r.distraido ? (
            <div className="mt-4 w-full space-y-2">
              <div className="text-center text-sm">
                Te sacó: <b>{r.interrupciones.at(-1)?.motivo}</b>
              </div>
              <Btn variante="primario" className="h-12 w-full" onClick={() => reloj.volvi()}>
                Volví
              </Btn>
            </div>
          ) : (
            <>
              <div className="mt-5 grid w-full grid-cols-2 gap-2">
                <Btn className="h-12" onClick={() => (corriendo ? reloj.pausar() : reloj.seguir())}>
                  {corriendo ? (
                    <>
                      <Pause size={16} /> Pausa
                    </>
                  ) : (
                    <>
                      <Play size={16} /> Seguir
                    </>
                  )}
                </Btn>
                <Btn variante="primario" className="h-12" onClick={() => setTerminar(true)}>
                  <Square size={15} /> Terminar
                </Btn>
              </div>
              {corriendo && (
                <div className="mt-3 w-full">
                  <div className="mb-1.5 text-center text-[11px] text-faint">¿Me distraje? Toca qué te sacó y el reloj se para</div>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {MOTIVOS.map((m) => (
                      <button key={m} onClick={() => reloj.distraje(m)} className="rounded-lg border border-line px-2.5 py-1 text-xs text-muted transition hover:border-red/50 hover:text-red">
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          {r.interrupciones.length > 0 && <div className="mt-3 text-[11px] text-faint">{r.interrupciones.length} interrupciones en esta sesión</div>}
        </div>
      )}
      {terminar && <Terminar onCerrar={() => setTerminar(false)} />}
      {respirar && <Respirar onCerrar={() => setRespirar(false)} />}
    </Card>
  )
}

function Terminar({ onCerrar }: { onCerrar: () => void }) {
  const r = useReloj()
  const [min, setMin] = useState<number | null>(Math.max(1, Math.round(trabajadoMs(r) / 60_000)))
  const [calidad, setCalidad] = useState<number>(4)
  const [hecha, setHecha] = useState(!!r.prioridad_id)
  const guardar = () => {
    reloj.pausar()
    const ahora = new Date().toISOString()
    insertar('sesiones', {
      fecha: hoyISO(),
      inicio: r.inicio ?? ahora,
      fin: ahora,
      minutos: min ?? 0,
      objetivo_min: r.modo === 'temporizador' ? r.objetivoMin : null,
      modo: r.modo,
      tarea: r.tarea,
      prioridad_id: r.prioridad_id,
      tipo: r.tipo,
      calidad,
      interrupciones: r.interrupciones.map((x) => ({ ...x, fin: x.fin ?? ahora })),
    })
    if (hecha && r.prioridad_id) actualizar('prioridades', r.prioridad_id, { hecha: true })
    reloj.descartar()
    avisar(`Sesión guardada: ${min} min de foco.`, 'ok')
    onCerrar()
  }
  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo="Terminar la sesión"
      pie={
        <>
          <Btn
            variante="fantasma"
            className="mr-auto text-red"
            onClick={() => {
              if (confirm('¿Descartar la sesión sin guardarla?')) {
                reloj.descartar()
                onCerrar()
              }
            }}
          >
            Descartar
          </Btn>
          <Btn variante="primario" onClick={guardar}>
            Guardar
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <div className="text-sm text-muted">{r.tarea}</div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Minutos de trabajo real — corrígelo si el reloj siguió corriendo. Un número equivocado es peor que ninguno</span>
          <Num value={min} onChange={setMin} />
        </label>
        <div>
          <div className="mb-1.5 text-xs font-medium text-muted">¿Qué tan bueno fue el foco?</div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setCalidad(n)} className="p-1">
                <Star size={24} className={cx(n <= calidad ? 'fill-violet text-violet' : 'text-faint')} />
              </button>
            ))}
          </div>
        </div>
        {r.prioridad_id && (
          <button onClick={() => setHecha(!hecha)} className="flex items-center gap-2 text-sm">
            <span className={cx('grid size-5 place-items-center rounded-md border', hecha ? 'border-blue bg-blue text-on-accent' : 'border-line-2')}>{hecha && <CheckIcon size={13} />}</span>
            Marcar la prioridad como hecha
          </button>
        )}
        {r.interrupciones.length > 0 && <div className="text-xs text-faint">Interrupciones: {r.interrupciones.map((x) => x.motivo).join(' · ')}</div>}
      </div>
    </Modal>
  )
}

function Respirar({ onCerrar }: { onCerrar: () => void }) {
  const [t, setT] = useState(60)
  useEffect(() => {
    const i = setInterval(() => setT((x) => (x <= 1 ? 0 : x - 1)), 1000)
    return () => clearInterval(i)
  }, [])
  useEffect(() => {
    if (t === 0) onCerrar()
  }, [t, onCerrar])
  const fase = Math.floor((60 - t) / 4) % 2 === 0 ? 'Inhala' : 'Exhala'
  return (
    <Modal abierto onCerrar={onCerrar} titulo="Respirar">
      <div className="flex flex-col items-center py-8">
        <div className={cx('grid size-40 place-items-center rounded-full border border-line-2 transition-all duration-[4000ms] ease-in-out', fase === 'Inhala' ? 'scale-110 bg-blue-soft' : 'scale-75 bg-surface-2')}>
          <span className="font-serif text-2xl">{fase}</span>
        </div>
        <div className="num mt-6 text-sm text-faint">{t} s</div>
      </div>
    </Modal>
  )
}

// ── Prioridades ───────────────────────────────────────────────────────

function ListaPrioridades({ fecha, titulo, sub }: { fecha: string; titulo: string; sub: string }) {
  const prioridades = useTabla('prioridades')
  const lista = prioridades.filter((p) => p.fecha === fecha).sort((a, b) => a.orden - b.orden)
  const [nueva, setNueva] = useState('')
  const agregar = () => {
    if (!nueva.trim() || lista.length >= 3) return
    insertar('prioridades', { fecha, texto: nueva.trim(), hecha: false, orden: lista.length })
    setNueva('')
  }
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <div className="text-sm font-semibold">{titulo}</div>
        <div className="text-[11px] text-faint">{sub}</div>
      </div>
      <div className="space-y-1.5">
        {lista.map((p: PrioridadDia, i) => (
          <div key={p.id} className="group flex items-center gap-2.5 rounded-xl border border-line px-3 py-2.5">
            <button onClick={() => actualizar('prioridades', p.id, { hecha: !p.hecha })} className={cx('grid size-5 shrink-0 place-items-center rounded-md border transition', p.hecha ? 'border-green bg-green text-on-accent' : 'border-line-2')}>
              {p.hecha && <CheckIcon size={13} />}
            </button>
            <span className="num w-4 text-xs text-faint">{i + 1}</span>
            <span className={cx('min-w-0 flex-1 text-sm', p.hecha && 'text-faint line-through')}>{p.texto}</span>
            {fecha === hoyISO() && !p.hecha && (
              <button onClick={() => reloj.config({ tarea: p.texto, prioridad_id: p.id })} className="text-faint hover:text-text" title="Enfocarme en esta">
                <Play size={14} />
              </button>
            )}
            <button onClick={() => borrar('prioridades', p.id)} className="text-faint opacity-0 group-hover:opacity-100 hover:text-red">
              <X size={14} />
            </button>
          </div>
        ))}
        {lista.length < 3 && (
          <div className="flex gap-2">
            <Input className="h-10" value={nueva} onChange={(e) => setNueva(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && agregar()} placeholder={`Prioridad ${lista.length + 1} de 3`} />
            <Btn onClick={agregar} disabled={!nueva.trim()}>
              <Plus size={15} />
            </Btn>
          </div>
        )}
      </div>
    </div>
  )
}

function Prioridades() {
  const manana = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd')
  return (
    <Card className="space-y-6 p-5">
      <ListaPrioridades fecha={hoyISO()} titulo="Las 3 de hoy" sub="El inventario de productividad del Daily Planner" />
      <ListaPrioridades fecha={manana} titulo="Las 3 de mañana" sub="Se deciden esta noche, mientras sabes lo que costó hoy" />
    </Card>
  )
}

// ── El día ────────────────────────────────────────────────────────────

function ElDia() {
  const sesiones = useTabla('sesiones')
  const dias = useTabla('dias')
  const hoy = hoyISO()
  const deHoy = sesiones.filter((s) => s.fecha === hoy).sort((a, b) => a.inicio.localeCompare(b.inicio))
  const minutos = deHoy.reduce((a, s) => a + s.minutos, 0)
  const ints = deHoy.flatMap((s) => s.interrupciones ?? [])
  const motivos = useMemo(() => {
    const m = new Map<string, { n: number; min: number }>()
    for (const x of ints) {
      const min = x.fin ? (new Date(x.fin).getTime() - new Date(x.inicio).getTime()) / 60_000 : 0
      const v = m.get(x.motivo) ?? { n: 0, min: 0 }
      m.set(x.motivo, { n: v.n + 1, min: v.min + min })
    }
    return [...m.entries()].sort((a, b) => b[1].min - a[1].min)
  }, [ints])
  const semana = Array.from({ length: 7 }, (_, i) => {
    const f = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')
    return { f, min: sesiones.filter((s) => s.fecha === f).reduce((a, s) => a + s.minutos, 0) }
  })
  const max = Math.max(60, ...semana.map((d) => d.min))
  const calidad = deHoy.filter((s) => s.calidad).length ? deHoy.reduce((a, s) => a + (s.calidad ?? 0), 0) / deHoy.filter((s) => s.calidad).length : null

  return (
    <div className="mt-5 space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi etiqueta="Foco hoy" valor={`${fmt.dec(minutos / 60)} h`} sub={`${deHoy.length} sesiones`} />
        <Kpi etiqueta="Interrupciones" valor={fmt.n(ints.length)} sub={motivos[0] ? `la que más: ${motivos[0][0]}` : 'ninguna'} tono={ints.length > 4 ? 'alerta' : 'nada'} />
        <Kpi etiqueta="Calidad" valor={calidad != null ? `${fmt.dec(calidad)}/5` : '—'} />
        <Kpi etiqueta="Foco · 7 días" valor={`${fmt.dec(semana.reduce((a, d) => a + d.min, 0) / 60)} h`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHead titulo="La semana" sub="Horas de foco real por día" />
          <div className="flex h-36 items-end gap-2 px-5 pb-5">
            {semana.map((d) => (
              <div key={d.f} className="flex flex-1 flex-col items-center gap-1">
                <span className="num text-[10px] text-faint">{d.min ? fmt.dec(d.min / 60) : ''}</span>
                <div className={cx('w-full rounded-md', d.f === hoy ? 'bg-blue' : 'bg-surface-2')} style={{ height: `${Math.max(3, (d.min / max) * 90)}px` }} />
                <span className="text-[10px] text-faint first-letter:uppercase">{format(new Date(d.f + 'T12:00'), 'EEE', { locale: es })}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHead titulo="Qué te cortó hoy" sub="Ordenado por el tiempo que se llevó" />
          <div className="space-y-2 px-5 pb-5 text-sm">
            {motivos.length === 0 && <div className="text-xs text-faint">Sin interrupciones registradas hoy.</div>}
            {motivos.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <span>{k}</span>
                <span className="text-xs text-muted">
                  {v.n} {v.n === 1 ? 'vez' : 'veces'} · {fmt.n(v.min)} min
                </span>
              </div>
            ))}
            {deHoy.length > 0 && (
              <div className="mt-3 space-y-1 border-t border-line pt-3">
                {deHoy.map((s) => (
                  <div key={s.id} className="group flex items-center gap-2 text-xs">
                    <span className="num w-12 text-faint">{fmt.hora(s.inicio)}</span>
                    <span className="min-w-0 flex-1 truncate">{s.tarea}</span>
                    <span className="num text-muted">{s.minutos} min</span>
                    <button onClick={() => borrar('sesiones', s.id)} className="text-faint opacity-0 group-hover:opacity-100 hover:text-red">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <CierreDelDia dia={dias.find((d) => d.fecha === hoy)} horasFoco={minutos / 60} />
    </div>
  )
}

function CierreDelDia({ dia, horasFoco }: { dia: Dia | undefined; horasFoco: number }) {
  const guardado = dia?.cierre
  const c: CierreDia = { horas: guardado?.horas ?? null, foco: guardado?.foco ?? null, output: guardado?.output ?? '', mejoras: [...(guardado?.mejoras ?? []), '', '', ''].slice(0, 3) }
  const [v, setV] = useState<CierreDia>(c)
  const guardar = () => {
    const cierre = { ...v, horas: v.horas ?? Math.round(horasFoco * 10) / 10 }
    if (dia) actualizar('dias', dia.id, { cierre })
    else insertar('dias', { fecha: hoyISO(), consumo: false, contenido: false, entrevistas: 0, energia: null, nota: '', ritual: null, cierre })
    avisar('Día cerrado. Decide las 3 de mañana antes de soltar.', 'ok')
  }
  return (
    <Card>
      <CardHead titulo="Cerrar el día" sub="El Daily Planner de Imperium: horas, foco, output y cómo mejorar" />
      <div className="grid gap-4 px-5 pb-5 md:grid-cols-[1fr_1fr_2fr]">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Horas</span>
          <Num value={v.horas ?? Math.round(horasFoco * 10) / 10} onChange={(n) => setV({ ...v, horas: n })} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Foco (1-10)</span>
          <Num value={v.foco} onChange={(n) => setV({ ...v, foco: n == null ? null : Math.min(10, Math.max(1, n)) })} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Output — qué quedó hecho de verdad</span>
          <Input value={v.output} onChange={(e) => setV({ ...v, output: e.target.value })} />
        </label>
        <div className="md:col-span-3">
          <div className="mb-1.5 text-xs font-medium text-muted">¿Cómo podría mejorar?</div>
          <div className="grid gap-2 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Area key={i} rows={2} value={v.mejoras[i] ?? ''} onChange={(e) => setV({ ...v, mejoras: v.mejoras.map((m, j) => (j === i ? e.target.value : m)) })} placeholder={`${i + 1}.`} />
            ))}
          </div>
        </div>
        <div className="flex justify-end md:col-span-3">
          <Btn variante="primario" onClick={guardar}>
            {dia?.cierre ? 'Actualizar el cierre' : 'Cerrar el día'}
          </Btn>
        </div>
      </div>
    </Card>
  )
}
