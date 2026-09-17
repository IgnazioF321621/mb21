-- Cantiere 20 lavoro 2 (Ignazio 17/09): il partner segna da solo il biglietto del BBS o del Wes appena caricato,
-- dalla Dashboard, una volta sola: per sé, per il compagno/a e gli ospiti in un'unica risposta.
-- Correzioni e aggiunte dopo le fa l'Admin dalla scheda. Il CEP resta solo dell'Admin.
-- Il biglietto va sulla scheda del partner nella lista dell'Admin (dove stanno i segni vitali, cantiere 19),
-- che il partner non può leggere: per questo le due funzioni sono `security definer`.

-- Risposte date (anche «No»): la domanda non si ripete
create table public.risposte_biglietto (
  utente_id   uuid not null references public.utenti(id) on delete cascade,
  tipo        text not null check (tipo in ('BBS', 'WES')),
  evento      date not null,
  risposto_il timestamptz not null default now(),
  primary key (utente_id, tipo, evento)
);
alter table public.risposte_biglietto enable row level security;   -- nessuna regola: si scrive solo dalle funzioni

-- Scheda su cui scrivere i segni del partner `p_partner`: quella con il codice nella lista dell'Admin,
-- altrimenti un'altra con il codice (prima quella nella lista di chi chiede)
create or replace function public._scheda_segni(p_partner text, p_utente uuid)
returns public.contatti
language sql stable security definer set search_path = public as $$
  select c.* from public.contatti c
   where c.codice_amway = p_partner
   order by (c.user_id = (select id from public.utenti where ruolo = 'Admin' order by creato_il limit 1)) desc,
            (c.user_id = p_utente) desc, c.id
   limit 1;
$$;

-- Biglietti che il partner deve ancora segnare: per il BBS e il Wes in vendita (l'ultimo caricato),
-- se sulla sua scheda (o su quella del compagno/a collegato) non c'è già un biglietto e non ha già risposto.
-- Restituisce [{ tipo, evento, compagno }] (compagno = nome del compagno/a se la scheda ce l'ha, altrimenti null).
create or replace function public.biglietti_da_segnare()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  u public.utenti; sc public.contatti; r record; esito jsonb := '[]'::jsonb; nome_comp text;
begin
  select * into u from public.utenti where id = public.utente_corrente();
  if u.id is null or u.ruolo = 'Admin' or u.partner_id is null then return esito; end if;
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

-- Segna il biglietto (io · compagno/a · ospiti) sull'evento in vendita; tutto a zero = «No, niente biglietto».
-- In ogni caso la risposta viene ricordata. Errore se l'evento non è quello in vendita o il biglietto c'è già.
create or replace function public.segna_mio_biglietto(p_tipo text, p_evento date, p_contatto boolean, p_compagno boolean, p_ospiti integer)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  u public.utenti; sc public.contatti; in_vendita date;
begin
  select * into u from public.utenti where id = public.utente_corrente();
  if u.id is null or u.ruolo = 'Admin' or u.partner_id is null then raise exception 'Non puoi segnare biglietti da qui'; end if;
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

revoke all on function public._scheda_segni(text, uuid) from public;
revoke all on function public.biglietti_da_segnare() from public;
revoke all on function public.segna_mio_biglietto(text, date, boolean, boolean, integer) from public;
grant execute on function public.biglietti_da_segnare() to authenticated;
grant execute on function public.segna_mio_biglietto(text, date, boolean, boolean, integer) to authenticated;
