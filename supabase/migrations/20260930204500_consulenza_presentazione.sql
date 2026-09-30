-- Azioni (cantiere 48): tra i tipi di consulenza «Assistenza» diventa «Presentazione» (Ignazio 29/09/2026).
-- Nell'app il tipo è scritto in agenda.js (SOTTOTIPI); qui si rinomina l'unica azione che aveva ancora il nome vecchio
-- (Consulenza PRD · Vendita del 18/09/2026). DA APPLICARE AL RILASCIO, con l'«ok» di Ignazio (sono dati veri dei partner).
update public.azioni
   set modalita = 'Presentazione'
 where tipo_azione = 'Consulenza PRD'
   and modalita = 'Assistenza';
