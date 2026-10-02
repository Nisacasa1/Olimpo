import { Megaphone, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EmbudoVisual, ejeProps, gridProps, TooltipCaja } from '../components/Graficas'
import { SelectorPeriodo, usePeriodo } from '../components/Periodo'
import { Btn, Campo, Card, CardHead, cx, Input, Kpi, Modal, Num, Pagina, Pill, Select, Tabla, td, th, Vacio } from '../components/ui'
import { PAUTA } from '../lib/doctrina'
import { fmt, hoyISO } from '../lib/format'
import { enRango, evaluar, pauta as calcPauta, serieDiaria, type Pauta as P, type Tono } from '../lib/metricas'
import { borrar, insertar, useAjustes, useTabla } from '../lib/store'
import type { PautaDia } from '../lib/types'

const CAMPOS: { k: keyof PautaDia; n: string; ayuda?: string }[] = [
  { k: 'gasto', n: 'Gasto' },
  { k: 'impresiones', n: 'Impresiones' },
  { k: 'alcance', n: 'Alcance' },
  { k: 'clics', n: 'Clics (enlace)' },
  { k: 'leads', n: 'Leads', ayuda: 'opt-ins / formularios' },
  { k: 'citas', n: 'Citas agendadas', ayuda: 'en una clínica = pacientes agendados' },
  { k: 'presentados', n: 'Se presentaron' },
  { k: 'cierres', n: 'Cierres' },
  { k: 'cash', n: 'Cash cobrado' },
  { k: 'valor', n: 'Valor (LTV)', ayuda: 'de los cierres del día' },
]

