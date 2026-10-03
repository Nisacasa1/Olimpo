import { Mic, MicOff, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ideaVacia } from '../pages/Contenido'
import { LINEAS } from '../lib/contenido'
import { avisar, insertar } from '../lib/store'
import type { Linea } from '../lib/types'
import { Area, Btn, Modal, Segmento } from './ui'

// Web Speech API (Chrome/Edge/Safari): dictar la idea en vez de escribirla
type Reconocedor = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; onresult: (e: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] }) => void; onend: () => void }
const Reconocimiento = (window as unknown as { SpeechRecognition?: new () => Reconocedor; webkitSpeechRecognition?: new () => Reconocedor }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => Reconocedor }).webkitSpeechRecognition

/** El botón «+» (o la tecla N): captura una idea desde cualquier pantalla, también con la voz. */
export function Captura() {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [linea, setLinea] = useState<Linea>('marca')
  const [escuchando, setEscuchando] = useState(false)
  const rec = useRef<Reconocedor | null>(null)

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable) return
      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setAbierto(true)
      }
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [])

  const dictar = () => {
    if (!Reconocimiento) return avisar('Este navegador no permite dictar. Prueba en Chrome.')
    if (escuchando) return rec.current?.stop()
    const r = new Reconocimiento()
    r.lang = 'es-CO'
    r.continuous = true
    r.interimResults = false
    r.onresult = (e) => {
      let nuevo = ''
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) nuevo += e.results[i][0].transcript
      if (nuevo) setTexto((t) => (t ? `${t} ${nuevo.trim()}` : nuevo.trim()))
    }
    r.onend = () => setEscuchando(false)
    rec.current = r
    r.start()
    setEscuchando(true)
  }

  const guardar = () => {
    const [titulo, ...resto] = texto.trim().split('\n')
    insertar('ideas', ideaVacia(linea, { titulo: titulo.slice(0, 140), notas: resto.join('\n') || (titulo.length > 140 ? titulo : ''), framework: 'captura rápida' }))
    avisar('Idea guardada en el pipeline', 'ok')
    rec.current?.stop()
    setTexto('')
    setAbierto(false)
  }

  return (
    <>
      <button onClick={() => setAbierto(true)} className="pop fixed right-5 bottom-24 z-40 grid size-12 place-items-center rounded-full bg-blue text-on-accent shadow-2xl md:bottom-6" title="Capturar una idea (N)">
        <Plus size={22} />
      </button>
      <Modal
        abierto={abierto}
        onCerrar={() => {
          rec.current?.stop()
          setAbierto(false)
        }}
        titulo="Capturar una idea"
        pie={
          <>
            <Btn variante="fantasma" className="mr-auto" onClick={dictar}>
              {escuchando ? <MicOff size={15} className="text-red" /> : <Mic size={15} />} {escuchando ? 'Parar' : 'Dictar'}
            </Btn>
            <Btn variante="primario" onClick={guardar} disabled={!texto.trim()}>
              Guardar
            </Btn>
          </>
        }
      >
        <div className="space-y-3">
          <Segmento valor={linea} onChange={setLinea} opciones={LINEAS.map((l) => ({ valor: l.k, etiqueta: l.n }))} />
          <Area autoFocus rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Lo que se te ocurrió. La primera línea es el título." onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter' && texto.trim() && guardar()} />
          {escuchando && <div className="text-xs text-red">● Escuchando…</div>}
        </div>
      </Modal>
    </>
  )
}
