ALTER TABLE agendamentos
  ADD COLUMN IF NOT EXISTS cancel_token UUID;

CREATE UNIQUE INDEX IF NOT EXISTS agendamentos_cancel_token_idx
  ON agendamentos (cancel_token)
  WHERE cancel_token IS NOT NULL;
