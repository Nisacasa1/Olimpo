// Calcula de una vez lo que necesitan Hoy y el Diagnóstico.
import { useMemo } from 'react'
import { diasHabiles } from '../components/Periodo'
import { diagnosticar } from './diagnostico'
import { mesISO } from './format'
import { embudoLlamadas, enRango, ltv, ventas, type Rango } from './metricas'
import { useAjustes, useTabla } from './store'

export function useResumen(rango: Rango) {
  const llamadas = useTabla('llamadas')
  const reuniones = useTabla('reuniones')
  const clientes = useTabla('clientes')
  const movs = useTabla('movimientos')
  const ajustes = useAjustes()

  return useMemo(() => {
    const e = embudoLlamadas(llamadas.filter((l) => enRango(l.fecha, rango)))
    const v = ventas(reuniones.filter((r) => enRango(r.fecha, rango)))
    const l = ltv(clientes, movs, ajustes)
    const mes = mesISO()
    const facturadoMes = movs.filter((m) => m.tipo === 'ingreso' && m.ambito === 'negocio' && m.fecha.startsWith(mes)).reduce((a, m) => a + m.monto, 0)
    const dh = diasHabiles(rango, ajustes.dias_habiles_semana)
    const d = diagnosticar({
      e,
      v,
      ltv: l,
      trm: ajustes.trm,
      diasHabiles: dh,
      metaLlamadasDia: ajustes.meta_llamadas_dia,
      facturadoMes,
      metaMensual: ajustes.meta_mensual,
    })
    return { e, v, l, facturadoMes, dh, d }
  }, [llamadas, reuniones, clientes, movs, ajustes, rango])
}
