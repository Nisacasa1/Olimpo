// Recordatorios como archivo .ics: el calendario del celular los dispara aunque la app
// esté cerrada (una web no puede avisar sola sin un servidor de push).

const pad = (n: number) => String(n).padStart(2, '0')
const local = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
const utc = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

export interface Evento {
  uid: string
  titulo: string
  descripcion?: string
  inicio: Date
  minutos?: number
  regla?: string // RRULE, p. ej. FREQ=DAILY
  alarmaMin?: number // minutos antes (0 = a la hora)
}

const VTIMEZONE = ['BEGIN:VTIMEZONE', 'TZID:America/Bogota', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:-0500', 'TZOFFSETTO:-0500', 'TZNAME:COT', 'END:STANDARD', 'END:VTIMEZONE']

export function calendario(eventos: Evento[]) {
  const ahora = utc(new Date())
  const lineas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Olimpo//Recordatorios//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Olimpo', ...VTIMEZONE]
  for (const e of eventos) {
    const fin = new Date(e.inicio.getTime() + (e.minutos ?? 15) * 60_000)
    lineas.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}@olimpo`,
      `DTSTAMP:${ahora}`,
      `DTSTART;TZID=America/Bogota:${local(e.inicio)}`,
      `DTEND;TZID=America/Bogota:${local(fin)}`,
      `SUMMARY:${esc(e.titulo)}`,
    )
    if (e.descripcion) lineas.push(`DESCRIPTION:${esc(e.descripcion)}`)
    if (e.regla) lineas.push(`RRULE:${e.regla}`)
    lineas.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.titulo)}`, `TRIGGER:-PT${e.alarmaMin ?? 0}M`, 'END:VALARM', 'END:VEVENT')
  }
  lineas.push('END:VCALENDAR')
  return lineas.join('\r\n')
}

export function descargarIcs(nombre: string, contenido: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

/** Próxima ocurrencia de una hora (HH:MM) desde hoy, en hora local. */
export function proximaHora(hhmm: string, diaSemana?: number) {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  if (diaSemana != null) {
    const diff = (diaSemana - d.getDay() + 7) % 7
    d.setDate(d.getDate() + diff)
  }
  return d
}
