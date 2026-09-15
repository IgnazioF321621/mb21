-- ═══════════════════════════════════════════════════════════
-- Admin sui dati del partner scelto (cantiere 15, decisioni di Ignazio 15/09)
-- ═══════════════════════════════════════════════════════════
-- Con il Partner Select l'Admin vede la coda di OGGI di un partner (senza premere gli esiti)
-- e corregge i suoi dati a nome suo.
--
-- 1. contatti_coda: l'Admin legge le righe di tutti (l'app filtra per partner); in fondo `user_id`.
--    Un partner continua a vedere solo le sue.
-- 2. stato_oggi(p_utente): numeri di oggi di un altro partner (vuoto = chi è loggato). Le regole di
--    accesso di `utenti` lasciano leggere gli altri solo all'Admin.
-- 3. registra_esito: l'azione è del proprietario del contatto (prima: di chi preme). Per un partner è
--    lo stesso (vede solo i suoi contatti); per l'Admin su un contatto di Isabella l'azione va a Isabella.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

-- ── 1. contatti_coda ───────────────────────────────────────
create or replace view public.contatti_coda with (security_invoker = true) as
select c.id, c.nome, c.professione, c.fascia_eta, c.citta, c.telefono, c.categoria,
       c.rientro_il, c.in_coda_dal,
       u.esito        as ultima_fase,
       u.tipo_azione  as ultimo_tipo,
       u.inizio       as ultima_il,
       (u.id is not null) as contattato,
       s.giorni_rientro as ultimi_giorni,
       coalesce(s.coach, case when u.id is null then m.coach end) as coach,
       u.modalita     as ultima_modalita,
       coalesce(u.area, c.area) as ultima_area,
       c.user_id
from public.contatti c
left join lateral (
  select a.id, a.esito, a.tipo_azione, a.inizio, a.chiave, a.modalita, a.area
  from public.azioni a where a.contatto_id = c.id
  order by a.inizio desc nulls last, a.creato_il desc limit 1
) u on true
left join public.sequenze s on s.chiave = u.chiave
left join public.sequenze m on m.chiave = 'Prospect-Contatto-Mai contattato o 2+ anni'
where c.user_id = public.utente_corrente() or public.is_admin();

-- ── 2. stato_oggi(p_utente) ────────────────────────────────
drop function public.stato_oggi();
create function public.stato_oggi(p_utente uuid default null) returns json
language sql stable security invoker set search_path = public as $$
  select json_build_object(
    'contatti_al_giorno', u.contatti_al_giorno,
    'fatti_oggi', (select count(*) from public.azioni a
                   where a.user_id = u.id and a.da_coda
                     and a.inizio >= (date_trunc('day', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome')))
  from public.utenti u where u.id = coalesce(p_utente, public.utente_corrente());
$$;

-- ── 3. registra_esito: azione del proprietario del contatto ─
create or replace function public.registra_esito(p_contatto uuid, p_chiave text, p_data timestamptz default null,
                                                 p_modalita text default 'Telefonata', p_da_coda boolean default false)
returns json language plpgsql security invoker set search_path = public as $$
declare
  v_seq   public.sequenze;
  v_prec  public.contatti;
  v_oggi  date := (now() at time zone 'Europe/Rome')::date;
  v_id    uuid;
begin
  select * into v_seq from public.sequenze where chiave = p_chiave;
  if not found then raise exception 'Fase non trovata: %', p_chiave; end if;

  select * into v_prec from public.contatti where id = p_contatto;
  if not found then raise exception 'Contatto non trovato'; end if;

  insert into public.azioni (user_id, contatto_id, categoria, tipo_azione, modalita, esito, inizio, completata,
                             data_scelta, da_coda)
  values (v_prec.user_id, p_contatto, v_seq.categoria, v_seq.tipo_azione, p_modalita, v_seq.fase, now(), true,
          p_data, p_da_coda)
  returning id into v_id;

  update public.contatti set
    rientro_il = case
      when v_seq.fase in ('PM Fissato', 'Appuntamento') then null   -- lo segue l'appuntamento (15/09)
      when p_data is not null then (p_data at time zone 'Europe/Rome')::date
      when v_seq.giorni_rientro is not null then v_oggi + v_seq.giorni_rientro
    end,
    in_coda_dal = null,
    aggiornato_il = now()
  where id = p_contatto;

  return json_build_object('azione_id', v_id, 'rientro_prec', v_prec.rientro_il, 'in_coda_prec', v_prec.in_coda_dal);
end $$;
