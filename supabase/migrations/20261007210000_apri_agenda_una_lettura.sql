-- ═══════════════════════════════════════════════════════════
-- Fondamenta e Backup, nota 031 → Pagine e Grafica 029 · «una lettura per schermata», terza schermata: Agenda (MB Plan)
-- 7 ottobre 2026
-- ═══════════════════════════════════════════════════════════
-- AGGIUNTA: una funzione nuova che l'app online non usa ancora. Preparata con l'ok di Ignazio del 07/10/2026 («procediamo anche con l'agenda»);
-- la applica la Regia al rilascio, insieme a pagina-agenda.js, pagina-lista.js e pagina-coach.js che la usano. Richiede la migrazione
-- 20261007200000 (per `_azione_json`).
-- Progetto: exwgjlhbhlgebkgxtanq (mb21).
--
-- Perché: ogni richiesta all'app costa ~2,6 KB di registro su Supabase (misura del 07/10, nota 031): conta il numero di richieste.
-- Oggi aprire MB Plan fa 12-14 richieste (appuntamenti, richiami, senza esito, stato di oggi o rientri, cose da fare, cose più vecchie,
-- spazi, impegni ricevuti, frontali, Coach Yes, WES, nomi «portato da», promemoria del coach ×2, e per oggi conferme ×2 e riordini ×2).
-- `apri_agenda()` le fa tutte nel database e restituisce UNA risposta.
--
-- Come: SECURITY INVOKER (permessi di chi chiama: le regole di accesso valgono come per le letture separate; le funzioni `security definer`
-- chiamate dentro, stato_oggi e impegni_ricevuti, fanno i loro controlli come oggi). Ogni chiave ha gli stessi campi, filtri e annidamenti
-- della richiesta che sostituisce. Le chiavi che l'app usa anche dalla Dashboard (conferme_*, riordini_*, coach_yes) hanno lo stesso nome
-- e la stessa forma di `apri_oggi()`. Con Partner Select «Tutti» l'app non la usa. Chi non è entrato (anon) non può eseguirla.
--
-- Parametri: p_utente = il partner visto · p_giorno = il giorno aperto · p_da/p_a = l'intervallo letto (settimana + griglia del mese, come lo calcola
-- l'app) · p_cose_da/p_cose_a = i giorni delle cose da fare da leggere · p_limite = da quando leggere le cose vecchie (null = tutte, «Vedi tutto») ·
-- p_spazi = leggere anche gli spazi preparati (solo quando l'app li mostra) · p_oggi = il giorno di Roma dell'app.
-- Per tornare indietro: `drop function public.apri_agenda(uuid, date, timestamptz, timestamptz, date, date, date, boolean, date);`
-- (l'app, se la funzione manca, rilegge come prima, richiesta per richiesta).
-- ═══════════════════════════════════════════════════════════

create or replace function public.apri_agenda(p_utente uuid, p_giorno date, p_da timestamptz, p_a timestamptz, p_cose_da date, p_cose_a date,
                                              p_limite date default null, p_spazi boolean default false, p_oggi date default null) returns jsonb
language plpgsql stable security invoker set search_path = public as $$
declare
  v      uuid        := coalesce(p_utente, public.utente_corrente());
  oggi   date        := coalesce(p_oggi, (now() at time zone 'Europe/Rome')::date);
  domani timestamptz;
  adesso timestamptz := now();
  app    jsonb; ric jsonb; pas jsonb;   -- i tre elenchi di azioni, letti una volta: servono anche a «portato da» e ai promemoria del coach
  ids    uuid[];                        -- i contatti per cui si cercano i promemoria del coach («Ti eri detto…»)
begin
  if public.utente_corrente() is null then raise exception 'Serve essere entrati nell''app'; end if;
  domani := (oggi + 1)::timestamp at time zone 'Europe/Rome';

  -- appuntamenti e incontri nell'intervallo (tutto tranne i Contatti)
  app := coalesce((select jsonb_agg(public._azione_json(a)) from public.azioni a
                    where a.user_id = v and a.tipo_azione <> 'Contatto' and a.inizio >= p_da and a.inizio < p_a), '[]'::jsonb);
  -- Contatti: richiami/appuntamenti dati dalla coda (data scelta) e telefonate programmate dall'Agenda (non completate)
  ric := coalesce((select jsonb_agg(public._azione_json(a)) from public.azioni a
                    where a.user_id = v and a.tipo_azione = 'Contatto'
                      and ((a.data_scelta >= p_da and a.data_scelta < p_a)
                        or (a.data_scelta is null and a.completata = false and a.inizio >= p_da and a.inizio < p_a))), '[]'::jsonb);
  -- senza esito: gli ultimi 50 impegni passati ancora aperti (LIMITE_SENZA_ESITO)
  pas := coalesce((select jsonb_agg(x.j) from (select public._azione_json(a) as j from public.azioni a
                    where a.user_id = v and a.tipo_azione <> 'Contatto' and a.completata = false and a.inizio < adesso
                    order by a.inizio desc limit 50) x), '[]'::jsonb);
  -- i contatti per cui l'app chiede i promemoria del coach: impegni senza esito e richiami dalla coda (l'app ne usa un sottoinsieme)
  ids := array(select distinct (e->>'contatto_id')::uuid from jsonb_array_elements(app || ric || pas) e
                where e->>'contatto_id' is not null and (e->>'esito' is null or (e->>'tipo_azione' = 'Contatto' and e->>'data_scelta' is not null)));

  return jsonb_build_object(
    'appuntamenti', app,
    'contatti',     ric,
    'senza_esito',  pas,
    -- oggi: il conto del giorno; un giorno che deve venire: chi rientra in coda quel giorno (id, nome, categoria, per nome, al massimo 300)
    'stato',        case when p_giorno = oggi then public.stato_oggi(v) else null end,
    'rientri',      case when p_giorno > oggi then coalesce((select jsonb_agg(x.j) from (select jsonb_build_object('id', q.id, 'nome', q.nome, 'categoria', q.categoria) as j
                                              from public.contatti_coda q where q.user_id = v and q.rientro_il = p_giorno order by q.nome limit 300) x), '[]'::jsonb) else null end,
    -- cose da fare: quelle dei giorni letti, le non fatte del passato, quelle di mese/settimana/periodo (dal limite in poi) e quelle dell'anno
    'cose',         coalesce((select jsonb_agg(to_jsonb(c) || jsonb_build_object('contatti', (select jsonb_build_object('nome', k.nome, 'categoria', k.categoria) from public.contatti k where k.id = c.contatto_id)))
                               from public.cose_da_fare c where c.user_id = v
                                and ((c.giorno >= p_cose_da and c.giorno <= p_cose_a)
                                  or (c.giorno < oggi and c.fatto_il is null and (p_limite is null or c.giorno >= p_limite))
                                  or (c.scala = 'mese' and (p_limite is null or c.giorno >= p_limite))
                                  or (c.scala = 'settimana' and (p_limite is null or c.giorno >= p_limite))
                                  or (c.scala = 'periodo' and (p_limite is null or c.giorno >= p_limite))
                                  or c.scala = 'anno')), '[]'::jsonb),
    -- c'è qualcosa di più vecchio del limite che non si legge? (per «Vedi tutto»)
    'cose_vecchie', case when p_limite is null then 0 else (select count(*) from public.cose_da_fare c where c.user_id = v and c.giorno < p_limite and c.fatto_il is null
                                                             and c.progetto_id is null and c.modello_id is null and c.core is null and c.scala in ('giorno', 'settimana', 'mese', 'periodo')) end,
    'spazi',        case when p_spazi then coalesce((select jsonb_agg(to_jsonb(s) order by s.inizio) from public.spazi s where s.user_id = v and s.inizio >= p_da and s.inizio < p_a), '[]'::jsonb) else null end,
    'ricevuti',     coalesce((select jsonb_agg(to_jsonb(i)) from public.impegni_ricevuti(p_da, p_a) i), '[]'::jsonb),
    -- i frontali dell'Admin (per «Una Linea»): chi ha come sponsor il suo codice
    'frontali',     case when public.is_admin() then coalesce((select jsonb_agg(jsonb_build_object('partner_id', s.partner_id, 'nome', s.nome) order by s.nome)
                                                       from public.squadra s where s.sponsor_id = (select u.partner_id from public.utenti u where u.id = public.utente_corrente())), '[]'::jsonb) else null end,
    'coach_yes',    coalesce((select jsonb_agg(jsonb_build_object('contatto_id', n.contatto_id)) from public.coach_note n where n.user_id = v), '[]'::jsonb),
    'wes',          coalesce((select jsonb_agg(jsonb_build_object('data', w.data, 'giorno', w.giorno) order by w.data) from public.wes w), '[]'::jsonb),
    -- i nomi di chi ha portato la persona (azioni.portato_da)
    'portato_da',   coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'nome', k.nome)) from public.contatti k
                               where k.id in (select distinct (e->>'portato_da')::uuid from jsonb_array_elements(app || ric || pas) e where e->>'portato_da' is not null)), '[]'::jsonb),
    -- i promemoria del coach («Ti eri detto…»): chi è già stato chiamato e le riflessioni, per i contatti degli impegni aperti
    'gia_chiamati', coalesce((select jsonb_agg(distinct jsonb_build_object('contatto_id', a.contatto_id)) from public.azioni a where a.contatto_id = any(ids) and a.esito is not null), '[]'::jsonb),
    'promemoria',   coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'contatto_id', a.contatto_id, 'inizio', a.inizio, 'creato_il', a.creato_il, 'riflessione', a.riflessione))
                               from public.azioni a where a.contatto_id = any(ids) and a.riflessione is not null), '[]'::jsonb),
    -- per oggi: conferme e riordini, gli stessi della Dashboard (stesse chiavi e stessa forma di apri_oggi)
    'conferme_app', case when p_giorno = oggi then coalesce((select jsonb_agg(public._azione_json(a)) from public.azioni a
                      where a.user_id = v and a.tipo_azione <> 'Contatto' and a.completata = false and a.confermato_il is null
                        and a.inizio > adesso and a.inizio <= adesso + interval '12 hours'), '[]'::jsonb) else null end,
    'conferme_coda', case when p_giorno = oggi then coalesce((select jsonb_agg(public._azione_json(a)) from public.azioni a
                      where a.user_id = v and a.tipo_azione = 'Contatto' and a.esito in ('PM Fissato', 'Appuntamento') and a.confermato_il is null
                        and a.data_scelta > adesso and a.data_scelta <= adesso + interval '12 hours'), '[]'::jsonb) else null end,
    'riordini_vendite', case when p_giorno = oggi then coalesce((select jsonb_agg(jsonb_build_object('riordino', s.riordino, 'prodotto', s.prodotto,
                        'azione', (select public._azione_json(a) from public.azioni a where a.id = s.azione_riordino_id)))
                      from public.vendite s where s.user_id = v and s.azione_riordino_id is not null), '[]'::jsonb) else null end,
    'riordini_glide', case when p_giorno = oggi then coalesce((select jsonb_agg(public._azione_json(a)) from public.azioni a
                      where a.user_id = v and a.tipo_azione = 'Contatto' and a.esito = 'Riordino' and a.glide_id is not null
                        and coalesce(a.completata, false) = false
                        and a.inizio >= ('2026-09-01'::timestamp at time zone 'Europe/Rome') and a.inizio < domani), '[]'::jsonb) else null end
  );
end $$;
revoke execute on function public.apri_agenda(uuid, date, timestamptz, timestamptz, date, date, date, boolean, date) from public, anon;
grant execute on function public.apri_agenda(uuid, date, timestamptz, timestamptz, date, date, date, boolean, date) to authenticated;
comment on function public.apri_agenda(uuid, date, timestamptz, timestamptz, date, date, date, boolean, date) is 'Pagine 029 / Fondamenta 031: tutto quello che MB Plan legge all''apertura, in una richiesta sola (security invoker: le regole di accesso valgono come per le letture separate).';
