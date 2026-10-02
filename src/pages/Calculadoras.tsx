import { useState } from 'react'
import { Btn, Campo, Card, CardHead, Kpi, Num, Pagina, Pill, Segmento } from '../components/ui'
import { PISO_DFY_USD, U } from '../lib/doctrina'
import { fmt } from '../lib/format'
import { aritmetica, ingresoMensualCliente, rangoUltimos } from '../lib/metricas'
import { useAjustes } from '../lib/store'
import { useResumen } from '../lib/useResumen'

export default function Calculadoras() {
  const [tab, setTab] = useState<'llamadas' | 'precio' | 'gasto'>('llamadas')
  return (
    <Pagina
      titulo="Calculadoras"
      sub="Value of Your Cold Calls, la aritmética cruda, la SMMA Pricing Calculator corregida y la calculadora por gasto del Paid Ads System."
      acciones={
        <Segmento
          valor={tab}
          onChange={setTab}
          opciones={[
            { valor: 'llamadas', etiqueta: 'Cuántas llamadas' },
            { valor: 'precio', etiqueta: 'Precio ROI' },
            { valor: 'gasto', etiqueta: 'Por gasto' },
          ]}
        />
      }
    >
      {tab === 'llamadas' && <CalcLlamadas />}
      {tab === 'precio' && <CalcPrecio />}
      {tab === 'gasto' && <CalcGasto />}
    </Pagina>
  )
}

const rango90 = rangoUltimos(90)

function CalcLlamadas() {
  const a = useAjustes()
  const { e, v } = useResumen(rango90)
  const [meta, setMeta] = useState<number | null>(a.meta_mensual)
  const [ingreso, setIngreso] = useState<number | null>(Math.round(ingresoMensualCliente(a)))
  const [abr, setAbr] = useState<number | null>(2.5)
  const [sur, setSur] = useState<number | null>(60)
  const [scr, setScr] = useState<number | null>(20)
  const [dias, setDias] = useState<number | null>(a.dias_habiles_semana * 4.3)

  const reales = () => {
    if (e.abr != null && e.marcadas >= U.abr.muestra) setAbr(+(e.abr * 100).toFixed(2))
    if (v.sur != null && v.pasadas >= U.sur.muestra) setSur(+(v.sur * 100).toFixed(1))
    if (v.scr != null && v.presentadas >= U.scr.muestra) setScr(+(v.scr * 100).toFixed(1))
  }
  const hayReales = e.marcadas >= U.abr.muestra || v.pasadas >= U.sur.muestra || v.presentadas >= U.scr.muestra

  const ok = meta && ingreso && abr && sur && scr && dias
  const r = ok ? aritmetica({ meta, ingresoMensualPorCliente: ingreso, abr: abr / 100, sur: sur / 100, scr: scr / 100, diasHabilesMes: dias }) : null

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <Card className="p-5">
        <div className="mb-4 text-sm font-semibold">Hacia atrás desde el dinero</div>
        <div className="space-y-3">
          <Campo etiqueta="Meta mensual (COP)">
            <Num value={meta} onChange={setMeta} />
          </Campo>
          <Campo etiqueta="Lo que te deja un cliente al mes" ayuda="Por defecto: pacientes × precio + el setup repartido en la retención (Ajustes)">
            <Num value={ingreso} onChange={setIngreso} />
          </Campo>
          <div className="grid grid-cols-3 gap-2">
            <Campo etiqueta="ABR %">
              <Num value={abr} onChange={setAbr} step="0.1" />
            </Campo>
            <Campo etiqueta="SUR %">
              <Num value={sur} onChange={setSur} />
            </Campo>
            <Campo etiqueta="SCR %">
              <Num value={scr} onChange={setScr} />
            </Campo>
          </div>
          <Campo etiqueta="Días hábiles al mes">
            <Num value={dias} onChange={setDias} />
          </Campo>
          <Btn chico className="w-full" onClick={reales} disabled={!hayReales}>
            {hayReales ? 'Usar mis tasas reales (90 días)' : 'Tus tasas reales aparecen cuando haya muestra'}
          </Btn>
          <p className="text-[11px] text-faint">Por defecto: ABR 2,5% (conservador), SUR 60% y SCR 20% (mínimos del Big 4). La SUR va incluida — el ejemplo del deck la omitía y subestimaba el volumen un 66%.</p>
        </div>
      </Card>
      {r && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Kpi grande etiqueta="Llamadas por día" valor={fmt.n(Math.ceil(r.llamadasDia))} tono="muestra" sub={`${fmt.n(Math.ceil(r.llamadasMes))} al mes`} />
            <Kpi grande etiqueta="Clientes al mes" valor={fmt.dec(r.clientesMes)} />
            <Kpi grande etiqueta="Citas a agendar" valor={fmt.n(Math.ceil(r.reunionesAgendadas))} sub={`${fmt.n(Math.ceil(r.reunionesHechas))} se presentan`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Kpi etiqueta="Cada llamada vale" valor={fmt.cop(r.valorLlamada)} sub="aunque nadie conteste — es el promedio" />
            <Kpi etiqueta="Cada cita agendada vale" valor={fmt.cop(r.valorCita)} />
          </div>
          <Card className="p-5 text-sm text-muted">
            <b className="text-text">La lectura del template de Charlie:</b> cada marcada vale {fmt.cop(r.valorLlamada)}. Una sesión de 100 marcadas son {fmt.cop(r.valorLlamada * 100)} de valor, aunque el día termine sin una sola cita. «100 llamadas = 1
            venta» es aritmética, no suerte.
          </Card>
        </div>
      )}
    </div>
  )
}

