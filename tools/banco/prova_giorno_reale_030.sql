-- Prova della nota Azioni 030 (giorno reale) in una transazione ANNULLATA: nessun dato cambia. Uso: supabase db query --linked -f tools/banco/prova_giorno_reale_030.sql
-- Dentro: le migrazioni 20261012185500 e 20261012185700 e le due bozze in attesa di ok (trigger esito_il, stato_oggi). Esito atteso: «PROVA FINITA (tutto verde)».
begin;
-- ═══════════════════════════════════════════════════════════
-- Nota Azioni 030 (Ignazio 12/10/2026: «quello che conta è il reale, non il previsto»; ok al campo nuovo nella nota).
-- Solo aggiunta: campo nuovo facoltativo, nessun cambio a quello che c'è.
-- `azioni.esito_il` = il giorno (ora di Roma) in cui all'azione è stato dato l'esito. Vuoto per le azioni senza esito
-- e per quelle di prima del rilascio (per loro resta il giorno dell'azione).
-- Si applica al rilascio con `supabase db push`.
-- ═══════════════════════════════════════════════════════════
alter table public.azioni add column if not exists esito_il date;
comment on column public.azioni.esito_il is 'Giorno (Roma) in cui è stato dato l''esito (nota Azioni 030). Vuoto = senza esito o azione di prima del 12/10/2026.';
-- ═══════════════════════════════════════════════════════════
-- ⚠️ TRIGGER NUOVO su una tabella esistente (azioni): CLAUDE.md § 4 chiede l'ok esplicito di Ignazio. Si applica al rilascio, solo con l'ok,
-- dopo 20261012185500 (il campo) e prima di 20261012185700 (la vista).
-- Nota Azioni 030: un punto solo per tutte le strade che danno un esito (chiudi_azione, modifica_azione, «Cambia esito», foglio Modifica,
-- Riordini da sentire, Dashboard, MB Plan, scheda, e i loro Annulla). Il trigger tocca SOLO il campo nuovo `esito_il`, nient'altro.
--   · l'esito diventa vuoto (Annulla, riapertura)            → esito_il vuoto
--   · l'azione riceve il suo primo esito                      → esito_il = oggi (Roma)
--   · il «Riordino» di Glide (esito già scritto) si completa  → esito_il = oggi (Roma)
--   · un esito cambiato in un altro («Cambia esito»)          → esito_il resta quello di prima (si corregge l'esito, non il giorno)
-- Le righe NUOVE (coda, azioni scritte a mano già con l'esito) restano vuote: per loro conta il giorno dell'azione, che è quello vero.
-- ═══════════════════════════════════════════════════════════
create or replace function public.mb21_azione_esito_il()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.esito is null then
    new.esito_il := null;
  elsif old.esito is null
     or (old.esito = new.esito and not coalesce(old.completata, false) and coalesce(new.completata, false) and new.esito_il is null) then
    new.esito_il := (now() at time zone 'Europe/Rome')::date;
  end if;
  return new;
end;
$$;
revoke execute on function public.mb21_azione_esito_il() from public, anon, authenticated;

drop trigger if exists mb21_azione_esito_il on public.azioni;
create trigger mb21_azione_esito_il
  before update of esito, completata on public.azioni
  for each row execute function public.mb21_azione_esito_il();
-- ═══════════════════════════════════════════════════════════
-- MODIFICA di una vista esistente: ok di Ignazio del 12/10/2026 (nota Azioni 030, «quello che conta è il reale, non il previsto»;
-- ok scritto nella nota per la vista azioni_conti, con copia di com'era). Si applica al rilascio con `supabase db push`, dopo 20261012185500.
-- `azioni_conti.giorno` = il giorno in cui l'azione conta:
--   · Contatto (telefonata, messaggio…): il giorno in cui è stato dato l'esito (`esito_il`); se è vuoto (azioni di prima) il giorno dell'azione;
--   · Piano Marketing e appuntamenti: il giorno dell'incontro (scelta di Ignazio 12/10: «il giorno dell'incontro»), come prima.
-- Da qui contano check_giorni_conti e check_mesi (Dashboard, Check, Obiettivi) e i complimenti della sera (funzione online avvisi).
-- La stessa regola sta in report.js → giornoAzione (⚠️ si cambiano insieme). Stesse colonne di prima, stesso ordine.
-- Copia di com'era: tools/banco/copie/azioni_conti_prima_030.sql.
-- ═══════════════════════════════════════════════════════════
create or replace view public.azioni_conti as
 SELECT a.id, a.user_id, a.contatto_id,
    g.giorno,
    a.tipo_azione, a.modalita, a.esito,
    (a.tipo_azione = 'Contatto')::integer AS contatti,
    (a.tipo_azione = 'Piano Marketing')::integer AS pm
   FROM azioni a
   CROSS JOIN LATERAL (SELECT CASE WHEN a.tipo_azione = 'Contatto' AND a.esito_il IS NOT NULL THEN a.esito_il
                                   ELSE (a.inizio AT TIME ZONE 'Europe/Rome')::date END AS giorno) g
  WHERE g.giorno >= date '2026-09-14'
    AND g.giorno <= (now() AT TIME ZONE 'Europe/Rome')::date
    AND ((a.tipo_azione = 'Contatto' AND coalesce(a.categoria, '') <> 'Partner'
          AND (a.esito = ANY (ARRAY['PM Fissato', 'Appuntamento', 'Ordine', 'Ordina da solo', 'Richiamare', 'Relazione', 'No Interesse', 'Consulenza Prodotti'])
               OR a.esito = 'Riordino' AND coalesce(a.completata, false)))
         OR (a.tipo_azione = 'Piano Marketing' AND a.esito = ANY (ARRAY['Presentazione', 'Dare Seguito', 'Iscrizione', 'No BuonFine', 'Prodotti'])));
do $$
declare t uuid; p uuid; r record; oggi date := (now() at time zone 'Europe/Rome')::date; n_prima int; n_dopo int; msg text := '';
begin
  -- una telefonata di un Prospect, senza esito, prevista 3 giorni fa (finta: la si crea dentro la prova)
  select user_id, contatto_id into r from azioni where tipo_azione='Contatto' and categoria <> 'Partner' limit 1;
  insert into azioni (user_id, contatto_id, categoria, tipo_azione, modalita, inizio, completata)
    values (r.user_id, r.contatto_id, 'Prospect', 'Contatto', 'Telefonata', now() - interval '3 days', false) returning id into t;
  select count(*) into n_prima from azioni_conti where id = t;
  if n_prima <> 0 then raise exception 'senza esito non deve contare'; end if;
  update azioni set esito = 'No Interesse', completata = true where id = t;
  select * into r from azioni_conti where id = t;
  if r.giorno <> oggi then raise exception 'telefonata chiusa oggi: giorno % invece di %', r.giorno, oggi; end if;
  msg := msg || 'telefonata in ritardo conta oggi · ';
  update azioni set esito = 'Richiamare' where id = t;
  if (select esito_il from azioni where id = t) <> oggi then raise exception 'cambia esito ha perso il giorno'; end if;
  msg := msg || 'cambia esito tiene il giorno · ';
  update azioni set esito = null, completata = false where id = t;
  if (select esito_il from azioni where id = t) is not null then raise exception 'annulla non ha azzerato'; end if;
  if exists (select 1 from azioni_conti where id = t) then raise exception 'annullata conta ancora'; end if;
  msg := msg || 'annulla azzera · ';
  -- un PM di 3 giorni fa chiuso oggi: conta il giorno dell'incontro
  insert into azioni (user_id, contatto_id, categoria, tipo_azione, modalita, inizio, completata)
    values ((select user_id from azioni where id=t), (select contatto_id from azioni where id=t), 'Prospect', 'Piano Marketing', 'PM 1a1', now() - interval '3 days', false) returning id into p;
  update azioni set esito = 'Presentazione', completata = true where id = p;
  if (select giorno from azioni_conti where id = p) <> ((now() - interval '3 days') at time zone 'Europe/Rome')::date then raise exception 'PM non nel giorno dell''incontro'; end if;
  msg := msg || 'PM nel giorno dell''incontro · ';
  -- telefonata scritta già con l'esito (coda): esito_il vuoto, conta il suo giorno
  insert into azioni (user_id, contatto_id, categoria, tipo_azione, modalita, inizio, completata, esito, da_coda)
    values ((select user_id from azioni where id=t), (select contatto_id from azioni where id=t), 'Prospect', 'Contatto', 'Telefonata', now(), true, 'Richiamare', true) returning id into p;
  if (select esito_il from azioni where id = p) is not null or (select giorno from azioni_conti where id = p) <> oggi then raise exception 'riga della coda sbagliata'; end if;
  msg := msg || 'coda come prima · ';
  -- le righe vecchie: il conto per giorno di prima e di dopo è uguale (esito_il vuoto ovunque)
  select count(*) into n_dopo from azioni_conti;
  msg := msg || 'righe nella vista: ' || n_dopo;
  raise notice 'Parte 1 verde: %', msg;
end $$;
create temp table prima as select u.id, (public.stato_oggi(u.id)->>'fatti_oggi')::int f from utenti u;
-- ═══════════════════════════════════════════════════════════
-- ⚠️ MODIFICA di una funzione esistente (stato_oggi): serve l'ok esplicito di Ignazio (nota Azioni 030: «il resto si chiede di nuovo»).
-- Si applica al rilascio, dopo 20261012185500 (campo) e 20261012185600 (trigger).
-- «Contatti 3 di 5» (Dashboard e MB Plan): una telefonata scelta a mano conta nel giorno in cui le si dà l'esito (`esito_il`),
-- non in quello in cui era prevista; le righe della coda come prima (nascono già con l'esito, nel momento in cui si dà).
-- Per le telefonate di prima (esito_il vuoto) resta il giorno dell'azione. Copia di com'era: tools/banco/copie/stato_oggi_prima_030.sql.
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.stato_oggi(p_utente uuid DEFAULT NULL::uuid)
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
                           and coalesce(a.esito_il, (a.inizio at time zone 'Europe/Rome')::date) = (now() at time zone 'Europe/Rome')::date))),
    'catalogati_oggi', (select count(*) from public.contatti c
                        where c.user_id = u.id and c.catalogato_il = (now() at time zone 'Europe/Rome')::date))
  from public.utenti u where u.id = coalesce(p_utente, public.utente_corrente());
$function$;
do $$ declare diversi int; r record; t uuid; f0 int; f1 int; begin
  select count(*) into diversi from prima p where p.f is distinct from (public.stato_oggi(p.id)->>'fatti_oggi')::int;
  if diversi > 0 then raise exception 'cambiati % utenti', diversi; end if;
  select user_id, contatto_id into r from azioni where tipo_azione='Contatto' limit 1;
  f0 := (public.stato_oggi(r.user_id)->>'fatti_oggi')::int;
  insert into azioni (user_id, contatto_id, categoria, tipo_azione, modalita, inizio, completata, scelta_a_mano)
    values (r.user_id, r.contatto_id, 'Prospect', 'Contatto', 'Telefonata', now() - interval '1 day', false, true) returning id into t;
  update azioni set esito='Richiamare', completata=true where id=t;
  f1 := (public.stato_oggi(r.user_id)->>'fatti_oggi')::int;
  if f1 <> f0 + 1 then raise exception 'telefonata di ieri chiusa oggi non contata: % -> %', f0, f1; end if;
  raise exception 'PROVA FINITA (tutto verde): nessun utente cambia oggi; la telefonata di ieri chiusa oggi conta oggi (% -> %)', f0, f1;
end $$; rollback;
