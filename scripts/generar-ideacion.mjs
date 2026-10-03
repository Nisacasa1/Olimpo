// Arma el paquete PRIVADO de ideación (public/privado/ideacion.json):
//  · privado/ideacion-biblioteca.json — tus 20 frameworks de la app de Marca
//  · privado/ideacion-extra.json      — los de Imperium, los de pauta y los del vault, más los generadores
// Uso: node scripts/generar-ideacion.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const lee = (p) => JSON.parse(readFileSync(resolve(raiz, p), 'utf8'))
const biblioteca = lee('privado/ideacion-biblioteca.json').map((f) => ({ ...f, lineas: ['marca', 'agencia'] }))
const extra = lee('privado/ideacion-extra.json')
const salida = { ...extra, frameworks: [...biblioteca, ...extra.frameworks] }
mkdirSync(resolve(raiz, 'public/privado'), { recursive: true })
writeFileSync(resolve(raiz, 'public/privado/ideacion.json'), JSON.stringify(salida))
console.log('OK', salida.frameworks.length, 'frameworks')
