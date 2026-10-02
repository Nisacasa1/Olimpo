import { addMonths, format, parseISO, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Trash2, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ejeProps, gridProps, TooltipCaja } from '../components/Graficas'
import { Barra, Btn, Campo, Card, CardHead, cx, Input, Kpi, Modal, Num, Pagina, Segmento, Select, Tabla, td, th, Vacio } from '../components/ui'
import { CAT_NEGOCIO_GASTO, CAT_NEGOCIO_INGRESO, CAT_PERSONAL_GASTO, CAT_PERSONAL_INGRESO } from '../lib/doctrina'
import { fmt, hoyISO, mesISO } from '../lib/format'
import { actualizar, borrar, insertar, useTabla } from '../lib/store'
import type { Ambito, Movimiento, TipoMov } from '../lib/types'

const cats = (tipo: TipoMov, ambito: Ambito) =>
  ambito === 'negocio' ? (tipo === 'ingreso' ? CAT_NEGOCIO_INGRESO : CAT_NEGOCIO_GASTO) : tipo === 'ingreso' ? CAT_PERSONAL_INGRESO : CAT_PERSONAL_GASTO

export default function Finanzas() {
  const movs = useTabla('movimientos')
  const presupuestos = useTabla('presupuestos')
  const clientes = useTabla('clientes')
  const [mes, setMes] = useState(mesISO())
  const [ambito, setAmbito] = useState<Ambito | 'todo'>('negocio')
  const [nuevo, setNuevo] = useState<Partial<Movimiento> | null>(null)

  const delMes = useMemo(() => movs.filter((m) => m.fecha.startsWith(mes) && (ambito === 'todo' || m.ambito === ambito)), [movs, mes, ambito])
  const suma = (xs: Movimiento[], t: TipoMov) => xs.filter((m) => m.tipo === t).reduce((a, m) => a + m.monto, 0)
  const ingresos = suma(delMes, 'ingreso')
  const gastos = suma(delMes, 'gasto')

  // Saldo acumulado (todo el historial) y cofre de guerra
  const saldo = suma(movs, 'ingreso') - suma(movs, 'gasto')
  const gastoFijoMensual = useMemo(() => {
    // Promedio de los últimos 3 meses cerrados, sin publicidad ni comisiones:
    // la reserva cubre lo que se sigue pagando aunque el negocio se detenga.
    const meses = [1, 2, 3].map((i) => mesISO(subMonths(new Date(), i)))
    const total = movs.filter((m) => m.tipo === 'gasto' && meses.some((x) => m.fecha.startsWith(x)) && m.categoria !== 'Publicidad').reduce((a, m) => a + m.monto, 0)
    return total / 3
  }, [movs])
  const mesesReserva = gastoFijoMensual > 0 ? saldo / gastoFijoMensual : null

  const serie = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = mesISO(subMonths(parseISO(mes + '-01'), 11 - i))
      const xs = movs.filter((x) => x.fecha.startsWith(m) && (ambito === 'todo' || x.ambito === ambito))
      return { mes: m, ingresos: suma(xs, 'ingreso'), gastos: suma(xs, 'gasto') }
    })
  }, [movs, mes, ambito])

  const porCategoria = (tipo: TipoMov) => {
    const ambitos: Ambito[] = ambito === 'todo' ? ['negocio', 'personal'] : [ambito]
    return ambitos.flatMap((a) =>
      cats(tipo, a).map((c) => {
        const real = delMes.filter((m) => m.tipo === tipo && m.ambito === a && m.categoria === c).reduce((s, m) => s + m.monto, 0)
        const p = presupuestos.find((x) => x.mes === mes && x.tipo === tipo && x.categoria === `${a}:${c}`)
        return { ambito: a, categoria: c, real, esperado: p?.esperado ?? null, pid: p?.id }
      }),
    )
  }

  const setEsperado = (tipo: TipoMov, a: Ambito, c: string, v: number | null, pid?: string) => {
    if (pid) actualizar('presupuestos', pid, { esperado: v ?? 0 })
    else insertar('presupuestos', { mes, tipo, categoria: `${a}:${c}`, esperado: v ?? 0 })
  }

  const nombreMes = format(parseISO(mes + '-01'), 'MMMM yyyy', { locale: es })

  return (
    <Pagina
      titulo="Finanzas"
      sub="El Financial Tracker en una sola pantalla: partida por partida, esperado contra real, y el cofre de guerra. Los pagos de clientes entran solos desde Clientes."
      acciones={
        <>
          <Segmento
            valor={ambito}
            onChange={setAmbito}
            opciones={[
              { valor: 'negocio', etiqueta: 'Negocio' },
              { valor: 'personal', etiqueta: 'Personal' },
              { valor: 'todo', etiqueta: 'Todo' },
            ]}
          />
          <Btn variante="primario" onClick={() => setNuevo({ fecha: hoyISO(), tipo: 'gasto', ambito: ambito === 'todo' ? 'negocio' : ambito, categoria: '', concepto: '', monto: 0, cliente_id: null, cuenta: 'operativa' })}>
            <Plus size={15} /> Movimiento
          </Btn>
        </>
      }
    >
      <div className="mb-4 flex items-center gap-2">
        <Btn chico variante="fantasma" onClick={() => setMes(mesISO(subMonths(parseISO(mes + '-01'), 1)))}>
          <ChevronLeft size={16} />
        </Btn>
        <div className="min-w-36 text-center text-sm font-semibold first-letter:uppercase">{nombreMes}</div>
        <Btn chico variante="fantasma" onClick={() => setMes(mesISO(addMonths(parseISO(mes + '-01'), 1)))}>
          <ChevronRight size={16} />
        </Btn>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi etiqueta="Ingresos del mes" valor={fmt.copCorto(ingresos)} tono={ingresos > 0 ? 'ok' : 'nada'} />
        <Kpi etiqueta="Gastos del mes" valor={fmt.copCorto(gastos)} />
        <Kpi etiqueta="Flujo neto" valor={fmt.copCorto(ingresos - gastos)} tono={ingresos - gastos >= 0 ? 'ok' : 'critico'} />
        <Kpi
          etiqueta="Cofre de guerra"
          valor={mesesReserva != null ? `${fmt.dec(mesesReserva)} meses` : fmt.copCorto(saldo)}
          sub={mesesReserva != null ? `saldo ${fmt.copCorto(saldo)} · meta 12 meses` : 'necesita 3 meses de gastos registrados'}
          tono={mesesReserva == null ? 'nada' : mesesReserva >= 12 ? 'ok' : mesesReserva >= 3 ? 'alerta' : 'critico'}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHead titulo="Últimos 12 meses" />
          <div className="h-60 px-2 pb-4">
            <ResponsiveContainer>
              <BarChart data={serie} margin={{ left: -4, right: 8 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="mes" {...ejeProps} tickFormatter={(m) => format(parseISO(m + '-01'), 'MMM', { locale: es })} />
                <YAxis {...ejeProps} tickFormatter={(v) => fmt.copCorto(v)} />
                <Tooltip content={<TooltipCaja formato={(_k, v) => fmt.cop(v)} />} cursor={{ fill: 'var(--surface-2)' }} />
                <Bar dataKey="ingresos" name="Ingresos" fill="var(--green)" radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Bar dataKey="gastos" name="Gastos" fill="var(--red)" radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHead titulo="Esperado contra real" sub="Escribe lo esperado; lo real sale de los movimientos" />
          <div className="max-h-72 space-y-3 overflow-y-auto px-5 pb-5">
            {(['ingreso', 'gasto'] as TipoMov[]).map((t) => (
              <div key={t}>
                <div className="mb-1.5 text-[11px] font-semibold tracking-wide text-faint uppercase">{t === 'ingreso' ? 'Ingresos' : 'Gastos'}</div>
                {porCategoria(t).map((c) => (
                  <div key={c.ambito + c.categoria} className="mb-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">
                        {c.categoria}
                        {ambito === 'todo' && <span className="text-[10px] text-faint"> · {c.ambito}</span>}
                      </span>
                      <span className="num text-xs text-muted">{fmt.copCorto(c.real)} /</span>
                      <Num className="h-7 w-24 text-xs" value={c.esperado} onChange={(v) => setEsperado(t, c.ambito, c.categoria, v, c.pid)} placeholder="esperado" />
                    </div>
                    {c.esperado ? <Barra className="mt-1 h-1" valor={c.real} max={c.esperado} color={t === 'gasto' && c.real > c.esperado ? 'var(--red)' : 'var(--green)'} /> : null}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHead titulo="Partida por partida" sub={`${delMes.length} movimientos en ${nombreMes}`} />
        {delMes.length === 0 ? (
          <Vacio icono={<Wallet size={20} />} titulo="Sin movimientos este mes" texto="Regla del 6.4: registro de ingresos y gastos semanal y mensual, y revisar las cuentas a diario." />
        ) : (
          <Tabla>
            <thead>
              <tr>
                {['Fecha', 'Concepto', 'Categoría', 'Ámbito', 'Cuenta', 'Monto', ''].map((h) => (
                  <th key={h} className={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {delMes
                .slice()
                .sort((a, b) => b.fecha.localeCompare(a.fecha))
                .map((m) => (
                  <tr key={m.id} className="group cursor-pointer hover:bg-surface-2/50" onClick={() => setNuevo(m)}>
                    <td className={cx(td, 'text-muted')}>{fmt.fecha(m.fecha)}</td>
                    <td className={cx(td, 'max-w-[260px] truncate')}>
                      {m.concepto}
                      {m.cliente_id && <span className="ml-2 text-xs text-faint">{clientes.find((c) => c.id === m.cliente_id)?.nombre}</span>}
                    </td>
                    <td className={cx(td, 'text-muted')}>{m.categoria}</td>
                    <td className={cx(td, 'text-muted first-letter:uppercase')}>{m.ambito}</td>
                    <td className={cx(td, 'text-muted first-letter:uppercase')}>{m.cuenta}</td>
                    <td className={cx(td, 'num font-semibold', m.tipo === 'ingreso' ? 'text-green' : 'text-text')}>
                      {m.tipo === 'ingreso' ? '+' : '−'}
                      {fmt.cop(m.monto)}
                    </td>
                    <td className={td}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          borrar('movimientos', m.id)
                        }}
                        className="text-faint opacity-0 group-hover:opacity-100 hover:text-red"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </Tabla>
        )}
      </Card>

      {nuevo && (
        <Modal
          abierto
          onCerrar={() => setNuevo(null)}
          titulo={nuevo.id ? 'Editar movimiento' : 'Nuevo movimiento'}
          pie={
            <Btn
              variante="primario"
              disabled={!nuevo.monto || !nuevo.categoria}
              onClick={() => {
                if (nuevo.id) {
                  const { id, ...r } = nuevo
                  actualizar('movimientos', id, r)
                } else insertar('movimientos', nuevo)
                setNuevo(null)
              }}
            >
              Guardar
            </Btn>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <Segmento
              className="col-span-2"
              valor={nuevo.tipo!}
              onChange={(t) => setNuevo({ ...nuevo, tipo: t, categoria: '' })}
              opciones={[
                { valor: 'gasto', etiqueta: 'Gasto' },
                { valor: 'ingreso', etiqueta: 'Ingreso' },
              ]}
            />
            <Campo etiqueta="Ámbito">
              <Select value={nuevo.ambito} onChange={(e) => setNuevo({ ...nuevo, ambito: e.target.value as Ambito, categoria: '', cuenta: e.target.value === 'personal' ? 'personal' : 'operativa' })}>
                <option value="negocio">Negocio</option>
                <option value="personal">Personal</option>
              </Select>
            </Campo>
            <Campo etiqueta="Categoría">
              <Select value={nuevo.categoria} onChange={(e) => setNuevo({ ...nuevo, categoria: e.target.value })}>
                <option value="">Elige…</option>
                {cats(nuevo.tipo!, nuevo.ambito!).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Campo>
            <Campo etiqueta="Concepto" className="col-span-2">
              <Input value={nuevo.concepto ?? ''} onChange={(e) => setNuevo({ ...nuevo, concepto: e.target.value })} placeholder="GoHighLevel, arriendo, setup Clínica X…" />
            </Campo>
            <Campo etiqueta="Monto">
              <Num value={nuevo.monto} onChange={(n) => setNuevo({ ...nuevo, monto: n ?? 0 })} />
            </Campo>
            <Campo etiqueta="Fecha">
              <Input type="date" value={nuevo.fecha} onChange={(e) => setNuevo({ ...nuevo, fecha: e.target.value })} />
            </Campo>
            <Campo etiqueta="Cuenta" ayuda="Dos cuentas separadas: negocio y personal (6.4)">
              <Select value={nuevo.cuenta} onChange={(e) => setNuevo({ ...nuevo, cuenta: e.target.value })}>
                <option value="operativa">Operativa (negocio)</option>
                <option value="reserva">Reserva (cofre de guerra)</option>
                <option value="personal">Personal</option>
              </Select>
            </Campo>
            {nuevo.tipo === 'ingreso' && nuevo.ambito === 'negocio' && (
              <Campo etiqueta="Cliente">
                <Select value={nuevo.cliente_id ?? ''} onChange={(e) => setNuevo({ ...nuevo, cliente_id: e.target.value || null })}>
                  <option value="">—</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </Select>
              </Campo>
            )}
          </div>
        </Modal>
      )}
    </Pagina>
  )
}
