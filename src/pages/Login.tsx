import { useState } from 'react'
import { Btn, Card, Input, Logo } from '../components/ui'
import { supabase } from '../lib/supabase'

// Entrar con contraseña no gasta correos: el servidor de correo gratis de Supabase
// solo manda unos pocos por hora, y el enlace queda como respaldo.
const traducir = (m: string) =>
  /rate limit/i.test(m)
    ? 'Supabase ya mandó el máximo de correos de esta hora. Entra con contraseña o espera una hora.'
    : /invalid login/i.test(m)
      ? 'Correo o contraseña incorrectos.'
      : /not confirmed/i.test(m)
        ? 'El correo no está confirmado. Crea el usuario en Supabase con «Auto Confirm User».'
        : m

export default function Login() {
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [modo, setModo] = useState<'clave' | 'enlace'>('clave')
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    const { error } =
      modo === 'clave'
        ? await supabase!.auth.signInWithPassword({ email, password: clave })
        : await supabase!.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
    setCargando(false)
    if (error) setError(traducir(error.message))
    else if (modo === 'enlace') setEnviado(true)
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <Card className="rise w-full max-w-sm p-7">
        <div className="mb-6 flex items-center gap-2.5">
          <Logo className="h-11" />
          <div className="font-serif text-3xl">Olimpo</div>
        </div>
        {enviado ? (
          <p className="text-sm text-muted">
            Te mandé un enlace a <b className="text-text">{email}</b>. Ábrelo en este mismo dispositivo para entrar.
          </p>
        ) : (
          <form onSubmit={entrar} className="space-y-3">
            <Input type="email" required autoComplete="email" placeholder="tu correo" value={email} onChange={(e) => setEmail(e.target.value)} />
            {modo === 'clave' && <Input type="password" required autoComplete="current-password" placeholder="contraseña" value={clave} onChange={(e) => setClave(e.target.value)} />}
            <Btn variante="primario" className="w-full" type="submit" disabled={cargando}>
              {modo === 'clave' ? 'Entrar' : 'Enviarme el enlace'}
            </Btn>
            {error && <p className="text-xs text-red">{error}</p>}
            <button
              type="button"
              className="w-full text-center text-xs text-faint hover:text-muted"
              onClick={() => {
                setModo(modo === 'clave' ? 'enlace' : 'clave')
                setError('')
              }}
            >
              {modo === 'clave' ? 'Prefiero que me manden un enlace al correo' : 'Entrar con contraseña'}
            </button>
          </form>
        )}
      </Card>
    </div>
  )
}
