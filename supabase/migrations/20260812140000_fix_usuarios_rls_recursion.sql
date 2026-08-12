-- A política "Admin lê todos perfis" fazia uma subquery em public.usuarios,
-- o que reaciona a própria política de RLS da tabela e causa recursão infinita
-- (erro 42P17) sempre que usuarios é lida com RLS ativo — inclusive
-- indiretamente, via políticas de agendamentos que também consultam usuarios.
-- Função SECURITY DEFINER quebra o ciclo: como roda com o dono da tabela,
-- não é reavaliada pelas políticas de RLS de usuarios.
create or replace function public.is_admin_or_professor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios u
    where u.id = auth.uid()
      and u.perfil in ('admin', 'professor')
  );
$$;

revoke all on function public.is_admin_or_professor() from public;
grant execute on function public.is_admin_or_professor() to authenticated;

drop policy if exists "Admin lê todos perfis" on public.usuarios;
create policy "Admin lê todos perfis" on public.usuarios
  for select using (public.is_admin_or_professor());

drop policy if exists "Aluno vê próprios agendamentos" on public.agendamentos;
create policy "Aluno vê próprios agendamentos" on public.agendamentos
  for select using (
    auth.uid() = usuario_id or public.is_admin_or_professor()
  );

drop policy if exists "Usuário cancela próprio agendamento" on public.agendamentos;
create policy "Usuário cancela próprio agendamento" on public.agendamentos
  for update using (
    auth.uid() = usuario_id or public.is_admin_or_professor()
  );
