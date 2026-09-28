-- Tabla de récords compartida del Snake.
-- Se ejecuta UNA vez en Supabase: panel del proyecto → SQL Editor → pegar → Run.

create table public.scores (
  id         bigint generated always as identity primary key,
  -- Nombre del jugador: de 1 a 12 caracteres (sin contar espacios de los bordes).
  name       text not null check (char_length(trim(name)) between 1 and 12),
  -- Debe coincidir con los ids de GAME_MODES (src/app/game/game-modes.ts).
  mode       text not null check (mode in ('classic', 'portal', 'obstacles')),
  -- 10 puntos por comida. Máximo posible: (400 celdas - 3 iniciales) * 10 = 3970.
  score      integer not null check (score > 0 and score % 10 = 0 and score <= 3970),
  created_at timestamptz not null default now()
);

-- Índice para que "el top 10 de un modo" sea rápido aunque haya muchas filas.
create index scores_mode_score_idx on public.scores (mode, score desc);

-- Row Level Security: con RLS activado, NADIE puede hacer nada
-- salvo lo que permitan las políticas de abajo.
alter table public.scores enable row level security;

-- Cualquiera (incluido un visitante sin cuenta, el rol "anon") puede LEER.
create policy "Cualquiera puede ver los récords"
  on public.scores for select
  to anon
  using (true);

-- Cualquiera puede AÑADIR un récord; las reglas "check" de la tabla
-- rechazan nombres o puntajes imposibles.
create policy "Cualquiera puede enviar un récord"
  on public.scores for insert
  to anon
  with check (true);

-- No hay políticas de update ni delete: nadie puede modificar ni borrar
-- récords desde el juego (solo tú, desde el panel de Supabase).

-- Permisos del rol "anon" sobre la tabla (solo leer y añadir).
grant select, insert on public.scores to anon;
