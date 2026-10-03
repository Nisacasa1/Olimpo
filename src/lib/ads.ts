// Análisis de pauta según el Paid Ads System:
//  · el plan de optimización de 30 días (qué tocar y cuándo)
//  · la calculadora por gasto (KPI1 = lead, KPI2 = llamada agendada)
//  · el árbol de diagnóstico del embudo, en orden y con muestras mínimas

import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { Hallazgo } from './diagnostico'
import { PAUTA } from './doctrina'
import { fmt } from './format'
import { evaluar, type Pauta, type Tono } from './metricas'
import type { Ajustes } from './types'

// ── Plan de 30 días ───────────────────────────────────────────────────

export interface Fase {
  dias: number
  nombre: string
  regla: string
  tono: Tono
}

export function faseDelPlan(lanzado: string | null | undefined, hoy = new Date()): Fase {
  const dias = lanzado ? differenceInCalendarDays(hoy, parseISO(lanzado)) : 0
  if (dias < 3) return { dias, nombre: 'Días 0-3 · no se toca', regla: 'No se toca nada. Solo se mira la hoja cada mañana.', tono: 'muestra' }
  if (dias < 7) return { dias, nombre: 'Días 3-7 · cortar', regla: 'Cortar lo que tenga CTR saliente < 0,5% o 50% bajo el resto, o cero leads con ~USD 30. Reponer subiendo 10-20% lo que gana.', tono: 'alerta' }
  if (dias < 14) return { dias, nombre: 'Días 7-14 · costo de opt-in', regla: 'Por costo de opt-in: bien, seguir, o si está alto, revisar las 3 causas (anuncio que acapara, página < 15%, adset con 2,5× CPL sin resultados).', tono: 'alerta' }
  if (dias <= 30) return { dias, nombre: 'Días 14-30 · cortar, reponer, escalar', regla: 'Cortar y reponer. Un adset se sube como mucho cada 2-3 días, 10-20%. Mirar cuellos de botella y la calidad de las llamadas.', tono: 'ok' }
  return { dias, nombre: 'Más de 30 días · escala', regla: 'Testear siempre con el 20% del presupuesto. Subir 10-20% cada 2-3 días lo que gana.', tono: 'ok' }
}

// ── Calculadora por gasto ─────────────────────────────────────────────

export type Accion = 'esperar' | 'seguir' | 'apagar' | 'pausar' | 'ganador' | 'revisar' | 'sin-objetivos'

export interface Veredicto {
  accion: Accion
  tono: Tono
  texto: string
}

export const ACCION: Record<Accion, string> = {
  esperar: 'Esperar',
  seguir: 'Seguir',
  apagar: 'Apagar',
  pausar: 'Pausar',
  ganador: 'Ganador',
  revisar: 'Revisar',
  'sin-objetivos': 'Sin objetivos',
}

