import { BookOpen, Database, Lightbulb, Plus, Search, Sparkles, Wand2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ideaVacia, ChipLinea, type FiltroLinea } from '../../pages/Contenido'
import { CATEGORIAS, LINEA, LINEAS, rellenar, resumenPieza, type Framework, type PaqueteIdeacion } from '../../lib/contenido'
import { usePaquete } from '../../lib/paquetes'
import { avisar, insertar, useTabla } from '../../lib/store'
import type { Embudo, Idea, Linea } from '../../lib/types'
import { Markdown } from '../Markdown'
import { Badge, Btn, Card, CardHead, Input, Modal, Segmento, Select, Vacio } from '../ui'

interface Sugerencia {
  linea: Linea
  embudo: Embudo
  titulo: string
  gancho?: string
  origen: string
  framework: string
}

export function Ideacion({ linea, onCrear }: { linea: FiltroLinea; onCrear: (i: Partial<Idea>) => void }) {
  const { datos: p, estado } = usePaquete<PaqueteIdeacion>('ideacion')
  const [gen, setGen] = useState<'datos' | 'giros' | 'ganchos' | 'linea'>('datos')

  if (estado === 'falta' || (!p && estado !== 'cargando'))
    return (
      <Card>
        <Vacio icono={<BookOpen size={20} />} titulo="Falta el paquete de ideación" texto="Es privado: genéralo con node scripts/generar-ideacion.mjs (queda en public/privado/ideacion.json)." />
      </Card>
    )
  if (!p) return null

  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
      <div className="space-y-4">
        <Segmento
          valor={gen}
          onChange={setGen}
          className="max-w-full overflow-x-auto"
          opciones={[
            { valor: 'datos', etiqueta: 'Desde tus datos' },
            { valor: 'giros', etiqueta: 'Los 5 giros' },
            { valor: 'ganchos', etiqueta: 'Ganchos de pauta' },
            { valor: 'linea', etiqueta: 'Por línea' },
          ]}
        />
        {gen === 'datos' && <DesdeTusDatos linea={linea} />}
        {gen === 'giros' && <Giros p={p} linea={linea} />}
        {gen === 'ganchos' && <Ganchos p={p} />}
        {gen === 'linea' && <PorLinea p={p} linea={linea} onCrear={onCrear} />}
      </div>
      <Biblioteca p={p} linea={linea} onCrear={onCrear} />
    </div>
  )
}

function ListaSugerencias({ items, vacio }: { items: Sugerencia[]; vacio: string }) {
  const [agregadas, setAgregadas] = useState<string[]>([])
  const agregar = (s: Sugerencia) => {
    insertar('ideas', ideaVacia(s.linea, { titulo: s.titulo, gancho: s.gancho ?? '', embudo: s.embudo, framework: s.framework, notas: s.origen }))
    setAgregadas((a) => [...a, s.titulo])
  }
  if (!items.length) return <div className="px-5 pb-5 text-xs text-faint">{vacio}</div>
  return (
    <div className="space-y-1.5 px-3 pb-3">
      {items.map((s, i) => {
        const ya = agregadas.includes(s.titulo)
        return (
          <div key={i} className="flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-surface-2/60">
            <div className="min-w-0 flex-1">
              <div className="text-sm">{s.titulo}</div>
              {s.gancho && <div className="text-[11px] text-muted italic">«{s.gancho}»</div>}
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <ChipLinea linea={s.linea} />
                <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted">{s.embudo}</span>
                <span className="truncate text-[10px] text-faint">{s.origen}</span>
              </div>
            </div>
            <Btn chico variante={ya ? 'fantasma' : 'secundario'} disabled={ya} onClick={() => agregar(s)}>
              {ya ? 'Agregada' : <Plus size={13} />}
            </Btn>
          </div>
        )
      })}
    </div>
  )
}

