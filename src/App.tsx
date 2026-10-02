import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { Layout } from './components/Layout'
import { Avisos } from './components/ui'
import { cargar, useEstado } from './lib/store'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
const Hoy = lazy(() => import('./pages/Hoy'))
const Llamar = lazy(() => import('./pages/Llamar'))
const Prospectos = lazy(() => import('./pages/Prospectos'))
const Outreach = lazy(() => import('./pages/Outreach'))
const Ventas = lazy(() => import('./pages/Ventas'))
const Clientes = lazy(() => import('./pages/Clientes'))
const Pauta = lazy(() => import('./pages/Pauta'))
const Finanzas = lazy(() => import('./pages/Finanzas'))
const Tiempo = lazy(() => import('./pages/Tiempo'))
const Diagnostico = lazy(() => import('./pages/Diagnostico'))
const Calculadoras = lazy(() => import('./pages/Calculadoras'))
const Boveda = lazy(() => import('./pages/Boveda'))
const Equipo = lazy(() => import('./pages/Equipo'))
const AjustesPage = lazy(() => import('./pages/Ajustes'))

function Cargando({ texto = 'Cargando tus números…' }: { texto?: string }) {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="flex flex-col items-center gap-3 text-sm text-muted">
        <div className="size-8 animate-spin rounded-full border-2 border-line-2 border-t-blue" />
        {texto}
      </div>
    </div>
  )
}

function Aplicacion() {
  const { listo, error } = useEstado()
  useEffect(() => {
    void cargar()
  }, [])
  if (!listo) return <Cargando />
  return (
    <BrowserRouter>
      {error && (
        <div className="border-b border-red/30 bg-red-soft px-4 py-2 text-center text-xs text-red">
          No se pudo leer la nube: {error}. Revisa que corriste <code>supabase/schema.sql</code>.
        </div>
      )}
      <Layout>
        <Suspense fallback={<div className="p-10 text-sm text-faint">Cargando…</div>}>
        <Routes>
          <Route path="/" element={<Hoy />} />
          <Route path="/llamar" element={<Llamar />} />
          <Route path="/prospectos" element={<Prospectos />} />
          <Route path="/outreach" element={<Outreach />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/pauta" element={<Pauta />} />
          <Route path="/finanzas" element={<Finanzas />} />
          <Route path="/tiempo" element={<Tiempo />} />
          <Route path="/diagnostico" element={<Diagnostico />} />
          <Route path="/calculadoras" element={<Calculadoras />} />
          <Route path="/boveda" element={<Boveda />} />
          <Route path="/equipo" element={<Equipo />} />
          <Route path="/ajustes" element={<AjustesPage />} />
          <Route path="*" element={<Hoy />} />
        </Routes>
        </Suspense>
      </Layout>
      <Avisos />
    </BrowserRouter>
  )
}

export default function App() {
  const [sesion, setSesion] = useState<Session | null | undefined>(supabase ? undefined : null)

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => setSesion(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!supabase) return <Aplicacion />
  if (sesion === undefined) return <Cargando texto="Conectando…" />
  if (!sesion) return <Login />
  return <Aplicacion />
}
