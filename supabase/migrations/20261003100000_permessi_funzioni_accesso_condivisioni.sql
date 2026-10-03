-- ═══════════════════════════════════════════════════════════
-- Fondamenta e Backup, note 005 · 035 · 017 (audit del 03/10/2026) — permessi e funzioni esistenti
-- 3 ottobre 2026
-- ═══════════════════════════════════════════════════════════
-- ⚠️ MODIFICA funzioni, permessi e regole esistenti: ok di Ignazio del 03/10/2026 a PREPARARLA. La applica la Regia al rilascio
-- (`supabase db push`), insieme alle righe nuove di pagina-sharing.js (segna_mia_traccia) e admin.js (doppioni) dello stesso commit.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21).
--
-- 005 · Supabase dà a ogni funzione nuova il permesso di esecuzione ai ruoli anon, authenticated e service_role direttamente
--       (pg_default_acl), non tramite «public»: il «revoke … from public» delle migrazioni vecchie non toglieva anon. Qui si toglie
--       anon (e public) da tutte le funzioni «con permessi speciali» (security definer) tranne quelle che servono prima di entrare
--       o alle regole di accesso delle tabelle: richiedi_accesso · utente_corrente · is_admin · mia_richiesta · nel_mio_ramo ·
--       e_la_mia_scheda. I trigger non si toccano. In più _scheda_segni, schede_utenti_app ed e_utente_mb21 (le tre che non
--       controllavano chi chiama) rispondono solo a chi è entrato (auth.uid() non nullo).
-- 035 · richiedi_accesso: freno per indirizzo (3 richieste al giorno per la stessa email) oltre a quello globale, alzato da 20 a 100
--       l'ora; email già di un utente → risponde «ok» come a tutti (si segna la riga con stato `gia_utente` per l'Admin, non si dice
--       a chi chiede); richiesta già in attesa → «ok» senza aggiungere nulla. Il vincolo di `stato` accetta `gia_utente`.
-- 017 · condivisioni: le regole `condivisioni_mie_lettura` / `condivisioni_mie_ascolto` davano al partner che riceve una traccia
--       TUTTE le colonne, anche `note` (il testo privato dello sponsor), e l'aggiornamento di qualsiasi colonna. Si tolgono: il
--       partner legge già dalle funzioni `mio_sharing` e `mie_tracce` (senza `note`) e segna «ascoltata» / «chiede la prossima»
--       con la funzione nuova `segna_mia_traccia`, che tocca solo ascoltata · ascoltata_il · segnata_dal_partner · chiede_prossima_il.
--
-- Per tornare indietro: 005 → `grant execute on function … to anon` sulle funzioni dell'elenco e le tre funzioni senza il filtro
-- (20260917120000, 20260917211500); 035 → corpo di richiedi_accesso in 20260916194500 + vincolo senza `gia_utente` (dopo aver
-- tolto le righe con quello stato); 017 → le due regole in 20260922141029 r. 28-31 e `drop function segna_mia_traccia`.
-- ═══════════════════════════════════════════════════════════

-- ── 005 · niente anon sulle funzioni con permessi speciali ──
revoke execute on function public._scheda_segni(text, uuid) from public, anon;
revoke execute on function public.approva_richiesta(uuid) from public, anon;
revoke execute on function public.avvio_del_ramo() from public, anon;
revoke execute on function public.biglietti_da_segnare() from public, anon;
revoke execute on function public.collega_account() from public, anon;
revoke execute on function public.collega_utente_mb21(uuid, uuid) from public, anon;
revoke execute on function public.e_utente_mb21(uuid) from public, anon;
revoke execute on function public.efficacia_del_ramo(date) from public, anon;
revoke execute on function public.imposta_contatti_al_giorno(integer) from public, anon;
revoke execute on function public.imposta_foto(text) from public, anon;
revoke execute on function public.imposta_telefono(text) from public, anon;
revoke execute on function public.mie_tracce(date, date) from public, anon;
revoke execute on function public.miei_biglietti(date) from public, anon;
revoke execute on function public.miei_segni() from public, anon;
revoke execute on function public.mio_sharing() from public, anon;
revoke execute on function public.obiettivi_del_ramo(date) from public, anon;
revoke execute on function public.pm_del_ramo(integer) from public, anon;
revoke execute on function public.scadenza_abbonamento(uuid) from public, anon;
revoke execute on function public.schede_utenti_app() from public, anon;
revoke execute on function public.segna_mio_biglietto(text, date, boolean, boolean, integer) from public, anon;
revoke execute on function public.segna_mio_cep() from public, anon;
revoke execute on function public.segna_uso() from public, anon;
revoke execute on function public.segni_del_ramo() from public, anon;
revoke execute on function public.togli_mio_biglietto(text, date) from public, anon;
revoke execute on function public.togli_mio_cep() from public, anon;
revoke execute on function public.tracce_ascoltate_conti() from public, anon;

-- Le tre che non controllavano chi chiama: solo a chi è entrato (stesso corpo di prima, più il filtro)
create or replace function public._scheda_segni(p_partner text, p_utente uuid) returns public.contatti
language sql stable security definer set search_path = public as $$
  select c.* from public.contatti c
   where auth.uid() is not null and c.codice_amway = p_partner
   order by (c.user_id = (select id from public.utenti where ruolo = 'Admin' order by creato_il limit 1)) desc,
            (c.user_id = p_utente) desc, c.id
   limit 1;
$$;

