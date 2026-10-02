// Todos los cálculos de la app. Nada de esto se escribe a mano: sale de los registros.

import { differenceInCalendarDays, parseISO, isWithinInterval, startOfDay, endOfDay, eachDayOfInterval, format, subDays } from 'date-fns'
import { RES, U, type Umbral } from './doctrina'
import { diaLocal, tasa } from './format'
import type { Ajustes, Cliente, Llamada, Movimiento, PautaDia, Reunion } from './types'

export interface Rango {
  desde: Date
  hasta: Date
}

export const rangoUltimos = (dias: number): Rango => ({
  desde: startOfDay(subDays(new Date(), dias - 1)),
  hasta: endOfDay(new Date()),
})

export const enRango = (iso: string | null | undefined, r: Rango) => {
  if (!iso) return false
  const d = parseISO(iso)
  return isWithinInterval(d, { start: r.desde, end: r.hasta })
}

// ── Llamadas en frío ──────────────────────────────────────────────────

export interface Embudo {
  marcadas: number
  contestadas: number
  portero: number
  decisor: number
  resonaron: number
  conResono: number
  citas: number
  noInteresado: number
  // tasas
  contactabilidad: number | null
  bloqueo: number | null
  pr: number | null
  rr: number | null
  cierreCita: number | null
  abr: number | null
}

export function embudoLlamadas(llamadas: Llamada[]): Embudo {
  let contestadas = 0,
    portero = 0,
    decisor = 0,
    citas = 0,
    noInteresado = 0,
    resonaron = 0,
    conResono = 0
  for (const l of llamadas) {
    const r = RES[l.resultado]
    if (!r) continue
    if (r.contesto) contestadas++
    if (l.resultado === 'portero_bloquea') portero++
    if (r.decisor) {
      decisor++
      // Agendar implica que resonó. Si no, solo cuenta cuando se marcó.
      if (l.resultado === 'agendo_cita') {
        resonaron++
        conResono++
      } else if (l.resono != null) {
        conResono++
        if (l.resono) resonaron++
      }
    }
    if (l.resultado === 'agendo_cita') citas++
    if (l.resultado === 'no_interesado') noInteresado++
  }
  const marcadas = llamadas.length
  return {
    marcadas,
    contestadas,
    portero,
    decisor,
    resonaron,
    conResono,
    citas,
    noInteresado,
    contactabilidad: tasa(contestadas, marcadas),
    bloqueo: tasa(portero, contestadas),
    pr: tasa(decisor, marcadas),
    rr: tasa(resonaron, conResono),
    cierreCita: tasa(citas, decisor),
    abr: tasa(citas, marcadas),
  }
}

// ── Ventas ────────────────────────────────────────────────────────────

export interface Ventas {
  agendadas: number
  pasadas: number // ya ocurrieron (presentada o no_show)
  presentadas: number
  noShow: number
  ganadas: number
  perdidas: number
  seguimiento: number
  facturado: number
  sur: number | null
  scr: number | null
  diasAnticipacion: number | null // promedio entre agendar y la cita
}

export function ventas(reuniones: Reunion[]): Ventas {
  const validas = reuniones.filter((r) => r.estado !== 'cancelada')
  const presentadas = validas.filter((r) => r.estado === 'presentada')
  const noShow = validas.filter((r) => r.estado === 'no_show').length
  const ganadas = presentadas.filter((r) => r.resultado === 'ganada')
  const dias = validas
    .filter((r) => r.agendada_el && r.fecha)
    .map((r) => differenceInCalendarDays(parseISO(r.fecha), parseISO(r.agendada_el)))
    .filter((d) => d >= 0)
  return {
    agendadas: validas.length,
    pasadas: presentadas.length + noShow,
    presentadas: presentadas.length,
    noShow,
    ganadas: ganadas.length,
    perdidas: presentadas.filter((r) => r.resultado === 'perdida').length,
    seguimiento: presentadas.filter((r) => r.resultado === 'seguimiento').length,
    facturado: ganadas.reduce((s, r) => s + (r.monto ?? 0), 0),
    sur: tasa(presentadas.length, presentadas.length + noShow),
    scr: tasa(ganadas.length, presentadas.length),
    diasAnticipacion: dias.length ? dias.reduce((a, b) => a + b, 0) / dias.length : null,
  }
}

// ── Clientes y LTV ────────────────────────────────────────────────────

export function ingresosPorCliente(movs: Movimiento[]) {
  const m = new Map<string, number>()
  for (const x of movs) {
    if (x.tipo !== 'ingreso' || !x.cliente_id) continue
    m.set(x.cliente_id, (m.get(x.cliente_id) ?? 0) + x.monto)
  }
  return m
}

export function ltvEstimado(a: Ajustes) {
  return a.precio_setup + a.precio_por_paciente * a.pacientes_por_cliente_mes * a.retencion_meses
}

