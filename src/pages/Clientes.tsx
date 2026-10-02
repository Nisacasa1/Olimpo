import { endOfWeek, startOfWeek, differenceInCalendarDays, parseISO } from 'date-fns'
import { Plus, Receipt, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Area, Btn, Campo, Card, cx, Input, Kpi, Modal, Num, Pagina, Select, Vacio } from '../components/ui'
import { LTV_MIN_USD } from '../lib/doctrina'
import { fmt, hoyISO } from '../lib/format'
import { enRango, ingresosPorCliente, ltv } from '../lib/metricas'
import { actualizar, avisar, borrar, insertar, useAjustes, useTabla } from '../lib/store'
import type { Cliente, EstadoCliente } from '../lib/types'

const ESTADOS: Record<EstadoCliente, string> = {
  onboarding: 'Onboarding',
  activo: 'Activo',
  pausado: 'Pausado',
  perdido: 'Terminó',
}
const COLOR: Record<EstadoCliente, string> = {
  onboarding: 'text-blue-2 bg-blue-soft',
  activo: 'text-green bg-green-soft',
  pausado: 'text-amber bg-amber-soft',
  perdido: 'text-muted bg-surface-2',
}

export default function Clientes() {
  const clientes = useTabla('clientes')
  const pauta = useTabla('pauta')
  const movs = useTabla('movimientos')
  const ajustes = useAjustes()
  const [editar, setEditar] = useState<Partial<Cliente> | null>(null)
  const [cobro, setCobro] = useState<{ c: Cliente; monto: number; concepto: string } | null>(null)

  const semana = { desde: startOfWeek(new Date(), { weekStartsOn: 1 }), hasta: endOfWeek(new Date(), { weekStartsOn: 1 }) }
  const ing = useMemo(() => ingresosPorCliente(movs), [movs])
  const vivos = clientes.filter((c) => c.estado === 'activo' || c.estado === 'onboarding')
  const l = ltv(clientes, movs, ajustes)
  const totalCobrado = [...ing.values()].reduce((a, b) => a + b, 0)

  const filas = useMemo(
    () =>
      clientes.map((c) => {
        const deCliente = pauta.filter((p) => p.cuenta === c.id)
        const citasSemana = deCliente.filter((p) => enRango(p.fecha, semana)).reduce((a, p) => a + p.citas, 0)
        const citasTotal = deCliente.reduce((a, p) => a + p.citas, 0)
        const gasto = deCliente.reduce((a, p) => a + p.gasto, 0)
        return {
          c,
          citasSemana,
          citasTotal,
          gasto,
          cobroSemana: citasSemana * c.precio_por_paciente,
          cobrado: ing.get(c.id) ?? 0,
          dias: differenceInCalendarDays(c.fin ? parseISO(c.fin) : new Date(), parseISO(c.inicio)),
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clientes, pauta, ing],
  )

  return (
    <Pagina
      titulo="Clientes"
      sub="Las clínicas que ya pagan. Los pacientes agendados salen de la Pauta de cada una, y el cobro de la semana se calcula solo."
      acciones={
        <Btn
          variante="primario"
          onClick={() =>
            setEditar({
              nombre: '',
              contacto: '',
              telefono: '',
              inicio: hoyISO(),
              fin: null,
              estado: 'onboarding',
              setup_fee: ajustes.precio_setup,
              precio_por_paciente: ajustes.precio_por_paciente,
              fee_mensual: 0,
              ad_account_id: '',
              notas: '',
              lead_id: null,
            })
          }
        >
          <Plus size={15} /> Nuevo cliente
        </Btn>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi etiqueta="Clientes vivos" valor={fmt.n(vivos.length)} sub={`${clientes.length} en total · 15 para pasar a DIY`} />
        <Kpi etiqueta="Por cobrar esta semana" valor={fmt.copCorto(filas.reduce((a, f) => a + f.cobroSemana, 0))} sub="pacientes agendados × precio" />
        <Kpi etiqueta="Cobrado histórico" valor={fmt.copCorto(totalCobrado)} sub="ingresos atados a un cliente" />
        <Kpi
          etiqueta={`LTV ${l.tipo}`}
          valor={fmt.copCorto(l.valor)}
          sub={`mín USD ${fmt.n(LTV_MIN_USD)} ≈ ${fmt.copCorto(LTV_MIN_USD * ajustes.trm)}`}
          tono={l.valor >= LTV_MIN_USD * ajustes.trm ? 'ok' : 'critico'}
        />
      </div>

      {clientes.length === 0 ? (
        <Card>
          <Vacio icono={<Target size={20} />} titulo="Todavía no hay clientes" texto="Cuando una venta se marca como ganada, se crea el cliente desde ahí. También puedes crearlo a mano." />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filas.map(({ c, citasSemana, citasTotal, gasto, cobroSemana, cobrado, dias }) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold">{c.nombre}</div>
                  <div className="text-xs text-faint">
                    desde {fmt.fecha(c.inicio, 'd MMM yyyy')} · {dias} días
                  </div>
                </div>
                <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', COLOR[c.estado])}>{ESTADOS[c.estado]}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-surface-2/60 p-2">
                  <div className="num text-xl font-semibold text-green">{citasSemana}</div>
                  <div className="text-[10.5px] text-muted">pacientes esta semana</div>
                </div>
                <div className="rounded-xl bg-surface-2/60 p-2">
                  <div className="num text-xl font-semibold">{citasTotal}</div>
                  <div className="text-[10.5px] text-muted">pacientes total</div>
                </div>
                <div className="rounded-xl bg-surface-2/60 p-2">
                  <div className="num text-xl font-semibold">{citasTotal ? fmt.copCorto(gasto / citasTotal) : '—'}</div>
                  <div className="text-[10.5px] text-muted">costo por paciente</div>
                </div>
              </div>
              <div className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Cobro de esta semana</span>
                  <b className="num">{fmt.cop(cobroSemana)}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Cobrado hasta hoy</span>
                  <b className="num">{fmt.cop(cobrado)}</b>
                </div>
                <div className="flex justify-between text-xs text-faint">
                  <span>Setup {fmt.copCorto(c.setup_fee)} · {fmt.copCorto(c.precio_por_paciente)}/paciente</span>
                  <span>pauta {fmt.copCorto(gasto)}</span>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Btn chico className="flex-1" onClick={() => setCobro({ c, monto: cobroSemana, concepto: `Pacientes agendados semana (${citasSemana})` })}>
                  <Receipt size={13} /> Registrar pago
                </Btn>
                <Btn chico variante="fantasma" onClick={() => setEditar(c)}>
                  Editar
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editar && (
        <Modal
          abierto
          onCerrar={() => setEditar(null)}
          titulo={editar.id ? editar.nombre : 'Nuevo cliente'}
          pie={
            <>
              {editar.id && (
                <Btn
                  variante="fantasma"
                  className="mr-auto text-red"
                  onClick={() => {
                    if (confirm('¿Borrar el cliente?')) {
                      borrar('clientes', editar.id!)
                      setEditar(null)
                    }
                  }}
                >
                  Borrar
                </Btn>
              )}
              <Btn
                variante="primario"
                disabled={!editar.nombre}
                onClick={() => {
                  if (editar.id) {
                    const { id, ...r } = editar
                    actualizar('clientes', id, r)
                  } else insertar('clientes', editar)
                  setEditar(null)
                }}
              >
                Guardar
              </Btn>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Clínica" className="col-span-2">
              <Input value={editar.nombre ?? ''} onChange={(e) => setEditar({ ...editar, nombre: e.target.value })} />
            </Campo>
            <Campo etiqueta="Contacto">
              <Input value={editar.contacto ?? ''} onChange={(e) => setEditar({ ...editar, contacto: e.target.value })} />
            </Campo>
            <Campo etiqueta="Teléfono">
              <Input value={editar.telefono ?? ''} onChange={(e) => setEditar({ ...editar, telefono: e.target.value })} />
            </Campo>
            <Campo etiqueta="Inicio">
              <Input type="date" value={editar.inicio ?? ''} onChange={(e) => setEditar({ ...editar, inicio: e.target.value })} />
            </Campo>
            <Campo etiqueta="Estado">
              <Select value={editar.estado} onChange={(e) => setEditar({ ...editar, estado: e.target.value as EstadoCliente, fin: e.target.value === 'perdido' ? editar.fin ?? hoyISO() : null })}>
                {Object.entries(ESTADOS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etiqueta="Setup fee">
              <Num value={editar.setup_fee} onChange={(n) => setEditar({ ...editar, setup_fee: n ?? 0 })} />
            </Campo>
            <Campo etiqueta="Precio por paciente agendado">
              <Num value={editar.precio_por_paciente} onChange={(n) => setEditar({ ...editar, precio_por_paciente: n ?? 0 })} />
            </Campo>
            <Campo etiqueta="Fee mensual (si aplica)">
              <Num value={editar.fee_mensual} onChange={(n) => setEditar({ ...editar, fee_mensual: n ?? 0 })} />
            </Campo>
            <Campo etiqueta="ID cuenta publicitaria" ayuda="Para la automatización de Meta, más adelante">
              <Input value={editar.ad_account_id ?? ''} onChange={(e) => setEditar({ ...editar, ad_account_id: e.target.value })} placeholder="act_…" />
            </Campo>
            <Campo etiqueta="Notas" className="col-span-2">
              <Area value={editar.notas ?? ''} onChange={(e) => setEditar({ ...editar, notas: e.target.value })} />
            </Campo>
          </div>
        </Modal>
      )}

      {cobro && (
        <Modal
          abierto
          onCerrar={() => setCobro(null)}
          titulo={`Pago de ${cobro.c.nombre}`}
          pie={
            <Btn
              variante="primario"
              onClick={() => {
                insertar('movimientos', {
                  fecha: hoyISO(),
                  tipo: 'ingreso',
                  ambito: 'negocio',
                  categoria: cobro.concepto.startsWith('Setup') ? 'Setup' : 'Pacientes agendados',
                  concepto: cobro.concepto,
                  monto: cobro.monto,
                  cliente_id: cobro.c.id,
                  cuenta: 'operativa',
                })
                if (cobro.c.estado === 'onboarding' && cobro.concepto.startsWith('Setup')) actualizar('clientes', cobro.c.id, { estado: 'activo' })
                avisar('Pago registrado en Finanzas', 'ok')
                setCobro(null)
              }}
            >
              Registrar
            </Btn>
          }
        >
          <div className="space-y-3">
            <div className="flex gap-2">
              <Btn chico onClick={() => setCobro({ ...cobro, monto: cobro.c.setup_fee, concepto: 'Setup' })}>
                Setup
              </Btn>
              <Btn chico onClick={() => setCobro({ ...cobro, concepto: 'Pacientes agendados' })}>
                Pacientes
              </Btn>
            </div>
            <Campo etiqueta="Concepto">
              <Input value={cobro.concepto} onChange={(e) => setCobro({ ...cobro, concepto: e.target.value })} />
            </Campo>
            <Campo etiqueta="Monto">
              <Num value={cobro.monto} onChange={(n) => setCobro({ ...cobro, monto: n ?? 0 })} />
            </Campo>
          </div>
        </Modal>
      )}
    </Pagina>
  )
}
