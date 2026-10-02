import { CalendarClock, CheckCircle2, Plus, UserX, Video } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SelectorPeriodo, usePeriodo } from '../components/Periodo'
import { Area, Badge, Btn, Campo, Card, CardHead, cx, Input, Kpi, Modal, Num, Pagina, Pill, Select, Tabla, td, th, Vacio } from '../components/ui'
import { U } from '../lib/doctrina'
import { fmt, hoyISO } from '../lib/format'
import { enRango, evaluarU, ventas } from '../lib/metricas'
import { actualizar, avisar, borrar, insertar, useAjustes, useTabla } from '../lib/store'
import type { EstadoReunion, Reunion, ResultadoVenta } from '../lib/types'

const ESTADO: Record<EstadoReunion, { texto: string; clase: string }> = {
  agendada: { texto: 'Agendada', clase: 'text-blue-2 bg-blue-soft' },
  presentada: { texto: 'Se presentó', clase: 'text-green bg-green-soft' },
  no_show: { texto: 'No se presentó', clase: 'text-red bg-red-soft' },
  reagendada: { texto: 'Reagendada', clase: 'text-amber bg-amber-soft' },
  cancelada: { texto: 'Cancelada', clase: 'text-muted bg-surface-2' },
}
const RESULTADO: Record<NonNullable<ResultadoVenta>, { texto: string; clase: string }> = {
  ganada: { texto: 'Ganada', clase: 'text-green' },
  perdida: { texto: 'Perdida', clase: 'text-red' },
  seguimiento: { texto: 'Seguimiento', clase: 'text-amber' },
}

const nueva = (): Partial<Reunion> => ({
  lead_id: null,
  nombre: '',
  fecha: new Date(Date.now() + 86400000).toISOString(),
  agendada_el: hoyISO(),
  fuente: 'Llamada en frío',
  estado: 'agendada',
  resultado: null,
  oferta: '',
  monto: null,
  duracion_min: null,
  grabacion: '',
  emociones: '',
  objecion: '',
  conclusion: '',
  notas: '',
})

