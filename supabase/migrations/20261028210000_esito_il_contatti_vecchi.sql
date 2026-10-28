-- ═══════════════════════════════════════════════════════════
-- MODIFICA di funzione esistente, ok di Ignazio del 28/10/2026 («Si procede», via Regia; nota Pagine 135).
-- Si applica al rilascio. Copia di com'era: tools/banco/copie/mb21_azione_esito_il_prima_135.sql.
-- Il difetto: chi registra oggi un contatto vecchio (la telefonata con una data passata, poi l'esito) si trovava `esito_il` = oggi, e il contatto
-- contava come fatto oggi in «Fatti X su Y» (stato_oggi), in «Già sentiti oggi», nel Check e nel Report di oggi (vista azioni_conti, report.js),
-- che usano tutti «esito_il se c'è, se no il giorno dell'azione».
-- La correzione, alla radice: quando l'esito si dà lo stesso giorno in cui l'azione è stata scritta e la sua data è passata, `esito_il` è il giorno
-- dell'azione (va nella storia). Resta la regola della nota Azioni 030: un'azione scritta prima e chiusa oggi conta oggi; scritta oggi per oggi o per
-- un giorno che deve venire e chiusa oggi, conta oggi come prima. stato_oggi, azioni_conti e report.js non cambiano.
-- ═══════════════════════════════════════════════════════════
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
