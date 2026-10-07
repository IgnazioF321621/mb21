-- Nota Pagine 041 (Ignazio 07/10/2026): il segnale «hai una risposta» sul tasto Invia Feedback, senza richieste in più.
-- MODIFICA di una funzione esistente (CLAUDE.md § 4: ok esplicito di Ignazio, chiesto dalla Regia al rilascio).
-- apri_oggi() è la stessa di oggi (copiata dal database il 07/10/2026, copia in ~/evernote/copie/2026-10-07/apri_oggi_prima_041.sql) con:
--   1. la chiave nuova 'risposte': gli id (al massimo 10) delle segnalazioni di chi apre l'app che hanno una risposta; solo sulla propria Dashboard
--      (con il Partner Select su un altro: vuota). La regola segnalazioni_leggi (RLS) vale comunque: la funzione è security invoker.
--   2. nota Pagine 039: tra le tracce non ascoltate escono quelle chiuse con «Non l'ha ascoltata» e c'è il campo non_ascoltata_il
--      (così l'app non fa più la piccola lettura in più). Serve PRIMA la migrazione 20261007223000_condivisioni_non_ascoltata.sql.
-- Stessa firma, stessi permessi.
CREATE OR REPLACE FUNCTION public.apri_oggi(p_utente uuid DEFAULT NULL::uuid, p_oggi date DEFAULT NULL::date, p_altro boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
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
                                    'ascoltata_il', k.ascoltata_il, 'non_ascoltata_il', k.non_ascoltata_il, 'segnata_dal_partner', k.segnata_dal_partner, 'chiede_prossima_il', k.chiede_prossima_il,
                                    'contatti', (select jsonb_build_object('nome', c.nome) from public.contatti c where c.id = k.contatto_id),
                                    'materiali', (select jsonb_build_object('titolo', m.titolo) from public.materiali m where m.id = k.materiale_id)))
                                  from public.condivisioni k where k.user_id = v
                                    and ((k.ascoltata = false and k.non_ascoltata_il is null and k.condivisa_il >= da7 and k.condivisa_il <= oggi) or (k.ascoltata = true and k.ascoltata_il >= da7))), '[]'::jsonb),
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
    'letti',           coalesce((select jsonb_agg(jsonb_build_object('libro', k.libro)) from public.check_giorno k where k.user_id = public.utente_corrente() and k.libro is not null), '[]'::jsonb),
    -- ── nota Pagine 041: le ultime segnalazioni di chi apre l'app con una risposta (solo gli id; «già vista» la tiene il telefono) ──
    'risposte',        case when io then coalesce((select jsonb_agg(x.id) from (select s.id from public.segnalazioni s
                                  where s.user_id = public.utente_corrente() and s.risposta is not null order by s.creata_il desc limit 10) x), '[]'::jsonb) else '[]'::jsonb end
  );
end $function$;

revoke execute on function public.apri_oggi(uuid, date, boolean) from public, anon;
grant execute on function public.apri_oggi(uuid, date, boolean) to authenticated;
