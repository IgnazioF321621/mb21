-- ═══════════════════════════════════════════════════════════
-- MODIFICA di una funzione esistente (stato_oggi): ok esplicito di Ignazio del 12/10/2026 («ok procedi con tutti e 2»; nota Azioni 030).
-- Si applica al rilascio, dopo 20261012185500 (campo) e 20261012185600 (trigger).
-- «Contatti 3 di 5» (Dashboard e MB Plan): una telefonata scelta a mano conta nel giorno in cui le si dà l'esito (`esito_il`),
-- non in quello in cui era prevista; le righe della coda come prima (nascono già con l'esito, nel momento in cui si dà).
-- Per le telefonate di prima (esito_il vuoto) resta il giorno dell'azione. Copia di com'era: tools/banco/copie/stato_oggi_prima_030.sql.
-- ═══════════════════════════════════════════════════════════
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
