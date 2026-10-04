-- Chiusura di un'azione in una transazione sola (Azioni, nota 045 · 04/10/2026). Prima `chiudiAppuntamento` (index.html) faceva dal telefono 3-5 chiamate una dopo
-- l'altra (la funzione chiudi_appuntamento, poi la spunta dei passi in «Il mio avvio», poi una riga di azione per ogni passo in più), senza transazione e senza
-- guardare gli errori dei passi intermedi: con la rete che cade a metà l'esito restava salvato e mancava il resto, e «Annulla» ripercorreva solo una parte.
-- Ora due funzioni nuove (l'app online di prima non le usa: continua a chiamare chiudi_appuntamento):
--   chiudi_azione(p_azione, p_esito, p_passi_avvio, p_extra) → chiude l'azione (chiudi_appuntamento, con la sua regola dello storico), spunta le colonne onb_… di
--       «Il mio avvio» che non erano già spuntate, scrive una riga di azione per ogni esito di `p_extra` («Su cosa lavorate?»: stesso contatto, giorno e ora);
--       tutto o niente. Restituisce { prima, avvio: [colonne spuntate adesso], extra: [id delle righe scritte] }: serve a «Annulla».
--   annulla_chiusura(p_azione, p_prima, p_rientro_cambiato) → rimette l'azione com'era (riapri_appuntamento), toglie le spunte e le righe in più. `p_prima` è
--       quello che ha restituito chiudi_azione; `p_rientro_cambiato` (facoltativo) vince su quello di `prima` (la telefonata cambia la coda da sé).
-- Le colonne dell'Avvio le sceglie l'app (MB21Lista.passoAvvioDa): qui si controlla solo che siano colonne onb_… di `contatti`.
-- Aggiunte soltanto: non cambiano niente di ciò che l'app online usa.

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
begin
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

  return json_build_object('prima', v_prima, 'avvio', to_json(v_avvio), 'extra', to_json(v_extra));
end $function$;

create or replace function public.annulla_chiusura(p_azione uuid, p_prima json, p_rientro_cambiato boolean default null)
returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_contatto uuid := (p_prima->'prima'->>'contatto_id')::uuid;
  v_col      text;
begin
  perform public.riapri_appuntamento(p_azione, p_prima->'prima'->>'esito_prec', (p_prima->'prima'->>'completata_prec')::boolean, v_contatto,
    (p_prima->'prima'->>'rientro_prec')::date, (p_prima->'prima'->>'in_coda_prec')::date,
    coalesce(p_rientro_cambiato, (p_prima->'prima'->>'rientro_cambiato')::boolean, false));

  for v_col in select json_array_elements_text(coalesce(p_prima->'avvio', '[]'::json)) loop
    if v_col !~ '^onb_[a-z0-9_]+$' or not exists (select 1 from information_schema.columns
                                                    where table_schema = 'public' and table_name = 'contatti' and column_name = v_col) then
      raise exception 'Passo dell''avvio non valido: %', v_col;
    end if;
    execute format('update public.contatti set %I = false where id = $1', v_col) using v_contatto;
  end loop;

  delete from public.azioni
   where contatto_id = v_contatto
     and id in (select (json_array_elements_text(coalesce(p_prima->'extra', '[]'::json)))::uuid);
end $function$;

-- Permessi (CLAUDE.md § 4): solo chi è entrato
revoke execute on function public.chiudi_azione(uuid, text, text[], text[]) from public, anon;
revoke execute on function public.annulla_chiusura(uuid, json, boolean) from public, anon;
grant execute on function public.chiudi_azione(uuid, text, text[], text[]) to authenticated, service_role;
grant execute on function public.annulla_chiusura(uuid, json, boolean) to authenticated, service_role;
