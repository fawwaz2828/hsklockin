-- Tabel progres HSKLOCKIN: satu baris per pengguna, isi = data localStorage yang disinkron (JSON).
-- Jalankan sekali di Supabase → SQL Editor.
create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row Level Security: setiap pengguna hanya bisa membaca & menulis barisnya sendiri.
alter table public.progress enable row level security;

drop policy if exists "own row select" on public.progress;
drop policy if exists "own row insert" on public.progress;
drop policy if exists "own row update" on public.progress;
drop policy if exists "own row delete" on public.progress;

create policy "own row select" on public.progress for select using (auth.uid() = user_id);
create policy "own row insert" on public.progress for insert with check (auth.uid() = user_id);
create policy "own row update" on public.progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own row delete" on public.progress for delete using (auth.uid() = user_id);
