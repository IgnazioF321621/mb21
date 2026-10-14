-- ═════════════════════════════════════════════════════════════
-- Nota Admin 014 · MESSAGGI DALLA SQUADRA all'apertura dell'app (Ignazio 14/10)
--   messaggi               → un messaggio per riga: titolo, testo, luogo (hotel e indirizzo), link al materiale, per chi
--   messaggi_destinatari   → le persone scelte (solo se il messaggio non è per tutti)
--   messaggi_letti         → chi ha toccato «Ho capito» (una volta letto non torna su nessun dispositivo)
-- Li scrive solo l'Admin. Un messaggio non scade e non si cancella da solo: resta finché l'Admin lo elimina (Ignazio 14/10).
-- Ognuno vede i messaggi per tutti e quelli a lui indirizzati; segna lui stesso «Ho capito»; l'Admin vede tutto, anche chi ha letto.
-- Solo tabelle nuove: l'app online non le usa. Nessuna push, nessun file caricato (il materiale è un link). Costo zero.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═════════════════════════════════════════════════════════════

create table public.messaggi (
  id               uuid primary key default gen_random_uuid(),
  titolo           text not null check (char_length(btrim(titolo)) between 1 and 80),
  testo            text check (char_length(testo) <= 1500),
  luogo            text check (char_length(luogo) <= 200),
  link_materiale   text check (char_length(link_materiale) <= 500 and link_materiale ~* '^https?://[^\s]+$'),
  per_tutti        boolean not null default true,
  creato_da        uuid references public.utenti(id) on delete set null default public.utente_corrente(),
  creato_il        timestamptz not null default now()
);

create table public.messaggi_destinatari (
  messaggio_id  uuid not null references public.messaggi(id) on delete cascade,
  utente_id     uuid not null references public.utenti(id) on delete cascade,
  primary key (messaggio_id, utente_id)
);

create table public.messaggi_letti (
  messaggio_id  uuid not null references public.messaggi(id) on delete cascade,
  utente_id     uuid not null references public.utenti(id) on delete cascade,
  letto_il      timestamptz not null default now(),
  primary key (messaggio_id, utente_id)
);

alter table public.messaggi enable row level security;
alter table public.messaggi_destinatari enable row level security;
alter table public.messaggi_letti enable row level security;

-- messaggi: l'Admin tutto; gli altri solo quelli per tutti o a loro indirizzati
create policy "messaggi_select" on public.messaggi for select using (
  public.is_admin()
  or (public.utente_corrente() is not null and (per_tutti or exists (
        select 1 from public.messaggi_destinatari d where d.messaggio_id = messaggi.id and d.utente_id = public.utente_corrente()))));
create policy "messaggi_scrive_admin" on public.messaggi for all using (public.is_admin()) with check (public.is_admin());

-- destinatari: ognuno vede le proprie righe, l'Admin tutto e solo lui scrive
create policy "messaggi_destinatari_select" on public.messaggi_destinatari for select using (public.is_admin() or utente_id = public.utente_corrente());
create policy "messaggi_destinatari_scrive_admin" on public.messaggi_destinatari for all using (public.is_admin()) with check (public.is_admin());

-- letti: ognuno vede e segna i propri (solo di messaggi che può vedere), l'Admin vede tutti
create policy "messaggi_letti_select" on public.messaggi_letti for select using (public.is_admin() or utente_id = public.utente_corrente());
create policy "messaggi_letti_insert" on public.messaggi_letti for insert with check (
  utente_id = public.utente_corrente() and exists (select 1 from public.messaggi m where m.id = messaggio_id));

-- permessi espliciti (tabelle nuove, CLAUDE.md § 4): niente `anon`, niente `public`
revoke all on public.messaggi, public.messaggi_destinatari, public.messaggi_letti from public, anon;
grant select, insert, update, delete on public.messaggi, public.messaggi_destinatari to authenticated, service_role;
grant select, insert on public.messaggi_letti to authenticated;
grant select, insert, update, delete on public.messaggi_letti to service_role;
