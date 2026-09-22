-- ═══════════════════════════════════════════════════════════
-- Cantiere 41 · Il Check del giorno come riga giornaliera del modulo Core N21 (Ignazio 22/09/2026, punto 1)
--   Il modulo «Le 7 abitudini della persona Core» chiede cose che il Check non registrava:
--   titolo_traccia → sezione 4 «Ascoltare 1 CD al giorno»: QUALE traccia CEP (le tracce del percorso N21 hanno già il titolo in `condivisioni`)
--   open           → sezione 6: «Partecipazione OPEN settimanale» (sì il giorno in cui ci si è andati; il mese conta le settimane)
--   counseling     → sezione 7: «Sessione di counseling in data» (sì il giorno della sessione)
-- Il foglio del mese (Modulo Core) legge i Check: una cosa scritta la sera si ritrova già nel modulo.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

alter table public.check_giorno
  add column titolo_traccia text check (char_length(titolo_traccia) <= 120),
  add column open       boolean not null default false,
  add column counseling boolean not null default false;
