import { MapPin, MessageCircle, Phone, SkipForward, Star, Stethoscope, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { RegistroLlamada } from '../components/RegistroLlamada'
import { Badge, Barra, Btn, Card, cx, Pagina, Segmento, Select, Vacio } from '../components/ui'
import { armarCola, indexarLlamadas, MOTIVO } from '../lib/cola'
import { RES } from '../lib/doctrina'
import { diaLocal, fmt, hoyISO, waLink } from '../lib/format'
import { embudoLlamadas } from '../lib/metricas'
import { guardarAjustes, useAjustes, useTabla } from '../lib/store'

export default function Llamar() {
  const leads = useTabla('leads')
  const llamadas = useTabla('llamadas')
  const ajustes = useAjustes()
  const [ciudad, setCiudad] = useState('')
  const [prio, setPrio] = useState<string>('todas')
  const [saltados, setSaltados] = useState<string[]>([])

  const idx = useMemo(() => indexarLlamadas(llamadas), [llamadas])
  const ciudades = useMemo(() => [...new Set(leads.map((l) => l.ciudad).filter(Boolean))].sort(), [leads])
  const cola = useMemo(
    () =>
      armarCola(leads, idx, {
        ciudad: ciudad || undefined,
        prioridades: prio === 'todas' ? undefined : prio === 'AB' ? ['A', 'B'] : [prio],
      }).filter((c) => !saltados.includes(c.lead.id)),
    [leads, idx, ciudad, prio, saltados],
  )

  const hoy = hoyISO()
  const deHoy = useMemo(() => llamadas.filter((l) => diaLocal(l.fecha) === hoy), [llamadas, hoy])
  const e = embudoLlamadas(deHoy)
  const actual = cola[0]

  return (
    <Pagina
      titulo="Llamar"
      sub="La cola en orden: callbacks vencidos, los de hoy, la lista de arriba hacia abajo y los reintentos. Cada intento queda registrado y las métricas se calculan solas."
      acciones={
        <>
          <Select value={ciudad} onChange={(ev) => setCiudad(ev.target.value)} className="w-40">
            <option value="">Todas las ciudades</option>
            {ciudades.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Segmento
            valor={prio}
            onChange={setPrio}
            opciones={[
              { valor: 'todas', etiqueta: 'Todas' },
              { valor: 'AB', etiqueta: 'A+B' },
              { valor: 'A', etiqueta: 'A' },
            ]}
          />
        </>
      }
    >
      {/* Marcador de hoy */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="col-span-2 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium text-muted">Marcadas hoy</span>
            <span className="text-xs text-faint">meta {ajustes.meta_llamadas_dia}</span>
          </div>
          <div className="num mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-semibold">{e.marcadas}</span>
            <span className="text-sm text-muted">/ {ajustes.meta_llamadas_dia}</span>
          </div>
          <Barra className="mt-3" valor={e.marcadas} max={ajustes.meta_llamadas_dia} color={e.marcadas >= ajustes.meta_llamadas_dia ? 'var(--green)' : 'var(--blue)'} />
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium text-muted">Llegó al doctor</div>
          <div className="num mt-1 text-3xl font-semibold text-violet">{e.decisor}</div>
          <div className="text-xs text-faint">{fmt.pct(e.pr)} de las marcadas</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium text-muted">Citas hoy</div>
          <div className="num mt-1 text-3xl font-semibold text-green">{e.citas}</div>
          <div className="text-xs text-faint">ABR {fmt.pct(e.abr)}</div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div>
          {!actual ? (
            <Card>
              <Vacio
                icono={<Phone size={20} />}
                titulo={leads.length ? 'La cola está vacía por hoy' : 'Todavía no hay prospectos'}
                texto={
                  leads.length
                    ? 'Todo lo que se podía llamar hoy ya tiene intento, o está esperando su callback. Carga una lista nueva o cambia el filtro.'
                    : 'Importa tu Excel de leads (Medellín, Pasto…) y la cola se arma sola.'
                }
                accion={
                  <Link to="/prospectos">
                    <Btn variante="primario">Ir a Prospectos</Btn>
                  </Link>
                }
              />
            </Card>
          ) : (
            <Card className="overflow-hidden" key={actual.lead.id}>
              <div className="border-b border-line bg-gradient-to-br from-blue-soft to-transparent p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-semibold', MOTIVO[actual.motivo].clase)}>
                    {MOTIVO[actual.motivo].texto}
                    {actual.lead.callback && ` · ${fmt.fecha(actual.lead.callback)}${actual.lead.callback_hora ? ' ' + actual.lead.callback_hora : ''}`}
                  </span>
                  <Badge>Intento {actual.info.intentos.length + 1}</Badge>
                  {actual.lead.prioridad && <Badge>Prioridad {actual.lead.prioridad}</Badge>}
                  <span className="ml-auto text-xs text-faint">{cola.length} en cola</span>
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">{actual.lead.clinica}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                  {actual.lead.rating != null && (
                    <span className="flex items-center gap-1">
                      <Star size={13} className="fill-amber text-amber" /> {actual.lead.rating} · {fmt.n(actual.lead.resenas)} reseñas
                    </span>
                  )}
                  {actual.lead.categoria && <span>{actual.lead.categoria}</span>}
                  {(actual.lead.zona || actual.lead.ciudad) && (
                    <span className="flex items-center gap-1">
                      <MapPin size={13} /> {[actual.lead.zona, actual.lead.ciudad].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={`tel:${actual.lead.telefono.replace(/\s/g, '')}`}>
                    <Btn variante="primario" className="h-12 px-5 text-base">
                      <Phone size={18} /> {actual.lead.telefono || 'Sin teléfono'}
                    </Btn>
                  </a>
                  {actual.lead.cel_doctor && (
                    <a href={`tel:${actual.lead.cel_doctor.replace(/\s/g, '')}`}>
                      <Btn className="h-12">
                        <Stethoscope size={16} /> Directo: {actual.lead.cel_doctor}
                      </Btn>
                    </a>
                  )}
                  {waLink(actual.lead.cel_doctor || actual.lead.telefono) && (
                    <a href={waLink(actual.lead.cel_doctor || actual.lead.telefono)!} target="_blank" rel="noreferrer">
                      <Btn className="h-12">
                        <MessageCircle size={16} /> WhatsApp
                      </Btn>
                    </a>
                  )}
                </div>

                {(actual.lead.doctor || actual.lead.recepcionista) && (
                  <div className="mt-4 flex flex-wrap gap-4 text-sm">
                    {actual.lead.doctor && (
                      <span className="flex items-center gap-1.5">
                        <Stethoscope size={14} className="text-violet" /> Pregunta por <b>{actual.lead.doctor}</b>
                      </span>
                    )}
                    {actual.lead.recepcionista && (
                      <span className="flex items-center gap-1.5 text-muted">
                        <UserRound size={14} /> Recepción: {actual.lead.recepcionista}
                      </span>
                    )}
                  </div>
                )}
                {actual.lead.notas && <p className="mt-3 text-sm text-muted">📝 {actual.lead.notas}</p>}
              </div>

              <div className="p-5">
                <RegistroLlamada lead={actual.lead} onListo={() => undefined} atajos />
                <div className="mt-4 flex items-center justify-between">
                  <span className="hidden text-[11px] text-faint md:block">Atajos: teclas 1 a 7</span>
                  <Btn variante="fantasma" chico onClick={() => setSaltados((s) => [...s, actual.lead.id])}>
                    <SkipForward size={14} /> Saltar por ahora
                  </Btn>
                </div>
              </div>

              {actual.info.intentos.length > 0 && (
                <div className="border-t border-line px-5 py-4">
                  <div className="mb-2 text-[11px] font-semibold tracking-wide text-faint uppercase">Intentos anteriores</div>
                  <div className="space-y-1.5">
                    {actual.info.intentos.map((l) => (
                      <div key={l.id} className="flex items-center gap-3 text-sm">
                        <span className="w-28 text-xs text-faint">
                          {fmt.fecha(l.fecha)} · {fmt.hora(l.fecha)}
                        </span>
                        <span>{RES[l.resultado].nombre}</span>
                        {l.nota && <span className="truncate text-xs text-muted">— {l.nota}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Lado derecho: guion y siguientes */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="mb-2 text-xs font-medium text-muted">Guion activo</div>
            <Segmento
              valor={ajustes.guion_activo}
              onChange={(v) => guardarAjustes({ guion_activo: v })}
              opciones={[
                { valor: 'charlie', etiqueta: 'Charlie' },
                { valor: 'hunter', etiqueta: 'Hunter Larson' },
              ]}
            />
            <p className="mt-2 text-[11px] text-faint">Cada intento guarda con qué guion se hizo. Alternarlos hace que las conversaciones no midan nada.</p>
          </Card>
          <Card className="p-4">
            <div className="mb-3 text-xs font-medium text-muted">Siguen en la cola</div>
            <div className="space-y-2">
              {cola.slice(1, 7).map((c) => (
                <div key={c.lead.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{c.lead.clinica}</span>
                  <span className={cx('shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold', MOTIVO[c.motivo].clase)}>{MOTIVO[c.motivo].texto}</span>
                </div>
              ))}
              {cola.length <= 1 && <div className="text-xs text-faint">Nada más por ahora.</div>}
            </div>
          </Card>
        </div>
      </div>
    </Pagina>
  )
}
