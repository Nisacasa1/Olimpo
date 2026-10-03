import { eachDayOfInterval, endOfMonth, format, getDay, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Crown, Flag, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Area, Barra, Btn, Card, CardHead, cx, Input, Kpi, Modal, Pagina } from '../components/ui'
import { diaLocal, fmt, hoyISO, mesISO } from '../lib/format'
import { lecturaCompleta } from '../lib/semana2'
import { actualizar, insertar, useAjustes, useTabla } from '../lib/store'

// Las cuatro acciones que cuentan un día de guerra
const ACCIONES = [
  { k: 'mente', n: 'Mentalidad', d: 'Leíste tu documento mañana y noche' },
  { k: 'foco', n: 'Foco', d: '2 horas o más de foco real (la ventana diaria de Imperium)' },
  { k: 'adquisicion', n: 'Adquisición', d: 'Revisaste la pauta, publicaste una pieza o llamaste' },
  { k: 'ventas', n: 'Ventas', d: 'Hiciste una videollamada o abriste una conversación' },
] as const
type ClaveAccion = (typeof ACCIONES)[number]['k']

const COLOR = ['var(--surface-2)', 'color-mix(in oklab, var(--text) 16%, var(--surface-2))', 'color-mix(in oklab, var(--text) 38%, var(--surface-2))', 'color-mix(in oklab, var(--text) 65%, var(--surface-2))', 'var(--text)']

