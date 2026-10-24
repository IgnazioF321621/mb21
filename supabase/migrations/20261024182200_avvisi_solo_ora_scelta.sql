-- ═══════════════════════════════════════════════════════════
-- Nota Pagine 083, punto 4 (Ignazio 24/10/2026, «Sì», via Regia): Buongiorno e sera, il database chiama la funzione `avvisi` solo all'ora scelta
-- ═══════════════════════════════════════════════════════════
-- Perché: gli orologi avviso-mattino («0 5-9» UTC) e avviso-check-sera («0 18-21» UTC) chiamano la funzione ogni ora della fascia possibile
-- (Buongiorno 7-10, sera 20-22 di Roma, con il margine per l'ora legale e solare); la funzione avvisa solo chi ha scelto quell'ora: 7 chiamate
-- su 9 al giorno leggevano tutto e non mandavano niente (registri e traffico, piano gratuito).
-- Cosa fa: come per promemoria · senza_esito · tracce (migrazione 20261002210000, riga 65), prima di chiamare il database controlla con una domanda
-- veloce se qualcuno, tra chi può entrare, ha scelto QUEST'ORA di Roma (`avvisi_ora_scelta`); chi non ha salvato una scelta vale il «già impostato»
-- (Buongiorno 9, sera 22: gli stessi di regole.ts GIA_IMPOSTATO e di avvisi.js). Alle 22 la sera parte sempre: l'ultimo giro pulisce i segni vecchi
-- (avvisi_mandati). Il controllo è LARGO (non guarda dispositivi né abbonamenti: lo fa la funzione): al massimo chiama una volta di troppo, mai una
-- di meno; se va in errore si chiama come prima. L'ora si conta in Europe/Rome (dal 25/10 ora solare: l'orologio UTC chiama un'ora diversa, il conto resta giusto).
-- ⚠️ MODIFICA due funzioni esistenti (`avvisi_da_fare`, `chiama_avvisi`) e ne AGGIUNGE una (`avvisi_ora_scelta`): ok di Ignazio, la applica la Regia al rilascio.
-- Gli orologi (cron) NON cambiano. La funzione online `avvisi` per questo punto non si ripubblica.
-- Per tornare indietro: le due definizioni di prima sono qui sotto (pg_get_functiondef del 24/10/2026); poi `drop function public.avvisi_ora_scelta(text, int)`.
--
-- avvisi_da_fare, PRIMA:
--   CREATE OR REPLACE FUNCTION public.avvisi_da_fare(p_tipo text)
--    RETURNS boolean
--    LANGUAGE plpgsql
--    STABLE SECURITY DEFINER
--    SET search_path TO 'public', 'pg_temp'
--   AS $function$
--   declare
--     v_ora_roma int := extract(hour from now() at time zone 'Europe/Rome');
--     v_ok boolean := false;
--   begin
--     if p_tipo = 'promemoria' then
--       -- finestra della funzione: da 5 minuti fa a 91 minuti avanti (appuntamenti, cose, modelli) e fino a 240 (telefonate)
--       return exists (select 1 from azioni where completata = false and promemoria_il is null and tipo_azione <> 'Contatto'
--                        and inizio >= now() - interval '5 minutes' and inizio < now() + interval '91 minutes')
--           or exists (select 1 from azioni where tipo_azione = 'Contatto' and esito in ('PM Fissato', 'Appuntamento') and promemoria_il is null
--                        and data_scelta >= now() - interval '5 minutes' and data_scelta < now() + interval '91 minutes')
--           or exists (select 1 from azioni where tipo_azione = 'Contatto' and completata = false and esito is null and promemoria_il is null
--                        and inizio >= now() - interval '5 minutes' and inizio < now() + interval '240 minutes')
--           or exists (select 1 from cose_da_fare c, unnest(array[(now() at time zone 'Europe/Rome')::date, (now() at time zone 'Europe/Rome')::date + 1]) g(d)
--                       where c.giorno = g.d and c.ora is not null and c.fatto_il is null
--                         and ((g.d + c.ora) at time zone 'Europe/Rome') >= now() - interval '5 minutes'
--                         and ((g.d + c.ora) at time zone 'Europe/Rome') < now() + interval '91 minutes')
--           or exists (select 1 from modello_giorno m, unnest(array[(now() at time zone 'Europe/Rome')::date, (now() at time zone 'Europe/Rome')::date + 1]) g(d)
--                       where m.modello_id is not null and m.core is null and m.attivo is distinct from false
--                         and ((g.d + coalesce(m.ora, (select c2.ora from cose_da_fare c2 where c2.modello_id = m.id and c2.giorno = g.d limit 1))) at time zone 'Europe/Rome') >= now() - interval '5 minutes'
--                         and ((g.d + coalesce(m.ora, (select c2.ora from cose_da_fare c2 where c2.modello_id = m.id and c2.giorno = g.d limit 1))) at time zone 'Europe/Rome') < now() + interval '91 minutes')
--           -- una volta al giorno la funzione pulisce i segni vecchi (alle 3 di Roma): deve poter partire
--           or v_ora_roma = 3;
--     elsif p_tipo = 'senza_esito' then
--       return exists (select 1 from azioni where completata = false and esito is null and senza_esito_avvisato_il is null
--                        and inizio >= now() - interval '24 hours' and inizio < now());
--     elsif p_tipo = 'tracce' then
--       if v_ora_roma < 9 or v_ora_roma >= 21 then return false; end if;   -- la funzione di notte tace
--       return exists (select 1 from condivisioni k
--                       where k.da_glide = false and k.creato_il >= now() - interval '8 days'
--                         and ((not k.ascoltata and (k.avviso_48_il is null
--                                   or (k.avviso_ascolto_il is null and exists (select 1 from contatti ct join utenti u on u.partner_id = ct.codice_amway where ct.id = k.contatto_id)))
--                               and (k.creato_il <= now() - interval '47 hours' or k.condivisa_il::date <= (now() at time zone 'Europe/Rome')::date - 2))
--                           or (k.ascoltata and k.segnata_dal_partner and k.avviso_sponsor_il is null)));
--     end if;
--     return true;   -- ogni altro tipo: si chiama sempre
--   end $function$
--
-- chiama_avvisi, PRIMA:
--   CREATE OR REPLACE FUNCTION public.chiama_avvisi(p_tipo text)
--    RETURNS bigint
--    LANGUAGE plpgsql
--    SECURITY DEFINER
--    SET search_path TO 'public', 'extensions', 'vault'
--   AS $function$
--   declare
--     v_segreto text;
--     v_url text := 'https://exwgjlhbhlgebkgxtanq.supabase.co/functions/v1/avvisi';
--     v_serve boolean := true;
--   begin
--     if p_tipo in ('promemoria', 'senza_esito', 'tracce') then
--       begin
--         v_serve := public.avvisi_da_fare(p_tipo);
--       exception when others then
--         v_serve := true;   -- il controllo non riesce: si chiama come prima
--       end;
--       if not v_serve then return null; end if;
--     end if;
--     select decrypted_secret into v_segreto from vault.decrypted_secrets where name = 'avvisi_segreto';
--     if v_segreto is null then raise exception 'manca il segreto avvisi_segreto in Vault'; end if;
--     return net.http_post(
--       url := v_url,
--       headers := jsonb_build_object('Content-Type', 'application/json', 'x-avvisi-segreto', v_segreto),
--       body := jsonb_build_object('tipo', p_tipo),
--       timeout_milliseconds := 20000);
--   end $function$
-- ═══════════════════════════════════════════════════════════

-- C'è qualcuno, tra chi può entrare, che ha scelto quest'ora di Roma per questo avviso? `p_chiave` = 'buongiorno' o 'check' (utenti.avvisi_quando);
-- senza scelta salvata vale il «già impostato»: 9 il Buongiorno, 22 la sera.
create or replace function public.avvisi_ora_scelta(p_chiave text, p_ora int) returns boolean
language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select exists (select 1 from utenti u
                  where u.accesso_attivo and u.eliminato_il is null
                    and coalesce((u.avvisi_quando ->> p_chiave)::int, case p_chiave when 'buongiorno' then 9 when 'check' then 22 end) = p_ora);
$$;
revoke execute on function public.avvisi_ora_scelta(text, int) from public, anon, authenticated;

create or replace function public.avvisi_da_fare(p_tipo text) returns boolean
language plpgsql stable security definer set search_path to 'public', 'pg_temp' as $$
declare
  v_ora_roma int := extract(hour from now() at time zone 'Europe/Rome');
  v_ok boolean := false;
begin
  if p_tipo = 'promemoria' then
    -- finestra della funzione: da 5 minuti fa a 91 minuti avanti (appuntamenti, cose, modelli) e fino a 240 (telefonate)
    return exists (select 1 from azioni where completata = false and promemoria_il is null and tipo_azione <> 'Contatto'
                     and inizio >= now() - interval '5 minutes' and inizio < now() + interval '91 minutes')
        or exists (select 1 from azioni where tipo_azione = 'Contatto' and esito in ('PM Fissato', 'Appuntamento') and promemoria_il is null
                     and data_scelta >= now() - interval '5 minutes' and data_scelta < now() + interval '91 minutes')
        or exists (select 1 from azioni where tipo_azione = 'Contatto' and completata = false and esito is null and promemoria_il is null
                     and inizio >= now() - interval '5 minutes' and inizio < now() + interval '240 minutes')
        or exists (select 1 from cose_da_fare c, unnest(array[(now() at time zone 'Europe/Rome')::date, (now() at time zone 'Europe/Rome')::date + 1]) g(d)
                    where c.giorno = g.d and c.ora is not null and c.fatto_il is null
                      and ((g.d + c.ora) at time zone 'Europe/Rome') >= now() - interval '5 minutes'
                      and ((g.d + c.ora) at time zone 'Europe/Rome') < now() + interval '91 minutes')
        or exists (select 1 from modello_giorno m, unnest(array[(now() at time zone 'Europe/Rome')::date, (now() at time zone 'Europe/Rome')::date + 1]) g(d)
                    where m.modello_id is not null and m.core is null and m.attivo is distinct from false
                      and ((g.d + coalesce(m.ora, (select c2.ora from cose_da_fare c2 where c2.modello_id = m.id and c2.giorno = g.d limit 1))) at time zone 'Europe/Rome') >= now() - interval '5 minutes'
                      and ((g.d + coalesce(m.ora, (select c2.ora from cose_da_fare c2 where c2.modello_id = m.id and c2.giorno = g.d limit 1))) at time zone 'Europe/Rome') < now() + interval '91 minutes')
        -- una volta al giorno la funzione pulisce i segni vecchi (alle 3 di Roma): deve poter partire
        or v_ora_roma = 3;
  elsif p_tipo = 'senza_esito' then
    return exists (select 1 from azioni where completata = false and esito is null and senza_esito_avvisato_il is null
                     and inizio >= now() - interval '24 hours' and inizio < now());
  elsif p_tipo = 'tracce' then
    if v_ora_roma < 9 or v_ora_roma >= 21 then return false; end if;   -- la funzione di notte tace
    return exists (select 1 from condivisioni k
                    where k.da_glide = false and k.creato_il >= now() - interval '8 days'
                      and ((not k.ascoltata and (k.avviso_48_il is null
                                or (k.avviso_ascolto_il is null and exists (select 1 from contatti ct join utenti u on u.partner_id = ct.codice_amway where ct.id = k.contatto_id)))
                            and (k.creato_il <= now() - interval '47 hours' or k.condivisa_il::date <= (now() at time zone 'Europe/Rome')::date - 2))
                        or (k.ascoltata and k.segnata_dal_partner and k.avviso_sponsor_il is null)));
  elsif p_tipo = 'mattino' then
    -- nota 083: il Buongiorno si sceglie tra le 7 e le 10 di Roma (la funzione fuori da queste ore non manda niente); si chiama solo se qualcuno ha scelto quest'ora
    return v_ora_roma between 7 and 10 and public.avvisi_ora_scelta('buongiorno', v_ora_roma);
  elsif p_tipo = 'check_sera' then
    -- nota 083: la sera si sceglie tra le 20 e le 22; alle 22 si chiama sempre (l'ultimo giro pulisce i segni vecchi), alle 20 e alle 21 solo se qualcuno l'ha scelta
    return v_ora_roma = 22 or (v_ora_roma between 20 and 21 and public.avvisi_ora_scelta('check', v_ora_roma));
  end if;
  return true;   -- ogni altro tipo: si chiama sempre
end $$;

revoke execute on function public.avvisi_da_fare(text) from public, anon, authenticated;

create or replace function public.chiama_avvisi(p_tipo text) returns bigint
language plpgsql security definer set search_path to 'public', 'extensions', 'vault' as $$
declare
  v_segreto text;
  v_url text := 'https://exwgjlhbhlgebkgxtanq.supabase.co/functions/v1/avvisi';
  v_serve boolean := true;
begin
  if p_tipo in ('promemoria', 'senza_esito', 'tracce', 'mattino', 'check_sera') then   -- nota 083: anche Buongiorno e sera
    begin
      v_serve := public.avvisi_da_fare(p_tipo);
    exception when others then
      v_serve := true;   -- il controllo non riesce: si chiama come prima
    end;
    if not v_serve then return null; end if;
  end if;
  select decrypted_secret into v_segreto from vault.decrypted_secrets where name = 'avvisi_segreto';
  if v_segreto is null then raise exception 'manca il segreto avvisi_segreto in Vault'; end if;
  return net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-avvisi-segreto', v_segreto),
    body := jsonb_build_object('tipo', p_tipo),
    timeout_milliseconds := 20000);
end $$;
