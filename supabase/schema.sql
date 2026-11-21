-- Nitu · Atlas Anatómico: tabelas e regras de privacidade (Supabase).
-- Como usar: Supabase > SQL Editor > cole este ficheiro > Run. Pode correr mais do que uma vez.

-- Um documento por utilizador, com os favoritos, as notas, as aulas concluídas e o progresso do quiz.
create table if not exists public.dados_utilizador (
  utilizador_id uuid primary key references auth.users (id) on delete cascade,
  dados jsonb not null default '{}'::jsonb,
  -- Cresce a cada gravação: deteta quando dois aparelhos gravam ao mesmo tempo
  versao integer not null default 1,
  atualizado_em timestamptz not null default now()
);

-- Cada utilizador só vê e altera o seu próprio documento
alter table public.dados_utilizador enable row level security;

drop policy if exists "ler o próprio" on public.dados_utilizador;
create policy "ler o próprio" on public.dados_utilizador
  for select to authenticated using (utilizador_id = (select auth.uid()));

drop policy if exists "criar o próprio" on public.dados_utilizador;
create policy "criar o próprio" on public.dados_utilizador
  for insert to authenticated with check (utilizador_id = (select auth.uid()));

drop policy if exists "alterar o próprio" on public.dados_utilizador;
create policy "alterar o próprio" on public.dados_utilizador
  for update to authenticated
  using (utilizador_id = (select auth.uid()))
  with check (utilizador_id = (select auth.uid()));

drop policy if exists "apagar o próprio" on public.dados_utilizador;
create policy "apagar o próprio" on public.dados_utilizador
  for delete to authenticated using (utilizador_id = (select auth.uid()));

-- Direito a apagar a conta: o próprio utilizador apaga a conta e (em cascata) os seus dados
create or replace function public.apagar_a_minha_conta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'sem sessão';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.apagar_a_minha_conta() from public, anon;
grant execute on function public.apagar_a_minha_conta() to authenticated;