export default function Ventas() {
  const reuniones = useTabla('reuniones')
  const { p, setP, rango } = usePeriodo('90')
  const [editar, setEditar] = useState<Partial<Reunion> | null>(null)

  const ahora = new Date().toISOString()
  const proximas = useMemo(() => reuniones.filter((r) => r.estado === 'agendada' && r.fecha >= ahora).sort((a, b) => a.fecha.localeCompare(b.fecha)), [reuniones, ahora])
  const porCerrar = useMemo(() => reuniones.filter((r) => r.estado === 'agendada' && r.fecha < ahora).sort((a, b) => a.fecha.localeCompare(b.fecha)), [reuniones, ahora])
  const enPeriodo = useMemo(() => reuniones.filter((r) => enRango(r.fecha, rango)), [reuniones, rango])
  const v = ventas(enPeriodo)

  return (
    <Pagina
      titulo="Ventas"
      sub="Cada videollamada de venta: si se presentó, cómo terminó, qué sentiste y qué aprendiste. Reemplaza el Sales Performance Tracker y la hoja de No Show."
      acciones={
        <>
          <SelectorPeriodo valor={p} onChange={setP} sinHoy />
          <Btn variante="primario" onClick={() => setEditar(nueva())}>
            <Plus size={15} /> Nueva cita
          </Btn>
        </>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi etiqueta="Agendadas" valor={fmt.n(v.agendadas)} sub={v.diasAnticipacion != null ? `a ${fmt.dec(v.diasAnticipacion)} días en promedio` : undefined} tono={v.diasAnticipacion != null && v.diasAnticipacion >= 3 ? 'alerta' : 'nada'} />
        <Kpi etiqueta="SUR · se presentaron" valor={fmt.pct(v.sur)} sub={`${v.presentadas} de ${v.pasadas}`} tono={evaluarU(v.sur, U.sur, v.pasadas)} muestra={{ n: v.pasadas, requerida: U.sur.muestra }} />
        <Kpi etiqueta="SCR · cerraste" valor={fmt.pct(v.scr)} sub={`${v.ganadas} de ${v.presentadas}`} tono={evaluarU(v.scr, U.scr, v.presentadas)} muestra={{ n: v.presentadas, requerida: U.scr.muestra }} />
        <Kpi etiqueta="En seguimiento" valor={fmt.n(v.seguimiento)} sub="presentadas sin decisión" />
        <Kpi etiqueta="Cerrado" valor={fmt.copCorto(v.facturado)} sub="monto de las ganadas" />
      </div>

      {porCerrar.length > 0 && (
        <Card className="mb-5 border-amber/30">
          <CardHead titulo={`${porCerrar.length} citas ya pasaron y no tienen resultado`} sub="Sin esto el SUR y el SCR mienten" icono={<CalendarClock size={15} className="text-amber" />} />
          <div className="space-y-2 px-5 pb-4">
            {porCerrar.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-2/60 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{r.nombre}</div>
                  <div className="text-xs text-faint">
                    {fmt.fecha(r.fecha, "EEE d MMM")} · {fmt.hora(r.fecha)}
                  </div>
                </div>
                <Btn chico onClick={() => setEditar({ ...r, estado: 'presentada' })}>
                  <CheckCircle2 size={13} className="text-green" /> Se presentó
                </Btn>
                <Btn chico onClick={() => actualizar('reuniones', r.id, { estado: 'no_show' })}>
                  <UserX size={13} className="text-red" /> No se presentó
                </Btn>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHead titulo="Próximas" icono={<Video size={15} />} />
          <div className="space-y-2 px-4 pb-4">
            {proximas.length === 0 && <div className="px-1 text-xs text-faint">No hay videollamadas agendadas.</div>}
            {proximas.map((r) => (
              <button key={r.id} onClick={() => setEditar(r)} className="w-full rounded-xl border border-line px-3 py-2.5 text-left transition hover:border-line-2">
                <div className="text-sm font-medium">{r.nombre}</div>
                <div className="text-xs text-muted first-letter:uppercase">
                  {fmt.fecha(r.fecha, "EEEE d MMM")} · {fmt.hora(r.fecha)}
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead titulo="Registro de llamadas de venta" sub={U.scr.muestra > v.presentadas ? `El SCR no dice nada antes de ${U.scr.muestra} llamadas hechas — «nadie domina esto antes de 100»` : undefined} />
          {enPeriodo.length === 0 ? (
            <Vacio icono={<Video size={20} />} titulo="Sin citas en el periodo" texto="Cuando una llamada termina en «Agendó cita», la cita aparece acá sola." />
          ) : (
            <Tabla>
              <thead>
                <tr>
                  <th className={th}>Fecha</th>
                  <th className={th}>Clínica</th>
                  <th className={th}>Fuente</th>
                  <th className={th}>Estado</th>
                  <th className={th}>Resultado</th>
                  <th className={th}>Monto</th>
                  <th className={th}>Emociones</th>
                </tr>
              </thead>
              <tbody>
                {enPeriodo
                  .slice()
                  .sort((a, b) => b.fecha.localeCompare(a.fecha))
                  .map((r) => (
                    <tr key={r.id} onClick={() => setEditar(r)} className="cursor-pointer hover:bg-surface-2/60">
                      <td className={cx(td, 'text-muted')}>{fmt.fecha(r.fecha)}</td>
                      <td className={cx(td, 'max-w-[220px] truncate font-medium')}>{r.nombre}</td>
                      <td className={cx(td, 'text-muted')}>{r.fuente}</td>
                      <td className={td}>
                        <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-semibold', ESTADO[r.estado].clase)}>{ESTADO[r.estado].texto}</span>
                      </td>
                      <td className={cx(td, 'font-semibold', r.resultado && RESULTADO[r.resultado].clase)}>{r.resultado ? RESULTADO[r.resultado].texto : '—'}</td>
                      <td className={cx(td, 'num')}>{r.monto ? fmt.copCorto(r.monto) : '—'}</td>
                      <td className={cx(td, 'max-w-[180px] truncate text-muted')}>{r.emociones || '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </Tabla>
          )}
        </Card>
      </div>

      {editar && <EditarReunion r={editar} onCerrar={() => setEditar(null)} />}
    </Pagina>
  )
}

function EditarReunion({ r: inicial, onCerrar }: { r: Partial<Reunion>; onCerrar: () => void }) {
  const [r, setR] = useState(inicial)
  const ajustes = useAjustes()
  const clientes = useTabla('clientes')
  const set = (c: Partial<Reunion>) => setR({ ...r, ...c })
  const fechaLocal = r.fecha ? new Date(r.fecha) : new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const dia = `${fechaLocal.getFullYear()}-${pad(fechaLocal.getMonth() + 1)}-${pad(fechaLocal.getDate())}`
  const hora = `${pad(fechaLocal.getHours())}:${pad(fechaLocal.getMinutes())}`
  const yaCliente = r.id && clientes.some((c) => c.lead_id && c.lead_id === r.lead_id)

  const guardar = () => {
    if (r.id) {
      const { id, ...resto } = r
      actualizar('reuniones', id, resto)
    } else insertar('reuniones', r)
    onCerrar()
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={r.id ? r.nombre || 'Cita' : 'Nueva cita'}
      ancho="max-w-2xl"
      pie={
        <>
          {r.id && (
            <Btn
              variante="fantasma"
              className="mr-auto text-red"
              onClick={() => {
                if (confirm('¿Borrar esta cita?')) {
                  borrar('reuniones', r.id!)
                  onCerrar()
                }
              }}
            >
              Borrar
            </Btn>
          )}
          {r.resultado === 'ganada' && !yaCliente && (
            <Btn
              onClick={() => {
                insertar('clientes', {
                  lead_id: r.lead_id ?? null,
                  nombre: r.nombre ?? '',
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
                })
                if (r.lead_id) actualizar('leads', r.lead_id, { estado: 'cliente' })
                guardar()
                avisar('🏆 Cliente creado. Ve a Clientes para el onboarding.', 'ok')
              }}
            >
              Guardar y crear cliente
            </Btn>
          )}
          <Btn variante="primario" onClick={guardar} disabled={!r.nombre}>
            Guardar
          </Btn>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Campo etiqueta="Clínica / persona" className="col-span-2">
          <Input value={r.nombre ?? ''} onChange={(e) => set({ nombre: e.target.value })} />
        </Campo>
        <Campo etiqueta="Día">
          <Input type="date" value={dia} onChange={(e) => set({ fecha: new Date(`${e.target.value}T${hora}`).toISOString() })} />
        </Campo>
        <Campo etiqueta="Hora">
          <Input type="time" value={hora} onChange={(e) => set({ fecha: new Date(`${dia}T${e.target.value}`).toISOString() })} />
        </Campo>
        <Campo etiqueta="Fuente">
          <Select value={r.fuente} onChange={(e) => set({ fuente: e.target.value })}>
            {['Llamada en frío', 'Pauta', 'WhatsApp', 'Referido', 'Orgánico', 'Red propia'].map((f) => (
              <option key={f}>{f}</option>
            ))}
          </Select>
        </Campo>
        <Campo etiqueta="Agendada el">
          <Input type="date" value={r.agendada_el ?? ''} onChange={(e) => set({ agendada_el: e.target.value })} />
        </Campo>
        <Campo etiqueta="Estado">
          <Select value={r.estado} onChange={(e) => set({ estado: e.target.value as EstadoReunion })}>
            {Object.entries(ESTADO).map(([k, v]) => (
              <option key={k} value={k}>
                {v.texto}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo etiqueta="Resultado">
          <Select value={r.resultado ?? ''} onChange={(e) => set({ resultado: (e.target.value || null) as ResultadoVenta })} disabled={r.estado !== 'presentada'}>
            <option value="">—</option>
            <option value="ganada">Ganada</option>
            <option value="perdida">Perdida</option>
            <option value="seguimiento">Seguimiento</option>
          </Select>
        </Campo>
      </div>

      {r.estado === 'presentada' && (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Campo etiqueta="Oferta / precio presentado" className="col-span-2">
            <Input value={r.oferta ?? ''} onChange={(e) => set({ oferta: e.target.value })} placeholder="Setup $1M + $300k/paciente" />
          </Campo>
          <Campo etiqueta="Monto cerrado">
            <Num value={r.monto} onChange={(n) => set({ monto: n })} />
          </Campo>
          <Campo etiqueta="Duración (min)" ayuda="45-60 es lo sano (4.5)">
            <Num value={r.duracion_min} onChange={(n) => set({ duracion_min: n })} />
          </Campo>
          <Campo etiqueta="Grabación" className="col-span-2">
            <Input value={r.grabacion ?? ''} onChange={(e) => set({ grabacion: e.target.value })} placeholder="Link de Drive / Loom" />
          </Campo>
          <Campo etiqueta="Mis emociones" className="col-span-2">
            <Input value={r.emociones ?? ''} onChange={(e) => set({ emociones: e.target.value })} placeholder="Optimista, nervioso, frustrado…" />
          </Campo>
          <Campo etiqueta="Objeción principal" className="col-span-2">
            <Input value={r.objecion ?? ''} onChange={(e) => set({ objecion: e.target.value })} />
          </Campo>
          <Campo etiqueta="Conclusión" className="col-span-2">
            <Input value={r.conclusion ?? ''} onChange={(e) => set({ conclusion: e.target.value })} placeholder="Qué aprendí de esta llamada" />
          </Campo>
        </div>
      )}
      <Campo etiqueta="Notas" className="mt-4">
        <Area value={r.notas ?? ''} onChange={(e) => set({ notas: e.target.value })} />
      </Campo>
      {r.estado === 'presentada' && r.grabacion && (
        <a href={r.grabacion} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-blue-2 underline">
          Abrir grabación
        </a>
      )}
      {r.estado === 'agendada' && <Pill tono="muestra" className="mt-3">Recuerda: confirmación + recordatorio (post schedule workflow)</Pill>}
      {r.lead_id && <Badge className="mt-3 ml-2">ligada a un prospecto</Badge>}
    </Modal>
  )
}
