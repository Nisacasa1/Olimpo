import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

/** public/privado/ solo existe para el servidor de desarrollo: nunca sale en un build. */
const sinPrivado = (): Plugin => ({
  name: 'sin-privado',
  apply: 'build',
  closeBundle() {
    rmSync(resolve(__dirname, 'dist/privado'), { recursive: true, force: true })
    // Cada build le pone su propia versión al service worker: así el navegador detecta que
    // cambió, instala el nuevo y la app se recarga sola con el código publicado.
    const sw = resolve(__dirname, 'dist/sw.js')
    writeFileSync(sw, readFileSync(sw, 'utf8').replace('__VERSION__', Date.now().toString(36)))
  },
})

export default defineConfig({
  plugins: [react(), tailwindcss(), sinPrivado()],
})