create or replace function public.schede_utenti_app() returns table (contatto_id uuid, ultimo_uso timestamptz, nomi integer)
language sql stable security definer set search_path = public as $$
  with aggancio as (
    select c.id as contatto_id, u.id as utente_id
      from contatti c join utenti u on u.id = c.utente_id
     where u.eliminato_il is null
    union
    select c.id, u.id
      from contatti c join squadra s on s.partner_id = c.codice_amway
      join utenti u on lower(trim(u.email)) = lower(trim(s.email))
     where s.email is not null and u.eliminato_il is null
  )
  select a.contatto_id, max(u.ultimo_uso),
         sum((select count(*) from contatti c where c.user_id = u.id and c.categoria is distinct from 'Archiviato'))::integer
    from aggancio a join utenti u on u.id = a.utente_id
   where auth.uid() is not null
   group by a.contatto_id;
$$;

create or replace function public.e_utente_mb21(p_contatto uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then null
    when exists (select 1 from contatti c join utenti u on u.id = c.utente_id
                  where c.id = p_contatto and u.eliminato_il is null) then 'collegato'
    when exists (select 1 from contatti c join squadra s on s.partner_id = c.codice_amway
                  join utenti u on lower(trim(u.email)) = lower(trim(s.email))
                  where c.id = p_contatto and s.email is not null and u.eliminato_il is null) then 'amway'
  end;
$$;

-- ── 035 · richiesta di accesso ──
alter table public.richieste_accesso drop constraint richieste_accesso_stato_check;
alter table public.richieste_accesso add constraint richieste_accesso_stato_check
  check (stato in ('in_attesa', 'approvata', 'rifiutata', 'gia_utente'));
comment on column public.richieste_accesso.stato is 'in_attesa · approvata · rifiutata · gia_utente (richiesta con l''email di un utente che c''è già: a chi chiede si risponde «ok», l''Admin la vede come doppione)';

create or replace function public.richiedi_accesso(p_nome text, p_email text, p_telefono text, p_codice text, p_invitato_da uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_email  text := lower(trim(coalesce(p_email, '')));
  v_nome   text := regexp_replace(trim(coalesce(p_nome, '')), '\s+', ' ', 'g');
  v_cod    text := regexp_replace(coalesce(p_codice, ''), '\s', '', 'g');
  v_utente uuid;
begin
  if char_length(v_nome) < 3 or char_length(v_nome) > 80 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     or char_length(v_email) > 120 or v_cod !~ '^[0-9]{3,15}$' or char_length(coalesce(p_telefono, '')) > 30 then
    return 'dati';
  end if;
  -- freno per indirizzo: 3 richieste al giorno con la stessa email (contano anche i doppioni «già utente»)
  if (select count(*) from richieste_accesso where lower(email) = v_email and creato_il > now() - interval '1 day') >= 3 then return 'troppe'; end if;
  -- freno globale: 100 l'ora (era 20, e bastavano 20 richieste finte per chiudere la porta a tutti)
  if (select count(*) from richieste_accesso where creato_il > now() - interval '1 hour') >= 100 then return 'troppe'; end if;
  -- email già di un utente: si risponde «ok» come a tutti (chi prova email a caso non scopre chi usa l'app); l'Admin vede il doppione
  select id into v_utente from utenti where lower(email) = v_email and eliminato_il is null order by creato_il limit 1;
  if v_utente is not null then
    insert into richieste_accesso (nome_cognome, email, telefono, codice_amway, invitato_da, stato, utente_id, gestita_il)
    values (v_nome, v_email, nullif(trim(coalesce(p_telefono, '')), ''), v_cod, (select id from utenti where id = p_invitato_da), 'gia_utente', v_utente, now());
    return 'ok';
  end if;
  -- richiesta già in attesa con questa email: «ok», senza aggiungerne un'altra (stesso motivo: non si rivela niente)
  if exists (select 1 from richieste_accesso where lower(email) = v_email and stato = 'in_attesa') then return 'ok'; end if;
  insert into richieste_accesso (nome_cognome, email, telefono, codice_amway, invitato_da)
  values (v_nome, v_email, nullif(trim(coalesce(p_telefono, '')), ''), v_cod, (select id from utenti where id = p_invitato_da));
  return 'ok';
end $$;

-- ── 017 · condivisioni: il partner che riceve non legge più la riga intera ──
drop policy if exists condivisioni_mie_lettura on public.condivisioni;
drop policy if exists condivisioni_mie_ascolto on public.condivisioni;

-- «Ascoltata» (e «chiede la prossima») segnati dal partner che ha ricevuto la traccia: solo le sue condivisioni, solo queste colonne
create or replace function public.segna_mia_traccia(p_id uuid, p_chiede boolean default false) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from condivisioni k where k.id = p_id and public.e_la_mia_scheda(k.contatto_id)) then
    raise exception 'Questa traccia non è stata condivisa con te';
  end if;
  if coalesce(p_chiede, false) then
    update condivisioni set chiede_prossima_il = now() where id = p_id;
  else
    update condivisioni set ascoltata = true, ascoltata_il = (now() at time zone 'Europe/Rome')::date, segnata_dal_partner = true where id = p_id;
  end if;
end $$;
revoke execute on function public.segna_mia_traccia(uuid, boolean) from public, anon;
grant execute on function public.segna_mia_traccia(uuid, boolean) to authenticated, service_role;
comment on function public.segna_mia_traccia(uuid, boolean) is 'Il partner che ha ricevuto una traccia la segna ascoltata (p_chiede=false) o chiede la prossima (p_chiede=true): tocca solo ascoltata, ascoltata_il, segnata_dal_partner, chiede_prossima_il.';
