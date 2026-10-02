// Los números de Imperium Academy, con su fuente.
// Hay tres juegos de umbrales que conviven en la doctrina y NO se promedian:
//  · mínimo  → Big 4 (7.2): lo mínimo para llegar a $10k/mes
//  · meta    → métricas del bonus de llamadas en frío: la meta del canal
//  · escala  → condiciones de escala (7.1): permiso para escalar
// La app pinta rojo bajo el mínimo, ámbar entre mínimo y meta, verde sobre la meta.
// Donde la doctrina solo da un benchmark (minimo: null), lo que está debajo es ámbar,
// nunca rojo: un umbral que el programa no fija no se inventa.

import type { ResultadoLlamada } from './types'

export interface Umbral {
  clave: string
  nombre: string
  sigla: string
  minimo: number | null
  meta: number | null
  /** true cuando más bajo es mejor (bloqueo del portero, costos). */
  invertido?: boolean
  muestra: number
  unidadMuestra: string
  fuente: string
  explica: string
}

export const U = {
  contactabilidad: {
    clave: 'contactabilidad',
    nombre: 'Contactabilidad',
    sigla: 'CONT',
    minimo: null,
    meta: null,
    muestra: 100,
    unidadMuestra: 'llamadas',
    fuente: 'Sin umbral en la doctrina · el template de Cold Call Metrics usa 33 de 100 como ejemplo',
    explica: 'De las llamadas, cuántas contestó alguien. Mide qué tan viva está la lista y si llamas a buena hora.',
  },
  bloqueo: {
    clave: 'bloqueo',
    nombre: 'Bloqueo del portero',
    sigla: 'BLQ',
    minimo: null,
    meta: null,
    invertido: true,
    muestra: 50,
    unidadMuestra: 'contestadas',
    fuente: 'Sin umbral en la doctrina · se lee como tendencia',
    explica: 'De las que contestaron, cuántas murieron en recepción. Si sube, el cuello es la recepcionista.',
  },
  pr: {
    clave: 'pr',
    nombre: 'Llegó al decisor',
    sigla: 'PR',
    minimo: null,
    meta: 0.1,
    muestra: 100,
    unidadMuestra: 'llamadas',
    fuente: 'Métricas de llamada en frío (bonus) · benchmark 10%',
    explica: 'Pitch Rate: de las llamadas, cuántas llegaron a pitchearle al doctor. Si está bajo, el problema es la apertura y el portero.',
  },
  rr: {
    clave: 'rr',
    nombre: 'Le resonó',
    sigla: 'RR',
    minimo: null,
    meta: 0.6,
    muestra: 20,
    unidadMuestra: 'decisores',
    fuente: 'Métricas de llamada en frío (bonus) · benchmark 60%',
    explica: 'Resonation Rate: de los doctores pitcheados, a cuántos les movió algo. Si está bajo, el problema es el pitch o la oferta.',
  },
  cierreCita: {
    clave: 'cierreCita',
    nombre: 'Cita sobre decisores',
    sigla: 'C/D',
    minimo: null,
    meta: 0.5,
    muestra: 20,
    unidadMuestra: 'decisores',
    fuente: 'Hoja de Leads de Olimpo · cierre sobre pitcheados 50%',
    explica: 'De los doctores con los que hablaste, cuántos agendaron. ABR bajo con esto alto = no llegas al decisor.',
  },
  abr: {
    clave: 'abr',
    nombre: 'Tasa de agendamiento',
    sigla: 'ABR',
    minimo: 0.01,
    meta: 0.05,
    muestra: 100,
    unidadMuestra: 'llamadas',
    fuente: 'Big 4 (7.2) mínimo 1% · Métricas de llamada en frío meta 5%',
    explica: '🔴 La métrica llave del outreach: de cada intento, cuántos terminan en cita. Charlie: «si te preguntas en qué enfocarte primero, siempre va a ser el ABR».',
  },
  sur: {
    clave: 'sur',
    nombre: 'Presentación',
    sigla: 'SUR',
    minimo: 0.6,
    meta: 0.7,
    muestra: 20,
    unidadMuestra: 'citas cumplidas o fallidas',
    fuente: 'Big 4 (7.2) mínimo 60% · conservador de Reverse Engineering 70%',
    explica: 'Show Up Rate: de las citas, cuántos se presentaron. Causas: agendar a 3+ días, no nutrir antes de la llamada, horas malditas.',
  },
  scr: {
    clave: 'scr',
    nombre: 'Cierre',
    sigla: 'SCR',
    minimo: 0.2,
    meta: 0.25,
    muestra: 20,
    unidadMuestra: 'llamadas de venta hechas',
    fuente: 'Big 4 (7.2) mínimo 20% · Condiciones de escala 25% (tú)',
    explica: 'Sales Conversion Rate: de las llamadas que se hicieron, cuántas compraron. Las causas apuntan a la Semana 4 completa.',
  },
} satisfies Record<string, Umbral>

