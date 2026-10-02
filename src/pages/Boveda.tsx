import { BookOpen, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Area, Btn, Campo, Card, cx, Input, Modal, Num, Pagina, Segmento, Vacio } from '../components/ui'
import { borrar, insertar, actualizar, useTabla } from '../lib/store'
import type { EntradaBoveda } from '../lib/types'

export default function Boveda() {
  const boveda = useTabla('boveda')
  const llamadas = useTabla('llamadas')
  const reuniones = useTabla('reuniones')
  const [tipo, setTipo] = useState<'objecion' | 'pregunta'>('objecion')
  const [q, setQ] = useState('')
  const [editar, setEditar] = useState<Partial<EntradaBoveda> | null>(null)

  // Cuántas veces apareció cada objeción en llamadas y citas
  const vistas = useMemo(() => {
    const m = new Map<string, number>()
    for (const x of [...llamadas.map((l) => l.objecion), ...reuniones.map((r) => r.objecion)]) {
      if (!x) continue
      const k = x.trim().toLowerCase()
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return m
  }, [llamadas, reuniones])

  const lista = boveda
    .filter((b) => b.tipo === tipo && (!q || (b.texto + b.respuesta).toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => (vistas.get(b.texto.toLowerCase()) ?? 0) - (vistas.get(a.texto.toLowerCase()) ?? 0) || (b.puntaje ?? 0) - (a.puntaje ?? 0))

  const sinRespuesta = [...vistas.entries()].filter(([k]) => !boveda.some((b) => b.texto.toLowerCase() === k)).sort((a, b) => b[1] - a[1])

  return (
    <Pagina
      titulo="Bóveda"
      sub="El Rebuttal Vault y el Sales Q&A Vault: cada objeción con su mejor respuesta y un puntaje de 1 a 10. Las objeciones que anotas al llamar aparecen acá para que les escribas respuesta."
      acciones={
        <>
          <Segmento
            valor={tipo}
            onChange={setTipo}
            opciones={[
              { valor: 'objecion', etiqueta: 'Objeciones' },
              { valor: 'pregunta', etiqueta: 'Preguntas' },
            ]}
          />
          <Btn variante="primario" onClick={() => setEditar({ tipo, texto: '', respuesta: '', puntaje: null, veces: 0 })}>
            <Plus size={15} /> Nueva
          </Btn>
        </>
      }
    >
      {tipo === 'objecion' && sinRespuesta.length > 0 && (
        <Card className="mb-5 p-4">
          <div className="mb-2 text-xs font-semibold text-amber">Objeciones que escuchaste y todavía no tienen respuesta</div>
          <div className="flex flex-wrap gap-2">
            {sinRespuesta.slice(0, 12).map(([k, n]) => (
              <button key={k} onClick={() => setEditar({ tipo: 'objecion', texto: k.charAt(0).toUpperCase() + k.slice(1), respuesta: '', puntaje: null, veces: n })} className="rounded-lg border border-amber/30 bg-amber-soft px-2.5 py-1 text-xs text-amber hover:bg-amber/20">
                {k} · {n}
              </button>
            ))}
          </div>
        </Card>
      )}
      <div className="relative mb-4 max-w-md">
        <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
        <Input className="pl-9" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {lista.length === 0 ? (
        <Card>
          <Vacio icono={<BookOpen size={20} />} titulo="La bóveda está vacía" texto="Puedes traer las objeciones del banco de respuestas de Olimpo (04c) o ir llenándola con lo que escuchas." />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {lista.map((b) => (
            <Card key={b.id} className="group cursor-pointer p-4 transition hover:border-line-2" onClick={() => setEditar(b)}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">«{b.texto}»</div>
                  <p className="mt-2 text-sm whitespace-pre-line text-muted">{b.respuesta || <i className="text-faint">sin respuesta todavía</i>}</p>
                </div>
                {b.puntaje != null && (
                  <div className={cx('num shrink-0 rounded-xl px-2 py-1 text-sm font-bold', b.puntaje >= 8 ? 'bg-green-soft text-green' : b.puntaje >= 5 ? 'bg-amber-soft text-amber' : 'bg-red-soft text-red')}>{b.puntaje}/10</div>
                )}
              </div>
              {(vistas.get(b.texto.toLowerCase()) ?? 0) > 0 && <div className="mt-2 text-[11px] text-faint">la escuchaste {vistas.get(b.texto.toLowerCase())} veces</div>}
            </Card>
          ))}
        </div>
      )}
      {editar && (
        <Modal
          abierto
          onCerrar={() => setEditar(null)}
          titulo={editar.tipo === 'objecion' ? 'Objeción' : 'Pregunta'}
          pie={
            <>
              {editar.id && (
                <Btn
                  variante="fantasma"
                  className="mr-auto text-red"
                  onClick={() => {
                    borrar('boveda', editar.id!)
                    setEditar(null)
                  }}
                >
                  <Trash2 size={14} /> Borrar
                </Btn>
              )}
              <Btn
                variante="primario"
                disabled={!editar.texto}
                onClick={() => {
                  if (editar.id) {
                    const { id, ...r } = editar
                    actualizar('boveda', id, r)
                  } else insertar('boveda', editar)
                  setEditar(null)
                }}
              >
                Guardar
              </Btn>
            </>
          }
        >
          <div className="space-y-3">
            <Campo etiqueta={editar.tipo === 'objecion' ? 'Lo que dice el doctor' : 'La pregunta'}>
              <Input value={editar.texto} onChange={(e) => setEditar({ ...editar, texto: e.target.value })} />
            </Campo>
            <Campo etiqueta="La respuesta">
              <Area rows={6} value={editar.respuesta} onChange={(e) => setEditar({ ...editar, respuesta: e.target.value })} />
            </Campo>
            <Campo etiqueta="Puntaje /10" ayuda="Qué tan bien funciona en la práctica">
              <Num value={editar.puntaje} onChange={(n) => setEditar({ ...editar, puntaje: n })} min={1} max={10} />
            </Campo>
          </div>
        </Modal>
      )}
    </Pagina>
  )
}
