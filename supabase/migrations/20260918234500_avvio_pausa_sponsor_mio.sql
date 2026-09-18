-- Cantiere 31, lavori 2 e 3 (decisioni di Ignazio del 18/09). Solo aggiunte: una colonna nuova e funzioni nuove; l'unica funzione
-- riscritta è `avvio_del_ramo()`, nata oggi in questo stesso cantiere e non ancora usata dall'app pubblicata.
--
-- 1) `contatti.avvio_in_pausa_dal`: «⏸ In pausa» per i partner fermi per ora (Ignazio: «molti sono fermi momentaneamente o si sono
--    ritirati, dobbiamo gestire anche questo»). In pausa = fuori dall'elenco e dal numero di «Partner da avviare», ma ritrovabile in
--    fondo alla pagina e ripristinabile («Riprendi» = torna vuoto). Chi si è ritirato davvero cambia categoria (Ex Partner/Cliente).
-- 2) `scheda_avvio_di(partner)`: LA regola, scritta una volta sola, di quale scheda vale per l'avvio di un partner (Ignazio: «sempre
--    quella dello sponsor; lo sponsor non attivo viene scavalcato dal proprio sponsor, seguendo la mappa Amway, che è quella che
--    comanda in tutto»). Si sale dal partner lungo gli sponsor (passo 1 = lo sponsor): vale la prima scheda Partner trovata nella
--    lista di un upline che è utente dell'app (non eliminato). La scheda è del partner se ha il suo codice Amway oppure, senza
--    codice, lo stesso nome (come `MB21Mappa.schedaDelPartner`: «COGNOME, NOME» del file Amway letto «nome cognome», senza maiuscole
--    e spazi doppi; il server non legge `mappa.js`, la regola è riscritta qui uguale). Se allo stesso passo le schede sono due
--    (lo sponsor è una coppia con lo stesso codice Amway) vale quella con più passi fatti, poi la più vecchia. Funzione interna:
--    nessuno la chiama dall'app.
-- 3) `avvio_del_ramo()`: come prima, ma usa la regola del punto 2 e porta in più `sponsor_nome` (lo sponsor Amway, Ignazio: «tra [ ]
--    il nome dello sponsor, così io come upline so a chi rivolgermi») e `avvio_in_pausa_dal`.
-- 4) `mio_avvio()` e `smarca_mio_passo(passo, fatto)` (lavoro 3): il nuovo partner vede i SUOI 14 passi e li smarca da solo. La
--    scheda è quella del punto 2 per il suo codice Amway (`utenti.partner_id`): sta nella lista dello sponsor e lui non la vede;
--    da qui escono solo i passi, lo sponsor e le date dell'avvio. Si smarca solo con l'avvio aperto (non concluso, non in pausa).
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.

alter table public.contatti add column if not exists avvio_in_pausa_dal date;
comment on column public.contatti.avvio_in_pausa_dal is 'Avvio del Partner in pausa da questo giorno (fermo per ora): fuori da «Partner da avviare»; vuoto = non in pausa. Cantiere 31.';

