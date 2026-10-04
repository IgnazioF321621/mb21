-- Eliminare un'azione (Azioni, nota 010 · 04/10/2026): prima «Elimina» cancellava la riga con un `delete` diretto dal telefono. Conseguenze: le vendite collegate
-- (azione_riordino_id, azione_consegna_id) perdevano il legame per sempre (on delete set null) e «Annulla», che reinseriva una copia fatta dal telefono, non lo
-- rimetteva; se era l'ultima azione il rientro del contatto restava quello di un esito che non c'era più; chiuso l'avviso la riga era persa senza copia.
-- Ora due funzioni nuove (l'app online di prima non le usa: continua con il suo `delete`):
--   elimina_azione(p_azione)         → tiene una copia (tabella nuova azioni_eliminate: azione, legami con le vendite, rientro di prima), ricalcola il rientro del
--                                      contatto dall'azione precedente se questa era l'ultima, poi cancella. Stessa regola di modifica_azione (sequenze), niente altro.
--   annulla_elimina_azione(p_azione) → rimette l'azione com'era (stesso id, stessi campi, riflessione compresa), i legami con le vendite e il rientro di prima.
-- La copia resta anche dopo l'Annulla mancato: si può ripescare dalla tabella (Admin).
-- Aggiunte soltanto (tabella e funzioni nuove): non cambiano niente di ciò che l'app online usa.

create table public.azioni_eliminate (
  azione_id        uuid primary key,
  user_id          uuid not null,
  contatto_id      uuid,                       -- senza foreign key: il contatto può sparire dopo
  copia            jsonb not null,             -- la riga di `azioni` com'era
  vendite          jsonb not null default '[]'::jsonb,   -- [{ id, azione_riordino_id, azione_consegna_id }] delle vendite che la usavano
  rientro_cambiato boolean not null default false,
  rientro_prec     date,
  in_coda_prec     date,
  eliminata_il     timestamptz not null default now()
);
alter table public.azioni_eliminate enable row level security;
create policy azioni_eliminate_own on public.azioni_eliminate for all to authenticated
  using (user_id = public.utente_corrente() or public.is_admin())
  with check (user_id = public.utente_corrente() or public.is_admin());
grant select, insert, update, delete on public.azioni_eliminate to authenticated, service_role;

create or replace function public.elimina_azione(p_azione uuid)
returns json
language plpgsql
set search_path to 'public'
as $function$
declare
  v_az      public.azioni;
  v_cont    public.contatti;
  v_prec    public.azioni;
  v_seq     public.sequenze;
  v_ultima  boolean;
  v_cambia  boolean := false;
  v_rientro date;
  v_vendite jsonb;
begin
  select * into v_az from public.azioni where id = p_azione for update;
  if not found then raise exception 'Azione non trovata'; end if;
  select * into v_cont from public.contatti where id = v_az.contatto_id;

  v_vendite := coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'azione_riordino_id', v.azione_riordino_id, 'azione_consegna_id', v.azione_consegna_id))
                           from public.vendite v
                          where v.azione_riordino_id = p_azione or v.azione_consegna_id = p_azione), '[]'::jsonb);

  -- se era l'ultima azione del contatto e aveva un esito (o un giorno scelto), il rientro torna a quello dell'azione con esito di prima (come in modifica_azione)
  if v_az.esito is not null or v_az.data_scelta is not null then
    select not exists (select 1 from public.azioni a where a.contatto_id = v_az.contatto_id and a.id <> p_azione and a.inizio > v_az.inizio) into v_ultima;
    if v_ultima then
      select * into v_prec from public.azioni a
       where a.contatto_id = v_az.contatto_id and a.id <> p_azione and a.esito is not null
       order by a.inizio desc nulls last, a.creato_il desc limit 1;
      if found then
        select * into v_seq from public.sequenze where chiave = v_prec.chiave;
        if found then
          v_cambia := true;
          v_rientro := case
            when v_prec.esito in ('PM Fissato', 'Appuntamento') then null                                   -- lo segue l'appuntamento
            when v_prec.data_scelta is not null then (v_prec.data_scelta at time zone 'Europe/Rome')::date   -- giorno scelto (Richiamare)
            when v_seq.giorni_rientro is not null then (v_prec.inizio at time zone 'Europe/Rome')::date + v_seq.giorni_rientro
          end;
          update public.contatti set rientro_il = v_rientro, in_coda_dal = null, aggiornato_il = now() where id = v_az.contatto_id;
        end if;
      end if;
    end if;
  end if;

  insert into public.azioni_eliminate (azione_id, user_id, contatto_id, copia, vendite, rientro_cambiato, rientro_prec, in_coda_prec)
  values (p_azione, v_az.user_id, v_az.contatto_id, to_jsonb(v_az), v_vendite, v_cambia, v_cont.rientro_il, v_cont.in_coda_dal)
  on conflict (azione_id) do update set copia = excluded.copia, vendite = excluded.vendite, rientro_cambiato = excluded.rientro_cambiato,
    rientro_prec = excluded.rientro_prec, in_coda_prec = excluded.in_coda_prec, eliminata_il = now();

  delete from public.azioni where id = p_azione;

  return json_build_object('azione_id', p_azione, 'contatto_id', v_az.contatto_id, 'rientro_cambiato', v_cambia,
                           'rientro_prec', v_cont.rientro_il, 'in_coda_prec', v_cont.in_coda_dal);
