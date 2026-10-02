// Importa los Excel de leads de Olimpo. Reconoce los dos formatos que existen:
//  · el de Medellín / PLANTILLA: Clínica | Teléfono | Prioridad | … | 3 × (Fecha, Resultado) | Callback | Notas
//  · el de Pasto / Definitivo (inglés, del template de Charlie): Business | Owner Name | Phone | …
// Pestañas: Prospects → activo · Not Interested → no_interesado · Fuera de tramo → fuera_de_tramo.

import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { telNorm } from './format'
import type { EstadoLead, Lead, Llamada, Prioridad, ResultadoLlamada } from './types'

const norm = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()

const ALIAS: Record<keyof Pick<Lead, 'clinica' | 'telefono' | 'prioridad' | 'resenas' | 'rating' | 'categoria' | 'direccion' | 'ciudad' | 'recepcionista' | 'doctor' | 'cel_doctor' | 'email' | 'callback' | 'notas' | 'zona'>, string[]> = {
  clinica: ['clinica', 'business', 'negocio'],
  telefono: ['telefono', 'phone', 'phone number'],
  prioridad: ['prioridad'],
  resenas: ['resenas', 'reviews'],
  rating: ['rating'],
  categoria: ['categoria', 'category'],
  direccion: ['direccion', 'address'],
  ciudad: ['ciudad', 'city'],
  recepcionista: ['recepcionista', 'gatekeeper name'],
  doctor: ['doctor', 'owner name', 'owners full name'],
  cel_doctor: ['cel doctor', 'owner phone'],
  email: ['email', 'owners email'],
  callback: ['callback'],
  notas: ['notas', 'notes', 'notes hover n tag'],
  zona: ['busqueda', 'barrio', 'zona'],
}

const RESULTADO_TXT: Record<string, ResultadoLlamada> = {
  'no contesto': 'no_contesto',
  'numero equivocado': 'numero_equivocado',
  'portero bloquea': 'portero_bloquea',
  'volver a llamar': 'volver_a_llamar',
  'hablo con el doctor': 'hablo_con_doctor',
  'no interesado': 'no_interesado',
  'agendo cita': 'agendo_cita',
}

const num = (v: unknown) => {
  if (v == null || v === '') return null
  const n = Number(String(v).replace(/[()\s]/g, '').replace(',', '.'))
  return isFinite(n) ? n : null
}

const fechaISO = (v: unknown): string | null => {
  if (v == null || v === '') return null
  if (v instanceof Date) return format(v, 'yyyy-MM-dd')
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  const s = String(v).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/)
  if (m) {
    const y = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : String(new Date().getFullYear())
    return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  }
  return null
}

const prioridadPorResenas = (r: number | null): Prioridad => (r == null || r === 0 ? 'D' : r >= 20 ? 'A' : r >= 5 ? 'B' : 'C')

export interface Previa {
  leads: Lead[]
  llamadas: Llamada[]
  duplicados: number
  porPestana: Record<string, number>
}

