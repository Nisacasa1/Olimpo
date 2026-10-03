import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check as CheckIcon, Expand, Minus, Pause, Play, Plus, Square, Star, Trash2, Wind, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FocoPantalla } from '../components/FocoPantalla'
import { Distraccion } from '../components/foco/Distraccion'
import { Area, Btn, Card, CardHead, cx, Input, Kpi, Modal, Num, Pagina, Segmento } from '../components/ui'
import { campana, mmss, reloj, trabajadoMs, useReloj, useTic, type TipoTrabajo } from '../lib/foco'
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
  const temporizador = r.modo === 'temporizador'
  const pasado = temporizador && ms >= objetivo
  const [terminar, setTerminar] = useState(false)
  const [respirar, setRespirar] = useState(false)
  const [opciones, setOpciones] = useState(false)
  const [motivos, setMotivos] = useState(false)
  // La sesión arranca a pantalla completa; minimizarla no para el reloj
  const [inmersivo, setInmersivo] = useState(true)
  const tarea = useRef<HTMLInputElement>(null)
  const deHoy = prioridades.filter((p) => p.fecha === hoyISO() && !p.hecha).sort((a, b) => a.orden - b.orden)

  // Al llegar al objetivo: suena una vez y sigue contando (el objetivo es una meta, no una guillotina)
  useEffect(() => {
    if (r.activo && temporizador && pasado && !r.avisado) {
      campana()
      if ('Notification' in window && Notification.permission === 'granted') new Notification('Olimpo · llegaste al objetivo', { body: `${r.objetivoMin} min en «${r.tarea || 'tu sesión'}». Termina cuando acabes.` })
      reloj.avisado()
    }
  })

  const empezar = () => {
    if (!r.tarea.trim()) {
      tarea.current?.focus()
      return avisar('Primero escribe en qué vas a trabajar, o elige una prioridad.')
    }
    setInmersivo(true)
    reloj.empezar()
  }
  const ajustar = (d: number) => reloj.config({ objetivoMin: Math.min(240, Math.max(5, r.objetivoMin + d)) })

  const tiempo = !r.activo ? (temporizador ? mmss(objetivo) : '00:00') : temporizador ? (pasado ? `+${mmss(ms - objetivo)}` : mmss(objetivo - ms)) : mmss(ms)
  const pct = !r.activo ? (temporizador ? 1 : 0) : temporizador ? Math.min(1, ms / objetivo) : (ms % 60_000) / 60_000
  const estado = !r.activo ? (temporizador ? 'minutos de foco' : 'cuenta hacia arriba') : r.distraido ? 'distraído' : !corriendo ? 'en pausa' : pasado ? 'pasaste el objetivo' : temporizador ? `de ${r.objetivoMin} min` : 'trabajo real'

  return (
    <Card className="relative overflow-hidden p-5 md:p-6">
      <div className="flex items-center justify-between gap-3">
        {!r.activo ? (
          <Segmento
            valor={r.modo}
            onChange={(m) => reloj.config({ modo: m })}
            opciones={[
              { valor: 'temporizador', etiqueta: 'Temporizador' },
              { valor: 'contador', etiqueta: 'Contador' },
            ]}
          />
        ) : (
          <div className="min-w-0 truncate text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">{r.tarea}</div>
        )}
        {!r.activo ? (
          <button onClick={() => setOpciones(!opciones)} className="text-xs text-muted hover:text-text">
            {opciones ? 'Menos' : 'Opciones'}
          </button>
        ) : (
          <Btn chico variante="fantasma" onClick={() => setInmersivo(true)}>
            <Expand size={13} /> Pantalla completa
          </Btn>
        )}
      </div>

      {/* El reloj en chico: el mismo que se agranda al empezar */}
      <div className="my-5 flex items-center justify-center gap-4">
        {!r.activo && temporizador && (
          <button onClick={() => ajustar(-5)} className="grid size-10 place-items-center rounded-full border border-line text-muted transition hover:border-line-2 hover:text-text" aria-label="Menos 5 minutos">
            <Minus size={16} />
          </button>
        )}
        <RelojCompacto tiempo={tiempo} pct={pct} estado={estado} vivo={r.activo && corriendo && !r.distraido} tono={r.distraido ? 'rojo' : pasado ? 'dorado' : r.activo && !corriendo ? 'apagado' : 'normal'} />
        {!r.activo && temporizador && (
          <button onClick={() => ajustar(5)} className="grid size-10 place-items-center rounded-full border border-line text-muted transition hover:border-line-2 hover:text-text" aria-label="Más 5 minutos">
            <Plus size={16} />
          </button>
        )}
      </div>

      {!r.activo ? (
        <div className="space-y-4">
          {temporizador && (
            <div className="flex justify-center gap-1.5">
              {[25, 50, 90].map((m) => (
                <button key={m} onClick={() => reloj.config({ objetivoMin: m })} className={cx('rounded-full border px-3.5 py-1 text-xs transition', r.objetivoMin === m ? 'border-blue bg-blue text-on-accent' : 'border-line text-muted hover:border-line-2 hover:text-text')}>
                  {m} min
                </button>
              ))}
            </div>
          )}
          <Input ref={tarea} value={r.tarea} onChange={(e) => reloj.config({ tarea: e.target.value, prioridad_id: null })} onKeyDown={(e) => e.key === 'Enter' && empezar()} placeholder="¿En qué vas a trabajar? Una sola cosa" className="h-12 text-center md:text-base" />
          {deHoy.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-center text-[11px] text-faint">o elige una de tus prioridades</div>
              <div className="flex flex-wrap justify-center gap-1.5">
                {deHoy.map((p) => (
                  <button key={p.id} onClick={() => reloj.config({ tarea: p.texto, prioridad_id: p.id })} className={cx('flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition', r.prioridad_id === p.id ? 'border-blue bg-blue-soft text-text' : 'border-line text-muted hover:border-line-2 hover:text-text')}>
                    <span className="num font-semibold">{p.orden + 1}</span> {p.texto}
                  </button>
                ))}
              </div>
            </div>
          )}
          {opciones && (
            <div className="space-y-2 rounded-2xl border border-line p-3">
              <div className="text-xs text-muted">Qué tipo de trabajo es</div>
              <Segmento valor={r.tipo} onChange={(t) => reloj.config({ tipo: t })} opciones={TIPOS.map((t) => ({ valor: t.k, etiqueta: t.n }))} />
              <div className="text-[11px] text-faint">{TIPOS.find((t) => t.k === r.tipo)?.d}. Un día que solo es «crear» es el que quema.</div>
              <Btn chico variante="fantasma" onClick={() => setRespirar(true)}>
                <Wind size={13} /> Respirar 1 minuto antes de empezar
              </Btn>
            </div>
          )}
          <button onClick={empezar} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue py-3.5 text-[15px] font-semibold text-on-accent transition hover:opacity-90 active:scale-[0.99]">
            <Play size={17} fill="currentColor" /> Empezar
          </button>
        </div>
      ) : r.distraido ? (
        <div className="flex flex-col items-center gap-3">
          <div className="text-sm text-muted">
            Te sacó: <b className="text-text">{r.interrupciones.at(-1)?.motivo}</b>
          </div>
          <Btn variante="primario" className="h-11 w-full max-w-xs" onClick={() => reloj.volvi()}>
            Volví
          </Btn>
        </div>
      ) : motivos ? (
        <div className="flex justify-center">
          <Distraccion onListo={() => setMotivos(false)} />
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          {corriendo && (
            <Btn className="h-11" onClick={() => setMotivos(true)}>
              Me distraje
            </Btn>
          )}
          <button onClick={() => (corriendo ? reloj.pausar() : reloj.seguir())} className="grid size-12 place-items-center rounded-full bg-blue text-on-accent transition hover:opacity-90" aria-label={corriendo ? 'Pausa' : 'Seguir'}>
            {corriendo ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>
          <Btn className="h-11" onClick={() => setTerminar(true)}>
            <Square size={13} /> Terminar
          </Btn>
        </div>
      )}
      {r.activo && r.interrupciones.length > 0 && <div className="mt-3 text-center text-[11px] text-faint">{r.interrupciones.length} {r.interrupciones.length === 1 ? 'interrupción' : 'interrupciones'} en esta sesión</div>}

      {r.activo && inmersivo && <FocoPantalla onTerminar={() => setTerminar(true)} onMinimizar={() => setInmersivo(false)} bloqueado={terminar} />}
      {terminar && <Terminar onCerrar={() => setTerminar(false)} />}
      {respirar && <Respirar onCerrar={() => setRespirar(false)} />}
    </Card>
  )
}

