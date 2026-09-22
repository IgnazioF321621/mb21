-- ═══════════════════════════════════════════════════════════
-- Cantiere 41 · abitudine 7 «Lavorare di squadra» nel Check del giorno (Ignazio 22/09/2026)
--   edificazione  → «oggi ho praticato il principio dell'edificazione»
--   no_crossline  → «oggi ho praticato il principio del no-crossline»
--   (counseling c'è già). Il Modulo Core del mese le legge: SI se almeno un giorno del mese è spuntato.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

alter table public.check_giorno
  add column edificazione boolean not null default false,
  add column no_crossline boolean not null default false;
