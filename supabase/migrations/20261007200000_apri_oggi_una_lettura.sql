-- ═══════════════════════════════════════════════════════════
-- Fondamenta e Backup, nota 031 → Pagine e Grafica 029 · «una lettura per schermata», seconda schermata: Dashboard (Oggi)
-- 7 ottobre 2026
-- ═══════════════════════════════════════════════════════════
-- AGGIUNTA: due funzioni nuove che l'app online non usa ancora. Preparate con l'ok di Ignazio del 07/10/2026 («Dashboard»);
-- le applica la Regia al rilascio, insieme a pagina-dashboard.js, pagina-mappa.js, pagina-sharing.js e index.html che le chiamano.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21).
--
-- Perché: ogni richiesta all'app costa ~2,6 KB di registro su Supabase (misura del 07/10, nota 031): conta il numero di richieste.
-- Oggi aprire la Dashboard fa circa 28 richieste (stato di oggi, coda, telefonate scelte, da catalogare, conferme ×2, riordini ×2,
-- Check dei mesi, obiettivi, scadenza, biglietti da segnare, BBS, WES, squadra, volumi, 15 Planner, obiettivi del ramo ×2, avvio del Team,
-- il mio percorso, tracce, segni del ramo, Coach Yes, sharing, materiali, libri, libri letti, griglia PM ×2). `apri_oggi()` le fa tutte
-- nel database e restituisce UNA risposta: 1 richiesta al posto di ~28.
--
-- Come: SECURITY INVOKER, cioè gira con i permessi di chi chiama: le regole di accesso (RLS) delle tabelle valgono esattamente come
-- per le letture separate, e le funzioni `security definer` chiamate dentro (stato_oggi, pm_del_ramo, obiettivi_del_ramo, avvio_del_team,
-- mio_percorso, scadenza_abbonamento, biglietti_da_segnare, segni_del_ramo, mio_sharing) fanno i loro controlli come oggi.
-- Ogni chiave della risposta ha gli stessi campi, gli stessi filtri e la stessa forma (anche gli annidamenti `contatti`, `utenti`, `azione`,
-- `materiali`) della richiesta che sostituisce: così l'app usa i dati senza cambiare nulla di quello che ne fa.
-- Parametri: p_utente = il partner visto (sé stessi o quello del Partner Select) · p_oggi = il giorno di Roma dell'app · p_altro = Partner Select
-- su un altro (allora niente «il mio percorso» né «sharing», come oggi). Con Partner Select «Tutti» l'app non la usa.
-- Chi non è entrato (anon) non può eseguirla (regola CLAUDE.md § 4, nota Fondamenta 005).
--
-- Uso dall'app:  supa.rpc('apri_oggi', { p_utente, p_oggi, p_altro })
-- Per tornare indietro: `drop function public.apri_oggi(uuid, date, boolean); drop function public._azione_json(public.azioni);`
-- (l'app, se la funzione manca, rilegge come prima, richiesta per richiesta).
-- ═══════════════════════════════════════════════════════════

-- Una riga di `azioni` nella forma che l'app riceve con `select('*, contatti(nome, categoria, telefono), utenti!azioni_user_id_fkey(nome, nome_cognome)')`
create or replace function public._azione_json(a public.azioni) returns jsonb
language sql stable security invoker set search_path = public as $$
  select to_jsonb(a)
      || jsonb_build_object(
           'contatti', (select jsonb_build_object('nome', c.nome, 'categoria', c.categoria, 'telefono', c.telefono) from public.contatti c where c.id = a.contatto_id),
           'utenti',   (select jsonb_build_object('nome', u.nome, 'nome_cognome', u.nome_cognome) from public.utenti u where u.id = a.user_id));
$$;
revoke execute on function public._azione_json(public.azioni) from public, anon;
grant execute on function public._azione_json(public.azioni) to authenticated;

create or replace function public.apri_oggi(p_utente uuid default null, p_oggi date default null, p_altro boolean default false) returns jsonb
language plpgsql stable security invoker set search_path = public as $$
declare
  v       uuid        := coalesce(p_utente, public.utente_corrente());
  io      boolean     := coalesce(p_utente, public.utente_corrente()) = public.utente_corrente();   -- la propria Dashboard
  oggi    date        := coalesce(p_oggi, (now() at time zone 'Europe/Rome')::date);
  domani  timestamptz := (coalesce(p_oggi, (now() at time zone 'Europe/Rome')::date) + 1)::timestamp at time zone 'Europe/Rome';   -- domani alle 00:00 di Roma
  adesso  timestamptz := now();
  mese1   date;   -- il 1° del mese in corso
  prima   date;   -- il 1° del mese scorso
  mese_n  integer; prec_n integer;   -- gli stessi mesi come numero AAAAMM (volumi_mese, pm_del_ramo)
  da7     date;
  g       record;   -- la griglia PM del partner
begin
  if public.utente_corrente() is null then raise exception 'Serve essere entrati nell''app'; end if;
  mese1  := date_trunc('month', oggi)::date;
  prima  := (mese1 - interval '1 month')::date;
  mese_n := to_char(mese1, 'YYYYMM')::integer;
  prec_n := to_char(prima, 'YYYYMM')::integer;
  da7    := oggi - 7;
  select obiettivo, inizio, mesi into g from public.griglia_pm where user_id = v limit 1;

  return jsonb_build_object(
    -- ── la coda e il giorno ──
    'stato',           public.stato_oggi(v),
    'coda',            coalesce((select jsonb_agg(to_jsonb(q) order by q.id) from public.contatti_coda q where q.user_id = v and q.rientro_il <= oggi), '[]'::jsonb),
    'scelte',          coalesce((select jsonb_agg(public._azione_json(a) order by a.inizio) from public.azioni a
                                  where a.user_id = v and a.tipo_azione = 'Contatto' and a.scelta_a_mano = true and a.completata = false
                                    and a.esito is null and a.inizio < domani), '[]'::jsonb),
    'senza_categoria', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'nome', c.nome, 'professione', c.professione, 'fascia_eta', c.fascia_eta,
                                    'citta', c.citta, 'telefono', c.telefono, 'note', c.note, 'referral_di', c.referral_di, 'categoria', c.categoria,
                                    'user_id', c.user_id, 'creato_il', c.creato_il, 'glide_id', c.glide_id) order by c.id)
                                  from public.contatti c where c.user_id = v and c.categoria is null), '[]'::jsonb),
    -- ── conferme (12 ore prima) e riordini ──
    'conferme_app',    coalesce((select jsonb_agg(public._azione_json(a)) from public.azioni a
                                  where a.user_id = v and a.tipo_azione <> 'Contatto' and a.completata = false and a.confermato_il is null
                                    and a.inizio > adesso and a.inizio <= adesso + interval '12 hours'), '[]'::jsonb),
    'conferme_coda',   coalesce((select jsonb_agg(public._azione_json(a)) from public.azioni a
                                  where a.user_id = v and a.tipo_azione = 'Contatto' and a.esito in ('PM Fissato', 'Appuntamento') and a.confermato_il is null
                                    and a.data_scelta > adesso and a.data_scelta <= adesso + interval '12 hours'), '[]'::jsonb),
    'riordini_vendite', coalesce((select jsonb_agg(jsonb_build_object('riordino', s.riordino, 'prodotto', s.prodotto,
                                    'azione', (select public._azione_json(a) from public.azioni a where a.id = s.azione_riordino_id)))
                                  from public.vendite s where s.user_id = v and s.azione_riordino_id is not null), '[]'::jsonb),
    'riordini_glide',  coalesce((select jsonb_agg(public._azione_json(a)) from public.azioni a
                                  where a.user_id = v and a.tipo_azione = 'Contatto' and a.esito = 'Riordino' and a.glide_id is not null
                                    and coalesce(a.completata, false) = false
                                    and a.inizio >= ('2026-09-01'::timestamp at time zone 'Europe/Rome') and a.inizio < domani), '[]'::jsonb),
    -- ── i numeri del mese, obiettivi, abbonamento, biglietti ──
    'check_mesi',      coalesce((select jsonb_agg(to_jsonb(m)) from public.check_mesi m where m.user_id = v), '[]'::jsonb),
    'obiettivi_mese',  coalesce((select jsonb_agg(to_jsonb(o)) from public.obiettivi_mese o where o.user_id = v), '[]'::jsonb),
    'scadenza',        to_jsonb(public.scadenza_abbonamento(v)),
    'da_segnare',      case when io then coalesce(public.biglietti_da_segnare(), '[]'::jsonb) else '[]'::jsonb end,
    'bbs',             coalesce((select jsonb_agg(jsonb_build_object('data', e.data, 'creato_il', e.creato_il) order by e.data) from public.bbs e), '[]'::jsonb),
    'wes',             coalesce((select jsonb_agg(jsonb_build_object('data', e.data, 'creato_il', e.creato_il) order by e.data) from public.wes e), '[]'::jsonb),
    'griglia',         case when g.inizio is null then null else jsonb_build_object('obiettivo', g.obiettivo, 'inizio', g.inizio, 'mesi', g.mesi) end,
    'griglia_pm',      case when g.inizio is null then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'inizio', a.inizio, 'esito', a.esito))
                                  from public.azioni a where a.user_id = v and a.tipo_azione = 'Piano Marketing'
                                    and a.inizio >= (g.inizio::timestamp at time zone 'Europe/Rome')), '[]'::jsonb) end,
    -- ── la squadra del mese (file Amway) e gli obiettivi dei partner ──
    'squadra',         coalesce((select jsonb_agg(jsonb_build_object('partner_id', s.partner_id, 'sponsor_id', s.sponsor_id, 'nome', s.nome, 'data_ingresso', s.data_ingresso)) from public.squadra s), '[]'::jsonb),
    'volumi',          coalesce((select jsonb_agg(jsonb_build_object('partner_id', w.partner_id, 'mese', w.mese, 'vpp', w.vpp, 'vpg', w.vpg, 'bonus', w.bonus, 'dimensioni_gruppo', w.dimensioni_gruppo))
                                  from public.volumi_mese w where w.mese in (prec_n, mese_n)), '[]'::jsonb),
    'pm_ramo',         public.pm_del_ramo(prec_n),
    'obiettivi_ramo',  public.obiettivi_del_ramo(mese1),
    'obiettivi_ramo_prima', public.obiettivi_del_ramo(prima),
    -- ── avvio, percorso, tracce, segni, Coach Yes ──
    'avvio_team',      public.avvio_del_team(),
    'mio_percorso',    case when p_altro then null else public.mio_percorso() end,
    'tracce',          coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'contatto_id', k.contatto_id, 'condivisa_il', k.condivisa_il, 'ascoltata', k.ascoltata,
                                    'ascoltata_il', k.ascoltata_il, 'segnata_dal_partner', k.segnata_dal_partner, 'chiede_prossima_il', k.chiede_prossima_il,
                                    'contatti', (select jsonb_build_object('nome', c.nome) from public.contatti c where c.id = k.contatto_id),
                                    'materiali', (select jsonb_build_object('titolo', m.titolo) from public.materiali m where m.id = k.materiale_id)))
                                  from public.condivisioni k where k.user_id = v
                                    and ((k.ascoltata = false and k.condivisa_il >= da7 and k.condivisa_il <= oggi) or (k.ascoltata = true and k.ascoltata_il >= da7))), '[]'::jsonb),
    'segni_ramo',      public.segni_del_ramo(),
    'coach_yes',       coalesce((select jsonb_agg(jsonb_build_object('contatto_id', n.contatto_id)) from public.coach_note n where n.user_id = v), '[]'::jsonb),
    'mio_sharing',     case when p_altro then null else coalesce((select jsonb_agg(to_jsonb(s)) from public.mio_sharing() s), '[]'::jsonb) end,
    'materiali',       coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'tipo', m.tipo, 'titolo', m.titolo, 'autore', m.autore, 'pack_id', m.pack_id, 'per_chi', m.per_chi,
                                    'fase', m.fase, 'ordine', m.ordine, 'straniero', m.straniero, 'solo_donne', m.solo_donne, 'per_lavoro', m.per_lavoro,
                                    'fuori_catalogo', m.fuori_catalogo, 'minuti', m.minuti, 'riassunto', m.riassunto, 'punti_chiave', m.punti_chiave, 'per_chi_testo', m.per_chi_testo))
                                  from public.materiali m where m.tipo in ('traccia', 'pack')), '[]'::jsonb),
    'libri',           coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'tipo', m.tipo, 'titolo', m.titolo, 'autore', m.autore, 'ordine_libro', m.ordine_libro, 'solo_n21', m.solo_n21)
                                    order by m.ordine_libro, m.titolo)
                                  from public.materiali m where m.ordine_libro is not null), '[]'::jsonb),
    'letti',           coalesce((select jsonb_agg(jsonb_build_object('libro', k.libro)) from public.check_giorno k where k.user_id = public.utente_corrente() and k.libro is not null), '[]'::jsonb)
  );
end $$;
revoke execute on function public.apri_oggi(uuid, date, boolean) from public, anon;
grant execute on function public.apri_oggi(uuid, date, boolean) to authenticated;
comment on function public.apri_oggi(uuid, date, boolean) is 'Pagine 029 / Fondamenta 031: tutto quello che la Dashboard legge all''apertura, in una richiesta sola (security invoker: le regole di accesso valgono come per le letture separate).';
