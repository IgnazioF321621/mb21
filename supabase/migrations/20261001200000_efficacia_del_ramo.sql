-- «Statistiche» in Mappa, l'upline come aiuto (Ignazio 01/10): chi sta sopra, nella stessa linea, vede quanti contatti per PM e quanti PM per iscritto
-- fanno quelli che gli stanno sotto (e lui stesso). Solo in lettura, solo verso il basso, mai tra linee diverse: la linea si legge dalla mappa ufficiale
-- (`squadra`, file Amway). L'Admin vede tutti.
-- Funzione nuova: l'app online non la usa. Come `obiettivi_del_ramo`. Dà del Check solo i tre numeri che servono (contatti, PM, iscritti personali) degli
-- ultimi 6 mesi, con il codice Amway di chi li ha scritti; non tocca i permessi delle tabelle: il resto del Check resta di ognuno.
create or replace function public.efficacia_del_ramo(p_da date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with recursive io as (
    select u.id, u.partner_id from public.utenti u where u.id = public.utente_corrente()
  ),
  ramo as (
    select s.partner_id
      from public.squadra s
     where s.sponsor_id = (select partner_id from io) and s.partner_id <> (select partner_id from io)
    union
    select s.partner_id
      from public.squadra s
      join ramo r on s.sponsor_id = r.partner_id
     where s.partner_id <> (select partner_id from io)
  ),
  visti as (
    select u.id, u.partner_id
      from public.utenti u
     where public.utente_corrente() is not null
       and u.partner_id is not null
       and (public.is_admin() or u.id = public.utente_corrente() or u.partner_id in (select partner_id from ramo))
  )
  select coalesce(jsonb_agg(jsonb_build_object('partner_id', v.partner_id, 'mese', c.mese, 'contatti', c.contatti, 'pm', c.pm,
                                               'sponsor_personali', c.sponsor_personali)), '[]'::jsonb)
    from public.check_mesi c join visti v on v.id = c.user_id
   where c.mese >= p_da;
$$;

revoke all on function public.efficacia_del_ramo(date) from public;
grant execute on function public.efficacia_del_ramo(date) to authenticated;
