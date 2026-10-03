// Semana 2 · Self Transcendence.
// Todo el contenido (doctrina resumida, tu documento, tus respuestas e imágenes)
// es PRIVADO: no vive en el código. Sale de public/privado/semana-2.json —que no va
// a git ni al deploy— y en la nube queda guardado en tu base de datos.

import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { backend, cargarContenido, estadoContenido, insertar, todo, useTabla } from './store'
import type { Mentalidad } from './types'

export interface Idea {
  titulo: string
  texto: string
}
export interface Modulo {
  n: string
  titulo: string
  titulo_es: string
  linea: string
  ideas: Idea[]
  citas: string[]
  aplicacion: string
  advertencias: string[]
}
export interface Ejercicio {
  id: string
  modulo: string
  titulo: string
  consigna: string
  hueco?: string
}
export interface Documento {
  titulo: string
  version: string
  creado: string
  instrucciones: string
  principios: { titulo: string; texto: string }[]
  ritual: string[]
  vision: string
  legado: string
  historia: { lema: string; pasados: string[]; futuros: string[] }
  manifiesto: string[]
  rasgos: { nombre: string; texto: string }[]
  estilo: string[]
  rutina: { hora: string; actividad: string }[]
  estandar_rutina: string
  mentores: string
  metas: Record<string, string[]>
  estandares: string[]
  recordatorio: string
  afirmaciones: { n: number; titulo: string; frases: string[] }[]
  cierre: string
}
export interface Semana2 {
  semana: { numero: number; titulo: string; titulo_es: string; linea: string; por_que: string }
  principios: { n: number; titulo: string; modulo: string; idea: string }[]
  modulos: Modulo[]
  mandatos: { n: number; titulo: string; texto: string }[]
  areas: Idea[]
  formas: { clave: string; nombre: string; texto: string }[]
  pasos_general: string[]
  pasos_juicio: string[]
  zonas: { zona: number; texto: string }[]
  burnout: { etapa: number; nombre: string; sintomas: string }[]
  descanso: Idea[]
  ejercicios: Ejercicio[]
}
interface Paquete extends Semana2 {
  documento: Documento
  imagenes: { id: string; nombre: string; data: string }[]
  respuestas: Record<string, unknown>
}

export interface EstadoEjercicio {
  estado: 'pendiente' | 'hecho' | 'hueco'
  respuesta: string
  hecho_el: string | null
  revisado_el: string | null
}

const FECHA_CIERRE_SEMANA = '2026-08-23' // el roadmap registra la Semana 2 cerrada ese día

// ── Carga ───────────────────────────────────────────────────────────────

type Estado = 'cargando' | 'listo' | 'sin-contenido' | 'error'
let estado: Estado = 'cargando'
let intentado = false
const subs = new Set<() => void>()
const emitir = () => subs.forEach((f) => f())

async function leerArchivo(): Promise<Paquete | null> {
  try {
    const r = await fetch('/privado/semana-2.json', { cache: 'no-store' })
    if (!r.ok) return null
    return (await r.json()) as Paquete
  } catch {
    return null
  }
}

/** Mete el paquete en la base: el contenido de solo lectura y, si faltan, el documento y los ejercicios. */
export function sembrar(p: Paquete) {
  const { documento, imagenes, respuestas, ...doctrina } = p
  const c = todo()
  if (!c.contenido.some((x) => x.id === 'semana-2')) insertar('contenido', { id: 'semana-2', datos: doctrina })
  for (const img of imagenes) if (!c.contenido.some((x) => x.id === img.id)) insertar('contenido', { id: img.id, datos: { nombre: img.nombre, data: img.data } })

  const filas: Partial<Mentalidad>[] = []
  if (!c.mentalidad.some((x) => x.id === 'documento')) filas.push({ id: 'documento', tipo: 'documento', datos: documento as unknown as Record<string, unknown> })
  if (!c.mentalidad.some((x) => x.id === 'revision')) filas.push({ id: 'revision', tipo: 'revision', datos: { ultima: FECHA_CIERRE_SEMANA } })
  for (const e of doctrina.ejercicios) {
    if (c.mentalidad.some((x) => x.id === e.id)) continue
    const r = respuestas[e.id]
    const datos: EstadoEjercicio = {
      estado: e.hueco ? 'hueco' : 'hecho',
      respuesta: typeof r === 'string' ? r : '',
      hecho_el: e.hueco ? null : FECHA_CIERRE_SEMANA,
      revisado_el: null,
    }
    filas.push({ id: e.id, tipo: 'ejercicio', datos: datos as unknown as Record<string, unknown> })
  }
  if (!c.mentalidad.some((x) => x.id === 'formas-primarias') && Array.isArray(respuestas._formas_primarias))
    filas.push({ id: 'formas-primarias', tipo: 'ejercicio', datos: { formas: respuestas._formas_primarias } })
  if (filas.length) insertar('mentalidad', filas)
}

