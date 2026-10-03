import { CalendarPlus, MessageCircle, Plus, Trash2, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ChipLinea, type FiltroLinea } from '../../pages/Contenido'
import { ETAPAS_PERSONA, LINEAS } from '../../lib/contenido'
import { fmt, hoyISO } from '../../lib/format'
import { actualizar, avisar, borrar, insertar, useTabla } from '../../lib/store'
import type { EtapaPersona, Linea, Persona, Pieza } from '../../lib/types'
import { Area, Btn, Campo, Card, cx, Input, Modal, Select, Vacio } from '../ui'

const vacia = (pieza?: Pieza): Partial<Persona> => ({ nombre: '', usuario: '', plataforma: pieza?.plataformas?.[0] ?? 'Instagram', pieza_id: pieza?.id ?? null, linea: pieza?.linea ?? 'agencia', disparador: '', etapa: 'conversando', siguiente_paso: '', siguiente_fecha: null, notas: '' })

export function Personas({ linea }: { linea: FiltroLinea }) {
  const personas = useTabla('personas')
  const [editar, setEditar] = useState<Partial<Persona> | null>(null)
  const hoy = hoyISO()
  const visibles = useMemo(() => personas.filter((p) => linea === 'todas' || p.linea === linea), [personas, linea])
  if (!personas.length)
    return (
      <Card>
        <Vacio
          icono={<Users size={20} />}
          titulo="Nadie registrado todavía"
          texto="Cada vez que alguien te escriba por un contenido, regístralo con la pieza que lo trajo y lo que dijo en sus palabras. Eso es atribución real: qué contenido trae clientes."
          accion={
            <Btn variante="primario" onClick={() => setEditar(vacia())}>
              <Plus size={14} /> Persona
            </Btn>
          }
        />
        {editar && <EditarPersona p={editar} onCerrar={() => setEditar(null)} />}
      </Card>
    )
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Btn variante="primario" onClick={() => setEditar(vacia())}>
          <Plus size={14} /> Persona
        </Btn>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {ETAPAS_PERSONA.map((e) => {
          const xs = visibles.filter((p) => p.etapa === e.k).sort((a, b) => (a.siguiente_fecha ?? '9').localeCompare(b.siguiente_fecha ?? '9'))
          return (
            <div key={e.k} className="rounded-2xl border border-line bg-surface/50 p-2">
              <div className="px-2 pt-1 pb-2 text-sm font-semibold">
                {e.n} <span className="num text-xs text-faint">{xs.length}</span>
              </div>
              <div className="space-y-2">
                {xs.map((p) => (
                  <button key={p.id} onClick={() => setEditar(p)} className="w-full rounded-xl border border-line bg-surface p-3 text-left hover:border-line-2">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.nombre}</span>
                      <ChipLinea linea={p.linea} />
                    </div>
                    {p.disparador && <div className="mt-1 line-clamp-2 text-[11px] text-muted italic">«{p.disparador}»</div>}
                    {p.siguiente_paso && (
                      <div className={cx('mt-1.5 text-[11px]', p.siguiente_fecha && p.siguiente_fecha < hoy ? 'text-red' : p.siguiente_fecha === hoy ? 'text-amber' : 'text-faint')}>
                        → {p.siguiente_paso}
                        {p.siguiente_fecha ? ` · ${fmt.fecha(p.siguiente_fecha)}` : ''}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      {editar && <EditarPersona p={editar} onCerrar={() => setEditar(null)} />}
    </div>
  )
}

export function NuevaPersona({ pieza, onCerrar }: { pieza: Pieza; onCerrar: () => void }) {
  return <EditarPersona p={vacia(pieza)} onCerrar={onCerrar} />
}

function EditarPersona({ p: inicial, onCerrar }: { p: Partial<Persona>; onCerrar: () => void }) {
  const [p, setP] = useState(inicial)
  const piezas = useTabla('piezas')
  const set = (c: Partial<Persona>) => setP({ ...p, ...c })
  const guardar = () => {
    if (p.id) {
      const { id, ...r } = p
      actualizar('personas', id, r)
    } else insertar('personas', p)
    onCerrar()
  }
  const agendar = () => {
    insertar('reuniones', { lead_id: null, nombre: p.nombre ?? '', fecha: new Date(Date.now() + 86400000).toISOString(), agendada_el: hoyISO(), fuente: 'Orgánico', estado: 'agendada', resultado: null, oferta: '', monto: null, duracion_min: null, grabacion: '', emociones: '', objecion: '', conclusion: '', notas: `Llegó por contenido: «${p.disparador ?? ''}»` })
    setP({ ...p, etapa: 'cita' })
    avisar('Cita creada en Ventas como «Orgánico». Ajusta el día y la hora allá.', 'ok')
  }
  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={p.id ? p.nombre : 'Persona nueva'}
      pie={
        <>
          {p.id && (
            <Btn
              variante="fantasma"
              className="mr-auto text-red"
              onClick={() => {
                borrar('personas', p.id!)
                onCerrar()
              }}
            >
              <Trash2 size={14} />
            </Btn>
          )}
          {p.etapa !== 'cita' && p.etapa !== 'cliente' && p.nombre && (
            <Btn onClick={agendar}>
              <CalendarPlus size={14} /> Agendar llamada
            </Btn>
          )}
          <Btn variante="primario" onClick={guardar} disabled={!p.nombre}>
            Guardar
          </Btn>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Nombre">
          <Input value={p.nombre} onChange={(e) => set({ nombre: e.target.value })} />
        </Campo>
        <Campo etiqueta="Usuario / teléfono">
          <Input value={p.usuario} onChange={(e) => set({ usuario: e.target.value })} placeholder="@usuario" />
        </Campo>
        <Campo etiqueta="Por dónde escribió">
          <Select value={p.plataforma} onChange={(e) => set({ plataforma: e.target.value })}>
            {['Instagram', 'TikTok', 'YouTube Shorts', 'WhatsApp', 'Otro'].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        </Campo>
        <Campo etiqueta="Línea">
          <Select value={p.linea} onChange={(e) => set({ linea: e.target.value as Linea })}>
            {LINEAS.map((l) => (
              <option key={l.k} value={l.k}>
                {l.n}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo etiqueta="La pieza que lo trajo" className="col-span-2">
          <Select value={p.pieza_id ?? ''} onChange={(e) => set({ pieza_id: e.target.value || null })}>
            <option value="">— no sé / otra</option>
            {piezas
              .slice()
              .sort((a, b) => b.publicado.localeCompare(a.publicado))
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {fmt.fecha(x.publicado)} · {x.titulo}
                </option>
              ))}
          </Select>
        </Campo>
        <Campo etiqueta="Qué le hizo escribir, en sus palabras" className="col-span-2" ayuda="Esto alimenta la ideación: es voz real del cliente">
          <Area rows={2} value={p.disparador} onChange={(e) => set({ disparador: e.target.value })} />
        </Campo>
        <Campo etiqueta="Etapa">
          <Select value={p.etapa} onChange={(e) => set({ etapa: e.target.value as EtapaPersona })}>
            {ETAPAS_PERSONA.map((x) => (
              <option key={x.k} value={x.k}>
                {x.n}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo etiqueta="Siguiente paso el">
          <Input type="date" value={p.siguiente_fecha ?? ''} onChange={(e) => set({ siguiente_fecha: e.target.value || null })} />
        </Campo>
        <Campo etiqueta="Siguiente paso" className="col-span-2">
          <Input value={p.siguiente_paso} onChange={(e) => set({ siguiente_paso: e.target.value })} placeholder="Mandarle el caso, preguntarle por su agenda…" />
        </Campo>
        <Campo etiqueta="Notas" className="col-span-2">
          <Area rows={2} value={p.notas} onChange={(e) => set({ notas: e.target.value })} />
        </Campo>
        {p.usuario && /\d{7,}/.test(p.usuario) && (
          <a className="col-span-2 flex items-center gap-1.5 text-xs text-blue-2 hover:underline" href={`https://wa.me/57${p.usuario.replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noreferrer">
            <MessageCircle size={13} /> Abrir WhatsApp
          </a>
        )}
      </div>
    </Modal>
  )
}
