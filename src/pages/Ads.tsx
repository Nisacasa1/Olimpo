import { FileSpreadsheet, Megaphone, Plus, Save, Trash2, Upload, Wand2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EmbudoVisual, ejeProps, gridProps, TooltipCaja } from '../components/Graficas'
import { SelectorPeriodo, usePeriodo } from '../components/Periodo'
import { Area, Badge, Btn, Campo, Card, CardHead, cx, Input, Kpi, Modal, Num, Pagina, Pill, Segmento, Select, Tabla, td, th, tonoClase, Vacio } from '../components/ui'
import { ACCION, diagnosticarAds, diasEfectivos, faseDelPlan, veredictoPorGasto } from '../lib/ads'
import { PAUTA } from '../lib/doctrina'
import { fmt, hoyISO } from '../lib/format'
import { leerMeta, planDeImportacion, type PreviaMeta } from '../lib/importarMeta'
import { enRango, evaluar, ltv as calcLtv, pauta as calcPauta, serieDiaria, type Tono } from '../lib/metricas'
import { actualizar, avisar, borrar, insertar, useAjustes, useTabla } from '../lib/store'
import type { Anuncio, EstadoAnuncio, PautaDia } from '../lib/types'

type Tab = 'resumen' | 'anuncios' | 'registro' | 'ganchos'

const ESTADO: Record<EstadoAnuncio, { t: string; c: string }> = {
  activo: { t: 'Activo', c: 'text-green bg-green-soft' },
  ganador: { t: 'Ganador', c: 'text-violet bg-violet/15' },
  pausado: { t: 'Pausado', c: 'text-amber bg-amber-soft' },
  apagado: { t: 'Apagado', c: 'text-muted bg-surface-2' },
}

const costoTono = (v: number | null, objetivo: number, n: number, muestra: number): Tono => {
  if (v == null || !objetivo) return 'nada'
  if (n < muestra) return 'muestra'
  return v <= objetivo ? 'ok' : v <= objetivo * 1.5 ? 'alerta' : 'critico'
}

export default function Ads() {
  const clientes = useTabla('clientes')
  const ajustes = useAjustes()
  const [cuenta, setCuenta] = useState('olimpo')
  const [tab, setTab] = useState<Tab>('resumen')
  const [importar, setImportar] = useState(false)
  const cuentas = [{ id: 'olimpo', nombre: `${ajustes.agencia} (propia)` }, ...clientes.map((c) => ({ id: c.id, nombre: c.nombre }))]

  return (
    <Pagina
      titulo="Ads"
      sub="La pauta como método de adquisición, con el Paid Ads System: una variable por test, el plan de 30 días y la calculadora por gasto. Se decide con los números, no con la sensación."
      acciones={
        <>
          <Select value={cuenta} onChange={(e) => setCuenta(e.target.value)} className="w-56">
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
          <Btn onClick={() => setImportar(true)}>
            <Upload size={15} /> Importar de Meta
          </Btn>
        </>
      }
    >
      <Segmento
        valor={tab}
        onChange={setTab}
        className="mb-5 max-w-full overflow-x-auto"
        opciones={[
          { valor: 'resumen', etiqueta: 'Resumen' },
          { valor: 'anuncios', etiqueta: 'Anuncios' },
          { valor: 'registro', etiqueta: 'Registro diario' },
          { valor: 'ganchos', etiqueta: 'Ganchos y audiencias' },
        ]}
      />
      {tab === 'resumen' && <Resumen cuenta={cuenta} />}
      {tab === 'anuncios' && <Anuncios cuenta={cuenta} />}
      {tab === 'registro' && <Registro cuenta={cuenta} />}
      {tab === 'ganchos' && <Ganchos cuenta={cuenta} />}
      <ImportarMeta abierto={importar} cuenta={cuenta} onCerrar={() => setImportar(false)} />
    </Pagina>
  )
}

// ── Resumen ───────────────────────────────────────────────────────────