/** «Documenta, no crees»: las ideas ya existen en lo que registras. */
function DesdeTusDatos({ linea }: { linea: FiltroLinea }) {
  const reuniones = useTabla('reuniones')
  const boveda = useTabla('boveda')
  const banco = useTabla('banco')
  const revisiones = useTabla('revisiones')
  const personas = useTabla('personas')
  const piezas = useTabla('piezas')
  const metricas = useTabla('metricas_pieza')

  const items = useMemo(() => {
    const out: Sugerencia[] = []
    const vistas = new Set<string>()
    const mete = (s: Sugerencia) => {
      const k = s.titulo.toLowerCase()
      if (!vistas.has(k)) {
        vistas.add(k)
        out.push(s)
      }
    }
    // Objeciones de las llamadas de venta y de la bóveda → la agencia responde (BOF)
    for (const r of reuniones) if (r.objecion) mete({ linea: 'agencia', embudo: 'BOF', titulo: `Responder la objeción: «${r.objecion}»`, origen: `objeción en la llamada con ${r.nombre}`, framework: 'cinco-giros · responder la objeción' })
    for (const b of boveda) if (b.tipo === 'objecion') mete({ linea: 'agencia', embudo: 'BOF', titulo: `Responder la objeción: «${b.texto}»`, origen: 'bóveda de objeciones', framework: 'cinco-giros · responder la objeción' })
    for (const b of boveda) if (b.tipo === 'pregunta') mete({ linea: 'agencia', embudo: 'MOF', titulo: `La pregunta que me hacen siempre: «${b.texto}»`, origen: 'bóveda de preguntas', framework: 'tabla-de-ideacion' })
    // Lo que te escribió la gente → contenido que ya demostró interés
    for (const x of personas) if (x.disparador) mete({ linea: x.linea, embudo: 'MOF', titulo: `Lo que me escribieron: «${x.disparador}»`, origen: `${x.nombre} por ${x.plataforma}`, framework: 'mineria-voc' })
    // Lo que enfrentaste en el banco → marca personal, documentar el proceso
    for (const b of banco.filter((m) => m.tipo === 'enfrente').slice(-10)) mete({ linea: 'marca', embudo: 'MOF', titulo: `Lo que enfrenté: ${b.texto}`, origen: 'Banco de Sufrimiento', framework: 'document-dont-create' })
    // Aprendizajes de la revisión semanal → marca personal, historia
    for (const r of revisiones) {
      if (r.aprendizaje) mete({ linea: 'marca', embudo: 'TOF', titulo: `Lo que aprendí esta semana: ${r.aprendizaje.slice(0, 90)}`, origen: `revisión ${r.semana}`, framework: 'document-dont-create' })
      if (r.no_funciono) mete({ linea: 'marca', embudo: 'MOF', titulo: `Un error propio: ${r.no_funciono.slice(0, 90)}`, origen: `revisión ${r.semana}`, framework: 'document-dont-create' })
    }
    // La pieza que mejor convirtió → segunda parte
    const mejor = piezas
      .map((p) => ({ p, r: resumenPieza(p, metricas, personas) }))
      .filter((x) => x.r.medida)
      .sort((a, b) => b.r.conversaciones - a.r.conversaciones || (b.r.seguidoresPorMil ?? 0) - (a.r.seguidoresPorMil ?? 0))[0]
    if (mejor) mete({ linea: mejor.p.linea, embudo: mejor.p.embudo, titulo: `Segunda parte de «${mejor.p.titulo}»`, gancho: mejor.p.gancho, origen: 'tu pieza que más convirtió', framework: 'concepto probado' })
    return out.filter((s) => linea === 'todas' || s.linea === linea)
  }, [reuniones, boveda, banco, revisiones, personas, piezas, metricas, linea])

  return (
    <Card>
      <CardHead titulo="Ideas desde tus datos" sub="«Document, don't create»: el contenido ya existe en tus objeciones, en lo que te escriben y en lo que enfrentas. Aquí se minan" icono={<Database size={15} />} />
      <ListaSugerencias items={items} vacio="A medida que registres objeciones en Ventas y la Bóveda, personas que te escriben, el Banco de Sufrimiento y tu revisión semanal, aquí aparecen ideas sacadas de eso." />
    </Card>
  )
}

