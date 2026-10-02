import { useState } from 'react'
import { Btn, Card, Input, Logo } from '../components/ui'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const { error } = await supabase!.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) setError(error.message)
    else setEnviado(true)
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
            <Input type="email" required placeholder="tu correo" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Btn variante="primario" className="w-full" type="submit">
              Enviarme el enlace
            </Btn>
            {error && <p className="text-xs text-red">{error}</p>}
          </form>
        )}
      </Card>
    </div>
  )
}
