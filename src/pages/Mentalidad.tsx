import { addDays, differenceInCalendarDays, format, parseISO, subDays } from 'date-fns'
import { AlertTriangle, BookOpen, Check as CheckIcon, ChevronLeft, ChevronRight, Flame, Moon, Pencil, Quote, Sun, Upload, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Area, Badge, Barra, Btn, Card, CardHead, Check, cx, Input, Kpi, Modal, Pagina, Pill, Segmento, Select, Vacio } from '../components/ui'
import { diaLocal, fmt, hoyISO } from '../lib/format'
import { indiceDelDia, importarArchivo, ITEMS_RITUAL, lecturaCompleta, RITUAL, useSemana2, type Documento, type EstadoEjercicio, type Modulo, type Semana2 } from '../lib/semana2'
import { actualizar, avisar, borrar, insertar, useAjustes, useTabla } from '../lib/store'
import type { Dia } from '../lib/types'

type Tab = 'hoy' | 'documento' | 'semana' | 'ejercicios' | 'resistencia'

export default function Mentalidad() {
  const s = useSemana2()
  const [tab, setTab] = useState<Tab>('hoy')

  if (s.estado === 'cargando') return <Pagina titulo="Mentalidad">{null}</Pagina>
  if (!s.doctrina) return <SinContenido />

  return (
    <Pagina
      titulo="Mentalidad"
      sub="Semana 2 · Self Transcendence. Tu ritual, tu documento, los 8 módulos y los ejercicios, para que nada se olvide. «Si no lo repasas, lo vas a olvidar y vas a renunciar.»"
      acciones={
        <Segmento
          valor={tab}
          onChange={setTab}
          className="max-w-full overflow-x-auto"
          opciones={[
            { valor: 'hoy', etiqueta: 'Hoy' },
            { valor: 'documento', etiqueta: 'Mi documento' },
            { valor: 'semana', etiqueta: 'Semana 2' },
            { valor: 'ejercicios', etiqueta: 'Ejercicios' },
            { valor: 'resistencia', etiqueta: 'Resistencia' },
          ]}
        />
      }
    >
      {tab === 'hoy' && <TabHoy d={s.doctrina} formasPrimarias={s.formasPrimarias} irA={setTab} />}
      {tab === 'documento' && s.documento && <TabDocumento doc={s.documento} imagenes={s.imagenes} />}
      {tab === 'semana' && <TabSemana d={s.doctrina} />}
      {tab === 'ejercicios' && <TabEjercicios d={s.doctrina} ejercicios={s.ejercicios} revision={s.revision} />}
      {tab === 'resistencia' && <TabResistencia d={s.doctrina} primarias={s.formasPrimarias} />}
    </Pagina>
  )
}

function SinContenido() {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <Pagina titulo="Mentalidad">
      <Card>
        <Vacio
          icono={<BookOpen size={20} />}
          titulo="Falta cargar el contenido de la Semana 2"
          texto="Es privado y no vive en el código: el material de Imperium y tu documento. Genéralo con scripts/generar-semana-2.py (queda en public/privado/semana-2.json) o súbelo aquí."
          accion={
            <>
              <input
                ref={ref}
                type="file"
                accept=".json"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  try {
                    await importarArchivo(f)
                    avisar('Semana 2 cargada', 'ok')
                  } catch (err) {
                    avisar(err instanceof Error ? err.message : 'Archivo inválido')
                  }
                }}
              />
              <Btn variante="primario" onClick={() => ref.current?.click()}>
                <Upload size={15} /> Subir semana-2.json
              </Btn>
            </>
          }
        />
      </Card>
    </Pagina>
  )
}

// ── Utilidades del ritual ─────────────────────────────────────────────

function useRitual() {
  const dias = useTabla('dias')
  const porFecha = useMemo(() => new Map(dias.map((d) => [d.fecha, d])), [dias])
  const set = (fecha: string, cambios: Record<string, boolean>) => {
    const d = porFecha.get(fecha)
    const ritual = { ...(d?.ritual ?? {}), ...cambios }
    if (d) actualizar('dias', d.id, { ritual })
    else insertar('dias', { fecha, consumo: false, contenido: false, entrevistas: 0, energia: null, nota: '', ritual } as Partial<Dia>)
  }
  const racha = useMemo(() => {
    let n = 0
    let d = new Date()
    if (!lecturaCompleta(porFecha.get(hoyISO())?.ritual)) d = subDays(d, 1)
    for (let i = 0; i < 730; i++) {
      if (lecturaCompleta(porFecha.get(format(d, 'yyyy-MM-dd'))?.ritual)) n++
      else break
      d = subDays(d, 1)
    }
    return n
  }, [porFecha])
  return { porFecha, set, racha }
}

// ── Hoy ───────────────────────────────────────────────────────────────

