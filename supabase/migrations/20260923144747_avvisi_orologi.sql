-- ═══════════════════════════════════════════════════════════
-- Cantiere 43, lavoro 4 · gli orologi degli avvisi, ora che ognuno sceglie quando
-- 23 settembre 2026
-- ═══════════════════════════════════════════════════════════
-- Va insieme alla funzione Edge `avvisi` nuova (regole in supabase/functions/avvisi/regole.ts).
--  - promemoria da ogni 5 minuti a OGNI MINUTO (per rispettare «5 · 10 minuti prima»)
--  - mattino ogni ora dalle 5 alle 9 UTC = dalle 7 alle 10 di Roma sia con l'ora legale sia con la solare
--    (la funzione avvisa chi ha scelto l'ora di Roma di quel momento: ognuno una volta sola)
--  - check della sera ogni ora dalle 18 alle 21 UTC = dalle 20 alle 22 di Roma, legale e solare
--  «Com'è andata?» (ogni 5 minuti) e tracce (ogni 15) non cambiano.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

select cron.schedule('avviso-promemoria', '* * * * *', $$select chiama_avvisi('promemoria')$$);
select cron.schedule('avviso-mattino', '0 5-9 * * *', $$select chiama_avvisi('mattino')$$);
select cron.schedule('avviso-check-sera', '0 18-21 * * *', $$select chiama_avvisi('check_sera')$$);
