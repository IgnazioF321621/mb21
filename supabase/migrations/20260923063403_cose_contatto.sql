-- ═══════════════════════════════════════════════════════════
-- Cantiere 41 · Una cosa da fare collegata a una persona (Ignazio 23/09/2026)
--   cose_da_fare.contatto_id → facoltativo: la persona (Prospect, Partner o Cliente) a cui la cosa si riferisce
--   («Messaggio a Roberto per eSpring»). Resta una cosa da fare: niente esito, non conta. Se il contatto sparisce, il legame si toglie.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

alter table public.cose_da_fare add column contatto_id uuid references public.contatti(id) on delete set null;
