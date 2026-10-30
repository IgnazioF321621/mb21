-- ════════════════════════════════════════════════════════════════════════════
-- Nota Admin 006 (Ignazio 30/10/2026): «Quando io guardo come Isabella, mi deve aprire tutti i dati di Isabella… Qua non c'è privacy.»
-- Con il Partner Select su un altro partner, l'Admin deve vedere quello che vede quel partner. Questa migrazione SOLO AGGIUNGE:
--  1) regole di lettura per l'Admin sulle 5 tabelle del Training (prima solo il proprietario: carte, giorni, test, fascia, prove di role play);
--  2) quattro funzioni «gemelle» con l'utente da guardare come parametro: mio_avvio_di, mio_percorso_di, miei_segni_di, mio_sharing_di.
--     Le funzioni di oggi (senza parametro) NON cambiano: l'app online non nota nulla. Le gemelle rispondono a chi chiede per sé o all'Admin.
-- Niente scrittura: l'Admin guarda, non scrive al posto del partner (soloGuardo resta com'è).
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Training: lettura anche all'Admin (le regole del proprietario restano)
create policy "training_carte_admin_leggi" on public.training_carte for select using (public.is_admin());
create policy "training_giorni_admin_leggi" on public.training_giorni for select using (public.is_admin());
create policy "training_test_admin_leggi" on public.training_test for select using (public.is_admin());
create policy "training_obiettivo_admin_leggi" on public.training_obiettivo for select using (public.is_admin());
create policy "training_prove_rp_admin_leggi" on public.training_prove_rp for select using (public.is_admin());

