import { addDays, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Btn, Campo, Card, CardHead, Check, cx, Input, Kpi, Modal, Num, Pagina, Segmento, Select, Tabla, td, th, Vacio } from '../components/ui'
import { CAT_TIEMPO } from '../lib/doctrina'
import { fmt, hoyISO } from '../lib/format'
import { actualizar, borrar, insertar, useTabla } from '../lib/store'
import type { BloqueTiempo, Tarea, ValorBloque } from '../lib/types'

const HORAS = Array.from({ length: 36 }, (_, i) => {
  const m = 6 * 60 + i * 30
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
})
const color = (c: string) => CAT_TIEMPO.find((x) => x.nombre === c)?.color ?? 'var(--faint)'

export default function Tiempo() {
  const [tab, setTab] = useState<'unidades' | 'tareas'>('unidades')
  return (
    <Pagina
      titulo="Tiempo"
      sub="Las 100 unidades de tiempo (7.x) y el registro de tareas para decidir qué se elimina, se automatiza o se delega."
      acciones={
        <Segmento
          valor={tab}
          onChange={setTab}
          opciones={[
            { valor: 'unidades', etiqueta: '100 unidades' },
            { valor: 'tareas', etiqueta: 'Registro de tareas' },
          ]}
        />
      }
    >
      {tab === 'unidades' ? <Unidades /> : <Tareas />}
    </Pagina>
  )
}

