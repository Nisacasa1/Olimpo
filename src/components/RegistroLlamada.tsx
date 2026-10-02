import { addDays, format } from 'date-fns'
import { useEffect, useState } from 'react'
import { RESULTADOS } from '../lib/doctrina'
import { hoyISO } from '../lib/format'
import { actualizar, avisar, insertar, useAjustes } from '../lib/store'
import type { Lead, ResultadoLlamada } from '../lib/types'
import { Area, Btn, Campo, Check, cx, Input } from './ui'

const tonoBtn: Record<string, string> = {
  faint: 'border-line-2 hover:border-faint',
  muted: 'border-line-2 hover:border-faint',
  amber: 'border-amber/30 hover:bg-amber-soft',
  blue: 'border-blue/30 hover:bg-blue-soft',
  violet: 'border-violet/30 hover:bg-violet/10',
  red: 'border-red/30 hover:bg-red-soft',
  green: 'border-green/40 bg-green-soft hover:bg-green/20',
}
const tonoTxt: Record<string, string> = {
  faint: 'text-muted',
  muted: 'text-muted',
  amber: 'text-amber',
  blue: 'text-blue-2',
  violet: 'text-violet',
  red: 'text-red',
  green: 'text-green',
}

const RAPIDOS: ResultadoLlamada[] = ['no_contesto', 'numero_equivocado', 'portero_bloquea']

/**
 * Registrar un intento: los resultados que no piden nada más se guardan con un
 * toque; los que sí (callback, cita, decisor) abren su formulario corto.
 */
