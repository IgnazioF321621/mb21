-- Nota Pagine 082 (Ignazio 24/10/2026, «sì», via Regia): la provvigione giusta, con DUE conti a seconda di chi paga.
-- MODIFICA della vista `vendite_conti`, approvata da Ignazio. Si applica al rilascio (la applica la Regia); il codice non legge colonne nuove,
-- quindi l'ordine con l'app non conta (prima di oggi il modulo stimava con il conto vecchio).
--
-- Il problema: la vista faceva provvigione = VP × FC × 0,20 e guadagno_netto = provvigione − sconto. VP × FC è il valore SENZA IVA; il costo del
-- partner è CON IVA (VP × FC × 1,22: filtro 88,47 VP × 2,26194 = 200,11 → 244,13 €); il prezzo al pubblico è il costo × 1,20. Lo sconto è con IVA:
-- una vendita a 250 € incassati di un filtro da 292,97 dava −2,95 invece di +5,86.
-- Per il cliente che paga SUL SITO il conto di prima era giusto (ordine Amway del 23/10: 92,90 VP, guadagno Amway 42,03 € = l'app 42,03).
--
-- La regola nuova (la stessa di MB21Lista.contiVendita in lista.js: ⚠️ si cambiano insieme):
--  · paga sul sito = la regola di MB21Lista.pagataSulSito: il cliente ha account_cliente_dal, la vendita è di quel giorno o dopo, e non ha
--    incassato, prezzo al pubblico né modo di pagamento → provvigione = VP × FC × 0,20; guadagno_netto = provvigione
--  · paga il partner (tutte le altre): costo = VP × FC × 1,22 (IVA 22%); provvigione = costo × 0,20 (il guadagno a prezzo pieno);
--    guadagno_netto = incassato − costo se l'incassato c'è, altrimenti provvigione − sconto
-- La provvigione non è salvata: tutte le vendite già esistenti si ricalcolano da sole (anche quelle vecchie da Glide, che non hanno soldi scritti:
-- provvigione − sconto con il costo con IVA). I VP, il giorno in cui la vendita conta (conta_il) e il fattore (fc) NON cambiano: le colonne sono
-- le stesse, nello stesso ordine e con gli stessi tipi; `check_giorni_conti` (che legge solo vp e conta_il) resta identica.
-- `security_invoker` ripetuto (create or replace lo vuole scritto); i permessi restano quelli di prima. Il cliente si legge con le regole di chi
-- guarda (contatti: i propri, l'Admin tutti), come la vendita: una vendita il cui cliente non si vede conta come «paga il partner».
-- wallet_sync legge `provvigione` da qui: non si ripubblica, prende il numero nuovo da sola.
--
-- La definizione di PRIMA (pg_get_viewdef del 24/10/2026), per tornare indietro:
-- create or replace view public.vendite_conti with (security_invoker = true) as
--    SELECT v.id,
--       v.user_id,
--       v.contatto_id,
--       v.data,
--       v.brand,
--       v.prodotto,
--       v.vp,
--       v.sconto,
--       v.riordino,
--       v.da_glide,
--       v.creato_il,
--       v.consegna,
--       v.azione_riordino_id,
--       v.azione_consegna_id,
--       v.ordinata_il,
--           CASE
--               WHEN v.consegna IS NULL THEN v.data
--               ELSE v.ordinata_il
--           END AS conta_il,
--       f.valore AS fc,
--       v.vp * f.valore * 0.20 AS provvigione,
--       v.vp * f.valore * 0.20 - v.sconto AS guadagno_netto
--      FROM vendite v
--        LEFT JOIN LATERAL ( SELECT fattori_conversione.valore
--              FROM fattori_conversione
--             WHERE fattori_conversione.dal <= COALESCE(v.ordinata_il, v.consegna, v.data)
--             ORDER BY fattori_conversione.dal DESC
--            LIMIT 1) f ON true;
--
-- Provata in una prova annullata sul database vero il 24/10/2026 (vedi il messaggio «Rilascia» e STRUTTURA.md).

create or replace view public.vendite_conti with (security_invoker = true) as
 SELECT v.id,
    v.user_id,
    v.contatto_id,
    v.data,
    v.brand,
    v.prodotto,
    v.vp,
    v.sconto,
    v.riordino,
    v.da_glide,
    v.creato_il,
    v.consegna,
    v.azione_riordino_id,
    v.azione_consegna_id,
    v.ordinata_il,
        CASE
            WHEN v.consegna IS NULL THEN v.data
            ELSE v.ordinata_il
        END AS conta_il,
    f.valore AS fc,
        CASE
            WHEN s.sul_sito THEN v.vp * f.valore * 0.20                      -- paga sul sito: il 20% senza IVA
            ELSE v.vp * f.valore * 1.22 * 0.20                               -- paga il partner: il 20% del suo costo con IVA (1,22)
        END AS provvigione,
        CASE
            WHEN s.sul_sito THEN v.vp * f.valore * 0.20                      -- sul sito il guadagno è la provvigione
            WHEN v.incassato IS NOT NULL THEN v.incassato - v.vp * f.valore * 1.22   -- incassato − il suo costo con IVA
            ELSE v.vp * f.valore * 1.22 * 0.20 - v.sconto                    -- senza incassato: provvigione − sconto
        END AS guadagno_netto
   FROM public.vendite v
     LEFT JOIN LATERAL ( SELECT fattori_conversione.valore
           FROM public.fattori_conversione
          WHERE fattori_conversione.dal <= COALESCE(v.ordinata_il, v.consegna, v.data)
          ORDER BY fattori_conversione.dal DESC
         LIMIT 1) f ON true
     -- chi paga (la regola di MB21Lista.pagataSulSito)
     LEFT JOIN LATERAL ( SELECT (EXISTS ( SELECT 1
                   FROM public.contatti c
                  WHERE c.id = v.contatto_id AND c.account_cliente_dal IS NOT NULL AND c.account_cliente_dal <= v.data))
              AND v.incassato IS NULL AND v.prezzo_pubblico IS NULL AND COALESCE(v.pagato_con, '') = '' AS sul_sito) s ON true;
