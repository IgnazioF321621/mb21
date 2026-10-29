-- ═══════════════════════════════════════════════════════════
-- MODIFICA di oggetti esistenti: ok di Ignazio del 29/10/2026 («sì» alla regola proposta, via Regia; nota Pagine 139: «dobbiamo calcolare i contatti
-- solo quando sono realmente fatti, anche dopo essere arrivati»). Si applica al rilascio, PRIMA dello script dati tools/banco/dati_139_esito_il.sql.
-- Copia di com'era: tools/banco/copie/esito_il_prima_139.sql.
-- Il difetto: la regola era «esito_il se c'è, se no il giorno dell'azione». Le azioni con l'esito già scritto e la data nel futuro (i promemoria Riordino
-- di Glide, qualche riga dell'app scritta in anticipo) arrivato quel giorno contavano come fatte. E il trigger scattava solo sulle modifiche: le azioni
-- che nascono già con l'esito (registra_esito senza riga aperta, chiudi_azione, salvataggi dell'app) restavano senza esito_il.
-- La correzione:
-- 1) il trigger scatta anche quando l'azione nasce, se nasce fatta (completata) con l'esito e senza esito_il; stessa regola della nota 135
--    (giorno passato → quel giorno, se no oggi). Se esito_il arriva già scritto (es. «annulla» che rimette un passo) non si tocca.
--    Nelle modifiche, se esito_il è vuoto, si scrive anche quando l'esito cambia (il promemoria «Riordino» di Glide chiuso con «Ordine» o «Nessun
--    ordine» da chiudi_appuntamento) e quando completata passa a true; un'azione riaperta (completata da true a non true, «annulla») torna senza
--    esito_il. Un esito cambiato su una riga che esito_il l'ha già resta com'era (nota Azioni 030).
-- 2) un Contatto conta come fatto SOLO nel giorno di esito_il: niente più «se no il giorno dell'azione» (vista azioni_conti e stato_oggi qui; in JS
--    report.js giornoAzione e pagina-oggi.js sentitiOggiV5). Piano Marketing e appuntamenti restano nel giorno dell'incontro, come prima.
-- Stesse colonne, stessi tipi e stesso ordine: i permessi e le opzioni della vista e della funzione restano quelli di prima.
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.mb21_azione_esito_il()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  oggi date := (now() at time zone 'Europe/Rome')::date;
begin
  if tg_op = 'INSERT' then
    -- nota 139: un'azione che nasce già fatta con l'esito ha il suo giorno; un promemoria (non completata) aspetta di essere fatto
    if new.esito is null then
      new.esito_il := null;
    elsif new.esito_il is null and coalesce(new.completata, false) then
      new.esito_il := case
        when new.inizio is not null and (new.inizio at time zone 'Europe/Rome')::date < oggi
          then (new.inizio at time zone 'Europe/Rome')::date
        else oggi
      end;
    end if;
    return new;
  end if;
  if new.esito is null then
    new.esito_il := null;
  elsif coalesce(old.completata, false) and not coalesce(new.completata, false) then
    new.esito_il := null;   -- nota 139: riaperta («annulla» di chiudi_appuntamento → riapri_appuntamento): non è più fatta
  elsif old.esito is null
     or (new.esito_il is null   -- nota 139: se il chiamante non l'ha già scritto
         and (old.esito is distinct from new.esito   -- es. il promemoria «Riordino» chiuso con «Ordine» dalla card del riordino
              or (not coalesce(old.completata, false) and coalesce(new.completata, false)))) then
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
  before insert or update of esito, completata on public.azioni
  for each row execute function public.mb21_azione_esito_il();

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
   CROSS JOIN LATERAL (SELECT CASE WHEN a.tipo_azione = 'Contatto' THEN a.esito_il   -- nota 139: solo il giorno in cui è stato fatto davvero
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
                           and a.esito_il = (now() at time zone 'Europe/Rome')::date))),   -- nota 139: solo il giorno di esito_il
    'catalogati_oggi', (select count(*) from public.contatti c
                        where c.user_id = u.id and c.catalogato_il = (now() at time zone 'Europe/Rome')::date))
  from public.utenti u where u.id = coalesce(p_utente, public.utente_corrente());
$function$;
