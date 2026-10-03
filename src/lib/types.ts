// Modelo de datos de Olimpo.
// Cada tipo es una tabla. Los nombres de campo son snake_case para que
// coincidan 1:1 con las columnas de Supabase (supabase/schema.sql).

export type ID = string

interface Row {
  id: ID
  created_at?: string
}

// ── Prospección ─────────────────────────────────────────────────────────

export type Prioridad = 'A' | 'B' | 'C' | 'D'
export type EstadoLead = 'activo' | 'no_interesado' | 'fuera_de_tramo' | 'cliente'

export interface Lead extends Row {
  clinica: string
  telefono: string
  prioridad: Prioridad | null
  resenas: number | null
  rating: number | null
  categoria: string
  direccion: string
  ciudad: string
  zona: string
  recepcionista: string
  doctor: string
  cel_doctor: string
  email: string
  estado: EstadoLead
  callback: string | null // fecha YYYY-MM-DD
  callback_hora: string
  notas: string
  fuente: string
}

/** Los 7 resultados de un intento de llamada (Guía de Leads de Olimpo). */
export type ResultadoLlamada =
  | 'no_contesto'
  | 'numero_equivocado'
  | 'portero_bloquea'
  | 'volver_a_llamar'
  | 'hablo_con_doctor'
  | 'no_interesado'
  | 'agendo_cita'

export type Canal = 'llamada' | 'whatsapp' | 'email' | 'dm' | 'visita'

export interface Llamada extends Row {
  lead_id: ID | null
  fecha: string // ISO datetime
  canal: Canal
  resultado: ResultadoLlamada
  resono: boolean | null // al decisor le resonó el pitch
  guion: string // 'charlie' | 'hunter' | ...
  objecion: string
  nota: string
}

// ── Ventas ─────────────────────────────────────────────────────────────

export type EstadoReunion = 'agendada' | 'presentada' | 'no_show' | 'reagendada' | 'cancelada'
export type ResultadoVenta = 'ganada' | 'perdida' | 'seguimiento' | null

export interface Reunion extends Row {
  lead_id: ID | null
  nombre: string
  fecha: string // ISO datetime de la videollamada
  agendada_el: string // YYYY-MM-DD
  fuente: string // llamada en frío, pauta, referido, whatsapp...
  estado: EstadoReunion
  resultado: ResultadoVenta
  oferta: string // precio / pitch presentado
  monto: number | null // lo que se cerró
  duracion_min: number | null
  grabacion: string
  emociones: string
  objecion: string
  conclusion: string
  notas: string
}

// ── Clientes ───────────────────────────────────────────────────────────

export type EstadoCliente = 'onboarding' | 'activo' | 'pausado' | 'perdido'

export interface Cliente extends Row {
  lead_id: ID | null
  nombre: string
  contacto: string
  telefono: string
  inicio: string
  fin: string | null
  estado: EstadoCliente
  setup_fee: number
  precio_por_paciente: number
  fee_mensual: number
  ad_account_id: string
  notas: string
}

// ── Pauta ──────────────────────────────────────────────────────────────

/** Una fila por día y por cuenta. cuenta = 'olimpo' o el id de un cliente. */
export interface PautaDia extends Row {
  cuenta: string
  anuncio_id: ID | null // null = total de la cuenta (o lo que no se atribuye a un anuncio)
  fecha: string
  gasto: number
  impresiones: number
  alcance: number
  clics: number
  leads: number
  citas: number
  presentados: number
  cierres: number
  cash: number
  valor: number // LTV atribuido a los cierres del día
  nota: string
  origen: 'manual' | 'meta'
}

/** Un anuncio de la campaña (Paid Ads System: 1 campaña · 3 adsets · 4 ganchos + 1 cuerpo). */
export type EstadoAnuncio = 'activo' | 'pausado' | 'apagado' | 'ganador'
export interface Anuncio extends Row {
  cuenta: string
  campana: string
  conjunto: string // adset
  audiencia: string // lookalike · intereses · cálidas · broad
  nombre: string
  tipo: 'video' | 'estatico'
  gancho: string
  angulo: string
  lanzado: string // YYYY-MM-DD
  estado: EstadoAnuncio
  notas: string
}

