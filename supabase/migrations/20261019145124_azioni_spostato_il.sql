-- ═════════════════════════════════════════════════════════════
-- Nota Pagine 061 · «Partecipa» del Partner e Conferme della Dashboard (Ignazio 19/10/2026)
-- Solo aggiunta: `azioni.spostato_il`, il momento in cui chi organizza ha spostato un appuntamento condiviso («Sposta»).
-- Serve alla Dashboard di chi organizza: la risposta del Partner («Partecipa» / «Non può», tabella impegni_risposte) vale
-- solo se data DOPO l'ultimo spostamento; prima, l'appuntamento torna tra le Conferme da fare.
-- Facoltativo, vuoto per tutte le azioni esistenti: niente cambia per loro. Permessi: quelli di tabella già dati ad `azioni`.
-- Nessuna funzione esistente cambia.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`, al rilascio, prima della pubblicazione.
-- ═════════════════════════════════════════════════════════════

alter table public.azioni
  add column if not exists spostato_il timestamptz;
comment on column public.azioni.spostato_il is 'Nota Pagine 061: ultimo «Sposta» di un appuntamento condiviso; la risposta del Partner conta solo se data dopo';
