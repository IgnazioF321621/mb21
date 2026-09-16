-- ═══════════════════════════════════════════════════════════
-- Cantiere 19 lavoro 4 · abbonamento in comune (coppia, scelta B di Ignazio 16/09)
-- Due utenti con liste separate, un solo pagamento: chi non paga punta a chi paga.
-- La scadenza che conta è quella di `abbonamento_con` (se c'è), altrimenti la propria.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

alter table public.utenti
  add column abbonamento_con uuid references public.utenti(id) on delete set null,
  add constraint utenti_abbonamento_non_se_stesso check (abbonamento_con is null or abbonamento_con <> id);

comment on column public.utenti.abbonamento_con is 'Abbonamento in comune: l''utente che paga anche per questo (coppia). Vuoto = paga per sé.';
