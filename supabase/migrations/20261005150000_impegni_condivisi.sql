-- ════════════════════════════════════════════════════════════════════════════
-- Impegni condivisi (nota Pagine 027, Ignazio 05/10/2026).
--   • Un appuntamento (`azioni`) lo condivide ogni partner con la persona dell'appuntamento, se è un partner che usa l'app:
--     `condiviso_con` = l'utente che lo riceve (trovato da `utente_del_contatto`: contatti.utente_id oppure codice Amway = utenti.partner_id).
--   • Una serata Team/LdS/OPEN (`spazi`) la condivide solo Ignazio (Admin) con tutto il Team (`condiviso_con` = 'team': il suo ramo in `squadra`)
--     o con una Linea (`condiviso_con` = 'linea', `linea_codice` = il codice Amway di un suo frontale: il ramo di quella persona).
--   • `punti_condivisi`: chi riceve vede anche i punti da trattare (in sola lettura).
--   • Chi riceve vede l'impegno nella sua Agenda («da Ignazio») e risponde «Ci sono / Non ci sono» (`impegni_risposte`, una riga per persona e impegno,
--     con `visto_il` per il pop-up «Hai un nuovo appuntamento»). Chi organizza vede i nomi e il conto delle risposte (`risposte_impegno`).
--   • Niente avvisi push (decisione di Ignazio 05/10): l'avviso lo dà il calendario personale; la funzione Edge `calendario` usa `impegni_ricevuti_di`.
-- Solo aggiunte: campi facoltativi, una tabella nuova, funzioni nuove. Nessuna regola esistente cambia: chi riceve legge attraverso le funzioni
-- (security definer), non con le policy di azioni/spazi; le righe restano di chi organizza. Da applicare al rilascio.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.azioni
  add column if not exists condiviso_con uuid references public.utenti(id) on delete set null,
  add column if not exists punti_condivisi boolean not null default false;

alter table public.spazi
  add column if not exists condiviso_con text check (condiviso_con is null or condiviso_con in ('team', 'linea')),
  add column if not exists linea_codice text,
  add column if not exists punti_condivisi boolean not null default false;

-- ── Le risposte di chi riceve ────────────────────────────────────────────────
create table if not exists public.impegni_risposte (
  id uuid primary key default gen_random_uuid(),
  origine text not null check (origine in ('azione', 'spazio')),
  impegno_id uuid not null,
  utente_id uuid not null references public.utenti(id) on delete cascade,
  visto_il timestamptz,
  risposta text check (risposta is null or risposta in ('ci_sono', 'non_ci_sono')),
  risposto_il timestamptz,
  creato_il timestamptz not null default now(),
  unique (origine, impegno_id, utente_id)
);
alter table public.impegni_risposte enable row level security;
-- ognuno scrive e legge solo le sue risposte (chi organizza le legge con `risposte_impegno`)
create policy "impegni_risposte_own" on public.impegni_risposte
  for all using (utente_id = public.utente_corrente() or public.is_admin())
  with check (utente_id = public.utente_corrente() or public.is_admin());
grant select, insert, update, delete on public.impegni_risposte to authenticated, service_role;

-- ── Il ramo, scendendo: p_codice è p_radice o sta sotto di lui (al massimo 20 passi) ─────────────
create or replace function public.sotto_il_codice(p_radice text, p_codice text)
returns boolean language sql stable security definer set search_path = public as $$
  with recursive giu as (
    select partner_id, 1 as passo from public.squadra where partner_id = p_radice
    union all
    select s.partner_id, g.passo + 1 from public.squadra s join giu g on s.sponsor_id = g.partner_id where g.passo < 20
  )
  select p_radice is not null and p_codice is not null and exists (select 1 from giu where giu.partner_id = p_codice);
$$;
revoke execute on function public.sotto_il_codice(text, text) from public, anon;
grant execute on function public.sotto_il_codice(text, text) to authenticated, service_role;

-- ── L'utente dell'app che un contatto è (stessa regola della targhetta 📱): collegato a mano, oppure per codice Amway ──
create or replace function public.utente_del_contatto(p_contatto uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select u.id from public.contatti c join public.utenti u on u.id = c.utente_id
      where c.id = p_contatto and u.eliminato_il is null and u.accesso_attivo),
    (select u.id from public.contatti c join public.utenti u on u.partner_id = c.codice_amway
      where c.id = p_contatto and c.codice_amway is not null and u.eliminato_il is null and u.accesso_attivo
      order by u.creato_il limit 1));
