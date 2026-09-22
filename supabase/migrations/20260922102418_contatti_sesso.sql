-- ═══════════════════════════════════════════════════════════
-- Cantiere 40 · BSM N21 — Lavoro 4, lo Sharing nella scheda (Ignazio 22/09/2026, strada «A»)
--   contatti.sesso → serve al consiglio della prossima traccia: le tracce «solo donne» (per chi è indicata: pubblico
--   femminile) non si propongono a un uomo. Si chiede nel modulo Nuovo Contatto / Modifica; per i contatti che ci sono già
--   l'app lo chiede solo quando serve, la prima volta che si apre lo Sharing di quella persona.
--   La vista `contatti_lista` non cambia: la scheda lo legge da `contatti` quando apre lo Sharing (come il compleanno).
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

alter table public.contatti
  add column sesso text check (sesso in ('M', 'F'));   -- vuoto = non ancora detto

comment on column public.contatti.sesso is 'M/F, cantiere 40: il consiglio delle tracce salta le «solo donne» per gli uomini; vuoto = non ancora detto.';
