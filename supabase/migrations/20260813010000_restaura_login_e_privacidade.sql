-- Volta a exigir login: cada professor só vê, cria e cancela as próprias
-- reservas. As políticas "públicas" da migração anterior (feitas quando o
-- app ainda não tinha tela de login) são substituídas por políticas
-- restritas a auth.uid().

drop policy if exists "Leitura pública de agendamentos" on public.agendamentos;
drop policy if exists "Criação pública de agendamento" on public.agendamentos;
drop policy if exists "Atualização pública de agendamento" on public.agendamentos;

create policy "Usuário vê próprios agendamentos" on public.agendamentos
  for select using (auth.uid() = usuario_id);

create policy "Usuário cria agendamento" on public.agendamentos
  for insert with check (
    auth.uid() = usuario_id
    and email ilike '%@escola.pr.gov.br'
  );

create policy "Usuário cancela próprio agendamento" on public.agendamentos
  for update using (auth.uid() = usuario_id);

-- recursos e horarios_bloqueados continuam com leitura pública: não é
-- dado sensível e a tela de reserva precisa listar o que existe.

-- A checagem de disponibilidade (get_horarios_ocupados) é SECURITY DEFINER
-- e continua enxergando as reservas de todo mundo para somar quantidades,
-- mesmo com o select direto de agendamentos agora restrito por usuário.
revoke execute on function public.get_horarios_ocupados(integer, date) from anon;
grant execute on function public.get_horarios_ocupados(integer, date) to authenticated;
