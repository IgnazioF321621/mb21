-- Cantiere 31 (Ignazio 19/09): «se qualcuno esce dalla mappa Amway, quella che comanda, scompare da questa lista di avvio».
-- Nella tabella `squadra` chi non è più nel file Amway RESTA (cantiere 19: non si cancella nessuno, la Mappa lo mostra ancora),
-- quindi «è ancora nella mappa» si legge così: **ha una riga in `volumi_mese` nell'ultimo mese caricato** (ogni partner del file ne
-- ha una, anche a zero VP). La regola sta in un posto solo, `scheda_avvio_di(partner)`: fuori dall'ultimo file → nessuna scheda
-- che vale → fuori da «Partner da avviare», niente «Il mio avvio», niente smarca. Se rientra in un file successivo, ricompare da
-- solo con i suoi passi. Il resto della funzione è identico a prima. Nessun dato toccato. Al 19/09: 33 su 33 nell'ultimo file.
-- (Chi esce cambia anche categoria nella scheda, Ex Partner/Cliente: era già fuori, l'elenco prende solo le schede Partner.)
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.

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
     and exists (select 1 from public.volumi_mese v                      -- è ancora nella mappa: c'è nell'ultimo file Amway caricato
                  where v.partner_id = p_partner and v.mese = (select max(mese) from public.volumi_mese))
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