// ── Revisión semanal ───────────────────────────────────────────────────

export interface Revision extends Row {
  semana: string // YYYY-Www
  funciono: string
  no_funciono: string
  prioridad: string
  aprendizaje: string
  cerrada: boolean
}

// ── Finanzas ───────────────────────────────────────────────────────────

export type TipoMov = 'ingreso' | 'gasto'
export type Ambito = 'negocio' | 'personal'

export interface Movimiento extends Row {
  fecha: string
  tipo: TipoMov
  ambito: Ambito
  categoria: string
  concepto: string
  monto: number
  cliente_id: ID | null
  cuenta: string // operativa · reserva · personal
}

export interface Presupuesto extends Row {
  mes: string // YYYY-MM
  tipo: TipoMov
  categoria: string
  esperado: number
}

// ── Tiempo ─────────────────────────────────────────────────────────────

export type ValorBloque = 'valor' | 'desperdicio' | 'neutro'

export interface BloqueTiempo extends Row {
  fecha: string
  hora: string // "07:00", "07:30"...
  actividad: string
  categoria: string
  valor: ValorBloque
}

export interface Tarea extends Row {
  tarea: string
  categoria: string
  veces_semana: number
  minutos: number
  requiere_habilidad: boolean
  decision: 'pendiente' | 'eliminar' | 'automatizar' | 'delegar' | 'mantener'
}

// ── Disciplina diaria ──────────────────────────────────────────────────

export interface Dia extends Row {
  fecha: string
  consumo: boolean // 1 h de consumo del nicho
  contenido: boolean
  entrevistas: number
  energia: number | null // 1-5
  nota: string
  ritual: Record<string, boolean> | null // checklist del ritual y los 10 mandatos (Semana 2)
  cierre: CierreDia | null // el Daily Planner de Imperium
}

/** El cierre del día del Daily Planner: horas, foco, output y tres mejoras. */
export interface CierreDia {
  horas: number | null
  foco: number | null // 1-10
  output: string
  mejoras: string[]
}

// ── Contenido ──────────────────────────────────────────────────────────

/** Para qué es la pieza: tu marca personal, el contenido de la agencia o un creativo de pauta. */
export type Linea = 'marca' | 'agencia' | 'ads'
export type Embudo = 'TOF' | 'MOF' | 'BOF'
export type EtapaIdea = 'idea' | 'grabar' | 'editar' | 'listo' | 'publicado' | 'archivado'

export interface Idea extends Row {
  linea: Linea
  titulo: string
  gancho: string
  formato: string
  embudo: Embudo
  framework: string // slug del framework o generador que la produjo
  pilar: string
  guion: string
  notas: string
  etapa: EtapaIdea
  posicion: number
  estrella: boolean
  filtro: string[] // criterios del filtro de ideas que cumple
}

export interface Pieza extends Row {
  idea_id: ID | null
  linea: Linea
  titulo: string
  gancho: string
  formato: string
  embudo: Embudo
  framework: string
  plataformas: string[]
  url: string
  publicado: string // YYYY-MM-DD
  notas: string
}

/** Se mide una vez, a los 7 días, por plataforma. */
export interface MetricaPieza extends Row {
  pieza_id: ID
  plataforma: string
  medido: string
  vistas: number
  retencion: number // % promedio visto
  likes: number
  comentarios: number
  compartidos: number
  guardados: number
  seguidores: number
  visitas_perfil: number
}

/** Quien te escribió por un contenido: la parte CRM de la audiencia. */
export type EtapaPersona = 'conversando' | 'interesado' | 'cita' | 'cliente' | 'descartado'
export interface Persona extends Row {
  nombre: string
  usuario: string
  plataforma: string
  pieza_id: ID | null
  linea: Linea
  disparador: string // qué le hizo escribir, en sus palabras
  etapa: EtapaPersona
  siguiente_paso: string
  siguiente_fecha: string | null
  notas: string
}

// ── Foco ───────────────────────────────────────────────────────────────

export interface Interrupcion {
  inicio: string
  fin: string | null
  motivo: string
}

