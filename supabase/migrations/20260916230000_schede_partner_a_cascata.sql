-- ═══════════════════════════════════════════════════════════
-- Cantiere 19 · schede dei partner a cascata (decisioni di Ignazio 16/09)
-- Ogni persona della Mappa ha una scheda Partner, collegata al suo codice, nella lista di OGNI utente dell'app
-- che sta sopra di lei nell'albero (tutti i livelli; anche l'Admin). Mai in liste fuori dal ramo.
-- Se nella lista c'è già una scheda con lo stesso nome (una sola, senza codice) la collega; altrimenti la crea
-- (categoria Partner, fuori coda: il trigger mette in coda solo Prospect e senza categoria).
-- Non cancella e non cambia categoria a niente: le schede restano anche se la persona esce dall'attività.
-- Segni vitali (scelta A, «al momento»): si scrivono sulla scheda nella lista dell'Admin.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

-- «FIORITO, IGNAZIO» → «ignazio fiorito» (per confrontare i nomi)
create function public.nome_amway_piegato(p text) returns text language sql immutable as $$
  select lower(regexp_replace(trim(split_part(p, ',', 2)) || ' ' || trim(split_part(p, ',', 1)), '\s+', ' ', 'g'));
$$;

-- Lavoro vero. p_prova = true: non scrive, dice solo cosa farebbe. Non accessibile dall'app (solo tramite la funzione sotto).
create function public._allinea_schede_partner(p_prova boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r record; v_match uuid[]; v_creati int := 0; v_collegati int := 0; v_dettaglio jsonb := '[]'::jsonb;
begin
  for r in
    with recursive giu as (
      select u.id as uid, u.partner_id as capo, s.partner_id as pid, 0 as liv
        from utenti u join squadra s on s.partner_id = u.partner_id
       where u.eliminato_il is null
      union all
      select g.uid, g.capo, s.partner_id, g.liv + 1
        from giu g join squadra s on s.sponsor_id = g.pid where g.liv < 30
    )
    select distinct g.uid, g.pid, s.nome
      from giu g join squadra s on s.partner_id = g.pid
     where g.liv > 0 and g.pid <> g.capo
       and not exists (select 1 from contatti c where c.user_id = g.uid and c.codice_amway = g.pid)
  loop
    select array_agg(c.id) into v_match from contatti c
     where c.user_id = r.uid and c.codice_amway is null and coalesce(c.categoria, '') <> 'Archiviato'
       and (lower(regexp_replace(trim(c.nome), '\s+', ' ', 'g')) = nome_amway_piegato(r.nome)
            or lower(regexp_replace(trim(c.nome), '\s+', ' ', 'g')) = lower(regexp_replace(trim(split_part(r.nome, ',', 1)) || ' ' || trim(split_part(r.nome, ',', 2)), '\s+', ' ', 'g')));
    if coalesce(array_length(v_match, 1), 0) = 1 then
      v_collegati := v_collegati + 1;
      v_dettaglio := v_dettaglio || jsonb_build_object('utente', r.uid, 'codice', r.pid, 'azione', 'collegata');
      if not p_prova then update contatti set codice_amway = r.pid, aggiornato_il = now() where id = v_match[1]; end if;
    else
      v_creati := v_creati + 1;
      v_dettaglio := v_dettaglio || jsonb_build_object('utente', r.uid, 'codice', r.pid, 'azione',
        case when coalesce(array_length(v_match, 1), 0) > 1 then 'creata (più nomi uguali)' else 'creata' end);
      if not p_prova then
        insert into contatti (user_id, nome, categoria, codice_amway)
        values (r.uid, initcap(nome_amway_piegato(r.nome)), 'Partner', r.pid);
      end if;
    end if;
  end loop;
  return jsonb_build_object('create', v_creati, 'collegate', v_collegati, 'dettaglio', v_dettaglio);
end $$;
revoke all on function public._allinea_schede_partner(boolean) from public, anon, authenticated;

-- Dall'app: solo l'Admin (pagina Admin e dopo «Carica file Amway»)
create function public.allinea_schede_partner(p_prova boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Solo Admin'; end if;
  return _allinea_schede_partner(p_prova);
end $$;
revoke all on function public.allinea_schede_partner(boolean) from public, anon;
grant execute on function public.allinea_schede_partner(boolean) to authenticated;
