-- ═══════════════════════════════════════════════════════════
-- Nota Pagine 168, seguito (Ignazio 01/11/2026, «si» alla domanda «vuoi che la sessione compaia nel Calendario del telefono anche quando è senza
-- persone? Serve un'altra modifica al database»): `calendario_righe` porta anche gli spazi `Telefonate` («Sessione di telefonate»).
-- MODIFICA approvata di una funzione esistente: il corpo è quello di adesso (letto dal database il 01/11, uguale a 20261008093000) con un solo
-- cambio, 'Telefonate' nell'elenco dei tipi degli spazi. Si applica al rilascio, DOPO 20261101210000_spazi_telefonate.sql e prima del codice;
-- poi si ripubblica la funzione Edge `calendario` (formato.ts sa scrivere la sessione). Permessi come prima: solo service_role.
-- Per tornare indietro: rimettere il corpo di 20261008093000 (elenco senza 'Telefonate').
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════
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
          from public.spazi s where s.user_id = u and s.tipo in ('Team', 'LOS', 'SdS/OPEN', 'Telefonate') and s.inizio >= da   -- nota 168: anche la sessione di telefonate
         order by s.inizio limit 2000) x),
    'ricevuti', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public.impegni_ricevuti_di(u, da, a) r)
  );
end $$;
revoke execute on function public.calendario_righe(text) from public, anon, authenticated;
grant execute on function public.calendario_righe(text) to service_role;
comment on function public.calendario_righe(text) is 'Note Pagine 013/017 + Fondamenta 033: tutto il calendario .ics di un utente in una chiamata sola (solo service_role); null se scaduto; nota 168: anche gli spazi Telefonate';
