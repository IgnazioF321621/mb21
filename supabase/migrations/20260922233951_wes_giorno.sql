-- ═══════════════════════════════════════════════════════════
-- Cantiere 41 · Periodo WES in MB Plan (Ignazio 22/09/2026)
--   wes.giorno → il PRIMO GIORNO del WES (facoltativo, dentro il mese del WES). Serve solo a MB Plan per dire
--                «mancano N giorni al WES». Segni vitali, biglietti e Report restano al mese (`wes.data`).
--   cose_da_fare con scala 'periodo': `giorno` = il mese del WES che apre il periodo (wes.data).
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

alter table public.wes
  add column giorno date check (giorno is null or (giorno >= data and giorno < (data + interval '1 month')::date));
