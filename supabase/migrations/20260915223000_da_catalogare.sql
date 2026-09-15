-- ═══════════════════════════════════════════════════════════
-- Da catalogare (cantiere 16, lavoro 2 · decisioni di Ignazio 15/09, brief F7 §4b-4c)
-- ═══════════════════════════════════════════════════════════
-- In Dashboard 5 senza categoria al giorno da smistare, in più delle chiamate della coda.
--
-- 1. contatti.catalogato_il: giorno (Roma) in cui la categoria è stata scelta da «Da catalogare».
--    Conta i «Fatti X di 5» e serve all'Annulla.
-- 2. cataloga_contatto(p_contatto, p_categoria): solo su un senza categoria.
--    Prospect/Partner/Cliente → rientro domani (se non lo si chiama oggi entra nella coda normale);
--    Archiviato → come «Archivia» ma con categoria_prec vuota (Ripristina lo riporta senza categoria);
--    Ex Partner/Cliente e Unlinked → fuori coda. Restituisce i valori di prima per l'Annulla.
-- 3. annulla_catalogo(p_contatto, p_rientro, p_in_coda): torna senza categoria com'era.
-- 4. stato_oggi: in più `catalogati_oggi`.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

-- ── 1. colonna ─────────────────────────────────────────────
alter table public.contatti add column catalogato_il date;

-- ── 2. cataloga_contatto ───────────────────────────────────
create function public.cataloga_contatto(p_contatto uuid, p_categoria text) returns json
language plpgsql security invoker set search_path = public as $$
declare
  v_prec public.contatti;
  v_oggi date := (now() at time zone 'Europe/Rome')::date;
begin
  if p_categoria not in ('Prospect', 'Partner', 'Cliente', 'Ex Partner/Cliente', 'Unlinked', 'Archiviato') then
    raise exception 'Categoria non valida: %', p_categoria;
  end if;
  select * into v_prec from public.contatti where id = p_contatto and categoria is null;
  if not found then raise exception 'Contatto non trovato o già catalogato'; end if;

  update public.contatti set
    categoria = p_categoria,
    categoria_prec = null,
    rientro_il = case when p_categoria in ('Prospect', 'Partner', 'Cliente') then v_oggi + 1
                      when p_categoria = 'Archiviato' then null
                      else rientro_il end,
    in_coda_dal = null,
    catalogato_il = v_oggi,
    aggiornato_il = now()
  where id = p_contatto;

  return json_build_object('rientro_prec', v_prec.rientro_il, 'in_coda_prec', v_prec.in_coda_dal);
end $$;

-- ── 3. annulla_catalogo ────────────────────────────────────
create function public.annulla_catalogo(p_contatto uuid, p_rientro date, p_in_coda date) returns void
language plpgsql security invoker set search_path = public as $$
begin
  update public.contatti set
    categoria = null, categoria_prec = null, rientro_il = p_rientro, in_coda_dal = p_in_coda,
    catalogato_il = null, aggiornato_il = now()
  where id = p_contatto and catalogato_il is not null;
  if not found then raise exception 'Contatto non trovato'; end if;
end $$;

-- ── 4. stato_oggi con catalogati_oggi ──────────────────────
create or replace function public.stato_oggi(p_utente uuid default null) returns json
language sql stable security invoker set search_path = public as $$
  select json_build_object(
    'contatti_al_giorno', u.contatti_al_giorno,
    'fatti_oggi', (select count(*) from public.azioni a
                   where a.user_id = u.id and a.da_coda
                     and a.inizio >= (date_trunc('day', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome')),
    'catalogati_oggi', (select count(*) from public.contatti c
                        where c.user_id = u.id and c.catalogato_il = (now() at time zone 'Europe/Rome')::date))
  from public.utenti u where u.id = coalesce(p_utente, public.utente_corrente());
$$;