function Giros({ p, linea }: { p: PaqueteIdeacion; linea: FiltroLinea }) {
  const [dolor, setDolor] = useState('')
  const [l, setL] = useState<Linea>(linea === 'todas' ? 'agencia' : linea)
  const items: Sugerencia[] = dolor.trim()
    ? p.giros.map((g) => ({ linea: l, embudo: g.embudo, titulo: rellenar(g.plantilla, dolor), origen: `giro ${g.n} · ${g.giro}`, framework: `cinco-giros · ${g.giro.toLowerCase()}` }))
    : []
  return (
    <Card>
      <CardHead titulo="Los 5 giros" sub="Un dolor no es un post, es una fuente: cinco piezas, una por estado de consciencia. Elige el dolor que más se repite, no el más atractivo" icono={<Sparkles size={15} />} />
      <div className="flex flex-col gap-2 px-5 pb-3 sm:flex-row">
        <Input value={dolor} onChange={(e) => setDolor(e.target.value)} placeholder="El dolor, con sus palabras: «tengo la agenda medio vacía»" />
        <Select value={l} onChange={(e) => setL(e.target.value as Linea)} className="sm:w-40">
          {LINEAS.map((x) => (
            <option key={x.k} value={x.k}>
              {x.n}
            </option>
          ))}
        </Select>
      </div>
      <ListaSugerencias items={items} vacio="Escribe un dolor y salen cinco ideas: mecanismo, quitar la culpa, caso, comparación y objeción. Un giro por pieza." />
    </Card>
  )
}

function Ganchos({ p }: { p: PaqueteIdeacion }) {
  const [dolor, setDolor] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const lote = () => {
    const base = cuerpo.trim() || dolor.trim()
    insertar(
      'ideas',
      p.tipos_gancho.map((t) => ideaVacia('ads', { titulo: `${base} · ${t.tipo}`, gancho: rellenar(t.plantilla, dolor), embudo: 'TOF', framework: `ganchos-de-pauta · ${t.tipo.toLowerCase()}`, notas: `Cuerpo común (4 + 1): ${cuerpo}` })),
    )
    avisar('4 creativos creados en el pipeline, uno por tipo de gancho. Reescríbelos: 8-10 borradores, graba los 4 mejores.', 'ok')
  }
  return (
    <Card>
      <CardHead titulo="4 ganchos + 1 cuerpo" sub="Para Ads: cada video cambia solo el gancho. Los 4 tienen que ser mensajes MUY distintos" icono={<Wand2 size={15} />} />
      <div className="space-y-2 px-5 pb-4">
        <Input value={dolor} onChange={(e) => setDolor(e.target.value)} placeholder="El dolor del cliente ideal" />
        <Input value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} placeholder="El cuerpo en una línea: promesa → por qué tan seguros → caso → página" />
        {dolor.trim() && (
          <div className="space-y-1.5 pt-2">
            {p.tipos_gancho.map((t) => (
              <div key={t.tipo} className="rounded-xl bg-surface-2/60 px-3 py-2">
                <div className="text-[10px] font-semibold tracking-wide text-faint uppercase">{t.tipo}</div>
                <div className="text-sm italic">«{rellenar(t.plantilla, dolor)}»</div>
              </div>
            ))}
            <Btn variante="primario" className="mt-2 w-full" onClick={lote}>
              <Plus size={14} /> Crear los 4 creativos
            </Btn>
          </div>
        )}
        <p className="text-[11px] text-faint">Las 7 claves: cuadra con el cuerpo · distinto · relevante · beneficio al instante · novedad · una idea · no deja salir.</p>
      </div>
    </Card>
  )
}

