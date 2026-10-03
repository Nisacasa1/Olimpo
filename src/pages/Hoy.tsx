import { addDays, differenceInCalendarDays, format, parseISO, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowRight, BarChart3, BookOpen, Brain, CalendarCheck, Check as CheckIcon, Clapperboard, ClipboardList, Flame, ListChecks, Megaphone, MessageCircle, Moon, Stethoscope, Sun, Timer, TrendingUp, Video } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardHead, cx, Kpi, Pagina, tonoClase } from '../components/ui'
import { diagnosticarAds, diasEfectivos, faseDelPlan, veredictoPorGasto } from '../lib/ads'
import { PAUTA, U } from '../lib/doctrina'
import { diaLocal, fmt, hoyISO } from '../lib/format'
import { enRango, evaluar, evaluarU, ltv as calcLtv, pauta as calcPauta, rangoUltimos, ventas } from '../lib/metricas'
import { indiceDelDia, lecturaCompleta, useSemana2 } from '../lib/semana2'
import { useAjustes, useTabla } from '../lib/store'
import { useProyeccion } from './Proyeccion'
import { tocaMedir } from '../lib/contenido'
import { revisionPendiente } from './Semana'

interface Tarea {
  id: string
  icono: ReactNode
  titulo: string
  detalle: string
  a: string
  urgente?: boolean
  hecho?: boolean
}