function Resumen({ cuenta }: { cuenta: string }) {
  const filas = useTabla('pauta')
  const clientes = useTabla('clientes')
  const movs = useTabla('movimientos')
  const ajustes = useAjustes()
  const { p, setP, rango } = usePeriodo('30')
  const enPeriodo = useMemo(() => filas.filter((f) => f.cuenta === cuenta && enRango(f.fecha, rango)), [filas, cuenta, rango])
  const m = calcPauta(enPeriodo)
  const esCliente = cuenta !== 'olimpo'
  const dias = diasEfectivos(enPeriodo.map((x) => x.fecha), rango)
  const d = diagnosticarAds(m, ajustes, calcLtv(clientes, movs, ajustes).valor, dias)

  const serie = useMemo(
    () =>
      serieDiaria(rango, enPeriodo, (f) => f.fecha, (xs) => {
        const x = calcPauta(xs)
        return { gasto: x.gasto, leads: x.leads, citas: x.citas }
      }),
    [rango, enPeriodo],
  )

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <SelectorPeriodo valor={p} onChange={setP} sinHoy />
      </div>
      {enPeriodo.length === 0 ? (
        <Card>
          <Vacio
            icono={<Megaphone size={20} />}
            titulo="Sin datos de pauta en este periodo"
            texto={
              esCliente
                ? 'Registra el día o importa el Excel de Meta. Los pacientes agendados alimentan el cobro de la semana en Clientes.'
                : 'Importa la exportación de Meta Ads Manager (nivel anuncio, desglose por día) o registra el día a mano en Registro diario.'
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <Kpi etiqueta="Gasto" valor={fmt.copCorto(m.gasto)} sub={`${fmt.copCorto(m.gasto / dias)}/día`} />
            <Kpi etiqueta="CTR" valor={fmt.pct(m.ctr, 2)} tono={evaluar(m.ctr, PAUTA.ctr, m.impresiones, PAUTA.muestras.clics)} />
            <Kpi etiqueta="Página" valor={fmt.pct(m.lp)} tono={evaluar(m.lp, PAUTA.lp, m.clics, PAUTA.muestras.cpl)} sub="mín 15%" />
            <Kpi etiqueta="CPL" valor={fmt.copCorto(m.cpl)} tono={costoTono(m.cpl, ajustes.cpl_objetivo, m.clics, PAUTA.muestras.cpl)} sub={`${m.leads} leads`} />
            <Kpi etiqueta={esCliente ? 'Costo/paciente' : 'Costo/llamada'} valor={fmt.copCorto(m.cpCita)} tono={costoTono(m.cpCita, ajustes.costo_cita_objetivo, m.leads, PAUTA.muestras.costoCita)} sub={`${m.citas} ${esCliente ? 'pacientes' : 'llamadas'}`} />
            <Kpi etiqueta="Presentación" valor={fmt.pct(m.sur)} tono={evaluar(m.sur, PAUTA.sur, m.citas, PAUTA.muestras.sur)} sub="mín 60%" />
            <Kpi etiqueta="Cash / gasto" valor={m.gasto ? `${fmt.dec(m.cash / m.gasto)}x` : '—'} tono={!m.gasto || !m.cash ? 'nada' : m.cash / m.gasto >= 2 ? 'ok' : 'alerta'} sub="filtro 2:1" />
          </div>

          {!esCliente && (
            <Card className={cx('p-5', d.cuello && tonoClase[d.cuello.tono].bg)}>
              <div className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Cuello de botella de la pauta</div>
              <div className="mt-1 font-serif text-2xl">{d.resumen}</div>
              {d.cuello && d.cuello.acciones[0] && <div className="mt-1 text-sm text-muted">→ {d.cuello.acciones[0]}</div>}
            </Card>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHead titulo="El embudo" />
              <div className="px-5 pb-5">
                <EmbudoVisual
                  etapas={[
                    { nombre: 'Impresiones', valor: m.impresiones, color: 'var(--surface-2)' },
                    { nombre: 'Clics', valor: m.clics, color: 'var(--faint)' },
                    { nombre: 'Leads', valor: m.leads, color: 'var(--muted)' },
                    { nombre: esCliente ? 'Pacientes agendados' : 'Llamadas agendadas', valor: m.citas, color: 'var(--blue)' },
                    { nombre: 'Se presentaron', valor: m.presentados, color: 'var(--violet)' },
                    { nombre: 'Cierres', valor: m.cierres, color: 'var(--green)' },
                  ]}
                />
              </div>
            </Card>
            <Card>
              <CardHead titulo="Diagnóstico por KPI" sub="En orden; ningún tubo se juzga sin su muestra mínima" />
              <div className="space-y-2.5 px-5 pb-5">
                {d.hallazgos.map((h) => (
                  <div key={h.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm">{h.metrica}</div>
                      <div className="truncate text-[11px] text-faint">{h.umbral}</div>
                    </div>
                    <span className="num text-sm font-semibold">{h.valor}</span>
                    <Pill tono={h.tono} className="w-[104px] justify-center" />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <CardHead titulo="Gasto y resultados por día" />
            <div className="h-60 px-2 pb-4">
              <ResponsiveContainer>
                <ComposedChart data={serie} margin={{ left: -4, right: 8 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="dia" {...ejeProps} tickFormatter={(x) => fmt.fecha(x, 'd MMM')} minTickGap={20} />
                  <YAxis yAxisId="g" {...ejeProps} tickFormatter={(v) => fmt.copCorto(v)} />
                  <YAxis yAxisId="n" orientation="right" {...ejeProps} allowDecimals={false} />
                  <Tooltip content={<TooltipCaja formato={(k, v) => (k === 'gasto' ? fmt.cop(v) : fmt.n(v))} />} cursor={{ fill: 'var(--surface-2)' }} />
                  <Bar yAxisId="g" dataKey="gasto" name="Gasto" fill="var(--faint)" radius={[4, 4, 0, 0]} maxBarSize={20} />
                  <Line yAxisId="n" dataKey="leads" name="Leads" stroke="var(--blue)" strokeWidth={2} dot={false} />
                  <Line yAxisId="n" dataKey="citas" name="Llamadas" stroke="var(--violet)" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

// ── Anuncios ──────────────────────────────────────────────────────────

const anuncioVacio = (cuenta: string): Partial<Anuncio> => ({ cuenta, campana: 'Olimpo · Leads', conjunto: '', audiencia: 'lookalike', nombre: '', tipo: 'video', gancho: '', angulo: '', lanzado: hoyISO(), estado: 'activo', notas: '' })

function Anuncios({ cuenta }: { cuenta: string }) {
  const anuncios = useTabla('anuncios')
  const filas = useTabla('pauta')
  const ajustes = useAjustes()
  const [editar, setEditar] = useState<Partial<Anuncio> | null>(null)
  const [ver, setVer] = useState<'vivos' | 'todos'>('vivos')

  const lista = useMemo(() => {
    return anuncios
      .filter((a) => a.cuenta === cuenta && (ver === 'todos' || a.estado === 'activo' || a.estado === 'ganador'))
      .map((a) => {
        const m = calcPauta(filas.filter((f) => f.anuncio_id === a.id))
        const fase = faseDelPlan(a.lanzado)
        const v = veredictoPorGasto({ gasto: m.gasto, leads: m.leads, citas: m.citas, ctr: m.ctr, dias: fase.dias, K1: ajustes.cpl_objetivo, K2: ajustes.costo_cita_objetivo, trm: ajustes.trm })
        return { a, m, fase, v }
      })
      .sort((x, y) => x.a.conjunto.localeCompare(y.a.conjunto) || y.m.gasto - x.m.gasto)
  }, [anuncios, filas, cuenta, ver, ajustes])

  const plantilla = () => {
    const conjuntos = [
      ['Lookalike 1%', 'lookalike'],
      ['Intereses', 'intereses'],
      ['Cálidas o broad', 'calidas'],
    ]
    const nuevos: Partial<Anuncio>[] = []
    for (const [c, aud] of conjuntos) {
      for (let i = 1; i <= 3; i++) nuevos.push({ ...anuncioVacio(cuenta), conjunto: c, audiencia: aud, nombre: `${c} · Video gancho ${i}`, tipo: 'video', gancho: `Gancho ${i}` })
      for (let i = 1; i <= 2; i++) nuevos.push({ ...anuncioVacio(cuenta), conjunto: c, audiencia: aud, nombre: `${c} · Estático ${i}`, tipo: 'estatico', gancho: `Estático ${i}` })
    }
    insertar('anuncios', nuevos)
    avisar('Campaña creada: 3 adsets × (3 videos + 2 estáticos). Renombra los ganchos con los tuyos.', 'ok')
  }

  return (
    <div className="space-y-4">
      {(!ajustes.cpl_objetivo || !ajustes.costo_cita_objetivo) && (
        <Card className="border-amber/30 bg-amber-soft/40 p-4 text-sm text-muted">
          Para que la calculadora decida, define en <b className="text-text">Ajustes</b> el CPL objetivo (KPI1) y el costo por llamada objetivo (KPI2), en pesos. Los USD 25 y USD 200 del curso son del mercado del autor y no transfieren tal cual.
        </Card>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Segmento
          valor={ver}
          onChange={setVer}
          opciones={[
            { valor: 'vivos', etiqueta: 'Activos y ganadores' },
            { valor: 'todos', etiqueta: 'Todos' },
          ]}
        />
        <div className="ml-auto flex gap-2">
          {anuncios.filter((a) => a.cuenta === cuenta).length === 0 && (
            <Btn onClick={plantilla}>
              <Wand2 size={15} /> Montar la campaña del curso
            </Btn>
          )}
          <Btn variante="primario" onClick={() => setEditar(anuncioVacio(cuenta))}>
            <Plus size={15} /> Anuncio
          </Btn>
        </div>
      </div>

      {lista.length === 0 ? (
        <Card>
          <Vacio icono={<Megaphone size={20} />} titulo="Sin anuncios" texto="1 campaña · 3 adsets (lookalike, intereses, cálidas o broad) · 3 videos + 2 estáticos por adset. Cada adset cambia solo la audiencia; cada video cambia solo el gancho." />
        </Card>
      ) : (
        <Card>
          <Tabla>
            <thead>
              <tr>
                {['Anuncio', 'Adset', 'Fase', 'Gasto', 'CTR', 'CPL', 'Leads', 'Llamadas', 'Costo/llam.', 'Calculadora', ''].map((h) => (
                  <th key={h} className={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map(({ a, m, fase, v }) => (
                <tr key={a.id} className="cursor-pointer hover:bg-surface-2/50" onClick={() => setEditar(a)}>
                  <td className={cx(td, 'max-w-[240px]')}>
                    <div className="truncate font-medium">{a.nombre}</div>
                    <div className="truncate text-[11px] text-faint">{a.gancho || (a.tipo === 'video' ? 'video' : 'estático')}</div>
                  </td>
                  <td className={cx(td, 'max-w-[140px] truncate text-muted')}>{a.conjunto || '—'}</td>
                  <td className={td}>
                    <span className="text-xs text-muted" title={fase.regla}>
                      día {fase.dias}
                    </span>
                  </td>
                  <td className={cx(td, 'num')}>{fmt.copCorto(m.gasto)}</td>
                  <td className={cx(td, 'num text-muted')}>{fmt.pct(m.ctr, 2)}</td>
                  <td className={cx(td, 'num')}>{fmt.copCorto(m.cpl)}</td>
                  <td className={cx(td, 'num')}>{m.leads}</td>
                  <td className={cx(td, 'num')}>{m.citas}</td>
                  <td className={cx(td, 'num')}>{fmt.copCorto(m.cpCita)}</td>
                  <td className={td} title={v.texto}>
                    <Pill tono={v.tono}>{ACCION[v.accion]}</Pill>
                  </td>
                  <td className={td}>
                    <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-semibold', ESTADO[a.estado].c)}>{ESTADO[a.estado].t}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabla>
          <div className="border-t border-line px-5 py-3 text-[11px] text-faint">Pasa el mouse sobre la calculadora para ver el porqué. Días 0-3 no se toca nada; un adset se sube como mucho cada 2-3 días, 10-20%.</div>
        </Card>
      )}
      {editar && <EditarAnuncio a={editar} onCerrar={() => setEditar(null)} />}
    </div>
  )
}

function EditarAnuncio({ a: inicial, onCerrar }: { a: Partial<Anuncio>; onCerrar: () => void }) {
  const [a, setA] = useState(inicial)
  const filas = useTabla('pauta')
  const ajustes = useAjustes()
  const m = calcPauta(filas.filter((f) => f.anuncio_id && f.anuncio_id === a.id))
  const fase = faseDelPlan(a.lanzado)
  const v = veredictoPorGasto({ gasto: m.gasto, leads: m.leads, citas: m.citas, ctr: m.ctr, dias: fase.dias, K1: ajustes.cpl_objetivo, K2: ajustes.costo_cita_objetivo, trm: ajustes.trm })
  const t = (k: keyof Anuncio) => ({ value: (a[k] as string) ?? '', onChange: (e: React.ChangeEvent<HTMLInputElement>) => setA({ ...a, [k]: e.target.value }) })
  const guardar = () => {
    if (a.id) {
      const { id, ...r } = a
      actualizar('anuncios', id, r)
    } else insertar('anuncios', a)
    onCerrar()
  }
  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={a.id ? a.nombre : 'Nuevo anuncio'}
      ancho="max-w-2xl"
      pie={
        <>
          {a.id && (
            <Btn
              variante="fantasma"
              className="mr-auto text-red"
              onClick={() => {
                if (!confirm('¿Borrar el anuncio? Sus días de pauta quedan como total de la cuenta.')) return
                filas.filter((f) => f.anuncio_id === a.id).forEach((f) => actualizar('pauta', f.id, { anuncio_id: null }))
                borrar('anuncios', a.id!)
                onCerrar()
              }}
            >
              <Trash2 size={14} /> Borrar
            </Btn>
          )}
          <Btn variante="primario" disabled={!a.nombre} onClick={guardar}>
            Guardar
          </Btn>
        </>
      }
    >
      {a.id && (
        <Card className="mb-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tono={v.tono}>{ACCION[v.accion]}</Pill>
            <span className="text-sm">{v.texto}</span>
          </div>
          <div className="mt-2 text-xs text-muted">
            <b>{fase.nombre}.</b> {fase.regla}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
            {[
              ['Gasto', fmt.copCorto(m.gasto)],
              ['CTR', fmt.pct(m.ctr, 2)],
              ['CPL', fmt.copCorto(m.cpl)],
              ['Costo/llam.', fmt.copCorto(m.cpCita)],
            ].map(([k, x]) => (
              <div key={k} className="rounded-lg bg-surface-2/60 p-2">
                <div className="num font-semibold">{x}</div>
                <div className="text-faint">{k}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(['activo', 'ganador', 'pausado', 'apagado'] as EstadoAnuncio[]).map((e) => (
              <Btn key={e} chico variante={a.estado === e ? 'primario' : 'secundario'} onClick={() => setA({ ...a, estado: e })}>
                {ESTADO[e].t}
              </Btn>
            ))}
          </div>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Nombre (igual que en Meta)" className="col-span-2">
          <Input {...t('nombre')} />
        </Campo>
        <Campo etiqueta="Gancho" ayuda="Lo único que cambia entre videos (4 + 1)" className="col-span-2">
          <Input {...t('gancho')} placeholder="¿Tu agenda depende del boca a boca?" />
        </Campo>
        <Campo etiqueta="Adset">
          <Input {...t('conjunto')} />
        </Campo>
        <Campo etiqueta="Audiencia" ayuda="Lo único que cambia entre adsets">
          <Select value={a.audiencia} onChange={(e) => setA({ ...a, audiencia: e.target.value })}>
            <option value="lookalike">Lookalike 1%</option>
            <option value="intereses">Intereses</option>
            <option value="calidas">Cálidas</option>
            <option value="broad">Broad</option>
          </Select>
        </Campo>
        <Campo etiqueta="Tipo">
          <Select value={a.tipo} onChange={(e) => setA({ ...a, tipo: e.target.value as Anuncio['tipo'] })}>
            <option value="video">Video</option>
            <option value="estatico">Estático</option>
          </Select>
        </Campo>
        <Campo etiqueta="Lanzado el">
          <Input type="date" {...t('lanzado')} />
        </Campo>
        <Campo etiqueta="Campaña">
          <Input {...t('campana')} />
        </Campo>
        <Campo etiqueta="Ángulo">
          <Input {...t('angulo')} placeholder="dolor, mecanismo, prueba…" />
        </Campo>
        <Campo etiqueta="Notas" className="col-span-2">
          <Area value={a.notas ?? ''} onChange={(e) => setA({ ...a, notas: e.target.value })} />
        </Campo>
      </div>
    </Modal>
  )
}

// ── Registro diario ───────────────────────────────────────────────────

type Valores = { gasto: number | null; impresiones: number | null; clics: number | null; leads: number | null; citas: number | null }
const CAMPOS_AD: { k: keyof Valores; n: string }[] = [
  { k: 'gasto', n: 'Gasto' },
  { k: 'impresiones', n: 'Impr.' },
  { k: 'clics', n: 'Clics' },
  { k: 'leads', n: 'Leads' },
  { k: 'citas', n: 'Llamadas' },
]

function Registro({ cuenta }: { cuenta: string }) {
  const anuncios = useTabla('anuncios')
  const filas = useTabla('pauta')
  const [fecha, setFecha] = useState(hoyISO())
  const activos = anuncios.filter((a) => a.cuenta === cuenta && (a.estado === 'activo' || a.estado === 'ganador'))
  const existente = (anuncio_id: string | null) => filas.find((f) => f.cuenta === cuenta && f.fecha === fecha && (f.anuncio_id ?? null) === anuncio_id)
  const [v, setV] = useState<Record<string, Valores>>({})
  const [total, setTotal] = useState<{ presentados: number | null; cierres: number | null; cash: number | null; gasto: number | null; leads: number | null; citas: number | null }>({ presentados: null, cierres: null, cash: null, gasto: null, leads: null, citas: null })
  const [cargado, setCargado] = useState('')

  // Al cambiar de fecha, precarga lo que ya existe
  if (cargado !== cuenta + fecha) {
    const nv: Record<string, Valores> = {}
    for (const a of activos) {
      const e = existente(a.id)
      nv[a.id] = { gasto: e?.gasto ?? null, impresiones: e?.impresiones ?? null, clics: e?.clics ?? null, leads: e?.leads ?? null, citas: e?.citas ?? null }
    }
    const t = existente(null)
    setV(nv)
    setTotal({ presentados: t?.presentados ?? null, cierres: t?.cierres ?? null, cash: t?.cash ?? null, gasto: t?.gasto ?? null, leads: t?.leads ?? null, citas: t?.citas ?? null })
    setCargado(cuenta + fecha)
  }

  const guardar = () => {
    let n = 0
    const fila = (anuncio_id: string | null, x: Partial<PautaDia>) => {
      const e = existente(anuncio_id)
      if (e) actualizar('pauta', e.id, x)
      else insertar('pauta', { cuenta, anuncio_id, fecha, gasto: 0, impresiones: 0, alcance: 0, clics: 0, leads: 0, citas: 0, presentados: 0, cierres: 0, cash: 0, valor: 0, nota: '', origen: 'manual', ...x })
      n++
    }
    for (const a of activos) {
      const x = v[a.id]
      if (!x || CAMPOS_AD.every((c) => x[c.k] == null)) continue
      fila(a.id, { gasto: x.gasto ?? 0, impresiones: x.impresiones ?? 0, clics: x.clics ?? 0, leads: x.leads ?? 0, citas: x.citas ?? 0 })
    }
    if (Object.values(total).some((x) => x != null)) fila(null, { presentados: total.presentados ?? 0, cierres: total.cierres ?? 0, cash: total.cash ?? 0, gasto: total.gasto ?? 0, leads: total.leads ?? 0, citas: total.citas ?? 0 })
    avisar(n ? `Guardado: ${n} filas del ${fmt.fecha(fecha)}` : 'No había nada que guardar', n ? 'ok' : 'error')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-44" />
        <span className="text-xs text-faint">La hoja se mira cada mañana. Si importas de Meta, aquí solo completas lo de abajo del embudo.</span>
        <Btn variante="primario" className="ml-auto" onClick={guardar}>
          <Save size={15} /> Guardar el día
        </Btn>
      </div>

      <Card>
        <CardHead titulo="Por anuncio" sub={activos.length ? `${activos.length} anuncios activos` : 'Crea los anuncios en la pestaña Anuncios para registrar por anuncio'} />
        {activos.length > 0 && (
          <Tabla>
            <thead>
              <tr>
                <th className={th}>Anuncio</th>
                {CAMPOS_AD.map((c) => (
                  <th key={c.k} className={th}>
                    {c.n}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activos.map((a) => (
                <tr key={a.id}>
                  <td className={cx(td, 'max-w-[220px] truncate')}>{a.nombre}</td>
                  {CAMPOS_AD.map((c) => (
                    <td key={c.k} className={cx(td, 'py-1.5')}>
                      <Num className="h-8 w-24 text-xs" value={v[a.id]?.[c.k] ?? null} onChange={(n) => setV({ ...v, [a.id]: { ...(v[a.id] ?? ({} as Valores)), [c.k]: n } })} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </Card>

      <Card>
        <CardHead titulo="Total de la cuenta" sub="Lo de abajo del embudo casi nunca se atribuye a un anuncio: va aquí. Si no registras por anuncio, pon aquí también el gasto, los leads y las llamadas." />
        <div className="grid grid-cols-2 gap-3 px-5 pb-5 md:grid-cols-6">
          {(
            [
              ['presentados', 'Se presentaron'],
              ['cierres', 'Cierres'],
              ['cash', 'Cash cobrado'],
              ['gasto', 'Gasto sin anuncio'],
              ['leads', 'Leads sin anuncio'],
              ['citas', 'Llamadas sin anuncio'],
            ] as const
          ).map(([k, n]) => (
            <Campo key={k} etiqueta={n}>
              <Num value={total[k]} onChange={(x) => setTotal({ ...total, [k]: x })} />
            </Campo>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ── Ganchos y audiencias ──────────────────────────────────────────────

function Ganchos({ cuenta }: { cuenta: string }) {
  const anuncios = useTabla('anuncios')
  const filas = useTabla('pauta')
  const grupo = (clave: (a: Anuncio) => string) => {
    const m = new Map<string, PautaDia[]>()
    for (const a of anuncios.filter((x) => x.cuenta === cuenta)) {
      const k = clave(a) || '—'
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(...filas.filter((f) => f.anuncio_id === a.id))
    }
    return [...m.entries()].map(([k, xs]) => ({ k, m: calcPauta(xs) })).filter((x) => x.m.gasto > 0).sort((a, b) => (a.m.cpCita ?? Infinity) - (b.m.cpCita ?? Infinity) || (a.m.cpl ?? Infinity) - (b.m.cpl ?? Infinity))
  }
  const ganchos = grupo((a) => a.gancho)
  const NOMBRE_AUD: Record<string, string> = { lookalike: 'Lookalike 1%', intereses: 'Intereses', calidas: 'Cálidas', broad: 'Broad' }
  const audiencias = grupo((a) => NOMBRE_AUD[a.audiencia] ?? a.audiencia)
  const Tablita = ({ titulo, sub, datos }: { titulo: string; sub: string; datos: ReturnType<typeof grupo> }) => (
    <Card>
      <CardHead titulo={titulo} sub={sub} />
      {datos.length === 0 ? (
        <div className="px-5 pb-5 text-xs text-faint">Todavía no hay gasto atribuido.</div>
      ) : (
        <Tabla>
          <thead>
            <tr>
              {['', 'Gasto', 'CTR', 'CPL', 'Leads', 'Costo/llam.'].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datos.map(({ k, m }, i) => (
              <tr key={k}>
                <td className={cx(td, 'max-w-[260px] truncate font-medium')}>
                  {i === 0 && <Badge className="mr-2 text-violet">mejor</Badge>}
                  {k}
                </td>
                <td className={cx(td, 'num')}>{fmt.copCorto(m.gasto)}</td>
                <td className={cx(td, 'num')}>{fmt.pct(m.ctr, 2)}</td>
                <td className={cx(td, 'num')}>{fmt.copCorto(m.cpl)}</td>
                <td className={cx(td, 'num')}>{m.leads}</td>
                <td className={cx(td, 'num font-semibold')}>{fmt.copCorto(m.cpCita)}</td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
    </Card>
  )
  return (
    <div className="space-y-5">
      <Tablita titulo="Gancho contra gancho" sub="Los videos solo cambian el gancho: aquí se ve cuál gana. Ordenado por costo por llamada" datos={ganchos} />
      <Tablita titulo="Audiencia contra audiencia" sub="Los adsets solo cambian la audiencia" datos={audiencias} />
    </div>
  )
}

// ── Importar de Meta ──────────────────────────────────────────────────

function ImportarMeta({ abierto, cuenta, onCerrar }: { abierto: boolean; cuenta: string; onCerrar: () => void }) {
  const anuncios = useTabla('anuncios')
  const pauta = useTabla('pauta')
  const ref = useRef<HTMLInputElement>(null)
  const [previa, setPrevia] = useState<PreviaMeta | null>(null)
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState('')
  const plan = previa ? planDeImportacion(previa, cuenta, anuncios, pauta) : null
  const cerrar = () => {
    setPrevia(null)
    setNombre('')
    setError('')
    onCerrar()
  }
  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      titulo="Importar de Meta Ads Manager"
      pie={
        plan && (
          <Btn
            variante="primario"
            onClick={() => {
              if (plan.nuevos.length) insertar('anuncios', plan.nuevos)
              if (plan.reemplazar.length) borrar('pauta', plan.reemplazar)
              insertar('pauta', plan.filas)
              avisar(`Importadas ${plan.filas.length} filas · ${plan.nuevos.length} anuncios nuevos`, 'ok')
              cerrar()
            }}
          >
            Importar {plan.filas.length} filas
          </Btn>
        )
      }
    >
      <div className="space-y-4 text-sm">
        <p className="text-muted">
          En Ads Manager: nivel <b className="text-text">Anuncios</b> → <b className="text-text">Desglose → Por tiempo → Día</b> → Exportar (.xlsx o .csv). Incluye las columnas de importe gastado, impresiones, clics en el enlace, clientes potenciales y programaciones.
          Volver a importar el mismo rango reemplaza lo anterior, no lo duplica.
        </p>
        <input
          ref={ref}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            setNombre(f.name)
            setError('')
            try {
              setPrevia(await leerMeta(f))
            } catch (err) {
              setPrevia(null)
              setError(err instanceof Error ? err.message : 'No se pudo leer')
            }
          }}
        />
        <Btn className="w-full" onClick={() => ref.current?.click()}>
          <FileSpreadsheet size={16} /> {nombre || 'Elegir archivo'}
        </Btn>
        {error && <p className="text-red">{error}</p>}
        {previa && plan && (
          <Card className="space-y-1 p-4">
            <div className="flex justify-between">
              <span className="text-muted">Rango</span>
              <b>
                {fmt.fecha(previa.desde)} → {fmt.fecha(previa.hasta)}
              </b>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Filas (anuncio × día)</span>
              <b className="num">{previa.filas.length}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Anuncios nuevos</span>
              <b className="num">{plan.nuevos.length}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Filas que se reemplazan</span>
              <b className="num">{plan.reemplazar.length}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Gasto total</span>
              <b className="num">{fmt.cop(previa.filas.reduce((a, x) => a + x.gasto, 0))}</b>
            </div>
            {previa.faltan.length > 0 && <div className="pt-1 text-xs text-amber">Columnas que no vinieron (quedan en 0): {previa.faltan.join(', ')}</div>}
          </Card>
        )}
      </div>
    </Modal>
  )
}
