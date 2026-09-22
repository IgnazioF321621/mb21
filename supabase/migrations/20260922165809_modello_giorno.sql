-- ═══════════════════════════════════════════════════════════
-- Cantiere 41 · L'Agenda come NotePlan — Lavoro 2, «Il modello del giorno» (Ignazio 22/09/2026)
--   modello_giorno → le cose di ogni giorno, scritte una volta: compaiono da sole nel foglio del giorno, sopra le cose
--                    scritte a mano. Legate al lavoro Amway/N21 («tipo il programma Core»): l'app le propone già pronte
--                    (`core` = chiave della voce Core N21, vuota per le voci personali). `giorni` = i giorni della settimana
--                    in cui compare (1 = lunedì … 7 = domenica; vuoto = ogni giorno). Una voce del modello NON si riporta
--                    a domani: domani ha la sua.
--   cose_da_fare   → `modello_id`: la spunta di una voce del modello in un giorno è una riga di cose_da_fare con
--                    `modello_id` pieno (una sola per voce e giorno); si cancella togliendo la spunta.
--                    `scala`: su che scala sta la cosa (giorno · settimana · mese · periodo · anno; `giorno` = primo giorno
--                    della scala). Struttura di riferimento del cantiere 41: le stesse scale di NotePlan. Per ora l'app
--                    usa solo `giorno`.
-- Ognuno vede e scrive le sue, l'Admin tutte (come `cose_da_fare`).
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create table public.modello_giorno (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.utenti(id) on delete cascade,
  testo     text not null check (char_length(testo) between 1 and 200),
  giorni    smallint[] not null default '{}',       -- 1 = lunedì … 7 = domenica; vuoto = ogni giorno
  ordine    integer not null default 0,
  attivo    boolean not null default true,
  core      text,                                   -- chiave della voce Core N21 proposta dall'app (vuota = voce personale)
  creato_il timestamptz not null default now(),
  check (giorni <@ '{1,2,3,4,5,6,7}'::smallint[])
);
create index modello_giorno_utente on public.modello_giorno (user_id);
alter table public.modello_giorno enable row level security;
create policy "modello_giorno_own" on public.modello_giorno
  for all using (user_id = public.utente_corrente() or public.is_admin())
  with check (user_id = public.utente_corrente() or public.is_admin());

alter table public.cose_da_fare
  add column modello_id uuid references public.modello_giorno(id) on delete cascade,
  add column scala text not null default 'giorno' check (scala in ('giorno', 'settimana', 'mese', 'periodo', 'anno'));
create unique index cose_da_fare_modello_giorno on public.cose_da_fare (modello_id, giorno) where modello_id is not null;
