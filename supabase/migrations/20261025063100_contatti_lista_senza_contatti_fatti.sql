-- ═══════════════════════════════════════════════════════════
-- Nota Pagine 091 (b) · Lista Nomi, voce ferma del 23/10 · 25 ottobre 2026
-- ═══════════════════════════════════════════════════════════
-- MODIFICA di una vista esistente, con l'ok di Ignazio del 25/10/2026 («correggi»). La applica la Regia al rilascio, dopo la copia.
-- La vista `contatti_lista` contava i «Contatti fatti» per OGNI nome a ogni lettura della Lista (per l'Admin ~8.300 conti), ma il numero
-- si vede solo dentro la scheda. Ora lo conta l'app aprendo la scheda (pagina-lista.js, `contaContattiFatti` in `datiPersonaExtra`), con la
-- stessa regola. La colonna resta, vuota (NULL, stesso tipo bigint), così `create or replace view` va bene (stesse colonne, stesso ordine)
-- e l'app di prima non si rompe (nella scheda mostrava «0» finché non si aggiorna). L'ultima azione (`ultima_*`) resta nella vista:
-- serve a ogni card («Sentito 3 giorni fa · telefonata»), all'ordine «Mai sentiti» e alla coda.
-- Tutto il resto IDENTICO alla definizione letta il 25/10/2026 (pg_get_viewdef). security_invoker=true si ripete; i GRANT restano da soli.
-- Nessun'altra vista dipende da `contatti_lista` (pg_depend, 25/10). `lista_nomi()` la legge: vedi la migrazione 20261025063300.
-- La riga tolta era:
--    ( SELECT count(*) AS count
--           FROM azioni a
--          WHERE a.contatto_id = c.id AND a.tipo_azione = 'Contatto'::text AND a.esito IS NOT NULL AND (a.esito <> ALL (ARRAY['No Risposta'::text, 'Telefono spento'::text])) AND (a.esito <> 'Riordino'::text OR COALESCE(a.completata, false))) AS contatti_fatti,

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
    NULL::bigint AS contatti_fatti,
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
