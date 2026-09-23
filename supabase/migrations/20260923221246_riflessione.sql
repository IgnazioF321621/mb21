-- ═══════════════════════════════════════════════════════════
-- Cantiere 42 · Il momento di riflessione dopo ogni appuntamento (Ignazio 23/09/2026)
--   azioni.riflessione → le risposte alle domande di riflessione date dopo l'esito, sull'appuntamento stesso
--                        (niente posto nuovo dove scrivere). Un elenco: [{ chiave, domanda, risposta }, …],
--                        solo le domande a cui si è risposto; vuoto = nessuna riflessione (o «Salta»).
--                        La domanda si salva insieme alla risposta: le domande cambieranno («man mano le rendiamo
--                        più efficaci») e una risposta vecchia deve restare con la sua domanda.
--                        Le domande sono in agenda.js (DOMANDE_PER_TUTTI, DOMANDE_PER_TIPO).
-- Chi la legge: come le azioni, ognuno le sue e l'Admin tutte (policy «azioni_own», nessuna regola nuova).
-- Nessun trigger su azioni: scrivere la riflessione non cambia coda, conti né avvisi.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

alter table public.azioni add column riflessione jsonb
  check (riflessione is null or (jsonb_typeof(riflessione) = 'array' and jsonb_array_length(riflessione) > 0));
