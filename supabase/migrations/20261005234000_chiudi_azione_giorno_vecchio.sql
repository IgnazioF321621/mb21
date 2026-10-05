-- Azioni, nota 013 (Ignazio 05/10/2026): una telefonata salvata «senza orario» (nota 012) con una data vecchia (storico catalogato dalla scheda, es. 2020)
-- all'esito saltava a oggi: chiudi_azione (migrazione 20261004091000) metteva sempre `inizio = now()`, pensato per la telefonata scelta a mano di oggi.
-- Così «Il mio giorno», Report, Griglia e Core la contavano come fatta oggi.
-- Ora: l'ora di adesso solo se il giorno dell'azione (Roma) è oggi; se è un altro giorno (passato o futuro) il giorno resta quello e l'ora è neutra,
-- 12:00 di Roma per 15 minuti. `senza_ora` va a false come prima; `orario_prec` tiene com'era e annulla_chiusura (invariata) lo rimette.
-- MODIFICA di una funzione esistente (CLAUDE.md § 4): ok di Ignazio del 05/10 in chat; provata in transazione annullata (tools/banco/prova_chiudi_azione_013.sql).

create or replace function public.chiudi_azione(p_azione uuid, p_esito text, p_passi_avvio text[] default '{}', p_extra text[] default '{}')
returns json
language plpgsql
set search_path to 'public'
as $function$
declare
  v_prima  json;
  v_az     public.azioni;
  v_col    text;
  v_esito  text;
  v_n      integer;
  v_id     uuid;
  v_avvio  text[] := '{}';
  v_extra  uuid[] := '{}';
  v_orario json;        -- inizio e fine di prima, solo per la telefonata senza orario (serve ad Annulla)
  v_giorno date;        -- giorno dell'azione, a Roma
  v_nuovo  timestamptz; -- orario che prende la telefonata senza orario quando si chiude
begin
  select * into v_az from public.azioni where id = p_azione;
  if not found then raise exception 'Appuntamento non trovato'; end if;
  -- telefonata scelta a mano senza orario (nota 012): se è di oggi si chiude adesso, quindi l'ora è adesso;
  -- se è di un altro giorno (storico o futuro, nota 013) resta sul suo giorno, alle 12:00 di Roma
  if coalesce(v_az.senza_ora, false) and not coalesce(v_az.completata, false) then
    v_orario := json_build_object('inizio', v_az.inizio, 'fine', v_az.fine);
    v_giorno := (v_az.inizio at time zone 'Europe/Rome')::date;
    if v_giorno = (now() at time zone 'Europe/Rome')::date then
      v_nuovo := now();
    else
      v_nuovo := (v_giorno + time '12:00') at time zone 'Europe/Rome';
    end if;
    update public.azioni set inizio = v_nuovo, fine = v_nuovo + interval '15 minutes', senza_ora = false where id = p_azione;
  end if;

  v_prima := public.chiudi_appuntamento(p_azione, p_esito);
  select * into v_az from public.azioni where id = p_azione;

  foreach v_col in array coalesce(p_passi_avvio, '{}') loop
    if v_col !~ '^onb_[a-z0-9_]+$' or not exists (select 1 from information_schema.columns
                                                    where table_schema = 'public' and table_name = 'contatti' and column_name = v_col) then
      raise exception 'Passo dell''avvio non valido: %', v_col;
    end if;
    execute format('update public.contatti set %I = true where id = $1 and %I is not true', v_col, v_col) using v_az.contatto_id;
    get diagnostics v_n = row_count;
    if v_n > 0 then v_avvio := v_avvio || v_col; end if;
  end loop;

  foreach v_esito in array coalesce(p_extra, '{}') loop
    insert into public.azioni (contatto_id, user_id, categoria, tipo_azione, modalita, area, inizio, fine, completata, esito, portato_da)
    values (v_az.contatto_id, v_az.user_id, v_az.categoria, v_az.tipo_azione, v_az.modalita, v_az.area, v_az.inizio, v_az.fine, true, v_esito, v_az.portato_da)
    returning id into v_id;
    v_extra := v_extra || v_id;
  end loop;

  return json_build_object('prima', v_prima, 'avvio', to_json(v_avvio), 'extra', to_json(v_extra), 'orario_prec', v_orario);
end $function$;

-- Permessi come prima (CLAUDE.md § 4): create or replace li conserva, ribaditi per sicurezza
revoke execute on function public.chiudi_azione(uuid, text, text[], text[]) from public, anon;
grant execute on function public.chiudi_azione(uuid, text, text[], text[]) to authenticated, service_role;
