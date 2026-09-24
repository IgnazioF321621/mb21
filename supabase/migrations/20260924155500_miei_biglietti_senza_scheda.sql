-- Ritocco della funzione di prima (stesso giorno): `miei_biglietti` distingue due casi diversi
--   • niente scheda collegata al proprio codice Amway → `null` = «non lo so» (nel Check la targhetta resta «—»)
--   • scheda c'è ma nessun biglietto            → `[]`   = «no» (targhetta «NO»)
-- Senza questo, chi non ha ancora una scheda si vedrebbe scritto «NO» come se avesse risposto.
create or replace function public.miei_biglietti(p_dal date default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare u public.utenti; sc public.contatti;
begin
  select * into u from public.utenti where id = public.utente_corrente();
  if u.id is null or u.partner_id is null then return null; end if;
  sc := public._scheda_segni(u.partner_id, u.id);
  if sc.id is null then return null; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'tipo', b.tipo, 'evento', b.evento, 'ospiti', b.ospiti,
             'io', (b.contatto_id = sc.id and coalesce(b.contatto, false))
                or (sc.compagno_id is not null and b.contatto_id = sc.compagno_id and coalesce(b.compagno, false)))
             order by b.evento)
      from public.biglietti b
     where (b.contatto_id = sc.id or (sc.compagno_id is not null and b.contatto_id = sc.compagno_id))
       and (p_dal is null or b.evento >= p_dal)), '[]'::jsonb);
end;
$$;
