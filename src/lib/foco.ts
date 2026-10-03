// El reloj de foco. Se mide con la hora real (no con un contador que cuenta segundos),
// así que no se desfasa aunque la pestaña quede en segundo plano o el celular se apague.
// El estado vive en el navegador para sobrevivir a una recarga.

import { useEffect, useState, useSyncExternalStore } from 'react'
import type { Interrupcion } from './types'

export type Modo = 'temporizador' | 'contador'
export type TipoTrabajo = 'crear' | 'aprender' | 'vaciar'

export interface Reloj {
  activo: boolean
  tarea: string
  prioridad_id: string | null
  modo: Modo
  objetivoMin: number
  tipo: TipoTrabajo
  inicio: string | null // ISO del arranque de la sesión
  acumuladoMs: number // trabajo ya contado, sin el tramo actual
  tramo: string | null // ISO del arranque del tramo en curso (null = en pausa)
  distraido: boolean
  interrupciones: Interrupcion[]
  avisado: boolean // ya sonó al llegar al objetivo
}

const CLAVE = 'olimpo:reloj'
const base: Reloj = { activo: false, tarea: '', prioridad_id: null, modo: 'temporizador', objetivoMin: 50, tipo: 'crear', inicio: null, acumuladoMs: 0, tramo: null, distraido: false, interrupciones: [], avisado: false }

let estado: Reloj = (() => {
  try {
    return { ...base, ...JSON.parse(localStorage.getItem(CLAVE) ?? '{}') }
  } catch {
    return base
  }
})()
const subs = new Set<() => void>()
const guardar = (r: Reloj) => {
  estado = r
  try {
    localStorage.setItem(CLAVE, JSON.stringify(r))
  } catch {
    /* sin almacenamiento */
  }
  subs.forEach((f) => f())
}

export const useReloj = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => estado,
  )

/** Re-render cada medio segundo mientras el reloj corre. */
export function useTic(activo: boolean) {
  const [, set] = useState(0)
  useEffect(() => {
    if (!activo) return
    const t = setInterval(() => set((x) => x + 1), 500)
    return () => clearInterval(t)
  }, [activo])
}

export const trabajadoMs = (r: Reloj) => r.acumuladoMs + (r.tramo ? Date.now() - new Date(r.tramo).getTime() : 0)

export const reloj = {
  config(c: Partial<Reloj>) {
    guardar({ ...estado, ...c })
  },
  empezar(c: Partial<Reloj> = {}) {
    const ahora = new Date().toISOString()
    guardar({ ...estado, ...c, activo: true, inicio: ahora, acumuladoMs: 0, tramo: ahora, distraido: false, interrupciones: [], avisado: false })
    if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission()
  },
  pausar() {
    if (!estado.tramo) return
    guardar({ ...estado, acumuladoMs: trabajadoMs(estado), tramo: null })
  },
  seguir() {
    guardar({ ...estado, tramo: new Date().toISOString(), distraido: false })
  },
  /** «Me distraje»: para el reloj y abre una interrupción con su motivo. */
  distraje(motivo: string) {
    const ahora = new Date().toISOString()
    guardar({ ...estado, acumuladoMs: trabajadoMs(estado), tramo: null, distraido: true, interrupciones: [...estado.interrupciones, { inicio: ahora, fin: null, motivo }] })
  },
  volvi() {
    const ahora = new Date().toISOString()
    const ints = estado.interrupciones.map((x, i, a) => (i === a.length - 1 && !x.fin ? { ...x, fin: ahora } : x))
    guardar({ ...estado, interrupciones: ints, tramo: ahora, distraido: false })
  },
  avisado() {
    guardar({ ...estado, avisado: true })
  },
  descartar() {
    guardar({ ...base, modo: estado.modo, objetivoMin: estado.objetivoMin, tipo: estado.tipo })
  },
}

export const MOTIVOS = ['Celular', 'Redes', 'Mensajes', 'Persona', 'Hambre / cuerpo', 'Pensamiento', 'Otra tarea']

/** Un aviso sonoro corto (sin archivos de audio). */
export function campana() {
  try {
    const ctx = new AudioContext()
    ;[0, 0.18, 0.36].forEach((t, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = [660, 880, 990][i]
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t)
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.4)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + t)
      o.stop(ctx.currentTime + t + 0.45)
    })
  } catch {
    /* sin audio */
  }
}

export const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}
