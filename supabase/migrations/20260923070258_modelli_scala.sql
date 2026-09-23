-- ═══════════════════════════════════════════════════════════
-- Cantiere 41 · Modelli personali per scala (Ignazio 23/09/2026, come NotePlan)
--   modelli.scala → dove compare il modello: giorno (predefinito, quelli di prima) · settimana · mese · periodo (WES) · anno.
--   Un modello del Mese compare in ogni foglio del Mese; la spunta di una voce vale per quel mese
--   (riga di cose_da_fare con modello_id e giorno = primo giorno della scala, come per il giorno).
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

alter table public.modelli
  add column scala text not null default 'giorno' check (scala in ('giorno', 'settimana', 'mese', 'periodo', 'anno'));
