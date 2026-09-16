-- ═══════════════════════════════════════════════════════════
-- Cantiere 18 lavoro 3 · SCHEDA CONTATTO ↔ PARTNER DELLA MAPPA
-- La Mappa trovava la scheda solo per nome, ma Amway usa il nome anagrafico
-- (es. «Abela, Antonina» e la scheda «Tonya Abela»). Il codice Amway sulla scheda
-- tiene il collegamento anche quando i nomi sono diversi, e resta quando si ricarica il file Amway.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

alter table public.contatti add column codice_amway text;   -- squadra.partner_id (senza vincolo: la squadra si ricarica)

create index contatti_codice_amway on public.contatti (codice_amway) where codice_amway is not null;
