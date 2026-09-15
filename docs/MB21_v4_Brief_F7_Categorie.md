# MB21 v4.0 — Brief Fase 7 · LISTA NOMI E CATEGORIE

> Redatto il 15/09/2026 (Europe/Rome). Per Claude Code, da aprire in una **sessione nuova**.
> Contesto: `CANTIERI.md` (cantiere 16), `docs/MB21_v3_Lista_come_e.md` (la Lista di Glide), `docs/MB21_v4_Brief_F2_ListaNomi.md`, `docs/MB21_v4_Brief_F1_Oggi.md`, `STRUTTURA.md` (Lista Nomi, Coda OGGI, Bottoni esito), `CLAUDE.md`.
> **Stato: bozza. Nessuna decisione presa: si parte dalle domande a Ignazio, una alla volta.**

## Modalità di lavoro
- Prima le domande (sez. 4), **una alla volta**, aspettando la risposta. Poi le proposte, poi i lavori.
- Zero gergo in chat; dettaglio tecnico in `STRUTTURA.md` e nei commit, aggiornati nello stesso commit.
- Una soluzione sola, la più semplice che funziona. Se qualcosa non è certo: fermarsi e proporre come verificarlo.
- Nessun dato di persone nei file del repo (LEZIONI L1): solo numeri e criteri.

## 1. Il problema (parole di Ignazio, 15/09)
«Sia io sia tutti gli altri abbiamo un sacco di persone che non sono state ancora catalogate in nessuna delle categorie (Prospect, Partner, eccetera). Era un lavoro che stavamo facendo man mano in ordine alfabetico. Come la possiamo gestire?»

## 2. Cosa c'è oggi (verificato sul DB il 15/09)

**Contatti senza categoria per partner** (partner del Partner Select):

| Partner | Senza categoria | Totale |
|---|---|---|
| Ignazio (Admin) | 803 | 1.562 |
| Isabella | 377 | 783 |
| Carolina | 31 | 190 |
| Ornella | 6 | 59 |
| Andrea | 1 | 76 |
| Maria Elisa, Luca e Michaela, Tonya e Filippo, Valentina | 0 | — |

**Ignazio + Isabella insieme, per categoria** (contatti · con almeno un'azione · senza telefono):

| Categoria | Contatti | Con azioni | Senza telefono |
|---|---|---|---|
| (senza) | 1.180 | **5** | 222 |
| Prospect | 584 | 468 | 40 |
| Unlinked | 318 | 32 | 118 |
| Ex Partner/Cliente | 133 | 65 | 2 |
| Cliente | 54 | 51 | 1 |
| Archiviato | 43 | 35 | 0 |
| Partner | 30 | 24 | 4 |
| Referral | 3 | 2 | 0 |

Da leggere: i senza categoria **non sono quasi mai stati lavorati** (5 su 1.180 hanno un'azione); 1 su 5 non ha il telefono. Coerente con il brief di sviluppo (§ qualità dei dati: «nominativi mai realmente lavorati»).

**Come li tratta la v4 oggi:**
- **Coda OGGI**: i senza categoria **entrano in coda** (solo Unlinked, Ex Partner/Cliente e Archiviato restano fuori, decisione di Ignazio 14/09). Non avendo azioni sono tutti «mai contattati»: si contendono i **2 posti su 5** dei mai contattati con i Prospect mai chiamati (60% rientri, 40% mai contattati). A parità: `rientro_il` più vecchio, poi **nome** → di fatto escono **in ordine alfabetico**, come il lavoro che si faceva in Glide
- **Bottoni esito**: come i Prospect (Appuntamento · Richiamare · Non risponde · Non ora · Non interessato). L'esito **non cambia la categoria**: il contatto resta senza categoria anche dopo la chiamata
- **Lista Nomi**: filtro **Altri ▾ → Senza categoria** (in ordine alfabetico); la categoria si cambia da **Modifica** (nel modulo è obbligatoria, quindi chi apre Modifica deve sceglierla). Un contatto alla volta
- **Nuovo contatto** (anche dalla scelta contatto dell'Agenda): categoria obbligatoria, oppure Prospect
- **Admin**: con il Partner Select può fare lo stesso lavoro sulla lista di un partner, a nome suo (cantiere 15)

**In Glide** (rilievo `MB21_v3_Lista_come_e.md`): i senza categoria (circa 1.200 nell'export) comparivano solo in ALL/Lista, **nessun filtro** dedicato; nel modulo Nominativo e Categoria erano obbligatori.

## 3. Categorie esistenti
`Prospect` · `Partner` · `Cliente` · `Referral` · `Unlinked` · `Ex Partner/Cliente` · `Archiviato` (solo con «Archivia»), oppure vuota. Colori della strip in `STRUTTURA.md` → Card. Le fasi del percorso (`sequenze`) esistono solo per Prospect, Partner e Cliente.

## 4. Domande a Ignazio (⏸ una alla volta)
1. **Criterio**: in Glide, guardando un nome, come decidevi la categoria? (es. lo conosco bene → Prospect; non lo sento da anni → Unlinked; non so chi sia → Archivia). Serve per capire se la scelta si fa **a colpo d'occhio** o **solo dopo averlo chiamato**
2. **Tutti da chiamare?** I 1.180 senza categoria vanno davvero chiamati prima o poi, o molti vanno solo messi da parte (Unlinked / Archiviato) senza chiamarli?
3. **Coda nel frattempo**: finché non sono catalogati, devono continuare a entrare in coda (oggi sì, in ordine alfabetico) o restare fuori finché qualcuno non sceglie la categoria?
4. **Categoria al momento della chiamata**: quando un senza categoria arriva in coda, l'app deve chiedere la categoria insieme all'esito? (es. «Non interessato» → resta Prospect o diventa Unlinked?)
5. **Chi fa il lavoro**: ogni partner sulla sua lista, oppure anche Ignazio per loro (Partner Select, già possibile), o insieme in chiamata?
6. **Ritmo**: un tanto al giorno (come la coda) o sessioni di smistamento quando c'è tempo?
7. **Senza telefono** (222 tra Ignazio e Isabella): archiviarli, tenerli per completarli, o trattarli a parte?
8. **Referral** (3): è ancora una categoria che serve?

## 5. Strade possibili (da proporre dopo le risposte, non decise)
- **A. Smistamento rapido**: una pagina «Da catalogare» che mostra un nome alla volta (nome, professione, telefono, note) con bottoni grandi Prospect · Partner · Cliente · Unlinked · Archivia · Salta, e il contatore «N da catalogare». Avanza da solo, con Annulla
- **B. Categoria in coda**: la card di un senza categoria chiede prima la categoria, poi l'esito
- **C. Più insieme**: selezione multipla nella Lista (es. tutti i senza telefono → Archivia) quando il criterio è chiaro
- Si possono combinare (es. A per il grosso, B per quelli che capitano in coda). Ogni strada va provata sui numeri veri (LEZIONI L3)

## 6. Fuori da questo brief
- Albero della squadra / segni vitali sulle persone (cantiere 14, direzione G)
- Installazione della web app e accesso dal link (cantiere 15, aperto)
- Import dei dati Amway