export function ltv(clientes: Cliente[], movs: Movimiento[], a: Ajustes) {
  const ing = ingresosPorCliente(movs)
  // LTV real solo de clientes que ya terminaron (perdidos); si no hay, estimado.
  const cerrados = clientes.filter((c) => c.estado === 'perdido' && ing.has(c.id))
  if (cerrados.length >= 3) {
    const total = cerrados.reduce((s, c) => s + (ing.get(c.id) ?? 0), 0)
    return { valor: total / cerrados.length, tipo: 'real' as const, n: cerrados.length }
  }
  return { valor: ltvEstimado(a), tipo: 'estimado' as const, n: cerrados.length }
}

// ── Estado de una métrica contra la doctrina ─────────────────────────

export type Tono = 'ok' | 'alerta' | 'critico' | 'muestra' | 'nada'

export function evaluar(valor: number | null, u: Pick<Umbral, 'minimo' | 'meta' | 'invertido'>, n?: number, muestra?: number): Tono {
  if (valor == null) return 'nada'
  if (muestra && n != null && n < muestra) return 'muestra'
  const peor = (a: number, b: number) => (u.invertido ? a > b : a < b)
  if (u.minimo != null && peor(valor, u.minimo)) return 'critico'
  if (u.meta != null && peor(valor, u.meta)) return 'alerta'
  if (u.meta == null && u.minimo == null) return 'nada'
  return 'ok'
}

export const evaluarU = (valor: number | null, u: Umbral, n: number) => evaluar(valor, u, n, u.muestra)

// ── Pauta ─────────────────────────────────────────────────────────────

export interface Pauta {
  gasto: number
  impresiones: number
  alcance: number
  clics: number
  leads: number
  citas: number
  presentados: number
  cierres: number
  cash: number
  valor: number
  cpm: number | null
  ctr: number | null
  cpc: number | null
  lp: number | null
  cpl: number | null
  hcr: number | null
  cpCita: number | null
  sur: number | null
  cpPresentado: number | null
  cierre: number | null
  cpa: number | null
  roiCash: number | null
  roiValor: number | null
}

export function pauta(filas: PautaDia[]): Pauta {
  const s = (k: keyof PautaDia) => filas.reduce((a, f) => a + (Number(f[k]) || 0), 0)
  const gasto = s('gasto'),
    impresiones = s('impresiones'),
    alcance = s('alcance'),
    clics = s('clics'),
    leads = s('leads'),
    citas = s('citas'),
    presentados = s('presentados'),
    cierres = s('cierres'),
    cash = s('cash'),
    valor = s('valor')
  return {
    gasto,
    impresiones,
    alcance,
    clics,
    leads,
    citas,
    presentados,
    cierres,
    cash,
    valor,
    cpm: impresiones ? (gasto / impresiones) * 1000 : null,
    ctr: tasa(clics, impresiones),
    cpc: clics ? gasto / clics : null,
    lp: tasa(leads, clics),
    cpl: leads ? gasto / leads : null,
    hcr: tasa(citas, leads),
    cpCita: citas ? gasto / citas : null,
    sur: tasa(presentados, citas),
    cpPresentado: presentados ? gasto / presentados : null,
    cierre: tasa(cierres, presentados),
    cpa: cierres ? gasto / cierres : null,
    roiCash: gasto ? (cash - gasto) / gasto : null,
    roiValor: gasto ? (valor - gasto) / gasto : null,
  }
}

// ── Series diarias para gráficas ──────────────────────────────────────

export function serieDiaria<T>(
  r: Rango,
  items: T[],
  fecha: (x: T) => string,
  agregar: (xs: T[]) => Record<string, number | null>,
) {
  const grupos = new Map<string, T[]>()
  for (const x of items) {
    const k = diaLocal(fecha(x) ?? '')
    if (!k) continue
    if (!grupos.has(k)) grupos.set(k, [])
    grupos.get(k)!.push(x)
  }
  return eachDayOfInterval({ start: r.desde, end: r.hasta }).map((d) => {
    const k = format(d, 'yyyy-MM-dd')
    return { dia: k, ...agregar(grupos.get(k) ?? []) }
  })
}

// ── Aritmética cruda (hacia atrás desde la meta) ──────────────────────

export interface Aritmetica {
  valorCliente: number
  clientesMes: number
  reunionesHechas: number
  reunionesAgendadas: number
  llamadasMes: number
  llamadasDia: number
  valorLlamada: number
  valorCita: number
}

export function aritmetica(p: {
  meta: number
  ingresoMensualPorCliente: number
  abr: number
  sur: number
  scr: number
  diasHabilesMes: number
}): Aritmetica {
  const clientesMes = p.meta / p.ingresoMensualPorCliente
  const reunionesHechas = clientesMes / p.scr
  const reunionesAgendadas = reunionesHechas / p.sur
  const llamadasMes = reunionesAgendadas / p.abr
  return {
    valorCliente: p.ingresoMensualPorCliente,
    clientesMes,
    reunionesHechas,
    reunionesAgendadas,
    llamadasMes,
    llamadasDia: llamadasMes / p.diasHabilesMes,
    valorLlamada: p.meta / llamadasMes,
    valorCita: p.meta / reunionesAgendadas,
  }
}

export const ingresoMensualCliente = (a: Ajustes) =>
  a.precio_por_paciente * a.pacientes_por_cliente_mes + a.precio_setup / Math.max(a.retencion_meses, 1)

export { U }
