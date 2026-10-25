-- ═══════════════════════════════════════════════════════════
-- Nota Pagine 091 (d) · Lista Nomi, voce ferma del 23/10 · 25 ottobre 2026
-- ═══════════════════════════════════════════════════════════
-- AGGIUNTA di un campo nuovo facoltativo + la vista `contatti_lista` con quel campo IN FONDO (modifica di una vista: ok di Ignazio del
-- 25/10/2026, «correggi»). La applica la Regia al rilascio, DOPO la 20261025063100 (stessa vista) e PRIMA della 20261025063300 (lista_nomi
-- la legge) e PRIMA dell'app: la lettura dell'Admin (COLONNE_LISTA) chiede `da_rubrica`, senza questa migrazione non riesce.
-- I nomi presi dalla rubrica del telefono non devono avere la targhetta «nuovo» (un import di 500 nomi li segnava tutti): l'importazione
-- (rubrica.js, `rigaContatto`) scrive `da_rubrica = true`; `MB21Lista.eNuovo` li salta. Vuoto (null) = nome scritto nell'app o da Glide.
-- Le regole di accesso di `contatti` valgono anche per il campo nuovo (i GRANT della tabella coprono tutte le colonne); nessun trigger.
-- «Scarica la mia lista» non lo mette nel file (esporta.js, NASCOSTE). L'importazione dalla rubrica oggi è spenta (RUBRICA = false).

alter table public.contatti add column if not exists da_rubrica boolean;
comment on column public.contatti.da_rubrica is 'Nota Pagine 091 (d): true = nome preso dalla rubrica del telefono (niente targhetta «nuovo»); null = scritto nell''app o da Glide.';

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
    c.account_cliente_dal,
    c.da_rubrica
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