export default function Hoy() {
  const pautaT = useTabla('pauta')
  const anuncios = useTabla('anuncios')
  const reuniones = useTabla('reuniones')
  const clientes = useTabla('clientes')
  const movs = useTabla('movimientos')
  const dias = useTabla('dias')
  const revisiones = useTabla('revisiones')
  const prioridades = useTabla('prioridades')
  const sesiones = useTabla('sesiones')
  const personas = useTabla('personas')
  const piezas = useTabla('piezas')
  const metricas = useTabla('metricas_pieza')
  const ideas = useTabla('ideas')
  const ajustes = useAjustes()
  const s2 = useSemana2()
  const proy = useProyeccion()
  const hoy = hoyISO()
  const ayer = format(subDays(new Date(), 1), 'yyyy-MM-dd')
  const hora = new Date().getHours()

  const r7 = useMemo(() => rangoUltimos(7), [])
  const r30 = useMemo(() => rangoUltimos(30), [])
  const propia = useMemo(() => pautaT.filter((x) => x.cuenta === 'olimpo'), [pautaT])
  const m7 = calcPauta(propia.filter((x) => enRango(x.fecha, r7)))
  const p30 = propia.filter((x) => enRango(x.fecha, r30))
  const m30 = calcPauta(p30)
  const v30 = ventas(reuniones.filter((x) => enRango(x.fecha, r30)))
  const diag = diagnosticarAds(m30, ajustes, calcLtv(clientes, movs, ajustes).valor, diasEfectivos(p30.map((x) => x.fecha), r30))
  const ritual = dias.find((d) => d.fecha === hoy)?.ritual ?? {}

  const citasHoy = reuniones.filter((r) => r.estado === 'agendada' && diaLocal(r.fecha) === hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))
  const citasManana = reuniones.filter((r) => r.estado === 'agendada' && diaLocal(r.fecha) === format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const sinResultado = reuniones.filter((r) => r.estado === 'agendada' && r.fecha < new Date().toISOString())

  // ── El plan del día ──
  const tareas: Tarea[] = []
  const misPrioridades = prioridades.filter((p) => p.fecha === hoy).sort((x, y) => x.orden - y.orden)
  const focoHoy = sesiones.filter((x) => x.fecha === hoy).reduce((a, x) => a + x.minutos, 0)
  if (!misPrioridades.length) tareas.push({ id: 'prioridades', icono: <ListChecks size={16} />, titulo: 'Define tus 3 prioridades de hoy', detalle: 'El inventario de productividad: tres cosas, no diez.', a: '/foco', urgente: hora < 12 })
  else
    misPrioridades.forEach((p, i) => tareas.push({ id: `p-${p.id}`, icono: <span className="num text-xs font-semibold">{i + 1}</span>, titulo: p.texto, detalle: 'Prioridad de hoy · ▶ enfócate en ella desde Foco', a: '/foco', hecho: p.hecha }))
  const pendientesPersonas = personas.filter((x) => x.siguiente_fecha && x.siguiente_fecha <= hoy && x.etapa !== 'cliente' && x.etapa !== 'descartado')
  if (pendientesPersonas.length) tareas.push({ id: 'personas', icono: <MessageCircle size={16} />, titulo: `Responder a ${pendientesPersonas.length} ${pendientesPersonas.length === 1 ? 'persona' : 'personas'} que te escribieron`, detalle: pendientesPersonas.map((x) => x.nombre).join(', '), a: '/contenido', urgente: true })
  const porMedir = piezas.filter((p) => tocaMedir(p, metricas)).length
  if (porMedir) tareas.push({ id: 'medir', icono: <BarChart3 size={16} />, titulo: `Medir ${porMedir} ${porMedir === 1 ? 'pieza' : 'piezas'} (ya pasaron 7 días)`, detalle: 'Una vez, a los 7 días, por plataforma.', a: '/contenido' })
  const listas = ideas.filter((x) => x.etapa === 'listo').length
  if (listas) tareas.push({ id: 'publicar', icono: <Clapperboard size={16} />, titulo: `${listas} ${listas === 1 ? 'pieza lista' : 'piezas listas'} para publicar`, detalle: 'Súbela y suéltala en Publicar.', a: '/contenido' })
  if (hora >= 18 && !dias.find((d) => d.fecha === hoy)?.cierre) tareas.push({ id: 'cierre', icono: <Timer size={16} />, titulo: 'Cerrar el día y elegir las 3 de mañana', detalle: 'Horas, foco, output y cómo mejorar.', a: '/foco' })
  const turno = hora < 15 ? 'lectura_am' : 'lectura_pm'
  if (s2.doctrina)
    tareas.push({
      id: 'lectura',
      icono: hora < 15 ? <Sun size={16} /> : <Moon size={16} />,
      titulo: `Leer tu documento (${hora < 15 ? 'mañana' : 'noche'})`,
      detalle: 'Dos veces al día, en voz alta, con imagen y emoción.',
      a: '/mentalidad',
      hecho: !!ritual[turno],
    })
  const hayPauta = propia.length > 0 || anuncios.some((x) => x.cuenta === 'olimpo')
  if (hayPauta && !propia.some((x) => x.fecha === ayer))
    tareas.push({ id: 'registro', icono: <ClipboardList size={16} />, titulo: 'Registrar la pauta de ayer', detalle: 'Importa el Excel de Meta o llénalo en Registro diario. La hoja se mira cada mañana.', a: '/ads', urgente: true })

  const acciones = anuncios
    .filter((x) => x.cuenta === 'olimpo' && (x.estado === 'activo' || x.estado === 'ganador'))
    .map((x) => {
      const m = calcPauta(propia.filter((f) => f.anuncio_id === x.id))
      return veredictoPorGasto({ gasto: m.gasto, leads: m.leads, citas: m.citas, ctr: m.ctr, dias: faseDelPlan(x.lanzado).dias, K1: ajustes.cpl_objetivo, K2: ajustes.costo_cita_objetivo, trm: ajustes.trm }).accion
    })
  const cortar = acciones.filter((x) => x === 'apagar' || x === 'pausar').length
  const ganadores = acciones.filter((x) => x === 'ganador').length
  if (cortar) tareas.push({ id: 'cortar', icono: <Megaphone size={16} />, titulo: `${cortar} ${cortar === 1 ? 'anuncio' : 'anuncios'} para apagar o pausar`, detalle: 'Lo dice la calculadora por gasto, no la sensación.', a: '/ads', urgente: true })
  if (ganadores) tareas.push({ id: 'escalar', icono: <TrendingUp size={16} />, titulo: `${ganadores} ${ganadores === 1 ? 'ganador' : 'ganadores'} para escalar`, detalle: 'Subir 10-20%, como mucho cada 2-3 días.', a: '/ads' })
  if (sinResultado.length) tareas.push({ id: 'resultado', icono: <Video size={16} />, titulo: `${sinResultado.length} ${sinResultado.length === 1 ? 'cita pasada' : 'citas pasadas'} sin resultado`, detalle: '¿Se presentó? ¿Cerró? Sin esto el SUR y el SCR mienten.', a: '/ventas', urgente: true })
  if (citasManana.length) tareas.push({ id: 'confirmar', icono: <CalendarCheck size={16} />, titulo: `Confirmar ${citasManana.length} ${citasManana.length === 1 ? 'cita' : 'citas'} de mañana`, detalle: 'Recordatorio a la hora correcta: cita en la mañana → la noche anterior.', a: '/ventas' })
  const pendiente = revisionPendiente(revisiones)
  if (pendiente) tareas.push({ id: 'semana', icono: <BookOpen size={16} />, titulo: 'Hacer la revisión semanal', detalle: 'Se armó sola con tus números. Pon la reflexión y una sola prioridad.', a: '/semana' })
  const revision = s2.revision ? differenceInCalendarDays(addDays(parseISO(s2.revision), 90), new Date()) : null
  if (revision != null && revision <= 7) tareas.push({ id: 'revisionado', icono: <Brain size={16} />, titulo: revision < 0 ? 'Re-visionado de las Semanas 1 y 2 vencido' : `Re-visionado en ${revision} días`, detalle: 'Cada 3 meses: vas a olvidar lo que aprendiste si no te lo recuerdas.', a: '/mentalidad', urgente: revision < 0 })
  if (proy.faltante > 0 && proy.diaDelMes > 3) tareas.push({ id: 'proyeccion', icono: <TrendingUp size={16} />, titulo: `Para la meta faltan ${fmt.n(Math.ceil(proy.llamadasFaltan))} llamadas de venta este mes`, detalle: `${fmt.dec(proy.porDia.llamadas)} por día${proy.porDia.gasto != null ? ` · ${fmt.copCorto(proy.porDia.gasto)} de pauta por día` : ''}`, a: '/proyeccion' })
  tareas.sort((x, y) => Number(!!x.hecho) - Number(!!y.hecho) || Number(!!y.urgente) - Number(!!x.urgente))

  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <Pagina
      titulo={`${saludo}, Nico`}
      sub={
        <span>
          <span className="inline-block first-letter:uppercase">{format(new Date(), "EEEE d 'de' MMMM", { locale: es })}</span> · haz, cada día, todo lo que se pueda hacer ese día.
        </span>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHead titulo="El plan de hoy" sub={tareas.length ? `${tareas.filter((t) => t.hecho).length} de ${tareas.length} hechas` : undefined} />
          <div className="space-y-1.5 px-3 pb-3">
            {tareas.length === 0 && <div className="px-2 pb-3 text-sm text-muted">Nada pendiente. Ataca el día como si fueras a lograr la meta mañana.</div>}
            {tareas.map((t) => (
              <Link key={t.id} to={t.a} className={cx('group flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-surface-2', t.hecho && 'opacity-50')}>
                <span className={cx('grid size-8 shrink-0 place-items-center rounded-lg', t.hecho ? 'bg-green-soft text-green' : t.urgente ? 'bg-red-soft text-red' : 'bg-surface-2 text-muted')}>{t.hecho ? <CheckIcon size={16} /> : t.icono}</span>
                <span className="min-w-0 flex-1">
                  <span className={cx('block text-sm font-medium', t.hecho && 'line-through')}>{t.titulo}</span>
                  <span className="block truncate text-[11px] text-faint">{t.detalle}</span>
                </span>
                <ArrowRight size={14} className="text-faint opacity-0 transition group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Link to="/proyeccion" className="block">
            <Card className="p-5 transition hover:border-line-2">
              <div className="flex items-center justify-between text-xs font-semibold tracking-[0.14em] text-muted uppercase">
                <span>El mes</span>
                <span className="normal-case tracking-normal text-faint">
                  día {proy.diaDelMes}/{proy.diasMes}
                </span>
              </div>
              <div className="num mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-semibold">{fmt.copCorto(proy.facturado)}</span>
                <span className="text-sm text-muted">/ {fmt.copCorto(proy.meta)}</span>
              </div>
              <div className="relative mt-3 h-2 rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-blue" style={{ width: `${Math.min(100, proy.avance * 100)}%` }} />
                <div className="absolute -top-1 h-4 w-0.5 bg-violet" style={{ left: `${(proy.diaDelMes / proy.diasMes) * 100}%` }} />
              </div>
              <div className="mt-2 text-xs text-muted">
                A este ritmo: <b className={cx(proy.proyectado >= proy.meta ? 'text-green' : 'text-text')}>{fmt.copCorto(proy.proyectado)}</b>
              </div>
            </Card>
          </Link>
          <Link to="/diagnostico" className="block">
            <Card className={cx('p-5 transition hover:border-line-2', diag.cuello && tonoClase[diag.cuello.tono].bg)}>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-muted uppercase">
                <Stethoscope size={14} /> Cuello de botella · 30 días
              </div>
              <div className="mt-2 font-serif text-2xl leading-tight">{diag.resumen}</div>
            </Card>
          </Link>
        </div>
      </div>

      <RitualHoy />

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Kpi etiqueta="Foco hoy" valor={`${fmt.dec(focoHoy / 60)} h`} sub="la ventana de Imperium: 2 h" tono={focoHoy >= 120 ? 'ok' : 'nada'} />
        <Kpi etiqueta="Pauta · 7 días" valor={fmt.copCorto(m7.gasto)} sub={`${fmt.copCorto(m7.gasto / diasEfectivos(propia.filter((x) => enRango(x.fecha, r7)).map((x) => x.fecha), r7))}/día`} />
        <Kpi etiqueta="Leads · 7 días" valor={fmt.n(m7.leads)} sub={`CPL ${fmt.copCorto(m7.cpl)}`} />
        <Kpi etiqueta="Llamadas · 7 días" valor={fmt.n(m7.citas)} sub={`${fmt.copCorto(m7.cpCita)} c/u`} />
        <Kpi etiqueta="CTR · 30 días" valor={fmt.pct(m30.ctr, 2)} tono={evaluar(m30.ctr, PAUTA.ctr, m30.impresiones, PAUTA.muestras.clics)} />
        <Kpi etiqueta="SUR · 30 días" valor={fmt.pct(v30.sur)} tono={evaluarU(v30.sur, U.sur, v30.pasadas)} muestra={{ n: v30.pasadas, requerida: U.sur.muestra }} />
        <Kpi etiqueta="SCR · 30 días" valor={fmt.pct(v30.scr)} tono={evaluarU(v30.scr, U.scr, v30.presentadas)} muestra={{ n: v30.presentadas, requerida: U.scr.muestra }} />
      </div>

      {citasHoy.length > 0 && (
        <Card className="mt-5">
          <CardHead titulo="Videollamadas de hoy" icono={<Video size={15} />} />
          <div className="space-y-2 px-5 pb-5">
            {citasHoy.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium">{r.nombre}</span>
                <span className="text-xs text-muted">
                  {fmt.hora(r.fecha)} · {r.fuente}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </Pagina>
  )
}

/** La Semana 2 en la pantalla de Hoy: principio del día, lectura mañana/noche y racha. */
function RitualHoy() {
  const s = useSemana2()
  const dias = useTabla('dias')
  const hoy = hoyISO()
  const r = dias.find((d) => d.fecha === hoy)?.ritual ?? {}
  const racha = useMemo(() => {
    const m = new Map(dias.map((d) => [d.fecha, d.ritual]))
    let n = 0
    const d = new Date()
    if (!lecturaCompleta(m.get(hoy))) d.setDate(d.getDate() - 1)
    for (let i = 0; i < 730; i++) {
      if (!lecturaCompleta(m.get(format(d, 'yyyy-MM-dd')))) break
      n++
      d.setDate(d.getDate() - 1)
    }
    return n
  }, [dias, hoy])
  if (!s.doctrina) return null
  const p = s.doctrina.principios[indiceDelDia(s.doctrina.principios.length)]
  const mandatos = s.doctrina.mandatos.filter((m) => m.n !== 10 && r[`m${m.n}`]).length
  return (
    <Link to="/mentalidad" className="mt-5 block">
      <Card className="flex flex-wrap items-center gap-5 p-5 transition hover:border-line-2">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet/15 text-violet">
          <Brain size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Principio del día · {p.modulo}</div>
          <div className="truncate font-serif text-xl">{p.titulo}</div>
        </div>
        <div className="flex items-center gap-2">
          {(
            [
              ['lectura_am', 'Mañana', <Sun key="s" size={14} />],
              ['lectura_pm', 'Noche', <Moon key="m" size={14} />],
            ] as const
          ).map(([k, t, i]) => (
            <span key={k} className={cx('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', r[k] ? 'bg-green-soft text-green' : 'bg-surface-2 text-muted')}>
              {r[k] ? <CheckIcon size={13} /> : i}
              {t}
            </span>
          ))}
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">{mandatos}/9 mandatos</span>
          {racha > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-amber-soft px-2.5 py-1 text-xs font-semibold text-amber">
              <Flame size={13} /> {racha}
            </span>
          )}
        </div>
      </Card>
    </Link>
  )
}
