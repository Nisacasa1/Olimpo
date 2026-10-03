import { DndContext, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { Archive, Clapperboard, Mic, Plus, Send, Star, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Ideacion } from '../components/contenido/Ideacion'
import { Personas } from '../components/contenido/Personas'
import { Publicado } from '../components/contenido/Publicado'
import { Area, Btn, Campo, Card, Check, cx, Input, Modal, Pagina, Segmento, Select } from '../components/ui'
import { EMBUDOS, ETAPAS, FILTRO, FORMATOS, LINEA, LINEAS, PLATAFORMAS } from '../lib/contenido'
import { hoyISO } from '../lib/format'
import { actualizar, avisar, borrar, insertar, useTabla } from '../lib/store'
import type { EtapaIdea, Idea, Linea } from '../lib/types'

type Tab = 'pipeline' | 'ideacion' | 'publicado' | 'personas'
export type FiltroLinea = Linea | 'todas'

export const ideaVacia = (linea: Linea = 'marca', extra: Partial<Idea> = {}): Partial<Idea> => ({
  linea,
  titulo: '',
  gancho: '',
  formato: linea === 'ads' ? 'Video de pauta (4 + 1)' : 'Talking head guionado',
  embudo: 'TOF',
  framework: '',
  pilar: '',
  guion: '',
  notas: '',
  etapa: 'idea',
  posicion: Date.now(),
  estrella: false,
  filtro: [],
  ...extra,
})

export function ChipLinea({ linea }: { linea: Linea }) {
  const l = LINEA[linea]
  return (
    <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style={{ color: l.color, background: `color-mix(in oklab, ${l.color} 14%, transparent)` }}>
      {l.corto}
    </span>
  )
}

export default function Contenido() {
  const [tab, setTab] = useState<Tab>('pipeline')
  const [linea, setLinea] = useState<FiltroLinea>(() => {
    try {
      return (localStorage.getItem('olimpo:linea') as FiltroLinea) || 'todas'
    } catch {
      return 'todas'
    }
  })
  const [editar, setEditar] = useState<Partial<Idea> | null>(null)
  useEffect(() => {
    try {
      localStorage.setItem('olimpo:linea', linea)
    } catch {
      /* sin almacenamiento */
    }
  }, [linea])

  return (
    <Pagina
      titulo="Contenido"
      sub="Tu segundo método de adquisición. Cada idea se clasifica: marca personal, agencia o ads. De la idea a la pieza publicada, y de la pieza a la persona que te escribió por ella."
      acciones={
        <Btn variante="primario" onClick={() => setEditar(ideaVacia(linea === 'todas' ? 'marca' : linea))}>
          <Plus size={15} /> Idea
        </Btn>
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Segmento
          valor={tab}
          onChange={setTab}
          opciones={[
            { valor: 'pipeline', etiqueta: 'Pipeline' },
            { valor: 'ideacion', etiqueta: 'Ideación' },
            { valor: 'publicado', etiqueta: 'Publicado' },
            { valor: 'personas', etiqueta: 'Personas' },
          ]}
        />
        <Segmento
          className="ml-auto"
          valor={linea}
          onChange={setLinea}
          opciones={[{ valor: 'todas' as FiltroLinea, etiqueta: 'Todo' }, ...LINEAS.map((l) => ({ valor: l.k as FiltroLinea, etiqueta: l.corto }))]}
        />
      </div>
      {tab === 'pipeline' && <Pipeline linea={linea} onEditar={setEditar} />}
      {tab === 'ideacion' && <Ideacion linea={linea} onCrear={(i) => setEditar(i)} />}
      {tab === 'publicado' && <Publicado linea={linea} />}
      {tab === 'personas' && <Personas linea={linea} />}
      {editar && <EditarIdea idea={editar} onCerrar={() => setEditar(null)} />}
    </Pagina>
  )
}

// ── Pipeline ──────────────────────────────────────────────────────────

function Pipeline({ linea, onEditar }: { linea: FiltroLinea; onEditar: (i: Idea) => void }) {
  const ideas = useTabla('ideas')
  const [publicar, setPublicar] = useState<Idea | null>(null)
  const [grabando, setGrabando] = useState(false)
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }))
  const visibles = useMemo(() => ideas.filter((i) => linea === 'todas' || i.linea === linea), [ideas, linea])
  const columna = (e: EtapaIdea) => visibles.filter((i) => i.etapa === e).sort((a, b) => Number(b.estrella) - Number(a.estrella) || (a.posicion ?? 0) - (b.posicion ?? 0))

  const alSoltar = (e: DragEndEvent) => {
    const id = String(e.active.id)
    const destino = e.over?.id as EtapaIdea | 'publicar' | undefined
    const idea = ideas.find((x) => x.id === id)
    if (!idea || !destino || destino === idea.etapa) return
    if (destino === 'publicar') return setPublicar(idea)
    actualizar('ideas', id, { etapa: destino, posicion: Date.now() })
  }

  return (
    <DndContext sensors={sensores} onDragEnd={alSoltar}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {ETAPAS.map((e) => (
          <Columna key={e.k} etapa={e.k} titulo={e.n} ayuda={e.d} ideas={columna(e.k)} onEditar={onEditar} accion={e.k === 'grabar' && columna('grabar').length > 0 ? <Btn chico variante="fantasma" onClick={() => setGrabando(true)}><Clapperboard size={13} /> Grabar</Btn> : undefined} />
        ))}
        <ZonaPublicar />
      </div>
      {publicar && <Publicar idea={publicar} onCerrar={() => setPublicar(null)} />}
      {grabando && <ModoGrabacion ideas={columna('grabar')} onCerrar={() => setGrabando(false)} />}
    </DndContext>
  )
}

