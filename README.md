# Olimpo

La app de métricas de Imperium Academy para **Olimpo Acquisition**. Reemplaza las 18 hojas de Excel del programa con una sola app: se registra cada cosa una vez y todas las tasas, los Big 4 y el cuello de botella se calculan solos.

| Pantalla | Reemplaza a |
|---|---|
| **Hoy** | — el plan del día (qué hacer ahora, en orden), la proyección del mes, el cuello de botella y el ritual |
| **Foco** | HyperFocus: temporizador o contador, «me distraje» con motivo, las 3 prioridades de hoy y de mañana, y el cierre del día (Daily Planner de Imperium) |
| **Mentalidad** | toda la Semana 2: ritual diario, los 10 mandatos, el Banco de Sufrimiento, tu Self Transcendence Doc, los 8 módulos, los ejercicios y las 30 formas de resistencia |
| **Ads** | Ads & Funnel Tracking Sheet, por anuncio: plan de 30 días, calculadora por gasto, ganchos y audiencias, e importación del Excel de Meta Ads Manager |
| **Contenido** | Marca: pipeline de ideas por línea (marca personal · agencia · ads), ideación con 31 frameworks y generadores, piezas publicadas con métricas y las personas que escribieron por cada una |
| **War Map** | el Imperium War Map: el año en una pantalla, pintado solo por lo que hiciste, con objetivos del mes, las 5 reglas y los hitos de Imperium |
| **Proyección** | — a este ritmo, a cuánto llegas, y qué falta (clientes → llamadas → leads → pauta) |
| **Revisión semanal** | — se arma sola cada viernes; tú pones la reflexión y una sola prioridad |
| *Archivo · llamadas* | Llamar · Prospectos · Outreach (la llamada en frío, archivada con sus datos) |
| **Ventas** | Sales Performance Tracker · No Show & Bad Calls |
| **Clientes** | — cobro semanal por paciente agendado, LTV real |
| **Finanzas** | Imperium Academy Financial Tracker (4 hojas) + cofre de guerra |
| **Tiempo** | 100 Units of Time · Task Logging Sheet |
| **Cuello de botella** | el árbol de los Big 4 y la identificación de cuellos de botella (7.1, 7.2) |
| **Calculadoras** | Value of Your Cold Calls · aritmética cruda · SMMA Pricing Calculator · calculadora por gasto |
| **Bóveda** | Rebuttal Vault · Sales Q&A Vault |
| **Equipo** | VA Candidates List |

## Correr en el PC

```bash
npm install
npm run dev
```

Sin configurar nada, la app arranca en **modo local**: los datos viven en el navegador. Sirve para probar; para usarla de verdad (y desde el celular) hay que pasarla a la nube.

## Pasarla a la nube (una sola vez, ~15 minutos)

1. **Supabase** (base de datos, gratis): crea una cuenta en supabase.com → *New project*. Guarda la contraseña de la base en tu gestor de contraseñas.
2. En el proyecto: **SQL Editor → New query**, pega todo `supabase/schema.sql` y dale **Run**.
3. **Authentication → URL Configuration**: en *Site URL* pon la dirección donde vas a publicar la app (y `http://localhost:5173` para probar en el PC).
4. **Project Settings → API**: copia *Project URL* y la clave *anon public*. Crea un archivo `.env` en esta carpeta (copia `.env.example`) y pégalas ahí.
5. **Vercel** (publicación, gratis): sube esta carpeta a un repo privado de GitHub, impórtalo en vercel.com y agrega las dos mismas variables en *Settings → Environment Variables*.
6. Entra con tu correo: te llega un enlace y quedas adentro. Si tenías datos en modo local, en **Ajustes** aparece el botón para subirlos.

> La clave *anon* es pública por diseño (va dentro de la app); lo que protege los datos es el Row Level Security del esquema. **Nunca pongas la clave `service_role` en el `.env`.**

## La Semana 2 es contenido privado

El material de Imperium y tu documento **no viven en el código** (el código de una app publicada se puede descargar). Se generan en un archivo local que nunca va a git ni al deploy:

```bash
python scripts/generar-semana-2.py
```

Lee `privado/doctrina-semana-2.json` (los resúmenes de los módulos), tu PDF del Self Transcendence Doc y tus respuestas de `imperium/raw/`, y escribe `public/privado/semana-2.json`. La app lo carga sola: en modo local lo lee en cada arranque, y en la nube lo guarda una vez en tu base. Si un día actualizas el PDF, borra en Supabase las filas de `contenido` y `mentalidad` con id `documento` y vuelve a correr el script.

La biblioteca de ideación funciona igual: `node scripts/generar-ideacion.mjs` une `privado/ideacion-biblioteca.json` y `privado/ideacion-extra.json` en `public/privado/ideacion.json`.

**Atajo:** la tecla `N` (o el botón «+») captura una idea desde cualquier pantalla, también dictada.

## Lo que viene

- **Meta Ads automático**: una función programada en Supabase que cada mañana lee la API de Meta y escribe una fila por cuenta y día en `pauta` (el índice `pauta_meta_unica` ya está listo).
- **GoHighLevel**: citas y asistencia de los pacientes de cada clínica.
- **Capa de conocimiento**: conectar cada cuello de botella con su módulo de Imperium.

## Dónde vive la doctrina

`src/lib/doctrina.ts` tiene todos los umbrales con su fuente. Rojo solo donde Charlie fija un mínimo (ABR 1%, SUR 60%, SCR 20%, LTV USD 3.000); donde solo da benchmark, ámbar. Ningún umbral se inventa.
