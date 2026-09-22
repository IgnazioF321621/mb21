-- ═══════════════════════════════════════════════════════════
-- Cantiere 40 · BSM N21 — Lavoro 6, «Il mio percorso» (Ignazio 21-22/09/2026)
--   Il partner che usa MB21 vede le tracce che il suo sponsor gli ha condiviso, segna «ascoltata» da sé e riceve il passo dopo.
--   È LO STESSO registro (`condivisioni`): la riga che lo sponsor segna «condivisa» è quella che il partner segna «ascoltata».
--   Chi è «lui»: la scheda contatto con `codice_amway` = `utenti.partner_id` di chi è entrato (come «Il mio avvio», cantiere 31/32).
--
--   1. Due regole in più su `condivisioni`: chi è collegato legge e aggiorna le condivisioni fatte a lui (non le crea, non le cancella).
--   2. La traccia segnata «ascoltata» conta nelle Tracce del Check di chi l'ha ascoltata, dal 22/09/2026 (Ignazio 21/09: «sì»),
--      con la stessa strada dei VP Clienti dalle vendite: una riga in `check_giorni_conti` per ogni «ascoltata» (`e_check` = false,
--      `data` = `ascoltata_il`, `tracce` = 1). Il numero scritto a mano nel Check resta (le tracce del CEP): si sommano.
-- ⚠️ La data d'inizio sta qui e in dashboard.js → INIZIO_TRACCE_PERCORSO: si cambiano insieme.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

-- ── 1. chi è collegato vede e segna le sue ──────────────────
-- Vero se il contatto è «io»: la sua scheda porta il mio codice Amway
create or replace function public.e_la_mia_scheda(p_contatto uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.contatti c join public.utenti u on u.id = public.utente_corrente()
    where c.id = p_contatto and u.partner_id is not null and c.codice_amway = u.partner_id
  );
$$;
revoke all on function public.e_la_mia_scheda(uuid) from public;
grant execute on function public.e_la_mia_scheda(uuid) to authenticated;

create policy "condivisioni_mie_lettura" on public.condivisioni
  for select using (public.e_la_mia_scheda(contatto_id));
create policy "condivisioni_mie_ascolto" on public.condivisioni
  for update using (public.e_la_mia_scheda(contatto_id)) with check (public.e_la_mia_scheda(contatto_id));

-- ── 2. la traccia ascoltata conta nel Check di chi l'ha ascoltata ──
-- Le condivisioni «ascoltate» dal 22/09/2026, attribuite all'utente collegato alla scheda (se c'è). security definer:
-- la legge il partner (che non è il proprietario della riga) e lo sponsor (che non vede `utenti.partner_id` degli altri).
create or replace function public.tracce_ascoltate_conti()
returns table (id uuid, user_id uuid, giorno date)
language sql stable security definer set search_path = public as $$
  select k.id, u.id, k.ascoltata_il
  from public.condivisioni k
  join public.contatti c on c.id = k.contatto_id
  join public.utenti u on u.partner_id = c.codice_amway and u.partner_id is not null
  where k.ascoltata and k.ascoltata_il >= date '2026-09-22'
    and (u.id = public.utente_corrente() or public.is_admin());
$$;
revoke all on function public.tracce_ascoltate_conti() from public;
grant execute on function public.tracce_ascoltate_conti() to authenticated;

create or replace view public.check_giorni_conti with (security_invoker = true) as
select id, user_id, data, true as e_check,
       case when data >= date '2026-09-14' then 0 else contatti end as contatti,
       case when data >= date '2026-09-14' then 0 else pm end as pm,
       sponsor_personali, sponsor_gruppo,
       case when data >= date '2026-09-18' then 0 else vp_clienti end as vp_clienti,
       cep, bbs, wes, tracce, pagine
from public.check_giorno
union all
select v.id, v.user_id, v.conta_il, false, 0, 0, 0, 0, v.vp, 0, 0, 0, 0, 0
from public.vendite_conti v
where v.conta_il >= date '2026-09-18'
union all
select z.id, z.user_id, z.giorno, false, z.contatti, z.pm, 0, 0, 0, 0, 0, 0, 0, 0
from public.azioni_conti z
union all
select t.id, t.user_id, t.giorno, false, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0
from public.tracce_ascoltate_conti() t;

-- ── 3. le mie condivisioni, per «Il mio percorso» ────────────
-- Le tracce che mi sono state condivise (io = la scheda con il mio codice Amway), con chi me le ha mandate. security definer:
-- il partner non vede la lista dello sponsor né `utenti` degli altri. Vuoto se non ho una scheda collegata.
create or replace function public.mio_sharing()
returns table (id uuid, materiale_id uuid, condivisa_il date, ascoltata boolean, ascoltata_il date, sponsor text, con_scheda boolean)
language sql stable security definer set search_path = public as $$
  with io as (
    select c.id from public.contatti c join public.utenti u on u.id = public.utente_corrente()
    where u.partner_id is not null and c.codice_amway = u.partner_id
  )
  select k.id, k.materiale_id, k.condivisa_il, k.ascoltata, k.ascoltata_il, s.nome, true
  from public.condivisioni k join io on io.id = k.contatto_id join public.utenti s on s.id = k.user_id
  union all
  select null, null, null, null, null, null, exists (select 1 from io)
  where not exists (select 1 from public.condivisioni k join io on io.id = k.contatto_id);
$$;
revoke all on function public.mio_sharing() from public;
grant execute on function public.mio_sharing() to authenticated;

-- ── 4. il partner segna, lo sponsor lo sa (Ignazio 22/09) ──────
--   segnata_dal_partner → «ascoltata» l'ha toccato il partner dalla sua Dashboard (non lo sponsor dalla scheda): fa partire l'avviso
--   chiede_prossima_il  → dopo «Ascoltata» ha risposto «Sì, avvisalo» a «Vuoi che <sponsor> ti condivida la prossima?»
--   avviso_sponsor_il   → quando è partito allo sponsor «<nome> ha ascoltato … (e chiede la prossima). Sentitevi!»
--   avviso_ascolto_il   → quando è partito al partner (con l'app) «La traccia che ti ha mandato <sponsor> scade domani: ascoltala»
-- Gli avvisi di scadenza sono UNO SOLO, a 48 ore, per tutti e due (Ignazio: «uniformiamolo»): `avviso_24_il` non si usa più.
alter table public.condivisioni add column if not exists segnata_dal_partner boolean not null default false;
alter table public.condivisioni add column if not exists chiede_prossima_il timestamptz;
alter table public.condivisioni add column if not exists avviso_sponsor_il timestamptz;
alter table public.condivisioni add column if not exists avviso_ascolto_il timestamptz;
