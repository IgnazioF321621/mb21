-- ═══════════════════════════════════════════════════════════
-- Cantiere 41 · Dare un'ora alle cose da fare (time blocking, Ignazio 23/09/2026)
--   cose_da_fare.ora / durata   → la cosa da fare occupa quell'ora del suo `giorno` nella Cronologia (durata in minuti)
--   modello_giorno.ora / durata → la voce del Modello personale compare ogni giorno già a quell'ora
--   Non sono appuntamenti: niente persona, niente esito, non contano da nessuna parte (Check, Core, Report restano sulle azioni).
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

alter table public.cose_da_fare
  add column ora    time,
  add column durata smallint check (durata between 5 and 600);
alter table public.modello_giorno
  add column ora    time,
  add column durata smallint check (durata between 5 and 600);