export function RegistroLlamada({ lead, onListo, atajos = false }: { lead: Lead; onListo: () => void; atajos?: boolean }) {
  const ajustes = useAjustes()
  const [sel, setSel] = useState<ResultadoLlamada | null>(null)
  const [resono, setResono] = useState<boolean | null>(null)
  const [objecion, setObjecion] = useState('')
  const [nota, setNota] = useState('')
  const [callback, setCallback] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const [callbackHora, setCallbackHora] = useState('')
  const [citaFecha, setCitaFecha] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const [citaHora, setCitaHora] = useState('10:00')
  const [doctor, setDoctor] = useState(lead.doctor)
  const [cel, setCel] = useState(lead.cel_doctor)
  const [recep, setRecep] = useState(lead.recepcionista)
  const [email, setEmail] = useState(lead.email)

  useEffect(() => {
    setSel(null)
    setResono(null)
    setObjecion('')
    setNota('')
    setDoctor(lead.doctor)
    setCel(lead.cel_doctor)
    setRecep(lead.recepcionista)
    setEmail(lead.email)
  }, [lead.id, lead.doctor, lead.cel_doctor, lead.recepcionista, lead.email])

  const guardar = (resultado: ResultadoLlamada) => {
    insertar('llamadas', {
      lead_id: lead.id,
      fecha: new Date().toISOString(),
      canal: 'llamada',
      resultado,
      resono: resultado === 'agendo_cita' ? true : ['hablo_con_doctor', 'no_interesado'].includes(resultado) ? resono : null,
      guion: ajustes.guion_activo,
      objecion: objecion.trim(),
      nota: nota.trim(),
    })
    const cambios: Partial<Lead> = { doctor, cel_doctor: cel, recepcionista: recep, email }
    if (resultado === 'volver_a_llamar') {
      cambios.callback = callback
      cambios.callback_hora = callbackHora
    } else {
      // Al llamar se borra el callback (Guía: «se borra la fecha, o se pone la nueva»).
      cambios.callback = null
      cambios.callback_hora = ''
    }
    if (resultado === 'no_interesado') cambios.estado = 'no_interesado'
    if (resultado === 'numero_equivocado') cambios.notas = [lead.notas, 'Número equivocado'].filter(Boolean).join(' · ')
    actualizar('leads', lead.id, cambios)

    if (resultado === 'agendo_cita') {
      insertar('reuniones', {
        lead_id: lead.id,
        nombre: lead.clinica,
        fecha: new Date(`${citaFecha}T${citaHora || '10:00'}`).toISOString(),
        agendada_el: hoyISO(),
        fuente: 'Llamada en frío',
        estado: 'agendada',
        resultado: null,
        oferta: '',
        monto: null,
        duracion_min: null,
        grabacion: '',
        emociones: '',
        objecion: '',
        conclusion: '',
        notas: nota.trim(),
      })
      avisar('🎯 Cita agendada. Quedó en Ventas.', 'ok')
    }
    onListo()
  }

  const elegir = (r: ResultadoLlamada) => {
    if (RAPIDOS.includes(r)) return guardar(r)
    setSel(r)
  }

  useEffect(() => {
    if (!atajos) return
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return
      const n = Number(e.key)
      if (n >= 1 && n <= 7 && !sel) elegir(RESULTADOS[n - 1].clave)
      if (e.key === 'Escape') setSel(null)
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  })

  if (!sel)
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {RESULTADOS.map((r, i) => (
          <button
            key={r.clave}
            onClick={() => elegir(r.clave)}
            className={cx(
              'pop group relative flex min-h-[68px] flex-col items-start justify-between rounded-2xl border bg-surface-2/60 p-3 text-left transition',
              tonoBtn[r.tono],
              r.clave === 'agendo_cita' && 'col-span-2 sm:col-span-1',
            )}
            title={r.explica}
          >
            <span className={cx('text-sm font-semibold', tonoTxt[r.tono])}>{r.nombre}</span>
            <span className="text-[10.5px] leading-tight text-faint">
              {atajos && <kbd className="mr-1 rounded border border-line-2 px-1 font-mono">{i + 1}</kbd>}
              {RAPIDOS.includes(r.clave) ? 'un toque' : r.corto === 'Cita' ? 'pide fecha' : 'pide detalle'}
            </span>
          </button>
        ))}
      </div>
    )

  const r = RESULTADOS.find((x) => x.clave === sel)!
  const esDecisor = r.decisor
  return (
    <div className="rise space-y-4 rounded-2xl border border-line-2 bg-surface-2/40 p-4">
      <div className="flex items-center justify-between">
        <div className={cx('text-base font-semibold', tonoTxt[r.tono])}>{r.nombre}</div>
        <button onClick={() => setSel(null)} className="text-xs text-muted hover:text-text">
          cambiar
        </button>
      </div>

      {sel === 'volver_a_llamar' && (
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Volver a llamar el">
            <Input type="date" value={callback} onChange={(e) => setCallback(e.target.value)} />
          </Campo>
          <Campo etiqueta="Hora (si la dieron)">
            <Input type="time" value={callbackHora} onChange={(e) => setCallbackHora(e.target.value)} />
          </Campo>
        </div>
      )}

      {sel === 'agendo_cita' && (
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Videollamada el" ayuda="Máximo 3 días: «3 o más es demasiado lejos»">
            <Input type="date" value={citaFecha} onChange={(e) => setCitaFecha(e.target.value)} />
          </Campo>
          <Campo etiqueta="Hora">
            <Input type="time" value={citaHora} onChange={(e) => setCitaHora(e.target.value)} />
          </Campo>
        </div>
      )}

      {esDecisor && sel !== 'agendo_cita' && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted">¿Le resonó el pitch?</span>
          <Check checked={resono === true} onChange={(v) => setResono(v ? true : null)}>
            Sí
          </Check>
          <Check checked={resono === false} onChange={(v) => setResono(v ? false : null)}>
            No
          </Check>
        </div>
      )}

      {(esDecisor || sel === 'volver_a_llamar') && (
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Doctor">
            <Input value={doctor} onChange={(e) => setDoctor(e.target.value)} placeholder="Nombre del doctor" />
          </Campo>
          <Campo etiqueta="Cel. doctor">
            <Input value={cel} onChange={(e) => setCel(e.target.value)} placeholder="El directo" />
          </Campo>
          <Campo etiqueta="Recepcionista">
            <Input value={recep} onChange={(e) => setRecep(e.target.value)} />
          </Campo>
          <Campo etiqueta="Email">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </Campo>
        </div>
      )}

      {esDecisor && sel !== 'agendo_cita' && (
        <Campo etiqueta="Objeción principal">
          <Input value={objecion} onChange={(e) => setObjecion(e.target.value)} placeholder="Ej: ya tengo quien me maneje redes" />
        </Campo>
      )}

      <Campo etiqueta="Nota">
        <Area value={nota} onChange={(e) => setNota(e.target.value)} rows={2} />
      </Campo>

      <div className="flex justify-end gap-2">
        <Btn variante="fantasma" onClick={() => setSel(null)}>
          Atrás
        </Btn>
        <Btn variante="primario" onClick={() => guardar(sel)}>
          Guardar intento
        </Btn>
      </div>
    </div>
  )
}
