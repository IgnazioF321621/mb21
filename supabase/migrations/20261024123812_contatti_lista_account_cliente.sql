-- Nota Pagine 080, punto 2 (Ignazio 24/10/2026, scelta «C»): la targhetta «Account» anche sulla card della Lista Nomi (scheda chiusa).
-- La vista `contatti_lista` non aveva `account_cliente_dal`: si aggiunge IN FONDO, le altre colonne uguali e nello stesso ordine; niente altro cambia.
-- MODIFICA di una vista esistente: ok di Ignazio nella stessa domanda («serve cambiare un elenco nel database: tuo ok e copia prima» → C).
-- Si applica al rilascio (la Regia), con prova di lettura vera. `lista_nomi()` prende to_jsonb(l): la colonna arriva da sola ai partner; l'Admin la
-- legge con COLONNE_LISTA (pagina-lista.js). Nessun'altra vista dipende da `contatti_lista` (pg_depend, 24/10): `contatti_coda` non cambia.
-- L'opzione security_invoker=true si ripete (create or replace view la toglierebbe); i permessi (GRANT) restano quelli di prima da soli.
-- Definizione di prima (pg_get_viewdef, letta il 24/10/2026), con security_invoker=true:
--   SELECT c.id,
--       c.user_id,
--       c.nome,
--       c.professione,
--       c.fascia_eta,
--       c.citta,
--       c.telefono,
--       c.categoria,
--       c.area,
--       c.brand,
--       c.referral_di,
--       c.note,
--       c.rientro_il,
--       c.glide_id,
--       c.creato_il,
--       c.aggiornato_il,
--       c.in_coda_dal,
--       c.categoria_prec,
--       c.onb_amway,
--       c.onb_ordine,
--       c.onb_n21,
--       c.onb_sogno,
--       c.onb_starter_pack,
--       c.onb_lista_start,
--       c.onb_role_play,
--       c.onb_contatti,
--       c.onb_pack_ds,
--       c.onb_bbs,
--       c.onb_wes,
--       c.onb_cep,
--       c.onb_primo_pm,
--       c.onb_primo_abo,
--       p.nome AS partner,
--       u.area AS ultima_area,
--       u.modalita AS ultima_modalita,
--       u.tipo_azione AS ultimo_tipo,
--       u.esito AS ultima_fase,
--       u.inizio AS ultima_il,
--       s.icona AS fase_icona,
--       ( SELECT count(*) AS count
--              FROM azioni a
--             WHERE a.contatto_id = c.id AND a.tipo_azione = 'Contatto'::text AND a.esito IS NOT NULL AND (a.esito <> ALL (ARRAY['No Risposta'::text, 'Telefono spento'::text])) AND (a.esito <> 'Riordino'::text OR COALESCE(a.completata, false))) AS contatti_fatti
--      FROM contatti c
--        JOIN utenti p ON p.id = c.user_id
--        LEFT JOIN LATERAL ( SELECT a.area,
--               a.modalita,
--               a.tipo_azione,
--               a.esito,
--               a.inizio,
--               a.chiave
--              FROM azioni a
--             WHERE a.contatto_id = c.id
--             ORDER BY a.inizio DESC NULLS LAST, a.creato_il DESC
--            LIMIT 1) u ON true
--        LEFT JOIN sequenze s ON s.chiave = u.chiave
--     WHERE c.eliminato_il IS NULL;

create or replace view public.contatti_lista with (security_invoker = true) as
SELECT c.id,
    c.user_id,
    c.nome,
    c.professione,
    c.fascia_eta,
    c.citta,
    c.telefono,
    c.categoria,
    c.area,
    c.brand,
    c.referral_di,
    c.note,
    c.rientro_il,
    c.glide_id,
    c.creato_il,
    c.aggiornato_il,
    c.in_coda_dal,
    c.categoria_prec,
    c.onb_amway,
    c.onb_ordine,
    c.onb_n21,
    c.onb_sogno,
    c.onb_starter_pack,
    c.onb_lista_start,
    c.onb_role_play,
    c.onb_contatti,
    c.onb_pack_ds,
    c.onb_bbs,
    c.onb_wes,
    c.onb_cep,
    c.onb_primo_pm,
    c.onb_primo_abo,
    p.nome AS partner,
    u.area AS ultima_area,
    u.modalita AS ultima_modalita,
    u.tipo_azione AS ultimo_tipo,
    u.esito AS ultima_fase,
    u.inizio AS ultima_il,
    s.icona AS fase_icona,
    ( SELECT count(*) AS count
           FROM azioni a
          WHERE a.contatto_id = c.id AND a.tipo_azione = 'Contatto'::text AND a.esito IS NOT NULL AND (a.esito <> ALL (ARRAY['No Risposta'::text, 'Telefono spento'::text])) AND (a.esito <> 'Riordino'::text OR COALESCE(a.completata, false))) AS contatti_fatti,
    c.account_cliente_dal
   FROM contatti c
     JOIN utenti p ON p.id = c.user_id
     LEFT JOIN LATERAL ( SELECT a.area,
            a.modalita,
            a.tipo_azione,
            a.esito,
            a.inizio,
            a.chiave
           FROM azioni a
          WHERE a.contatto_id = c.id
          ORDER BY a.inizio DESC NULLS LAST, a.creato_il DESC
         LIMIT 1) u ON true
     LEFT JOIN sequenze s ON s.chiave = u.chiave
  WHERE c.eliminato_il IS NULL;