function CalcPrecio() {
  const a = useAjustes()
  const [ticket, setTicket] = useState<number | null>(7_000_000)
  const [nuevos, setNuevos] = useState<number | null>(a.pacientes_por_cliente_mes)
  const [pauta, setPauta] = useState<number | null>(2_000_000)
  const [mult, setMult] = useState(10)

  const valor = (ticket ?? 0) * (nuevos ?? 0)
  const neto = valor - (pauta ?? 0)
  const precio = neto / mult
  const piso = PISO_DFY_USD * a.trm
  const multReal = precio + (pauta ?? 0) > 0 ? valor / (precio + (pauta ?? 0)) : null

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <Card className="p-5">
        <div className="mb-4 text-sm font-semibold">Fórmula de precio ROI · Service Delivery 05</div>
        <div className="space-y-3">
          <Campo etiqueta="LTV del paciente del cliente" ayuda="Lo que deja un paciente de tratamiento de alto valor">
            <Num value={ticket} onChange={setTicket} />
          </Campo>
          <Campo etiqueta="Pacientes nuevos que le traes al mes">
            <Num value={nuevos} onChange={setNuevos} />
          </Campo>
          <Campo etiqueta="Pauta mensual del cliente" ayuda="Se RESTA antes de dividir (la hoja corrige al deck)">
            <Num value={pauta} onChange={setPauta} />
          </Campo>
          <Campo etiqueta={`Múltiplo: ${mult}x`} ayuda="Regla de oro 5x-20x">
            <input type="range" min={5} max={20} value={mult} onChange={(e) => setMult(Number(e.target.value))} className="w-full accent-[var(--blue)]" />
          </Campo>
        </div>
      </Card>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Kpi grande etiqueta="Precio mensual sugerido" valor={fmt.copCorto(precio)} tono={precio >= piso ? 'ok' : 'critico'} sub={`piso USD ${PISO_DFY_USD} ≈ ${fmt.copCorto(piso)}`} />
          <Kpi grande etiqueta="Valor que generas" valor={fmt.copCorto(valor)} sub="al mes para el cliente" />
          <Kpi grande etiqueta="Múltiplo real" valor={multReal ? `${fmt.dec(multReal)}x` : '—'} sub="sobre precio + pauta" tono={multReal == null ? 'nada' : multReal >= 5 ? 'ok' : 'critico'} />
        </div>
        <Card className="space-y-2 p-5 text-sm text-muted">
          <p>
            <b className="text-text">Tu modelo actual:</b> {fmt.cop(a.precio_por_paciente)} por paciente × {nuevos ?? 0} = {fmt.cop(a.precio_por_paciente * (nuevos ?? 0))} al mes, más setup de {fmt.cop(a.precio_setup)}.
          </p>
          <p>
            {precio < piso ? (
              <>
                <Pill tono="critico">Bajo el piso</Pill> La fórmula da por debajo de USD 1k/mes: según el 05, <b className="text-text">manda el piso</b>, y si da por debajo, el problema es el nicho.
              </>
            ) : (
              <>
                <Pill tono="ok">Sobre el piso</Pill> El precio cabe en la regla de oro del deck.
              </>
            )}
          </p>
          <p className="text-[11px] text-faint">El múltiplo etiquetado no es el real: con la pauta encima, un «5x» entrega ~4,2x sobre el desembolso total. Por eso se muestran los dos.</p>
        </Card>
      </div>
    </div>
  )
}

