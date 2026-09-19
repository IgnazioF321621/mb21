-- Cantiere 32, lavoro 1 (decisioni di Ignazio del 19/09: benvenuto per chi entra la prima volta).
-- SOLO AGGIUNTE: una tabella nuova e funzioni nuove. Nessuna tabella, funzione o trigger esistente viene toccato: l'app pubblicata
-- continua a usare `mio_avvio()`, `smarca_mio_passo()` e `avvio_del_ramo()` così come sono; le funzioni nuove le chiamano da dentro,
-- così ogni regola resta scritta in un posto solo (quale scheda vale: `scheda_avvio_di`; chi è nel mio Team: `avvio_del_ramo`).
--
-- 1) `avvio_utente` (una riga per utente dell'app, nasce al primo bisogno):
--    · `perche`: i «Perché vuoi iniziare?» scelti nel benvenuto: elenco di { voce, testo } (decisioni 5 e 6: più voci, ognuna con la
--      sua piccola descrizione; le 7 voci vengono dal Piano Marketing N21, più «Un altro»)
--    · `benvenuto_visto_il`: il benvenuto si apre da solo una volta sola, e si ricorda qui e non sul telefono (decisione 15)
--    · i 14 passi `onb_*`: i passi di chi NON ha ancora una scheda che vale nella lista dello sponsor (decisione 3: «Il mio avvio»
--      c'è dal primo giorno). Quando la scheda arriva (scheda Partner dello sponsor + ultimo file Amway) i passi fatti PASSANO LÌ DA
--      SOLI (`travasa_avvii`: un passo fatto da una delle due parti resta fatto) e qui tornano spenti: da quel momento la fonte è
--      la scheda, come nel cantiere 31
--    · `avvio_concluso_il`: solo per chi non ha la scheda (in cima alla mappa, o non ancora nel file): senza sponsor che lo chiuda,
--      lo chiude da sé. Con la scheda comanda la scheda
--    La tabella si legge e si scrive SOLO dalle funzioni qui sotto (RLS accesa, nessuna regola).
-- 2) `travasa_avvii(utente)`: il travaso del punto 1. Non è un trigger (gli eventi sarebbero troppi: scheda creata, categoria cambiata,
--    file Amway caricato, sponsor che diventa utente): lo fanno le due funzioni di lettura qui sotto prima di leggere, così vale per
--    chiunque apra l'app per primo, il nuovo o chi lo segue. Funzione interna.
-- 3) `mio_percorso()`: tutto quello che serve al benvenuto e a «🚀 Il mio avvio»: i 14 passi (dalla scheda che vale con `mio_avvio()`,
--    altrimenti i propri), `con_scheda`, `perche`, `benvenuto_visto_il`.
-- 4) `segna_mio_passo(passo, fatto)`: con la scheda chiama `smarca_mio_passo` (stesse regole: avvio aperto); senza, scrive i propri.
-- 5) `salva_perche_iniziare(perche)`: salva le voci e, se ce n'è almeno una, spunta il primo passo (`onb_sogno`, che a video si chiama
--    «Perché iniziare», decisioni 2 e 8). Con l'avvio concluso o in pausa salva le voci e non tocca i passi.
-- 6) `concludi_mio_avvio(concluso)` e `segna_benvenuto_visto()`.
-- 7) `avvio_del_team()`: per sponsor e upline. Fa il travaso, poi restituisce { ramo: `avvio_del_ramo()` tale e quale, perche: per
--    ogni partner del ramo le voci scelte } (decisione 2: il sogno lo vede anche chi lo segue). Solo il percorso, mai telefoni e note.
-- Nome del file con l'ora vera (LEZIONI): viene prima di 20260919093000 (nata con l'ora «a occhio»), quindi si applica con
-- `supabase db push --include-all`.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21).

-- ── 1. La tabella ───────────────────────────────────────────
create table if not exists public.avvio_utente (
  utente_id          uuid primary key references public.utenti(id) on delete cascade,
  perche             jsonb not null default '[]'::jsonb check (jsonb_typeof(perche) = 'array'),
  benvenuto_visto_il timestamptz,
  onb_sogno          boolean not null default false,
  onb_amway          boolean not null default false,
  onb_ordine         boolean not null default false,
  onb_n21            boolean not null default false,
  onb_starter_pack   boolean not null default false,
  onb_lista_start    boolean not null default false,
  onb_role_play      boolean not null default false,
  onb_contatti       boolean not null default false,
  onb_pack_ds        boolean not null default false,
  onb_bbs            boolean not null default false,
  onb_wes            boolean not null default false,
  onb_cep            boolean not null default false,
  onb_primo_pm       boolean not null default false,
  onb_primo_abo      boolean not null default false,
  avvio_concluso_il  date,
  aggiornato_il      timestamptz not null default now()
);
comment on table public.avvio_utente is 'Cantiere 32: «Perché iniziare» scelti nel benvenuto, benvenuto già visto e i 14 passi di chi non ha ancora la scheda di avvio nella lista dello sponsor. Si usa solo dalle funzioni mio_percorso · segna_mio_passo · salva_perche_iniziare · concludi_mio_avvio · segna_benvenuto_visto · avvio_del_team.';
alter table public.avvio_utente enable row level security;
revoke all on table public.avvio_utente from anon, authenticated;

