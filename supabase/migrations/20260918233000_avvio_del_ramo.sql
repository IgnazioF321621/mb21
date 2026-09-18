-- Cantiere 31, lavoro 2 (Ignazio 18/09): «Partner da avviare» per sponsor e upline, seguendo la mappa Amway.
-- `avvio_del_ramo()` dà a chi la chiama, per ogni partner del SUO ramo (l'Admin: tutti; sé stesso escluso), il percorso di avvio:
-- nome e data di ingresso dalla squadra, i 14 passi e «Avvio concluso» dalla scheda. Mai telefoni, note o altro della scheda:
-- le schede dei contatti restano leggibili solo da chi le ha in lista (e dall'Admin); qui esce soltanto il percorso.
--
-- Quale scheda vale (Ignazio 18/09: «sempre quella dello sponsor; lo sponsor non attivo viene scavalcato dal proprio sponsor,
-- seguendo la mappa Amway, che è quella che comanda in tutto»): si sale dal partner lungo gli sponsor (`salita`, passo 1 = lo
-- sponsor) e vale la prima scheda Partner trovata nella lista di un upline che è utente dell'app (non eliminato). La scheda è del
-- partner se ha il suo codice Amway oppure, senza codice, lo stesso nome (stessa regola di `MB21Mappa.schedaDelPartner`: il nome
-- del file Amway «COGNOME, NOME» letto come «nome cognome», senza maiuscole e spazi doppi; il server non legge `mappa.js`, quindi
-- la regola è riscritta qui uguale). Escono anche i partner con l'avvio concluso (`avvio_concluso_il`): li toglie l'app
-- (`MB21Lista.partnerDaAvviare`); servono alla scheda per dire quale scheda vale. Non si passa mai alla scheda di un altro upline.
-- `linea` = gli upline del partner, dallo sponsor in su: serve all'app per restringere al ramo del partner scelto nel Partner Select.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.

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
  salita as (
    select s.partner_id as partner, s.sponsor_id as upline, 1 as passo
      from public.squadra s
     where s.partner_id in (select partner_id from ramo)
       and s.sponsor_id is not null
       and s.partner_id is distinct from (select u.partner_id from public.utenti u where u.id = public.utente_corrente())
    union all
    select x.partner, s.sponsor_id, x.passo + 1
      from salita x
      join public.squadra s on s.partner_id = x.upline
     where s.sponsor_id is not null and x.passo < 20          -- guardia contro i giri chiusi
  ),
  candidate as (
    select x.partner, x.passo, c.id as contatto_id, c.user_id, u.nome as lista, c.avvio_concluso_il,
           c.onb_sogno, c.onb_amway, c.onb_ordine, c.onb_n21, c.onb_starter_pack, c.onb_lista_start, c.onb_role_play,
           c.onb_contatti, c.onb_pack_ds, c.onb_bbs, c.onb_wes, c.onb_cep, c.onb_primo_pm, c.onb_primo_abo
      from salita x
      join public.squadra p on p.partner_id = x.partner
      join public.utenti u on u.partner_id = x.upline and u.eliminato_il is null
      join public.contatti c on c.user_id = u.id and c.categoria = 'Partner'
       and (c.codice_amway = x.partner
            or (c.codice_amway is null
                and lower(regexp_replace(trim(c.nome), '\s+', ' ', 'g'))
                  = lower(regexp_replace(trim(case when position(',' in p.nome) > 0
                                                   then trim(split_part(p.nome, ',', 2)) || ' ' || trim(split_part(p.nome, ',', 1))
                                                   else p.nome end), '\s+', ' ', 'g'))))
  ),
  scelta as (
    select distinct on (partner) * from candidate order by partner, passo, contatto_id
  )
  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
    from (
      select p.partner_id, p.nome, p.data_ingresso,
             (select coalesce(jsonb_agg(x.upline order by x.passo), '[]'::jsonb) from salita x where x.partner = p.partner_id) as linea,
             s.passo as passo_lista, s.contatto_id, s.user_id, s.lista, s.avvio_concluso_il,
             s.onb_sogno, s.onb_amway, s.onb_ordine, s.onb_n21, s.onb_starter_pack, s.onb_lista_start, s.onb_role_play,
             s.onb_contatti, s.onb_pack_ds, s.onb_bbs, s.onb_wes, s.onb_cep, s.onb_primo_pm, s.onb_primo_abo
        from scelta s
        join public.squadra p on p.partner_id = s.partner
    ) t;
$$;
revoke all on function public.avvio_del_ramo() from public;
grant execute on function public.avvio_del_ramo() to authenticated;
