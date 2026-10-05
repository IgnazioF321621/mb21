-- ════════════════════════════════════════════════════════════════════════════
-- Calendario in una richiesta sola (note Pagine 013 · 017, registri Supabase; 05/10/2026).
-- Il feed .ics (funzione Edge `calendario`) faceva 5-7 richieste al database a ogni lettura del telefono (utente, tre letture di azioni,
-- vendite, spazi, impegni ricevuti), e i telefoni lo rileggono ~220 volte al giorno: ogni richiesta è una riga di registro.
-- `calendario_righe(p_token)` fa tutto in una chiamata e dà un JSON { azioni, telefonate, coda, spazi, ricevuti } con gli stessi campi
-- e gli stessi filtri di prima (da 30 giorni fa; i Riordini già tolti dalle telefonate). Solo per il servizio (service_role): l'app non la usa.
-- Con un segreto sbagliato o spento risponde null (la funzione Edge dà 404 come prima). Aggiunta: da applicare al rilascio insieme alla nuova `calendario`.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.calendario_righe(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  u uuid;
  da timestamptz := now() - interval '30 days';
  a timestamptz := now() + interval '366 days';
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return null; end if;
  select id into u from public.utenti where calendario_token = p_token and accesso_attivo and eliminato_il is null;
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
comment on function public.calendario_righe(text) is 'Note Pagine 013/017: tutto il calendario .ics di un utente in una chiamata sola (solo service_role, dalla funzione Edge calendario)';
