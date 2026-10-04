-- Modulo Core: salvare un campo alla volta (Pagine e Grafica, nota 019 · 04/10/2026).
-- Prima l'app (`collegaModuloCore`, pagina-core.js) rileggeva la propria copia di `core_mese.dati`, la cambiava e riscriveva l'INTERO JSON con un upsert:
-- se la lettura di core_mese era fallita il modulo si apriva con i campi a mano vuoti e il primo tocco li sovrascriveva tutti; con due telefoni vinceva l'ultimo
-- e cancellava i campi dell'altro. Ora una funzione nuova scrive solo la chiave cambiata, sul server: dati = dati || { chiave: valore }.
--   core_mese_imposta(p_user, p_mese, p_chiave, p_valore) → crea la riga del mese se manca, cambia solo `p_chiave` dentro `dati`, restituisce la riga intera (json).
-- Non è security definer: valgono le regole di accesso di core_mese («core_mese_own»: ognuno la sua, l'Admin tutte). Aggiunta soltanto: l'app online di prima
-- continua a scrivere con l'upsert e non la usa.

create or replace function public.core_mese_imposta(p_user uuid, p_mese date, p_chiave text, p_valore jsonb)
returns jsonb
language plpgsql
set search_path to 'public'
as $function$
declare
  v_riga public.core_mese;
begin
  if p_chiave is null or length(p_chiave) = 0 or length(p_chiave) > 40 then
    raise exception 'Chiave non valida';
  end if;
  insert into public.core_mese (user_id, mese, dati, aggiornato_il)
  values (p_user, p_mese, jsonb_build_object(p_chiave, coalesce(p_valore, 'null'::jsonb)), now())
  on conflict (user_id, mese) do update
    set dati = public.core_mese.dati || jsonb_build_object(p_chiave, coalesce(p_valore, 'null'::jsonb)),
        aggiornato_il = now()
  returning * into v_riga;
  return to_jsonb(v_riga);
end $function$;

revoke execute on function public.core_mese_imposta(uuid, date, text, jsonb) from public, anon;
grant execute on function public.core_mese_imposta(uuid, date, text, jsonb) to authenticated, service_role;
