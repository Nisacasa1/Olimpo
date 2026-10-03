// Importa la exportación de Meta Ads Manager (.xlsx o .csv) con desglose por día y por anuncio.
// En Ads Manager: Informes → Exportar → con «Desglose: Por tiempo · Día» y nivel Anuncio.
// Reconoce los encabezados en español y en inglés.

import * as XLSX from 'xlsx'
import type { Anuncio, PautaDia } from './types'

const norm = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const CAMPOS = {
  fecha: ['dia', 'day', 'inicio del informe', 'reporting starts', 'fecha'],
  campana: ['nombre de la campana', 'campaign name', 'campana'],
  conjunto: ['nombre del conjunto de anuncios', 'ad set name', 'conjunto de anuncios'],
  anuncio: ['nombre del anuncio', 'ad name', 'anuncio'],
  gasto: ['importe gastado', 'amount spent', 'gasto'],
  impresiones: ['impresiones', 'impressions'],
  alcance: ['alcance', 'reach'],
  clics: ['clics en el enlace', 'link clicks', 'clics (todos)', 'clicks (all)'],
  leads: ['clientes potenciales', 'leads', 'registros completados', 'complete registration'],
  citas: ['programaciones', 'schedules', 'citas programadas', 'schedule'],
} as const
type Campo = keyof typeof CAMPOS

function columna(head: string[], c: Campo) {
  // primero coincidencia exacta, después «empieza por»
  // En orden de prioridad de los alias: «Día» le gana a «Inicio del informe».
  for (const o of CAMPOS[c]) {
    const i = head.indexOf(o)
    if (i >= 0) return i
  }
  for (const o of CAMPOS[c]) {
    const i = head.findIndex((h) => h.startsWith(o))
    if (i >= 0) return i
  }
  return -1
}

const num = (v: unknown) => {
  if (v == null || v === '') return 0
  if (typeof v === 'number') return v
  const s = String(v).replace(/[^\d,.-]/g, '')
  // 1.234.567,89 o 1,234,567.89
  const n = s.includes(',') && s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  const r = Number(n)
  return isFinite(r) ? r : 0
}

const fecha = (v: unknown): string | null => {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    return d ? `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` : null
  }
  const s = String(v ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null
}

export interface PreviaMeta {
  filas: { fecha: string; campana: string; conjunto: string; anuncio: string; gasto: number; impresiones: number; alcance: number; clics: number; leads: number; citas: number }[]
  encontradas: Campo[]
  faltan: Campo[]
  desde: string
  hasta: string
}

export async function leerMeta(file: File): Promise<PreviaMeta> {
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const filas = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null })
  const iHead = filas.findIndex((f) => f.some((c) => ['nombre del anuncio', 'ad name', 'importe gastado (cop)', 'amount spent (cop)'].some((x) => norm(c).startsWith(x.replace(' (cop)', '')))))
  if (iHead < 0) throw new Error('No encontré los encabezados de Meta (Nombre del anuncio / Importe gastado).')
  const head = filas[iHead].map(norm)
  const cols = Object.fromEntries((Object.keys(CAMPOS) as Campo[]).map((c) => [c, columna(head, c)])) as Record<Campo, number>
  if (cols.fecha < 0) throw new Error('La exportación no trae la columna «Día». En Ads Manager usa Desglose → Por tiempo → Día.')
  const out: PreviaMeta['filas'] = []
  for (const f of filas.slice(iHead + 1)) {
    const d = fecha(f[cols.fecha])
    const nombre = cols.anuncio >= 0 ? String(f[cols.anuncio] ?? '').trim() : ''
    if (!d) continue
    const v = (c: Campo) => (cols[c] >= 0 ? num(f[cols[c]]) : 0)
    out.push({
      fecha: d,
      campana: cols.campana >= 0 ? String(f[cols.campana] ?? '') : '',
      conjunto: cols.conjunto >= 0 ? String(f[cols.conjunto] ?? '') : '',
      anuncio: nombre,
      gasto: v('gasto'),
      impresiones: v('impresiones'),
      alcance: v('alcance'),
      clics: v('clics'),
      leads: v('leads'),
      citas: v('citas'),
    })
  }
  const fechas = out.map((x) => x.fecha).sort()
  const encontradas = (Object.keys(CAMPOS) as Campo[]).filter((c) => cols[c] >= 0)
  return { filas: out, encontradas, faltan: (Object.keys(CAMPOS) as Campo[]).filter((c) => cols[c] < 0), desde: fechas[0] ?? '', hasta: fechas.at(-1) ?? '' }
}

/** Convierte la previa en anuncios nuevos + filas de pauta (reemplaza las de Meta del mismo anuncio y día). */
export function planDeImportacion(p: PreviaMeta, cuenta: string, anuncios: Anuncio[], pauta: PautaDia[]) {
  const nuevos: Partial<Anuncio>[] = []
  const porNombre = new Map(anuncios.filter((a) => a.cuenta === cuenta).map((a) => [norm(a.nombre), a.id]))
  const idDe = (r: PreviaMeta['filas'][number]) => {
    if (!r.anuncio) return null
    const k = norm(r.anuncio)
    if (!porNombre.has(k)) {
      const id = crypto.randomUUID()
      porNombre.set(k, id)
      const primera = p.filas.filter((x) => norm(x.anuncio) === k).map((x) => x.fecha).sort()[0]
      nuevos.push({ id, cuenta, campana: r.campana, conjunto: r.conjunto, audiencia: '', nombre: r.anuncio, tipo: 'video', gancho: '', angulo: '', lanzado: primera, estado: 'activo', notas: 'importado de Meta' })
    }
    return porNombre.get(k)!
  }
  const filas: Partial<PautaDia>[] = []
  const reemplazar: string[] = []
  for (const r of p.filas) {
    const anuncio_id = idDe(r)
    const viejo = pauta.find((x) => x.cuenta === cuenta && x.fecha === r.fecha && (x.anuncio_id ?? null) === anuncio_id && x.origen === 'meta')
    if (viejo) reemplazar.push(viejo.id)
    filas.push({ cuenta, anuncio_id, fecha: r.fecha, gasto: r.gasto, impresiones: r.impresiones, alcance: r.alcance, clics: r.clics, leads: r.leads, citas: r.citas, presentados: 0, cierres: 0, cash: 0, valor: 0, nota: '', origen: 'meta' })
  }
  return { nuevos, filas, reemplazar }
}