export async function cargarSemana2() {
  if (intentado) return
  intentado = true
  await cargarContenido()
  if (estadoContenido().error) {
    // No se pudo bajar: no es que no exista. Se puede reintentar.
    intentado = false
    estado = 'error'
    emitir()
    return
  }
  const hay = todo().contenido.some((x) => x.id === 'semana-2')
  // En modo local el contenido no se guarda en el navegador: se lee siempre del archivo.
  if (!hay || backend === 'local') {
    const p = await leerArchivo()
    if (p) sembrar(p)
  }
  estado = todo().contenido.some((x) => x.id === 'semana-2') ? 'listo' : 'sin-contenido'
  emitir()
}

/** Vuelve a intentar bajar el contenido cuando la conexión falló. */
export async function reintentarSemana2() {
  estado = 'cargando'
  emitir()
  await cargarContenido(true)
  intentado = false
  await cargarSemana2()
}

export async function importarArchivo(file: File) {
  const p = JSON.parse(await file.text()) as Paquete
  if (!p.modulos || !p.documento) throw new Error('No es el paquete de la Semana 2')
  sembrar(p)
  estado = 'listo'
  emitir()
}

// ── Hooks ───────────────────────────────────────────────────────────────

export function useSemana2() {
  const contenido = useTabla('contenido')
  const mentalidad = useTabla('mentalidad')
  const st = useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => estado,
  )
  useEffect(() => {
    void cargarSemana2()
  }, [])

  return useMemo(() => {
    const doctrina = contenido.find((x) => x.id === 'semana-2')?.datos as Semana2 | undefined
    const imagenes = contenido.filter((x) => x.id.startsWith('img-')).map((x) => ({ id: x.id, ...(x.datos as { nombre: string; data: string }) }))
    const docFila = mentalidad.find((x) => x.id === 'documento')
    const ejercicios = new Map(mentalidad.filter((x) => x.tipo === 'ejercicio').map((x) => [x.id, x]))
    const revision = mentalidad.find((x) => x.id === 'revision')
    const formasPrimarias = ((mentalidad.find((x) => x.id === 'formas-primarias')?.datos.formas as string[]) ?? []).map((s) => s.trim())
    return {
      estado: st,
      doctrina,
      documento: docFila?.datos as unknown as Documento | undefined,
      docId: docFila?.id,
      imagenes,
      ejercicios,
      revision: (revision?.datos.ultima as string | undefined) ?? null,
      formasPrimarias,
    }
  }, [contenido, mentalidad, st])
}

/** El principio del día: rota entre los 7 según la fecha. */
export function indiceDelDia(n: number, fecha = new Date()) {
  const dias = Math.floor(fecha.getTime() / 86_400_000)
  return ((dias % n) + n) % n
}

// ── Ritual ──────────────────────────────────────────────────────────────

export const RITUAL = {
  manana: [
    { k: 'despertar', t: 'Despertar temprano', d: 'Tu rutina: 05:45' },
    { k: 'lectura_am', t: 'Leer el documento completo', d: 'Mañana · 2.8: dos veces al día, 7 días, sin fallar' },
    { k: 'vision', t: 'Mirar la visión y sentirla', d: 'Imagínate ahí y deja que la emoción llegue' },
    { k: 'afirmaciones', t: 'Afirmaciones en voz alta', d: 'Pensamiento + imagen + emoción' },
  ],
  dia: [
    { k: 'accion', t: 'Acción masiva en horas de trabajo', d: 'Tu estándar: 50+ llamadas. Si un día falla, se repone el mismo día' },
    { k: 'banco', t: 'Un depósito en el Banco de Sufrimiento', d: 'Ir directo a lo que tu yo actual está evitando' },
  ],
  noche: [
    { k: 'cierre', t: 'Cerrar el día', d: 'Revisar, planear mañana y registrar métricas' },
    { k: 'desconexion', t: '2-3 horas sin trabajo antes de dormir', d: 'Relájate, o tu cuerpo te va a obligar' },
    { k: 'lectura_pm', t: 'Leer el documento antes de dormir', d: 'Noche · 21:45' },
    { k: 'dormir', t: 'Dormir a la hora', d: 'Tu rutina: 22:00' },
  ],
}
export const ITEMS_RITUAL = [...RITUAL.manana, ...RITUAL.dia, ...RITUAL.noche]

/** Un día cuenta para la racha cuando se leyó el documento mañana Y noche (2.8). */
export const lecturaCompleta = (r: Record<string, boolean> | null | undefined) => !!r?.lectura_am && !!r?.lectura_pm
