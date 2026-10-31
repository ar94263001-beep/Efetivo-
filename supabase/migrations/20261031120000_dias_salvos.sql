-- publico-de-proposito
-- Dias que a equipe fechou com o botão "Salvar dia". Os lançamentos continuam em ponto/ponto_maquinas;
-- esta tabela só diz que o dia daquela obra foi conferido. Segue o acesso livre da primeira migration.
create table public.dias_salvos (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  tipo text not null check (tipo in ('col','maq')),
  obra_id uuid not null references public.obras(id) on delete cascade,
  salvo_em timestamptz not null default now(),
  unique (data, tipo, obra_id)
);
create index on public.dias_salvos (obra_id, data desc);

alter table public.dias_salvos enable row level security;
create policy "acesso livre" on public.dias_salvos for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on public.dias_salvos to anon, authenticated;
