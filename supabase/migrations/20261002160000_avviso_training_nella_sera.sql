-- ═══════════════════════════════════════════════════════════
-- Lista «Avvisi» (Evernote, MB - Avvisi, nota 080) · il Training non ha più un avviso a parte
-- 2 ottobre 2026
-- ═══════════════════════════════════════════════════════════
-- Ignazio (02/10, «gli avvisi sono veramente tanti»): il Training lo ricorda, o lo festeggia, l'avviso della sera
-- (funzione `avvisi`, tipo `check_sera`). L'orologio `avviso-training` (ogni ora dalle 6 alle 20 UTC, creato il 25/09)
-- non serve più: si toglie. La funzione non ha più il tipo `training`.
-- ⚠️ TOGLIE un'attività programmata esistente: si applica al rilascio, con l'«ok» di Ignazio (dato il 02/10), INSIEME alla funzione `avvisi` nuova.
-- Se si applica prima, l'orologio chiama la funzione vecchia e basta: nessun danno. Se si pubblica la funzione senza toglierlo, l'orologio
-- chiama un tipo che non c'è più (risposta vuota, 14 chiamate al giorno sprecate).
-- Per tornare indietro: `select cron.schedule('avviso-training', '0 6-20 * * *', $$select chiama_avvisi('training')$$);` (e la funzione vecchia).
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

select cron.unschedule('avviso-training');
