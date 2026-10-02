import { startOfMonth, endOfDay, startOfDay, subMonths, endOfMonth } from 'date-fns'
import { useMemo, useState } from 'react'
import { rangoUltimos, type Rango } from '../lib/metricas'
import { Segmento } from './ui'

export type ClavePeriodo = 'hoy' | '7' | '30' | 'mes' | 'mesPasado' | '90' | 'todo'

export function rangoDe(p: ClavePeriodo): Rango {
  const ahora = new Date()
  switch (p) {
    case 'hoy':
      return { desde: startOfDay(ahora), hasta: endOfDay(ahora) }
    case '7':
      return rangoUltimos(7)
    case '30':
      return rangoUltimos(30)
    case '90':
      return rangoUltimos(90)
    case 'mes':
      return { desde: startOfMonth(ahora), hasta: endOfDay(ahora) }
    case 'mesPasado': {
      const m = subMonths(ahora, 1)
      return { desde: startOfMonth(m), hasta: endOfMonth(m) }
    }
    case 'todo':
      return { desde: new Date(2020, 0, 1), hasta: endOfDay(ahora) }
  }
}

export function usePeriodo(inicial: ClavePeriodo = '30') {
  const [p, setP] = useState<ClavePeriodo>(inicial)
  const rango = useMemo(() => rangoDe(p), [p])
  return { p, setP, rango }
}

export function SelectorPeriodo({ valor, onChange, sinHoy }: { valor: ClavePeriodo; onChange: (p: ClavePeriodo) => void; sinHoy?: boolean }) {
  const ops: { valor: ClavePeriodo; etiqueta: string }[] = [
    { valor: 'hoy', etiqueta: 'Hoy' },
    { valor: '7', etiqueta: '7 días' },
    { valor: '30', etiqueta: '30 días' },
    { valor: 'mes', etiqueta: 'Este mes' },
    { valor: '90', etiqueta: '90 días' },
    { valor: 'todo', etiqueta: 'Todo' },
  ]
  return <Segmento valor={valor} onChange={onChange} opciones={sinHoy ? ops.slice(1) : ops} className="max-w-full overflow-x-auto" />
}

/** Días hábiles (lunes a sábado según ajustes) dentro de un rango, hasta hoy. */
export function diasHabiles(r: Rango, porSemana: number) {
  const fin = Math.min(r.hasta.getTime(), Date.now())
  let n = 0
  for (let d = new Date(r.desde); d.getTime() <= fin; d.setDate(d.getDate() + 1)) {
    const dia = d.getDay() // 0 domingo
    if (porSemana >= 7 || (dia !== 0 && (porSemana >= 6 || dia !== 6))) n++
  }
  return Math.max(1, n)
}
