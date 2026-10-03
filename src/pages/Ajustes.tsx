import { CloudUpload, Download, HardDrive, Cloud, Upload } from 'lucide-react'
import { useRef } from 'react'
import { Recordatorios } from '../components/Recordatorios'
import { Btn, Campo, Card, CardHead, Input, Num, Pagina } from '../components/ui'
import { fmt, hoyISO } from '../lib/format'
import { ltvEstimado } from '../lib/metricas'
import { avisar, backend, guardarAjustes, reemplazar, todo, useAjustes } from '../lib/store'
import { supabase } from '../lib/supabase'
import { TABLAS, type Tabla, type Tablas } from '../lib/types'

export default function AjustesPage() {
  const a = useAjustes()
  const ref = useRef<HTMLInputElement>(null)

  const exportar = () => {
    const blob = new Blob([JSON.stringify({ version: 1, fecha: new Date().toISOString(), datos: todo() }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const el = document.createElement('a')
    el.href = url
    el.download = `olimpo-respaldo-${hoyISO()}.json`
    el.click()
    URL.revokeObjectURL(url)
  }

  const importar = async (f: File) => {
    try {
      const j = JSON.parse(await f.text()) as { datos: Partial<Record<Tabla, unknown[]>> }
      if (!confirm('Esto REEMPLAZA todos los datos actuales por los del respaldo. ¿Seguir?')) return
      for (const t of TABLAS) if (j.datos[t]) reemplazar(t, j.datos[t] as Tablas[typeof t][])
      avisar('Respaldo restaurado', 'ok')
    } catch {
      avisar('El archivo no es un respaldo válido')
    }
  }

  // Datos que quedaron en el navegador antes de conectar la nube
  const locales = TABLAS.reduce((n, t) => {
    try {
      return n + (JSON.parse(localStorage.getItem(`imperium-os:${t}`) ?? '[]') as unknown[]).length
    } catch {
      return n
    }
  }, 0)

  const subirLocales = () => {
    if (!confirm(`Subir ${locales} registros de este navegador a la nube?`)) return
    for (const t of TABLAS) {
      const filas = JSON.parse(localStorage.getItem(`imperium-os:${t}`) ?? '[]') as Tablas[typeof t][]
      if (!filas.length) continue
      const ids = new Set(todo()[t].map((r) => r.id))
      reemplazar(t, [...todo()[t], ...filas.filter((f) => !ids.has(f.id))] as Tablas[typeof t][])
    }
    avisar('Datos locales subidos. Ya puedes borrarlos del navegador.', 'ok')
  }

  return (
    <Pagina titulo="Ajustes" sub="Los supuestos que usan las calculadoras y el diagnóstico.">
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHead titulo="Tu agencia y tu oferta" />
          <div className="grid grid-cols-2 gap-3 px-5 pb-5">
            <Campo etiqueta="Nombre de la agencia" className="col-span-2">
              <Input value={a.agencia} onChange={(e) => guardarAjustes({ agencia: e.target.value })} />
            </Campo>
            <Campo etiqueta="Meta mensual (COP)">
              <Num value={a.meta_mensual} onChange={(n) => guardarAjustes({ meta_mensual: n ?? 0 })} />
            </Campo>
            <Campo etiqueta="TRM (pesos por dólar)" ayuda="Para comparar con los pisos en USD">
              <Num value={a.trm} onChange={(n) => guardarAjustes({ trm: n ?? 4000 })} />
            </Campo>
            <Campo etiqueta="Setup fee">
              <Num value={a.precio_setup} onChange={(n) => guardarAjustes({ precio_setup: n ?? 0 })} />
            </Campo>
            <Campo etiqueta="Precio por paciente agendado">
              <Num value={a.precio_por_paciente} onChange={(n) => guardarAjustes({ precio_por_paciente: n ?? 0 })} />
            </Campo>
            <Campo etiqueta="Pacientes por cliente al mes (estimado)">
              <Num value={a.pacientes_por_cliente_mes} onChange={(n) => guardarAjustes({ pacientes_por_cliente_mes: n ?? 0 })} />
            </Campo>
            <Campo etiqueta="Retención estimada (meses)">
              <Num value={a.retencion_meses} onChange={(n) => guardarAjustes({ retencion_meses: n ?? 1 })} />
            </Campo>
            <div className="col-span-2 rounded-xl bg-surface-2/60 p-3 text-sm text-muted">
              LTV estimado: <b className="num text-text">{fmt.cop(ltvEstimado(a))}</b> · mínimo del Big 4 ≈ {fmt.cop(3000 * a.trm)}
            </div>
          </div>
        </Card>

        <Card>
          <CardHead titulo="Pauta y ritmo" />
          <div className="grid grid-cols-2 gap-3 px-5 pb-5">
            <Campo etiqueta="Meta de llamadas en frío por día" ayuda="Archivado: solo cuenta si vuelves a llamar">
              <Num value={a.meta_llamadas_dia} onChange={(n) => guardarAjustes({ meta_llamadas_dia: n ?? 0 })} />
            </Campo>
            <Campo etiqueta="Días hábiles por semana">
              <Num value={a.dias_habiles_semana} onChange={(n) => guardarAjustes({ dias_habiles_semana: Math.min(7, Math.max(1, n ?? 5)) })} />
            </Campo>
            <Campo etiqueta="Presupuesto de pauta por día" ayuda="Tu pauta propia, en COP">
              <Num value={a.presupuesto_diario} onChange={(n) => guardarAjustes({ presupuesto_diario: n ?? 0 })} />
            </Campo>
            <Campo etiqueta="CPL objetivo (KPI1)" ayuda="En COP. Los USD 25 del curso no transfieren">
              <Num value={a.cpl_objetivo} onChange={(n) => guardarAjustes({ cpl_objetivo: n ?? 0 })} />
            </Campo>
            <Campo etiqueta="Costo por cita objetivo (KPI2)">
              <Num value={a.costo_cita_objetivo} onChange={(n) => guardarAjustes({ costo_cita_objetivo: n ?? 0 })} />
            </Campo>
          </div>
        </Card>

        <Card>
          <CardHead titulo="Dónde viven tus datos" icono={backend === 'local' ? <HardDrive size={15} /> : <Cloud size={15} className="text-green" />} />
          <div className="space-y-3 px-5 pb-5 text-sm text-muted">
            {backend === 'local' ? (
              <>
                <p>
                  <b className="text-text">Modo local:</b> todo se guarda en este navegador. Funciona ya, pero no se ve desde el celular y se pierde si borras los datos del navegador. <b className="text-text">Descarga un respaldo seguido.</b>
                </p>
                <p>Para pasar a la nube hay que crear el proyecto de Supabase (gratis) y poner sus dos claves en el archivo <code>.env</code>. Los pasos están en el README.</p>
              </>
            ) : (
              <>
                <p>
                  <b className="text-text">En la nube</b> (Supabase). Lo que registras desde el celular aparece en el PC.
                </p>
                <Btn chico variante="fantasma" onClick={() => void supabase?.auth.signOut()}>
                  Cerrar sesión
                </Btn>
                {locales > 0 && (
                  <Btn chico onClick={subirLocales}>
                    <CloudUpload size={14} /> Subir {locales} registros que quedaron en este navegador
                  </Btn>
                )}
              </>
            )}
          </div>
        </Card>

        <Recordatorios />

        <Card>
          <CardHead titulo="Respaldo" />
          <div className="flex flex-wrap gap-2 px-5 pb-5">
            <Btn onClick={exportar}>
              <Download size={15} /> Descargar respaldo
            </Btn>
            <input ref={ref} type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && void importar(e.target.files[0])} />
            <Btn variante="fantasma" onClick={() => ref.current?.click()}>
              <Upload size={15} /> Restaurar respaldo
            </Btn>
          </div>
        </Card>
      </div>
    </Pagina>
  )
}
