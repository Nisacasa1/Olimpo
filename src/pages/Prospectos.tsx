import { Download, FileSpreadsheet, Phone, Plus, Search, Trash2, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { RegistroLlamada } from '../components/RegistroLlamada'
import { Area, Badge, Btn, Campo, Card, cx, Input, Modal, Num, Pagina, Segmento, Select, Tabla, td, th, Vacio } from '../components/ui'
import { indexarLlamadas, infoLead } from '../lib/cola'
import { RES } from '../lib/doctrina'
import { fmt, hoyISO } from '../lib/format'
import { ciudadDesdeArchivo, exportarExcel, leerExcel, type Previa } from '../lib/importar'
import { actualizar, avisar, borrar, insertar, useTabla } from '../lib/store'
import type { EstadoLead, Lead } from '../lib/types'

const ESTADOS: { valor: EstadoLead | 'todos'; etiqueta: string }[] = [
  { valor: 'activo', etiqueta: 'Activos' },
  { valor: 'no_interesado', etiqueta: 'No interesados' },
  { valor: 'fuera_de_tramo', etiqueta: 'Fuera de tramo' },
  { valor: 'cliente', etiqueta: 'Clientes' },
  { valor: 'todos', etiqueta: 'Todos' },
]

const leadVacio = (): Partial<Lead> => ({
  clinica: '',
  telefono: '',
  prioridad: 'A',
  resenas: null,
  rating: null,
  categoria: 'Clínica dental',
  direccion: '',
  ciudad: '',
  zona: '',
  recepcionista: '',
  doctor: '',
  cel_doctor: '',
  email: '',
  estado: 'activo',
  callback: null,
  callback_hora: '',
  notas: '',
  fuente: 'manual',
})

export default function Prospectos() {
  const leads = useTabla('leads')
  const llamadas = useTabla('llamadas')
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState<EstadoLead | 'todos'>('activo')
  const [ciudad, setCiudad] = useState('')
  const [abierto, setAbierto] = useState<string | null>(null)
  const [nuevo, setNuevo] = useState<Partial<Lead> | null>(null)
  const [importar, setImportar] = useState(false)
  const [limite, setLimite] = useState(80)

  const idx = useMemo(() => indexarLlamadas(llamadas), [llamadas])
  const ciudades = useMemo(() => [...new Set(leads.map((l) => l.ciudad).filter(Boolean))].sort(), [leads])
  const hoy = hoyISO()

  const filtrados = useMemo(() => {
    const t = q.toLowerCase()
    return leads.filter(
      (l) =>
        (estado === 'todos' || l.estado === estado) &&
        (!ciudad || l.ciudad === ciudad) &&
        (!t || [l.clinica, l.telefono, l.doctor, l.zona, l.notas].some((x) => x?.toLowerCase().includes(t))),
    )
  }, [leads, q, estado, ciudad])

  const conteo = useMemo(() => {
    const activos = leads.filter((l) => l.estado === 'activo')
    let sinTocar = 0,
      vencidos = 0
    for (const l of activos) {
      if (!idx.get(l.id)?.length) sinTocar++
      if (l.callback && l.callback < hoy) vencidos++
    }
    return {
      total: leads.length,
      activos: activos.length,
      sinTocar,
      vencidos,
      conDoctor: leads.filter((l) => l.doctor).length,
    }
  }, [leads, idx, hoy])

  const leadAbierto = leads.find((l) => l.id === abierto)

  return (
    <Pagina
      titulo="Prospectos"
      sub="Una fila por clínica. Reemplaza la hoja de Leads, el CRM de ejemplo y la lista del 100 Dial Challenge."
      acciones={
        <>
          <Btn onClick={() => setImportar(true)}>
            <Upload size={15} /> Importar Excel
          </Btn>
          <Btn
            onClick={() =>
              exportarExcel(`prospectos-${hoy}.xlsx`, {
                Prospectos: filtrados.map(({ id: _id, created_at: _c, ...r }) => ({ ...r, intentos: idx.get(_id)?.length ?? 0 })),
              })
            }
          >
            <Download size={15} /> Exportar
          </Btn>
          <Btn variante="primario" onClick={() => setNuevo(leadVacio())}>
            <Plus size={15} /> Nuevo
          </Btn>
        </>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ['En la lista', conteo.total],
          ['Activos', conteo.activos],
          ['Sin tocar', conteo.sinTocar],
          ['Callbacks vencidos', conteo.vencidos],
          ['Con nombre del doctor', conteo.conDoctor],
        ].map(([k, v]) => (
          <Card key={k} className="px-4 py-3">
            <div className="text-[11px] text-muted">{k}</div>
            <div className={cx('num text-xl font-semibold', k === 'Callbacks vencidos' && Number(v) > 0 && 'text-red')}>{fmt.n(Number(v))}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
            <Input className="pl-9" placeholder="Buscar clínica, teléfono, doctor, barrio…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={ciudad} onChange={(e) => setCiudad(e.target.value)} className="w-44">
            <option value="">Todas las ciudades</option>
            {ciudades.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Segmento valor={estado} onChange={setEstado} opciones={ESTADOS} className="overflow-x-auto" />
        </div>

        {filtrados.length === 0 ? (
          <Vacio
            icono={<FileSpreadsheet size={20} />}
            titulo={leads.length ? 'Nada coincide con el filtro' : 'Todavía no hay prospectos'}
            texto={leads.length ? undefined : 'Importa tus hojas de Leads de Medellín o Pasto. La app reconoce las dos plantillas, salta duplicados por teléfono y trae los intentos que ya estén anotados.'}
            accion={!leads.length && <Btn variante="primario" onClick={() => setImportar(true)}><Upload size={15} /> Importar Excel</Btn>}
          />
        ) : (
          <Tabla className="max-h-[65vh]">
            <thead>
              <tr>
                <th className={th}>Clínica</th>
                <th className={th}>Teléfono</th>
                <th className={th}>Prio</th>
                <th className={th}>Reseñas</th>
                <th className={th}>Zona</th>
                <th className={th}>Doctor</th>
                <th className={th}>Intentos</th>
                <th className={th}>Último</th>
                <th className={th}>Callback</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.slice(0, limite).map((l) => {
                const info = infoLead(idx.get(l.id))
                return (
                  <tr key={l.id} onClick={() => setAbierto(l.id)} className="cursor-pointer transition hover:bg-surface-2/60">
                    <td className={cx(td, 'max-w-[260px] truncate font-medium')}>{l.clinica}</td>
                    <td className={cx(td, 'num text-muted')}>{l.telefono}</td>
                    <td className={td}>{l.prioridad && <Badge>{l.prioridad}</Badge>}</td>
                    <td className={cx(td, 'num text-muted')}>{l.resenas != null ? `${l.resenas} · ${l.rating ?? '—'}★` : '—'}</td>
                    <td className={cx(td, 'max-w-[160px] truncate text-muted')}>{l.zona || l.ciudad}</td>
                    <td className={cx(td, 'max-w-[160px] truncate')}>{l.doctor || <span className="text-faint">—</span>}</td>
                    <td className={td}>
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <span key={i} className={cx('size-2 rounded-full', i < info.intentos.length ? (info.decisor ? 'bg-violet' : 'bg-blue') : 'bg-surface-2')} />
                        ))}
                      </div>
                    </td>
                    <td className={cx(td, 'text-muted')}>{info.ultimo ? RES[info.ultimo.resultado].nombre : <span className="text-faint">—</span>}</td>
                    <td className={cx(td, l.callback && l.callback < hoy ? 'text-red' : l.callback === hoy ? 'text-amber' : 'text-muted')}>
                      {l.callback ? fmt.fecha(l.callback) + (l.callback_hora ? ' ' + l.callback_hora : '') : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Tabla>
        )}
        {filtrados.length > limite && (
          <div className="border-t border-line p-3 text-center">
            <Btn variante="fantasma" chico onClick={() => setLimite((x) => x + 200)}>
              Mostrar más ({filtrados.length - limite} restantes)
            </Btn>
          </div>
        )}
      </Card>

      {leadAbierto && <DetalleLead lead={leadAbierto} onCerrar={() => setAbierto(null)} />}
      {nuevo && (
        <Modal
          abierto
          onCerrar={() => setNuevo(null)}
          titulo="Nuevo prospecto"
          pie={
            <Btn
              variante="primario"
              disabled={!nuevo.clinica}
              onClick={() => {
                insertar('leads', nuevo)
                setNuevo(null)
              }}
            >
              Guardar
            </Btn>
          }
        >
          <FormLead lead={nuevo} onChange={(c) => setNuevo({ ...nuevo, ...c })} />
        </Modal>
      )}
      <ImportarModal abierto={importar} onCerrar={() => setImportar(false)} />
    </Pagina>
  )
}

function FormLead({ lead, onChange }: { lead: Partial<Lead>; onChange: (c: Partial<Lead>) => void }) {
  const t = (k: keyof Lead) => ({ value: (lead[k] as string) ?? '', onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange({ [k]: e.target.value }) })
  return (
    <div className="grid grid-cols-2 gap-3">
      <Campo etiqueta="Clínica" className="col-span-2">
        <Input {...t('clinica')} />
      </Campo>
      <Campo etiqueta="Teléfono">
        <Input {...t('telefono')} />
      </Campo>
      <Campo etiqueta="Prioridad">
        <Select value={lead.prioridad ?? ''} onChange={(e) => onChange({ prioridad: (e.target.value || null) as Lead['prioridad'] })}>
          <option value="A">A · 20+ reseñas</option>
          <option value="B">B · 5 a 19</option>
          <option value="C">C · 1 a 4</option>
          <option value="D">D · sin reseñas</option>
        </Select>
      </Campo>
      <Campo etiqueta="Doctor">
        <Input {...t('doctor')} />
      </Campo>
      <Campo etiqueta="Cel. doctor">
        <Input {...t('cel_doctor')} />
      </Campo>
      <Campo etiqueta="Recepcionista">
        <Input {...t('recepcionista')} />
      </Campo>
      <Campo etiqueta="Email">
        <Input {...t('email')} />
      </Campo>
      <Campo etiqueta="Ciudad">
        <Input {...t('ciudad')} />
      </Campo>
      <Campo etiqueta="Zona / barrio">
        <Input {...t('zona')} />
      </Campo>
      <Campo etiqueta="Reseñas">
        <Num value={lead.resenas} onChange={(n) => onChange({ resenas: n })} />
      </Campo>
      <Campo etiqueta="Rating">
        <Num value={lead.rating} onChange={(n) => onChange({ rating: n })} step="0.1" />
      </Campo>
      <Campo etiqueta="Dirección" className="col-span-2">
        <Input {...t('direccion')} />
      </Campo>
      <Campo etiqueta="Callback">
        <Input type="date" value={lead.callback ?? ''} onChange={(e) => onChange({ callback: e.target.value || null })} />
      </Campo>
      <Campo etiqueta="Hora del callback">
        <Input type="time" value={lead.callback_hora ?? ''} onChange={(e) => onChange({ callback_hora: e.target.value })} />
      </Campo>
      <Campo etiqueta="Notas" className="col-span-2">
        <Area value={lead.notas ?? ''} onChange={(e) => onChange({ notas: e.target.value })} />
      </Campo>
    </div>
  )
}

function DetalleLead({ lead, onCerrar }: { lead: Lead; onCerrar: () => void }) {
  const llamadas = useTabla('llamadas')
  const intentos = useMemo(() => llamadas.filter((l) => l.lead_id === lead.id).sort((a, b) => b.fecha.localeCompare(a.fecha)), [llamadas, lead.id])
  const [tab, setTab] = useState<'llamada' | 'datos'>('llamada')
  return (
    <Modal abierto onCerrar={onCerrar} titulo={lead.clinica} ancho="max-w-2xl">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <a href={`tel:${lead.telefono.replace(/\s/g, '')}`}>
          <Btn variante="primario" chico>
            <Phone size={14} /> {lead.telefono}
          </Btn>
        </a>
        <Select value={lead.estado} onChange={(e) => actualizar('leads', lead.id, { estado: e.target.value as EstadoLead })} className="h-8 w-44 text-xs">
          {ESTADOS.filter((e) => e.valor !== 'todos').map((e) => (
            <option key={e.valor} value={e.valor}>
              {e.etiqueta.replace(/s$/, '')}
            </option>
          ))}
        </Select>
        <Segmento
          className="ml-auto"
          valor={tab}
          onChange={setTab}
          opciones={[
            { valor: 'llamada', etiqueta: 'Registrar intento' },
            { valor: 'datos', etiqueta: 'Datos' },
          ]}
        />
      </div>

      {tab === 'llamada' ? <RegistroLlamada lead={lead} onListo={() => avisar('Intento guardado', 'ok')} /> : <FormLead lead={lead} onChange={(c) => actualizar('leads', lead.id, c)} />}

      <div className="mt-5">
        <div className="mb-2 text-[11px] font-semibold tracking-wide text-faint uppercase">Historial · {intentos.length} intentos</div>
        {intentos.length === 0 && <div className="text-xs text-faint">Sin intentos todavía.</div>}
        <div className="space-y-1">
          {intentos.map((l) => (
            <div key={l.id} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2">
              <span className="w-32 text-xs text-faint">
                {fmt.fecha(l.fecha)} · {fmt.hora(l.fecha)}
              </span>
              <span className="font-medium">{RES[l.resultado].nombre}</span>
              {l.guion && <Badge>{l.guion}</Badge>}
              <span className="flex-1 truncate text-xs text-muted">{[l.objecion, l.nota].filter(Boolean).join(' · ')}</span>
              <button onClick={() => borrar('llamadas', l.id)} className="text-faint opacity-0 transition group-hover:opacity-100 hover:text-red" title="Borrar intento">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-end border-t border-line pt-4">
        <Btn
          variante="peligro"
          chico
          onClick={() => {
            if (!confirm(`¿Borrar ${lead.clinica} y sus ${intentos.length} intentos?`)) return
            borrar('llamadas', intentos.map((i) => i.id))
            borrar('leads', lead.id)
            onCerrar()
          }}
        >
          <Trash2 size={13} /> Borrar prospecto
        </Btn>
      </div>
    </Modal>
  )
}

function ImportarModal({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const leads = useTabla('leads')
  const ref = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [ciudad, setCiudad] = useState('')
  const [previa, setPrevia] = useState<Previa | null>(null)
  const [error, setError] = useState('')

  const leer = async (f: File, c: string) => {
    setError('')
    try {
      setPrevia(await leerExcel(f, leads, c))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el archivo')
    }
  }

  const cerrar = () => {
    setArchivo(null)
    setPrevia(null)
    setCiudad('')
    onCerrar()
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      titulo="Importar Excel de leads"
      pie={
        previa && (
          <Btn
            variante="primario"
            disabled={!previa.leads.length}
            onClick={() => {
              insertar('leads', previa.leads)
              if (previa.llamadas.length) insertar('llamadas', previa.llamadas)
              avisar(`Importados ${previa.leads.length} prospectos${previa.llamadas.length ? ` y ${previa.llamadas.length} intentos` : ''}`, 'ok')
              cerrar()
            }}
          >
            Importar {previa.leads.length}
          </Btn>
        )
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Reconoce tus plantillas de Leads (Medellín, Pasto, la PLANTILLA y el Definitivo). Lee las pestañas <b>Prospects</b>, <b>Not Interested</b> y <b>Fuera de tramo</b>, salta los teléfonos repetidos y trae los intentos
          con fecha y resultado.
        </p>
        <input
          ref={ref}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (!f) return
            const c = ciudadDesdeArchivo(f.name)
            setArchivo(f)
            setCiudad(c)
            void leer(f, c)
          }}
        />
        <Btn onClick={() => ref.current?.click()} className="w-full">
          <FileSpreadsheet size={16} /> {archivo ? archivo.name : 'Elegir archivo .xlsx'}
        </Btn>
        {archivo && (
          <Campo etiqueta="Ciudad (cuando la hoja no la trae)">
            <Input
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              onBlur={() => archivo && void leer(archivo, ciudad)}
              placeholder="Medellín"
            />
          </Campo>
        )}
        {error && <p className="text-sm text-red">{error}</p>}
        {previa && (
          <Card className="space-y-1 p-4 text-sm">
            {Object.entries(previa.porPestana).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-muted">{k}</span>
                <span className="num font-semibold">{v}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-line pt-1">
              <span className="text-muted">Intentos con resultado</span>
              <span className="num font-semibold">{previa.llamadas.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Duplicados que se saltan</span>
              <span className="num font-semibold">{previa.duplicados}</span>
            </div>
          </Card>
        )}
      </div>
    </Modal>
  )
}
