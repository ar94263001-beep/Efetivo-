-- publico-de-proposito
-- Dados do RDO: consumo e hora parada por máquina no dia, e clima por obra no dia. Segue o acesso livre da primeira migration.
alter table public.ponto_maquinas add column diesel text, add column gasolina text, add column hora_parada text;
create table public.clima_dia (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  obra_id uuid not null references public.obras(id) on delete cascade,
  clima text check (clima in ('SOL','NUBLADO','CHUVA PARCIAL','CHUVA')),
  unique (data, obra_id)
);
create index on public.clima_dia (obra_id, data desc);
alter table public.clima_dia enable row level security;
create policy "acesso livre" on public.clima_dia for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on public.clima_dia to anon, authenticated;
