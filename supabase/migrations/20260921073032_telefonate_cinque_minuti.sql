-- Cantiere 37 (Ignazio 21/09): una telefonata dura 5 minuti, non un'ora.
-- Nell'Agenda a orario un'azione «Contatto» con un'ora di durata occupa tutta la fascia e sporca la
-- giornata. Dal 21/09 il modulo propone 5 minuti per i Contatti (MB21Agenda.durataPredefinita), ma le
-- azioni già salvate avevano l'ora presa dal vecchio default automatico.
--
-- Si toccano SOLO le azioni «Contatto» fatte a distanza (Telefonata, Messaggio, Contattare) con durata
-- di 60 minuti esatti, cioè il vecchio default messo dall'app. NON si toccano:
--   · «Presenza» (un incontro di persona può durare davvero un'ora)
--   · le durate scelte a mano (15, 30, 45 minuti): le ha decise qualcuno
-- Provata prima in una transazione annullata: 505 righe su 6 partner (434 Telefonata, 39 Contattare,
-- 32 Messaggio); dopo l'aggiornamento restano fuori dai 5 minuti solo 36 righe, tutte volute.
update azioni
   set fine = inizio + interval '5 minutes'
 where tipo_azione = 'Contatto'
   and modalita in ('Telefonata', 'Messaggio', 'Contattare')
   and fine is not null
   and fine - inizio = interval '60 minutes';
