import { addWeeks, endOfISOWeek, format, getISOWeek, getISOWeekYear, startOfISOWeek, subWeeks } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Area, Btn, Campo, Card, CardHead, cx, Pagina, Pill, tonoClase } from '../components/ui'
import { diagnosticarAds } from '../lib/ads'
import { fmt } from '../lib/format'
import { enRango, ltv as calcLtv, pauta as calcPauta, ventas, type Rango } from '../lib/metricas'
import { actualizar, avisar, insertar, useAjustes, useTabla } from '../lib/store'
import { lecturaCompleta, useSemana2 } from '../lib/semana2'
import type { Revision } from '../lib/types'
import { useProyeccion } from './Proyeccion'

export const claveSemana = (d: Date) => `${getISOWeekYear(d)}-W${String(getISOWeek(d)).padStart(2, '0')}`

/** ¿Toca hacer la revisión? Viernes a domingo de esta semana, o lunes si la anterior quedó abierta. */
export function revisionPendiente(revisiones: Revision[], hoy = new Date()) {
  const dia = hoy.getDay() // 0 domingo
  const cerrada = (d: Date) => revisiones.some((r) => r.semana === claveSemana(d) && r.cerrada)
  if (dia === 5 || dia === 6 || dia === 0) return cerrada(hoy) ? null : claveSemana(hoy)
  if (dia === 1 && !cerrada(subWeeks(hoy, 1))) return claveSemana(subWeeks(hoy, 1))
  return null
}

function delta(a: number | null, b: number | null, menosEsMejor = false) {
  if (a == null || b == null || b === 0) return null
  const d = (a - b) / Math.abs(b)
  const bueno = menosEsMejor ? d < 0 : d > 0
  return { texto: `${d >= 0 ? '+' : ''}${fmt.pct(d, 0)}`, clase: Math.abs(d) < 0.02 ? 'text-faint' : bueno ? 'text-green' : 'text-red' }
}

