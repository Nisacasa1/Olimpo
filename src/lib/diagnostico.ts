// El árbol de diagnóstico de los Big 4 (7.2) + identificación de cuellos de
// botella (7.1): se baja desde la métrica llave hasta el tubo roto, en orden de
// dependencia (ABR → SUR → SCR → LTV → volumen), y sin juzgar sin muestra.

import { LTV_MIN_USD, U } from './doctrina'
import { fmt } from './format'
import type { Embudo, Tono, Ventas } from './metricas'
import { evaluar, evaluarU } from './metricas'

export interface Hallazgo {
  id: string
  etapa: string
  metrica: string
  valor: string
  umbral: string
  tono: Tono
  muestra?: { n: number; requerida: number; unidad: string }
  titulo: string
  porque: string
  acciones: string[]
  fuente: string
}

export interface Diagnostico {
  hallazgos: Hallazgo[]
  cuello: Hallazgo | null
  resumen: string
}

const pctU = (u: { minimo: number | null; meta: number | null }) =>
  [u.minimo != null ? `mín ${fmt.pct(u.minimo, 0)}` : null, u.meta != null ? `meta ${fmt.pct(u.meta, 0)}` : null]
    .filter(Boolean)
    .join(' · ')

export function diagnosticar(p: {
  e: Embudo
  v: Ventas
  ltv: { valor: number; tipo: 'real' | 'estimado' }
  trm: number
  diasHabiles: number
  metaLlamadasDia: number
  facturadoMes: number
  metaMensual: number
}): Diagnostico {
  const { e, v } = p
  const h: Hallazgo[] = []

  // 0 · Volumen — sin volumen no hay métrica que valga
  const porDia = p.diasHabiles > 0 ? e.marcadas / p.diasHabiles : 0
  const tVol = evaluar(porDia, { minimo: p.metaLlamadasDia * 0.5, meta: p.metaLlamadasDia })
  h.push({
    id: 'volumen',
    etapa: 'Volumen',
    metrica: 'Llamadas por día hábil',
    valor: fmt.dec(porDia),
    umbral: `meta ${p.metaLlamadasDia}/día`,
    tono: e.marcadas === 0 ? 'critico' : tVol,
    titulo: e.marcadas === 0 ? 'No hay llamadas registradas en el periodo' : `Vas a ${fmt.n(porDia)} llamadas por día hábil`,
    porque:
      'Si no hiciste outreach hoy, no alimentaste nada (regla dura 8). Y sin volumen las tasas no dicen nada: a las 100 llamadas dejan de ser adivinanza.',
    acciones: [
      'Bloquea la ventana de llamadas antes de cualquier otra cosa',
      'Sesiones con piso de 100 marcadas (forzar el outreach)',
      'Si la resistencia gana: Trial by Fire — evitar cuesta el doble de lo que ganas enfrentando',
    ],
    fuente: 'Regla dura 8 · Big 4 (7.2) · 2.5 Trial by Fire',
  })

  // 1 · ABR — la métrica llave del outreach
  const tAbr = evaluarU(e.abr, U.abr, e.marcadas)
  h.push({
    id: 'abr',
    etapa: 'Outreach',
    metrica: 'ABR · tasa de agendamiento',
    valor: fmt.pct(e.abr),
    umbral: pctU(U.abr),
    tono: tAbr,
    muestra: { n: e.marcadas, requerida: U.abr.muestra, unidad: 'llamadas' },
    titulo: 'ABR: de cada llamada, cuántas terminan en cita',
    porque: U.abr.explica,
    acciones: [],
    fuente: U.abr.fuente,
  })

  // 1.x · Las capas del ABR — solo se abren si el ABR no está en meta
  if (tAbr === 'critico' || tAbr === 'alerta' || tAbr === 'muestra') {
    const tPr = evaluarU(e.pr, U.pr, e.marcadas)
    const tBlq = e.bloqueo
    const tCita = evaluarU(e.cierreCita, U.cierreCita, e.decisor)
    const tRr = evaluarU(e.rr, U.rr, e.conResono)

    h.push({
      id: 'pr',
      etapa: 'Outreach · capa 1.1',
      metrica: 'PR · llegó al decisor',
      valor: fmt.pct(e.pr),
      umbral: pctU(U.pr),
      tono: tPr,
      muestra: { n: e.marcadas, requerida: U.pr.muestra, unidad: 'llamadas' },
      titulo: `Llegas al doctor en ${fmt.pct(e.pr)} de las llamadas · el portero frena ${fmt.pct(tBlq)} de las contestadas`,
      porque:
        'Entregabilidad: si no llegas a la persona correcta, nada de lo demás importa. PR bajo = el problema es la apertura y el portero.',
      acciones: [
        'Usa el banco de respuestas del portero completo',
        'Pide el nombre del doctor y su celular: el segundo intento salta la recepción',
        'Callbacks del portero = citas: se llaman a la hora que dieron',
        'Llama a otra hora si la contactabilidad es baja',
      ],
      fuente: U.pr.fuente + ' · Big 4 árbol 1.1',
    })
    h.push({
      id: 'rr',
      etapa: 'Outreach · capa 1.2',
      metrica: 'RR · le resonó',
      valor: fmt.pct(e.rr),
      umbral: pctU(U.rr),
      tono: tRr,
      muestra: { n: e.conResono, requerida: U.rr.muestra, unidad: 'decisores con dato' },
      titulo: 'Cuando llegas al doctor, ¿le mueve algo?',
      porque: 'Tasa de respuesta: llega, pero no convierte la ventana de atención. RR bajo = mensaje débil, sin gancho, sin oferta tangible o no resuena con el mercado.',
      acciones: ['Revisa el pitch contra el problema validado', 'Mide guion por guion: Charlie y Hunter no se mezclan', 'Anota la objeción de cada «no» en la bóveda'],
      fuente: U.rr.fuente + ' · Big 4 árbol 1.2',
    })
    h.push({
      id: 'cierreCita',
      etapa: 'Outreach · capa 1.3',
      metrica: 'Cita sobre decisores',
      valor: fmt.pct(e.cierreCita),
      umbral: pctU(U.cierreCita),
      tono: tCita,
      muestra: { n: e.decisor, requerida: U.cierreCita.muestra, unidad: 'decisores' },
      titulo: 'De los doctores con los que hablas, cuántos agendan',
      porque: 'Tasa de agendamiento: hay interés y no agendan. Respuesta lenta, poca disponibilidad o menos de 7 seguimientos sobre prospectos tibios.',
      acciones: ['Ofrece dos horarios concretos dentro de 3 días', 'Haz al menos 7 seguimientos a los tibios', 'Pide la cita, no «te mando información»'],
      fuente: U.cierreCita.fuente + ' · Big 4 árbol 1.3',
    })
  }

  // 2 · SUR
  const tSur = evaluarU(v.sur, U.sur, v.pasadas)
  const lejos = v.diasAnticipacion != null && v.diasAnticipacion >= 3
  h.push({
    id: 'sur',
    etapa: 'Presentación',
    metrica: 'SUR · se presentaron',
    valor: fmt.pct(v.sur),
    umbral: pctU(U.sur),
    tono: tSur,
    muestra: { n: v.pasadas, requerida: U.sur.muestra, unidad: 'citas' },
    titulo: `Se presentan ${v.presentadas} de ${v.pasadas} citas${v.diasAnticipacion != null ? ` · agendas a ${fmt.dec(v.diasAnticipacion)} días en promedio` : ''}`,
    porque: U.sur.explica + (lejos ? ' 🔴 Estás agendando a 3+ días: «3 o más es demasiado lejos».' : ''),
    acciones: [
      'Agenda a máximo 3 días',
      'Corre el post schedule workflow: confirmación + recordatorios',
      'Recordatorio a la hora correcta: cita en la mañana → la noche anterior',
      'Evita horas malditas (muy temprano, muy tarde)',
    ],
    fuente: U.sur.fuente + ' · Big 4 árbol 2',
  })

  // 3 · SCR
  const tScr = evaluarU(v.scr, U.scr, v.presentadas)
  h.push({
    id: 'scr',
    etapa: 'Cierre',
    metrica: 'SCR · compraron',
    valor: fmt.pct(v.scr),
    umbral: pctU(U.scr),
    tono: tScr,
    muestra: { n: v.presentadas, requerida: U.scr.muestra, unidad: 'llamadas hechas' },
    titulo: `Cierras ${v.ganadas} de ${v.presentadas} llamadas de venta`,
    porque: U.scr.explica + ' «El 90% puede pagarte»: el precio casi nunca es la causa. Nadie domina esto antes de 100 llamadas.',
    acciones: ['Escucha las grabaciones y anota emociones y conclusión', 'Descubrimiento antes del pitch: el 80% de la venta está ahí', 'Repasa la oscilación de la duda y el manejo de objeciones (Semana 4)'],
    fuente: U.scr.fuente + ' · Big 4 árbol 3',
  })

  // 4 · LTV
  const ltvMin = LTV_MIN_USD * p.trm
  const tLtv = evaluar(p.ltv.valor, { minimo: ltvMin, meta: ltvMin })
  h.push({
    id: 'ltv',
    etapa: 'Valor del cliente',
    metrica: `LTV ${p.ltv.tipo}`,
    valor: fmt.copCorto(p.ltv.valor),
    umbral: `mín USD ${fmt.n(LTV_MIN_USD)} ≈ ${fmt.copCorto(ltvMin)}`,
    tono: tLtv,
    titulo: p.ltv.tipo === 'estimado' ? 'LTV estimado con tu precio y retención de Ajustes' : 'LTV real de tus clientes que ya terminaron',
    porque: 'Cuánta plata vale cada cliente en promedio. Si está bajo: cobras muy poco o retienes mal (servicio, onboarding, soporte).',
    acciones: ['Revisa el precio contra la fórmula de precio ROI (Calculadoras)', 'Onboarding de 5 días y garantía real para retener'],
    fuente: 'Big 4 (7.2) · LTV USD 3.000+',
  })

  // 5 · Todo en KPI y no llegas a la meta → volumen
  const tasasOk = [tAbr, tSur, tScr].every((t) => t === 'ok')
  if (tasasOk && p.facturadoMes < p.metaMensual) {
    h.push({
      id: 'volumen-final',
      etapa: 'Volumen',
      metrica: 'Facturado vs meta',
      valor: fmt.copCorto(p.facturadoMes),
      umbral: `meta ${fmt.copCorto(p.metaMensual)}`,
      tono: 'critico',
      titulo: 'Todas las tasas en KPI y todavía no llegas a la meta',
      porque: '«Si todos están en KPI pero todavía no estás haciendo $10k/mes, simplemente no estás haciendo suficiente volumen.»',
      acciones: ['Sube las llamadas diarias: mira la Calculadora para el número exacto'],
      fuente: 'Big 4 (7.2) · «Y si los cuatro están en KPI»',
    })
  }

  // El cuello: el primero en orden de dependencia que esté crítico.
  // Si nada está crítico pero falta muestra, el cuello es el volumen.
  const orden = ['volumen', 'abr', 'pr', 'rr', 'cierreCita', 'sur', 'scr', 'ltv', 'volumen-final']
  const porId = new Map(h.map((x) => [x.id, x]))
  const ordenados = orden.map((id) => porId.get(id)).filter(Boolean) as Hallazgo[]
  let cuello =
    ordenados.find((x) => x.tono === 'critico' && x.id !== 'volumen') ??
    (porId.get('volumen')!.tono === 'critico' ? porId.get('volumen')! : undefined) ??
    ordenados.find((x) => x.tono === 'alerta') ??
    null
  if (!cuello && ordenados.some((x) => x.tono === 'muestra')) cuello = porId.get('volumen')!

  const faltaMuestra = ordenados.some((x) => x.tono === 'muestra')
  const resumen = !cuello
    ? 'Todo en KPI. Sigue el volumen y vuelve a mirar en una semana.'
    : cuello.id === 'volumen'
      ? e.marcadas === 0
        ? 'No hay llamadas en el periodo: el trabajo de hoy es marcar.'
        : `El cuello es el volumen: ${fmt.n(porDia)} llamadas por día hábil contra ${p.metaLlamadasDia}.${faltaMuestra ? ' Y sin volumen, las tasas de más abajo todavía no dicen nada.' : ''}`
      : `El tubo roto está en ${cuello.etapa.toLowerCase()}: ${cuello.metrica}.`

  return { hallazgos: ordenados, cuello, resumen }
}
