-- Copia della funzione del trigger mb21_azione_esito_il com'era il 28/10/2026, prima della nota Pagine 135 (pg_get_functiondef dal database vero).
-- Il trigger: CREATE TRIGGER mb21_azione_esito_il BEFORE UPDATE OF esito, completata ON public.azioni FOR EACH ROW EXECUTE FUNCTION mb21_azione_esito_il()
CREATE OR REPLACE FUNCTION public.mb21_azione_esito_il()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.esito is null then
    new.esito_il := null;
  elsif old.esito is null
     or (old.esito = new.esito and not coalesce(old.completata, false) and coalesce(new.completata, false) and new.esito_il is null) then
    new.esito_il := (now() at time zone 'Europe/Rome')::date;
  end if;
  return new;
end;
$function$;
