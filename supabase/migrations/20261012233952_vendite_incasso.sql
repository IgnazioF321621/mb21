-- ═════════════════════════════════════════════════════════════
-- Nota Admin 013 · VENDITE → WALLET, parte MB21 (Ignazio 12/10)
-- Due campi facoltativi sulla vendita, che compila solo l'Admin dal modulo vendita:
--   pagato_con → come ha pagato il cliente: Contanti / Bonifico
--   incassato  → quanto ha pagato il cliente, in € (la provvigione resta nella vista vendite_conti)
-- Solo aggiunta: nessuna riga esistente cambia, l'app online non li usa, nessuna vista toccata.
-- I permessi sono quelli di tabella già dati a `vendite` (colonne nuove incluse): nessun GRANT nuovo.
-- Il segno «già mandata a Wallet» e la routine di Claude verranno dopo, quando Ignazio avrà provato i campi.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═════════════════════════════════════════════════════════════

alter table public.vendite
  add column pagato_con text check (pagato_con in ('Contanti', 'Bonifico')),
  add column incassato  numeric(10,2) check (incassato >= 0);
