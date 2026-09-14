-- ═══════════════════════════════════════════════════════════
-- Contatti al giorno (1-10), massimo giornaliero della coda
-- 14 settembre 2026
-- ═══════════════════════════════════════════════════════════
-- Decisione di Ignazio: ogni utente sceglie quanti contatti lavorare al giorno.
-- È un massimo: dopo N esiti dalla coda, per oggi la coda è finita.
-- I Dare Seguito scaduti restano fuori dal conto.
--
-- 1. utenti.contatti_al_giorno (predefinito 5)
-- 2. azioni.da_coda: l'esito è stato dato da una card della coda (non da un Dare Seguito)
-- 3. registra_esito con p_da_coda
-- 4. imposta_contatti_al_giorno(n): l'utente cambia solo il proprio numero
-- 5. stato_oggi(): numero scelto + esiti dalla coda già dati oggi (Roma)
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

alter table public.utenti add column contatti_al_giorno smallint not null default 5
  check (contatti_al_giorno between 1 and 10);

alter table public.azioni add column da_coda boolean not null default false;
-- Gli esiti già dati dall'app prima di questa modifica venivano tutti dalla coda.
update public.azioni set da_coda = true where glide_id is null;

drop function public.registra_esito(uuid, text, timestamptz, text);

create function public.registra_esito(p_contatto uuid, p_chiave text, p_data timestamptz default null,
                                      p_modalita text default 'Telefonata', p_da_coda boolean default false)
returns json language plpgsql security invoker set search_path = public as $$
declare
  v_seq   public.sequenze;
  v_prec  public.contatti;
  v_oggi  date := (now() at time zone 'Europe/Rome')::date;
  v_id    uuid;
begin
  select * into v_seq from public.sequenze where chiave = p_chiave;
  if not found then raise exception 'Fase non trovata: %', p_chiave; end if;

  select * into v_prec from public.contatti where id = p_contatto;
  if not found then raise exception 'Contatto non trovato'; end if;

  insert into public.azioni (user_id, contatto_id, categoria, tipo_azione, modalita, esito, inizio, completata,
                             data_scelta, da_coda)
  values (public.utente_corrente(), p_contatto, v_seq.categoria, v_seq.tipo_azione, p_modalita, v_seq.fase, now(), true,
          p_data, p_da_coda)
  returning id into v_id;

  update public.contatti set
    rientro_il = case
      when p_data is not null then (p_data at time zone 'Europe/Rome')::date
      when v_seq.giorni_rientro is not null then v_oggi + v_seq.giorni_rientro
    end,
    in_coda_dal = null,
    aggiornato_il = now()
  where id = p_contatto;

  return json_build_object('azione_id', v_id, 'rientro_prec', v_prec.rientro_il, 'in_coda_prec', v_prec.in_coda_dal);
end $$;

-- `utenti` si modifica solo da Admin (regole di accesso): questa funzione apre
-- all'utente il suo numero, e solo quello.
create function public.imposta_contatti_al_giorno(p_numero integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_numero is null or p_numero < 1 or p_numero > 10 then
    raise exception 'Contatti al giorno: da 1 a 10';
  end if;
  update public.utenti set contatti_al_giorno = p_numero where auth_id = auth.uid();
  if not found then raise exception 'Utente non abilitato'; end if;
end $$;

create function public.stato_oggi() returns json
language sql stable security invoker set search_path = public as $$
  select json_build_object(
    'contatti_al_giorno', u.contatti_al_giorno,
    'fatti_oggi', (select count(*) from public.azioni a
                   where a.user_id = u.id and a.da_coda
                     and a.inizio >= (date_trunc('day', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome')))
  from public.utenti u where u.id = public.utente_corrente();
$$;
