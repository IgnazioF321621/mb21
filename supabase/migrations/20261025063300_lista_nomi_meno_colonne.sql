-- ═══════════════════════════════════════════════════════════
-- Nota Pagine 091 (c) · Lista Nomi, voce ferma del 23/10 · 25 ottobre 2026
-- ═══════════════════════════════════════════════════════════
-- MODIFICA di una funzione esistente, con l'ok di Ignazio del 25/10/2026 («correggi»). La applica la Regia al rilascio, dopo la copia,
-- DOPO la 20261025063200 (qui si legge `da_rubrica`).
-- `lista_nomi()` (la lettura della Lista dei partner, una richiesta sola) dava ogni colonna della vista (`to_jsonb(l)`), anche quelle che
-- l'app non usa (`fase_icona`, e il conto `contatti_fatti`). Ora le righe hanno solo le colonne che l'app usa: le stesse della lettura
-- dell'Admin (COLONNE_LISTA in pagina-lista.js, tappa L8 del 23/10). Con una sotto-lettura a colonne scritte il database non calcola
-- quelle che non servono. Tutto il resto (biglietti, CEP, coppie, BBS, WES, uso dell'app) IDENTICO alla definizione letta il 25/10/2026.
-- La riga di prima era:
--    'righe',     coalesce((select jsonb_agg(to_jsonb(l) order by l.id) from public.contatti_lista l), '[]'::jsonb),
-- L'app funziona prima e dopo (con l'app di prima, nella scheda di un partner «Contatti fatti» diceva «0» finché non si aggiorna).

CREATE OR REPLACE FUNCTION public.lista_nomi()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    -- la Lista intera (vista contatti_lista, già filtrata dalle regole di accesso di contatti), in ordine di id come le pagine di oggi
    'righe',     coalesce((select jsonb_agg(to_jsonb(x) order by x.id)
                             from (select l.id,
                                          l.user_id,
                                          l.nome,
                                          l.professione,
                                          l.fascia_eta,
                                          l.citta,
                                          l.telefono,
                                          l.categoria,
                                          l.area,
                                          l.brand,
                                          l.referral_di,
                                          l.note,
                                          l.rientro_il,
                                          l.glide_id,
                                          l.creato_il,
                                          l.aggiornato_il,
                                          l.in_coda_dal,
                                          l.categoria_prec,
                                          l.onb_amway,
                                          l.onb_ordine,
                                          l.onb_n21,
                                          l.onb_sogno,
                                          l.onb_starter_pack,
                                          l.onb_lista_start,
                                          l.onb_role_play,
                                          l.onb_contatti,
                                          l.onb_pack_ds,
                                          l.onb_bbs,
                                          l.onb_wes,
                                          l.onb_cep,
                                          l.onb_primo_pm,
                                          l.onb_primo_abo,
                                          l.partner,
                                          l.ultima_area,
                                          l.ultima_modalita,
                                          l.ultimo_tipo,
                                          l.ultima_fase,
                                          l.ultima_il,
                                          l.account_cliente_dal,
                                          l.da_rubrica
                                     from public.contatti_lista l) x), '[]'::jsonb),
    -- targhette BBS · WES · CEP e coppie: gli stessi campi di leggiTarghe
    'biglietti', coalesce((select jsonb_agg(jsonb_build_object('contatto_id', b.contatto_id, 'tipo', b.tipo, 'evento', b.evento,
                                                               'contatto', b.contatto, 'compagno', b.compagno, 'ospiti', b.ospiti))
                             from public.biglietti b), '[]'::jsonb),
    'cep',       coalesce((select jsonb_agg(jsonb_build_object('contatto_id', p.contatto_id, 'dal', p.dal, 'uscito_il', p.uscito_il))
                             from public.cep p), '[]'::jsonb),
    'coppie',    coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'compagno_id', c.compagno_id, 'compagno_nome', c.compagno_nome))
                             from public.contatti c where c.compagno_id is not null or c.compagno_nome is not null), '[]'::jsonb),
    'bbs',       coalesce((select jsonb_agg(jsonb_build_object('data', e.data)) from public.bbs e), '[]'::jsonb),
    'wes',       coalesce((select jsonb_agg(jsonb_build_object('data', e.data)) from public.wes e), '[]'::jsonb),
    -- schede che sono utenti dell'app (targhetta 📱): la stessa funzione di oggi
    'uso_app',   coalesce((select jsonb_agg(to_jsonb(s)) from public.schede_utenti_app() s), '[]'::jsonb)
  );
$function$;
revoke execute on function public.lista_nomi() from public, anon;
grant execute on function public.lista_nomi() to authenticated;
