import { ArrowDown, Stethoscope } from 'lucide-react'
import { SelectorPeriodo, usePeriodo } from '../components/Periodo'
import { useMemo, useState } from 'react'
import { Barra, Card, cx, Pagina, Pill, Segmento, tonoClase } from '../components/ui'
import { diagnosticarAds, diasEfectivos } from '../lib/ads'
import type { Hallazgo } from '../lib/diagnostico'
import { enRango, ltv as calcLtv, pauta as calcPauta } from '../lib/metricas'
import { useAjustes, useTabla } from '../lib/store'
import { useResumen } from '../lib/useResumen'

export default function Diagnostico() {
  const { p, setP, rango } = usePeriodo('30')
  const [canal, setCanal] = useState<'pauta' | 'llamadas'>('pauta')
  const { d: dLlamadas } = useResumen(rango)
  const pautaT = useTabla('pauta')
  const clientes = useTabla('clientes')
  const movs = useTabla('movimientos')
  const ajustes = useAjustes()
  const dPauta = useMemo(() => {
    const filas = pautaT.filter((x) => x.cuenta === 'olimpo' && enRango(x.fecha, rango))
    const m = calcPauta(filas)
    const dias = diasEfectivos(filas.map((x) => x.fecha), rango)
    return diagnosticarAds(m, ajustes, calcLtv(clientes, movs, ajustes).valor, dias)
  }, [pautaT, clientes, movs, ajustes, rango])
  const d = canal === 'pauta' ? dPauta : dLlamadas
  const cuello = d.cuello

  return (
    <Pagina
      titulo="Cuello de botella"
      sub={
        canal === 'pauta'
          ? 'El embudo de la pauta en orden — gasto, anuncio, página, lead, agenda, presentación, cierre, retorno — sin juzgar ningún tubo sin su muestra mínima.'
          : 'El árbol de los Big 4 de la llamada en frío (archivado): ABR, SUR, SCR, LTV.'
      }
      acciones={
        <>
          <Segmento
            valor={canal}
            onChange={setCanal}
            opciones={[
              { valor: 'pauta', etiqueta: 'Pauta' },
              { valor: 'llamadas', etiqueta: 'Llamadas (archivo)' },
            ]}
          />
          <SelectorPeriodo valor={p} onChange={setP} sinHoy />
        </>
      }
    >
      <Card className={cx('relative mb-6 overflow-hidden p-6 md:p-8', cuello && tonoClase[cuello.tono].bg)}>
        <div className="flex items-start gap-4">
          <div className={cx('grid size-12 shrink-0 place-items-center rounded-2xl bg-surface', cuello ? tonoClase[cuello.tono].text : 'text-green')}>
            <Stethoscope size={22} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Diagnóstico</div>
            <div className="mt-1 font-serif text-3xl leading-tight md:text-4xl">{d.resumen}</div>
            {cuello && (
              <>
                <p className="mt-3 max-w-3xl text-sm text-muted">{cuello.porque}</p>
                {cuello.acciones.length > 0 && (
                  <ul className="mt-4 space-y-1.5">
                    {cuello.acciones.map((a) => (
                      <li key={a} className="flex gap-2 text-sm">
                        <span className="text-blue-2">→</span>
                        {a}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 text-[11px] text-faint">Fuente: {cuello.fuente}</div>
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="mx-auto max-w-3xl">
        {d.hallazgos.map((h, i) => (
          <div key={h.id}>
            {i > 0 && (
              <div className="flex justify-center py-1 text-faint">
                <ArrowDown size={16} />
              </div>
            )}
            <Tubo h={h} esCuello={cuello?.id === h.id} />
          </div>
        ))}
        <p className="mt-6 text-center text-xs text-faint">
          {canal === 'pauta'
            ? '«Nadie sabe qué funciona en Facebook; los mejores solo son muy buenos testeando.» Días 0-3 no se toca nada, y se decide con la calculadora, no con la sensación.'
            : '«Si te preguntas en qué enfocarte primero, siempre va a ser el ABR.» El SUR no se mejora sin citas, ni el SCR sin llamadas para practicar.'}
        </p>
      </div>
    </Pagina>
  )
}

function Tubo({ h, esCuello }: { h: Hallazgo; esCuello: boolean }) {
  const t = tonoClase[h.tono]
  return (
    <Card className={cx('p-4 transition', esCuello && 'ring-2 ring-offset-0', esCuello && (h.tono === 'critico' ? 'ring-red/50' : h.tono === 'alerta' ? 'ring-amber/50' : 'ring-blue/50'))}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold tracking-wide text-faint uppercase">{h.etapa}</div>
          <div className="text-sm font-semibold">{h.metrica}</div>
        </div>
        <div className="text-right">
          <div className={cx('num text-2xl font-semibold', h.tono === 'nada' ? 'text-text' : t.text)}>{h.valor}</div>
          <div className="text-[11px] text-faint">{h.umbral}</div>
        </div>
        <Pill tono={h.tono} />
      </div>
      <div className="mt-2 text-sm text-muted">{h.titulo}</div>
      {h.muestra && h.muestra.n < h.muestra.requerida && (
        <div className="mt-3">
          <Barra valor={h.muestra.n} max={h.muestra.requerida} className="h-1.5" />
          <div className="mt-1 text-[11px] text-faint">
            {h.muestra.n} de {h.muestra.requerida} {h.muestra.unidad} para que la tasa diga algo
          </div>
        </div>
      )}
      {esCuello && <div className={cx('mt-2 text-[11px] font-semibold', t.text)}>← acá está el problema</div>}
    </Card>
  )
}
