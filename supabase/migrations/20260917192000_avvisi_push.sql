-- Cantiere 24 · avvisi push sul telefono (passo 1: impianto + avviso delle 22 «Hai fatto il Check di oggi?»)
-- Un dispositivo che ha detto «sì» agli avvisi = una riga in avvisi_dispositivi.
-- L'orologio (pg_cron) chiama la funzione Edge «avvisi» che spedisce con Web Push.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create table if not exists avvisi_dispositivi (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references utenti(id) on delete cascade,
  endpoint    text not null unique,       -- indirizzo del dispositivo dato dal browser
  p256dh      text not null,              -- chiavi del dispositivo (servono a cifrare l'avviso)
  auth        text not null,
  dispositivo text,                       -- «iPhone · Safari» ecc., solo per capire in Admin
  creato_il   timestamptz not null default now(),
  ultimo_invio timestamptz,
  ultimo_errore text
);
create index if not exists avvisi_dispositivi_utente on avvisi_dispositivi(user_id);

alter table avvisi_dispositivi enable row level security;
create policy "dispositivi: i propri" on avvisi_dispositivi for select using (user_id = utente_corrente());
create policy "dispositivi: registra il proprio" on avvisi_dispositivi for insert with check (user_id = utente_corrente());
create policy "dispositivi: aggiorna il proprio" on avvisi_dispositivi for update using (user_id = utente_corrente()) with check (user_id = utente_corrente());
create policy "dispositivi: toglie il proprio" on avvisi_dispositivi for delete using (user_id = utente_corrente());

-- Chiama la funzione Edge «avvisi» con il segreto condiviso (in Vault, nome «avvisi_segreto»).
-- La funzione controlla da sola l'ora di Roma: l'orologio di Supabase va in UTC e l'ora legale cambia.
create or replace function chiama_avvisi(p_tipo text) returns bigint
language plpgsql security definer set search_path = public, extensions, vault as $$
declare
  v_segreto text;
  v_url text := 'https://exwgjlhbhlgebkgxtanq.supabase.co/functions/v1/avvisi';
begin
  select decrypted_secret into v_segreto from vault.decrypted_secrets where name = 'avvisi_segreto';
  if v_segreto is null then raise exception 'manca il segreto avvisi_segreto in Vault'; end if;
  return net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-avvisi-segreto', v_segreto),
    body := jsonb_build_object('tipo', p_tipo),
    timeout_milliseconds := 20000);
end $$;
revoke all on function chiama_avvisi(text) from public, anon, authenticated;

-- Avviso della sera: 22:00 di Roma = 20:00 UTC con l'ora legale, 21:00 UTC con quella solare.
-- Si chiama a tutte e due le ore; la funzione Edge spedisce solo se a Roma sono le 22.
select cron.schedule('avviso-check-sera', '0 20,21 * * *', $$select chiama_avvisi('check_sera')$$);