function Unidades() {
  const bloques = useTabla('bloques')
  const [dia, setDia] = useState(hoyISO())
  const [pincel, setPincel] = useState<{ categoria: string; valor: ValorBloque; actividad: string }>({ categoria: 'Outreach', valor: 'valor', actividad: '' })
  const delDia = useMemo(() => new Map(bloques.filter((b) => b.fecha === dia).map((b) => [b.hora, b])), [bloques, dia])

  const pintar = (hora: string) => {
    const b = delDia.get(hora)
    if (b && b.categoria === pincel.categoria && b.valor === pincel.valor) return borrar('bloques', b.id)
    const fila: Partial<BloqueTiempo> = { fecha: dia, hora, ...pincel, actividad: pincel.actividad || pincel.categoria }
    if (b) actualizar('bloques', b.id, fila)
    else insertar('bloques', fila)
  }

  const semana = useMemo(() => {
    const d0 = parseISO(dia)
    const dias = Array.from({ length: 7 }, (_, i) => format(addDays(d0, -6 + i), 'yyyy-MM-dd'))
    const xs = bloques.filter((b) => dias.includes(b.fecha))
    const porCat = CAT_TIEMPO.map((c) => ({ ...c, horas: xs.filter((b) => b.categoria === c.nombre).length / 2 })).filter((c) => c.horas > 0)
    const valor = xs.filter((b) => b.valor === 'valor').length
    const desperdicio = xs.filter((b) => b.valor === 'desperdicio').length
    return { porCat, valor: valor / 2, desperdicio: desperdicio / 2, total: xs.length / 2 }
  }, [bloques, dia])

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <Btn chico variante="fantasma" onClick={() => setDia(format(addDays(parseISO(dia), -1), 'yyyy-MM-dd'))}>
            <ChevronLeft size={16} />
          </Btn>
          <div className="min-w-40 text-center text-sm font-semibold first-letter:uppercase">{format(parseISO(dia), "EEEE d 'de' MMMM", { locale: es })}</div>
          <Btn chico variante="fantasma" onClick={() => setDia(format(addDays(parseISO(dia), 1), 'yyyy-MM-dd'))}>
            <ChevronRight size={16} />
          </Btn>
          <span className="ml-auto text-xs text-faint">Toca un bloque para pintarlo con el pincel</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 p-3 sm:grid-cols-3 lg:grid-cols-4">
          {HORAS.map((h) => {
            const b = delDia.get(h)
            return (
              <button
                key={h}
                onClick={() => pintar(h)}
                className={cx('pop flex h-11 items-center gap-2 rounded-xl border px-2.5 text-left text-xs transition', b ? 'border-transparent' : 'border-line hover:border-line-2')}
                style={b ? { background: color(b.categoria) + '26', borderColor: color(b.categoria) + '55' } : undefined}
              >
                <span className="num w-10 text-faint">{h}</span>
                {b && (
                  <span className="min-w-0 flex-1 truncate font-medium" style={{ color: color(b.categoria) }}>
                    {b.actividad}
                    {b.valor === 'desperdicio' && ' ✕'}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-4">
          <div className="mb-3 text-xs font-medium text-muted">Pincel</div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {CAT_TIEMPO.map((c) => (
              <button
                key={c.nombre}
                onClick={() => setPincel({ ...pincel, categoria: c.nombre, valor: c.nombre === 'Distracción' ? 'desperdicio' : pincel.valor === 'desperdicio' ? 'valor' : pincel.valor })}
                className={cx('rounded-lg border px-2 py-1 text-xs font-medium transition', pincel.categoria === c.nombre ? 'ring-2 ring-offset-0' : 'opacity-70 hover:opacity-100')}
                style={{ color: c.color, borderColor: c.color + '55', background: c.color + '18', ['--tw-ring-color' as string]: c.color }}
              >
                {c.nombre}
              </button>
            ))}
          </div>
          <Input className="mb-3 h-9" placeholder="Actividad (opcional)" value={pincel.actividad} onChange={(e) => setPincel({ ...pincel, actividad: e.target.value })} />
          <Segmento
            valor={pincel.valor}
            onChange={(v) => setPincel({ ...pincel, valor: v })}
            opciones={[
              { valor: 'valor', etiqueta: 'Valor' },
              { valor: 'neutro', etiqueta: 'Neutro' },
              { valor: 'desperdicio', etiqueta: 'Desperdicio' },
            ]}
          />
        </Card>
        <Card>
          <CardHead titulo="Últimos 7 días" sub={`${fmt.dec(semana.total)} h registradas`} />
          <div className="space-y-2 px-4 pb-4">
            <div className="grid grid-cols-2 gap-2">
              <Kpi etiqueta="Valor" valor={`${fmt.dec(semana.valor)} h`} tono="ok" />
              <Kpi etiqueta="Desperdicio" valor={`${fmt.dec(semana.desperdicio)} h`} tono={semana.desperdicio > 0 ? 'critico' : 'nada'} />
            </div>
            {semana.porCat.map((c) => (
              <div key={c.nombre} className="flex items-center gap-2 text-sm">
                <span className="size-2.5 rounded-sm" style={{ background: c.color }} />
                <span className="flex-1">{c.nombre}</span>
                <span className="num text-muted">{fmt.dec(c.horas)} h</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function Tareas() {
  const tareas = useTabla('tareas')
  const [nueva, setNueva] = useState<Partial<Tarea> | null>(null)
  const filas = useMemo(() => tareas.map((t) => ({ t, horas: (t.veces_semana * t.minutos) / 60 })).sort((a, b) => b.horas - a.horas), [tareas])
  const total = filas.reduce((a, f) => a + f.horas, 0)
  const delegables = filas.filter((f) => !f.t.requiere_habilidad).reduce((a, f) => a + f.horas, 0)

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Kpi etiqueta="Horas por semana en tareas" valor={fmt.dec(total)} />
        <Kpi etiqueta="Sin habilidad (delegables)" valor={`${fmt.dec(delegables)} h`} sub={total ? `${fmt.pct(delegables / total, 0)} del total` : undefined} />
        <Kpi etiqueta="Tareas registradas" valor={fmt.n(tareas.length)} sub="Compuerta: eliminar → automatizar → delegar" />
      </div>
      <Card>
        <CardHead
          titulo="Registro de tareas"
          sub="Anota cada tarea repetida. Las que no requieren habilidad y comen más horas son la primera contratación."
          accion={
            <Btn chico variante="primario" onClick={() => setNueva({ tarea: '', categoria: 'Admin', veces_semana: 1, minutos: 10, requiere_habilidad: false, decision: 'pendiente' })}>
              <Plus size={14} /> Tarea
            </Btn>
          }
        />
        {filas.length === 0 ? (
          <Vacio titulo="Sin tareas registradas" texto="Ejemplo del template: «Subir la grabación de la llamada de venta a Drive» · Ventas · 7 veces · 3 min · no requiere habilidad." />
        ) : (
          <Tabla>
            <thead>
              <tr>
                {['Tarea', 'Categoría', 'Veces/sem', 'Min', 'Horas/sem', '¿Habilidad?', 'Decisión', ''].map((h) => (
                  <th key={h} className={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map(({ t, horas }) => (
                <tr key={t.id} className="group">
                  <td className={cx(td, 'max-w-[280px] truncate font-medium')}>{t.tarea}</td>
                  <td className={cx(td, 'text-muted')}>{t.categoria}</td>
                  <td className={cx(td, 'num')}>{t.veces_semana}</td>
                  <td className={cx(td, 'num')}>{t.minutos}</td>
                  <td className={cx(td, 'num font-semibold')}>{fmt.dec(horas)}</td>
                  <td className={td}>
                    <Check checked={t.requiere_habilidad} onChange={(v) => actualizar('tareas', t.id, { requiere_habilidad: v })} />
                  </td>
                  <td className={td}>
                    <Select className="h-8 w-36 text-xs" value={t.decision} onChange={(e) => actualizar('tareas', t.id, { decision: e.target.value as Tarea['decision'] })}>
                      <option value="pendiente">Pendiente</option>
                      <option value="eliminar">Eliminar</option>
                      <option value="automatizar">Automatizar</option>
                      <option value="delegar">Delegar</option>
                      <option value="mantener">Mantener (yo)</option>
                    </Select>
                  </td>
                  <td className={td}>
                    <button onClick={() => borrar('tareas', t.id)} className="text-faint opacity-0 group-hover:opacity-100 hover:text-red">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </Card>
      {nueva && (
        <Modal
          abierto
          onCerrar={() => setNueva(null)}
          titulo="Nueva tarea"
          pie={
            <Btn
              variante="primario"
              disabled={!nueva.tarea}
              onClick={() => {
                insertar('tareas', nueva)
                setNueva(null)
              }}
            >
              Guardar
            </Btn>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Tarea" className="col-span-2">
              <Input value={nueva.tarea} onChange={(e) => setNueva({ ...nueva, tarea: e.target.value })} />
            </Campo>
            <Campo etiqueta="Categoría">
              <Select value={nueva.categoria} onChange={(e) => setNueva({ ...nueva, categoria: e.target.value })}>
                {CAT_TIEMPO.map((c) => (
                  <option key={c.nombre}>{c.nombre}</option>
                ))}
              </Select>
            </Campo>
            <Campo etiqueta="Veces por semana">
              <Num value={nueva.veces_semana} onChange={(n) => setNueva({ ...nueva, veces_semana: n ?? 0 })} />
            </Campo>
            <Campo etiqueta="Minutos cada vez">
              <Num value={nueva.minutos} onChange={(n) => setNueva({ ...nueva, minutos: n ?? 0 })} />
            </Campo>
            <div className="flex items-end pb-2">
              <Check checked={!!nueva.requiere_habilidad} onChange={(v) => setNueva({ ...nueva, requiere_habilidad: v })}>
                Requiere habilidad
              </Check>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