-- 2) Chi può guardare i dati di p: lui stesso, o l'Admin
create or replace function public._guardo_ok(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p is not null and (p = public.utente_corrente() or public.is_admin());
$$;
revoke execute on function public._guardo_ok(uuid) from public, anon;
grant execute on function public._guardo_ok(uuid) to authenticated;

create or replace function public.mio_avvio_di(p_utente uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
           'data_ingresso', p.data_ingresso, 'sponsor_nome', sp.nome, 'lista', u.nome,
           'avvio_concluso_il', c.avvio_concluso_il, 'avvio_in_pausa_dal', c.avvio_in_pausa_dal,
           'onb_sogno', c.onb_sogno, 'onb_amway', c.onb_amway, 'onb_ordine', c.onb_ordine, 'onb_n21', c.onb_n21,
           'onb_starter_pack', c.onb_starter_pack, 'onb_lista_start', c.onb_lista_start, 'onb_role_play', c.onb_role_play,
           'onb_contatti', c.onb_contatti, 'onb_pack_ds', c.onb_pack_ds, 'onb_bbs', c.onb_bbs, 'onb_wes', c.onb_wes,
           'onb_cep', c.onb_cep, 'onb_primo_pm', c.onb_primo_pm, 'onb_primo_abo', c.onb_primo_abo)
    from public.utenti me
    join public.squadra p on p.partner_id = me.partner_id
    join public.contatti c on c.id = public.scheda_avvio_di(p.partner_id)
    join public.utenti u on u.id = c.user_id
    left join public.squadra sp on sp.partner_id = p.sponsor_id
   where me.id = p_utente and public._guardo_ok(p_utente);
$$;

create or replace function public.mio_percorso_di(p_utente uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_me     public.utenti%rowtype;
  v_a      public.avvio_utente%rowtype;
  v_scheda uuid;
  v        jsonb;
begin
  if not public._guardo_ok(p_utente) then return null; end if;
  select * into v_me from public.utenti where id = p_utente;
  if v_me.id is null then return null; end if;
  select * into v_a from public.avvio_utente where utente_id = v_me.id;     -- niente travaso: qui si legge soltanto
  if v_me.partner_id is not null then v_scheda := public.scheda_avvio_di(v_me.partner_id); end if;
  if v_scheda is not null then v := public.mio_avvio_di(p_utente); end if;
  if v is null then
    v_scheda := null;
    v := jsonb_build_object(
      'data_ingresso', (select p.data_ingresso from public.squadra p where p.partner_id = v_me.partner_id),
      'sponsor_nome', (select sp.nome from public.squadra p join public.squadra sp on sp.partner_id = p.sponsor_id where p.partner_id = v_me.partner_id),
      'lista', null, 'avvio_concluso_il', v_a.avvio_concluso_il, 'avvio_in_pausa_dal', null,
      'onb_sogno', coalesce(v_a.onb_sogno, false), 'onb_amway', coalesce(v_a.onb_amway, false), 'onb_ordine', coalesce(v_a.onb_ordine, false),
      'onb_n21', coalesce(v_a.onb_n21, false), 'onb_starter_pack', coalesce(v_a.onb_starter_pack, false),
      'onb_lista_start', coalesce(v_a.onb_lista_start, false), 'onb_role_play', coalesce(v_a.onb_role_play, false),
      'onb_contatti', coalesce(v_a.onb_contatti, false), 'onb_pack_ds', coalesce(v_a.onb_pack_ds, false),
      'onb_bbs', coalesce(v_a.onb_bbs, false), 'onb_wes', coalesce(v_a.onb_wes, false), 'onb_cep', coalesce(v_a.onb_cep, false),
      'onb_primo_pm', coalesce(v_a.onb_primo_pm, false), 'onb_primo_abo', coalesce(v_a.onb_primo_abo, false));
  end if;
  return v || jsonb_build_object('con_scheda', v_scheda is not null, 'perche', coalesce(v_a.perche, '[]'::jsonb),
                                 'benvenuto_visto_il', v_a.benvenuto_visto_il);
end;
$$;

create or replace function public.miei_segni_di(p_utente uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  u public.utenti; sc public.contatti; oggi date := (now() at time zone 'Europe/Rome')::date;
begin
  if not public._guardo_ok(p_utente) then return null; end if;
  select * into u from public.utenti where id = p_utente;
  if u.id is null then return null; end if;
  if u.partner_id is not null then sc := public._scheda_segni(u.partner_id, u.id); end if;
  return jsonb_build_object(
    'scheda', sc.id is not null,
    'compagno', coalesce(sc.compagno_nome, (select nome from public.contatti where id = sc.compagno_id)),
    'bbs', (select max(data) from public.bbs),
    'wes', (select max(data) from public.wes),
    'biglietti', coalesce((select jsonb_agg(jsonb_build_object('tipo', b.tipo, 'evento', b.evento, 'contatto', b.contatto,
        'compagno', b.compagno, 'ospiti', b.ospiti, 'mio', b.contatto_id = sc.id))
      from public.biglietti b where b.contatto_id = sc.id or b.contatto_id = sc.compagno_id), '[]'::jsonb),
    'cep', coalesce((select jsonb_agg(jsonb_build_object('dal', p.dal, 'uscito_il', p.uscito_il, 'mio', p.contatto_id = sc.id,
        'oggi_mio', p.contatto_id = sc.id and p.uscito_il is null and p.segnato_da = u.id and (p.aggiornato_il at time zone 'Europe/Rome')::date = oggi))
      from public.cep p where p.contatto_id = sc.id or p.contatto_id = sc.compagno_id), '[]'::jsonb));
end;
$$;

create or replace function public.mio_sharing_di(p_utente uuid)
returns table(id uuid, materiale_id uuid, condivisa_il date, ascoltata boolean, ascoltata_il date, sponsor text, con_scheda boolean)
language sql stable security definer set search_path = public as $$
  with io as (
    select c.id from public.contatti c join public.utenti u on u.id = p_utente
    where public._guardo_ok(p_utente) and u.partner_id is not null and c.codice_amway = u.partner_id
  )
  select k.id, k.materiale_id, k.condivisa_il, k.ascoltata, k.ascoltata_il, s.nome, true
  from public.condivisioni k join io on io.id = k.contatto_id join public.utenti s on s.id = k.user_id
  union all
  select null, null, null, null, null, null, exists (select 1 from io)
  where public._guardo_ok(p_utente) and not exists (select 1 from public.condivisioni k join io on io.id = k.contatto_id);
$$;

revoke execute on function public.mio_avvio_di(uuid), public.mio_percorso_di(uuid), public.miei_segni_di(uuid), public.mio_sharing_di(uuid) from public, anon;
grant execute on function public.mio_avvio_di(uuid), public.mio_percorso_di(uuid), public.miei_segni_di(uuid), public.mio_sharing_di(uuid) to authenticated;
