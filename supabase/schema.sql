-- Imperium OS · esquema de Supabase
-- Se corre UNA vez en Supabase → SQL Editor → New query → pegar todo → Run.
-- Cada tabla es privada: solo la ve el usuario que la creó (Row Level Security).

create table if not exists leads (
  id text primary key,
  created_at timestamptz default now(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  clinica text not null default '',
  telefono text default '',
  prioridad text,
  resenas numeric,
  rating numeric,
  categoria text default '',
  direccion text default '',
  ciudad text default '',
  zona text default '',
  recepcionista text default '',
  doctor text default '',
  cel_doctor text default '',
  email text default '',
  estado text not null default 'activo',
  callback date,
  callback_hora text default '',
  notas text default '',
  fuente text default ''
);

create table if not exists llamadas (
  id text primary key,
  created_at timestamptz default now(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  lead_id text,
  fecha timestamptz not null,
  canal text not null default 'llamada',
  resultado text not null,
  resono boolean,
  guion text default '',
  objecion text default '',
  nota text default ''
);
create index if not exists llamadas_fecha on llamadas (fecha);
create index if not exists llamadas_lead on llamadas (lead_id);

create table if not exists reuniones (
  id text primary key,
  created_at timestamptz default now(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  lead_id text,
  nombre text default '',
  fecha timestamptz not null,
  agendada_el date,
  fuente text default '',
  estado text not null default 'agendada',
  resultado text,
  oferta text default '',
  monto numeric,
  duracion_min numeric,
  grabacion text default '',
  emociones text default '',
  objecion text default '',
  conclusion text default '',
  notas text default ''
);

create table if not exists clientes (
  id text primary key,
  created_at timestamptz default now(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  lead_id text,
  nombre text not null default '',
  contacto text default '',
  telefono text default '',
  inicio date,
  fin date,
  estado text not null default 'onboarding',
  setup_fee numeric default 0,
  precio_por_paciente numeric default 0,
  fee_mensual numeric default 0,
  ad_account_id text default '',
  notas text default ''
);

create table if not exists pauta (
  id text primary key,
  created_at timestamptz default now(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  cuenta text not null,           -- 'olimpo' o el id de un cliente
  anuncio_id text,                -- null = total de la cuenta
  fecha date not null,
  gasto numeric default 0,
  impresiones numeric default 0,
  alcance numeric default 0,
  clics numeric default 0,
  leads numeric default 0,
  citas numeric default 0,
  presentados numeric default 0,
  cierres numeric default 0,
  cash numeric default 0,
  valor numeric default 0,
  nota text default '',
  origen text not null default 'manual'  -- 'manual' | 'meta'
);
-- La futura sincronización con Meta escribe una fila por cuenta y día.
alter table pauta add column if not exists anuncio_id text;
create unique index if not exists pauta_meta_unica on pauta (user_id, cuenta, coalesce(anuncio_id, ''), fecha) where origen = 'meta';

create table if not exists anuncios (
  id text primary key,
  created_at timestamptz default now(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  cuenta text not null default 'olimpo',
  campana text default '',
  conjunto text default '',
  audiencia text default '',
  nombre text not null default '',
  tipo text default 'video',
  gancho text default '',
  angulo text default '',
  lanzado date,
  estado text default 'activo',
  notas text default ''
);

create table if not exists revisiones (
  id text primary key,
  created_at timestamptz default now(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  semana text not null,
  funciono text default '',
  no_funciono text default '',
  prioridad text default '',
  aprendizaje text default '',
  cerrada boolean default false
);

create table if not exists movimientos (
  id text primary key,
  created_at timestamptz default now(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  fecha date not null,
  tipo text not null,
  ambito text not null default 'negocio',
  categoria text default '',
  concepto text default '',
  monto numeric not null default 0,
  cliente_id text,
  cuenta text default 'operativa'
);

create table if not exists presupuestos (
  id text primary key,
  created_at timestamptz default now(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  mes text not null,
  tipo text not null,
  categoria text not null,
  esperado numeric default 0
);

create table if not exists bloques (
  id text primary key,
  created_at timestamptz default now(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  fecha date not null,
  hora text not null,
  actividad text default '',
  categoria text default '',
  valor text default 'neutro'
);

create table if not exists tareas (
  id text primary key,
  created_at timestamptz default now(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  tarea text not null default '',
  categoria text default '',
  veces_semana numeric default 0,
  minutos numeric default 0,
  requiere_habilidad boolean default false,
  decision text default 'pendiente'
);

create table if not exists dias (
  id text primary key,
  created_at timestamptz default now(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  fecha date not null,
  consumo boolean default false,
  contenido boolean default false,
  entrevistas integer default 0,
  energia integer,
  nota text default '',
  ritual jsonb default '{}'::jsonb
);
alter table dias add column if not exists ritual jsonb default '{}'::jsonb;

-- Semana 2 · mentalidad
create table if not exists banco (
  id text primary key,
  created_at timestamptz default now(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  fecha date not null,
  tipo text not null,            -- 'enfrente' (+1) | 'evite' (−2)
  texto text default '',
  forma text default ''
);

-- Contenido privado (doctrina de la Semana 2 e imágenes del documento). Nunca va en el código.
create table if not exists contenido (
  id text primary key,
  created_at timestamptz default now(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  datos jsonb not null
);

create table if not exists mentalidad (
  id text primary key,
  created_at timestamptz default now(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  tipo text not null,
  datos jsonb not null default '{}'::jsonb
);

create table if not exists boveda (
  id text primary key,
  created_at timestamptz default now(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  tipo text not null default 'objecion',
  texto text not null default '',
  respuesta text default '',
  puntaje numeric,
  veces integer default 0
);

create table if not exists candidatos (
  id text primary key,
  created_at timestamptz default now(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nombre text not null default '',
  email text default '',
  rol text default '',
  fecha date,
  estado text default 'postulado',
  grado text,
  notas text default ''
);

create table if not exists ajustes (
  id text primary key,
  created_at timestamptz default now(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  agencia text default '',
  moneda text default 'COP',
  trm numeric default 4000,
  meta_mensual numeric default 0,
  precio_setup numeric default 0,
  precio_por_paciente numeric default 0,
  pacientes_por_cliente_mes numeric default 0,
  retencion_meses numeric default 1,
  meta_llamadas_dia numeric default 100,
  dias_habiles_semana numeric default 5,
  guion_activo text default 'charlie',
  cpl_objetivo numeric default 0,
  costo_cita_objetivo numeric default 0,
  presupuesto_diario numeric default 0
);
alter table ajustes add column if not exists presupuesto_diario numeric default 0;

-- Row Level Security: cada fila es solo de quien la creó.
do $$
declare t text;
begin
  foreach t in array array['leads','llamadas','reuniones','clientes','pauta','movimientos','presupuestos','bloques','tareas','dias','boveda','candidatos','ajustes','banco','contenido','mentalidad','anuncios','revisiones']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "dueno" on %I', t);
    execute format('create policy "dueno" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