/** El reloj en chico, con el mismo trazo que la pantalla completa. */
function RelojCompacto({ tiempo, pct, estado, vivo, tono }: { tiempo: string; pct: number; estado: string; vivo: boolean; tono: 'normal' | 'rojo' | 'dorado' | 'apagado' }) {
  const R = 47
  const C = 2 * Math.PI * R
  const trazo = tono === 'rojo' ? 'var(--red)' : tono === 'dorado' ? 'var(--violet)' : 'var(--text)'
  return (
    <div className={cx('relative grid size-[200px] shrink-0 place-items-center md:size-[220px]', vivo && 'foco-vivo')}>
      <div className="foco-anillo absolute inset-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--line)" strokeWidth="1" />
          <circle className="foco-arco" cx="50" cy="50" r={R} fill="none" stroke={trazo} strokeWidth="1.1" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} opacity={tono === 'apagado' ? 0.45 : 1} />
        </svg>
      </div>
      <div className="relative text-center">
        <div className={cx('num text-[46px] leading-none font-extralight tracking-[-0.04em] md:text-[52px]', tono === 'dorado' ? 'text-violet' : tono === 'rojo' || tono === 'apagado' ? 'text-muted' : 'text-text')}>{tiempo}</div>
        <div className="mt-2 flex items-center justify-center gap-1.5 text-[10.5px] tracking-[0.12em] text-faint uppercase">
          {vivo && <span className="foco-latido size-1.5 rounded-full bg-text" />}
          {estado}
        </div>
      </div>
    </div>
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

function ListaPrioridades({ fecha, titulo, sub, deHoy }: { fecha: string; titulo: string; sub: string; deHoy?: boolean }) {
  const prioridades = useTabla('prioridades')
  const r = useReloj()
  const lista = prioridades.filter((p) => p.fecha === fecha).sort((a, b) => a.orden - b.orden)
  const hechas = lista.filter((p) => p.hecha).length
  const [nueva, setNueva] = useState('')
  const agregar = () => {
    if (!nueva.trim() || lista.length >= 3) return
    insertar('prioridades', { fecha, texto: nueva.trim(), hecha: false, orden: lista.length })
    setNueva('')
  }
  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{titulo}</div>
          <div className="mt-0.5 text-[11px] text-faint">{sub}</div>
        </div>
        {lista.length > 0 && <div className="num shrink-0 pt-0.5 text-xs text-muted">{hechas}/{lista.length} hechas</div>}
      </div>
      <ol className="space-y-2">
        {lista.map((p: PrioridadDia, i) => {
          const enFoco = r.activo && r.prioridad_id === p.id
          return (
            <li
              key={p.id}
              className={cx(
                'group flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition',
                p.hecha ? 'border-line bg-transparent' : deHoy ? 'border-line-2 bg-surface-2' : 'border-line bg-surface-2/40',
                enFoco && 'border-text/40',
              )}
            >
              <span className={cx('num grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold', p.hecha ? 'bg-green-soft text-green' : deHoy ? 'bg-blue text-on-accent' : 'border border-line-2 text-muted')}>
                {p.hecha ? <CheckIcon size={14} /> : i + 1}
              </span>
              <span className={cx('min-w-0 flex-1 text-[14.5px] leading-snug', p.hecha ? 'text-faint line-through' : deHoy ? 'font-medium text-text' : 'text-muted')}>{p.texto}</span>
              {enFoco && <span className="text-[10.5px] tracking-[0.12em] text-muted uppercase">en foco</span>}
              {deHoy && !p.hecha && !r.activo && (
                <button onClick={() => reloj.config({ tarea: p.texto, prioridad_id: p.id })} className={cx('grid size-8 place-items-center rounded-full transition', r.prioridad_id === p.id ? 'bg-blue text-on-accent' : 'text-faint hover:bg-surface hover:text-text')} title="Enfocarme en esta">
                  <Play size={13} fill="currentColor" />
                </button>
              )}
              <button onClick={() => actualizar('prioridades', p.id, { hecha: !p.hecha })} className={cx('grid size-8 place-items-center rounded-full transition', p.hecha ? 'text-green hover:bg-surface' : 'text-faint hover:bg-surface hover:text-green')} title={p.hecha ? 'Desmarcar' : 'Marcar como hecha'}>
                <CheckIcon size={15} />
              </button>
              <button onClick={() => borrar('prioridades', p.id)} className="text-faint opacity-0 transition group-hover:opacity-100 hover:text-red max-md:opacity-60" title="Quitar">
                <X size={14} />
              </button>
            </li>
          )
        })}
        {lista.length < 3 && (
          <li className="flex items-center gap-3 rounded-2xl border border-dashed border-line px-3.5 py-1.5 focus-within:border-line-2">
            <span className="num grid size-7 shrink-0 place-items-center rounded-full border border-dashed border-line-2 text-[13px] text-faint">{lista.length + 1}</span>
            <input
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && agregar()}
              placeholder={lista.length === 0 ? 'La más importante del día' : 'La siguiente'}
              className="h-10 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-faint md:text-[14.5px]"
            />
            {nueva.trim() && (
              <button onClick={agregar} className="grid size-8 place-items-center rounded-full bg-blue text-on-accent" aria-label="Agregar">
                <Plus size={15} />
              </button>
            )}
          </li>
        )}
        {Array.from({ length: Math.max(0, 2 - lista.length) }, (_, k) => (
          <li key={k} className="flex items-center gap-3 px-3.5 py-1 opacity-40">
            <span className="num grid size-7 shrink-0 place-items-center rounded-full border border-dashed border-line text-[13px] text-faint">{lista.length + 2 + k}</span>
            <span className="h-px flex-1 bg-line" />
          </li>
        ))}
      </ol>
    </div>
  )
}

function Prioridades() {
  const manana = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd')
  return (
    <Card className="space-y-7 p-5 md:p-6">
      <ListaPrioridades deHoy fecha={hoyISO()} titulo="Las 3 de hoy" sub="El inventario de productividad del Daily Planner" />
      <div className="border-t border-line pt-6">
        <ListaPrioridades fecha={manana} titulo="Las 3 de mañana" sub="Se deciden esta noche, mientras sabes lo que costó hoy" />
      </div>
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
