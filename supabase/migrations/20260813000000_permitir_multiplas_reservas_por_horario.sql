-- O gatilho original bloqueava QUALQUER sobreposição de horário, mesmo
-- quando ainda sobravam unidades do recurso (ex: 1 Chromebook reservado
-- de 35 já impedia todo mundo de reservar o mesmo horário). Agora só
-- bloqueia quando a soma das quantidades já reservadas + a nova reserva
-- ultrapassa o total do recurso.
CREATE OR REPLACE FUNCTION public.impedir_agendamentos_sobrepostos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_usado integer;
BEGIN
  PERFORM pg_advisory_xact_lock(
    NEW.recurso_id,
    (NEW.data - DATE '2000-01-01')::integer
  );

  IF NEW.status <> 'cancelado' THEN
    SELECT quantidade_total INTO v_total
    FROM public.recursos
    WHERE id = NEW.recurso_id;

    SELECT COALESCE(SUM(a.quantidade), 0) INTO v_usado
    FROM public.agendamentos a
    WHERE a.recurso_id = NEW.recurso_id
      AND a.data = NEW.data
      AND a.status <> 'cancelado'
      AND a.id IS DISTINCT FROM NEW.id
      AND a.horario_inicio < NEW.horario_fim
      AND a.horario_fim > NEW.horario_inicio;

    IF v_usado + NEW.quantidade > COALESCE(v_total, 0) THEN
      RAISE EXCEPTION 'horario_ja_reservado'
        USING ERRCODE = '23P01';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
