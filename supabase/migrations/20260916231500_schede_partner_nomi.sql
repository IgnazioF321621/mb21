-- ═══════════════════════════════════════════════════════════
-- Cantiere 19 · schede dei partner a cascata: riconoscere meglio i nomi (prova del 16/09)
-- In prova sarebbero nate schede doppie: «Maria Elisa Petruso» (in lista «Elisa Petruso»),
-- «Antonina Abela» (in lista «Tonya abela»), e 3 schede «Utente Riservato/Non Visualizzabile».
-- Ora una scheda della lista è della persona se il nome è uguale a:
--   · il nome Amway (nome cognome o cognome nome), oppure
--   · il nome di un'altra scheda già collegata a quel codice in qualsiasi lista (es. «Tonya Abela»), oppure
--   · una parte del nome Amway con il cognome intero (es. «Elisa Petruso» dentro «Maria Elisa Petruso»).
-- Solo se la scheda trovata è una. I partner «riservati» di Amway non ricevono schede.
-- ═══════════════════════════════════════════════════════════

create or replace function public._allinea_schede_partner(p_prova boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r record; v_match uuid[]; v_creati int := 0; v_collegati int := 0; v_dettaglio jsonb := '[]'::jsonb;
  piega text := '\s+';
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
       and s.nome not ilike '%riservato%' and position(',' in s.nome) > 0
       and not exists (select 1 from contatti c where c.user_id = g.uid and c.codice_amway = g.pid)
  loop
    select array_agg(c.id) into v_match
      from contatti c,
           lateral (select lower(regexp_replace(trim(c.nome), piega, ' ', 'g')) as n) cn,
           lateral (select string_to_array(nome_amway_piegato(r.nome), ' ') as tutte,
                           string_to_array(lower(regexp_replace(trim(split_part(r.nome, ',', 1)), piega, ' ', 'g')), ' ') as cognome) a
     where c.user_id = r.uid and c.codice_amway is null and coalesce(c.categoria, '') <> 'Archiviato'
       and (cn.n = nome_amway_piegato(r.nome)
            or cn.n = lower(regexp_replace(trim(split_part(r.nome, ',', 1)) || ' ' || trim(split_part(r.nome, ',', 2)), piega, ' ', 'g'))
            or cn.n in (select lower(regexp_replace(trim(x.nome), piega, ' ', 'g')) from contatti x where x.codice_amway = r.pid)
            or (array_length(string_to_array(cn.n, ' '), 1) >= 2
                and string_to_array(cn.n, ' ') <@ a.tutte and a.cognome <@ string_to_array(cn.n, ' ')));
    if coalesce(array_length(v_match, 1), 0) = 1 then
      v_collegati := v_collegati + 1;
      v_dettaglio := v_dettaglio || jsonb_build_object('utente', r.uid, 'codice', r.pid, 'azione', 'collegata', 'scheda', v_match[1]);
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
