-- Regola 4 del coach (Ignazio 29/09/2026; nota Azioni 020): la preparazione della Presentazione con le sue parole.
-- Aggiunge all'archivio del coach (coach_batterie → preparazione_incontro) la riga `presentazione`, che l'app mostra:
--   · in MB Plan e nella scheda, sotto una Consulenza PRD · Presentazione ancora da fare (preparaPresentazioneHtml, pagina-coach.js);
--   · nel coach dopo una telefonata chiusa con «Consulenza Prodotti» fissata come Presentazione («Giovedì presenti a Mario.» + il consiglio; coach.js → corta).
-- Le parole di Ignazio («Ripassa il prodotto e il marchio che vuoi presentare. Studia la garanzia di soddisfazione e come si diventa cliente registrato»)
-- sono dette come consiglio, non come ordine (CLAUDE.md § 1). Non è una migrazione: è un testo dell'archivio del coach, come le correzioni delle frasi.
-- Da applicare con:  supabase db query --linked -f tools/coach/20261004_preparazione_presentazione.sql
update public.coach_batterie
   set batteria = (batteria::jsonb || jsonb_build_object('presentazione', jsonb_build_object(
         'c', 'Conviene ripassare il prodotto e il marchio che presenti, la garanzia di soddisfazione e come si diventa cliente registrato.',
         'apertura', '{quando} presenti a {chi}.',
         'fonte', 'Regola del coach n. 4 · Ignazio, 29/09/2026')))::json
 where situazione = 'preparazione_incontro'
 returning situazione, batteria::jsonb -> 'presentazione' as presentazione;