function PorLinea({ p, linea, onCrear }: { p: PaqueteIdeacion; linea: FiltroLinea; onCrear: (i: Partial<Idea>) => void }) {
  const lineas = linea === 'todas' ? LINEAS.map((l) => l.k) : [linea]
  return (
    <Card>
      <CardHead titulo="Qué sacar en cada línea" sub="Puntos de partida por embudo. Toca uno y escríbelo con tu caso" icono={<Lightbulb size={15} />} />
      <div className="space-y-4 px-5 pb-5">
        {lineas.map((l) => (
          <div key={l}>
            <div className="mb-1.5 text-[11px] font-semibold tracking-wide uppercase" style={{ color: LINEA[l].color }}>
              {LINEA[l].n}
            </div>
            <div className="space-y-1">
              {p.por_linea[l].map((x) => (
                <button key={x.idea} onClick={() => onCrear(ideaVacia(l, { titulo: x.idea, embudo: x.embudo, framework: 'por línea' }))} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-2">
                  <span className="w-9 shrink-0 font-mono text-[10px] text-faint">{x.embudo}</span>
                  {x.idea}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Biblioteca({ p, linea, onCrear }: { p: PaqueteIdeacion; linea: FiltroLinea; onCrear: (i: Partial<Idea>) => void }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [abierto, setAbierto] = useState<Framework | null>(null)
  const lista = p.frameworks.filter((f) => (linea === 'todas' || f.lineas.includes(linea)) && (!cat || f.categoria === cat) && (!q || (f.titulo + f.resumen + f.autor).toLowerCase().includes(q.toLowerCase())))
  const cats = [...new Set(p.frameworks.map((f) => f.categoria))]
  return (
    <Card>
      <CardHead titulo="Biblioteca de frameworks" sub={`${p.frameworks.length} formas de pensar el contenido: tus 20 de Marca, los de Imperium, los de pauta y los del vault`} icono={<BookOpen size={15} />} />
      <div className="flex gap-2 px-5 pb-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
          <Input className="h-9 pl-8 text-xs" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" />
        </div>
        <Select className="h-9 w-36 text-xs" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Todas</option>
          {cats.map((c) => (
            <option key={c} value={c}>
              {CATEGORIAS[c] ?? c}
            </option>
          ))}
        </Select>
      </div>
      <div className="max-h-[70vh] space-y-1.5 overflow-y-auto px-3 pb-3">
        {lista.map((f) => (
          <button key={f.slug} onClick={() => setAbierto(f)} className="w-full rounded-xl px-3 py-2.5 text-left transition hover:bg-surface-2">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{f.titulo}</span>
              <Badge>{CATEGORIAS[f.categoria] ?? f.categoria}</Badge>
            </div>
            <div className="mt-0.5 line-clamp-2 text-[11px] text-muted">{f.resumen}</div>
          </button>
        ))}
      </div>
      {abierto && (
        <Modal
          abierto
          onCerrar={() => setAbierto(null)}
          titulo={abierto.titulo}
          ancho="max-w-2xl"
          pie={
            <Btn
              variante="primario"
              onClick={() => {
                onCrear(ideaVacia(linea === 'todas' ? (abierto.lineas[0] ?? 'marca') : linea, { framework: abierto.titulo }))
                setAbierto(null)
              }}
            >
              <Plus size={14} /> Crear una idea con este framework
            </Btn>
          }
        >
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-faint">
            <span>{abierto.autor}</span>·<span>{abierto.origen}</span>
            {abierto.lineas.map((l) => (
              <ChipLinea key={l} linea={l} />
            ))}
          </div>
          <p className="mb-4 font-serif text-xl leading-snug">{abierto.resumen}</p>
          <Markdown texto={abierto.cuerpo} />
        </Modal>
      )}
    </Card>
  )
}
