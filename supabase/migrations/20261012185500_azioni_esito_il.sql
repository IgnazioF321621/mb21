-- ═══════════════════════════════════════════════════════════
-- Nota Azioni 030 (Ignazio 12/10/2026: «quello che conta è il reale, non il previsto»; ok al campo nuovo nella nota).
-- Solo aggiunta: campo nuovo facoltativo, nessun cambio a quello che c'è.
-- `azioni.esito_il` = il giorno (ora di Roma) in cui all'azione è stato dato l'esito. Vuoto per le azioni senza esito
-- e per quelle di prima del rilascio (per loro resta il giorno dell'azione).
-- Si applica al rilascio con `supabase db push`.
-- ═══════════════════════════════════════════════════════════
alter table public.azioni add column if not exists esito_il date;
comment on column public.azioni.esito_il is 'Giorno (Roma) in cui è stato dato l''esito (nota Azioni 030). Vuoto = senza esito o azione di prima del 12/10/2026.';
