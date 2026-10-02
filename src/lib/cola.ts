// La cola de marcación, con las reglas de la Guía de Leads de Olimpo:
//  · callbacks vencidos primero, después los de hoy
//  · después la lista en su orden (el de Google Maps), filtrable por prioridad
//  · cada clínica tiene 3 intentos; si nadie contestó, el siguiente va OTRO día
//  · tres «No contestó» seguidos: la clínica descansa un mes

import { differenceInCalendarDays, parseISO } from 'date-fns'
import { diaLocal, hoyISO } from './format'
import type { Lead, Llamada } from './types'

export interface InfoLead {
  intentos: Llamada[] // del más viejo al más nuevo
  ultimo: Llamada | null
  llamadoHoy: boolean
  agotada: boolean
  decisor: boolean // alguna vez llegó al doctor
  cita: boolean
}

export function indexarLlamadas(llamadas: Llamada[]) {
  const m = new Map<string, Llamada[]>()
  for (const l of llamadas) {
    if (!l.lead_id) continue
    if (!m.has(l.lead_id)) m.set(l.lead_id, [])
    m.get(l.lead_id)!.push(l)
  }
  for (const xs of m.values()) xs.sort((a, b) => a.fecha.localeCompare(b.fecha))
  return m
}

export function infoLead(intentos: Llamada[] = []): InfoLead {
  const ultimo = intentos.at(-1) ?? null
  const hoy = hoyISO()
  const ult3 = intentos.slice(-3)
  const agotada =
    ult3.length === 3 &&
    ult3.every((l) => l.resultado === 'no_contesto') &&
    !!ultimo &&
    differenceInCalendarDays(new Date(), parseISO(ultimo.fecha)) < 30
  return {
    intentos,
    ultimo,
    llamadoHoy: !!ultimo && diaLocal(ultimo.fecha) === hoy,
    agotada,
    decisor: intentos.some((l) => ['hablo_con_doctor', 'no_interesado', 'agendo_cita'].includes(l.resultado)),
    cita: intentos.some((l) => l.resultado === 'agendo_cita'),
  }
}

export type Motivo = 'callback-vencido' | 'callback-hoy' | 'nuevo' | 'reintento'

export interface ItemCola {
  lead: Lead
  info: InfoLead
  motivo: Motivo
}

export function armarCola(
  leads: Lead[],
  idx: Map<string, Llamada[]>,
  filtro: { ciudad?: string; prioridades?: string[] } = {},
): ItemCola[] {
  const hoy = hoyISO()
  const vencidos: ItemCola[] = []
  const deHoy: ItemCola[] = []
  const nuevos: ItemCola[] = []
  const reintentos: ItemCola[] = []

  leads.forEach((lead) => {
    if (lead.estado !== 'activo') return
    if (filtro.ciudad && lead.ciudad !== filtro.ciudad) return
    const info = infoLead(idx.get(lead.id))
    if (lead.callback) {
      if (lead.callback < hoy) vencidos.push({ lead, info, motivo: 'callback-vencido' })
      else if (lead.callback === hoy) deHoy.push({ lead, info, motivo: 'callback-hoy' })
      return // con callback futuro espera su fecha
    }
    if (filtro.prioridades?.length && lead.prioridad && !filtro.prioridades.includes(lead.prioridad)) return
    // Número equivocado: reintentar ese número no sirve; vuelve cuando se corrija el teléfono.
    if (info.ultimo?.resultado === 'numero_equivocado') return
    if (info.cita || info.llamadoHoy || info.agotada) return
    if (info.intentos.length === 0) nuevos.push({ lead, info, motivo: 'nuevo' })
    else if (info.intentos.length < 3 && !info.decisor) reintentos.push({ lead, info, motivo: 'reintento' })
  })

  vencidos.sort((a, b) => (a.lead.callback ?? '').localeCompare(b.lead.callback ?? ''))
  // Reintentos: los que llevan más tiempo esperando primero.
  reintentos.sort((a, b) => (a.info.ultimo?.fecha ?? '').localeCompare(b.info.ultimo?.fecha ?? ''))
  return [...vencidos, ...deHoy, ...nuevos, ...reintentos]
}

export const MOTIVO: Record<Motivo, { texto: string; clase: string }> = {
  'callback-vencido': { texto: 'Callback vencido', clase: 'text-red bg-red-soft' },
  'callback-hoy': { texto: 'Callback de hoy', clase: 'text-amber bg-amber-soft' },
  nuevo: { texto: 'Primer intento', clase: 'text-blue-2 bg-blue-soft' },
  reintento: { texto: 'Reintento', clase: 'text-muted bg-surface-2' },
}