end $function$;

create or replace function public.annulla_elimina_azione(p_azione uuid)
returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  c    public.azioni_eliminate;
  v_az public.azioni;
begin
  select * into c from public.azioni_eliminate where azione_id = p_azione for update;
  if not found then raise exception 'Copia dell''azione non trovata'; end if;
  if exists (select 1 from public.azioni where id = p_azione) then raise exception 'L''azione c''è già'; end if;

  v_az := jsonb_populate_record(null::public.azioni, c.copia);
  -- `chiave` si calcola da sola (colonna generata): non si scrive
  insert into public.azioni (id, user_id, contatto_id, categoria, tipo_azione, modalita, esito, inizio, fine, completata, area, brand, ospite, note,
                             coach_script, glide_id, creato_il, data_scelta, da_coda, confermato_il, portato_da, promemoria_il, senza_esito_avvisato_il,
                             riflessione, su_cosa)
  values (v_az.id, v_az.user_id, v_az.contatto_id, v_az.categoria, v_az.tipo_azione, v_az.modalita, v_az.esito, v_az.inizio, v_az.fine, v_az.completata,
          v_az.area, v_az.brand, v_az.ospite, v_az.note, v_az.coach_script, v_az.glide_id, v_az.creato_il, v_az.data_scelta, v_az.da_coda, v_az.confermato_il,
          v_az.portato_da, v_az.promemoria_il, v_az.senza_esito_avvisato_il, v_az.riflessione, v_az.su_cosa);

  -- i legami con le vendite (il riordino e la consegna restano quelli: il trigger delle vendite non crea niente, la data non cambia)
  update public.vendite set azione_riordino_id = p_azione
   where id in (select (x->>'id')::uuid from jsonb_array_elements(c.vendite) x where x->>'azione_riordino_id' = p_azione::text);
  update public.vendite set azione_consegna_id = p_azione
   where id in (select (x->>'id')::uuid from jsonb_array_elements(c.vendite) x where x->>'azione_consegna_id' = p_azione::text);

  if c.rientro_cambiato then
    update public.contatti set rientro_il = c.rientro_prec, in_coda_dal = c.in_coda_prec, aggiornato_il = now() where id = c.contatto_id;
  end if;
  delete from public.azioni_eliminate where azione_id = p_azione;
end $function$;

-- Permessi (CLAUDE.md § 4): solo chi è entrato
revoke execute on function public.elimina_azione(uuid) from public, anon;
revoke execute on function public.annulla_elimina_azione(uuid) from public, anon;
grant execute on function public.elimina_azione(uuid) to authenticated, service_role;
grant execute on function public.annulla_elimina_azione(uuid) to authenticated, service_role;
