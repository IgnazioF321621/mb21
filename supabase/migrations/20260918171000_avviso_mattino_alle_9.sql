-- Cantiere 29 (Ignazio 18/09): il riepilogo del mattino passa dalle 8 alle 9 di Roma.
-- 9:00 di Roma = 7:00 UTC con l'ora legale, 8:00 UTC con quella solare: si chiama a tutte e due, la funzione Edge spedisce solo alle 9.
-- Stesso nome del lavoro: cron.schedule sostituisce l'orario di «avviso-mattino» (prima '0 6,7 * * *').
select cron.schedule('avviso-mattino', '0 7,8 * * *', $$select chiama_avvisi('mattino')$$);
