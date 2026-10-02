// Capa de datos. Dos backends con la misma interfaz:
//  · local    → localStorage del navegador (arranca sin configurar nada)
//  · supabase → base de datos en la nube (se activa con VITE_SUPABASE_URL)
// La app carga todas las tablas al inicio y trabaja sobre un caché en memoria;
// cada escritura se refleja al instante y se persiste en segundo plano.

import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'
import { TABLAS, type Ajustes, type Tabla, type Tablas } from './types'

type Cache = { [K in Tabla]: Tablas[K][] }

const vacio = (): Cache =>
  Object.fromEntries(TABLAS.map((t) => [t, []])) as unknown as Cache

let cache: Cache = vacio()
let listo = false
let errorCarga: string | null = null
const subs = new Set<() => void>()
let version = 0

const emitir = () => {
  version++
  subs.forEach((f) => f())
}

export const backend: 'local' | 'supabase' = supabase ? 'supabase' : 'local'

// ── Persistencia local ──────────────────────────────────────────────────

const clave = (t: Tabla) => `imperium-os:${t}`

function leerLocal<T extends Tabla>(t: T): Tablas[T][] {
  try {
    const raw = localStorage.getItem(clave(t))
    return raw ? (JSON.parse(raw) as Tablas[T][]) : []
  } catch {
    return []
  }
}

function guardarLocal(t: Tabla) {
  // El contenido privado (doctrina e imágenes) no se guarda en el navegador:
  // en modo local se vuelve a leer de public/privado/ en cada arranque.
  if (t === 'contenido') return
  try {
    localStorage.setItem(clave(t), JSON.stringify(cache[t]))
  } catch (e) {
    console.error('No se pudo guardar en el navegador', e)
  }
}

// ── Carga ───────────────────────────────────────────────────────────────

export async function cargar() {
  if (supabase) {
    const sb = supabase
    const res = await Promise.all(
      TABLAS.map(async (t) => {
        const filas: unknown[] = []
        // Supabase devuelve máximo 1000 filas por consulta: se pagina.
        for (let desde = 0; ; desde += 1000) {
          const { data, error } = await sb.from(t).select('*').range(desde, desde + 999)
          if (error) throw new Error(`${t}: ${error.message}`)
          filas.push(...(data ?? []))
          if (!data || data.length < 1000) break
        }
        return [t, filas] as const
      }),
    ).catch((e: Error) => {
      errorCarga = e.message
      return null
    })
    if (res) cache = Object.fromEntries(res) as unknown as Cache
  } else {
    cache = Object.fromEntries(TABLAS.map((t) => [t, leerLocal(t)])) as unknown as Cache
  }
  listo = true
  emitir()
}

// ── Escritura ───────────────────────────────────────────────────────────

const ahora = () => new Date().toISOString()
export const nuevoId = () => crypto.randomUUID()

async function persistir(t: Tabla, filas: object[], borrar: string[] = []) {
  if (!supabase) return guardarLocal(t)
  try {
    if (filas.length) {
      for (let i = 0; i < filas.length; i += 500) {
        const { error } = await supabase.from(t).upsert(filas.slice(i, i + 500))
        if (error) throw error
      }
    }
    if (borrar.length) {
      const { error } = await supabase.from(t).delete().in('id', borrar)
      if (error) throw error
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : JSON.stringify(e)
    avisar(`No se guardó en la nube (${t}): ${msg}`)
  }
}

export function insertar<T extends Tabla>(t: T, filas: Partial<Tablas[T]> | Partial<Tablas[T]>[]) {
  const lista = (Array.isArray(filas) ? filas : [filas]).map(
    (f) => ({ id: nuevoId(), created_at: ahora(), ...f }) as Tablas[T],
  )
  cache = { ...cache, [t]: [...cache[t], ...lista] }
  emitir()
  void persistir(t, lista)
  return lista
}

export function actualizar<T extends Tabla>(t: T, id: string, cambios: Partial<Tablas[T]>) {
  let fila: Tablas[T] | undefined
  const lista = cache[t].map((r) => {
    if (r.id !== id) return r
    fila = { ...r, ...cambios }
    return fila
  })
  cache = { ...cache, [t]: lista }
  emitir()
  if (fila) void persistir(t, [fila])
}

export function borrar<T extends Tabla>(t: T, ids: string | string[]) {
  const set = new Set(Array.isArray(ids) ? ids : [ids])
  cache = { ...cache, [t]: cache[t].filter((r) => !set.has(r.id)) }
  emitir()
  void persistir(t, [], [...set])
}

/** Reemplaza una tabla entera (importación de respaldo). */
export function reemplazar<T extends Tabla>(t: T, filas: Tablas[T][]) {
  const viejos = cache[t].map((r) => r.id)
  cache = { ...cache, [t]: filas }
  emitir()
  const nuevos = new Set(filas.map((f) => f.id))
  void persistir(
    t,
    filas,
    viejos.filter((id) => !nuevos.has(id)),
  )
}

// ── Lectura (hooks) ─────────────────────────────────────────────────────

const suscribir = (f: () => void) => {
  subs.add(f)
  return () => subs.delete(f)
}

export function useTabla<T extends Tabla>(t: T): Tablas[T][] {
  return useSyncExternalStore(suscribir, () => cache[t])
}

export function useEstado() {
  useSyncExternalStore(suscribir, () => version)
  return { listo, error: errorCarga }
}

export function todo(): Cache {
  return cache
}

// ── Ajustes ─────────────────────────────────────────────────────────────

export const AJUSTES_BASE: Ajustes = {
  id: 'main',
  agencia: 'Olimpo Acquisition',
  moneda: 'COP',
  trm: 4000,
  meta_mensual: 10_000_000,
  precio_setup: 1_000_000,
  precio_por_paciente: 300_000,
  pacientes_por_cliente_mes: 15,
  retencion_meses: 6,
  meta_llamadas_dia: 100,
  dias_habiles_semana: 5,
  guion_activo: 'charlie',
  cpl_objetivo: 0,
  costo_cita_objetivo: 0,
}

export function useAjustes(): Ajustes {
  const filas = useTabla('ajustes')
  return { ...AJUSTES_BASE, ...(filas[0] ?? {}) }
}

export function guardarAjustes(cambios: Partial<Ajustes>) {
  const actual = cache.ajustes[0]
  if (actual) actualizar('ajustes', actual.id, cambios)
  else insertar('ajustes', { ...AJUSTES_BASE, ...cambios })
}

// ── Avisos (toasts) ─────────────────────────────────────────────────────

type Aviso = { id: number; texto: string; tono: 'ok' | 'error' }
let avisos: Aviso[] = []
const subsAvisos = new Set<() => void>()
export function avisar(texto: string, tono: Aviso['tono'] = 'error') {
  const id = Date.now() + Math.random()
  avisos = [...avisos, { id, texto, tono }]
  subsAvisos.forEach((f) => f())
  setTimeout(() => {
    avisos = avisos.filter((a) => a.id !== id)
    subsAvisos.forEach((f) => f())
  }, 4200)
}
export function useAvisos() {
  return useSyncExternalStore(
    (f) => {
      subsAvisos.add(f)
      return () => subsAvisos.delete(f)
    },
    () => avisos,
  )
}