export function veredictoPorGasto(p: { gasto: number; leads: number; citas: number; ctr: number | null; dias: number; K1: number; K2: number; trm: number }): Veredicto {
  const { gasto: g, leads: L, citas: C, K1, K2 } = p
  if (!K1 || !K2) return { accion: 'sin-objetivos', tono: 'nada', texto: 'Define el CPL objetivo (KPI1) y el costo por cita objetivo (KPI2) en Ajustes.' }
  if (p.dias < 3) return { accion: 'esperar', tono: 'muestra', texto: 'Días 0-3: no se toca nada.' }
  // Reglas de los días 3-7, antes de la calculadora
  if (p.dias < 7 && p.ctr != null && p.ctr < 0.005 && g >= K1) return { accion: 'apagar', tono: 'critico', texto: `CTR ${fmt.pct(p.ctr, 2)} < 0,5% en los días 3-7: cortar.` }
  if (p.dias < 7 && L === 0 && g >= 30 * p.trm) return { accion: 'apagar', tono: 'critico', texto: 'Cero leads con ~USD 30 gastados: cortar.' }
  const cpl = L ? g / L : Infinity
  const cpc = C ? g / C : Infinity
  if (g < K1) return { accion: 'esperar', tono: 'muestra', texto: 'Menos de 1× KPI1 gastado: esperar.' }
  if (g < 2 * K1) return { accion: 'seguir', tono: 'muestra', texto: '1-2× KPI1: mirar CPC y CTR; todavía no se juzga el lead.' }
  if (g < 3 * K1) return L >= 1 ? { accion: 'seguir', tono: 'ok', texto: 'Ya hay al menos un lead.' } : { accion: 'apagar', tono: 'critico', texto: '2-3× KPI1 sin un solo lead: apagar.' }
  if (g < 5 * K1) return cpl < 1.5 * K1 ? { accion: 'seguir', tono: 'ok', texto: `Lead a ${fmt.copCorto(cpl)} (< 1,5× KPI1).` } : { accion: 'pausar', tono: 'critico', texto: `Lead a ${fmt.copCorto(cpl)} ≥ 1,5× KPI1: pausar.` }
  if (g < 1.75 * K2) return cpl < 1.2 * K1 ? { accion: 'seguir', tono: 'ok', texto: 'Lead < 1,2× KPI1: seguir hacia la primera llamada.' } : { accion: 'revisar', tono: 'alerta', texto: 'Lead ≥ 1,2× KPI1: la tolerancia se estrecha (el documento no fija acción).' }
  if (g < 2.5 * K2) return C >= 1 ? { accion: 'seguir', tono: 'ok', texto: 'Ya hay al menos una llamada agendada.' } : { accion: 'pausar', tono: 'critico', texto: '1,75-2,5× KPI2 sin llamada: pausar.' }
  if (g < 5 * K2) return cpc < 1.25 * K2 ? { accion: 'seguir', tono: 'ok', texto: `Llamada a ${fmt.copCorto(cpc)} (< 1,25× KPI2).` } : { accion: 'revisar', tono: 'alerta', texto: 'Llamada ≥ 1,25× KPI2 (el documento no fija acción).' }
  return cpc < 1.15 * K2 ? { accion: 'ganador', tono: 'ok', texto: 'Llamada < 1,15× KPI2 con más de 5× KPI2 gastado: ganador. Subir 10-20% cada 2-3 días.' } : { accion: 'revisar', tono: 'alerta', texto: 'Llamada ≥ 1,15× KPI2 (el documento no fija acción).' }
}

/** Días que cuentan para el gasto diario: desde la primera fila con pauta (o el inicio del periodo) hasta hoy. */
export function diasEfectivos(fechas: string[], r: { desde: Date; hasta: Date }) {
  if (!fechas.length) return 1
  const primera = fechas.reduce((a, b) => (a < b ? a : b))
  const desde = Math.max(r.desde.getTime(), parseISO(primera).getTime())
  const hasta = Math.min(r.hasta.getTime(), Date.now())
  return Math.max(1, differenceInCalendarDays(new Date(hasta), new Date(desde)) + 1)
}

// ── Diagnóstico del embudo de pauta ───────────────────────────────────

const costoTono = (v: number | null, objetivo: number): Tono => (v == null || !objetivo ? 'nada' : v <= objetivo ? 'ok' : v <= objetivo * 1.5 ? 'alerta' : 'critico')

