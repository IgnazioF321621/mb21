-- Partner 007 (Ignazio, ok del 07/10/2026): con lo stesso codice Amway su più schede (il collaboratore ha il codice del titolare)
-- `scheda_avvio_di(partner)` deve scegliere la scheda del partner, non quella del coniuge. Stessa regola della Mappa
-- (MB21Mappa.schedaDelPartner): prima la scheda con lo stesso nome del partner, poi quella con una parola del nome in comune
-- (il cognome), poi le altre; a pari «somiglianza» resta la regola di prima (passo più vicino, più passi fatti, la più vecchia).
-- Cambia solo l'ordine di scelta: stessa firma, stessi permessi, nessun dato toccato. Dove il codice è su una scheda sola
-- il risultato è identico a prima.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`, al rilascio (la applica la Regia).

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
  ),
  io as (                                                       -- il nome del partner, come lo si legge («Nome Cognome») e come sta nel file
    select lower(regexp_replace(trim(case when position(',' in p.nome) > 0
                                          then trim(split_part(p.nome, ',', 2)) || ' ' || trim(split_part(p.nome, ',', 1))
                                          else p.nome end), '\s+', ' ', 'g')) as leggibile,
           lower(regexp_replace(trim(p.nome), '\s+', ' ', 'g')) as grezzo
      from public.squadra p where p.partner_id = p_partner
  )
  select c.id
    from salita x
    join public.squadra p on p.partner_id = p_partner
     and exists (select 1 from public.volumi_mese v                      -- è ancora nella mappa: c'è nell'ultimo file Amway caricato
                  where v.partner_id = p_partner and v.mese = (select max(mese) from public.volumi_mese))
    join io on true
    join public.utenti u on u.partner_id = x.upline and u.eliminato_il is null
    join public.contatti c on c.user_id = u.id and c.categoria = 'Partner'
     and (c.codice_amway = p_partner
          or (c.codice_amway is null
              and lower(regexp_replace(trim(c.nome), '\s+', ' ', 'g')) = io.leggibile))
   order by case when lower(regexp_replace(trim(c.nome), '\s+', ' ', 'g')) in (io.leggibile, io.grezzo) then 0
                 when exists (select 1
                                from unnest(regexp_split_to_array(lower(c.nome), '[^a-zà-ÿ]+')) w
                               where length(w) > 2
                                 and w = any (regexp_split_to_array(io.leggibile, '[^a-zà-ÿ]+'))) then 1
                 else 2 end,
            x.passo,
            (c.onb_sogno::int + c.onb_amway::int + c.onb_ordine::int + c.onb_n21::int + c.onb_starter_pack::int + c.onb_lista_start::int
             + c.onb_role_play::int + c.onb_contatti::int + c.onb_pack_ds::int + c.onb_bbs::int + c.onb_wes::int + c.onb_cep::int
             + c.onb_primo_pm::int + c.onb_primo_abo::int) desc,
            c.creato_il, c.id
   limit 1;
$$;
revoke all on function public.scheda_avvio_di(text) from public, anon, authenticated;