export interface Sesion extends Row {
  fecha: string // día local
  inicio: string // ISO
  fin: string // ISO
  minutos: number // trabajo real, sin interrupciones
  objetivo_min: number | null
  modo: 'temporizador' | 'contador'
  tarea: string
  prioridad_id: ID | null
  tipo: 'crear' | 'aprender' | 'vaciar'
  calidad: number | null
  interrupciones: Interrupcion[]
}

export interface PrioridadDia extends Row {
  fecha: string
  texto: string
  hecha: boolean
  orden: number
}

// ── War Map ────────────────────────────────────────────────────────────

/** id 'reglas-AAAA' → datos.reglas: string[] · id 'mes-AAAA-MM' → datos.objetivos, datos.notas */
export interface WarMap extends Row {
  datos: Record<string, unknown>
}

// ── Mentalidad (Semana 2) ──────────────────────────────────────────────

/** Movimiento del Banco de Sufrimiento (2.5): enfrentar +1, evitar −2. */
export interface MovBanco extends Row {
  fecha: string
  tipo: 'enfrente' | 'evite'
  texto: string
  forma: string // forma de resistencia (clave en inglés del catálogo de 30)
}

/** Contenido privado de solo lectura: la doctrina de la Semana 2 y las imágenes del documento. */
export interface Contenido extends Row {
  datos: unknown
}

/** Lo editable de la Semana 2: el documento y el estado de cada ejercicio. */
export interface Mentalidad extends Row {
  tipo: 'documento' | 'ejercicio' | 'revision'
  datos: Record<string, unknown>
}

// ── Bóveda ─────────────────────────────────────────────────────────────

export interface EntradaBoveda extends Row {
  tipo: 'objecion' | 'pregunta'
  texto: string
  respuesta: string
  puntaje: number | null
  veces: number
}

// ── Equipo ─────────────────────────────────────────────────────────────

export type Grado = 'D' | 'C' | 'B' | 'A' | 'A*'

export interface Candidato extends Row {
  nombre: string
  email: string
  rol: string
  fecha: string
  estado: 'postulado' | 'entrevista' | 'prueba' | 'contratado' | 'descartado'
  grado: Grado | null
  notas: string
}

// ── Ajustes ────────────────────────────────────────────────────────────

export interface Ajustes extends Row {
  agencia: string
  moneda: string
  trm: number // pesos por dólar, para comparar con los pisos en USD
  meta_mensual: number
  precio_setup: number
  precio_por_paciente: number
  pacientes_por_cliente_mes: number
  retencion_meses: number
  meta_llamadas_dia: number
  dias_habiles_semana: number
  guion_activo: string
  presupuesto_diario: number // pauta propia, COP/día
  cpl_objetivo: number // KPI1 de la calculadora por gasto (Paid Ads 7.1)
  costo_cita_objetivo: number // KPI2
}

export interface Tablas {
  leads: Lead
  llamadas: Llamada
  reuniones: Reunion
  clientes: Cliente
  pauta: PautaDia
  movimientos: Movimiento
  presupuestos: Presupuesto
  bloques: BloqueTiempo
  tareas: Tarea
  dias: Dia
  boveda: EntradaBoveda
  candidatos: Candidato
  ajustes: Ajustes
  banco: MovBanco
  contenido: Contenido
  mentalidad: Mentalidad
  anuncios: Anuncio
  revisiones: Revision
  ideas: Idea
  piezas: Pieza
  metricas_pieza: MetricaPieza
  personas: Persona
  sesiones: Sesion
  prioridades: PrioridadDia
  warmap: WarMap
}

export type Tabla = keyof Tablas
export const TABLAS: Tabla[] = [
  'leads',
  'llamadas',
  'reuniones',
  'clientes',
  'pauta',
  'movimientos',
  'presupuestos',
  'bloques',
  'tareas',
  'dias',
  'boveda',
  'candidatos',
  'ajustes',
  'banco',
  'contenido',
  'mentalidad',
  'anuncios',
  'revisiones',
  'ideas',
  'piezas',
  'metricas_pieza',
  'personas',
  'sesiones',
  'prioridades',
  'warmap',
]
