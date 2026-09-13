-- ═══════════════════════════════════════════════════════════
-- Schema dati minimo — Fase 0, Passo 3
-- 13 settembre 2026
-- ═══════════════════════════════════════════════════════════
-- Cinque tabelle: utenti · sequenze · contatti · azioni · coach_note.
-- Campi ricavati dall'export CSV di Glide (13/09/2026), senza la zavorra
-- elencata nel brief (ramo step, NextAction_js, chiavi duplicate).
--
-- Ogni utente vede e scrive solo i propri contatti e azioni; l'admin
-- vede tutto. Sequenze è condivisa: tutti la leggono, solo l'admin la modifica.
--
-- La logica della coda è Fase 1: qui c'è solo `contatti.rientro_il`.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

-- ── utenti ─────────────────────────────────────────────────
-- Glide: User. La riga esiste prima dell'account: `auth_id` si collega
-- al primo login (Fase 3), così i dati si possono importare subito.
create table public.utenti (
  id           uuid primary key default gen_random_uuid(),
  auth_id      uuid unique references auth.users(id) on delete set null,
  email        text not null unique,          -- UtenteEmail
  nome_cognome text not null,                 -- NomeCognome
  nome         text,                          -- FirstName
  partner_id   text unique,                   -- PartnerID Amway, per l'import CSV
  ruolo        text not null default 'ABO' check (ruolo in ('ABO', 'Admin')),
  foto         text,                          -- Photo (URL)
  creato_il    timestamptz not null default now()
);

-- L'utente di chi fa la richiesta. `security definer` perché legge `utenti`
-- scavalcando le sue stesse regole (altrimenti girerebbe in tondo).
create function public.utente_corrente() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.utenti where auth_id = auth.uid();
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.utenti where auth_id = auth.uid() and ruolo = 'Admin');
$$;

alter table public.utenti enable row level security;

create policy "utenti_select" on public.utenti
  for select using (auth_id = auth.uid() or public.is_admin());
create policy "utenti_write_admin" on public.utenti
  for all using (public.is_admin()) with check (public.is_admin());

-- ── sequenze ───────────────────────────────────────────────
-- Glide: Sequenze. Il motore: una riga per fase N21.
create table public.sequenze (
  id                uuid primary key default gen_random_uuid(),
  categoria         text not null check (categoria in ('Prospect', 'Partner', 'Cliente')),  -- Categoria_seq
  tipo_azione       text not null,                                                           -- TipoAzione_seq
  fase              text not null,                                                           -- Fase_seq
  chiave            text generated always as (categoria || '-' || tipo_azione || '-' || fase) stored unique,
  coach             text,                                   -- Coach_seq
  giorni_rientro    integer check (giorni_rientro >= 0),    -- GiorniRientro_seq; vuoto = esce dalla coda
  icona             text,                                   -- Fase_ico (URL)
  area              text,                                   -- Area_seq
  tipo_suggerimento text,                                   -- TipoSuggerim_seq: data · data_o_archivia · partner · cliente
  suggerimento_1    text,                                   -- Sugger.1_seq
  suggerimento_2    text,                                   -- Sugger.2_seq
  suggerimento_3    text                                    -- Sugger.3_seq
);

alter table public.sequenze enable row level security;

create policy "sequenze_select" on public.sequenze
  for select to authenticated using (true);
create policy "sequenze_write_admin" on public.sequenze
  for all using (public.is_admin()) with check (public.is_admin());

-- ── contatti ───────────────────────────────────────────────
-- Glide: Lista Nomi.
create table public.contatti (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.utenti(id) on delete cascade,
  nome          text not null,                -- Nominativo
  professione   text,
  fascia_eta    text,                         -- Fascia Età
  citta         text,                         -- Località
  telefono      text,
  categoria     text check (categoria in
                  ('Prospect', 'Cliente', 'Partner', 'Unlinked', 'Ex Partner/Cliente', 'Archiviato', 'Referral')),
  area          text,                         -- Attività · Prodotti · eSpring · …
  brand         text,
  referral_di   text,                         -- Referral di (nome, testo libero)
  note          text,
  rientro_il    date,                         -- giorno in cui torna in coda; vuoto = fuori coda
  glide_id      text unique,                  -- ContattoID / RowID in Glide
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);

create index contatti_user_rientro on public.contatti (user_id, rientro_il);

alter table public.contatti enable row level security;

create policy "contatti_own" on public.contatti
  for all using (user_id = public.utente_corrente() or public.is_admin())
  with check (user_id = public.utente_corrente() or public.is_admin());

-- ── azioni ─────────────────────────────────────────────────
-- Glide: Azioni. Lo storico, una riga per azione.
-- Tipo, modalità ed esito sono testo: molti esiti storici non esistono in
-- Sequenze (Riordino, Vendita, Demo…). La fase si trova da `chiave`.
create table public.azioni (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.utenti(id) on delete cascade,
  contatto_id uuid not null references public.contatti(id) on delete cascade,
  categoria   text,                           -- categoria del contatto al momento dell'azione
  tipo_azione text,                           -- TipoAzione: Contatto · Piano Marketing · Appuntamento · …
  modalita    text,                           -- AzioneUnica: Telefonata · PM 1a1 · Counseling · …
  esito       text,                           -- EsitoUnico: No Risposta · PM Fissato · …
  chiave      text generated always as (categoria || '-' || tipo_azione || '-' || esito) stored,
  inizio      timestamptz,                    -- DataAzione
  fine        timestamptz,                    -- DataAzione_end
  completata  boolean,                        -- Completed
  area        text,
  brand       text,
  ospite      text,
  note        text,
  coach_script boolean not null default false,  -- Coach_Script: azione preparata con uno script di YesApp
  glide_id    text unique,                    -- RowID in Glide
  creato_il   timestamptz not null default now()  -- DataCreazione
);

create index azioni_contatto on public.azioni (contatto_id, inizio desc);
create index azioni_chiave on public.azioni (chiave);

alter table public.azioni enable row level security;

create policy "azioni_own" on public.azioni
  for all using (user_id = public.utente_corrente() or public.is_admin())
  with check (user_id = public.utente_corrente() or public.is_admin());

-- ── coach_note ─────────────────────────────────────────────
-- Glide: CoachNote. Le chat con YesApp (coach con i libri N21 caricati)
-- su un contatto: situazione, strategia, script. Si leggono prima della chiamata.
create table public.coach_note (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.utenti(id) on delete cascade,
  contatto_id uuid not null references public.contatti(id) on delete cascade,  -- Coach_ContattoID
  tipo_azione text,                           -- Coach_TipoAzione
  testo       text not null,                  -- Coach_Testo
  scritta_il  timestamptz not null default now()  -- Coach_Data
);

create index coach_note_contatto on public.coach_note (contatto_id, scritta_il desc);

alter table public.coach_note enable row level security;

create policy "coach_note_own" on public.coach_note
  for all using (user_id = public.utente_corrente() or public.is_admin())
  with check (user_id = public.utente_corrente() or public.is_admin());
