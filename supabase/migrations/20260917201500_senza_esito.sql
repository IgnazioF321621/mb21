-- Cantiere 24 · passo 4: appuntamento passato senza esito.
-- Un'ora dopo la fine (o un'ora dopo l'inizio, se non c'è la fine) di un appuntamento ancora senza esito
-- arriva «Com'è andata?», una volta sola: `senza_esito_avvisato_il` si scrive dopo l'invio. Controllo ogni 5 minuti.
alter table public.azioni add column if not exists senza_esito_avvisato_il timestamptz;
select cron.schedule('avviso-senza-esito', '2-57/5 * * * *', $$select chiama_avvisi('senza_esito')$$);