-- ── 2. Il travaso: i passi propri passano alla scheda che vale ──
create or replace function public.travasa_avvii(p_utente uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_scheda uuid;
begin
  for r in
    select a.*, u.partner_id
      from public.avvio_utente a
      join public.utenti u on u.id = a.utente_id
     where (p_utente is null or a.utente_id = p_utente)
       and u.eliminato_il is null and u.partner_id is not null
       and (a.onb_sogno or a.onb_amway or a.onb_ordine or a.onb_n21 or a.onb_starter_pack or a.onb_lista_start or a.onb_role_play
            or a.onb_contatti or a.onb_pack_ds or a.onb_bbs or a.onb_wes or a.onb_cep or a.onb_primo_pm or a.onb_primo_abo)
  loop
    v_scheda := public.scheda_avvio_di(r.partner_id);
    continue when v_scheda is null;
    update public.contatti c
       set onb_sogno = c.onb_sogno or r.onb_sogno, onb_amway = c.onb_amway or r.onb_amway, onb_ordine = c.onb_ordine or r.onb_ordine,
           onb_n21 = c.onb_n21 or r.onb_n21, onb_starter_pack = c.onb_starter_pack or r.onb_starter_pack,
           onb_lista_start = c.onb_lista_start or r.onb_lista_start, onb_role_play = c.onb_role_play or r.onb_role_play,
           onb_contatti = c.onb_contatti or r.onb_contatti, onb_pack_ds = c.onb_pack_ds or r.onb_pack_ds,
           onb_bbs = c.onb_bbs or r.onb_bbs, onb_wes = c.onb_wes or r.onb_wes, onb_cep = c.onb_cep or r.onb_cep,
           onb_primo_pm = c.onb_primo_pm or r.onb_primo_pm, onb_primo_abo = c.onb_primo_abo or r.onb_primo_abo
     where c.id = v_scheda;
    update public.avvio_utente
       set onb_sogno = false, onb_amway = false, onb_ordine = false, onb_n21 = false, onb_starter_pack = false, onb_lista_start = false,
           onb_role_play = false, onb_contatti = false, onb_pack_ds = false, onb_bbs = false, onb_wes = false, onb_cep = false,
           onb_primo_pm = false, onb_primo_abo = false, aggiornato_il = now()
     where utente_id = r.utente_id;
  end loop;
end;
$$;
revoke all on function public.travasa_avvii(uuid) from public, anon, authenticated;

-- ── 3. Il mio percorso: benvenuto e «Il mio avvio» ──────────
create or replace function public.mio_percorso()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me     public.utenti%rowtype;
  v_a      public.avvio_utente%rowtype;
  v_scheda uuid;
  v        jsonb;
begin
  select * into v_me from public.utenti where id = public.utente_corrente();
  if v_me.id is null then
    return null;
  end if;
  perform public.travasa_avvii(v_me.id);
  select * into v_a from public.avvio_utente where utente_id = v_me.id;
  if v_me.partner_id is not null then
    v_scheda := public.scheda_avvio_di(v_me.partner_id);
  end if;
  if v_scheda is not null then
    v := public.mio_avvio();                       -- la scheda che vale: stessa lettura del cantiere 31
  end if;
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
revoke all on function public.mio_percorso() from public, anon;
grant execute on function public.mio_percorso() to authenticated;

-- ── 4. Smarcare un mio passo, con o senza scheda ────────────
create or replace function public.segna_mio_passo(p_passo text, p_fatto boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me     uuid := public.utente_corrente();
  v_scheda uuid;
begin
  if v_me is null then
    raise exception 'utente sconosciuto';
  end if;
  if p_passo not in ('onb_sogno', 'onb_amway', 'onb_ordine', 'onb_n21', 'onb_starter_pack', 'onb_lista_start', 'onb_role_play',
                     'onb_contatti', 'onb_pack_ds', 'onb_bbs', 'onb_wes', 'onb_cep', 'onb_primo_pm', 'onb_primo_abo') then
    raise exception 'passo sconosciuto';
  end if;
  select public.scheda_avvio_di(u.partner_id) into v_scheda from public.utenti u where u.id = v_me and u.partner_id is not null;
  if v_scheda is not null then
    perform public.smarca_mio_passo(p_passo, p_fatto);      -- stesse regole del cantiere 31 (avvio aperto)
  else
    insert into public.avvio_utente (utente_id) values (v_me) on conflict (utente_id) do nothing;
    execute format('update public.avvio_utente set %I = $1, aggiornato_il = now() where utente_id = $2', p_passo)
      using coalesce(p_fatto, false), v_me;
  end if;
  return public.mio_percorso();
end;
$$;
revoke all on function public.segna_mio_passo(text, boolean) from public, anon;
grant execute on function public.segna_mio_passo(text, boolean) to authenticated;

-- ── 5. «Perché vuoi iniziare?» ──────────────────────────────
create or replace function public.salva_perche_iniziare(p_perche jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me     uuid := public.utente_corrente();
  v_pulito jsonb;
  v_scheda uuid;
begin
  if v_me is null then
    raise exception 'utente sconosciuto';
  end if;
  if p_perche is null or jsonb_typeof(p_perche) <> 'array' or jsonb_array_length(p_perche) > 12 then
    raise exception 'elenco non valido';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('voce', left(btrim(e.value->>'voce'), 60),
                                               'testo', left(btrim(coalesce(e.value->>'testo', '')), 300)) order by e.ordinality), '[]'::jsonb)
    into v_pulito
    from jsonb_array_elements(p_perche) with ordinality e
   where btrim(coalesce(e.value->>'voce', '')) <> '';
  insert into public.avvio_utente (utente_id, perche) values (v_me, v_pulito)
    on conflict (utente_id) do update set perche = excluded.perche, aggiornato_il = now();
  if jsonb_array_length(v_pulito) > 0 then
    select public.scheda_avvio_di(u.partner_id) into v_scheda from public.utenti u where u.id = v_me and u.partner_id is not null;
    if v_scheda is null then
      update public.avvio_utente set onb_sogno = true where utente_id = v_me;
    else
      update public.contatti set onb_sogno = true
       where id = v_scheda and avvio_concluso_il is null and avvio_in_pausa_dal is null;
    end if;
  end if;
  return public.mio_percorso();
end;
$$;
revoke all on function public.salva_perche_iniziare(jsonb) from public, anon;
grant execute on function public.salva_perche_iniziare(jsonb) to authenticated;

-- ── 6. Concludere il proprio avvio (solo senza scheda) · benvenuto già visto ──
create or replace function public.concludi_mio_avvio(p_concluso boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.utente_corrente();
begin
  if v_me is null then
    raise exception 'utente sconosciuto';
  end if;
  if exists (select 1 from public.utenti u where u.id = v_me and u.partner_id is not null and public.scheda_avvio_di(u.partner_id) is not null) then
    raise exception 'con la scheda lo conclude chi ti segue';
  end if;
  insert into public.avvio_utente (utente_id) values (v_me) on conflict (utente_id) do nothing;
  update public.avvio_utente
     set avvio_concluso_il = case when coalesce(p_concluso, false) then (now() at time zone 'Europe/Rome')::date end, aggiornato_il = now()
   where utente_id = v_me;
  return public.mio_percorso();
end;
$$;
revoke all on function public.concludi_mio_avvio(boolean) from public, anon;
grant execute on function public.concludi_mio_avvio(boolean) to authenticated;

create or replace function public.segna_benvenuto_visto()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.utente_corrente();
begin
  if v_me is null then
    return;
  end if;
  insert into public.avvio_utente (utente_id, benvenuto_visto_il) values (v_me, now())
    on conflict (utente_id) do update set benvenuto_visto_il = coalesce(public.avvio_utente.benvenuto_visto_il, now());
end;
$$;
revoke all on function public.segna_benvenuto_visto() from public, anon;
grant execute on function public.segna_benvenuto_visto() to authenticated;

-- ── 7. Per sponsor e upline: il ramo di sempre, più i «Perché iniziare» ──
create or replace function public.avvio_del_team()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ramo   jsonb;
  v_perche jsonb;
begin
  if public.utente_corrente() is null then
    return null;
  end if;
  perform public.travasa_avvii(null);
  v_ramo := public.avvio_del_ramo();               -- chi è nel mio Team e quale scheda vale: la regola resta lì
  select coalesce(jsonb_object_agg(t.partner_id, t.perche), '{}'::jsonb) into v_perche
    from (
      select u.partner_id, jsonb_agg(e.value order by u.creato_il, u.id, e.ordinality) as perche
        from jsonb_array_elements(v_ramo) r
        join public.utenti u on u.partner_id = r.value->>'partner_id' and u.eliminato_il is null
        join public.avvio_utente a on a.utente_id = u.id
        cross join lateral jsonb_array_elements(a.perche) with ordinality e
       group by u.partner_id
    ) t;
  return jsonb_build_object('ramo', v_ramo, 'perche', v_perche);
end;
$$;
revoke all on function public.avvio_del_team() from public, anon;
grant execute on function public.avvio_del_team() to authenticated;
