import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

/** public/privado/ solo existe para el servidor de desarrollo: nunca sale en un build. */
const sinPrivado = (): Plugin => ({
  name: 'sin-privado',
  apply: 'build',
  closeBundle() {
    rmSync(resolve(__dirname, 'dist/privado'), { recursive: true, force: true })
  },
})

export default defineConfig({
  plugins: [react(), tailwindcss(), sinPrivado()],
})
