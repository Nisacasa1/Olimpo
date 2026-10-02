# Imperium OS

La app de métricas de Imperium Academy para **Olimpo Acquisition**. Reemplaza las 18 hojas de Excel del programa con una sola app: se registra cada cosa una vez y todas las tasas, los Big 4 y el cuello de botella se calculan solos.

| Pantalla | Reemplaza a |
|---|---|
| **Hoy** | — el tablero del día: outreach, callbacks, citas, Big 4 y cuello de botella |
| **Llamar** | la hoja de Leads (cola con la regla de 3 intentos y los 7 resultados) |
| **Prospectos** | Cold Calling Leads · Example CRM · 100 Dial Challenge · importa tus Excel de leads |
| **Ventas** | Sales Performance Tracker · No Show & Bad Calls |
| **Clientes** | — cobro semanal por paciente agendado, LTV real |
| **Outreach** | Cold Call Metrics · Example Agency Metrics · 60 Day Research · 90 Day Attack Plan |
| **Pauta** | Ads & Funnel Tracking Sheet (28 columnas) + la escalera de 15 diagnósticos |
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

## Lo que viene

- **Meta Ads automático**: una función programada en Supabase que cada mañana lee la API de Meta y escribe una fila por cuenta y día en `pauta` (el índice `pauta_meta_unica` ya está listo).
- **GoHighLevel**: citas y asistencia de los pacientes de cada clínica.
- **Capa de conocimiento**: conectar cada cuello de botella con su módulo de Imperium.

## Dónde vive la doctrina

`src/lib/doctrina.ts` tiene todos los umbrales con su fuente. Rojo solo donde Charlie fija un mínimo (ABR 1%, SUR 60%, SCR 20%, LTV USD 3.000); donde solo da benchmark, ámbar. Ningún umbral se inventa.