function Columna({ etapa, titulo, ayuda, ideas, onEditar, accion }: { etapa: EtapaIdea; titulo: string; ayuda: string; ideas: Idea[]; onEditar: (i: Idea) => void; accion?: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa })
  return (
    <div ref={setNodeRef} className={cx('flex min-h-40 flex-col rounded-2xl border bg-surface/50 p-2 transition', isOver ? 'border-blue/60 bg-blue-soft' : 'border-line')}>
      <div className="flex items-center justify-between px-2 pt-1 pb-2">
        <div>
          <span className="text-sm font-semibold">{titulo}</span> <span className="num text-xs text-faint">{ideas.length}</span>
        </div>
        {accion}
      </div>
      <div className="flex-1 space-y-2">
        {ideas.map((i) => (
          <Tarjeta key={i.id} idea={i} onClick={() => onEditar(i)} />
        ))}
        {ideas.length === 0 && <div className="px-2 py-4 text-center text-[11px] text-faint">{ayuda}</div>}
      </div>
    </div>
  )
}

function Tarjeta({ idea, onClick }: { idea: Idea; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: idea.id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={cx('cursor-grab touch-manipulation rounded-xl border border-line bg-surface p-3 text-left transition hover:border-line-2 active:cursor-grabbing', isDragging && 'relative z-30 scale-[1.02] shadow-2xl ring-1 ring-line-2')}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 text-sm leading-snug font-medium">{idea.titulo || <span className="text-faint">Sin título</span>}</div>
        {idea.estrella && <Star size={13} className="shrink-0 fill-violet text-violet" />}
      </div>
      {idea.gancho && <div className="mt-1 line-clamp-2 text-[11px] text-muted italic">«{idea.gancho}»</div>}
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <ChipLinea linea={idea.linea} />
        <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted">{idea.embudo}</span>
        {idea.filtro?.length > 0 && <span className="text-[10px] text-faint">filtro {idea.filtro.length}/6</span>}
      </div>
    </div>
  )
}

function ZonaPublicar() {
  const { setNodeRef, isOver } = useDroppable({ id: 'publicar' })
  return (
    <div ref={setNodeRef} className={cx('grid min-h-40 place-items-center rounded-2xl border-2 border-dashed p-4 text-center transition', isOver ? 'border-green bg-green-soft text-green' : 'border-line-2 text-faint')}>
      <div>
        <Send size={20} className="mx-auto mb-2" />
        <div className="text-sm font-semibold">Publicar</div>
        <div className="mt-1 text-[11px]">Suelta aquí lo que subiste. Los de Ads pasan a Ads como anuncio</div>
      </div>
    </div>
  )
}

// ── Editar idea ───────────────────────────────────────────────────────

