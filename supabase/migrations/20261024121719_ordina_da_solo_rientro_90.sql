-- Nota Pagine 079 (Ignazio 24/10/2026, 12:13-12:20): «Ordina da solo» rientra in coda a 90 giorni, come «Ordine», con un consiglio del coach vero.
-- Corregge anche un difetto: dato dalla coda (registra_esito → applica_rientro) l'esito senza giorni non scriveva un rientro nuovo e la persona usciva dalla
-- coda di oggi senza più tornarci. Con 90 giorni applica_rientro scrive giorno dell'azione + 90, come per «Ordine»; la regola dei 7 giorni resta com'è.
-- MODIFICA di una riga esistente di `sequenze`: approvata da Ignazio il 24/10/2026, si applica al rilascio (la Regia).
-- Copia della riga com'era prima (letta in sola lettura il 24/10/2026):
--   id 2d30c3d2-f0a7-4192-9ce1-1d57b422d328 · categoria Cliente · tipo_azione Contatto · fase Ordina da solo · chiave Cliente-Contatto-Ordina da solo
--   coach 'Ordina da solo dal suo account: tra 7 giorni l''app ti chiede se ha ordinato' · giorni_rientro null · icona null · area Prodotti
--   suggerimento_1/2/3 null
-- Per tornare indietro: update public.sequenze set giorni_rientro = null, coach = 'Ordina da solo dal suo account: tra 7 giorni l''app ti chiede se ha ordinato'
--   where chiave = 'Cliente-Contatto-Ordina da solo';

update public.sequenze
   set giorni_rientro = 90,
       coach = 'Ha l''account e ordina quando vuole: un saluto e come va con i prodotti'
 where chiave = 'Cliente-Contatto-Ordina da solo';
