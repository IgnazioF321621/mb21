-- Cantiere 20 · targhetta 📱 dell'app (Ignazio 17/09): un modo solo per dire chi usa l'app, al posto della scritta «MB21».
-- Niente colori: la targhetta scrive da quanti giorni la persona non apre l'app («oggi», «ieri», «12 gg»).
-- 1) `segni_del_ramo()`: gli utenti del ramo portano anche `ultimo_uso`, `nomi` (schede in lista, esclusi gli Archiviati)
--    ed `eliminato_il` (un eliminato non ha la targhetta). Serve alla Mappa: partner → utenti con quel codice.
-- 2) `schede_utenti_app()`: le schede che sono utenti dell'app con `ultimo_uso` e `nomi` (stesso aggancio di
--    `schede_utenti_mb21`: collegamento dell'Admin o codice Amway → email del file Amway → utente). Serve a Lista e scheda.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.

create or replace function public.segni_del_ramo()
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
  utenti_ramo as (
    select u.id, u.partner_id, u.ultimo_uso, u.eliminato_il,
           (select count(*) from public.contatti c where c.user_id = u.id and c.categoria is distinct from 'Archiviato') as nomi
      from public.utenti u
     where u.partner_id in (select partner_id from ramo)
  ),
  schede as (
    select c.id, c.nome, c.user_id, c.codice_amway, c.compagno_id
      from public.contatti c
     where c.codice_amway in (select partner_id from ramo)
        or (c.user_id in (select id from utenti_ramo)
            and (c.categoria = 'Partner' or c.codice_amway is not null))
  ),
  visibili as (                                  -- contatti di cui si contano biglietti e CEP
    select id from schede
    union select compagno_id from schede where compagno_id is not null
    union select c.id from public.contatti c where c.user_id in (select id from utenti_ramo)
  )
  select jsonb_build_object(
    'schede', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'nome', s.nome, 'user_id', s.user_id,
                                                            'codice_amway', s.codice_amway) order by s.id) from schede s), '[]'::jsonb),
    'utenti', coalesce((select jsonb_agg(jsonb_build_object('id', u.id, 'partner_id', u.partner_id, 'ultimo_uso', u.ultimo_uso,
                                                            'nomi', u.nomi, 'eliminato_il', u.eliminato_il)) from utenti_ramo u), '[]'::jsonb),
    'coppie', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'compagno_id', c.compagno_id))
                          from public.contatti c
                         where c.compagno_id is not null
                           and (c.id in (select id from visibili) or c.compagno_id in (select id from visibili))), '[]'::jsonb),
    'biglietti', coalesce((select jsonb_agg(jsonb_build_object('contatto_id', b.contatto_id, 'tipo', b.tipo, 'evento', b.evento,
                                                               'contatto', b.contatto, 'compagno', b.compagno, 'ospiti', b.ospiti,
                                                               'creato_il', b.creato_il, 'user_id', c.user_id))
                             from public.biglietti b join public.contatti c on c.id = b.contatto_id
                            where b.contatto_id in (select id from visibili)), '[]'::jsonb),
    'cep', coalesce((select jsonb_agg(jsonb_build_object('contatto_id', p.contatto_id, 'dal', p.dal, 'uscito_il', p.uscito_il,
                                                         'user_id', c.user_id))
                       from public.cep p join public.contatti c on c.id = p.contatto_id
                      where p.contatto_id in (select id from visibili)), '[]'::jsonb)
  );
$$;

-- Schede che sono utenti dell'app, con l'ultimo uso e i nomi in lista (per la targhetta 📱 di Lista e scheda contatto).
-- Una scheda può agganciarsi a due utenti (la coppia col codice condiviso): vale l'uso più recente, i nomi si sommano.
create or replace function public.schede_utenti_app()
returns table (contatto_id uuid, ultimo_uso timestamptz, nomi integer)
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
   group by a.contatto_id;
$$;
revoke all on function public.schede_utenti_app() from public;
grant execute on function public.schede_utenti_app() to authenticated;
