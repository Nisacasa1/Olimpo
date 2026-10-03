// Contenido privado de solo lectura (frameworks, doctrina): vive en public/privado/*.json,
// que nunca va a git ni al deploy. En modo local se lee del archivo en cada arranque;
// en la nube se guarda una vez en la tabla `contenido`.

import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { backend, insertar, todo, useTabla } from './store'

const estado = new Map<string, 'cargando' | 'listo' | 'falta'>()
const intentados = new Set<string>()
const subs = new Set<() => void>()
const emitir = () => subs.forEach((f) => f())

export async function cargarPaquete(id: string) {
  if (intentados.has(id)) return
  intentados.add(id)
  estado.set(id, 'cargando')
  const hay = todo().contenido.some((x) => x.id === id)
  if (!hay || backend === 'local') {
    try {
      const r = await fetch(`/privado/${id}.json`, { cache: 'no-store' })
      if (r.ok) {
        const datos = await r.json()
        if (!todo().contenido.some((x) => x.id === id)) insertar('contenido', { id, datos })
      }
    } catch {
      /* sin archivo: queda «falta» */
    }
  }
  estado.set(id, todo().contenido.some((x) => x.id === id) ? 'listo' : 'falta')
  emitir()
}

export function usePaquete<T>(id: string): { datos: T | undefined; estado: 'cargando' | 'listo' | 'falta' } {
  const contenido = useTabla('contenido')
  const st = useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => estado.get(id) ?? 'cargando',
  )
  useEffect(() => {
    void cargarPaquete(id)
  }, [id])
  return useMemo(() => ({ datos: contenido.find((x) => x.id === id)?.datos as T | undefined, estado: st }), [contenido, id, st])
}
