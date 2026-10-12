-- ═════════════════════════════════════════════════════════════
-- Nota Admin 013 · VENDITE → WALLET, il segno «già mandata» (Ignazio 13/10)
--   wallet_il → il giorno in cui la vendita è stata mandata a Wallet (vuoto = ancora da mandare)
--   wallet_id → l'identificativo del movimento in Wallet (per non fare doppioni)
-- Solo aggiunta: due colonne facoltative, nessuna riga esistente cambia, l'app non le usa e non le mostra.
-- Le scrive solo la procedura di invio, eseguita da Claude su richiesta di Ignazio con la chiave di servizio
-- (auth.uid() vuoto, quindi il blocco `vendite_incasso_solo_admin` non la ferma).
-- Permessi: quelli di tabella già dati a `vendite`; nessun GRANT nuovo.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═════════════════════════════════════════════════════════════

alter table public.vendite
  add column wallet_il date,
  add column wallet_id text;