export default function Semana() {
  const [base, setBase] = useState(() => {
    const p = revisionPendiente([], new Date())
    return p && new Date().getDay() === 1 ? subWeeks(new Date(), 1) : new Date()
  })
  const rango: Rango = useMemo(() => ({ desde: startOfISOWeek(base), hasta: endOfISOWeek(base) }), [base])
  const anterior: Rango = useMemo(() => ({ desde: startOfISOWeek(subWeeks(base, 1)), hasta: endOfISOWeek(subWeeks(base, 1)) }), [base])
  const clave = claveSemana(base)

  const pautaT = useTabla('pauta')
  const reuniones = useTabla('reuniones')
  const movs = useTabla('movimientos')
  const dias = useTabla('dias')
  const banco = useTabla('banco')
  const clientes = useTabla('clientes')
  const revisiones = useTabla('revisiones')
  const ajustes = useAjustes()
  const s2 = useSemana2()
  const proy = useProyeccion()

  const propia = pautaT.filter((x) => x.cuenta === 'olimpo')
  const p = calcPauta(propia.filter((x) => enRango(x.fecha, rango)))
  const pa = calcPauta(propia.filter((x) => enRango(x.fecha, anterior)))
  const v = ventas(reuniones.filter((r) => enRango(r.fecha, rango)))
  const va = ventas(reuniones.filter((r) => enRango(r.fecha, anterior)))
  const sum = (r: Rango, t: 'ingreso' | 'gasto') => movs.filter((m) => m.tipo === t && m.ambito === 'negocio' && enRango(m.fecha, r)).reduce((a, m) => a + m.monto, 0)
  const ing = sum(rango, 'ingreso'),
    gas = sum(rango, 'gasto'),
    inga = sum(anterior, 'ingreso')

  const diasSemana = dias.filter((d) => enRango(d.fecha, rango))
  const lecturas = diasSemana.filter((d) => lecturaCompleta(d.ritual)).length
  const mandatos = diasSemana.length ? diasSemana.reduce((a, d) => a + Array.from({ length: 9 }, (_, i) => (d.ritual?.[`m${i + 1}`] ? 1 : 0)).reduce((x: number, y: number) => x + y, 0), 0) / 7 : 0
  const movBanco = banco.filter((b) => enRango(b.fecha, rango))
  const saldo = movBanco.reduce((a, m) => a + (m.tipo === 'enfrente' ? 1 : -2), 0)
  const resist = (() => {
    const m = new Map<string, number>()
    movBanco.filter((b) => b.tipo === 'evite' && b.forma).forEach((b) => m.set(b.forma, (m.get(b.forma) ?? 0) + 1))
    const top = [...m.entries()].sort((a, b) => b[1] - a[1])[0]
    return top ? `${s2.doctrina?.formas.find((f) => f.clave === top[0])?.nombre ?? top[0]} (${top[1]})` : '—'
  })()
  const diag = diagnosticarAds(p, ajustes, calcLtv(clientes, movs, ajustes).valor, 7)

  const actual = revisiones.find((r) => r.semana === clave)
  const [f, setF] = useState<Partial<Revision>>({})
  const valor = (k: keyof Revision) => (f[k] as string) ?? (actual?.[k] as string) ?? ''
  const guardar = (cerrar: boolean) => {
    const datos = { semana: clave, funciono: valor('funciono'), no_funciono: valor('no_funciono'), prioridad: valor('prioridad'), aprendizaje: valor('aprendizaje'), cerrada: cerrar || !!actual?.cerrada }
    if (actual) actualizar('revisiones', actual.id, datos)
    else insertar('revisiones', datos)
    setF({})
    avisar(cerrar ? 'Revisión cerrada. Nos vemos el viernes.' : 'Guardado', 'ok')
  }

  const Fila = ({ k, v, d }: { k: string; v: string; d?: ReturnType<typeof delta> }) => (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted">{k}</span>
      <span className="flex items-baseline gap-2">
        <b className="num">{v}</b>
        {d && <span className={cx('num text-[11px]', d.clase)}>{d.texto}</span>}
      </span>
    </div>
  )

  return (
    <Pagina
      titulo="Revisión semanal"
      sub="Se arma sola con lo que registraste. Tú pones la reflexión: qué funcionó, qué no y la única prioridad de la semana que viene."
      acciones={
        <div className="flex items-center gap-1">
          <Btn chico variante="fantasma" onClick={() => setBase(subWeeks(base, 1))}>
            <ChevronLeft size={16} />
          </Btn>
          <div className="min-w-48 text-center text-sm font-semibold">
            {format(rango.desde, "d 'de' MMM", { locale: es })} – {format(rango.hasta, "d 'de' MMM", { locale: es })}
          </div>
          <Btn chico variante="fantasma" onClick={() => setBase(addWeeks(base, 1))} disabled={rango.hasta > new Date()}>
            <ChevronRight size={16} />
          </Btn>
        </div>
      }
    >
      <Card className={cx('mb-5 p-5', diag.cuello && tonoClase[diag.cuello.tono].bg)}>
        <div className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">La semana en una línea</div>
        <div className="mt-1 font-serif text-2xl leading-snug">
          {fmt.copCorto(p.gasto)} en pauta → {p.leads} leads → {p.citas} llamadas → {v.ganadas} {v.ganadas === 1 ? 'cliente' : 'clientes'}. {diag.resumen}
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHead titulo="Pauta" sub="contra la semana anterior" />
          <div className="divide-y divide-line px-5 pb-4">
            <Fila k="Gasto" v={fmt.copCorto(p.gasto)} d={delta(p.gasto, pa.gasto)} />
            <Fila k="Leads" v={fmt.n(p.leads)} d={delta(p.leads, pa.leads)} />
            <Fila k="Llamadas agendadas" v={fmt.n(p.citas)} d={delta(p.citas, pa.citas)} />
            <Fila k="CPL" v={fmt.copCorto(p.cpl)} d={delta(p.cpl, pa.cpl, true)} />
            <Fila k="Costo por llamada" v={fmt.copCorto(p.cpCita)} d={delta(p.cpCita, pa.cpCita, true)} />
            <Fila k="CTR" v={fmt.pct(p.ctr, 2)} d={delta(p.ctr, pa.ctr)} />
          </div>
        </Card>
        <Card>
          <CardHead titulo="Ventas" />
          <div className="divide-y divide-line px-5 pb-4">
            <Fila k="Llamadas de venta" v={fmt.n(v.agendadas)} d={delta(v.agendadas, va.agendadas)} />
            <Fila k="Se presentaron" v={fmt.pct(v.sur)} />
            <Fila k="Cierre" v={fmt.pct(v.scr)} />
            <Fila k="Clientes nuevos" v={fmt.n(v.ganadas)} d={delta(v.ganadas, va.ganadas)} />
            <Fila k="Monto cerrado" v={fmt.copCorto(v.facturado)} />
          </div>
        </Card>
        <Card>
          <CardHead titulo="Plata" />
          <div className="divide-y divide-line px-5 pb-4">
            <Fila k="Ingresos" v={fmt.copCorto(ing)} d={delta(ing, inga)} />
            <Fila k="Gastos" v={fmt.copCorto(gas)} />
            <Fila k="Neto" v={fmt.copCorto(ing - gas)} />
            <Fila k="Proyección del mes" v={fmt.copCorto(proy.proyectado)} />
            <Fila k="Meta" v={fmt.copCorto(proy.meta)} />
          </div>
        </Card>
        <Card>
          <CardHead titulo="Mentalidad" />
          <div className="divide-y divide-line px-5 pb-4">
            <Fila k="Días con lectura 2/2" v={`${lecturas}/7`} />
            <Fila k="Mandatos por día" v={`${fmt.dec(mandatos)}/9`} />
            <Fila k="Banco de Sufrimiento" v={`${saldo >= 0 ? '+' : ''}${saldo}`} />
            <Fila k="La que más te ganó" v={resist} />
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHead
          titulo="Tu reflexión"
          sub={actual?.cerrada ? 'Revisión cerrada' : 'Escríbela y ciérrala. Una sola prioridad: si son tres, no es ninguna.'}
          accion={actual?.cerrada ? <Pill tono="ok">Cerrada</Pill> : undefined}
        />
        <div className="grid gap-4 px-5 pb-5 md:grid-cols-2">
          <Campo etiqueta="¿Qué funcionó?">
            <Area value={valor('funciono')} onChange={(e) => setF({ ...f, funciono: e.target.value })} />
          </Campo>
          <Campo etiqueta="¿Qué no funcionó, y por qué? (sin culpar a nada externo)">
            <Area value={valor('no_funciono')} onChange={(e) => setF({ ...f, no_funciono: e.target.value })} />
          </Campo>
          <Campo etiqueta="La única prioridad de la semana que viene">
            <Area value={valor('prioridad')} onChange={(e) => setF({ ...f, prioridad: e.target.value })} placeholder={diag.cuello ? `Sugerencia: ${diag.cuello.acciones[0] ?? diag.cuello.metrica}` : ''} />
          </Campo>
          <Campo etiqueta="¿Qué aprendí? (para el documento o la bóveda)">
            <Area value={valor('aprendizaje')} onChange={(e) => setF({ ...f, aprendizaje: e.target.value })} />
          </Campo>
          <div className="flex justify-end gap-2 md:col-span-2">
            <Btn onClick={() => guardar(false)}>Guardar</Btn>
            <Btn variante="primario" onClick={() => guardar(true)}>
              <CheckCircle2 size={15} /> Cerrar la revisión
            </Btn>
          </div>
        </div>
      </Card>

      {revisiones.filter((r) => r.semana !== clave && r.prioridad).length > 0 && (
        <Card className="mt-5">
          <CardHead titulo="Prioridades de semanas anteriores" />
          <div className="space-y-2 px-5 pb-5 text-sm">
            {revisiones
              .filter((r) => r.semana !== clave && r.prioridad)
              .sort((a, b) => b.semana.localeCompare(a.semana))
              .slice(0, 6)
              .map((r) => (
                <div key={r.id} className="flex gap-3">
                  <span className="w-20 shrink-0 font-mono text-xs text-faint">{r.semana}</span>
                  <span className="text-muted">{r.prioridad}</span>
                </div>
              ))}
          </div>
        </Card>
      )}
    </Pagina>
  )
}