-- ── 2. Quale scheda vale per l'avvio di un partner ──────────
create or replace function public.scheda_avvio_di(p_partner text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  with recursive salita as (
    select s.sponsor_id as upline, 1 as passo
      from public.squadra s
     where s.partner_id = p_partner and s.sponsor_id is not null
    union all
    select s.sponsor_id, x.passo + 1
      from salita x
      join public.squadra s on s.partner_id = x.upline
     where s.sponsor_id is not null and x.passo < 20          -- guardia contro i giri chiusi
  )
  select c.id
    from salita x
    join public.squadra p on p.partner_id = p_partner
    join public.utenti u on u.partner_id = x.upline and u.eliminato_il is null
    join public.contatti c on c.user_id = u.id and c.categoria = 'Partner'
     and (c.codice_amway = p_partner
          or (c.codice_amway is null
              and lower(regexp_replace(trim(c.nome), '\s+', ' ', 'g'))
                = lower(regexp_replace(trim(case when position(',' in p.nome) > 0
                                                 then trim(split_part(p.nome, ',', 2)) || ' ' || trim(split_part(p.nome, ',', 1))
                                                 else p.nome end), '\s+', ' ', 'g'))))
   order by x.passo,
            (c.onb_sogno::int + c.onb_amway::int + c.onb_ordine::int + c.onb_n21::int + c.onb_starter_pack::int + c.onb_lista_start::int
             + c.onb_role_play::int + c.onb_contatti::int + c.onb_pack_ds::int + c.onb_bbs::int + c.onb_wes::int + c.onb_cep::int
             + c.onb_primo_pm::int + c.onb_primo_abo::int) desc,
            c.creato_il, c.id
   limit 1;
$$;
revoke all on function public.scheda_avvio_di(text) from public, anon, authenticated;

-- ── 3. Il percorso di avvio dei partner del proprio ramo ────
create or replace function public.avvio_del_ramo()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with recursive ramo as (
    select s.partner_id
      from public.squadra s
     where public.utente_corrente() is not null
       and (public.is_admin()
            or s.partner_id = (select u.partner_id from public.utenti u where u.id = public.utente_corrente()))
    union
    select s.partner_id
      from public.squadra s
      join ramo r on s.sponsor_id = r.partner_id
  ),
  salita as (                                    -- gli upline di ogni partner del ramo, dallo sponsor in su
    select s.partner_id as partner, s.sponsor_id as upline, 1 as passo
      from public.squadra s
     where s.partner_id in (select partner_id from ramo) and s.sponsor_id is not null
    union all
    select x.partner, s.sponsor_id, x.passo + 1
      from salita x
      join public.squadra s on s.partner_id = x.upline
     where s.sponsor_id is not null and x.passo < 20
  )
  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
    from (
      select p.partner_id, p.nome, p.data_ingresso, sp.nome as sponsor_nome,
             (select coalesce(jsonb_agg(x.upline order by x.passo), '[]'::jsonb) from salita x where x.partner = p.partner_id) as linea,
             c.id as contatto_id, c.user_id, u.nome as lista, c.avvio_concluso_il, c.avvio_in_pausa_dal,
             c.onb_sogno, c.onb_amway, c.onb_ordine, c.onb_n21, c.onb_starter_pack, c.onb_lista_start, c.onb_role_play,
             c.onb_contatti, c.onb_pack_ds, c.onb_bbs, c.onb_wes, c.onb_cep, c.onb_primo_pm, c.onb_primo_abo
        from public.squadra p
        join public.contatti c on c.id = public.scheda_avvio_di(p.partner_id)
        join public.utenti u on u.id = c.user_id
        left join public.squadra sp on sp.partner_id = p.sponsor_id
       where p.partner_id in (select partner_id from ramo)
         and p.partner_id is distinct from (select me.partner_id from public.utenti me where me.id = public.utente_corrente())
    ) t;
$$;
revoke all on function public.avvio_del_ramo() from public;
grant execute on function public.avvio_del_ramo() to authenticated;

-- ── 4. «Il mio avvio»: i 14 passi di chi è collegato ────────
create or replace function public.mio_avvio()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
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
   where me.id = public.utente_corrente();
$$;
revoke all on function public.mio_avvio() from public, anon;
grant execute on function public.mio_avvio() to authenticated;

create or replace function public.smarca_mio_passo(p_passo text, p_fatto boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scheda uuid;
begin
  if p_passo not in ('onb_sogno', 'onb_amway', 'onb_ordine', 'onb_n21', 'onb_starter_pack', 'onb_lista_start', 'onb_role_play',
                     'onb_contatti', 'onb_pack_ds', 'onb_bbs', 'onb_wes', 'onb_cep', 'onb_primo_pm', 'onb_primo_abo') then
    raise exception 'passo sconosciuto';
  end if;
  select public.scheda_avvio_di(me.partner_id) into v_scheda
    from public.utenti me where me.id = public.utente_corrente() and me.partner_id is not null;
  if v_scheda is null then
    raise exception 'nessuna scheda di avvio';
  end if;
  if exists (select 1 from public.contatti c where c.id = v_scheda and (c.avvio_concluso_il is not null or c.avvio_in_pausa_dal is not null)) then
    raise exception 'avvio chiuso';
  end if;
  execute format('update public.contatti set %I = $1 where id = $2', p_passo) using coalesce(p_fatto, false), v_scheda;
  return public.mio_avvio();
end;
$$;
revoke all on function public.smarca_mio_passo(text, boolean) from public, anon;
grant execute on function public.smarca_mio_passo(text, boolean) to authenticated;
