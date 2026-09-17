-- Cantiere 20 lavoro 2 (Ignazio 17/09): la domanda «Hai il biglietto?» compare anche all'Admin,
-- che segna i propri biglietti come tutti. Stesse funzioni, senza l'esclusione dell'Admin.

create or replace function public.biglietti_da_segnare()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  u public.utenti; sc public.contatti; r record; esito jsonb := '[]'::jsonb; nome_comp text;
begin
  select * into u from public.utenti where id = public.utente_corrente();
  if u.id is null or u.partner_id is null then return esito; end if;
  sc := public._scheda_segni(u.partner_id, u.id);
  if sc.id is null then return esito; end if;
  select coalesce(sc.compagno_nome, (select nome from public.contatti where id = sc.compagno_id)) into nome_comp;
  for r in
    select 'BBS' as tipo, max(data) as evento from public.bbs
    union all
    select 'WES', max(data) from public.wes
  loop
    if r.evento is null then continue; end if;
    if exists (select 1 from public.risposte_biglietto where utente_id = u.id and tipo = r.tipo and evento = r.evento) then continue; end if;
    if exists (select 1 from public.biglietti b where b.tipo = r.tipo and b.evento = r.evento
                  and (b.contatto_id = sc.id or (sc.compagno_id is not null and b.contatto_id = sc.compagno_id))) then continue; end if;
    esito := esito || jsonb_build_object('tipo', r.tipo, 'evento', r.evento, 'compagno', nome_comp);
  end loop;
  return esito;
end;
$$;

create or replace function public.segna_mio_biglietto(p_tipo text, p_evento date, p_contatto boolean, p_compagno boolean, p_ospiti integer)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  u public.utenti; sc public.contatti; in_vendita date;
begin
  select * into u from public.utenti where id = public.utente_corrente();
  if u.id is null or u.partner_id is null then raise exception 'Non puoi segnare biglietti da qui'; end if;
  if p_tipo = 'BBS' then select max(data) into in_vendita from public.bbs;
  elsif p_tipo = 'WES' then select max(data) into in_vendita from public.wes;
  else raise exception 'Tipo sconosciuto'; end if;
  if in_vendita is null or in_vendita <> p_evento then raise exception 'Questo evento non è più in vendita'; end if;
  sc := public._scheda_segni(u.partner_id, u.id);
  if sc.id is null then raise exception 'Non hai una scheda collegata al tuo codice Amway'; end if;
  if coalesce(p_contatto, false) or coalesce(p_compagno, false) or coalesce(p_ospiti, 0) > 0 then
    if exists (select 1 from public.biglietti b where b.tipo = p_tipo and b.evento = p_evento
                  and (b.contatto_id = sc.id or (sc.compagno_id is not null and b.contatto_id = sc.compagno_id))) then
      raise exception 'Questo biglietto è già segnato';
    end if;
    insert into public.biglietti (contatto_id, tipo, evento, contatto, compagno, ospiti)
    values (sc.id, p_tipo, p_evento, coalesce(p_contatto, false), coalesce(p_compagno, false), least(50, greatest(0, coalesce(p_ospiti, 0))));
  end if;
  insert into public.risposte_biglietto (utente_id, tipo, evento) values (u.id, p_tipo, p_evento)
  on conflict do nothing;
  return jsonb_build_object('scheda', sc.id);
end;
$$;
