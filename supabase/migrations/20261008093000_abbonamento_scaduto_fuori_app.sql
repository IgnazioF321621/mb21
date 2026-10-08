-- ═══════════════════════════════════════════════════════════
-- Fondamenta e Backup, nota 033 (audit Regia 08/10/2026, punto 1: sì di Ignazio) — abbonamento scaduto fuori dall'app
-- 8 ottobre 2026 · progetto exwgjlhbhlgebkgxtanq (mb21)
-- ═══════════════════════════════════════════════════════════
-- Il blocco dell'abbonamento scaduto stava solo nell'app (decisione del 16/09): gli Avvisi della sera e del mattino e il
-- calendario esterno (.ics) guardavano solo `accesso_attivo`, quindi uno scaduto con un dispositivo o un calendario collegato
-- continuava a riceverli. Qui la stessa scadenza che usa l'app (`scadenza_abbonamento`: con l'abbonamento in comune conta chi
-- paga; l'Admin mai scaduto) diventa leggibile dal servizio (service_role), che non ha un utente «entrato».
--
-- AGGIUNTE (senza chiedere):
--   abbonamento_attivo(p_utente)   → true/false (Admin sempre true; senza data o data passata = false, come statoAbbonamento nell'app)
--   utenti_abbonamento_scaduto()   → gli id degli utenti scaduti (non eliminati): la funzione Edge `avvisi` li salta
-- MODIFICA (ok di Ignazio via Regia, 08/10, nota 033 punto 1; la applica la Regia al rilascio):
--   calendario_righe(p_token)      → risponde null anche a chi è scaduto (la funzione Edge `calendario` dà 404 come per un segreto spento)
-- Per tornare indietro: `drop function` delle due aggiunte e il corpo di calendario_righe in 20261005190000 (riga «select id into u»).
-- ═══════════════════════════════════════════════════════════

create function public.abbonamento_attivo(p_utente uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case when u.ruolo = 'Admin' then true
              else coalesce(coalesce(p.abbonamento_scadenza, case when u.abbonamento_con is null then u.abbonamento_scadenza end)
                            >= (now() at time zone 'Europe/Rome')::date, false) end
    from public.utenti u left join public.utenti p on p.id = u.abbonamento_con
   where u.id = p_utente;
$$;
revoke execute on function public.abbonamento_attivo(uuid) from public, anon, authenticated;
grant execute on function public.abbonamento_attivo(uuid) to service_role;
comment on function public.abbonamento_attivo(uuid) is 'Nota Fondamenta 033: la stessa scadenza dell''app (scadenza_abbonamento, abbonamento in comune compreso) per il servizio; Admin sempre attivo';

create function public.utenti_abbonamento_scaduto() returns table (id uuid)
language sql stable security definer set search_path = public as $$
  select u.id from public.utenti u where u.eliminato_il is null and not public.abbonamento_attivo(u.id);
$$;
revoke execute on function public.utenti_abbonamento_scaduto() from public, anon, authenticated;
grant execute on function public.utenti_abbonamento_scaduto() to service_role;
comment on function public.utenti_abbonamento_scaduto() is 'Nota Fondamenta 033: chi è scaduto (gli Avvisi della sera e del mattino lo saltano)';

-- calendario_righe: come in 20261005190000, con in più il controllo della scadenza sulla riga dell'utente
create or replace function public.calendario_righe(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  u uuid;
  da timestamptz := now() - interval '30 days';
  a timestamptz := now() + interval '366 days';
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return null; end if;
  select id into u from public.utenti where calendario_token = p_token and accesso_attivo and eliminato_il is null
     and public.abbonamento_attivo(id);   -- nota 033: scaduto = come un segreto spento
  if u is null then return null; end if;
  return jsonb_build_object(
    'azioni', (select coalesce(jsonb_agg(x.j order by x.inizio), '[]'::jsonb) from (
        select az.inizio, jsonb_build_object('id', az.id, 'contatto_id', az.contatto_id, 'tipo_azione', az.tipo_azione, 'modalita', az.modalita, 'esito', az.esito,
          'inizio', az.inizio, 'fine', az.fine, 'data_scelta', az.data_scelta, 'ospite', az.ospite, 'note', az.note, 'luogo', az.luogo, 'contatti', jsonb_build_object('nome', c.nome)) as j
          from public.azioni az left join public.contatti c on c.id = az.contatto_id
         where az.user_id = u and az.tipo_azione <> 'Contatto' and az.inizio >= da
         order by az.inizio limit 2000) x),
    'telefonate', (select coalesce(jsonb_agg(x.j order by x.inizio), '[]'::jsonb) from (
        select az.inizio, jsonb_build_object('id', az.id, 'contatto_id', az.contatto_id, 'tipo_azione', az.tipo_azione, 'modalita', az.modalita, 'esito', az.esito,
          'inizio', az.inizio, 'fine', az.fine, 'data_scelta', az.data_scelta, 'ospite', az.ospite, 'note', az.note, 'luogo', az.luogo, 'contatti', jsonb_build_object('nome', c.nome)) as j
          from public.azioni az left join public.contatti c on c.id = az.contatto_id
         where az.user_id = u and az.tipo_azione = 'Contatto' and az.data_scelta is null and az.completata = false and az.inizio >= da
           and not exists (select 1 from public.vendite v where v.azione_riordino_id = az.id)   -- mai i Riordini (li crea l'app)
         order by az.inizio limit 2000) x),
    'coda', (select coalesce(jsonb_agg(x.j order by x.data_scelta), '[]'::jsonb) from (
        select az.data_scelta, jsonb_build_object('id', az.id, 'contatto_id', az.contatto_id, 'tipo_azione', az.tipo_azione, 'modalita', az.modalita, 'esito', az.esito,
          'inizio', az.inizio, 'fine', az.fine, 'data_scelta', az.data_scelta, 'ospite', az.ospite, 'note', az.note, 'luogo', az.luogo, 'contatti', jsonb_build_object('nome', c.nome)) as j
          from public.azioni az left join public.contatti c on c.id = az.contatto_id
         where az.user_id = u and az.tipo_azione = 'Contatto' and az.esito in ('PM Fissato', 'Appuntamento') and az.data_scelta >= da
         order by az.data_scelta limit 2000) x),
    'spazi', (select coalesce(jsonb_agg(x.j order by x.inizio), '[]'::jsonb) from (
        select s.inizio, jsonb_build_object('id', s.id, 'tipo', s.tipo, 'inizio', s.inizio, 'durata', s.durata, 'nome', s.nome, 'luogo', s.luogo) as j
          from public.spazi s where s.user_id = u and s.tipo in ('Team', 'LOS', 'SdS/OPEN') and s.inizio >= da
         order by s.inizio limit 2000) x),
    'ricevuti', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public.impegni_ricevuti_di(u, da, a) r)
  );
end $$;
revoke execute on function public.calendario_righe(text) from public, anon, authenticated;
grant execute on function public.calendario_righe(text) to service_role;
comment on function public.calendario_righe(text) is 'Note Pagine 013/017 + Fondamenta 033: tutto il calendario .ics di un utente in una chiamata sola (solo service_role); null se scaduto';
