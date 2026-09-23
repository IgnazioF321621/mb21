-- ═══════════════════════════════════════════════════════════
-- Cantiere 41 · MB Plan, Progetti come un foglio Word (Ignazio 23/09/2026): titoli e rientri
--   cose_da_fare.tipo    → in più 'titolo' (il titolo di una parte del progetto: niente spunta, riparte la numerazione)
--   cose_da_fare.livello → il rientro della riga (0 = a sinistra, fino a 4): con Tab si va avanti, con Maiusc+Tab indietro;
--                          la numerazione diventa 1. → 1.1 → 1.1.1 come in Word.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════
alter table public.cose_da_fare drop constraint cose_da_fare_tipo_check;
alter table public.cose_da_fare add constraint cose_da_fare_tipo_check check (tipo in ('cosa', 'numero', 'punto', 'titolo'));
alter table public.cose_da_fare add column livello smallint not null default 0 check (livello between 0 and 4);
