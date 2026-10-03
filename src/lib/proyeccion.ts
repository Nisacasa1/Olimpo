// Proyección del mes: a este ritmo, ¿a cuánto llego? Y si no llego, ¿qué me falta?
// Va hacia atrás desde la meta (la aritmética cruda), con tus tasas reales cuando hay
// muestra y con los mínimos de la doctrina cuando no.

import { endOfMonth, getDaysInMonth, startOfMonth } from 'date-fns'
import { PAUTA, U } from './doctrina'
import { mesISO } from './format'
import { enRango, ingresoMensualCliente, pauta as calcPauta, ventas } from './metricas'
import type { Ajustes, Movimiento, PautaDia, Reunion } from './types'

export interface Tasa {
  valor: number
  real: boolean // true = sale de tus datos; false = mínimo de la doctrina u objetivo
}

export interface Proyeccion {
  diaDelMes: number
  diasMes: number
  facturado: number
  proyectado: number
  meta: number
  avance: number // facturado / meta
  esperadoHoy: number // lo que «debería» llevar a esta altura si fuera lineal
  gasto: number
  gastoProyectado: number
  cierres: number
  faltante: number
  clientesFaltan: number
  llamadasFaltan: number
  leadsFaltan: number | null
  gastoFalta: number | null
  porDia: { leads: number | null; llamadas: number; gasto: number | null }
  tasas: { scr: Tasa; sur: Tasa; agenda: Tasa | null; cpl: Tasa | null }
}

export function proyectar(p: { ajustes: Ajustes; movs: Movimiento[]; pauta: PautaDia[]; reuniones: Reunion[]; hoy?: Date }): Proyeccion {
  const hoy = p.hoy ?? new Date()
  const a = p.ajustes
  const mes = mesISO(hoy)
  const r = { desde: startOfMonth(hoy), hasta: endOfMonth(hoy) }
  const diasMes = getDaysInMonth(hoy)
  const diaDelMes = hoy.getDate()
  const restantes = Math.max(1, diasMes - diaDelMes + 1)

  const facturado = p.movs.filter((m) => m.tipo === 'ingreso' && m.ambito === 'negocio' && m.fecha.startsWith(mes)).reduce((s, m) => s + m.monto, 0)
  const proyectado = (facturado / diaDelMes) * diasMes

  const propia = p.pauta.filter((x) => x.cuenta === 'olimpo')
  const mesPauta = calcPauta(propia.filter((x) => enRango(x.fecha, r)))
  // Para las tasas se usa todo el historial: más muestra, menos ruido
  const hist = calcPauta(propia)
  const v = ventas(p.reuniones)
  const vMes = ventas(p.reuniones.filter((x) => enRango(x.fecha, r)))

  const tasa = (real: number | null, n: number, muestra: number, defecto: number): Tasa => (real != null && n >= muestra ? { valor: real, real: true } : { valor: defecto, real: false })
  const scr = tasa(v.scr, v.presentadas, U.scr.muestra, U.scr.minimo ?? 0.2)
  const sur = tasa(v.sur, v.pasadas, U.sur.muestra, U.sur.minimo ?? 0.6)
  // Lead → llamada agendada: la doctrina no fija umbral para la agencia, así que sin muestra no se inventa.
  const agenda: Tasa | null = hist.hcr != null && hist.leads >= PAUTA.muestras.costoCita ? { valor: hist.hcr, real: true } : null
  const cpl: Tasa | null = hist.cpl != null && hist.clics >= PAUTA.muestras.cpl ? { valor: hist.cpl, real: true } : a.cpl_objetivo ? { valor: a.cpl_objetivo, real: false } : null

  const faltante = Math.max(0, a.meta_mensual - proyectado)
  const ingresoCliente = Math.max(1, ingresoMensualCliente(a))
  const clientesFaltan = faltante / ingresoCliente
  const llamadasFaltan = clientesFaltan / scr.valor / sur.valor
  const leadsFaltan = agenda ? llamadasFaltan / agenda.valor : null
  // Gasto: por leads × CPL si hay tasa de agenda; si no, por llamadas × costo por llamada.
  const cpCita = hist.cpCita != null && hist.leads >= PAUTA.muestras.costoCita ? hist.cpCita : a.costo_cita_objetivo || null
  const gastoFalta = cpl && leadsFaltan != null ? leadsFaltan * cpl.valor : cpCita ? llamadasFaltan * cpCita : null

  return {
    diaDelMes,
    diasMes,
    facturado,
    proyectado,
    meta: a.meta_mensual,
    avance: a.meta_mensual ? facturado / a.meta_mensual : 0,
    esperadoHoy: (a.meta_mensual * diaDelMes) / diasMes,
    gasto: mesPauta.gasto,
    gastoProyectado: (mesPauta.gasto / diaDelMes) * diasMes,
    cierres: vMes.ganadas,
    faltante,
    clientesFaltan,
    llamadasFaltan,
    leadsFaltan,
    gastoFalta,
    porDia: { leads: leadsFaltan != null ? leadsFaltan / restantes : null, llamadas: llamadasFaltan / restantes, gasto: gastoFalta != null ? gastoFalta / restantes : null },
    tasas: { scr, sur, agenda, cpl },
  }
}