export default function Pauta() {
  const filas = useTabla('pauta')
  const clientes = useTabla('clientes')
  const ajustes = useAjustes()
  const [cuenta, setCuenta] = useState('olimpo')
  const { p, setP, rango } = usePeriodo('30')
  const [nuevo, setNuevo] = useState(false)

  const cuentas = [{ id: 'olimpo', nombre: `${ajustes.agencia} (propia)` }, ...clientes.map((c) => ({ id: c.id, nombre: c.nombre }))]
  const deCuenta = useMemo(() => filas.filter((f) => f.cuenta === cuenta), [filas, cuenta])
  const enPeriodo = useMemo(() => deCuenta.filter((f) => enRango(f.fecha, rango)), [deCuenta, rango])
  const m = calcPauta(enPeriodo)
  const esCliente = cuenta !== 'olimpo'

  const serie = useMemo(
    () =>
      serieDiaria(rango, enPeriodo, (f) => f.fecha, (xs) => {
        const x = calcPauta(xs)
        return { gasto: x.gasto, leads: x.leads, citas: x.citas, cpl: x.cpl }
      }),
    [rango, enPeriodo],
  )

  return (
    <Pagina
      titulo="Pauta"
      sub="Una fila por día y por cuenta. Todas las columnas derivadas del Ads & Funnel Tracking Sheet se calculan solas. Más adelante, Meta las llena automáticamente."
      acciones={
        <>
          <Select value={cuenta} onChange={(e) => setCuenta(e.target.value)} className="w-56">
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
          <SelectorPeriodo valor={p} onChange={setP} sinHoy />
          <Btn variante="primario" onClick={() => setNuevo(true)}>
            <Plus size={15} /> Día
          </Btn>
        </>
      }
    >
      {enPeriodo.length === 0 ? (
        <Card>
          <Vacio
            icono={<Megaphone size={20} />}
            titulo="Sin datos de pauta en este periodo"
            texto={
              esCliente
                ? 'Registra el día con gasto, leads y pacientes agendados. Los pacientes agendados alimentan el cobro de la semana en Clientes.'
                : 'Tu propia pauta, la del Paid Ads System. Compuerta: 5 clientes con resultado + USD 3.000 antes de prenderla.'
            }
            accion={
              <Btn variante="primario" onClick={() => setNuevo(true)}>
                <Plus size={15} /> Registrar un día
              </Btn>
            }
          />
        </Card>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            <Kpi etiqueta="Gasto" valor={fmt.copCorto(m.gasto)} />
            <Kpi etiqueta="CTR" valor={fmt.pct(m.ctr, 2)} tono={evaluar(m.ctr, PAUTA.ctr, m.impresiones, PAUTA.muestras.clics)} muestra={{ n: m.impresiones, requerida: PAUTA.muestras.clics }} />
            <Kpi etiqueta="CPL" valor={fmt.copCorto(m.cpl)} tono={costoTono(m.cpl, ajustes.cpl_objetivo, m.clics, PAUTA.muestras.cpl)} sub={ajustes.cpl_objetivo ? `objetivo ${fmt.copCorto(ajustes.cpl_objetivo)}` : 'define el objetivo en Ajustes'} />
            <Kpi etiqueta={esCliente ? 'Costo por paciente' : 'Costo por cita'} valor={fmt.copCorto(m.cpCita)} tono={costoTono(m.cpCita, ajustes.costo_cita_objetivo, m.leads, PAUTA.muestras.costoCita)} />
            <Kpi etiqueta="Presentación" valor={fmt.pct(m.sur)} tono={evaluar(m.sur, PAUTA.sur, m.citas, PAUTA.muestras.sur)} muestra={{ n: m.citas, requerida: PAUTA.muestras.sur }} />
            <Kpi etiqueta="ROI cash" valor={fmt.pct(m.roiCash, 0)} tono={m.roiCash == null ? 'nada' : m.roiCash >= 1 ? 'ok' : m.roiCash >= 0 ? 'alerta' : 'critico'} sub="filtro ROI 2:1 = 100%" />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <Card>
              <CardHead titulo="Embudo de la pauta" />
              <div className="px-5 pb-5">
                <EmbudoVisual
                  etapas={[
                    { nombre: 'Clics', valor: m.clics, color: 'var(--faint)' },
                    { nombre: 'Leads', valor: m.leads, color: 'var(--blue)' },
                    { nombre: esCliente ? 'Pacientes agendados' : 'Citas', valor: m.citas, color: 'var(--violet)' },
                    { nombre: 'Se presentaron', valor: m.presentados, color: 'var(--amber)' },
                    { nombre: 'Cierres', valor: m.cierres, color: 'var(--green)' },
                  ]}
                />
              </div>
            </Card>
            <EscaleraPauta m={m} cplObj={ajustes.cpl_objetivo} citaObj={ajustes.costo_cita_objetivo} />
          </div>

          <Card>
            <CardHead titulo="Gasto y resultados por día" />
            <div className="h-60 px-2 pb-4">
              <ResponsiveContainer>
                <ComposedChart data={serie} margin={{ left: -4, right: 8 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="dia" {...ejeProps} tickFormatter={(d) => fmt.fecha(d, 'd MMM')} minTickGap={20} />
                  <YAxis yAxisId="g" {...ejeProps} tickFormatter={(v) => fmt.copCorto(v)} />
                  <YAxis yAxisId="n" orientation="right" {...ejeProps} allowDecimals={false} />
                  <Tooltip content={<TooltipCaja formato={(k, v) => (k === 'gasto' || k === 'cpl' ? fmt.cop(v) : fmt.n(v))} />} cursor={{ fill: 'var(--surface-2)' }} />
                  <Bar yAxisId="g" dataKey="gasto" name="Gasto" fill="var(--blue)" radius={[4, 4, 0, 0]} maxBarSize={20} />
                  <Line yAxisId="n" dataKey="leads" name="Leads" stroke="var(--violet)" strokeWidth={2} dot={false} />
                  <Line yAxisId="n" dataKey="citas" name="Citas" stroke="var(--green)" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHead titulo="La hoja" sub="Lo que antes eran 28 columnas con fórmulas" />
            <Tabla className="max-h-[60vh]">
              <thead>
                <tr>
                  {['Fecha', 'Gasto', 'Impr', 'CPM', 'Clics', 'CTR', 'CPC', 'Leads', 'LP%', 'CPL', 'Citas', 'HCR', 'Costo cita', 'Show', 'SUR', 'Cierres', 'Cierre', 'CPA', 'Cash', 'ROI', ''].map((h) => (
                    <th key={h} className={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enPeriodo
                  .slice()
                  .sort((a, b) => b.fecha.localeCompare(a.fecha))
                  .map((f) => {
                    const x = calcPauta([f])
                    return (
                      <tr key={f.id} className="group hover:bg-surface-2/50">
                        <td className={td}>
                          {fmt.fecha(f.fecha)} {f.origen === 'meta' && <span className="text-[10px] text-blue-2">meta</span>}
                        </td>
                        <td className={cx(td, 'num')}>{fmt.copCorto(f.gasto)}</td>
                        <td className={cx(td, 'num text-muted')}>{fmt.n(f.impresiones)}</td>
                        <td className={cx(td, 'num text-muted')}>{fmt.copCorto(x.cpm)}</td>
                        <td className={cx(td, 'num')}>{fmt.n(f.clics)}</td>
                        <td className={cx(td, 'num text-muted')}>{fmt.pct(x.ctr, 2)}</td>
                        <td className={cx(td, 'num text-muted')}>{fmt.copCorto(x.cpc)}</td>
                        <td className={cx(td, 'num')}>{fmt.n(f.leads)}</td>
                        <td className={cx(td, 'num text-muted')}>{fmt.pct(x.lp)}</td>
                        <td className={cx(td, 'num')}>{fmt.copCorto(x.cpl)}</td>
                        <td className={cx(td, 'num')}>{fmt.n(f.citas)}</td>
                        <td className={cx(td, 'num text-muted')}>{fmt.pct(x.hcr)}</td>
                        <td className={cx(td, 'num')}>{fmt.copCorto(x.cpCita)}</td>
                        <td className={cx(td, 'num')}>{fmt.n(f.presentados)}</td>
                        <td className={cx(td, 'num text-muted')}>{fmt.pct(x.sur)}</td>
                        <td className={cx(td, 'num')}>{fmt.n(f.cierres)}</td>
                        <td className={cx(td, 'num text-muted')}>{fmt.pct(x.cierre)}</td>
                        <td className={cx(td, 'num')}>{fmt.copCorto(x.cpa)}</td>
                        <td className={cx(td, 'num')}>{fmt.copCorto(f.cash)}</td>
                        <td className={cx(td, 'num font-semibold')}>{fmt.pct(x.roiCash, 0)}</td>
                        <td className={td}>
                          <button onClick={() => borrar('pauta', f.id)} className="text-faint opacity-0 group-hover:opacity-100 hover:text-red">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </Tabla>
          </Card>
        </div>
      )}

      <NuevoDia abierto={nuevo} cuenta={cuenta} onCerrar={() => setNuevo(false)} />
    </Pagina>
  )
}

function costoTono(v: number | null, objetivo: number, n: number, muestra: number): Tono {
  if (v == null || !objetivo) return 'nada'
  if (n < muestra) return 'muestra'
  return v <= objetivo ? 'ok' : v <= objetivo * 1.5 ? 'alerta' : 'critico'
}

/** La escalera de 15 escalones, en la parte que se puede leer de los números. */
function EscaleraPauta({ m, cplObj, citaObj }: { m: P; cplObj: number; citaObj: number }) {
  const pasos: { n: string; tono: Tono; texto: string }[] = []
  const s = PAUTA.muestras
  if (m.impresiones === 0) pasos.push({ n: '2', tono: 'critico', texto: 'Cero impresiones: revisa aprobación, presupuesto ≥ USD 10/día, ubicaciones y objetivo. Si todo está bien, borrar y relanzar.' })
  else if (m.impresiones >= s.clics && m.clics === 0) pasos.push({ n: '4', tono: 'critico', texto: '1.000+ impresiones y cero clics: Facebook cortó el tráfico. Si se repite, problema de mensaje y audiencia → ángulos nuevos.' })
  else pasos.push({ n: '6-9', tono: evaluar(m.ctr, PAUTA.ctr, m.impresiones, s.clics), texto: `CTR ${fmt.pct(m.ctr, 2)}. CPC, CTR, relevancia y CPM se leen juntos: si el CPC está bien, lo demás «puede estar bien».` })
  pasos.push({
    n: '10',
    tono: m.clics < s.cpl ? 'muestra' : costoTono(m.cpl, cplObj, m.clics, s.cpl),
    texto: m.clics < s.cpl ? `CPL: faltan ${s.cpl - m.clics} clics para juzgarlo.` : `CPL ${fmt.copCorto(m.cpl)}. CPC bien y CPL mal → la página: desconexión de mensaje, look y feel.`,
  })
  pasos.push({
    n: '11',
    tono: m.leads < s.costoCita ? 'muestra' : costoTono(m.cpCita, citaObj, m.leads, s.costoCita),
    texto: m.leads < s.costoCita ? `Costo por cita: faltan ${s.costoCita - m.leads} leads.` : `Costo por cita ${fmt.copCorto(m.cpCita)}. Si está mal: el primer mensaje de HighLevel — ¿llega? ¿es coherente con el anuncio?`,
  })
  pasos.push({
    n: '12',
    tono: evaluar(m.sur, PAUTA.sur, m.citas, s.sur),
    texto: m.citas < s.sur ? `Presentación: faltan ${s.sur - m.citas} citas.` : `Presentación ${fmt.pct(m.sur)}. ¿Hay recordatorio? ¿a la hora correcta? (mañana → la noche anterior)`,
  })
  pasos.push({
    n: '13',
    tono: evaluar(m.cierre, PAUTA.cierre, m.presentados, s.cierre),
    texto: m.presentados < s.cierre ? `Cierre: faltan ${s.cierre - m.presentados} citas hechas.` : `Cierre ${fmt.pct(m.cierre)}. Práctica con el guion y notas de cada cita.`,
  })
  pasos.push({
    n: '15',
    tono: m.roiCash == null ? 'nada' : m.roiCash >= 1 ? 'ok' : 'alerta',
    texto: 'ROI con todo lo demás en KPI: precio mal puesto o mercado hipercompetitivo → diferenciar la oferta.',
  })
  return (
    <Card>
      <CardHead titulo="Diagnóstico de pauta por KPI" sub="La escalera de 15 escalones, con sus muestras mínimas · 4 días sin tocar nada antes de juzgar" />
      <div className="space-y-2.5 px-5 pb-5">
        {pasos.map((x) => (
          <div key={x.n} className="flex gap-3">
            <span className="mt-0.5 w-9 shrink-0 font-mono text-[11px] text-faint">#{x.n}</span>
            <div className="min-w-0 flex-1 text-sm text-muted">{x.texto}</div>
            <Pill tono={x.tono} className="h-fit shrink-0" />
          </div>
        ))}
      </div>
    </Card>
  )
}

function NuevoDia({ abierto, cuenta, onCerrar }: { abierto: boolean; cuenta: string; onCerrar: () => void }) {
  const [f, setF] = useState<Partial<PautaDia>>({ fecha: hoyISO() })
  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Registrar un día de pauta"
      pie={
        <Btn
          variante="primario"
          onClick={() => {
            const fila: Partial<PautaDia> = { cuenta, origen: 'manual', nota: '', fecha: f.fecha ?? hoyISO() }
            for (const c of CAMPOS) (fila as Record<string, unknown>)[c.k] = Number(f[c.k] ?? 0)
            insertar('pauta', fila)
            setF({ fecha: hoyISO() })
            onCerrar()
          }}
        >
          Guardar
        </Btn>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Fecha" className="col-span-2">
          <Input type="date" value={f.fecha ?? ''} onChange={(e) => setF({ ...f, fecha: e.target.value })} />
        </Campo>
        {CAMPOS.map((c) => (
          <Campo key={c.k} etiqueta={c.n} ayuda={c.ayuda}>
            <Num value={(f[c.k] as number) ?? null} onChange={(n) => setF({ ...f, [c.k]: n })} />
          </Campo>
        ))}
      </div>
    </Modal>
  )
}
