-- A tela de reserva (Reservar.jsx e Agendamentos.jsx) nunca coleta um campo
-- "finalidade" do usuário, mas a coluna era NOT NULL — toda reserva real
-- falhava com "null value in column finalidade violates not-null constraint".
alter table public.agendamentos
  alter column finalidade drop not null;