function EditarIdea({ idea: inicial, onCerrar }: { idea: Partial<Idea>; onCerrar: () => void }) {
  const [i, setI] = useState(inicial)
  const set = (c: Partial<Idea>) => setI({ ...i, ...c })
  const emb = EMBUDOS.find((e) => e.k === i.embudo)!
  const guardar = () => {
    if (i.id) {
      const { id, ...r } = i
      actualizar('ideas', id, r)
    } else insertar('ideas', i)
    onCerrar()
  }
  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={i.id ? 'Idea' : 'Nueva idea'}
      ancho="max-w-3xl"
      pie={
        <>
          {i.id && (
            <>
              <Btn
                variante="fantasma"
                className="mr-auto text-red"
                onClick={() => {
                  if (confirm('¿Borrar esta idea?')) {
                    borrar('ideas', i.id!)
                    onCerrar()
                  }
                }}
              >
                <Trash2 size={14} />
              </Btn>
              <Btn
                variante="fantasma"
                onClick={() => {
                  actualizar('ideas', i.id!, { etapa: 'archivado' })
                  onCerrar()
                }}
              >
                <Archive size={14} /> Archivar
              </Btn>
            </>
          )}
          <Btn variante="primario" onClick={guardar} disabled={!i.titulo}>
            Guardar
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Segmento valor={i.linea!} onChange={(v) => set({ linea: v, formato: v === 'ads' ? 'Video de pauta (4 + 1)' : i.formato })} opciones={LINEAS.map((l) => ({ valor: l.k, etiqueta: l.n }))} />
          <Segmento valor={i.embudo!} onChange={(v) => set({ embudo: v })} opciones={EMBUDOS.map((e) => ({ valor: e.k, etiqueta: e.n }))} />
          <button onClick={() => set({ estrella: !i.estrella })} className="ml-auto rounded-lg p-2 text-muted hover:bg-surface-2" title="Prioridad">
            <Star size={16} className={cx(i.estrella && 'fill-violet text-violet')} />
          </button>
        </div>
        <div className="text-[11px] text-faint">
          {LINEA[i.linea!].d} · <b className="text-muted">{emb.n}:</b> {emb.d}
        </div>
        <Campo etiqueta="Idea / título">
          <Input value={i.titulo} onChange={(e) => set({ titulo: e.target.value })} placeholder="De qué trata, en una frase" />
        </Campo>
        <Campo etiqueta="Gancho (los primeros 3 segundos)">
          <Input value={i.gancho} onChange={(e) => set({ gancho: e.target.value })} placeholder="Nombra el dolor con sus palabras" />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Formato">
            <Select value={i.formato} onChange={(e) => set({ formato: e.target.value })}>
              {FORMATOS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Pilar">
            <Input value={i.pilar} onChange={(e) => set({ pilar: e.target.value })} placeholder="cubeta ancha, angosta…" />
          </Campo>
        </div>
        <Card className="grid gap-2 p-3 text-xs sm:grid-cols-3">
          {[
            ['Abre', emb.abre],
            ['Sostiene', emb.sostiene],
            ['Cierra', emb.cierra],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="font-semibold text-text">{k}</div>
              <div className="text-muted">{v}</div>
            </div>
          ))}
        </Card>
        <Campo etiqueta="Guion" ayuda="El talking head bueno parece crudo, pero está guionado. Aparece en el modo grabación como teleprompter">
          <Area rows={8} value={i.guion} onChange={(e) => set({ guion: e.target.value })} />
        </Campo>
        <div>
          <div className="mb-1.5 text-xs font-medium text-muted">Filtro antes de grabar</div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {FILTRO.map((f) => (
              <Check key={f} checked={!!i.filtro?.includes(f)} onChange={(v) => set({ filtro: v ? [...(i.filtro ?? []), f] : (i.filtro ?? []).filter((x) => x !== f) })}>
                <span className="text-xs">{f}</span>
              </Check>
            ))}
          </div>
        </div>
        <Campo etiqueta="Notas">
          <Area rows={2} value={i.notas} onChange={(e) => set({ notas: e.target.value })} />
        </Campo>
        {i.framework && <div className="text-[11px] text-faint">Salió de: {i.framework}</div>}
      </div>
    </Modal>
  )
}

// ── Publicar ──────────────────────────────────────────────────────────

