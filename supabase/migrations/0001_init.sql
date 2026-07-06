-- Terminal — Auth + Persistência (Portão 1 aprovado 05/07/2026)
-- perfil_fazenda (1 por usuário), lotes (N por usuário), decisoes_simulador (N por usuário)
-- RLS scoped por auth.uid() = user_id em todas.

create table if not exists perfil_fazenda (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome_produtor text not null default '',
  nome_fazenda text not null default '',
  estado text not null default '',
  municipio text not null default '',
  basis_valor numeric not null default 0,
  break_even_medio numeric not null default 0,
  mortalidade_hist numeric not null default 0,
  theme text not null default 'light',
  densidade text not null default 'normal',
  area_hectares numeric not null default 0,
  sistemas_produtivos text[] not null default '{}',
  faturamento_estimado text not null default '',
  regiao_basis text not null default '',
  moeda_display text not null default 'BRL',
  updated_at timestamptz not null default now()
);

alter table perfil_fazenda enable row level security;

create policy "perfil_fazenda_select_own" on perfil_fazenda
  for select using (auth.uid() = user_id);
create policy "perfil_fazenda_insert_own" on perfil_fazenda
  for insert with check (auth.uid() = user_id);
create policy "perfil_fazenda_update_own" on perfil_fazenda
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "perfil_fazenda_delete_own" on perfil_fazenda
  for delete using (auth.uid() = user_id);


create table if not exists lotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null default '',
  fase text not null,
  sistema text not null,
  margem_pct numeric,
  inputs jsonb not null,
  resultado_cache jsonb not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists lotes_user_id_idx on lotes(user_id);

alter table lotes enable row level security;

create policy "lotes_select_own" on lotes
  for select using (auth.uid() = user_id);
create policy "lotes_insert_own" on lotes
  for insert with check (auth.uid() = user_id);
create policy "lotes_update_own" on lotes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "lotes_delete_own" on lotes
  for delete using (auth.uid() = user_id);


create table if not exists decisoes_simulador (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lote_id text, -- nem sempre é o uuid real de `lotes` (ex: "confinamento-Nome" do hedge de milho)
  lote_nome text not null default '',
  hedge_pct numeric not null,
  cenario_arroba numeric not null,
  preco_travado numeric not null,
  intencao text,
  criado_em timestamptz not null default now()
);

create index if not exists decisoes_simulador_user_id_idx on decisoes_simulador(user_id);

alter table decisoes_simulador enable row level security;

create policy "decisoes_simulador_select_own" on decisoes_simulador
  for select using (auth.uid() = user_id);
create policy "decisoes_simulador_insert_own" on decisoes_simulador
  for insert with check (auth.uid() = user_id);
create policy "decisoes_simulador_update_own" on decisoes_simulador
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "decisoes_simulador_delete_own" on decisoes_simulador
  for delete using (auth.uid() = user_id);
