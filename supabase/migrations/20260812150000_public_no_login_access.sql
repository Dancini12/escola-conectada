-- O app nunca teve tela de login: o fluxo sempre foi só nome + e-mail
-- institucional no modal de reserva. As políticas de RLS originais exigiam
-- auth.uid() = usuario_id, o que bloqueava toda reserva (e também o link de
-- cancelamento por e-mail, que é acessado sem sessão). Esta migração troca
-- para um modelo de "quadro de reservas público", protegido pela validação
-- de domínio de e-mail (@escola.pr.gov.br) em vez de autenticação.

-- ─── recursos: leitura pública ─────────────────────────────────

drop policy if exists "Todos leem recursos" on public.recursos;

create policy "Leitura pública de recursos" on public.recursos
  for select using (true);

-- ─── horarios_bloqueados: leitura pública ──────────────────────

drop policy if exists "Leitura de horários bloqueados" on public.horarios_bloqueados;

create policy "Leitura pública de horários bloqueados" on public.horarios_bloqueados
  for select using (true);

-- ─── agendamentos: acesso público (sem login) ──────────────────

drop policy if exists "Aluno vê próprios agendamentos" on public.agendamentos;
drop policy if exists "Usuário cria agendamento" on public.agendamentos;
drop policy if exists "Usuário cancela próprio agendamento" on public.agendamentos;

create policy "Leitura pública de agendamentos" on public.agendamentos
  for select using (true);

create policy "Criação pública de agendamento" on public.agendamentos
  for insert with check (email ilike '%@escola.pr.gov.br');

create policy "Atualização pública de agendamento" on public.agendamentos
  for update using (true);

-- Reforça o domínio institucional também no nível de coluna
-- (defesa em profundidade, já que não há mais checagem via usuario_id).
alter table public.agendamentos
  add constraint agendamentos_email_dominio_escola
  check (email is null or email ilike '%@escola.pr.gov.br');

-- ─── RPC de horários ocupados: liberar para anônimos ───────────

grant execute on function public.get_horarios_ocupados(integer, date) to anon, authenticated;
