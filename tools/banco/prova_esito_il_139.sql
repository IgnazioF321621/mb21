-- Prova della nota Pagine 139 (29/10/2026): applica la migrazione 20261029063500 e lo script tools/banco/dati_139_esito_il.sql dentro una prova annullata
-- (raise exception alla fine: nel database non resta niente). Confronta azioni_conti, stato_oggi, il giorno del Report e «Già sentiti oggi» prima e dopo,
-- poi un promemoria Riordino arrivato oggi, le azioni che nascono fatte, un promemoria Riordino chiuso con «Ordine» (conta oggi) e il suo «annulla»
-- (torna senza esito_il). Esito del 29/10 mattina: 1609 righe, tutti i conti identici (0 differenze).
-- Uso: supabase db query --linked -f tools/banco/prova_esito_il_139.sql (il risultato è nel messaggio d'errore «RISULTATO …»)
do $prova$
declare r text; n int; u uuid; c uuid; a1 uuid; a2 uuid; a3 uuid; a4 uuid; a5 uuid;
begin
  create temp table p_conti as select user_id, giorno, tipo_azione, count(*) n, sum(contatti) c, sum(pm) pm from public.azioni_conti group by 1,2,3;
  create temp table p_stato as select id, public.stato_oggi(id)::text s from public.utenti;
  create temp table p_report as select id, case when tipo_azione='Contatto' and esito_il is not null then esito_il else (inizio at time zone 'Europe/Rome')::date end g from public.azioni;
  create temp table p_sentiti as select user_id, count(*) n from public.azioni where tipo_azione='Contatto' and esito is not null and (esito_il = (now() at time zone 'Europe/Rome')::date or (esito_il is null and (inizio at time zone 'Europe/Rome')::date = (now() at time zone 'Europe/Rome')::date)) group by 1;
  execute $mig$CREATE OR REPLACE FUNCTION public.mb21_azione_esito_il()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  oggi date := (now() at time zone 'Europe/Rome')::date;
begin
  if tg_op = 'INSERT' then
    -- nota 139: un'azione che nasce già fatta con l'esito ha il suo giorno; un promemoria (non completata) aspetta di essere fatto
    if new.esito is null then
      new.esito_il := null;
    elsif new.esito_il is null and coalesce(new.completata, false) then
      new.esito_il := case
        when new.inizio is not null and (new.inizio at time zone 'Europe/Rome')::date < oggi
          then (new.inizio at time zone 'Europe/Rome')::date
        else oggi
      end;
    end if;
    return new;
  end if;
  if new.esito is null then
    new.esito_il := null;
  elsif coalesce(old.completata, false) and not coalesce(new.completata, false) then
    new.esito_il := null;   -- nota 139: riaperta («annulla» di chiudi_appuntamento → riapri_appuntamento): non è più fatta
  elsif old.esito is null
     or (new.esito_il is null   -- nota 139: se il chiamante non l'ha già scritto
         and (old.esito is distinct from new.esito   -- es. il promemoria «Riordino» chiuso con «Ordine» dalla card del riordino
              or (not coalesce(old.completata, false) and coalesce(new.completata, false)))) then
    new.esito_il := case
      when new.creato_il is not null and (new.creato_il at time zone 'Europe/Rome')::date = oggi
       and new.inizio is not null and (new.inizio at time zone 'Europe/Rome')::date < oggi
        then (new.inizio at time zone 'Europe/Rome')::date   -- nota 135: un contatto vecchio registrato oggi va nel suo giorno
      else oggi
    end;
  end if;
  return new;
end;
$function$$mig$;
  execute $mig$drop trigger if exists mb21_azione_esito_il on public.azioni$mig$;
  execute $mig$create trigger mb21_azione_esito_il
  before insert or update of esito, completata on public.azioni
  for each row execute function public.mb21_azione_esito_il()$mig$;
  execute $mig$create or replace view public.azioni_conti as
 SELECT t.id, t.user_id, t.contatto_id, t.giorno, t.tipo_azione, t.modalita, t.esito, t.contatti,
    CASE WHEN t.tipo_azione = 'Piano Marketing'
         THEN (row_number() OVER (PARTITION BY t.user_id, t.inizio, t.modalita ORDER BY t.id) = 1)::integer
         ELSE 0 END AS pm
   FROM (
 SELECT a.id, a.user_id, a.contatto_id,
    g.giorno,
    a.tipo_azione, a.modalita, a.esito,
    (a.tipo_azione = 'Contatto')::integer AS contatti,
    a.inizio
   FROM azioni a
   CROSS JOIN LATERAL (SELECT CASE WHEN a.tipo_azione = 'Contatto' THEN a.esito_il   -- nota 139: solo il giorno in cui è stato fatto davvero
                                   ELSE (a.inizio AT TIME ZONE 'Europe/Rome')::date END AS giorno) g
  WHERE g.giorno >= date '2026-09-14'
    AND g.giorno <= (now() AT TIME ZONE 'Europe/Rome')::date
    AND ((a.tipo_azione = 'Contatto' AND coalesce(a.categoria, '') <> 'Partner'
          AND (a.esito = ANY (ARRAY['PM Fissato', 'Appuntamento', 'Ordine', 'Ordina da solo', 'Richiamare', 'Relazione', 'No Interesse', 'Consulenza Prodotti'])
               OR a.esito = 'Riordino' AND coalesce(a.completata, false)))
         OR (a.tipo_azione = 'Piano Marketing' AND a.esito = ANY (ARRAY['Presentazione', 'Dare Seguito', 'Iscrizione', 'No BuonFine', 'Prodotti'])))
   ) t$mig$;
  execute $mig$CREATE OR REPLACE FUNCTION public.stato_oggi(p_utente uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select json_build_object(
    'contatti_al_giorno', u.contatti_al_giorno,
    'fatti_oggi', (select count(*) from public.azioni a
                   where a.user_id = u.id
                     and ((a.da_coda
                           and a.inizio >= (date_trunc('day', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome')
                           and a.inizio <  (date_trunc('day', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome') + interval '1 day')
                       or (a.scelta_a_mano and coalesce(a.completata, false) and a.esito is not null
                           and a.esito_il = (now() at time zone 'Europe/Rome')::date))),   -- nota 139: solo il giorno di esito_il
    'catalogati_oggi', (select count(*) from public.contatti c
                        where c.user_id = u.id and c.catalogato_il = (now() at time zone 'Europe/Rome')::date))
  from public.utenti u where u.id = coalesce(p_utente, public.utente_corrente());
$function$$mig$;

  execute $d$update public.azioni
set esito_il = (inizio at time zone 'Europe/Rome')::date
where esito is not null and esito_il is null and inizio is not null
  and (inizio at time zone 'Europe/Rome')::date <= (now() at time zone 'Europe/Rome')::date$d$;
  get diagnostics n = row_count;
  r := 'righe riempite=' || n;
  select count(*) into n from (select user_id, giorno, tipo_azione, count(*) n, sum(contatti) c, sum(pm) pm from public.azioni_conti group by 1,2,3) x full join p_conti y using (user_id, giorno, tipo_azione) where x.n is distinct from y.n or x.c is distinct from y.c or x.pm is distinct from y.pm;
  r := r || ' · azioni_conti giorni diversi=' || n || ' (su ' || (select count(*) from p_conti) || ' righe, dal ' || (select min(giorno) from p_conti) || ')';
  select count(*) into n from public.utenti u join p_stato p on p.id=u.id where public.stato_oggi(u.id)::text is distinct from p.s;
  r := r || ' · stato_oggi diversi=' || n || ' su ' || (select count(*) from p_stato);
  select count(*) into n from public.azioni a join p_report p on p.id=a.id where p.g <= (now() at time zone 'Europe/Rome')::date and (case when a.tipo_azione='Contatto' and a.esito is not null then a.esito_il else (a.inizio at time zone 'Europe/Rome')::date end) is distinct from p.g;
  r := r || ' · report giorni diversi (fino a oggi)=' || n;
  select count(*) into n from (select user_id, count(*) n from public.azioni where tipo_azione='Contatto' and esito is not null and esito_il = (now() at time zone 'Europe/Rome')::date group by 1) x full join p_sentiti y using (user_id) where x.n is distinct from y.n;
  r := r || ' · sentiti oggi diversi=' || n;
  select count(*) into n from public.azioni where esito is not null and esito_il is null;
  r := r || ' · restano senza esito_il=' || n;
  -- promemoria Glide: Riordino non completato, il suo giorno è arrivato (stamattina)
  select user_id, contatto_id into u, c from public.azioni where tipo_azione='Contatto' and esito is not null and contatto_id is not null and categoria is distinct from 'Partner' limit 1;
  insert into public.azioni(user_id, contatto_id, tipo_azione, modalita, esito, inizio, completata, scelta_a_mano) values (u, c, 'Contatto', 'Telefonata', 'Riordino', date_trunc('day', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome' + interval '1 minute', null, true) returning id into a1;
  -- un esito scritto in anticipo (non completato) con la data di oggi
  insert into public.azioni(user_id, contatto_id, tipo_azione, modalita, esito, inizio, completata, scelta_a_mano) values (u, c, 'Contatto', 'Telefonata', 'Ordine', date_trunc('day', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome' + interval '1 minute', null, true) returning id into a2;
  r := r || ' · promemoria Riordino esito_il=' || coalesce((select esito_il::text from public.azioni where id=a1),'vuoto')
         || ' in azioni_conti=' || (select count(*) from public.azioni_conti where id in (a1,a2))
         || ' stato_oggi prima/dopo=' || coalesce((select s from p_stato where id=u),'?') || ' / ' || public.stato_oggi(u)::text;
  -- un'azione che nasce fatta (come registra_esito) oggi e una per ieri
  insert into public.azioni(user_id, contatto_id, tipo_azione, modalita, esito, inizio, completata) values (u, c, 'Contatto', 'Telefonata', 'Richiamare', now(), true) returning id into a3;
  insert into public.azioni(user_id, contatto_id, tipo_azione, modalita, esito, inizio, completata) values (u, c, 'Appuntamento', 'Avvio', 'RolePlay', now() - interval '1 day', true) returning id into a4;
  r := r || ' · nasce fatta oggi esito_il=' || (select coalesce(esito_il::text,'vuoto') from public.azioni where id=a3) || ' · nasce fatta per ieri esito_il=' || (select coalesce(esito_il::text,'vuoto') from public.azioni where id=a4);
  -- il promemoria viene fatto davvero: completata = true → conta oggi
  update public.azioni set completata = true where id = a1;
  r := r || ' · promemoria fatto: esito_il=' || coalesce((select esito_il::text from public.azioni where id=a1),'vuoto') || ' in azioni_conti=' || (select count(*) from public.azioni_conti where id = a1);
  -- un altro promemoria Riordino chiuso dalla card del riordino con «Ordine» (chiudi_appuntamento: esito e completata insieme) → conta oggi
  insert into public.azioni(user_id, contatto_id, tipo_azione, modalita, esito, inizio, completata, categoria) values (u, c, 'Contatto', 'Telefonata', 'Riordino', date_trunc('day', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome' + interval '1 minute', null, 'Cliente') returning id into a5;
  update public.azioni set esito = 'Ordine', completata = true where id = a5;
  r := r || ' · Riordino chiuso con Ordine: esito_il=' || coalesce((select esito_il::text from public.azioni where id=a5),'vuoto') || ' in azioni_conti=' || (select count(*) from public.azioni_conti where id = a5);
  -- «annulla»: riapri_appuntamento rimette esito e completata di prima → non è più fatto
  update public.azioni set esito = 'Riordino', completata = null where id = a5;
  r := r || ' · annullato: esito_il=' || coalesce((select esito_il::text from public.azioni where id=a5),'vuoto') || ' in azioni_conti=' || (select count(*) from public.azioni_conti where id = a5);
  -- esito cambiato su una riga che esito_il l'ha già (ieri): resta ieri (nota Azioni 030)
  update public.azioni set esito = 'Iscrizione' where id = a4;
  r := r || ' · esito cambiato su riga di ieri: esito_il=' || coalesce((select esito_il::text from public.azioni where id=a4),'vuoto');
  raise exception 'RISULTATO %', r;
end $prova$;
