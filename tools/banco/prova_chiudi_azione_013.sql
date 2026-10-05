-- Prova della nota Azioni 013 (05/10/2026): chiudi_azione su una telefonata senza orario di un giorno vecchio, di oggi e di domani.
-- Tutto dentro una transazione che finisce SEMPRE annullata: il blocco termina con un'eccezione voluta («PROVA FINITA»), poi c'è anche rollback.
-- Si lancia così (la migrazione va messa prima, nello stesso file, se non è ancora applicata):
--   cat supabase/migrations/20261005234000_chiudi_azione_giorno_vecchio.sql tools/banco/prova_chiudi_azione_013.sql > /tmp/p.sql && supabase db query --linked -f /tmp/p.sql
do $prova$
declare
  v_user    uuid := (select user_id from public.contatti where user_id is not null limit 1);
  v_cont    uuid;
  v_a uuid; v_b uuid; v_c uuid;
  v_oggi    date := (now() at time zone 'Europe/Rome')::date;
  r         public.azioni;
  v_ris     json;
  v_prova   text[] := '{}';
begin
  insert into public.contatti (user_id, nome) values (v_user, 'PROVA 013 (annullata)') returning id into v_cont;
  insert into public.azioni (user_id, contatto_id, categoria, tipo_azione, modalita, inizio, fine, completata, scelta_a_mano, senza_ora)
    values (v_user, v_cont, 'Prospect', 'Contatto', 'Telefonata', '2020-03-10 00:00 Europe/Rome', '2020-03-10 00:15 Europe/Rome', false, true, true) returning id into v_a;
  insert into public.azioni (user_id, contatto_id, categoria, tipo_azione, modalita, inizio, fine, completata, scelta_a_mano, senza_ora)
    values (v_user, v_cont, 'Prospect', 'Contatto', 'Telefonata', (v_oggi::timestamp) at time zone 'Europe/Rome', (v_oggi::timestamp + interval '15 min') at time zone 'Europe/Rome', false, true, true) returning id into v_b;
  insert into public.azioni (user_id, contatto_id, categoria, tipo_azione, modalita, inizio, fine, completata, scelta_a_mano, senza_ora)
    values (v_user, v_cont, 'Prospect', 'Contatto', 'Telefonata', ((v_oggi + 1)::timestamp) at time zone 'Europe/Rome', ((v_oggi + 1)::timestamp + interval '15 min') at time zone 'Europe/Rome', false, true, true) returning id into v_c;

  -- 1. telefonata del 2020: resta sul suo giorno, alle 12:00 di Roma
  v_ris := public.chiudi_azione(v_a, 'Non risponde');
  select * into r from public.azioni where id = v_a;
  if (r.inizio at time zone 'Europe/Rome') <> '2020-03-10 12:00'::timestamp then raise exception 'FALLITA 1: inizio % (atteso 2020-03-10 12:00 Roma)', r.inizio at time zone 'Europe/Rome'; end if;
  if r.fine <> r.inizio + interval '15 minutes' or r.senza_ora or not r.completata or r.esito <> 'Non risponde' then raise exception 'FALLITA 1b: fine % senza_ora % completata % esito %', r.fine, r.senza_ora, r.completata, r.esito; end if;
  if (v_ris->'orario_prec'->>'inizio')::timestamptz <> '2020-03-10 00:00 Europe/Rome'::timestamptz then raise exception 'FALLITA 1c: orario_prec %', v_ris->'orario_prec'; end if;
  v_prova := array_append(v_prova, 'vecchia → 2020-03-10 12:00 Roma, 15 minuti, senza_ora false');

  -- 2. telefonata di oggi: ora di adesso
  v_ris := public.chiudi_azione(v_b, 'Non risponde');
  select * into r from public.azioni where id = v_b;
  if abs(extract(epoch from (r.inizio - now()))) > 2 or r.fine <> r.inizio + interval '15 minutes' or r.senza_ora then raise exception 'FALLITA 2: inizio % (atteso adesso %)', r.inizio, now(); end if;
  v_prova := array_append(v_prova, 'oggi → adesso, 15 minuti');

  -- 3. telefonata di domani (chiusa in anticipo): resta su domani alle 12:00
  v_ris := public.chiudi_azione(v_c, 'Non risponde');
  select * into r from public.azioni where id = v_c;
  if (r.inizio at time zone 'Europe/Rome') <> ((v_oggi + 1)::timestamp + interval '12 hours') then raise exception 'FALLITA 3: inizio %', r.inizio at time zone 'Europe/Rome'; end if;
  v_prova := array_append(v_prova, 'domani → domani 12:00 Roma');

  -- 4. Annulla sulla vecchia: torna a mezzanotte del 2020-03-10, senza orario
  select * into r from public.azioni where id = v_a;
  perform public.annulla_chiusura(v_a, (select json_build_object('prima', json_build_object('contatto_id', v_cont, 'esito_prec', null, 'completata_prec', false, 'rientro_prec', null, 'in_coda_prec', null, 'rientro_cambiato', false),
                                                               'avvio', '[]'::json, 'extra', '[]'::json,
                                                               'orario_prec', json_build_object('inizio', '2020-03-10 00:00 Europe/Rome'::timestamptz, 'fine', '2020-03-10 00:15 Europe/Rome'::timestamptz))));
  select * into r from public.azioni where id = v_a;
  if (r.inizio at time zone 'Europe/Rome') <> '2020-03-10 00:00'::timestamp or not r.senza_ora or r.completata then raise exception 'FALLITA 4: inizio % senza_ora % completata %', r.inizio at time zone 'Europe/Rome', r.senza_ora, r.completata; end if;
  v_prova := array_append(v_prova, 'Annulla → 2020-03-10 00:00 Roma, senza orario, riaperta');

  raise exception 'PROVA FINITA, tutto ok: %', array_to_string(v_prova, ' · ');
end $prova$;
rollback;
