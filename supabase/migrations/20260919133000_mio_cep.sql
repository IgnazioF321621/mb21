-- Cantiere 25 bis lavoro 3 (Ignazio 19/09): «CEP lo clicca l'utente se si abbona, e lo tolgo io se finisce l'abbonamento».
-- Il partner accende il proprio CEP dal Profilo: periodo aperto dal 1° del mese in corso (il CEP si paga il 1°), sulla propria scheda.
-- Lo può spegnere da solo SOLO nello stesso giorno (tocco sbagliato); dopo lo chiude l'Admin con «Non ha rinnovato», come sempre.

alter table public.cep add column segnato_da uuid references public.utenti(id) on delete set null;   -- acceso dal partner dal Profilo (vuoto = scritto dall'Admin)

create function public.segna_mio_cep()
returns void
language plpgsql security definer set search_path = public as $$
declare
  u public.utenti; sc public.contatti; oggi date := (now() at time zone 'Europe/Rome')::date; v_dal date; ultimo date;
begin
  select * into u from public.utenti where id = public.utente_corrente();
  if u.id is null or u.partner_id is null then raise exception 'Non puoi segnare il CEP da qui'; end if;
  sc := public._scheda_segni(u.partner_id, u.id);
  if sc.id is null then raise exception 'Non hai una scheda collegata al tuo codice Amway'; end if;
  if exists (select 1 from public.cep where contatto_id = sc.id and uscito_il is null) then raise exception 'Il tuo CEP è già acceso'; end if;
  select max(uscito_il) into ultimo from public.cep where contatto_id = sc.id;
  v_dal := greatest(date_trunc('month', oggi)::date, coalesce(ultimo + 1, date '1900-01-01'));   -- mai sopra un periodo già chiuso
  if v_dal > oggi then raise exception 'Il tuo CEP risulta chiuso più avanti di oggi: chiedi all''Admin'; end if;
  insert into public.cep (contatto_id, dal, segnato_da) values (sc.id, v_dal, u.id);
end;
$$;

create function public.togli_mio_cep()
returns void
language plpgsql security definer set search_path = public as $$
declare
  u public.utenti; sc public.contatti; oggi date := (now() at time zone 'Europe/Rome')::date; tolti integer;
begin
  select * into u from public.utenti where id = public.utente_corrente();
  if u.id is null or u.partner_id is null then raise exception 'Non puoi togliere il CEP da qui'; end if;
  sc := public._scheda_segni(u.partner_id, u.id);
  delete from public.cep where contatto_id = sc.id and uscito_il is null and segnato_da = u.id
    and (aggiornato_il at time zone 'Europe/Rome')::date = oggi;
  get diagnostics tolti = row_count;
  if tolti = 0 then raise exception 'Il CEP lo spegne l''Admin quando l''abbonamento finisce'; end if;
end;
$$;

-- `miei_segni()`: ogni periodo CEP dice anche se si può ancora spegnere da soli (`oggi_mio`: acceso oggi da chi guarda)
create or replace function public.miei_segni()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  u public.utenti; sc public.contatti; oggi date := (now() at time zone 'Europe/Rome')::date;
begin
  select * into u from public.utenti where id = public.utente_corrente();
  if u.id is null then raise exception 'Utente non abilitato'; end if;
  if u.partner_id is not null then sc := public._scheda_segni(u.partner_id, u.id); end if;
  return jsonb_build_object(
    'scheda', sc.id is not null,
    'compagno', coalesce(sc.compagno_nome, (select nome from public.contatti where id = sc.compagno_id)),
    'bbs', (select max(data) from public.bbs),
    'wes', (select max(data) from public.wes),
    'biglietti', coalesce((select jsonb_agg(jsonb_build_object('tipo', b.tipo, 'evento', b.evento, 'contatto', b.contatto,
        'compagno', b.compagno, 'ospiti', b.ospiti, 'mio', b.contatto_id = sc.id))
      from public.biglietti b where b.contatto_id = sc.id or b.contatto_id = sc.compagno_id), '[]'::jsonb),
    'cep', coalesce((select jsonb_agg(jsonb_build_object('dal', p.dal, 'uscito_il', p.uscito_il, 'mio', p.contatto_id = sc.id,
        'oggi_mio', p.contatto_id = sc.id and p.uscito_il is null and p.segnato_da = u.id and (p.aggiornato_il at time zone 'Europe/Rome')::date = oggi))
      from public.cep p where p.contatto_id = sc.id or p.contatto_id = sc.compagno_id), '[]'::jsonb));
end;
$$;

revoke all on function public.segna_mio_cep() from public;
revoke all on function public.togli_mio_cep() from public;
grant execute on function public.segna_mio_cep() to authenticated;
grant execute on function public.togli_mio_cep() to authenticated;