$$;
revoke execute on function public.utente_del_contatto(uuid) from public, anon;
grant execute on function public.utente_del_contatto(uuid) to authenticated, service_role;

-- ── Condividere un appuntamento con la persona (ogni partner, sui propri) ──────────────────────
-- p_con = true condivide (se la persona usa l'app), false toglie la condivisione; p_punti: vede anche i punti.
-- Risposta: { esito: 'ok', nome, utente } · { esito: 'non_usa_app' } · { esito: 'non_tua' } · { esito: 'se_stesso' }
create or replace function public.condividi_azione(p_azione uuid, p_con boolean, p_punti boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  io uuid := public.utente_corrente();
  a record;
  dest uuid;
  nome_dest text;
begin
  if io is null then raise exception 'Non sei entrato'; end if;
  select * into a from public.azioni where id = p_azione;
  if a is null or (a.user_id <> io and not public.is_admin()) then return jsonb_build_object('esito', 'non_tua'); end if;
  if not coalesce(p_con, false) then
    update public.azioni set condiviso_con = null, punti_condivisi = false where id = p_azione;
    return jsonb_build_object('esito', 'ok');
  end if;
  dest := public.utente_del_contatto(a.contatto_id);
  if dest is null then return jsonb_build_object('esito', 'non_usa_app'); end if;
  if dest = a.user_id then return jsonb_build_object('esito', 'se_stesso'); end if;
  update public.azioni set condiviso_con = dest, punti_condivisi = coalesce(p_punti, false) where id = p_azione;
  select coalesce(nullif(u.nome, ''), u.nome_cognome) into nome_dest from public.utenti u where u.id = dest;
  return jsonb_build_object('esito', 'ok', 'nome', nome_dest, 'utente', dest);
end $$;
revoke execute on function public.condividi_azione(uuid, boolean, boolean) from public, anon;
grant execute on function public.condividi_azione(uuid, boolean, boolean) to authenticated;

-- ── Gli impegni ricevuti da un utente, in una finestra di tempo ───────────────────────────────
-- `impegni_ricevuti_di` è per il servizio (la funzione Edge `calendario`); `impegni_ricevuti` per l'app, sull'utente entrato.
-- Ogni riga: origine ('azione'|'spazio'), id, inizio, fine, titolo (es. «PM 1a1», «Serata Linea Rossi»), tipo, da_nome (chi organizza),
-- link, punti (solo se condivisi), punti_condivisi, visto_il e risposta (le proprie).
create or replace function public.impegni_ricevuti_di(p_utente uuid, p_da timestamptz, p_a timestamptz)
returns table (origine text, id uuid, inizio timestamptz, fine timestamptz, titolo text, tipo text, da_utente uuid, da_nome text,
               link text, punti jsonb, punti_condivisi boolean, visto_il timestamptz, risposta text)
language sql stable security definer set search_path = public as $$
  with me as (select u.id, u.partner_id from public.utenti u where u.id = p_utente)
  select 'azione', a.id, a.inizio, coalesce(a.fine, a.inizio + interval '1 hour'),
         coalesce(a.modalita, a.tipo_azione), a.tipo_azione, a.user_id, coalesce(nullif(o.nome, ''), o.nome_cognome),
         a.link, case when a.punti_condivisi then a.punti end, a.punti_condivisi, r.visto_il, r.risposta
    from public.azioni a
    join public.utenti o on o.id = a.user_id
    left join public.impegni_risposte r on r.origine = 'azione' and r.impegno_id = a.id and r.utente_id = p_utente
   where a.condiviso_con = p_utente and a.user_id <> p_utente and a.inizio >= p_da and a.inizio < p_a
  union all
  select 'spazio', s.id, s.inizio, s.inizio + make_interval(mins => coalesce(s.durata, 60)),
         coalesce(nullif(s.nome, ''), case s.tipo when 'Team' then 'Incontro di Team' when 'LOS' then 'Incontro LdS' else s.tipo end), s.tipo,
         s.user_id, coalesce(nullif(o.nome, ''), o.nome_cognome),
         s.link, case when s.punti_condivisi then s.punti end, s.punti_condivisi, r.visto_il, r.risposta
    from public.spazi s
    join public.utenti o on o.id = s.user_id
    join me on me.partner_id is not null
    left join public.impegni_risposte r on r.origine = 'spazio' and r.impegno_id = s.id and r.utente_id = p_utente
   where s.condiviso_con is not null and s.user_id <> p_utente and s.inizio >= p_da and s.inizio < p_a
     and public.sotto_il_codice(case s.condiviso_con when 'team' then o.partner_id else s.linea_codice end, me.partner_id)
  order by 3;
$$;
revoke execute on function public.impegni_ricevuti_di(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.impegni_ricevuti_di(uuid, timestamptz, timestamptz) to service_role;

create or replace function public.impegni_ricevuti(p_da timestamptz, p_a timestamptz)
returns table (origine text, id uuid, inizio timestamptz, fine timestamptz, titolo text, tipo text, da_utente uuid, da_nome text,
               link text, punti jsonb, punti_condivisi boolean, visto_il timestamptz, risposta text)
language sql stable security definer set search_path = public as $$
  select * from public.impegni_ricevuti_di(public.utente_corrente(), p_da, p_a) where public.utente_corrente() is not null;
$$;
revoke execute on function public.impegni_ricevuti(timestamptz, timestamptz) from public, anon;
grant execute on function public.impegni_ricevuti(timestamptz, timestamptz) to authenticated;

-- ── Le risposte viste da chi organizza: ogni destinatario con la sua risposta (o senza) ───────────
-- Per un appuntamento: la persona con cui è condiviso. Per una serata: tutti gli utenti attivi del ramo (Team) o della Linea, tranne chi organizza.
create or replace function public.risposte_impegno(p_origine text, p_id uuid)
returns table (utente_id uuid, nome text, risposta text, risposto_il timestamptz, visto_il timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare
  io uuid := public.utente_corrente();
  radice text;
  proprietario uuid;
begin
  if io is null then raise exception 'Non sei entrato'; end if;
  if p_origine = 'azione' then
    select a.user_id into proprietario from public.azioni a where a.id = p_id;
    if proprietario is null or (proprietario <> io and not public.is_admin()) then return; end if;
    return query
      select u.id, coalesce(nullif(u.nome, ''), u.nome_cognome), r.risposta, r.risposto_il, r.visto_il
        from public.azioni a join public.utenti u on u.id = a.condiviso_con
        left join public.impegni_risposte r on r.origine = 'azione' and r.impegno_id = a.id and r.utente_id = u.id
       where a.id = p_id;
  elsif p_origine = 'spazio' then
    select s.user_id, case s.condiviso_con when 'team' then o.partner_id when 'linea' then s.linea_codice end
      into proprietario, radice
      from public.spazi s join public.utenti o on o.id = s.user_id where s.id = p_id;
    if proprietario is null or (proprietario <> io and not public.is_admin()) or radice is null then return; end if;
    return query
      select u.id, coalesce(nullif(u.nome, ''), u.nome_cognome), r.risposta, r.risposto_il, r.visto_il
        from public.utenti u
        left join public.impegni_risposte r on r.origine = 'spazio' and r.impegno_id = p_id and r.utente_id = u.id
       where u.id <> proprietario and u.eliminato_il is null and u.accesso_attivo and u.partner_id is not null
         and public.sotto_il_codice(radice, u.partner_id)
       order by r.risposta nulls last, 2;
  end if;
end $$;
revoke execute on function public.risposte_impegno(text, uuid) from public, anon;
grant execute on function public.risposte_impegno(text, uuid) to authenticated;

comment on column public.azioni.condiviso_con is 'Nota Pagine 027: l''utente (partner con l''app) con cui l''appuntamento è condiviso; lo vede nella sua Agenda e nel suo calendario';
comment on column public.spazi.condiviso_con is 'Nota Pagine 027: ''team'' = tutto il ramo di chi organizza, ''linea'' = il ramo di `linea_codice`';
comment on table public.impegni_risposte is 'Nota Pagine 027: visto e «Ci sono / Non ci sono» di chi riceve un impegno condiviso';
