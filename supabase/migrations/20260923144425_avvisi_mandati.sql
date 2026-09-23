-- ═══════════════════════════════════════════════════════════
-- Cantiere 43, lavoro 3 · il segno «già avvisato» delle cose da fare e delle voci dei modelli
-- 23 settembre 2026
-- ═══════════════════════════════════════════════════════════
-- Va insieme alla funzione Edge `avvisi` nuova (regole in supabase/functions/avvisi/regole.ts).
--
-- 1. avvisi_mandati: il segno «già avvisato» delle cose da fare con l'ora e delle voci dei modelli
--    (gli appuntamenti e le telefonate hanno già azioni.promemoria_il). Una voce del modello non ha una riga
--    per ogni giorno, per questo il segno sta qui: chiave «cosa:<id>:<giorno>:<ora>» o «voce:<id>:<giorno>:<ora>»,
--    così una cosa spostata a un'altra ora avvisa di nuovo. La scrive e la legge solo la funzione (chiave di servizio):
--    regole di accesso accese e nessun permesso per gli utenti. Le righe di più di 3 giorni le toglie la funzione.
-- Gli orologi nuovi stanno nella migrazione dopo (20260923144747_avvisi_orologi.sql).
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create table public.avvisi_mandati (
  chiave     text primary key,
  user_id    uuid references public.utenti(id) on delete cascade,
  mandato_il timestamptz not null default now()
);
alter table public.avvisi_mandati enable row level security;
revoke all on public.avvisi_mandati from anon, authenticated;
