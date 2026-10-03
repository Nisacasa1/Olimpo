// Contenido orgánico y creativos: la lógica compartida por Contenido, Hoy y la revisión.

import { addDays, format, parseISO } from 'date-fns'
import { hoyISO } from './format'
import type { Embudo, EtapaIdea, EtapaPersona, Linea, MetricaPieza, Persona, Pieza } from './types'

export const LINEAS: { k: Linea; n: string; corto: string; d: string; color: string }[] = [
  { k: 'marca', n: 'Marca personal', corto: 'Marca', d: 'Tu proceso, tus historias y tus opiniones: atrae a quien te sigue a ti', color: 'var(--violet)' },
  { k: 'agencia', n: 'Agencia', corto: 'Agencia', d: 'Contenido de Olimpo para tu cliente ideal: su dolor, tu mecanismo y tus casos', color: 'var(--blue)' },
  { k: 'ads', n: 'Ads', corto: 'Ads', d: 'Creativos de pauta: 4 ganchos sobre un cuerpo. Al publicarse pasan a Ads como anuncio', color: 'var(--amber)' },
]
export const LINEA = Object.fromEntries(LINEAS.map((l) => [l.k, l])) as Record<Linea, (typeof LINEAS)[number]>

export const ETAPAS: { k: EtapaIdea; n: string; d: string }[] = [
  { k: 'idea', n: 'Idea', d: 'Lo que se te ocurre. Arrástrala cuando la vayas a grabar' },
  { k: 'grabar', n: 'Grabar', d: 'Lista para la cámara. Desde aquí entras al modo grabación' },
  { k: 'editar', n: 'Editar', d: 'Grabada, esperando CapCut' },
  { k: 'listo', n: 'Listo', d: 'Exportada. Suéltala en Publicar cuando la subas' },
]

export const FORMATOS = ['Talking head guionado', 'Storytelling', 'Voz en off + B-roll', 'Pizarra', 'Talking head crudo', 'Antes / después', 'Carrusel', 'Estático', 'Video de pauta (4 + 1)']
export const PLATAFORMAS = ['Instagram', 'TikTok', 'YouTube Shorts']

export const EMBUDOS: { k: Embudo; n: string; d: string; abre: string; sostiene: string; cierra: string }[] = [
  { k: 'TOF', n: 'TOF', d: 'Atrae a quien no te conoce', abre: 'Nombra el dolor con SUS palabras en los primeros 3 segundos.', sostiene: 'Una sola idea. Si tiene que entender algo previo, ya lo perdiste.', cierra: 'Remata con la frase que resume. Sin venta.' },
  { k: 'MOF', n: 'MOF', d: 'Construye confianza en quien ya te vio', abre: 'Arranca por el resultado o por el error, no por la teoría.', sostiene: 'El mecanismo o el caso. Específico gana: números, nombres, qué pasó.', cierra: 'Algo aplicable hoy. El CTA puede ser seguir o comentar.' },
  { k: 'BOF', n: 'BOF', d: 'Le habla a quien ya confía', abre: 'Directo a quien te viene siguiendo. Puedes asumir contexto.', sostiene: 'Prueba, proceso real, o la objeción que nadie dijo en voz alta.', cierra: 'Aquí sí va la invitación.' },
]

export const FILTRO = ['Potencial de 100.000 vistas', 'Poder de preventa', 'Concepto probado', 'Encaje con el cliente ideal', 'Recompensa intrigante', 'Alineación de marca']

export const ETAPAS_PERSONA: { k: EtapaPersona; n: string; c: string }[] = [
  { k: 'conversando', n: 'Conversando', c: 'text-muted bg-surface-2' },
  { k: 'interesado', n: 'Interesado', c: 'text-violet bg-violet/15' },
  { k: 'cita', n: 'Con cita', c: 'text-blue-2 bg-blue-soft' },
  { k: 'cliente', n: 'Cliente', c: 'text-green bg-green-soft' },
  { k: 'descartado', n: 'Descartado', c: 'text-faint bg-surface-2' },
]

/** Las piezas se miden una vez, a los 7 días. */
export const DIAS_MEDICION = 7
export const tocaMedir = (p: Pieza, metricas: MetricaPieza[]) => format(addDays(parseISO(p.publicado), DIAS_MEDICION), 'yyyy-MM-dd') <= hoyISO() && !metricas.some((m) => m.pieza_id === p.id)

export function resumenPieza(p: Pieza, metricas: MetricaPieza[], personas: Persona[]) {
  const ms = metricas.filter((m) => m.pieza_id === p.id)
  const s = (k: keyof MetricaPieza) => ms.reduce((a, m) => a + (Number(m[k]) || 0), 0)
  const vistas = s('vistas')
  return {
    medida: ms.length > 0,
    vistas,
    seguidores: s('seguidores'),
    guardados: s('guardados'),
    compartidos: s('compartidos'),
    comentarios: s('comentarios'),
    retencion: ms.length ? ms.reduce((a, m) => a + (Number(m.retencion) || 0), 0) / ms.length : null,
    conversaciones: personas.filter((x) => x.pieza_id === p.id).length,
    // La calidad del seguidor manda sobre el alcance: por cada 1.000 vistas, cuántos te siguen
    seguidoresPorMil: vistas ? (s('seguidores') / vistas) * 1000 : null,
  }
}

// ── El paquete de ideación (privado) ─────────────────────────────────

export interface Framework {
  slug: string
  titulo: string
  categoria: string
  autor: string
  resumen: string
  cuerpo: string
  lineas: Linea[]
  origen: string
}
export interface PaqueteIdeacion {
  frameworks: Framework[]
  giros: { n: number; giro: string; embudo: Embudo; plantilla: string }[]
  tipos_gancho: { tipo: string; plantilla: string }[]
  por_linea: Record<Linea, { embudo: Embudo; idea: string }[]>
}

export const CATEGORIAS: Record<string, string> = {
  ideacion: 'Ideación',
  contenido: 'Contenido',
  ganchos: 'Ganchos',
  estructura: 'Estructura',
  estrategia: 'Estrategia',
  fundacion: 'Fundación',
  conversion: 'Conversión',
  distribucion: 'Distribución',
  mentalidad: 'Mentalidad',
}

export const rellenar = (plantilla: string, dolor: string) => plantilla.replace(/\{dolor\}/g, dolor.trim() || '[dolor]')
