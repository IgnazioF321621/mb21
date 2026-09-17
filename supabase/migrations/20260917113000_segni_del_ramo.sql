-- Cantiere 20: segni vitali accesi nella Mappa per tutti i partner.
-- I biglietti e i CEP stanno quasi tutti sulle schede della lista dell'Admin e le regole di `contatti`
-- fanno leggere a ogni partner solo la propria lista: per lui i segni erano invisibili.
-- Questa funzione (security definer) dà a chi la chiama SOLO i segni vitali del suo ramo dell'albero Amway
-- (lui + tutti quelli sotto; l'Admin tutto): schede dei partner (id, nome, lista, codice), biglietti,
-- periodi CEP, coppie collegate e utenti del ramo. Niente telefoni, note o altri dati delle schede.
-- La Mappa Amway comanda: nessun interruttore, vale l'albero in `squadra`.

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
    select u.id, u.partner_id
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
    'utenti', coalesce((select jsonb_agg(jsonb_build_object('id', u.id, 'partner_id', u.partner_id)) from utenti_ramo u), '[]'::jsonb),
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

revoke all on function public.segni_del_ramo() from public;
grant execute on function public.segni_del_ramo() to authenticated;