/** LTV mínimo del Big 4, en dólares. Se convierte con la TRM de Ajustes. */
export const LTV_MIN_USD = 3000
export const PISO_DFY_USD = 1000

// ── Pauta ─────────────────────────────────────────────────────────────

export const PAUTA = {
  ctr: { minimo: 0.005, meta: 0.01, fuente: 'Diagnóstico de pauta por KPI · CTR 0,5-1%' },
  lp: { minimo: 0.15, meta: 0.2, fuente: 'Plan de optimización 30 días · página > 15%' },
  hcr: { minimo: 0.5, meta: 0.7, fuente: 'Diagnóstico de pauta · lead → cita 70-90%' },
  sur: { minimo: 0.6, meta: 0.7, fuente: 'Plan de optimización · presentación > 60%' },
  cierre: { minimo: 0.2, meta: 0.4, fuente: 'Plan de optimización · cierre > 20%' },
  muestras: {
    clics: 1000, // impresiones para juzgar clics
    cpl: 100, // clics para juzgar el CPL
    costoCita: 50, // leads para juzgar el costo por cita
    sur: 20, // citas para juzgar presentación
    cierre: 20, // citas hechas para juzgar cierre
  },
}

// ── Resultados de llamada ─────────────────────────────────────────────

export const RESULTADOS: {
  clave: ResultadoLlamada
  nombre: string
  corto: string
  explica: string
  tono: 'faint' | 'muted' | 'amber' | 'blue' | 'violet' | 'red' | 'green'
  contesto: boolean
  decisor: boolean
}[] = [
  { clave: 'no_contesto', nombre: 'No contestó', corto: 'Nadie', explica: 'Nadie levantó. Siguiente intento: otro día y otra hora', tono: 'faint', contesto: false, decisor: false },
  { clave: 'numero_equivocado', nombre: 'Número equivocado', corto: 'Equivocado', explica: 'No es la clínica o el número no existe', tono: 'muted', contesto: false, decisor: false },
  { clave: 'portero_bloquea', nombre: 'Portero bloquea', corto: 'Portero', explica: 'Contestó recepción y NO pasó', tono: 'amber', contesto: true, decisor: false },
  { clave: 'volver_a_llamar', nombre: 'Volver a llamar', corto: 'Callback', explica: 'Recepción dio fecha u hora: es una cita con el portero', tono: 'blue', contesto: true, decisor: false },
  { clave: 'hablo_con_doctor', nombre: 'Habló con el doctor', corto: 'Doctor', explica: 'Llegaste al decisor y no agendó', tono: 'violet', contesto: true, decisor: true },
  { clave: 'no_interesado', nombre: 'No interesado', corto: 'No', explica: 'Llegaste al decisor y dijo que no. Cuenta como llegar', tono: 'red', contesto: true, decisor: true },
  { clave: 'agendo_cita', nombre: 'Agendó cita', corto: 'Cita', explica: 'Cerró la cita', tono: 'green', contesto: true, decisor: true },
]

export const RES = Object.fromEntries(RESULTADOS.map((r) => [r.clave, r])) as Record<
  ResultadoLlamada,
  (typeof RESULTADOS)[number]
>

// ── Categorías ────────────────────────────────────────────────────────

export const CAT_NEGOCIO_GASTO = ['Publicidad', 'Software', 'Equipo', 'Oficina', 'Aprendizaje', 'Impuestos', 'Otros']
export const CAT_NEGOCIO_INGRESO = ['Setup', 'Pacientes agendados', 'Fee mensual', 'Otros']
export const CAT_PERSONAL_GASTO = ['Vivienda', 'Comida', 'Transporte', 'Entretenimiento', 'Finanzas', 'Otros']
export const CAT_PERSONAL_INGRESO = ['Sueldo propio', 'Otros']

export const CAT_TIEMPO = [
  { nombre: 'Outreach', color: '#3b6cf6' },
  { nombre: 'Ventas', color: '#22c55e' },
  { nombre: 'Entrega', color: '#a78bfa' },
  { nombre: 'Aprendizaje', color: '#f5a524' },
  { nombre: 'Admin', color: '#8b91a5' },
  { nombre: 'Personal', color: '#ec4899' },
  { nombre: 'Descanso', color: '#14b8a6' },
  { nombre: 'Distracción', color: '#f04444' },
]
