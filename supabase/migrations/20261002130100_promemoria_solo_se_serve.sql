-- ═══════════════════════════════════════════════════════════
-- Lista «Avvisi» (Evernote, MB - Avvisi, nota 030) · l'orologio dei promemoria chiama la funzione solo se serve
-- 2 ottobre 2026
-- ═══════════════════════════════════════════════════════════
-- Prima: ogni 5 minuti, dalle 04:00 alle 22:55 UTC, `select chiama_avvisi('promemoria')` (circa 204 chiamate al giorno).
-- Dopo: stessi orari, ma `select chiama_avvisi('promemoria') where promemoria_da_mandare()`: la funzione Edge parte solo se la domanda
-- leggera (20261002130000_promemoria_da_mandare.sql) dice «sì». Gli orari restano ogni 5 minuti: con la domanda nel database
-- costano quasi niente e gli avvisi restano puntuali come adesso.
-- Cambia un'attività programmata esistente: va applicata al rilascio, con l'«ok» di Ignazio (dopo la prova a vuoto della sua parte).
-- Per tornare indietro: `select cron.alter_job((select jobid from cron.job where jobname='avviso-promemoria'), command => $$select chiama_avvisi('promemoria')$$);`
-- Va DOPO 20261002130000_promemoria_da_mandare.sql.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`, al rilascio.
-- ═══════════════════════════════════════════════════════════

select cron.alter_job((select jobid from cron.job where jobname = 'avviso-promemoria'),
  command => $$select chiama_avvisi('promemoria') where promemoria_da_mandare()$$);
