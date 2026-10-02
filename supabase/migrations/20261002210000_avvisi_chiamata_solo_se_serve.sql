-- ═══════════════════════════════════════════════════════════
-- Fondamenta e Backup, nota 030 · registri di Supabase: la funzione `avvisi` si chiama solo se c'è qualcosa da fare
-- 2 ottobre 2026
-- ═══════════════════════════════════════════════════════════
-- Perché: i registri del progetto mb21 erano a 0,89 GB su 1 GB (ciclo 15/09–15/10) con 60–75 MB al giorno, e la tolleranza di
-- Supabase per l'organizzazione è finita il 17/08/2026: oltre il limite le richieste possono ricevere «402». Gli orologi chiamavano
-- la funzione Edge anche quando non c'era niente da inviare (~400 chiamate al giorno dopo il taglio delle 17:45, 1.848 prima).
-- Cosa fa: prima di chiamare la funzione, il database controlla con una domanda veloce se c'è almeno un impegno nella finestra
-- che la funzione guarderebbe. Se no, non chiama. Il controllo è LARGO apposta (mai più stretto della funzione): al massimo
-- chiama una volta di troppo, mai una di meno. Se il controllo stesso va in errore, si chiama la funzione come prima.
-- Riguarda solo i tipi frequenti: promemoria · senza_esito · tracce. mattino e check_sera (pochi al giorno) invariati.
-- ⚠️ MODIFICA una funzione esistente (`chiama_avvisi`): ok di Ignazio il 02/10/2026, da applicare subito (rischio limite registri).
-- Per tornare indietro: ripristinare `chiama_avvisi` com'era (20260917192000_avvisi_push.sql) e `drop function public.avvisi_da_fare(text)`.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

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
  if p_tipo in ('promemoria', 'senza_esito', 'tracce') then
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
