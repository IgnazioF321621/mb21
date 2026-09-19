-- Cantiere 31, lavoro 4 (Ignazio 19/09: «l'app propone ed io decido»). `avvio_del_ramo()` porta in più `sa`: per 7 dei 14 passi,
-- quello che l'app sa già del partner da altri dati. NON accende niente: l'app lo mostra come proposta 💡 accanto al passo spento
-- e chi può spuntare decide. Solo lettura, nessun dato toccato; il resto della funzione è identico a prima.
--   onb_amway     è nella squadra (file Amway)                      onb_ordine    ha avuto VPP in almeno un mese (`volumi_mese`)
--   onb_bbs / wes ha un biglietto suo (`biglietti.contatto`) su una sua scheda (col suo codice Amway, o quella che vale): il
--                 biglietto dice «comprato», non «ha partecipato»   onb_cep       ha un periodo di abbonamento CEP
--   onb_primo_pm  da utente dell'app ha registrato un Piano Marketing avvenuto (esito diverso da Rimandato e No Show)
--   onb_primo_abo nella mappa ha almeno una prima linea
-- Gli altri 7 passi (Sogno, Network 21, Starter Pack, Lista Start, Role Play, Contatti, Pack Dare Seguito) l'app non li sa.
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
             c.onb_contatti, c.onb_pack_ds, c.onb_bbs, c.onb_wes, c.onb_cep, c.onb_primo_pm, c.onb_primo_abo,
             jsonb_build_object(
               'onb_amway', true,
               'onb_ordine', exists (select 1 from public.volumi_mese m where m.partner_id = p.partner_id and m.vpp > 0),
               'onb_bbs', exists (select 1 from public.biglietti b join public.contatti k on k.id = b.contatto_id
                                   where (k.codice_amway = p.partner_id or k.id = c.id) and b.tipo = 'BBS' and b.contatto),
               'onb_wes', exists (select 1 from public.biglietti b join public.contatti k on k.id = b.contatto_id
                                   where (k.codice_amway = p.partner_id or k.id = c.id) and b.tipo = 'WES' and b.contatto),
               'onb_cep', exists (select 1 from public.cep a join public.contatti k on k.id = a.contatto_id
                                   where k.codice_amway = p.partner_id or k.id = c.id),
               'onb_primo_pm', exists (select 1 from public.azioni a join public.utenti au on au.id = a.user_id
                                        where au.partner_id = p.partner_id and a.tipo_azione = 'Piano Marketing'
                                          and a.esito is not null and a.esito not in ('Rimandato', 'No Show')),
               'onb_primo_abo', exists (select 1 from public.squadra g where g.sponsor_id = p.partner_id)
             ) as sa
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