export default function WarMap() {
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [mesSel, setMesSel] = useState(mesISO())
  const [dia, setDia] = useState<string | null>(null)
  const dias = useTabla('dias')
  const sesiones = useTabla('sesiones')
  const pauta = useTabla('pauta')
  const piezas = useTabla('piezas')
  const llamadas = useTabla('llamadas')
  const reuniones = useTabla('reuniones')
  const personas = useTabla('personas')
  const clientes = useTabla('clientes')
  const movs = useTabla('movimientos')
  const warmap = useTabla('warmap')
  const ajustes = useAjustes()
  const hoy = hoyISO()

  // Qué acciones se hicieron cada día
  const porDia = useMemo(() => {
    const m = new Map<string, Set<ClaveAccion>>()
    const marca = (f: string, k: ClaveAccion) => {
      if (!f) return
      if (!m.has(f)) m.set(f, new Set())
      m.get(f)!.add(k)
    }
    for (const d of dias) if (lecturaCompleta(d.ritual)) marca(d.fecha, 'mente')
    const foco = new Map<string, number>()
    for (const s of sesiones) foco.set(s.fecha, (foco.get(s.fecha) ?? 0) + s.minutos)
    for (const [f, min] of foco) if (min >= 120) marca(f, 'foco')
    for (const x of pauta) if (x.cuenta === 'olimpo') marca(diaLocal(x.created_at ?? x.fecha), 'adquisicion')
    for (const x of piezas) marca(x.publicado, 'adquisicion')
    for (const x of llamadas) marca(diaLocal(x.fecha), 'adquisicion')
    for (const r of reuniones) if (r.estado === 'presentada') marca(diaLocal(r.fecha), 'ventas')
    for (const x of personas) marca(diaLocal(x.created_at ?? ''), 'ventas')
    return m
  }, [dias, sesiones, pauta, piezas, llamadas, reuniones, personas])
  const clientesPorDia = useMemo(() => new Set(clientes.map((c) => c.inicio)), [clientes])

  const reglasId = `reglas-${anio}`
  const reglas = ((warmap.find((w) => w.id === reglasId)?.datos.reglas as string[]) ?? []).concat(['', '', '', '', '']).slice(0, 5)
  const mesId = `mes-${mesSel}`
  const mesDatos = warmap.find((w) => w.id === mesId)?.datos ?? {}
  const guardarWm = (id: string, datos: Record<string, unknown>) => {
    const e = warmap.find((w) => w.id === id)
    if (e) actualizar('warmap', id, { datos: { ...e.datos, ...datos } })
    else insertar('warmap', { id, datos })
  }

  // Días de guerra (las 4 acciones) y la racha actual
  const diasGuerraMes = [...porDia.entries()].filter(([f, s]) => f.startsWith(mesISO()) && s.size === 4).length
  const racha = (() => {
    let n = 0
    const d = new Date()
    if ((porDia.get(hoy)?.size ?? 0) < 3) d.setDate(d.getDate() - 1)
    for (let i = 0; i < 400; i++) {
      if ((porDia.get(format(d, 'yyyy-MM-dd'))?.size ?? 0) < 3) break
      n++
      d.setDate(d.getDate() - 1)
    }
    return n
  })()

  // Los hitos de Imperium, medidos con tus datos
  const gastoPauta = pauta.filter((x) => x.cuenta === 'olimpo').reduce((a, x) => a + x.gasto, 0)
  const ingresoMes = movs.filter((m) => m.tipo === 'ingreso' && m.ambito === 'negocio' && m.fecha.startsWith(mesISO())).reduce((a, m) => a + m.monto, 0)
  const hitos = [
    { n: 'Primer cliente', d: 'El primer peldaño del Six Figure Roadmap', valor: clientes.length, meta: 1, texto: `${clientes.length} / 1` },
    { n: '5 clientes con resultado', d: 'Compuerta del Paid Ads System (junto con los USD 3.000)', valor: clientes.length, meta: 5, texto: `${clientes.length} / 5` },
    { n: 'USD 3.000 en pauta propia', d: 'La otra mitad de la compuerta', valor: gastoPauta, meta: 3000 * ajustes.trm, texto: `${fmt.copCorto(gastoPauta)} / ${fmt.copCorto(3000 * ajustes.trm)}` },
    { n: 'USD 10k al mes', d: 'Regla dura 2: hasta aquí no se cambia nicho ni problema', valor: ingresoMes, meta: 10000 * ajustes.trm, texto: `${fmt.copCorto(ingresoMes)} / ${fmt.copCorto(10000 * ajustes.trm)} este mes` },
    { n: '15 clientes', d: 'Regla dura 3: el umbral para pasar a DIY', valor: clientes.length, meta: 15, texto: `${clientes.length} / 15` },
  ]

  const meses = Array.from({ length: 12 }, (_, i) => new Date(anio, i, 1))

  return (
    <Pagina
      titulo="War Map"
      sub="El año en una pantalla. Ningún día se pinta a mano: el color es lo que de verdad hiciste. Las reglas del año se escriben una vez para no volver a decidirlas, y cada mes tiene sus objetivos."
      acciones={
        <div className="flex items-center gap-1">
          <Btn chico variante="fantasma" onClick={() => setAnio(anio - 1)}>
            <ChevronLeft size={16} />
          </Btn>
          <span className="num w-14 text-center font-semibold">{anio}</span>
          <Btn chico variante="fantasma" onClick={() => setAnio(anio + 1)}>
            <ChevronRight size={16} />
          </Btn>
        </div>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi etiqueta="Días de guerra este mes" valor={fmt.n(diasGuerraMes)} sub="las 4 acciones en el mismo día" />
        <Kpi etiqueta="Racha" valor={`${racha} días`} sub="con 3 o más acciones" tono={racha >= 7 ? 'ok' : 'nada'} />
        <Kpi etiqueta="Clientes" valor={fmt.n(clientes.length)} />
        <Kpi etiqueta="Facturado este mes" valor={fmt.copCorto(ingresoMes)} />
      </div>

      <Card className="p-5">
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {meses.map((m) => {
            const id = format(m, 'yyyy-MM')
            const ds = eachDayOfInterval({ start: startOfMonth(m), end: endOfMonth(m) })
            const vacios = (getDay(ds[0]) + 6) % 7 // la semana empieza el lunes
            const objetivo = (warmap.find((w) => w.id === `mes-${id}`)?.datos.objetivos as string[] | undefined)?.find(Boolean)
            return (
              <button key={id} onClick={() => setMesSel(id)} className={cx('rounded-xl p-2 text-left transition', mesSel === id ? 'bg-surface-2/70 ring-1 ring-line-2' : 'hover:bg-surface-2/40')}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-xs font-semibold tracking-wide uppercase first-letter:uppercase">{format(m, 'MMMM', { locale: es })}</span>
                </div>
                <div className="grid grid-cols-7 gap-[3px]">
                  {Array.from({ length: vacios }).map((_, i) => (
                    <span key={`v${i}`} />
                  ))}
                  {ds.map((d) => {
                    const f = format(d, 'yyyy-MM-dd')
                    const n = porDia.get(f)?.size ?? 0
                    const cliente = clientesPorDia.has(f)
                    return (
                      <span
                        key={f}
                        onClick={(e) => {
                          e.stopPropagation()
                          setDia(f)
                        }}
                        title={`${fmt.fecha(f)} · ${n}/4`}
                        className={cx('aspect-square cursor-pointer rounded-[3px] transition hover:ring-1 hover:ring-blue', f === hoy && 'ring-1 ring-blue', f > hoy && 'opacity-40')}
                        style={{ background: cliente ? 'var(--violet)' : COLOR[n] }}
                      />
                    )
                  })}
                </div>
                <div className="mt-1.5 truncate text-[10.5px] text-faint">{objetivo ? `◎ ${objetivo}` : ' '}</div>
              </button>
            )
          })}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 text-[11px] text-muted">
          <span className="font-semibold text-text">Key</span>
          {[0, 1, 2, 3, 4].map((n) => (
            <span key={n} className="flex items-center gap-1.5">
              <span className="size-3 rounded-[3px]" style={{ background: COLOR[n] }} />
              {n === 4 ? '4 · día de guerra' : `${n} de 4`}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-[3px] bg-violet" /> cliente nuevo
          </span>
          <span className="text-faint">· {ACCIONES.map((a) => a.n).join(' · ')}</span>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHead titulo={`Objetivos de ${format(new Date(mesSel + '-01T12:00'), 'MMMM', { locale: es })}`} sub="Main Objectives: el mes se planea por objetivos, no por tareas" icono={<Target size={15} />} />
          <div className="space-y-2 px-5 pb-5">
            {[0, 1, 2].map((i) => (
              <Input
                key={mesId + i}
                defaultValue={((mesDatos.objetivos as string[]) ?? [])[i] ?? ''}
                onBlur={(e) => {
                  const objetivos = [...(((mesDatos.objetivos as string[]) ?? []) as string[]), '', '', ''].slice(0, 3)
                  objetivos[i] = e.target.value
                  guardarWm(mesId, { objetivos })
                }}
                placeholder={['Objetivo principal del mes', 'Segundo objetivo', 'Tercero (si hace falta)'][i]}
              />
            ))}
            <Area
              key={mesId + 'notas'}
              rows={3}
              defaultValue={(mesDatos.notas as string) ?? ''}
              onBlur={(e) => guardarWm(mesId, { notas: e.target.value })}
              placeholder="Notas del mes"
            />
          </div>
        </Card>
        <Card>
          <CardHead titulo={`Las 5 reglas de ${anio}`} sub="Reglas de enfrentamiento: se deciden una vez y no se vuelven a discutir" icono={<Flag size={15} />} />
          <div className="space-y-2 px-5 pb-5">
            {reglas.map((r, i) => (
              <div key={reglasId + i} className="flex items-center gap-2">
                <span className="num w-4 text-xs text-faint">{i + 1}</span>
                <Input
                  defaultValue={r}
                  onBlur={(e) => {
                    const nuevas = [...reglas]
                    nuevas[i] = e.target.value
                    guardarWm(reglasId, { reglas: nuevas })
                  }}
                  placeholder={['Un solo nicho hasta USD 10k/mes', 'La pauta se mira cada mañana; días 0-3 no se toca', 'Una pieza de contenido al día', 'Documento dos veces al día', 'Domingo libre'][i]}
                />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHead titulo="Hitos de Imperium" sub="Se marcan solos con tus datos" icono={<Crown size={15} />} />
          <div className="space-y-3 px-5 pb-5">
            {hitos.map((h) => {
              const ok = h.valor >= h.meta
              return (
                <div key={h.n}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className={cx('font-medium', ok && 'text-green')}>
                      {ok ? '✓ ' : ''}
                      {h.n}
                    </span>
                    <span className="num text-[11px] text-muted">{h.texto}</span>
                  </div>
                  <Barra className="mt-1 h-1.5" valor={h.valor} max={h.meta} color={ok ? 'var(--green)' : 'var(--blue)'} />
                  <div className="mt-0.5 text-[10.5px] text-faint">{h.d}</div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {dia && (
        <Modal abierto onCerrar={() => setDia(null)} titulo={fmt.fecha(dia, "EEEE d 'de' MMMM")}>
          <div className="space-y-2">
            {ACCIONES.map((a) => {
              const hecho = porDia.get(dia)?.has(a.k)
              return (
                <div key={a.k} className={cx('flex items-center gap-3 rounded-xl px-3 py-2.5', hecho ? 'bg-green-soft' : 'bg-surface-2/50')}>
                  <span className={cx('text-lg', hecho ? 'text-green' : 'text-faint')}>{hecho ? '✓' : '·'}</span>
                  <div>
                    <div className="text-sm font-medium">{a.n}</div>
                    <div className="text-[11px] text-muted">{a.d}</div>
                  </div>
                </div>
              )
            })}
            {clientesPorDia.has(dia) && <div className="rounded-xl bg-violet/15 px-3 py-2.5 text-sm text-violet">★ Cliente nuevo este día</div>}
          </div>
        </Modal>
      )}
    </Pagina>
  )
}
