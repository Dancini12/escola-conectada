-- Expõe somente os dados necessários para montar a grade de horários.
-- A função evita que as políticas de RLS escondam reservas feitas por outros usuários.
CREATE OR REPLACE FUNCTION public.get_horarios_ocupados(
  p_recurso_id integer,
  p_data date
)
RETURNS TABLE (
  horario_inicio time,
  horario_fim time,
  quantidade integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.horario_inicio, a.horario_fim, a.quantidade
  FROM public.agendamentos a
  WHERE a.recurso_id = p_recurso_id
    AND a.data = p_data
    AND a.status <> 'cancelado';
$$;

REVOKE ALL ON FUNCTION public.get_horarios_ocupados(integer, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_horarios_ocupados(integer, date) TO authenticated;

-- Serializa alterações do mesmo recurso/data e impede sobreposição inclusive
-- quando duas pessoas tentam reservar ao mesmo tempo.
CREATE OR REPLACE FUNCTION public.impedir_agendamentos_sobrepostos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(
    NEW.recurso_id,
    (NEW.data - DATE '2000-01-01')::integer
  );

  IF NEW.status <> 'cancelado' AND EXISTS (
    SELECT 1
    FROM public.agendamentos a
    WHERE a.recurso_id = NEW.recurso_id
      AND a.data = NEW.data
      AND a.status <> 'cancelado'
      AND a.id IS DISTINCT FROM NEW.id
      AND a.horario_inicio < NEW.horario_fim
      AND a.horario_fim > NEW.horario_inicio
  ) THEN
    RAISE EXCEPTION 'horario_ja_reservado'
      USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS impedir_agendamentos_sobrepostos ON public.agendamentos;
CREATE TRIGGER impedir_agendamentos_sobrepostos
  BEFORE INSERT OR UPDATE OF recurso_id, data, horario_inicio, horario_fim, status
  ON public.agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.impedir_agendamentos_sobrepostos();
