import { Plus, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Area, Btn, Campo, Card, cx, Input, Modal, Pagina, Select, Vacio } from '../components/ui'
import { hoyISO } from '../lib/format'
import { actualizar, borrar, insertar, useTabla } from '../lib/store'
import type { Candidato, Grado } from '../lib/types'

const COLUMNAS: { k: Candidato['estado']; n: string }[] = [
  { k: 'postulado', n: 'Postulados' },
  { k: 'entrevista', n: 'Entrevista' },
  { k: 'prueba', n: 'Prueba' },
  { k: 'contratado', n: 'Contratados' },
  { k: 'descartado', n: 'Descartados' },
]
const GRADOS: Grado[] = ['A*', 'A', 'B', 'C', 'D']
const colorGrado = (g: Grado | null) => (g === 'A*' || g === 'A' ? 'text-green bg-green-soft' : g === 'B' ? 'text-blue-2 bg-blue-soft' : g ? 'text-red bg-red-soft' : 'text-faint bg-surface-2')

export default function Equipo() {
  const candidatos = useTabla('candidatos')
  const [editar, setEditar] = useState<Partial<Candidato> | null>(null)
  return (
    <Pagina
      titulo="Equipo"
      sub="La VA Candidates List y el proceso de contratación de 10 pasos (7.3): cada candidato con su grado D · C · B · A · A*. Solo se contrata A o A*."
      acciones={
        <Btn variante="primario" onClick={() => setEditar({ nombre: '', email: '', rol: 'Agendador', fecha: hoyISO(), estado: 'postulado', grado: null, notas: '' })}>
          <Plus size={15} /> Candidato
        </Btn>
      }
    >
      {candidatos.length === 0 ? (
        <Card>
          <Vacio icono={<UserPlus size={20} />} titulo="Sin candidatos" texto="Jerarquía de contratación (7.2): el outreach va primero. Contrata donde duele, y antes pasa la tarea por eliminar → automatizar → delegar (mira Tiempo)." />
        </Card>
      ) : (
        <div className="grid gap-3 overflow-x-auto md:grid-cols-5">
          {COLUMNAS.map((c) => (
            <div key={c.k} className="min-w-[200px]">
              <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold text-muted">
                {c.n}
                <span className="text-faint">{candidatos.filter((x) => x.estado === c.k).length}</span>
              </div>
              <div className="space-y-2">
                {candidatos
                  .filter((x) => x.estado === c.k)
                  .map((x) => (
                    <Card key={x.id} className="cursor-pointer p-3 hover:border-line-2" onClick={() => setEditar(x)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{x.nombre}</div>
                          <div className="truncate text-xs text-muted">{x.rol}</div>
                        </div>
                        <span className={cx('rounded-md px-1.5 py-0.5 text-[11px] font-bold', colorGrado(x.grado))}>{x.grado ?? '—'}</span>
                      </div>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {editar && (
        <Modal
          abierto
          onCerrar={() => setEditar(null)}
          titulo={editar.id ? editar.nombre : 'Nuevo candidato'}
          pie={
            <>
              {editar.id && (
                <Btn
                  variante="fantasma"
                  className="mr-auto text-red"
                  onClick={() => {
                    borrar('candidatos', editar.id!)
                    setEditar(null)
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
                    actualizar('candidatos', id, r)
                  } else insertar('candidatos', editar)
                  setEditar(null)
                }}
              >
                Guardar
              </Btn>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Nombre">
              <Input value={editar.nombre} onChange={(e) => setEditar({ ...editar, nombre: e.target.value })} />
            </Campo>
            <Campo etiqueta="Email">
              <Input value={editar.email} onChange={(e) => setEditar({ ...editar, email: e.target.value })} />
            </Campo>
            <Campo etiqueta="Rol">
              <Input value={editar.rol} onChange={(e) => setEditar({ ...editar, rol: e.target.value })} />
            </Campo>
            <Campo etiqueta="Postuló el">
              <Input type="date" value={editar.fecha} onChange={(e) => setEditar({ ...editar, fecha: e.target.value })} />
            </Campo>
            <Campo etiqueta="Etapa">
              <Select value={editar.estado} onChange={(e) => setEditar({ ...editar, estado: e.target.value as Candidato['estado'] })}>
                {COLUMNAS.map((c) => (
                  <option key={c.k} value={c.k}>
                    {c.n}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etiqueta="Grado">
              <Select value={editar.grado ?? ''} onChange={(e) => setEditar({ ...editar, grado: (e.target.value || null) as Grado | null })}>
                <option value="">Sin evaluar</option>
                {GRADOS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </Select>
            </Campo>
            <Campo etiqueta="Notas" className="col-span-2" ayuda="Qué lo atrajo, prioridades, disponibilidad, equipo e internet (preguntas de la VA Candidates List)">
              <Area rows={5} value={editar.notas} onChange={(e) => setEditar({ ...editar, notas: e.target.value })} />
            </Campo>
          </div>
        </Modal>
      )}
    </Pagina>
  )
}
