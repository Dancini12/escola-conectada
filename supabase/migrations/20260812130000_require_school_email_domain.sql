ALTER TABLE usuarios
  ADD CONSTRAINT usuarios_email_dominio_escola
  CHECK (email ILIKE '%@escola.pr.gov.br');
