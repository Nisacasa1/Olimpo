import { ArrowDown, TrendingUp } from 'lucide-react'
import { Card, CardHead, cx, Kpi, Pagina, Pill } from '../components/ui'
import { fmt } from '../lib/format'
import { ingresoMensualCliente } from '../lib/metricas'
import { proyectar, type Tasa } from '../lib/proyeccion'
import { useAjustes, useTabla } from '../lib/store'

export function useProyeccion() {
  const ajustes = useAjustes()
  const movs = useTabla('movimientos')
  const pauta = useTabla('pauta')
  const reuniones = useTabla('reuniones')
  return proyectar({ ajustes, movs, pauta, reuniones })
}

const etiquetaTasa = (t: Tasa | null) => (t ? (t.real ? 'tu dato real' : 'mínimo de la doctrina / tu objetivo') : 'sin muestra todavía')

export default function Proyeccion() {
  const p = useProyeccion()
  const ajustes = useAjustes()
  const adelante = p.facturado >= p.esperadoHoy
  const presupuestoMes = ajustes.presupuesto_diario * p.diasMes

  return (
    <Pagina
      titulo="Proyección del mes"
      sub="A este ritmo, ¿a cuánto llegas? Y si no llegas, qué te falta — hacia atrás desde la meta, con tus tasas reales cuando hay muestra. Stockdale: los plazos van a los insumos, nunca a los resultados."
    >
      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">
              Día {p.diaDelMes} de {p.diasMes}
            </div>
            <div className="num mt-2 text-5xl font-semibold tracking-tight">{fmt.copCorto(p.facturado)}</div>
            <div className="mt-1 text-sm text-muted">facturado de {fmt.copCorto(p.meta)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted">A este ritmo terminas en</div>
            <div className={cx('num text-3xl font-semibold', p.proyectado >= p.meta ? 'text-green' : 'text-text')}>{fmt.copCorto(p.proyectado)}</div>
            <Pill tono={adelante ? 'ok' : 'alerta'} className="mt-1">
              {adelante ? 'Vas adelante del ritmo' : `Vas ${fmt.copCorto(p.esperadoHoy - p.facturado)} detrás del ritmo`}
            </Pill>
          </div>
        </div>
        <div className="relative mt-5 h-3 rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-blue transition-all" style={{ width: `${Math.min(100, p.avance * 100)}%` }} />
          <div className="absolute -top-1 h-5 w-0.5 bg-violet" style={{ left: `${Math.min(100, (p.diaDelMes / p.diasMes) * 100)}%` }} title="Donde deberías ir hoy" />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-faint">
          <span>{fmt.pct(p.avance, 0)} de la meta</span>
          <span className="text-violet">│ ritmo de hoy: {fmt.copCorto(p.esperadoHoy)}</span>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHead titulo="Lo que falta para la meta" sub={p.faltante > 0 ? 'Hacia atrás desde la plata: la aritmética cruda' : 'A este ritmo llegas. Mantén el volumen.'} icono={<TrendingUp size={15} />} />
          {p.faltante > 0 ? (
            <div className="space-y-1 px-5 pb-5">
              {[
                { k: 'Faltan', v: fmt.copCorto(p.faltante), d: 'sobre lo proyectado' },
                { k: 'Clientes nuevos', v: fmt.dec(p.clientesFaltan), d: `a ${fmt.copCorto(ingresoMensualCliente(ajustes))} por cliente al mes` },
                { k: 'Llamadas de venta agendadas', v: fmt.n(Math.ceil(p.llamadasFaltan)), d: `${fmt.dec(p.porDia.llamadas)} por día · cierre ${fmt.pct(p.tasas.scr.valor, 0)} y presentación ${fmt.pct(p.tasas.sur.valor, 0)}` },
                { k: 'Leads', v: p.leadsFaltan != null ? fmt.n(Math.ceil(p.leadsFaltan)) : '—', d: p.leadsFaltan != null ? `${fmt.dec(p.porDia.leads)} por día · agenda ${fmt.pct(p.tasas.agenda?.valor, 0)}` : 'falta muestra de lead → llamada (50 leads)' },
                { k: 'Pauta', v: p.gastoFalta != null ? fmt.copCorto(p.gastoFalta) : '—', d: p.gastoFalta != null ? `${fmt.copCorto(p.porDia.gasto)} por día` : 'define el CPL o el costo por llamada objetivo en Ajustes' },
              ].map((x, i) => (
                <div key={x.k}>
                  {i > 0 && (
                    <div className="flex justify-center py-0.5 text-faint">
                      <ArrowDown size={13} />
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/50 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">{x.k}</div>
                      <div className="text-[11px] text-faint">{x.d}</div>
                    </div>
                    <div className="num text-2xl font-semibold">{x.v}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 pb-5 text-sm text-muted">Sigue el ritmo. Si la proyección supera la meta con margen, es momento de subir el presupuesto 10-20% en lo que gana.</div>
          )}
        </Card>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Kpi etiqueta="Pauta del mes" valor={fmt.copCorto(p.gasto)} sub={`proyectada ${fmt.copCorto(p.gastoProyectado)}`} />
            <Kpi etiqueta="Presupuesto del mes" valor={presupuestoMes ? fmt.copCorto(presupuestoMes) : '—'} sub={presupuestoMes ? `${fmt.copCorto(ajustes.presupuesto_diario)}/día` : 'defínelo en Ajustes'} tono={!presupuestoMes ? 'nada' : p.gastoProyectado > presupuestoMes * 1.1 ? 'alerta' : 'ok'} />
            <Kpi etiqueta="Clientes cerrados" valor={fmt.n(p.cierres)} sub="este mes, desde Ventas" />
            <Kpi etiqueta="Ingreso por cliente" valor={fmt.copCorto(ingresoMensualCliente(ajustes))} sub="pacientes + setup repartido (Ajustes)" />
          </div>
          <Card>
            <CardHead titulo="Con qué tasas se calcula" sub="Mientras no haya muestra, se usa el mínimo de la doctrina, nunca una cifra inventada" />
            <div className="space-y-2 px-5 pb-5 text-sm">
              {[
                ['Cierre (SCR)', p.tasas.scr],
                ['Presentación (SUR)', p.tasas.sur],
                ['Lead → llamada', p.tasas.agenda],
              ].map(([k, t]) => (
                <div key={k as string} className="flex items-center justify-between gap-2">
                  <span className="text-muted">{k as string}</span>
                  <span className="flex items-center gap-2">
                    <b className="num">{t ? fmt.pct((t as Tasa).valor, 0) : '—'}</b>
                    <span className="text-[11px] text-faint">{etiquetaTasa(t as Tasa | null)}</span>
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted">CPL</span>
                <span className="flex items-center gap-2">
                  <b className="num">{p.tasas.cpl ? fmt.copCorto(p.tasas.cpl.valor) : '—'}</b>
                  <span className="text-[11px] text-faint">{etiquetaTasa(p.tasas.cpl)}</span>
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Pagina>
  )
}