function Publicar({ idea, onCerrar }: { idea: Idea; onCerrar: () => void }) {
  const [plataformas, setPlataformas] = useState<string[]>(PLATAFORMAS)
  const [url, setUrl] = useState('')
  const [fecha, setFecha] = useState(hoyISO())
  const esAd = idea.linea === 'ads'
  const confirmar = () => {
    if (esAd) {
      insertar('anuncios', { cuenta: 'olimpo', campana: 'Olimpo · Leads', conjunto: '', audiencia: 'lookalike', nombre: idea.titulo, tipo: idea.formato === 'Estático' ? 'estatico' : 'video', gancho: idea.gancho, angulo: idea.pilar, lanzado: fecha, estado: 'activo', notas: idea.notas })
      avisar('Anuncio creado en Ads. Ponle el adset y el nombre igual que en Meta.', 'ok')
    } else {
      insertar('piezas', { idea_id: idea.id, linea: idea.linea, titulo: idea.titulo, gancho: idea.gancho, formato: idea.formato, embudo: idea.embudo, framework: idea.framework, plataformas, url, publicado: fecha, notas: '' })
      avisar('Publicada. En 7 días te aviso para medirla.', 'ok')
    }
    actualizar('ideas', idea.id, { etapa: 'publicado' })
    onCerrar()
  }
  return (
    <Modal abierto onCerrar={onCerrar} titulo={esAd ? 'Lanzar como anuncio' : 'Publicar'} pie={<Btn variante="primario" onClick={confirmar}>{esAd ? 'Crear el anuncio' : 'Publicar'}</Btn>}>
      <div className="space-y-4">
        <div className="text-sm font-medium">{idea.titulo}</div>
        <Campo etiqueta={esAd ? 'Lanzado el' : 'Publicado el'}>
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Campo>
        {!esAd && (
          <>
            <div className="flex flex-wrap gap-3">
              {PLATAFORMAS.map((p) => (
                <Check key={p} checked={plataformas.includes(p)} onChange={(v) => setPlataformas(v ? [...plataformas, p] : plataformas.filter((x) => x !== p))}>
                  {p}
                </Check>
              ))}
            </div>
            <Campo etiqueta="Link (opcional)">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} />
            </Campo>
          </>
        )}
      </div>
    </Modal>
  )
}

// ── Modo grabación (teleprompter) ─────────────────────────────────────

function ModoGrabacion({ ideas, onCerrar }: { ideas: Idea[]; onCerrar: () => void }) {
  const [i, setI] = useState(0)
  const [vel, setVel] = useState(0) // 0 = quieto
  const caja = useRef<HTMLDivElement>(null)
  const idea = ideas[i]
  useEffect(() => {
    if (!vel) return
    const t = setInterval(() => caja.current?.scrollBy({ top: vel }), 40)
    return () => clearInterval(t)
  }, [vel])
  useEffect(() => {
    caja.current?.scrollTo({ top: 0 })
    setVel(0)
  }, [i])
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', f)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', f)
      document.body.style.overflow = ''
    }
  }, [onCerrar])
  if (!idea) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex items-center gap-3 p-4 text-xs text-white/60">
        <span>
          {i + 1} / {ideas.length}
        </span>
        <span className="truncate">{idea.titulo}</span>
        <button onClick={onCerrar} className="ml-auto p-1 hover:text-white">
          <X size={20} />
        </button>
      </div>
      <div ref={caja} className="flex-1 overflow-y-auto px-6 pb-[40vh] md:px-[15vw]">
        {idea.gancho && <p className="mb-8 font-serif text-4xl leading-tight md:text-6xl">{idea.gancho}</p>}
        <p className="text-3xl leading-relaxed whitespace-pre-line md:text-5xl md:leading-snug">{idea.guion || <span className="text-white/40">Esta idea no tiene guion. Escríbelo en la tarjeta.</span>}</p>
      </div>
      <div className="grid grid-cols-4 gap-2 p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
        <Btn className="h-12 border-white/20 bg-white/10 text-white" onClick={() => setVel((v) => (v >= 3 ? 0 : v + 1))}>
          <Mic size={15} /> {vel ? `Vel. ${vel}` : 'Rodar'}
        </Btn>
        <Btn className="h-12 border-white/20 bg-white/10 text-white" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>
          Anterior
        </Btn>
        <Btn className="h-12 border-white/20 bg-white/10 text-white" onClick={() => setI(Math.min(ideas.length - 1, i + 1))} disabled={i === ideas.length - 1}>
          Siguiente
        </Btn>
        <Btn
          className="h-12 bg-white text-black hover:bg-white/90"
          onClick={() => {
            actualizar('ideas', idea.id, { etapa: 'editar', posicion: Date.now() })
            if (i >= ideas.length - 1) onCerrar()
          }}
        >
          Grabada → Editar
        </Btn>
      </div>
    </div>,
    document.body,
  )
}