function CalcGasto() {
  const a = useAjustes()
  const [gasto, setGasto] = useState<number | null>(0)
  const [k1, setK1] = useState<number | null>(a.cpl_objetivo || null)
  const [k2, setK2] = useState<number | null>(a.costo_cita_objetivo || null)
  const [leads, setLeads] = useState<number | null>(0)
  const [citas, setCitas] = useState<number | null>(0)
  const g = gasto ?? 0,
    K1 = k1 ?? 0,
    K2 = k2 ?? 0,
    L = leads ?? 0,
    C = citas ?? 0
  const cpl = L ? g / L : Infinity
  const cpc = C ? g / C : Infinity

  let veredicto: { tono: 'ok' | 'alerta' | 'critico' | 'muestra'; texto: string } = { tono: 'muestra', texto: 'Completa los objetivos KPI1 (CPL) y KPI2 (costo por cita).' }
  if (K1 && K2) {
    if (g < K1) veredicto = { tono: 'muestra', texto: 'Menos de 1× KPI1 gastado: esperar.' }
    else if (g < 2 * K1) veredicto = { tono: 'muestra', texto: '1-2× KPI1: ¿CPC y CTR razonables? Todavía no se juzga el lead.' }
    else if (g < 3 * K1) veredicto = L >= 1 ? { tono: 'ok', texto: 'Hay al menos un lead. Seguir.' } : { tono: 'critico', texto: '2-3× KPI1 sin un solo lead: apagar.' }
    else if (g < 5 * K1) veredicto = cpl < 1.5 * K1 ? { tono: 'ok', texto: `Lead a ${fmt.copCorto(cpl)} < 1,5× KPI1. Seguir.` } : { tono: 'critico', texto: 'Lead ≥ 1,5× KPI1: pausar.' }
    else if (g < 1.75 * K2) veredicto = cpl < 1.2 * K1 ? { tono: 'ok', texto: `Lead < 1,2× KPI1. Seguir hacia la primera llamada.` } : { tono: 'alerta', texto: 'Lead ≥ 1,2× KPI1: la tolerancia se estrecha.' }
    else if (g < 2.5 * K2) veredicto = C >= 1 ? { tono: 'ok', texto: 'Hay al menos una llamada. Seguir.' } : { tono: 'critico', texto: '1,75-2,5× KPI2 sin llamada: pausar.' }
    else if (g < 5 * K2) veredicto = cpc < 1.25 * K2 ? { tono: 'ok', texto: `Llamada a ${fmt.copCorto(cpc)} < 1,25× KPI2. Seguir.` } : { tono: 'alerta', texto: 'Llamada ≥ 1,25× KPI2.' }
    else veredicto = cpc < 1.15 * K2 ? { tono: 'ok', texto: 'Llamada < 1,15× KPI2. Ganador: subir 10-20% cada 2-3 días.' } : { tono: 'critico', texto: 'Llamada ≥ 1,15× KPI2 con más de 5× KPI2 gastado: cortar.' }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <Card className="p-5">
        <div className="mb-4 text-sm font-semibold">¿Apago este anuncio? · Paid Ads 7.1</div>
        <div className="space-y-3">
          <Campo etiqueta="Gasto acumulado del anuncio / adset">
            <Num value={gasto} onChange={setGasto} />
          </Campo>
          <div className="grid grid-cols-2 gap-2">
            <Campo etiqueta="KPI1 · CPL objetivo">
              <Num value={k1} onChange={setK1} />
            </Campo>
            <Campo etiqueta="KPI2 · costo por cita">
              <Num value={k2} onChange={setK2} />
            </Campo>
            <Campo etiqueta="Leads">
              <Num value={leads} onChange={setLeads} />
            </Campo>
            <Campo etiqueta="Citas">
              <Num value={citas} onChange={setCitas} />
            </Campo>
          </div>
        </div>
      </Card>
      <Card>
        <CardHead titulo="Veredicto" sub="Tolerancia que se estrecha con el gasto: 1,5× → 1,2× · 1,25× → 1,15×" />
        <div className="px-5 pb-6">
          <Pill tono={veredicto.tono} className="mb-3" />
          <div className="font-serif text-3xl leading-tight">{veredicto.texto}</div>
          <p className="mt-4 text-xs text-faint">Días 0-3: no se toca nada. Un adset se sube como mucho cada 2-3 días.</p>
        </div>
      </Card>
    </div>
  )
}
