-- ═══════════════════════════════════════════════════════════
-- Cantiere 19 · codice Amway condiviso dalla coppia (scelta A di Ignazio 16/09)
-- Il codice è unico solo per il partner registrato in Amway: Tonya e Filippo hanno lo stesso.
-- Due utenti con lo stesso partner_id vedono la stessa Mappa e gli stessi VPP/VPG.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

alter table public.utenti drop constraint utenti_partner_id_key;
create index utenti_partner_id on public.utenti (partner_id);