export function diagnosticarAds(m: Pauta, a: Ajustes, ltv: number, diasPeriodo: number) {
  const s = PAUTA.muestras
  const h: Hallazgo[] = []
  const gastoDia = diasPeriodo > 0 ? m.gasto / diasPeriodo : 0

  h.push({
    id: 'gasto',
    etapa: 'Volumen',
    metrica: 'Gasto por día',
    valor: fmt.copCorto(gastoDia),
    umbral: a.presupuesto_diario ? `presupuesto ${fmt.copCorto(a.presupuesto_diario)}/día` : 'define el presupuesto en Ajustes',
    tono: m.gasto === 0 ? 'critico' : a.presupuesto_diario ? evaluar(gastoDia, { minimo: a.presupuesto_diario * 0.5, meta: a.presupuesto_diario * 0.9 }) : 'nada',
    titulo: m.gasto === 0 ? 'No hay pauta registrada en el periodo' : `Vas a ${fmt.copCorto(gastoDia)} por día`,
    porque: 'Sin gasto no hay muestra, y sin muestra ninguna tasa dice nada. USD 10/día mínimo por adset; 25-50 ideal.',
    acciones: ['Registra cada día (o importa el Excel de Meta)', 'Revisa que la campaña esté entregando: aprobación, presupuesto, ubicaciones'],
    fuente: 'Paid Ads System · montaje de anuncios',
  })

  h.push({
    id: 'ctr',
    etapa: 'Anuncio',
    metrica: 'CTR · el gancho para el scroll',
    valor: fmt.pct(m.ctr, 2),
    umbral: 'mín 0,5% · meta 1%',
    tono: evaluar(m.ctr, PAUTA.ctr, m.impresiones, s.clics),
    muestra: { n: m.impresiones, requerida: s.clics, unidad: 'impresiones' },
    titulo: `De cada 100 que ven el anuncio, ${fmt.dec((m.ctr ?? 0) * 100)} hacen clic`,
    porque: 'Si el CTR está bajo, el problema es el gancho y el ángulo, no la página. 1.000+ impresiones y cero clics: Meta cortó el tráfico porque el anuncio no provocó respuesta.',
    acciones: ['Ganchos nuevos sobre el mismo cuerpo (4 + 1): una variable por test', 'Giros grandes DENTRO de la variable: ganchos muy distintos entre sí', 'El anuncio solo tiene que llevar a la página'],
    fuente: 'Diagnóstico de pauta por KPI · escalones 4 y 6-9',
  })

  h.push({
    id: 'lp',
    etapa: 'Página',
    metrica: 'Conversión de la página',
    valor: fmt.pct(m.lp),
    umbral: 'mín 15% · ideal 15-35%',
    tono: evaluar(m.lp, PAUTA.lp, m.clics, s.cpl),
    muestra: { n: m.clics, requerida: s.cpl, unidad: 'clics' },
    titulo: `De cada 100 clics, ${fmt.dec((m.lp ?? 0) * 100)} dejan sus datos`,
    porque: 'CPC bien y CPL mal = la página: desconexión de mensaje, look y feel entre el anuncio y la página.',
    acciones: ['El titular de la página = la descripción del anuncio', 'Titular de 4 casillas ensamblado con la oferta', 'Revisa velocidad y el formulario en celular'],
    fuente: 'Plan de optimización 30 días · página > 15% · escalón 10',
  })

  h.push({
    id: 'cpl',
    etapa: 'Lead',
    metrica: 'CPL · KPI1',
    valor: fmt.copCorto(m.cpl),
    umbral: a.cpl_objetivo ? `objetivo ${fmt.copCorto(a.cpl_objetivo)}` : 'define el CPL objetivo',
    tono: m.clics < s.cpl ? 'muestra' : costoTono(m.cpl, a.cpl_objetivo),
    muestra: { n: m.clics, requerida: s.cpl, unidad: 'clics' },
    titulo: `Cada lead cuesta ${fmt.cop(m.cpl)}`,
    porque: 'Es la suma del anuncio y la página. Si está alto con CTR y página en KPI, mira las 3 causas: un anuncio que acapara el tráfico, la página bajo 15%, o un adset con 2,5× el CPL sin resultados.',
    acciones: ['Pausa el anuncio que se come el presupuesto sin convertir', 'Corre la calculadora por gasto en la pestaña Anuncios'],
    fuente: 'Plan de optimización 30 días · las 3 causas',
  })

  h.push({
    id: 'agenda',
    etapa: 'Agenda',
    metrica: 'Lead → llamada agendada',
    valor: fmt.pct(m.hcr),
    umbral: 'sin umbral para la agencia',
    tono: m.leads < s.costoCita ? 'muestra' : 'nada',
    muestra: { n: m.leads, requerida: s.costoCita, unidad: 'leads' },
    titulo: `De cada 10 leads, ${fmt.dec((m.hcr ?? 0) * 10)} agendan · costo por llamada ${fmt.copCorto(m.cpCita)}`,
    porque: 'Si el CPL está bien y el costo por cita mal, el problema está entre el formulario y el calendario: el primer mensaje, el video pre-llamada o la disponibilidad.',
    acciones: ['Calendario a máximo 3 días con 4-5 cupos', 'Video pre-llamada de 4 puntos', 'Los 5 correos de nutrición mientras no agenda'],
    fuente: 'Embudo de aplicación · escalón 11',
  })

  h.push({
    id: 'costoCita',
    etapa: 'Agenda',
    metrica: 'Costo por llamada · KPI2',
    valor: fmt.copCorto(m.cpCita),
    umbral: a.costo_cita_objetivo ? `objetivo ${fmt.copCorto(a.costo_cita_objetivo)}` : 'define el costo por cita objetivo',
    tono: m.leads < s.costoCita ? 'muestra' : costoTono(m.cpCita, a.costo_cita_objetivo),
    muestra: { n: m.leads, requerida: s.costoCita, unidad: 'leads' },
    titulo: `Cada llamada agendada cuesta ${fmt.cop(m.cpCita)}`,
    porque: 'La campaña optimiza a Schedule —el evento más cercano a la plata—, así que este es el número que la campaña está tratando de bajar.',
    acciones: ['Optimiza al evento Schedule, no a Lead', 'Escala lo que tenga la llamada más barata, 10-20% cada 2-3 días'],
    fuente: 'Campaña de Meta de la agencia · calculadora por gasto',
  })

  h.push({
    id: 'sur',
    etapa: 'Presentación',
    metrica: 'Se presentaron',
    valor: fmt.pct(m.sur),
    umbral: 'mín 60%',
    tono: evaluar(m.sur, PAUTA.sur, m.citas, s.sur),
    muestra: { n: m.citas, requerida: s.sur, unidad: 'citas' },
    titulo: `Se presentan ${m.presentados} de ${m.citas}`,
    porque: 'Una campaña que llena el calendario con gente que no aparece no está en benchmark aunque el CPL lo esté.',
    acciones: ['Recordatorio a la hora correcta (mañana → la noche anterior)', 'Confirmación por WhatsApp', 'Agendar a máximo 3 días'],
    fuente: 'Big 4 · SUR 60% · escalón 12',
  })

  h.push({
    id: 'scr',
    etapa: 'Cierre',
    metrica: 'Cierre',
    valor: fmt.pct(m.cierre),
    umbral: 'mín 20%',
    tono: evaluar(m.cierre, PAUTA.cierre, m.presentados, s.cierre),
    muestra: { n: m.presentados, requerida: s.cierre, unidad: 'llamadas hechas' },
    titulo: `Cierras ${m.cierres} de ${m.presentados}`,
    porque: 'Si el cierre está bajo con tráfico de pauta, revisa si el anuncio promete lo que vendes y la calificación de la aplicación. Nadie domina esto antes de 100 llamadas.',
    acciones: ['Escucha las grabaciones y anota la objeción', 'Ajusta las preguntas de la aplicación para filtrar'],
    fuente: 'Big 4 · SCR 20% · escalón 13',
  })

  const roas = m.gasto ? m.cash / m.gasto : null
  const cac = m.cierres ? m.gasto / m.cierres : null
  h.push({
    id: 'roas',
    etapa: 'Retorno',
    metrica: 'Cash / gasto · CAC',
    valor: roas != null ? `${fmt.dec(roas)}x` : '—',
    umbral: `filtro ROI 2:1 · CAC vs LTV ${fmt.copCorto(ltv)}`,
    tono: roas == null ? 'nada' : roas >= 2 ? 'ok' : roas >= 1 ? 'alerta' : 'critico',
    titulo: `CAC ${fmt.copCorto(cac)} · por cada peso de pauta vuelven ${roas != null ? fmt.dec(roas) : '—'}`,
    porque: 'Con todo lo demás en KPI y el retorno bajo: precio mal puesto o mercado hipercompetitivo → diferenciar la oferta.',
    acciones: ['Revisa el precio con la fórmula ROI (Calculadoras)', 'Mide el LTV real cuando haya clientes que terminaron'],
    fuente: 'Diagnóstico de pauta por KPI · escalón 15',
  })

  // El cuello: el primer tubo crítico con muestra, en orden; si no hay, el primero en alerta.
  const cuello = h.find((x) => x.tono === 'critico') ?? h.find((x) => x.tono === 'alerta') ?? (h.some((x) => x.tono === 'muestra') ? h[0] : null)
  const resumen = !cuello
    ? 'El embudo de pauta está en KPI. Escala lo que gana, 10-20% cada 2-3 días.'
    : cuello.id === 'gasto' && cuello.tono !== 'critico' && cuello.tono !== 'alerta'
      ? 'Todavía no hay muestra para juzgar el embudo: el trabajo es dejar correr la pauta.'
      : m.gasto === 0
        ? 'No hay pauta registrada en el periodo.'
        : `El tubo roto está en ${cuello.etapa.toLowerCase()}: ${cuello.metrica}.`
  return { hallazgos: h, cuello, resumen }
}
