-- Cantiere 24 · passo 2: riepilogo del mattino alle 8 di Roma («Buongiorno! Oggi N telefonate, N appuntamenti»).
-- 8:00 di Roma = 6:00 UTC con l'ora legale, 7:00 UTC con quella solare: si chiama a tutte e due, la funzione Edge spedisce solo alle 8.
select cron.schedule('avviso-mattino', '0 6,7 * * *', $$select chiama_avvisi('mattino')$$);
