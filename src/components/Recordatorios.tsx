import { addDays, parseISO } from 'date-fns'
import { BellRing, Smartphone } from 'lucide-react'
import { useState } from 'react'
import { calendario, descargarIcs, proximaHora, type Evento } from '../lib/ics'
import { useSemana2 } from '../lib/semana2'
import { Btn, Card, CardHead, Check, Input } from './ui'

/** Recordatorios para el calendario del celular + cómo instalar la app. */
export function Recordatorios() {
  const s2 = useSemana2()
  const [horas, setHoras] = useState({ am: '05:45', pm: '21:45', pauta: '08:00', semana: '17:00' })
  const [incluir, setIncluir] = useState({ am: true, pm: true, pauta: true, semana: true, revision: true })

  const generar = () => {
    const ev: Evento[] = []
    if (incluir.am) ev.push({ uid: 'lectura-am', titulo: '📖 Leer el documento (mañana)', descripcion: 'En voz alta, con imagen y emoción. Ábrelo en Olimpo → Mentalidad.', inicio: proximaHora(horas.am), regla: 'FREQ=DAILY', minutos: 20 })
    if (incluir.pm) ev.push({ uid: 'lectura-pm', titulo: '🌙 Leer el documento (noche)', descripcion: 'Antes de dormir. Marca la lectura en Olimpo.', inicio: proximaHora(horas.pm), regla: 'FREQ=DAILY', minutos: 15 })
    if (incluir.pauta) ev.push({ uid: 'pauta', titulo: '📊 Revisar la pauta', descripcion: 'La hoja cada mañana: importa o registra el día anterior y mira la calculadora. Días 0-3 no se toca nada.', inicio: proximaHora(horas.pauta), regla: 'FREQ=DAILY', minutos: 15 })
    if (incluir.semana) ev.push({ uid: 'semana', titulo: '🗓️ Revisión semanal', descripcion: 'Olimpo → Revisión semanal: qué funcionó, qué no, y una sola prioridad.', inicio: proximaHora(horas.semana, 5), regla: 'FREQ=WEEKLY;BYDAY=FR', minutos: 30 })
    if (incluir.revision && s2.revision) {
      const d = addDays(parseISO(s2.revision), 90)
      d.setHours(9, 0, 0, 0)
      ev.push({ uid: `revisionado-${s2.revision}`, titulo: '🔁 Re-visionado de las Semanas 1 y 2', descripcion: 'Cada 3 meses (módulo 1.3). Márcalo en Olimpo → Mentalidad → Ejercicios.', inicio: d, minutos: 120, alarmaMin: 0 })
    }
    descargarIcs('olimpo-recordatorios.ics', calendario(ev))
  }

  const fila = (k: keyof typeof incluir, t: string, hora?: keyof typeof horas) => (
    <div className="flex items-center justify-between gap-3">
      <Check checked={incluir[k]} onChange={(v) => setIncluir({ ...incluir, [k]: v })}>
        {t}
      </Check>
      {hora && <Input type="time" value={horas[hora]} onChange={(e) => setHoras({ ...horas, [hora]: e.target.value })} className="h-8 w-28 text-xs" />}
    </div>
  )

  return (
    <Card>
      <CardHead titulo="Recordatorios y app en el celular" icono={<BellRing size={15} />} />
      <div className="space-y-4 px-5 pb-5 text-sm">
        <p className="text-muted">Una web no puede avisarte sola con la app cerrada. Los recordatorios van a tu calendario, que sí suena siempre: descargas el archivo, lo abres en el celular y quedan con alarma.</p>
        <div className="space-y-2">
          {fila('am', 'Lectura de la mañana', 'am')}
          {fila('pm', 'Lectura de la noche', 'pm')}
          {fila('pauta', 'Revisar la pauta', 'pauta')}
          {fila('semana', 'Revisión semanal (viernes)', 'semana')}
          {fila('revision', 'Re-visionado trimestral')}
        </div>
        <Btn variante="primario" className="w-full" onClick={generar}>
          <BellRing size={15} /> Descargar recordatorios (.ics)
        </Btn>
        <div className="flex gap-3 rounded-xl bg-surface-2/60 p-3 text-xs text-muted">
          <Smartphone size={16} className="mt-0.5 shrink-0" />
          <div>
            <b className="text-text">Instalar Olimpo en el celular</b> (cuando esté publicada): en iPhone, Safari → Compartir → «Agregar a inicio». En Android, Chrome → menú ⋮ → «Instalar app». Queda con tu logo y abre a pantalla completa.
          </div>
        </div>
      </div>
    </Card>
  )
}
