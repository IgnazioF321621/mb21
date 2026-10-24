-- ═══════════════════════════════════════════════════════════
-- Nota Pagine 085 (Ignazio 24/10/2026, «sì», via Regia): nel Training la partner vede tutto quello che vede l'Admin, anche «Le prove del role play»
-- (le SUE) e «Correggi questa carta». Le due tabelle erano solo dell'Admin: si AGGIUNGE una regola di accesso per ognuna.
-- ═══════════════════════════════════════════════════════════
-- ⚠️ MODIFICA (aggiunge regole a tabelle esistenti): ok di Ignazio del 24/10; la applica la Regia al rilascio, PRIMA del codice.
-- Le regole di prima restano come sono (le regole si sommano: l'Admin continua a vedere e scrivere tutto). Copia, dal database del 24/10/2026:
--   training_prove_rp   · policy training_prove_rp_admin   for all · using (is_admin()) · with check (is_admin() and user_id = utente_corrente())
--   training_correzioni · policy training_correzioni_admin for all · using (is_admin()) · with check (is_admin() and user_id = utente_corrente())
-- Permessi: `authenticated` ha già select, insert, update e delete su tutte e due (letto il 24/10): nessun GRANT da aggiungere.
-- Per tornare indietro: drop policy training_prove_rp_mie on public.training_prove_rp; drop policy training_correzioni_mie on public.training_correzioni;
--
-- Cosa cambia:
--  · training_prove_rp: ognuno salva e legge le SUE prove (la conversazione a scelte, una riga per telefonata finita); non vede quelle degli altri.
--  · training_correzioni: ognuno può solo MANDARE le sue correzioni («Correggi questa carta»); leggerle e segnarle risolte resta all'Admin
--    (le correzioni dei partner finiscono nella stessa coda che Claude legge e risolve).
-- Provata in una prova annullata come partner il 24/10/2026 (vedi il messaggio «Rilascia» e STRUTTURA.md).

create policy training_prove_rp_mie on public.training_prove_rp
  for all to authenticated
  using (user_id = public.utente_corrente())
  with check (user_id = public.utente_corrente());

create policy training_correzioni_mie on public.training_correzioni
  for insert to authenticated
  with check (user_id = public.utente_corrente());
