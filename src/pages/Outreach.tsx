import { ClipboardList, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EmbudoVisual, ejeProps, gridProps, TooltipCaja } from '../components/Graficas'
import { diasHabiles, SelectorPeriodo, usePeriodo } from '../components/Periodo'
import { Btn, Campo, Card, CardHead, Check, cx, Input, Kpi, Modal, Num, Pagina, Pill, Select, Tabla, td, th, Vacio } from '../components/ui'
import { RESULTADOS, U } from '../lib/doctrina'
import { diaLocal, fmt, hoyISO } from '../lib/format'
import { format } from 'date-fns'
import { embudoLlamadas, enRango, evaluarU, serieDiaria } from '../lib/metricas'
import { actualizar, insertar, useAjustes, useTabla } from '../lib/store'
import type { Canal, ResultadoLlamada } from '../lib/types'

export default function Outreach() {
  const llamadas = useTabla('llamadas')
  const ajustes = useAjustes()
  const { p, setP, rango } = usePeriodo('30')
  const [carga, setCarga] = useState(false)

  const enPeriodo = useMemo(() => llamadas.filter((l) => enRango(l.fecha, rango)), [llamadas, rango])
  const e = embudoLlamadas(enPeriodo)
  const dh = diasHabiles(rango, ajustes.dias_habiles_semana)

  const serie = useMemo(
    () =>
      serieDiaria(rango, enPeriodo, (l) => l.fecha, (xs) => {
        const m = embudoLlamadas(xs)
        return { marcadas: m.marcadas, decisor: m.decisor, citas: m.citas, abr: m.abr != null ? m.abr * 100 : null }
      }),
    [rango, enPeriodo],
  )

  const porGuion = useMemo(() => {
    const g = new Map<string, typeof enPeriodo>()
    for (const l of enPeriodo) {
      const k = l.guion || 'sin guion'
      if (!g.has(k)) g.set(k, [])
      g.get(k)!.push(l)
    }
    return [...g.entries()].map(([k, xs]) => ({ guion: k, ...embudoLlamadas(xs) }))
  }, [enPeriodo])

  const objeciones = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of enPeriodo) if (l.objecion) m.set(l.objecion.trim().toLowerCase(), (m.get(l.objecion.trim().toLowerCase()) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [enPeriodo])

  const porHora = useMemo(() => {
    const h = Array.from({ length: 24 }, (_, i) => ({ hora: i, marcadas: 0, contestadas: 0 }))
    for (const l of enPeriodo) {
      if (l.nota === 'importado del Excel') continue
      const d = new Date(l.fecha).getHours()
      h[d].marcadas++
      if (!['no_contesto', 'numero_equivocado'].includes(l.resultado)) h[d].contestadas++
    }
    return h.filter((x) => x.marcadas > 0)
  }, [enPeriodo])

  const kpis = [
    { u: U.abr, v: e.abr, n: e.marcadas },
    { u: U.pr, v: e.pr, n: e.marcadas },
    { u: U.cierreCita, v: e.cierreCita, n: e.decisor },
    { u: U.rr, v: e.rr, n: e.conResono },
    { u: U.contactabilidad, v: e.contactabilidad, n: e.marcadas },
    { u: U.bloqueo, v: e.bloqueo, n: e.contestadas },
  ]

  return (
    <Pagina
      titulo="Outreach"
      sub="Las 5 tasas de la llamada en frío y los Big 4, calculadas de cada intento. Reemplaza Cold Call Metrics, el Example Agency Metrics y el tablero de la hoja de Leads."
      acciones={
        <>
          <SelectorPeriodo valor={p} onChange={setP} />
          <Btn onClick={() => setCarga(true)}>
            <Plus size={15} /> Carga rápida
          </Btn>
        </>
      }
    >
      {e.marcadas === 0 ? (
        <Card>
          <Vacio
            icono={<ClipboardList size={20} />}
            titulo="Sin llamadas en este periodo"
            texto="Registra cada intento desde Llamar, o usa Carga rápida para meter llamadas que hiciste por fuera (por ejemplo las de antes de tener la app)."
          />
        </Card>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi grande etiqueta="Marcadas" valor={fmt.n(e.marcadas)} sub={`${fmt.dec(e.marcadas / dh)} por día hábil · meta ${ajustes.meta_llamadas_dia}`} tono={e.marcadas / dh >= ajustes.meta_llamadas_dia ? 'ok' : 'alerta'} />
            <Kpi grande etiqueta="Llegó al doctor" valor={fmt.n(e.decisor)} sub={`${fmt.n(e.portero)} frenadas por el portero`} />
            <Kpi grande etiqueta="Citas agendadas" valor={fmt.n(e.citas)} sub={`${fmt.n(e.noInteresado)} doctores dijeron que no`} />
            <Kpi grande etiqueta="ABR" valor={fmt.pct(e.abr, 2)} tono={evaluarU(e.abr, U.abr, e.marcadas)} muestra={{ n: e.marcadas, requerida: U.abr.muestra }} sub="mín 1% · meta 5%" />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
            <Card>
              <CardHead titulo="El embudo" sub="Cada barra es una etapa; la tasa es contra la etapa anterior" />
              <div className="px-5 pb-5">
                <EmbudoVisual
                  etapas={[
                    { nombre: 'Marcadas', valor: e.marcadas, color: 'var(--faint)' },
                    { nombre: 'Contestaron', valor: e.contestadas, color: 'var(--muted)' },
                    { nombre: 'Llegó al doctor', valor: e.decisor, color: 'var(--violet)' },
                    { nombre: 'Le resonó', valor: e.resonaron, color: 'var(--blue)' },
                    { nombre: 'Agendó cita', valor: e.citas, color: 'var(--green)' },
                  ]}
                />
              </div>
            </Card>
            <Card>
              <CardHead titulo="Las tasas contra la doctrina" sub="Rojo solo donde Charlie fija un mínimo. Donde solo da benchmark, ámbar." />
              <div className="divide-y divide-line px-5 pb-3">
                {kpis.map(({ u, v, n }) => {
                  const t = evaluarU(v, u, n)
                  return (
                    <div key={u.clave} className="flex items-center gap-3 py-2.5" title={u.explica}>
                      <div className="w-12 font-mono text-[11px] text-faint">{u.sigla}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm">{u.nombre}</div>
                        <div className="truncate text-[11px] text-faint">{u.fuente}</div>
                      </div>
                      <div className="num w-16 text-right font-semibold">{fmt.pct(v)}</div>
                      <Pill tono={t} className="w-[104px] justify-center" />
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>

          <Card>
            <CardHead titulo="Día a día" sub="Barras: marcadas y citas · línea: ABR (%)" />
            <div className="h-64 px-2 pb-4">
              <ResponsiveContainer>
                <ComposedChart data={serie} margin={{ left: -10, right: 8 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="dia" {...ejeProps} tickFormatter={(d) => fmt.fecha(d, 'd MMM')} minTickGap={20} />
                  <YAxis yAxisId="n" {...ejeProps} allowDecimals={false} />
                  <YAxis yAxisId="p" orientation="right" {...ejeProps} unit="%" />
                  <Tooltip content={<TooltipCaja formato={(k, v) => (k === 'abr' ? `${fmt.dec(v)}%` : fmt.n(v))} />} cursor={{ fill: 'var(--surface-2)' }} />
                  <Bar yAxisId="n" dataKey="marcadas" name="Marcadas" fill="var(--blue)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar yAxisId="n" dataKey="citas" name="Citas" fill="var(--green)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Line yAxisId="p" dataKey="abr" name="ABR" stroke="var(--amber)" strokeWidth={2} dot={false} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHead titulo="Guion contra guion" sub="Charlie y Hunter se miden por separado — mezclarlos hace que nada mida" />
              <Tabla>
                <thead>
                  <tr>
                    <th className={th}>Guion</th>
                    <th className={th}>Marcadas</th>
                    <th className={th}>PR</th>
                    <th className={th}>Cita/doctor</th>
                    <th className={th}>ABR</th>
                  </tr>
                </thead>
                <tbody>
                  {porGuion.map((g) => (
                    <tr key={g.guion}>
                      <td className={cx(td, 'font-medium first-letter:uppercase')}>{g.guion}</td>
                      <td className={cx(td, 'num')}>{fmt.n(g.marcadas)}</td>
                      <td className={cx(td, 'num')}>{fmt.pct(g.pr)}</td>
                      <td className={cx(td, 'num')}>{fmt.pct(g.cierreCita)}</td>
                      <td className={cx(td, 'num font-semibold')}>{fmt.pct(g.abr, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </Tabla>
            </Card>
            <Card>
              <CardHead titulo="Objeciones más repetidas" sub="Las que anotaste al hablar con el doctor" />
              <div className="space-y-2 px-5 pb-5">
                {objeciones.length === 0 && <div className="text-xs text-faint">Todavía no hay objeciones anotadas.</div>}
                {objeciones.map(([o, n]) => (
                  <div key={o} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate first-letter:uppercase">{o}</span>
                    <span className="num rounded-md bg-surface-2 px-1.5 text-xs font-semibold">{n}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHead titulo="Resultados" sub="Cómo terminó cada intento" />
              <div className="space-y-2 px-5 pb-5">
                {RESULTADOS.map((r) => {
                  const n = enPeriodo.filter((l) => l.resultado === r.clave).length
                  return (
                    <div key={r.clave} className="flex items-center gap-3 text-sm">
                      <span className="w-40 text-muted">{r.nombre}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-blue" style={{ width: `${(n / e.marcadas) * 100}%` }} />
                      </div>
                      <span className="num w-10 text-right font-semibold">{n}</span>
                    </div>
                  )
                })}
              </div>
            </Card>
            <Card>
              <CardHead titulo="A qué hora contestan" sub="Contactabilidad por hora del día (sin lo importado)" />
              <div className="space-y-1.5 px-5 pb-5">
                {porHora.length === 0 && <div className="text-xs text-faint">Se llena a medida que registras desde la app.</div>}
                {porHora.map((h) => (
                  <div key={h.hora} className="flex items-center gap-3 text-xs">
                    <span className="num w-12 text-muted">{h.hora}:00</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-green" style={{ width: `${(h.contestadas / h.marcadas) * 100}%` }} />
                    </div>
                    <span className="num w-20 text-right text-muted">
                      {fmt.pct(h.contestadas / h.marcadas, 0)} de {h.marcadas}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      <Disciplina />
      <CargaRapida abierto={carga} onCerrar={() => setCarga(false)} />
    </Pagina>
  )
}

/** El tracker de 60/90 días: outreach hecho (automático) + consumo, contenido y entrevistas. */
function Disciplina() {
  const dias = useTabla('dias')
  const llamadas = useTabla('llamadas')
  const ajustes = useAjustes()
  const ultimos = useMemo(() => {
    const out: string[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      out.push(format(d, 'yyyy-MM-dd'))
    }
    return out
  }, [])
  const porDia = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of llamadas) m.set(diaLocal(l.fecha), (m.get(diaLocal(l.fecha)) ?? 0) + 1)
    return m
  }, [llamadas])
  const registro = (f: string) => dias.find((d) => d.fecha === f)
  const set = (f: string, c: Partial<(typeof dias)[number]>) => {
    const r = registro(f)
    if (r) actualizar('dias', r.id, c)
    else insertar('dias', { fecha: f, consumo: false, contenido: false, entrevistas: 0, energia: null, nota: '', ...c })
  }
  const hoy = hoyISO()
  return (
    <Card className="mt-5">
      <CardHead titulo="Disciplina diaria" sub="El 60 Day Research y el 90 Day Attack Plan en una fila por día. El outreach se marca solo cuando llegas a la meta." />
      <Tabla>
        <thead>
          <tr>
            <th className={th}>Día</th>
            <th className={th}>Outreach</th>
            <th className={th}>1 h de consumo</th>
            <th className={th}>Contenido</th>
            <th className={th}>Entrevistas</th>
          </tr>
        </thead>
        <tbody>
          {ultimos
            .slice()
            .reverse()
            .map((f) => {
              const r = registro(f)
              const n = porDia.get(f) ?? 0
              return (
                <tr key={f} className={f === hoy ? 'bg-blue-soft/40' : ''}>
                  <td className={cx(td, 'first-letter:uppercase')}>{fmt.fecha(f, 'EEE d MMM')}</td>
                  <td className={td}>
                    <span className={cx('num font-semibold', n >= ajustes.meta_llamadas_dia ? 'text-green' : n > 0 ? 'text-amber' : 'text-faint')}>
                      {n}/{ajustes.meta_llamadas_dia}
                    </span>
                  </td>
                  <td className={td}>
                    <Check checked={!!r?.consumo} onChange={(v) => set(f, { consumo: v })} />
                  </td>
                  <td className={td}>
                    <Check checked={!!r?.contenido} onChange={(v) => set(f, { contenido: v })} />
                  </td>
                  <td className={td}>
                    <Num className="h-8 w-16" value={r?.entrevistas ?? 0} onChange={(v) => set(f, { entrevistas: v ?? 0 })} />
                  </td>
                </tr>
              )
            })}
        </tbody>
      </Tabla>
    </Card>
  )
}

/** Meter llamadas hechas por fuera de la app, en bloque y sin prospecto. */
function CargaRapida({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const ajustes = useAjustes()
  const [fecha, setFecha] = useState(hoyISO())
  const [canal, setCanal] = useState<Canal>('llamada')
  const [guion, setGuion] = useState(ajustes.guion_activo)
  const [n, setN] = useState<Record<string, number | null>>({})
  const total = Object.values(n).reduce<number>((a, b) => a + (b ?? 0), 0)
  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Carga rápida de intentos"
      pie={
        <Btn
          variante="primario"
          disabled={!total}
          onClick={() => {
            const filas = Object.entries(n).flatMap(([res, k]) =>
              Array.from({ length: k ?? 0 }, () => ({
                lead_id: null,
                fecha: `${fecha}T12:00:00.000Z`,
                canal,
                resultado: res as ResultadoLlamada,
                resono: res === 'agendo_cita' ? true : null,
                guion,
                objecion: '',
                nota: 'carga rápida',
              })),
            )
            insertar('llamadas', filas)
            setN({})
            onCerrar()
          }}
        >
          Guardar {total} intentos
        </Btn>
      }
    >
      <p className="mb-4 text-sm text-muted">Para llamadas que hiciste fuera de la app. Cuentan en las métricas, pero no quedan atadas a una clínica.</p>
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Campo etiqueta="Fecha">
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Campo>
        <Campo etiqueta="Canal">
          <Select value={canal} onChange={(e) => setCanal(e.target.value as Canal)}>
            <option value="llamada">Llamada</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="dm">DM</option>
            <option value="visita">Visita</option>
          </Select>
        </Campo>
        <Campo etiqueta="Guion">
          <Select value={guion} onChange={(e) => setGuion(e.target.value)}>
            <option value="charlie">Charlie</option>
            <option value="hunter">Hunter</option>
            <option value="">Sin guion</option>
          </Select>
        </Campo>
      </div>
      <div className="space-y-2">
        {RESULTADOS.map((r) => (
          <div key={r.clave} className="flex items-center justify-between gap-3">
            <span className="text-sm">{r.nombre}</span>
            <Num className="w-24" value={n[r.clave] ?? null} onChange={(v) => setN({ ...n, [r.clave]: v })} min={0} />
          </div>
        ))}
      </div>
    </Modal>
  )
}
