import { format, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})
const copCorto = new Intl.NumberFormat('es-CO', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})
const entero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const dec = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 })

export const fmt = {
  cop: (n: number | null | undefined) => (n == null || !isFinite(n) ? '—' : cop.format(n)),
  copCorto: (n: number | null | undefined) =>
    n == null || !isFinite(n) ? '—' : `$${copCorto.format(n)}`,
  usd: (n: number | null | undefined) => (n == null || !isFinite(n) ? '—' : usd.format(n)),
  n: (n: number | null | undefined) => (n == null || !isFinite(n) ? '—' : entero.format(n)),
  dec: (n: number | null | undefined) => (n == null || !isFinite(n) ? '—' : dec.format(n)),
  pct: (n: number | null | undefined, d = 1) =>
    n == null || !isFinite(n) ? '—' : `${(n * 100).toFixed(d).replace('.', ',')}%`,
  fecha: (s: string | null | undefined, patron = "d MMM") => {
    if (!s) return '—'
    const d = parseISO(s)
    return isValid(d) ? format(d, patron, { locale: es }) : s
  },
  fechaLarga: (s: string | null | undefined) => fmt.fecha(s, "EEEE d 'de' MMMM"),
  hora: (s: string | null | undefined) => {
    if (!s) return ''
    const d = parseISO(s)
    return isValid(d) ? format(d, 'h:mm a', { locale: es }) : ''
  },
}

/** Divide sin reventar: null cuando el denominador es 0. */
export const tasa = (a: number, b: number) => (b > 0 ? a / b : null)

export const hoyISO = () => format(new Date(), 'yyyy-MM-dd')
export const mesISO = (d = new Date()) => format(d, 'yyyy-MM')

/** Normaliza un teléfono colombiano para comparar duplicados y abrir WhatsApp. */
export const telNorm = (t: string) => t.replace(/\D/g, '').replace(/^57(?=\d{10}$)/, '')

export const waLink = (t: string) => {
  const n = telNorm(t)
  return n.length === 10 ? `https://wa.me/57${n}` : null
}

/** Día local (YYYY-MM-DD) de una fecha ISO. Las horas se guardan en UTC: una
 *  llamada a las 8 p. m. en Colombia ya es el día siguiente en UTC. */
export const diaLocal = (iso: string) => {
  if (!iso) return ''
  if (iso.length <= 10) return iso
  const d = parseISO(iso)
  return isValid(d) ? format(d, 'yyyy-MM-dd') : iso.slice(0, 10)
}
