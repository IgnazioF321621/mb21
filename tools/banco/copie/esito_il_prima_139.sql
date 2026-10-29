-- Copia di com'era prima della nota Pagine 139 (29/10/2026, letto dal database in sola lettura): vista azioni_conti, funzione stato_oggi,
-- funzione e trigger mb21_azione_esito_il. Per tornare indietro si rilancia questo testo.

create or replace view public.azioni_conti as
 SELECT t.id, t.user_id, t.contatto_id, t.giorno, t.tipo_azione, t.modalita, t.esito, t.contatti,
    CASE WHEN t.tipo_azione = 'Piano Marketing'
         THEN (row_number() OVER (PARTITION BY t.user_id, t.inizio, t.modalita ORDER BY t.id) = 1)::integer
         ELSE 0 END AS pm
   FROM (
 SELECT a.id, a.user_id, a.contatto_id,
    g.giorno,
    a.tipo_azione, a.modalita, a.esito,
    (a.tipo_azione = 'Contatto')::integer AS contatti,
    a.inizio
   FROM azioni a
   CROSS JOIN LATERAL (SELECT CASE WHEN a.tipo_azione = 'Contatto' AND a.esito_il IS NOT NULL THEN a.esito_il
                                   ELSE (a.inizio AT TIME ZONE 'Europe/Rome')::date END AS giorno) g
  WHERE g.giorno >= date '2026-09-14'
    AND g.giorno <= (now() AT TIME ZONE 'Europe/Rome')::date
    AND ((a.tipo_azione = 'Contatto' AND coalesce(a.categoria, '') <> 'Partner'
          AND (a.esito = ANY (ARRAY['PM Fissato', 'Appuntamento', 'Ordine', 'Ordina da solo', 'Richiamare', 'Relazione', 'No Interesse', 'Consulenza Prodotti'])
               OR a.esito = 'Riordino' AND coalesce(a.completata, false)))
         OR (a.tipo_azione = 'Piano Marketing' AND a.esito = ANY (ARRAY['Presentazione', 'Dare Seguito', 'Iscrizione', 'No BuonFine', 'Prodotti'])))
   ) t;

CREATE OR REPLACE FUNCTION public.stato_oggi(p_utente uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select json_build_object(
    'contatti_al_giorno', u.contatti_al_giorno,
    'fatti_oggi', (select count(*) from public.azioni a
                   where a.user_id = u.id
                     and ((a.da_coda
                           and a.inizio >= (date_trunc('day', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome')
                           and a.inizio <  (date_trunc('day', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome') + interval '1 day')
                       or (a.scelta_a_mano and coalesce(a.completata, false) and a.esito is not null
                           and coalesce(a.esito_il, (a.inizio at time zone 'Europe/Rome')::date) = (now() at time zone 'Europe/Rome')::date))),
    'catalogati_oggi', (select count(*) from public.contatti c
                        where c.user_id = u.id and c.catalogato_il = (now() at time zone 'Europe/Rome')::date))
  from public.utenti u where u.id = coalesce(p_utente, public.utente_corrente());
$function$;

CREATE OR REPLACE FUNCTION public.mb21_azione_esito_il()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  oggi date := (now() at time zone 'Europe/Rome')::date;
begin
  if new.esito is null then
    new.esito_il := null;
  elsif old.esito is null
     or (old.esito = new.esito and not coalesce(old.completata, false) and coalesce(new.completata, false) and new.esito_il is null) then
    new.esito_il := case
      when new.creato_il is not null and (new.creato_il at time zone 'Europe/Rome')::date = oggi
       and new.inizio is not null and (new.inizio at time zone 'Europe/Rome')::date < oggi
        then (new.inizio at time zone 'Europe/Rome')::date   -- nota 135: un contatto vecchio registrato oggi va nel suo giorno
      else oggi
    end;
  end if;
  return new;
end;
$function$;

drop trigger if exists mb21_azione_esito_il on public.azioni;
create trigger mb21_azione_esito_il
  before update of esito, completata on public.azioni
  for each row execute function public.mb21_azione_esito_il();
