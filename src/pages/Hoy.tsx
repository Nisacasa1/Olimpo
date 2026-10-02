import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowRight, Brain, CalendarClock, Check as CheckIcon, Flame, Moon, PhoneCall, Stethoscope, Sun, Video } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { rangoDe } from '../components/Periodo'
import { Barra, Btn, Card, CardHead, cx, Kpi, Pagina, Pill, tonoClase } from '../components/ui'
import { indexarLlamadas } from '../lib/cola'
import { LTV_MIN_USD, U } from '../lib/doctrina'
import { diaLocal, fmt, hoyISO } from '../lib/format'
import { embudoLlamadas, evaluarU } from '../lib/metricas'
import { useAjustes, useTabla } from '../lib/store'
import { useResumen } from '../lib/useResumen'
import { indiceDelDia, lecturaCompleta, useSemana2 } from '../lib/semana2'

export default function Hoy() {
  const llamadas = useTabla('llamadas')
  const leads = useTabla('leads')
  const reuniones = useTabla('reuniones')
  const ajustes = useAjustes()
  const rango30 = useMemo(() => rangoDe('30'), [])
  const { e: e30, v: v30, l, facturadoMes, d } = useResumen(rango30)
  const hoy = hoyISO()

  const deHoy = useMemo(() => llamadas.filter((x) => diaLocal(x.fecha) === hoy), [llamadas, hoy])
  const eh = embudoLlamadas(deHoy)
  const vencidos = leads.filter((x) => x.estado === 'activo' && x.callback && x.callback < hoy)
  const cbHoy = leads.filter((x) => x.estado === 'activo' && x.callback === hoy)
  const citasHoy = reuniones.filter((r) => r.estado === 'agendada' && diaLocal(r.fecha) === hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))
  const sinResultado = reuniones.filter((r) => r.estado === 'agendada' && r.fecha < new Date().toISOString()).length

  // Racha: días hábiles seguidos llegando a la meta de llamadas
  const racha = useMemo(() => {
    const porDia = new Map<string, number>()
    for (const x of llamadas) porDia.set(diaLocal(x.fecha), (porDia.get(diaLocal(x.fecha)) ?? 0) + 1)
    let n = 0
    const d0 = new Date()
    if ((porDia.get(hoy) ?? 0) < ajustes.meta_llamadas_dia) d0.setDate(d0.getDate() - 1)
    for (let i = 0; i < 365; i++) {
      const dia = d0.getDay()
      const habil = ajustes.dias_habiles_semana >= 7 || (dia !== 0 && (ajustes.dias_habiles_semana >= 6 || dia !== 6))
      const k = format(d0, 'yyyy-MM-dd')
      if (habil) {
        if ((porDia.get(k) ?? 0) >= ajustes.meta_llamadas_dia) n++
        else break
      }
      d0.setDate(d0.getDate() - 1)
    }
    return n
  }, [llamadas, ajustes, hoy])

  const sinLeads = leads.length === 0
  const idx = useMemo(() => indexarLlamadas(llamadas), [llamadas])
  const sinTocar = leads.filter((x) => x.estado === 'activo' && !idx.get(x.id)?.length).length
  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
  const cuello = d.cuello

  return (
    <Pagina titulo={`${saludo}, Nico`} sub={<span><span className="inline-block first-letter:uppercase">{format(new Date(), "EEEE d 'de' MMMM", { locale: es })}</span> · si no hiciste outreach hoy, no alimentaste nada.</span>}>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Outreach de hoy */}
        <Card className="relative overflow-hidden p-6">
          <div className="absolute -top-20 -right-16 size-64 rounded-full bg-blue/10 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Outreach de hoy</div>
              {racha > 0 && (
                <div className="flex items-center gap-1 rounded-full bg-amber-soft px-2.5 py-1 text-xs font-semibold text-amber">
                  <Flame size={13} /> {racha} {racha === 1 ? 'día' : 'días'} en meta
                </div>
              )}
            </div>
            <div className="num mt-3 flex items-baseline gap-3">
              <span className="text-6xl font-semibold tracking-tight">{eh.marcadas}</span>
              <span className="text-lg text-muted">/ {ajustes.meta_llamadas_dia} marcadas</span>
            </div>
            <Barra className="mt-4 h-3" valor={eh.marcadas} max={ajustes.meta_llamadas_dia} color={eh.marcadas >= ajustes.meta_llamadas_dia ? 'var(--green)' : 'var(--blue)'} />
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="num text-2xl font-semibold text-violet">{eh.decisor}</div>
                <div className="text-xs text-muted">doctores</div>
              </div>
              <div>
                <div className="num text-2xl font-semibold text-green">{eh.citas}</div>
                <div className="text-xs text-muted">citas</div>
              </div>
              <div>
                <div className="num text-2xl font-semibold">{fmt.n(Math.max(0, ajustes.meta_llamadas_dia - eh.marcadas))}</div>
                <div className="text-xs text-muted">faltan</div>
              </div>
            </div>
            <Link to="/llamar">
              <Btn variante="primario" className="mt-5 h-12 w-full text-base">
                <PhoneCall size={18} /> {sinLeads ? 'Cargar prospectos y llamar' : `Llamar · ${sinTocar} clínicas sin tocar`}
              </Btn>
            </Link>
          </div>
        </Card>

        {/* Cuello de botella */}
        <Card className={cx('p-6', cuello && tonoClase[cuello.tono].bg)}>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-muted uppercase">
            <Stethoscope size={14} /> Cuello de botella · 30 días
          </div>
          <div className="mt-3 font-serif text-[28px] leading-tight">{d.resumen}</div>
          {cuello && <p className="mt-2 line-clamp-3 text-sm text-muted">{cuello.acciones[0] ? `→ ${cuello.acciones[0]}` : cuello.porque}</p>}
          <Link to="/diagnostico" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-2 hover:underline">
            Ver el árbol completo <ArrowRight size={14} />
          </Link>
        </Card>
      </div>

      <RitualHoy />

      {/* Big 4 */}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi etiqueta="ABR · 30 días" valor={fmt.pct(e30.abr, 2)} tono={evaluarU(e30.abr, U.abr, e30.marcadas)} muestra={{ n: e30.marcadas, requerida: U.abr.muestra }} sub="mín 1% · meta 5%" />
        <Kpi etiqueta="SUR · 30 días" valor={fmt.pct(v30.sur)} tono={evaluarU(v30.sur, U.sur, v30.pasadas)} muestra={{ n: v30.pasadas, requerida: U.sur.muestra }} sub="mín 60%" />
        <Kpi etiqueta="SCR · 30 días" valor={fmt.pct(v30.scr)} tono={evaluarU(v30.scr, U.scr, v30.presentadas)} muestra={{ n: v30.presentadas, requerida: U.scr.muestra }} sub="mín 20%" />
        <Kpi etiqueta={`LTV ${l.tipo}`} valor={fmt.copCorto(l.valor)} tono={l.valor >= LTV_MIN_USD * ajustes.trm ? 'ok' : 'critico'} sub={`mín USD 3.000 ≈ ${fmt.copCorto(LTV_MIN_USD * ajustes.trm)}`} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHead titulo="Callbacks" icono={<CalendarClock size={15} />} sub="Una cita con el portero se respeta" />
          <div className="space-y-2 px-5 pb-5">
            {vencidos.length === 0 && cbHoy.length === 0 && <div className="text-xs text-faint">Nada pendiente.</div>}
            {vencidos.length > 0 && <Pill tono="critico">{vencidos.length} vencidos — se llaman primero</Pill>}
            {[...vencidos, ...cbHoy].slice(0, 6).map((x) => (
              <div key={x.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{x.clinica}</span>
                <span className={cx('shrink-0 text-xs', x.callback! < hoy ? 'text-red' : 'text-amber')}>
                  {fmt.fecha(x.callback)} {x.callback_hora}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead titulo="Videollamadas de hoy" icono={<Video size={15} />} />
          <div className="space-y-2 px-5 pb-5">
            {citasHoy.length === 0 && <div className="text-xs text-faint">Ninguna para hoy.</div>}
            {citasHoy.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium">{r.nombre}</span>
                <span className="text-xs text-muted">{fmt.hora(r.fecha)}</span>
              </div>
            ))}
            {sinResultado > 0 && (
              <Link to="/ventas" className="block pt-1">
                <Pill tono="alerta">{sinResultado} citas pasadas sin resultado</Pill>
              </Link>
            )}
          </div>
        </Card>

        <Card>
          <CardHead titulo="El mes" sub={`meta ${fmt.copCorto(ajustes.meta_mensual)}`} />
          <div className="px-5 pb-5">
            <div className="num text-3xl font-semibold">{fmt.copCorto(facturadoMes)}</div>
            <Barra className="mt-3" valor={facturadoMes} max={ajustes.meta_mensual} color="var(--green)" />
            <div className="mt-2 text-xs text-muted">{fmt.pct(ajustes.meta_mensual ? facturadoMes / ajustes.meta_mensual : 0, 0)} de la meta · ingresos del negocio en Finanzas</div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-xl bg-surface-2/60 p-2">
                <div className="num text-lg font-semibold">{e30.marcadas}</div>
                <div className="text-muted">llamadas · 30 d</div>
              </div>
              <div className="rounded-xl bg-surface-2/60 p-2">
                <div className="num text-lg font-semibold">{e30.citas}</div>
                <div className="text-muted">citas · 30 d</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
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
          {[
            ['lectura_am', 'Mañana', <Sun key="s" size={14} />],
            ['lectura_pm', 'Noche', <Moon key="m" size={14} />],
          ].map(([k, t, i]) => (
            <span key={k as string} className={cx('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', r[k as string] ? 'bg-green-soft text-green' : 'bg-surface-2 text-muted')}>
              {r[k as string] ? <CheckIcon size={13} /> : i}
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
