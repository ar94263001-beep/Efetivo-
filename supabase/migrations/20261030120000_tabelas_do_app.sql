-- publico-de-proposito
-- ACESSO LIVRE, decisão de quem é responsável pelo app em 30/10/2026: por enquanto não há login.
-- Quem tem o link vê e altera tudo, por isso as tabelas liberam para anon.
-- Para ligar o login: trocar as políticas abaixo por "to authenticated using (public.aprovado())",
-- tirar o anon dos grants e desligar ACESSO_LIVRE em src/lib/dados.js.

create table public.obras (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.colaboradores (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id),
  nome text not null,
  funcao text not null default '',
  situacao text not null default 'Ativo' check (situacao in ('Ativo','Desligado')),
  admissao date,
  dias integer not null default 5 check (dias between 0 and 7),
  aso boolean not null default false,
  treinamento boolean not null default false,
  alojado boolean not null default false,
  alojamento text not null default '',
  obs text not null default '',
  seq integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.colaboradores (obra_id);

create table public.maquinas (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id),
  item text not null,
  tipo text not null default 'Máquinas',
  responsavel text not null default '',
  situacao text not null default 'Em operação' check (situacao in ('Em operação','Em manutenção','Parada','Desmobilizada')),
  placa text not null default '',
  ano integer check (ano between 1950 and 2100),
  obs text not null default '',
  seq integer,
  created_at timestamptz not null default now()
);
create index on public.maquinas (obra_id);

-- obra_id vazio = a obra do cadastro. maquina_definida = false: segue o cadastro de máquinas.
create table public.ponto (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  obra_id uuid references public.obras(id),
  st text check (st in ('P','F','FJ','AT','FG','FE')),
  entrada text check (entrada ~ '^\d{1,2}:\d{2}$'),
  saida text check (saida ~ '^\d{1,2}:\d{2}$'),
  maquina_id uuid references public.maquinas(id) on delete set null,
  maquina_definida boolean not null default false,
  obs text,
  unique (data, colaborador_id)
);
create index on public.ponto (obra_id, data desc);

-- operador_modo: auto (ponto > cadastro), nenhum, cadastro (nome fora da lista), colaborador (operador_id)
create table public.ponto_maquinas (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  maquina_id uuid not null references public.maquinas(id) on delete cascade,
  obra_id uuid references public.obras(id),
  st text check (st in ('OP','PS','SO','QB','MN','CH')),
  operador_modo text not null default 'auto' check (operador_modo in ('auto','nenhum','cadastro','colaborador')),
  operador_id uuid references public.colaboradores(id) on delete set null,
  horimetro_ini text,
  horimetro_fim text,
  obs text,
  unique (data, maquina_id)
);
create index on public.ponto_maquinas (obra_id, data desc);

create function public.marcar_atualizado() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
revoke all on function public.marcar_atualizado() from public, anon, authenticated;
create trigger colaboradores_atualizado before update on public.colaboradores
  for each row execute function public.marcar_atualizado();

alter table public.obras enable row level security;
alter table public.colaboradores enable row level security;
alter table public.maquinas enable row level security;
alter table public.ponto enable row level security;
alter table public.ponto_maquinas enable row level security;

create policy "acesso livre" on public.obras for all to anon, authenticated using (true) with check (true);
create policy "acesso livre" on public.colaboradores for all to anon, authenticated using (true) with check (true);
create policy "acesso livre" on public.maquinas for all to anon, authenticated using (true) with check (true);
create policy "acesso livre" on public.ponto for all to anon, authenticated using (true) with check (true);
create policy "acesso livre" on public.ponto_maquinas for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.obras to anon, authenticated;
grant select, insert, update, delete on public.colaboradores to anon, authenticated;
grant select, insert, update, delete on public.maquinas to anon, authenticated;
grant select, insert, update, delete on public.ponto to anon, authenticated;
grant select, insert, update, delete on public.ponto_maquinas to anon, authenticated;

-- ---------- logins: prontos para quando o acesso deixar de ser livre ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  email text not null default '',
  aprovado boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
grant select on public.profiles to authenticated;

create function public.aprovado() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.aprovado from public.profiles p where p.id = (select auth.uid())), false);
$$;
revoke all on function public.aprovado() from public, anon;
grant execute on function public.aprovado() to authenticated;

create policy "ve o proprio ou aprovado ve todos" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.aprovado()));

create function public.aprovar_usuario(usuario uuid, valor boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.aprovado() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.profiles set aprovado = valor where id = usuario;
end;
$$;
revoke all on function public.aprovar_usuario(uuid, boolean) from public, anon;
grant execute on function public.aprovar_usuario(uuid, boolean) to authenticated;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, nome, email) values (new.id, coalesce(new.raw_user_meta_data->>'nome', ''), coalesce(new.email, ''));
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