export async function leerExcel(file: File, existentes: Lead[], ciudadPorDefecto: string): Promise<Previa> {
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true })
  const vistos = new Set(existentes.map((l) => telNorm(l.telefono)).filter(Boolean))
  const leads: Lead[] = []
  const llamadas: Llamada[] = []
  let duplicados = 0
  const porPestana: Record<string, number> = {}

  for (const nombre of wb.SheetNames) {
    const n = norm(nombre)
    const estado: EstadoLead | null = n.startsWith('prospect') ? 'activo' : n.startsWith('not interested') || n.startsWith('no interesado') ? 'no_interesado' : n.startsWith('fuera de tramo') ? 'fuera_de_tramo' : null
    if (!estado) continue

    const filas = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[nombre], { header: 1, raw: true, defval: null })
    // La fila de encabezados es la que más columnas reconocidas tiene: la hoja de
    // Medellín trae arriba una fila de grupos (CLÍNICA | CONTACTO | INTENTO 1…).
    const conocidas = new Set(Object.values(ALIAS).flat())
    let iHead = -1,
      mejor = 2
    filas.slice(0, 15).forEach((f, i) => {
      const n = f.filter((c) => conocidas.has(norm(c))).length
      if (n > mejor) {
        mejor = n
        iHead = i
      }
    })
    if (iHead < 0) continue
    const head = filas[iHead].map(norm)
    const col = (k: keyof typeof ALIAS) => head.findIndex((h) => ALIAS[k].includes(h))
    const cols = Object.fromEntries((Object.keys(ALIAS) as (keyof typeof ALIAS)[]).map((k) => [k, col(k)])) as Record<keyof typeof ALIAS, number>
    // Pares (Fecha, Resultado) de los intentos — formato Medellín
    const pares: [number, number][] = []
    head.forEach((h, i) => {
      if ((h === 'fecha' || h === 'fecha llamada') && head[i + 1] === 'resultado') pares.push([i, i + 1])
      if (h === 'fecha llamada' && head[i + 2] === 'resultado') pares.push([i, i + 2])
    })

    let cuenta = 0
    for (const f of filas.slice(iHead + 1)) {
      const v = (k: keyof typeof ALIAS) => (cols[k] >= 0 ? f[cols[k]] : null)
      const clinica = String(v('clinica') ?? '').trim()
      if (!clinica || norm(clinica).startsWith('prioridad') || norm(clinica).startsWith('se llama')) continue
      const tel = String(v('telefono') ?? '').trim()
      const t = telNorm(tel)
      if (t && vistos.has(t)) {
        duplicados++
        continue
      }
      if (t) vistos.add(t)
      const resenas = num(v('resenas'))
      const p = String(v('prioridad') ?? '').trim().toUpperCase()
      const id = crypto.randomUUID()
      const lead: Lead = {
        id,
        created_at: new Date().toISOString(),
        clinica,
        telefono: tel,
        prioridad: (['A', 'B', 'C', 'D'].includes(p) ? p : prioridadPorResenas(resenas)) as Prioridad,
        resenas,
        rating: num(v('rating')),
        categoria: String(v('categoria') ?? ''),
        direccion: String(v('direccion') ?? ''),
        ciudad: String(v('ciudad') ?? '').trim() || ciudadPorDefecto,
        zona: String(v('zona') ?? ''),
        recepcionista: String(v('recepcionista') ?? ''),
        doctor: String(v('doctor') ?? ''),
        cel_doctor: String(v('cel_doctor') ?? ''),
        email: String(v('email') ?? ''),
        estado,
        callback: fechaISO(v('callback')),
        callback_hora: '',
        notas: String(v('notas') ?? ''),
        fuente: file.name,
      }
      leads.push(lead)
      cuenta++

      for (const [iF, iR] of pares) {
        const fecha = fechaISO(f[iF])
        const res = RESULTADO_TXT[norm(f[iR])]
        if (!fecha || !res) continue
        llamadas.push({
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          lead_id: id,
          fecha: `${fecha}T12:00:00.000Z`,
          canal: 'llamada',
          resultado: res,
          resono: res === 'agendo_cita' ? true : null,
          guion: '',
          objecion: '',
          nota: 'importado del Excel',
        })
      }
    }
    porPestana[nombre] = cuenta
  }
  return { leads, llamadas, duplicados, porPestana }
}

export function ciudadDesdeArchivo(nombre: string) {
  const m = nombre.replace(/\.xlsx?$/i, '').match(/leads\s+(.+)$/i)
  return m ? m[1].trim() : ''
}

/** Exporta cualquier lista de objetos a .xlsx */
export function exportarExcel(nombre: string, hojas: Record<string, object[]>) {
  const wb = XLSX.utils.book_new()
  for (const [h, filas] of Object.entries(hojas)) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas), h.slice(0, 31))
  XLSX.writeFile(wb, nombre)
}
