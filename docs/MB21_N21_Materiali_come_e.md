# Network 21: i materiali e il percorso — com'è (rilievo per il cantiere 40)

*Rilievo del 21 settembre 2026, sola lettura. Fonti: il PDF «Media Sharing V2» (versione 2.0, aggiornata al 17/10/2025, 44 pagine) e il «Manuale di Avvio 2026» (pagina «Materiali di Supporto all'Attività»), tutti e due sul Mac di Ignazio, fuori dal repo; i CSV di Glide in `mb21-import/` (export del 13/09). Il sito network21.it chiede l'accesso: da fotografare in Arc con Ignazio.*

**⚠️ Il repo è pubblico**: qui c'è solo l'indice (titolo, oratore, durata). I testi di Network 21 (riassunto, punti chiave, «per chi è indicata») **non si copiano nel repo**: andranno nel database.

## Le quattro famiglie di materiali (Manuale 2026)
- **Starter Pack**: Manuale di Avvio, 4 tracce audio, presentazione del Piano Marketing. È l'avvio di ogni incaricato
- **Media Sharing**: condivisione di tracce audio, **una alla volta, selezione mirata**, con i candidati dopo il Piano Marketing e con i nuovi incaricati **fino al loro primo WES**. La condivisione e l'ascolto avvengono nella **App N21 Mobile Italia**, non in MB21
- **CEP** (formazione continuativa): 4 tracce nuove al mese (5 nel Professional). Abitudine del Manuale: «ascolta ogni giorno almeno una traccia del CEP»
- **Libri consigliati**: abitudine del Manuale: «leggi almeno 15 minuti al giorno»

## Il Media Sharing: 40 tracce in 4 fasi
#1 Interesse 16 · #2 Sopravvivenza 7 · #3 Consapevolezza 6 · #4 Convinzione 11

Ogni traccia nel PDF ha: oratore · durata · breve riassunto · punti chiave · **«per chi è indicata»** (per tutti / da condividere subito / solo pubblico femminile / imprenditori e professionisti / non come prima traccia a chi è guidato dalle emozioni…).

### Fase #1 Interesse — Ospite (il candidato, dopo il Piano Marketing) · 16 tracce

1. L’impresa ideale — Massimo Bini · 59 minuti
2. Siamo nel mondo reale — Enzo Capecchi · 40 minuti
3. Il principio del percorso — Massimo Bini · 35 minuti
4. L’attività si rivelerà a strati — Lorenzo Pellegrini · 21 minuti
5. Sviluppate una vostra solida opinione — Andrea Busato · 33 minuti
6. La rivoluzione dell’attività Amway — Alain Mazzari · 22 minuti
7. Risposte per prendere la migliore decisione — Peter Matz · 24 minuti
8. Perché investire il tuo tempo in questa attività — Alain Mazzari · 41 minuti
9. Come avere successo in questa attività — Alain Mazzari · 43 minuti
10. Un equilibrio non comune — Federica Martelli · 12 minuti
11. La storia — Natalia Gurini · 33 minuti
12. La storia — Alessio e Maria Grazia Nocentini · 50 minuti
13. La storia — Aurelio Castelli · 34 minuti
14. La storia — Federica Martelli · 34 minuti
15. La storia — Massimo Bini · 67 minuti
16. Tempo e denaro — Alessio Nocentini · 17 minuti

### Fase #2 Sopravvivenza — Utente (il nuovo incaricato) · 7 tracce

1. La risposta — Massimo Bini · 61 minuti
2. I primi passi per iniziare la vostra attività — Andrea Busato · 25 minuti
3. Il ritmo del Sistema — Enzo Capecchi · 26 minuti
4. Il valore del CEP — Alain Mazzari · 27 minuti
5. La vostra attività inizia al Weekend Seminar — Alain Mazzari · 43 minuti
6. Superare la paura del giudizio degli altri — Massimo Bini · 40 minuti
7. Crescita personale — Enzo Capecchi · 46 minuti

### Fase #3 Consapevolezza — Utente (il nuovo incaricato) · 6 tracce

1. Massimo risultato con il minimo sforzo — Enzo Capecchi · 34 minuti
2. Sviluppare una mentalità imprenditoriale — Massimo Bini · 41 minuti
3. Il potere dei numeri — Enzo Capecchi · 34 minuti
4. La linea sottile — Massimo Bini · 61 minuti
5. L’opportunità sei tu — Massimo Bini · 51 minuti
6. Valore e significatività — Alain Mazzari · 23 minuti

### Fase #4 Convinzione — Utente (il nuovo incaricato) · 11 tracce

1. Il potere del Sistema — Massimo Bini · 37 minuti
2. Stesse Decisioni = Stessi Risultati — Massimo Bini · 47 minuti
3. L’atteggiamento fa la differenza — Enzo Capecchi · 31 minuti
4. Come superare le vostre paure — Massimo Bini · 37 minuti
5. Questa è la “tua” attività — Massimo Bini · 48 minuti
6. L’atteggiamento mentale della persona di successo — Massimo Bini · 57 minuti
7. Il gelato al mandarino — Enzo Capecchi · 38 minuti
8. I tre fondamentali per costruire l’attività — Massimo Bini · 42 minuti
9. Pensare da vincente — Massimo Bini · 60 minuti
10. Prendere il controllo assegnando le priorità — Massimo Bini · 47 minuti
11. Come sarà la vostra vita tra 10 anni — Massimo Bini · 39 minuti

## Cosa c'era in Glide
- `BSM.csv`: **31 righe, 21 compilate** (fase, pack, traccia, riassunto, «per chi», link `network21.it/bsm/product/…`): 16 della fase #1 e 8 della #2 → **metà del percorso**; le fasi #3 e #4 non c'erano
- `Sharing.csv`: **109 condivisioni su 42 persone**, tutte in fase «#1 Interesse» (Ignazio 83 · Isabella 13 · altri 13); 84 segnate «ascoltata». Campi: persona · data · numero e traccia · pack · note · ascoltata · la prossima traccia proposta
- `N21.csv`: i **18 Principi Guida** (titolo, testo, link)
- Libri: i 44 titoli dell'elenco del Check (`MB21Dashboard.LIBRI`); nel menu di Glide c'era la pagina **Libri**
- La sezione Sharing stava nella scheda di Prospect e Partner; **mai fotografata**

## Le decisioni di Ignazio (21/09)
- **MB21 non manda le tracce**: per quello c'è l'app di Network 21. MB21 è **il registro di quello che si fa, ma che deve guidare in un percorso**: quale traccia è stata condivisa, se è stata ascoltata, e da lì il consiglio sul passo dopo
- **Non più chiuso dentro la singola scheda**: più fluido. Prima è lo sponsor a condividere le tracce e consigliare i libri; poi la persona (candidato o partner) ascolta e studia **in modo mirato**. Chi è nuovo e ha MB21 segna il percorso di ascolto fatto e riceve il consiglio sui prossimi passi e sui prossimi pack
- **La spina dorsale sono le 4 fasi del Media Sharing**, con libri e pack agganciati alle fasi («anche se poi sicuramente aggiusteremo tutto»)

## La struttura proposta (da aggiustare insieme)
1. **La biblioteca**: le 40 tracce (fase, ordine, «per chi è indicata»), lo Starter Pack, i libri consigliati. Il CEP cambia ogni mese: resta un numero nel Check
2. **Il registro, uno per persona**: traccia · condivisa il · ascoltata sì/no. Si segna dove succede: dopo un PM con «Dare Seguito» («Che traccia gli hai mandato?»), al contatto dopo («L'ha ascoltata?»); nella scheda si vede tutto il percorso
3. **La guida**: l'app mostra le 2-3 tracce della fase giusta non ancora condivise, con il «per chi è indicata»; sceglie lo sponsor. Dopo l'iscrizione si passa alle fasi #2 → #4, fino al primo WES
4. **«Il mio percorso»** per il partner che ha MB21: le sue 4 fasi, quello che ha ascoltato e letto, il passo dopo. **Un registro solo**: la riga che lo sponsor segna «condivisa» è la stessa che il partner segna «ascoltata»; lo sponsor vede a che fase è ognuno

## Da chiarire
- ~~**Tracce e Pagine del Check**~~ — ✅ confermato da Ignazio il 21/09: «sono quelle che ascolto e leggo io, non quelle che condividiamo». Quindi **le condivisioni non toccano il Check**. Da decidere più avanti: quando un partner segna «ascoltata» una traccia in «Il mio percorso», quella è una traccia ascoltata da lui → deve contare da sola nelle Tracce del Check? (regola: un numero, una fonte sola)
- Il sito e l'app N21: come sono ordinati i pack, l'elenco ufficiale dei libri consigliati di oggi → foto in Arc
- I 44 libri del Check rispetto ai libri consigliati ufficiali
- L'export è del 13/09: serve un `Sharing.csv` nuovo se dopo si è segnato altro in Glide
