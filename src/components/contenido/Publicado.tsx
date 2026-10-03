import { BarChart3, ExternalLink, Trash2, UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ChipLinea, type FiltroLinea } from '../../pages/Contenido'
import { LINEA, PLATAFORMAS, resumenPieza, tocaMedir } from '../../lib/contenido'
import { fmt, hoyISO } from '../../lib/format'
import { actualizar, borrar, insertar, useTabla } from '../../lib/store'
import type { MetricaPieza, Pieza } from '../../lib/types'
import { Btn, Campo, Card, CardHead, cx, Kpi, Modal, Num, Pill, Segmento, Tabla, td, th, Vacio } from '../ui'
import { NuevaPersona } from './Personas'

export function Publicado({ linea }: { linea: FiltroLinea }) {
  const piezas = useTabla('piezas')
  const metricas = useTabla('metricas_pieza')
  const personas = useTabla('personas')
  const [abierta, setAbierta] = useState<Pieza | null>(null)

  const filas = useMemo(
    () =>
      piezas
        .filter((p) => linea === 'todas' || p.linea === linea)
        .map((p) => ({ p, r: resumenPieza(p, metricas, personas), medir: tocaMedir(p, metricas) }))
        .sort((a, b) => Number(b.medir) - Number(a.medir) || b.r.conversaciones - a.r.conversaciones || b.r.vistas - a.r.vistas),
    [piezas, metricas, personas, linea],
  )
  const total = filas.reduce((a, f) => ({ vistas: a.vistas + f.r.vistas, seguidores: a.seguidores + f.r.seguidores, conv: a.conv + f.r.conversaciones }), { vistas: 0, seguidores: 0, conv: 0 })
  const porMedir = filas.filter((f) => f.medir).length

  // Qué produce conversaciones: por línea y por framework
  const agrupar = (clave: (p: Pieza) => string) => {
    const m = new Map<string, { piezas: number; vistas: number; conv: number; seg: number }>()
    for (const f of filas) {
      const k = clave(f.p) || '—'
      const x = m.get(k) ?? { piezas: 0, vistas: 0, conv: 0, seg: 0 }
      m.set(k, { piezas: x.piezas + 1, vistas: x.vistas + f.r.vistas, conv: x.conv + f.r.conversaciones, seg: x.seg + f.r.seguidores })
    }
    return [...m.entries()].sort((a, b) => b[1].conv - a[1].conv || b[1].vistas - a[1].vistas)
  }

  if (!piezas.length)
    return (
      <Card>
        <Vacio icono={<BarChart3 size={20} />} titulo="Todavía no hay piezas publicadas" texto="Suelta una idea en «Publicar» desde el pipeline. Cada pieza se mide una vez, a los 7 días, por plataforma." />
      </Card>
    )

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi etiqueta="Piezas" valor={fmt.n(filas.length)} sub={porMedir ? `${porMedir} por medir` : 'todas medidas'} tono={porMedir ? 'alerta' : 'nada'} />
        <Kpi etiqueta="Vistas" valor={fmt.n(total.vistas)} />
        <Kpi etiqueta="Seguidores ganados" valor={fmt.n(total.seguidores)} sub={total.vistas ? `${fmt.dec((total.seguidores / total.vistas) * 1000)} por cada 1.000 vistas` : undefined} />
        <Kpi etiqueta="Conversaciones" valor={fmt.n(total.conv)} sub="personas que te escribieron por una pieza" />
      </div>

      <Card>
        <CardHead titulo="Qué funcionó, arriba" sub="Ordenado por conversaciones: la calidad del seguidor manda sobre el alcance" />
        <Tabla>
          <thead>
            <tr>
              {['Pieza', 'Línea', 'Publicada', 'Vistas', 'Seg./1.000', 'Retención', 'Conversaciones', ''].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map(({ p, r, medir }) => (
              <tr key={p.id} className="cursor-pointer hover:bg-surface-2/50" onClick={() => setAbierta(p)}>
                <td className={cx(td, 'max-w-[280px]')}>
                  <div className="truncate font-medium">{p.titulo}</div>
                  <div className="truncate text-[11px] text-faint">
                    {p.embudo} · {p.formato}
                    {p.framework ? ` · ${p.framework}` : ''}
                  </div>
                </td>
                <td className={td}>
                  <ChipLinea linea={p.linea} />
                </td>
                <td className={cx(td, 'text-muted')}>{fmt.fecha(p.publicado)}</td>
                <td className={cx(td, 'num')}>{r.medida ? fmt.n(r.vistas) : '—'}</td>
                <td className={cx(td, 'num')}>{r.seguidoresPorMil != null ? fmt.dec(r.seguidoresPorMil) : '—'}</td>
                <td className={cx(td, 'num')}>{r.retencion != null ? `${fmt.dec(r.retencion)}%` : '—'}</td>
                <td className={cx(td, 'num font-semibold')}>{r.conversaciones}</td>
                <td className={td}>{medir ? <Pill tono="alerta">Medir</Pill> : !r.medida ? <span className="text-[11px] text-faint">a los 7 días</span> : null}</td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {[
          { t: 'Por línea', d: 'Marca personal, agencia o ads', g: agrupar((p) => LINEA[p.linea].n) },
          { t: 'Por framework', d: 'Qué forma de sacar contenido trae conversaciones', g: agrupar((p) => p.framework) },
        ].map(({ t, d, g }) => (
          <Card key={t}>
            <CardHead titulo={t} sub={d} />
            <div className="space-y-2 px-5 pb-5">
              {g.map(([k, x]) => (
                <div key={k} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 flex-1 truncate">{k}</span>
                  <span className="text-[11px] text-faint">
                    {x.piezas} piezas · {fmt.n(x.vistas)} vistas
                  </span>
                  <b className="num w-10 text-right">{x.conv}</b>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
      {abierta && <DetallePieza pieza={abierta} onCerrar={() => setAbierta(null)} />}
    </div>
  )
}

const CAMPOS: { k: keyof MetricaPieza; n: string }[] = [
  { k: 'vistas', n: 'Vistas' },
  { k: 'retencion', n: '% visto promedio' },
  { k: 'likes', n: 'Likes' },
  { k: 'comentarios', n: 'Comentarios' },
  { k: 'compartidos', n: 'Compartidos' },
  { k: 'guardados', n: 'Guardados' },
  { k: 'seguidores', n: 'Seguidores ganados' },
  { k: 'visitas_perfil', n: 'Visitas al perfil' },
]

function DetallePieza({ pieza, onCerrar }: { pieza: Pieza; onCerrar: () => void }) {
  const metricas = useTabla('metricas_pieza')
  const personas = useTabla('personas')
  const plataformas = pieza.plataformas?.length ? pieza.plataformas : PLATAFORMAS
  const [pl, setPl] = useState(plataformas[0])
  const actual = metricas.find((m) => m.pieza_id === pieza.id && m.plataforma === pl)
  const [v, setV] = useState<Partial<MetricaPieza>>({})
  const [nueva, setNueva] = useState(false)
  const val = (k: keyof MetricaPieza) => (v[k] as number | undefined) ?? (actual?.[k] as number | undefined) ?? null
  const guardar = () => {
    const datos: Partial<MetricaPieza> = { pieza_id: pieza.id, plataforma: pl, medido: hoyISO() }
    for (const c of CAMPOS) (datos as Record<string, unknown>)[c.k] = Number(val(c.k) ?? 0)
    if (actual) actualizar('metricas_pieza', actual.id, datos)
    else insertar('metricas_pieza', datos)
    setV({})
  }
  const quienes = personas.filter((x) => x.pieza_id === pieza.id)
  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={pieza.titulo}
      ancho="max-w-2xl"
      pie={
        <>
          <Btn
            variante="fantasma"
            className="mr-auto text-red"
            onClick={() => {
              if (!confirm('¿Borrar la pieza y sus métricas?')) return
              borrar('metricas_pieza', metricas.filter((m) => m.pieza_id === pieza.id).map((m) => m.id))
              borrar('piezas', pieza.id)
              onCerrar()
            }}
          >
            <Trash2 size={14} />
          </Btn>
          <Btn variante="primario" onClick={guardar}>
            Guardar {pl}
          </Btn>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted">
        <ChipLinea linea={pieza.linea} />
        <span>
          {pieza.embudo} · publicada el {fmt.fecha(pieza.publicado, "d 'de' MMMM")}
        </span>
        {pieza.url && (
          <a href={pieza.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-2 hover:underline">
            <ExternalLink size={12} /> abrir
          </a>
        )}
      </div>
      <Segmento valor={pl} onChange={(x) => { setPl(x); setV({}) }} opciones={plataformas.map((x) => ({ valor: x, etiqueta: x }))} className="mb-4" />
      <p className="mb-3 text-[11px] text-faint">Se mide una vez, a los 7 días. {actual ? `Medida el ${fmt.fecha(actual.medido)}.` : ''}</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {CAMPOS.map((c) => (
          <Campo key={c.k} etiqueta={c.n}>
            <Num value={val(c.k)} onChange={(n) => setV({ ...v, [c.k]: n })} />
          </Campo>
        ))}
      </div>
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] font-semibold tracking-wide text-faint uppercase">Te escribieron por esta pieza · {quienes.length}</div>
          <Btn chico onClick={() => setNueva(true)}>
            <UserPlus size={13} /> Registrar
          </Btn>
        </div>
        {quienes.map((x) => (
          <div key={x.id} className="text-sm">
            <b>{x.nombre}</b> <span className="text-muted">— «{x.disparador || '…'}»</span>
          </div>
        ))}
      </div>
      {nueva && <NuevaPersona pieza={pieza} onCerrar={() => setNueva(false)} />}
    </Modal>
  )
}