function TabHoy({ d, formasPrimarias, irA }: { d: Semana2; formasPrimarias: string[]; irA: (t: Tab) => void }) {
  const { porFecha, set, racha } = useRitual()
  const llamadas = useTabla('llamadas')
  const banco = useTabla('banco')
  const ajustes = useAjustes()
  const hoy = hoyISO()
  const r = porFecha.get(hoy)?.ritual ?? {}
  const principio = d.principios[indiceDelDia(d.principios.length)]
  const llamadasHoy = llamadas.filter((l) => diaLocal(l.fecha) === hoy).length

  const hechosRitual = ITEMS_RITUAL.filter((i) => r[i.k]).length
  const mandatosHechos = d.mandatos.filter((m) => m.n !== 10 && r[`m${m.n}`]).length
  const persistencia = mandatosHechos === 9

  // Últimos 14 días para el mapa de lectura
  const ultimos = Array.from({ length: 21 }, (_, i) => format(subDays(new Date(), 20 - i), 'yyyy-MM-dd'))

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card className="relative overflow-hidden p-6">
          <div className="absolute -top-16 -right-10 size-56 rounded-full bg-violet/10 blur-3xl" />
          <div className="relative">
            <div className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Principio del día · {principio.modulo}</div>
            <div className="mt-3 font-serif text-3xl leading-tight md:text-4xl">
              {principio.n}. {principio.titulo}
            </div>
            <p className="mt-3 max-w-2xl text-sm text-muted">{principio.idea}</p>
            <button onClick={() => irA('semana')} className="mt-4 text-sm font-semibold text-blue-2 hover:underline">
              Repasar el módulo {principio.modulo} →
            </button>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Lectura del documento</div>
            {racha > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-amber-soft px-2.5 py-1 text-xs font-semibold text-amber">
                <Flame size={13} /> {racha} {racha === 1 ? 'día' : 'días'}
              </span>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { k: 'lectura_am', t: 'Mañana', i: <Sun size={18} /> },
              { k: 'lectura_pm', t: 'Noche', i: <Moon size={18} /> },
            ].map((x) => (
              <button
                key={x.k}
                onClick={() => set(hoy, { [x.k]: !r[x.k] })}
                className={cx('pop flex flex-col items-center gap-1.5 rounded-2xl border p-4 transition', r[x.k] ? 'border-green/40 bg-green-soft text-green' : 'border-line-2 text-muted hover:border-faint')}
              >
                {r[x.k] ? <CheckIcon size={20} /> : x.i}
                <span className="text-sm font-semibold">{x.t}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-1">
            {ultimos.map((f) => {
              const rr = porFecha.get(f)?.ritual
              const n = (rr?.lectura_am ? 1 : 0) + (rr?.lectura_pm ? 1 : 0)
              return <div key={f} title={`${fmt.fecha(f)} · ${n}/2`} className={cx('h-5 flex-1 rounded', n === 2 ? 'bg-green' : n === 1 ? 'bg-amber/60' : 'bg-surface-2')} />
            })}
          </div>
          <p className="mt-2 text-[11px] text-faint">Últimos 21 días. «Dos veces al día, 7 días a la semana, sin fallar un solo día.»</p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHead titulo="Ritual diario" sub="Los 6 pasos de tu documento" accion={<span className="num text-sm font-semibold text-muted">{hechosRitual}/{ITEMS_RITUAL.length}</span>} />
          <div className="space-y-4 px-5 pb-5">
            {(
              [
                ['Mañana', RITUAL.manana],
                ['Durante el día', RITUAL.dia],
                ['Noche', RITUAL.noche],
              ] as const
            ).map(([titulo, items]) => (
              <div key={titulo}>
                <div className="mb-2 text-[11px] font-semibold tracking-wide text-faint uppercase">{titulo}</div>
                <div className="space-y-2">
                  {items.map((i) => (
                    <div key={i.k} className="flex items-start gap-3">
                      <Check checked={!!r[i.k]} onChange={(v) => set(hoy, { [i.k]: v })} />
                      <div className="min-w-0">
                        <div className={cx('text-sm', r[i.k] ? 'text-muted line-through' : 'text-text')}>{i.t}</div>
                        <div className="text-[11px] text-faint">
                          {i.k === 'accion' ? `Hoy van ${llamadasHoy} llamadas · meta de la app ${ajustes.meta_llamadas_dia}` : i.d}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead titulo="Los 10 mandatos" sub="Gratificación diferida (2.7) — se hacen los 10, no se eligen" accion={<span className="num text-sm font-semibold text-muted">{mandatosHechos + (persistencia ? 1 : 0)}/10</span>} />
          <div className="space-y-2 px-5 pb-5">
            {d.mandatos.map((m) =>
              m.n === 10 ? (
                <div key={m.n} className={cx('mt-2 flex items-center gap-3 rounded-xl px-3 py-2 text-sm', persistencia ? 'bg-green-soft text-green' : 'bg-surface-2 text-muted')}>
                  {persistencia ? <CheckIcon size={16} /> : <span className="num w-4 text-center text-xs">10</span>}
                  <span>
                    <b>Persistencia</b> — se marca sola cuando haces los otros 9
                  </span>
                </div>
              ) : (
                <div key={m.n} className="flex items-start gap-3">
                  <Check checked={!!r[`m${m.n}`]} onChange={(v) => set(hoy, { [`m${m.n}`]: v })} />
                  <div>
                    <div className={cx('text-sm', r[`m${m.n}`] ? 'text-muted' : 'text-text')}>
                      <b>{m.titulo}</b>
                    </div>
                    <div className="text-[11px] text-faint">{m.texto}</div>
                  </div>
                </div>
              ),
            )}
          </div>
        </Card>
      </div>

      <BancoSufrimiento d={d} primarias={formasPrimarias} banco={banco} />
    </div>
  )
}

function BancoSufrimiento({ d, primarias, banco }: { d: Semana2; primarias: string[]; banco: ReturnType<typeof useTabla<'banco'>> }) {
  const [texto, setTexto] = useState('')
  const [forma, setForma] = useState('')
  const hoy = hoyISO()
  const saldo = (xs: typeof banco) => xs.reduce((a, m) => a + (m.tipo === 'enfrente' ? 1 : -2), 0)
  const semana = banco.filter((m) => differenceInCalendarDays(new Date(), parseISO(m.fecha)) < 7)
  const deHoy = banco.filter((m) => m.fecha === hoy)
  const opciones = [...d.formas].sort((a, b) => Number(primarias.includes(b.clave)) - Number(primarias.includes(a.clave)))

  const registrar = (tipo: 'enfrente' | 'evite') => {
    if (!texto.trim()) return
    insertar('banco', { fecha: hoy, tipo, texto: texto.trim(), forma })
    setTexto('')
    setForma('')
  }

  return (
    <Card>
      <CardHead titulo="Banco de Sufrimiento" sub="Dolor = Resistencia × Esfuerzo · enfrentar suma +$1, evitar cuesta −$2 (2.5)" />
      <div className="grid gap-5 px-5 pb-5 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="¿Qué enfrentaste o qué evitaste?" onKeyDown={(e) => e.key === 'Enter' && registrar('enfrente')} />
            <Select value={forma} onChange={(e) => setForma(e.target.value)} className="sm:w-56">
              <option value="">Forma de resistencia…</option>
              {opciones.map((f) => (
                <option key={f.clave} value={f.clave}>
                  {primarias.includes(f.clave) ? '★ ' : ''}
                  {f.nombre}
                </option>
              ))}
            </Select>
          </div>
          <div className="mt-2 flex gap-2">
            <Btn className="flex-1 border-green/40 text-green" onClick={() => registrar('enfrente')} disabled={!texto.trim()}>
              +1 · La enfrenté
            </Btn>
            <Btn className="flex-1 border-red/40 text-red" onClick={() => registrar('evite')} disabled={!texto.trim()}>
              −2 · La evité
            </Btn>
          </div>
          <div className="mt-4 space-y-1.5">
            {banco
              .slice()
              .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
              .slice(0, 8)
              .map((m) => (
                <div key={m.id} className="group flex items-center gap-3 text-sm">
                  <span className={cx('num w-8 text-right font-semibold', m.tipo === 'enfrente' ? 'text-green' : 'text-red')}>{m.tipo === 'enfrente' ? '+1' : '−2'}</span>
                  <span className="min-w-0 flex-1 truncate">{m.texto}</span>
                  {m.forma && <Badge>{d.formas.find((f) => f.clave === m.forma)?.nombre ?? m.forma}</Badge>}
                  <span className="text-[11px] text-faint">{fmt.fecha(m.fecha)}</span>
                  <button onClick={() => borrar('banco', m.id)} className="text-faint opacity-0 group-hover:opacity-100 hover:text-red">
                    <X size={13} />
                  </button>
                </div>
              ))}
            {banco.length === 0 && <div className="text-xs text-faint">Cada día, un depósito. «Siempre voy directo hacia lo que mi current self está evitando.»</div>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
          <Kpi etiqueta="Hoy" valor={`${saldo(deHoy) >= 0 ? '+' : ''}${saldo(deHoy)}`} tono={deHoy.length === 0 ? 'nada' : saldo(deHoy) >= 0 ? 'ok' : 'critico'} />
          <Kpi etiqueta="7 días" valor={`${saldo(semana) >= 0 ? '+' : ''}${saldo(semana)}`} tono={semana.length === 0 ? 'nada' : saldo(semana) >= 0 ? 'ok' : 'critico'} />
          <Kpi etiqueta="Saldo total" valor={`${saldo(banco) >= 0 ? '+' : ''}${saldo(banco)}`} tono={banco.length === 0 ? 'nada' : saldo(banco) >= 0 ? 'ok' : 'critico'} />
        </div>
      </div>
    </Card>
  )
}

// ── Mi documento ──────────────────────────────────────────────────────

function TabDocumento({ doc, imagenes }: { doc: Documento; imagenes: { id: string; nombre: string; data: string }[] }) {
  const { porFecha, set } = useRitual()
  const [modoAf, setModoAf] = useState(false)
  const [editar, setEditar] = useState<null | 'manifiesto' | 'afirmaciones' | 'metas' | 'estandares'>(null)
  const [verImg, setVerImg] = useState<string | null>(null)
  const hoy = hoyISO()
  const r = porFecha.get(hoy)?.ritual ?? {}
  const turno = new Date().getHours() < 15 ? 'lectura_am' : 'lectura_pm'
  const img = (id: string) => imagenes.find((i) => i.id === id)
  const vision = imagenes.filter((i) => i.nombre.startsWith('Visión'))
  const legado = imagenes.filter((i) => i.nombre.startsWith('Legado'))

  const guardar = (cambios: Partial<Documento>) => {
    actualizar('mentalidad', 'documento', { datos: { ...doc, ...cambios } as unknown as Record<string, unknown> })
    avisar('Documento actualizado', 'ok')
    setEditar(null)
  }

  const Seccion = ({ id, titulo, children, accion }: { id: string; titulo: string; children: React.ReactNode; accion?: React.ReactNode }) => (
    <section id={id} className="scroll-mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-2xl">{titulo}</h2>
        {accion}
      </div>
      {children}
    </section>
  )
  const lapiz = (k: typeof editar) => (
    <Btn chico variante="fantasma" onClick={() => setEditar(k)}>
      <Pencil size={13} /> Editar
    </Btn>
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
      <div className="space-y-10">
        <Card className="overflow-hidden">
          {img('img-p01') && <img src={img('img-p01')!.data} alt="Portada" className="max-h-72 w-full object-cover object-top" />}
          <div className="p-6">
            <div className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">
              {doc.titulo} · v{doc.version} · creado el {fmt.fecha(doc.creado, "d 'de' MMMM")}
            </div>
            <p className="mt-2 text-sm text-muted">{doc.instrucciones}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Btn variante={r[turno] ? 'secundario' : 'primario'} onClick={() => set(hoy, { [turno]: true })} disabled={!!r[turno]}>
                <CheckIcon size={15} /> {r[turno] ? `Lectura de la ${turno === 'lectura_am' ? 'mañana' : 'noche'} registrada` : `Terminé la lectura de la ${turno === 'lectura_am' ? 'mañana' : 'noche'}`}
              </Btn>
              <Btn onClick={() => setModoAf(true)}>Modo afirmaciones</Btn>
            </div>
          </div>
        </Card>

        <Seccion id="principios" titulo="Important things to remember">
          <div className="space-y-4">
            {doc.principios.map((p, i) => (
              <div key={i}>
                <div className="font-semibold">
                  {i + 1}. {p.titulo}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted">{p.texto}</p>
              </div>
            ))}
          </div>
        </Seccion>

        <Seccion id="ritual" titulo="Daily ritual">
          <ol className="space-y-2">
            {doc.ritual.map((p, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="num font-semibold text-blue-2">{i + 1}</span>
                <span className="text-muted">{p}</span>
              </li>
            ))}
          </ol>
        </Seccion>

        <Seccion id="vision" titulo="Vision">
          <p className="mb-3 text-sm text-muted">{doc.vision}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {vision.map((i) => (
              <button key={i.id} onClick={() => setVerImg(i.id)} className="overflow-hidden rounded-xl border border-line">
                <img src={i.data} alt={i.nombre} className="aspect-[3/4] w-full object-cover object-top transition hover:scale-[1.02]" />
              </button>
            ))}
          </div>
          {vision.length === 0 && <p className="text-xs text-faint">Las imágenes de la visión no están cargadas.</p>}
        </Seccion>

        <Seccion id="legado" titulo="Legacy to date">
          <p className="mb-3 text-sm text-muted">{doc.legado}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {legado.map((i) => (
              <button key={i.id} onClick={() => setVerImg(i.id)} className="overflow-hidden rounded-xl border border-line">
                <img src={i.data} alt={i.nombre} className="aspect-[3/4] w-full object-cover object-top" />
              </button>
            ))}
          </div>
        </Seccion>

        <Seccion id="historia" titulo="The story">
          <p className="mb-4 text-sm text-muted italic">{doc.historia.lema}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <div className="mb-2 text-[11px] font-semibold tracking-wide text-faint uppercase">Capítulos pasados</div>
              <ol className="space-y-1.5 text-sm">
                {doc.historia.pasados.map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <CheckIcon size={14} className="mt-0.5 shrink-0 text-green" />
                    {c}
                  </li>
                ))}
              </ol>
            </Card>
            <Card className="p-4">
              <div className="mb-2 text-[11px] font-semibold tracking-wide text-faint uppercase">Capítulos futuros</div>
              <ol className="space-y-1.5 text-sm">
                {doc.historia.futuros.map((c, i) => (
                  <li key={i} className="flex gap-2 text-muted">
                    <span className="num w-5 text-right text-faint">{i + 1}</span>
                    {c}
                  </li>
                ))}
              </ol>
            </Card>
          </div>
          <div className="mt-3 flex gap-2">
            {['img-p11', 'img-p12'].map((id) =>
              img(id) ? (
                <Btn key={id} chico variante="fantasma" onClick={() => setVerImg(id)}>
                  Ver {img(id)!.nombre.toLowerCase()}
                </Btn>
              ) : null,
            )}
          </div>
        </Seccion>

        <Seccion id="manifiesto" titulo="The Nicolás Cadena manifesto" accion={lapiz('manifiesto')}>
          <div className="space-y-3">
            {doc.manifiesto.map((p, i) => (
              <p key={i} className="font-serif text-xl leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        </Seccion>

        <Seccion id="rasgos" titulo="Traits, style, routine, mentors">
          <div className="grid gap-2 sm:grid-cols-2">
            {doc.rasgos.map((t) => (
              <Card key={t.nombre} className="p-3">
                <div className="text-sm font-semibold">{t.nombre}</div>
                <div className="mt-0.5 text-xs text-muted">{t.texto}</div>
              </Card>
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <div className="mb-2 text-[11px] font-semibold tracking-wide text-faint uppercase">Rutina</div>
              <div className="space-y-1 text-sm">
                {doc.rutina.map((x) => (
                  <div key={x.hora} className="flex gap-3">
                    <span className="num w-12 text-faint">{x.hora}</span>
                    <span className="text-muted">{x.actividad}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs font-semibold text-blue-2">{doc.estandar_rutina}</div>
            </Card>
            <Card className="space-y-3 p-4 text-sm">
              <div>
                <div className="mb-1 text-[11px] font-semibold tracking-wide text-faint uppercase">Estilo y cuerpo</div>
                {doc.estilo.map((e) => (
                  <div key={e} className="text-muted">
                    {e}
                  </div>
                ))}
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold tracking-wide text-faint uppercase">Mentores</div>
                <div className="text-muted">{doc.mentores}</div>
              </div>
            </Card>
          </div>
        </Seccion>

        <Seccion id="metas" titulo="Goals" accion={lapiz('metas')}>
          <p className="mb-3 text-sm text-muted">Pinta una imagen de estas metas en tu mente: imagínalas y vívelas.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(doc.metas).map(([g, xs]) => (
              <Card key={g} className="p-4">
                <div className="mb-2 text-[11px] font-semibold tracking-wide text-faint uppercase">{g}</div>
                <ol className="space-y-1 text-sm">
                  {xs.map((m, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="num text-faint">{i + 1}.</span>
                      {m}
                    </li>
                  ))}
                </ol>
              </Card>
            ))}
          </div>
        </Seccion>

        <Seccion id="estandares" titulo="Unquestionable standards" accion={lapiz('estandares')}>
          <div className="space-y-2">
            {doc.estandares.map((e, i) => (
              <div key={i} className="flex gap-3 rounded-xl border border-line bg-surface/60 px-4 py-3 text-sm">
                <span className="num font-semibold text-amber">{i + 1}</span>
                {e}
              </div>
            ))}
          </div>
        </Seccion>

        <Seccion id="afirmaciones" titulo="Affirmations" accion={lapiz('afirmaciones')}>
          <Card className="mb-5 border-violet/30 bg-violet/5 p-4 text-sm">{doc.recordatorio}</Card>
          <div className="space-y-6">
            {doc.afirmaciones.map((s) => (
              <div key={s.n}>
                <div className="mb-2 text-[11px] font-semibold tracking-wide text-faint uppercase">
                  {s.n} · {s.titulo}
                </div>
                <div className="space-y-2">
                  {s.frases.map((f, i) => (
                    <p key={i} className="text-[15px] leading-relaxed">
                      {f}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center font-serif text-4xl tracking-wide">{doc.cierre}</div>
        </Seccion>
      </div>

      {/* Índice lateral */}
      <nav className="sticky top-6 hidden h-fit space-y-1 text-sm lg:block">
        {[
          ['principios', 'Principios'],
          ['ritual', 'Ritual'],
          ['vision', 'Visión'],
          ['legado', 'Legado'],
          ['historia', 'Historia'],
          ['manifiesto', 'Manifiesto'],
          ['rasgos', 'Rasgos y rutina'],
          ['metas', 'Metas'],
          ['estandares', 'Estándares'],
          ['afirmaciones', 'Afirmaciones'],
        ].map(([id, n]) => (
          <a key={id} href={`#${id}`} className="block rounded-lg px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-text">
            {n}
          </a>
        ))}
      </nav>

      {verImg && img(verImg) && (
        <Modal abierto onCerrar={() => setVerImg(null)} titulo={img(verImg)!.nombre} ancho="max-w-3xl">
          <img src={img(verImg)!.data} alt={img(verImg)!.nombre} className="w-full rounded-xl" />
        </Modal>
      )}
      {modoAf && <ModoAfirmaciones doc={doc} onCerrar={() => setModoAf(false)} />}
      {editar && <EditarDocumento doc={doc} seccion={editar} onCerrar={() => setEditar(null)} onGuardar={guardar} />}
    </div>
  )
}

function ModoAfirmaciones({ doc, onCerrar }: { doc: Documento; onCerrar: () => void }) {
  const todas = doc.afirmaciones.flatMap((s) => s.frases.map((f) => ({ f, s: `${s.n} · ${s.titulo}` })))
  const [i, setI] = useState(0)
  const a = todas[i]
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
      if (e.key === 'ArrowRight' || e.key === ' ') setI((x) => Math.min(todas.length - 1, x + 1))
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1))
    }
    window.addEventListener('keydown', f)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', f)
      document.body.style.overflow = ''
    }
  }, [onCerrar, todas.length])
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-bg/95 backdrop-blur-xl">
      <div className="flex items-center justify-between p-4">
        <span className="text-xs text-faint">
          {i + 1} / {todas.length} · {a.s}
        </span>
        <button onClick={onCerrar} className="rounded-lg p-2 text-muted hover:text-text">
          <X size={20} />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center px-6">
        <p key={i} className="rise max-w-3xl text-center font-serif text-3xl leading-snug md:text-5xl">
          {a.f}
        </p>
      </div>
      <div className="p-4 text-center text-[11px] text-faint">Dila en voz alta, con pecho. Imagina la escena con detalle y siente la emoción. 👏</div>
      <div className="grid grid-cols-2 gap-3 p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
        <Btn className="h-14" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>
          <ChevronLeft size={18} /> Anterior
        </Btn>
        <Btn variante="primario" className="h-14" onClick={() => (i + 1 < todas.length ? setI(i + 1) : onCerrar())}>
          {i + 1 < todas.length ? (
            <>
              Siguiente <ChevronRight size={18} />
            </>
          ) : (
            'Terminé'
          )}
        </Btn>
      </div>
    </div>,
    document.body,
  )
}

function EditarDocumento({ doc, seccion, onCerrar, onGuardar }: { doc: Documento; seccion: 'manifiesto' | 'afirmaciones' | 'metas' | 'estandares'; onCerrar: () => void; onGuardar: (c: Partial<Documento>) => void }) {
  const lineasDe = (xs: string[]) => xs.join('\n')
  const aLineas = (t: string) => t.split('\n').map((x) => x.trim()).filter(Boolean)
  const [manifiesto, setManifiesto] = useState(doc.manifiesto.join('\n\n'))
  const [estandares, setEstandares] = useState(lineasDe(doc.estandares))
  const [metas, setMetas] = useState(Object.fromEntries(Object.entries(doc.metas).map(([k, v]) => [k, lineasDe(v)])))
  const [afs, setAfs] = useState(doc.afirmaciones.map((s) => ({ ...s, texto: lineasDe(s.frases) })))

  const guardar = () => {
    if (seccion === 'manifiesto') onGuardar({ manifiesto: manifiesto.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean) })
    if (seccion === 'estandares') onGuardar({ estandares: aLineas(estandares) })
    if (seccion === 'metas') onGuardar({ metas: Object.fromEntries(Object.entries(metas).map(([k, v]) => [k, aLineas(v)])) })
    if (seccion === 'afirmaciones') onGuardar({ afirmaciones: afs.map(({ texto, ...s }) => ({ ...s, frases: aLineas(texto) })) })
  }

  return (
    <Modal abierto onCerrar={onCerrar} titulo={`Editar · ${seccion}`} ancho="max-w-3xl" pie={<Btn variante="primario" onClick={guardar}>Guardar</Btn>}>
      <p className="mb-3 text-xs text-faint">El documento vive editándose, no terminándose. Los 7 principios y el ritual son el chasis; lo que cambia con la meta es la carrocería.</p>
      {seccion === 'manifiesto' && <Area rows={18} value={manifiesto} onChange={(e) => setManifiesto(e.target.value)} />}
      {seccion === 'estandares' && <Area rows={10} value={estandares} onChange={(e) => setEstandares(e.target.value)} />}
      {seccion === 'metas' &&
        Object.keys(metas).map((k) => (
          <div key={k} className="mb-3">
            <div className="mb-1 text-xs font-semibold text-muted">{k} · una por línea</div>
            <Area rows={5} value={metas[k]} onChange={(e) => setMetas({ ...metas, [k]: e.target.value })} />
          </div>
        ))}
      {seccion === 'afirmaciones' &&
        afs.map((s, i) => (
          <div key={s.n} className="mb-3">
            <div className="mb-1 text-xs font-semibold text-muted">
              {s.n} · {s.titulo} · una por línea
            </div>
            <Area rows={Math.min(10, s.frases.length + 2)} value={s.texto} onChange={(e) => setAfs(afs.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)))} />
          </div>
        ))}
    </Modal>
  )
}

// ── Semana 2: la biblioteca ───────────────────────────────────────────

function TabSemana({ d }: { d: Semana2 }) {
  const [abierto, setAbierto] = useState<string | null>(null)
  const m = d.modulos.find((x) => x.n === abierto)
  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Semana {d.semana.numero} · {d.semana.titulo}</div>
        <div className="mt-2 font-serif text-3xl leading-tight">{d.semana.linea}</div>
        <p className="mt-3 text-sm text-muted">{d.semana.por_que}</p>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {d.modulos.map((x) => (
          <Card key={x.n} onClick={() => setAbierto(x.n)} className="cursor-pointer p-4 transition hover:border-line-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-blue-2">{x.n}</span>
              {x.advertencias.length > 0 && <AlertTriangle size={13} className="text-amber" />}
            </div>
            <div className="mt-1 font-semibold">{x.titulo_es}</div>
            <div className="text-[11px] text-faint">{x.titulo}</div>
            <p className="mt-2 line-clamp-3 text-xs text-muted">{x.linea}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHead titulo="Todo o nada — las 8 áreas" sub="«Cómo haces una cosa es cómo haces todo»" />
          <div className="space-y-1.5 px-5 pb-5 text-sm">
            {d.areas.map((a) => (
              <div key={a.titulo}>
                <b>{a.titulo}</b> <span className="text-muted">— {a.texto}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHead titulo="Ejercer el juicio — 5 pasos" sub="2.6 · ¿cómo sabes cuándo ser qué?" />
          <ol className="space-y-1.5 px-5 pb-5 text-sm">
            {d.pasos_juicio.map((p, i) => (
              <li key={i} className="flex gap-2">
                <span className="num font-semibold text-blue-2">{i + 1}</span>
                <span className="text-muted">{p}</span>
              </li>
            ))}
          </ol>
        </Card>
        <Card>
          <CardHead titulo="Descanso integrado — 8 estrategias" sub="2.7 · «Solo puedes trabajar tan duro como puedes recuperarte»" />
          <div className="space-y-1.5 px-5 pb-5 text-sm">
            {d.descanso.map((a) => (
              <div key={a.titulo}>
                <b>{a.titulo}</b> <span className="text-muted">— {a.texto}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHead titulo="Las 7 zonas" sub="Hacia arriba disciplina, hacia abajo descanso. La zona 7 de los dos lados mata" />
          <div className="space-y-1.5 px-5 pb-5">
            {d.zonas.map((z) => (
              <div key={z.zona} className="flex items-center gap-3 text-sm">
                <span className={cx('num grid size-6 place-items-center rounded-md text-xs font-bold', z.zona <= 2 ? 'bg-green-soft text-green' : z.zona <= 4 ? 'bg-blue-soft text-blue-2' : z.zona <= 5 ? 'bg-amber-soft text-amber' : 'bg-red-soft text-red')}>{z.zona}</span>
                <span className="text-muted">{z.texto}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHead titulo="Burnout — las 5 etapas" sub="Si sientes la etapa 3, descanso voluntario YA" />
          <div className="space-y-2 px-5 pb-5">
            {d.burnout.map((b) => (
              <div key={b.etapa} className="text-sm">
                <b className={cx(b.etapa >= 3 ? 'text-red' : 'text-text')}>
                  {b.etapa} · {b.nombre}
                </b>
                <div className="text-xs text-muted">{b.sintomas}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {m && <DetalleModulo m={m} d={d} onCerrar={() => setAbierto(null)} />}
    </div>
  )
}

function DetalleModulo({ m, d, onCerrar }: { m: Modulo; d: Semana2; onCerrar: () => void }) {
  const ejercicios = d.ejercicios.filter((e) => e.modulo === m.n)
  return (
    <Modal abierto onCerrar={onCerrar} titulo={`${m.n} · ${m.titulo_es}`} ancho="max-w-3xl">
      <p className="font-serif text-2xl leading-snug">{m.linea}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {m.ideas.map((i) => (
          <Card key={i.titulo} className="p-4">
            <div className="text-sm font-semibold">{i.titulo}</div>
            <p className="mt-1 text-sm leading-relaxed text-muted">{i.texto}</p>
          </Card>
        ))}
      </div>
      <div className="mt-5 space-y-2">
        {m.citas.map((c) => (
          <div key={c} className="flex gap-2 text-sm text-muted italic">
            <Quote size={14} className="mt-0.5 shrink-0 text-violet" />
            {c}
          </div>
        ))}
      </div>
      <Card className="mt-5 border-blue/30 bg-blue-soft/40 p-4 text-sm">
        <b>Para Olimpo:</b> <span className="text-muted">{m.aplicacion}</span>
      </Card>
      {m.advertencias.map((a) => (
        <Card key={a} className="mt-3 border-amber/30 bg-amber-soft/50 p-4 text-sm">
          <b className="text-amber">⚠️ Advertencia del vault:</b> <span className="text-muted">{a}</span>
        </Card>
      ))}
      {ejercicios.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 text-[11px] font-semibold tracking-wide text-faint uppercase">Action items del módulo</div>
          {ejercicios.map((e) => (
            <div key={e.id} className="mb-1.5 text-sm">
              <b>{e.titulo}</b> <span className="text-muted">— {e.consigna}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

// ── Ejercicios ────────────────────────────────────────────────────────

function TabEjercicios({ d, ejercicios, revision }: { d: Semana2; ejercicios: Map<string, { id: string; datos: Record<string, unknown> }>; revision: string | null }) {
  const [abierto, setAbierto] = useState<string | null>(null)
  const proxima = revision ? format(addDays(parseISO(revision), 90), 'yyyy-MM-dd') : null
  const faltan = proxima ? differenceInCalendarDays(parseISO(proxima), new Date()) : null
  const estados = d.ejercicios.map((e) => ({ e, st: ejercicios.get(e.id)?.datos as unknown as EstadoEjercicio | undefined }))
  const hechos = estados.filter((x) => x.st?.estado === 'hecho').length
  const sel = estados.find((x) => x.e.id === abierto)

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <Kpi etiqueta="Ejercicios hechos" valor={`${hechos}/${d.ejercicios.length}`} sub="Semana 2 cerrada el 23 de agosto" tono={hechos >= d.ejercicios.length - 1 ? 'ok' : 'alerta'} />
        <Kpi
          etiqueta="Próximo re-visionado"
          valor={proxima ? fmt.fecha(proxima, "d 'de' MMM") : '—'}
          sub={faltan != null ? (faltan < 0 ? `vencido hace ${-faltan} días` : `en ${faltan} días · cada 3 meses (1.3)`) : undefined}
          tono={faltan == null ? 'nada' : faltan < 0 ? 'critico' : faltan <= 14 ? 'alerta' : 'ok'}
        />
        <Card className="flex flex-col justify-center gap-2 p-4">
          <div className="text-xs text-muted">Re-visionar la Semana 1 y la 2 cada 3 meses: vas a olvidar lo que aprendiste y vas a renunciar si no te lo recuerdas.</div>
          <Btn
            chico
            onClick={() => {
              actualizar('mentalidad', 'revision', { datos: { ultima: hoyISO() } })
              avisar('Re-visionado registrado. El próximo, en 3 meses.', 'ok')
            }}
          >
            Hice el re-visionado hoy
          </Btn>
        </Card>
      </div>

      {d.modulos
        .filter((m) => d.ejercicios.some((e) => e.modulo === m.n))
        .map((m) => (
          <Card key={m.n}>
            <CardHead titulo={`${m.n} · ${m.titulo_es}`} />
            <div className="divide-y divide-line px-5 pb-2">
              {estados
                .filter((x) => x.e.modulo === m.n)
                .map(({ e, st }) => (
                  <button key={e.id} onClick={() => setAbierto(e.id)} className="flex w-full items-center gap-3 py-3 text-left">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{e.titulo}</div>
                      <div className="text-[11px] text-faint">
                        {st?.respuesta ? 'con tu respuesta guardada · ' : ''}
                        {st?.revisado_el ? `revisado el ${fmt.fecha(st.revisado_el)}` : st?.hecho_el ? `hecho el ${fmt.fecha(st.hecho_el)}` : ''}
                      </div>
                    </div>
                    <Pill tono={st?.estado === 'hecho' ? 'ok' : st?.estado === 'hueco' ? 'muestra' : 'alerta'}>{st?.estado === 'hecho' ? 'Hecho' : st?.estado === 'hueco' ? 'Falta el material' : 'Pendiente'}</Pill>
                  </button>
                ))}
            </div>
          </Card>
        ))}

      {sel && <EditarEjercicio e={sel.e} st={sel.st} onCerrar={() => setAbierto(null)} />}
    </div>
  )
}

function EditarEjercicio({ e, st, onCerrar }: { e: Semana2['ejercicios'][number]; st: EstadoEjercicio | undefined; onCerrar: () => void }) {
  const [x, setX] = useState<EstadoEjercicio>(st ?? { estado: 'pendiente', respuesta: '', hecho_el: null, revisado_el: null })
  const guardar = (c: Partial<EstadoEjercicio> = {}) => {
    const datos = { ...x, ...c } as unknown as Record<string, unknown>
    if (st) actualizar('mentalidad', e.id, { datos })
    else insertar('mentalidad', { id: e.id, tipo: 'ejercicio', datos })
    onCerrar()
  }
  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={e.titulo}
      ancho="max-w-2xl"
      pie={
        <>
          <Btn variante="fantasma" className="mr-auto" onClick={() => guardar({ revisado_el: hoyISO() })}>
            Lo revisé hoy
          </Btn>
          <Btn variante="primario" onClick={() => guardar()}>
            Guardar
          </Btn>
        </>
      }
    >
      <p className="text-sm text-muted">{e.consigna}</p>
      {e.hueco && <Card className="mt-3 border-blue/30 bg-blue-soft/40 p-3 text-xs text-muted">Hueco declarado: {e.hueco}</Card>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Select value={x.estado} onChange={(ev) => setX({ ...x, estado: ev.target.value as EstadoEjercicio['estado'], hecho_el: ev.target.value === 'hecho' ? (x.hecho_el ?? hoyISO()) : x.hecho_el })} className="w-48">
          <option value="pendiente">Pendiente</option>
          <option value="hecho">Hecho</option>
          <option value="hueco">Falta el material</option>
        </Select>
        {x.hecho_el && <span className="text-xs text-faint">hecho el {fmt.fecha(x.hecho_el, "d 'de' MMMM")}</span>}
      </div>
      <div className="mt-4">
        <div className="mb-1.5 text-xs font-medium text-muted">Tu respuesta</div>
        <Area rows={14} value={x.respuesta} onChange={(ev) => setX({ ...x, respuesta: ev.target.value })} placeholder="Escribe o pega aquí lo que respondiste, para tenerlo a mano en el re-visionado." />
      </div>
    </Modal>
  )
}

// ── Resistencia ───────────────────────────────────────────────────────

function TabResistencia({ d, primarias }: { d: Semana2; primarias: string[] }) {
  const banco = useTabla('banco')
  const { ejercicios } = useSemana2()
  // Tu contexto de cada forma, escrito en el ejercicio del 2.5 («Learning: la resistencia trata de…»)
  const contexto = useMemo(() => {
    const txt = (ejercicios.get('2.5-resistencia')?.datos.respuesta as string) ?? ''
    const m = new Map<string, string>()
    for (const par of txt.split(/\n+/)) {
      const r = par.match(/^([A-Za-z][A-Za-z \-]+?)[:.]\s+(.+)$/)
      if (r) m.set(r[1].trim().toLowerCase(), r[2].trim())
    }
    return m
  }, [ejercicios])
  const evitadas = useMemo(() => {
    const m = new Map<string, number>()
    for (const x of banco) if (x.tipo === 'evite' && x.forma && differenceInCalendarDays(new Date(), parseISO(x.fecha)) < 30) m.set(x.forma, (m.get(x.forma) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [banco])
  const max = evitadas[0]?.[1] ?? 1

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHead titulo="Las que más te ganan · 30 días" sub="Sale de lo que registras como «la evité» en el Banco de Sufrimiento" />
          <div className="space-y-2 px-5 pb-5">
            {evitadas.length === 0 && <div className="text-xs text-faint">Todavía no hay registros. Cuando evites algo, anota qué forma de resistencia ganó: etiquetarla es el paso 1 para derrotarla.</div>}
            {evitadas.map(([k, n]) => (
              <div key={k} className="flex items-center gap-3 text-sm">
                <span className="w-40 truncate">{d.formas.find((f) => f.clave === k)?.nombre ?? k}</span>
                <Barra className="flex-1" valor={n} max={max} color="var(--red)" />
                <span className="num w-6 text-right font-semibold">{n}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHead titulo="La perspectiva del General — 7 pasos" sub="2.5 · verte en tercera persona y darle la orden al cuerpo" />
          <ol className="space-y-1.5 px-5 pb-3 text-sm">
            {d.pasos_general.map((p, i) => (
              <li key={i} className="flex gap-2">
                <span className="num font-semibold text-blue-2">{i + 1}</span>
                <span className="text-muted">{p}</span>
              </li>
            ))}
          </ol>
          <div className="mx-5 mb-5 rounded-xl border border-amber/30 bg-amber-soft/50 p-3 text-xs text-muted">
            <b className="text-amber">⚠️ Salvaguarda, pegada al método:</b> tienes límites biológicos. La mente que dice «estoy cansado» es cope y se ignora; el cuerpo con náusea, insomnio o ansiedad es dato y pide descanso YA. «El soldado un día le puede disparar al general si lo empujan demasiado.»
          </div>
        </Card>
      </div>

      <Card>
        <CardHead titulo="Las 30 formas de resistencia (+2)" sub={`★ = tus formas primarias (${primarias.length}). Paso 1: volverte consciente y etiquetarla. Paso 2: volverte intolerante y trabajar igual.`} />
        <div className="grid gap-2 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
          {d.formas.map((f) => {
            const mia = primarias.includes(f.clave) || contexto.has(f.clave.toLowerCase())
            return (
              <div key={f.clave} className={cx('rounded-xl border p-3', mia ? 'border-amber/40 bg-amber-soft/40' : 'border-line')}>
                <div className="flex items-center justify-between gap-2">
                  <b className="text-sm">{f.nombre}</b>
                  {mia && <span className="text-xs text-amber">★</span>}
                </div>
                <div className="text-xs text-muted">{f.texto}</div>
                {mia && contexto.get(f.clave.toLowerCase()) && <div className="mt-2 border-t border-amber/20 pt-2 text-xs text-text/80 italic">«{contexto.get(f.clave.toLowerCase())}»</div>}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
