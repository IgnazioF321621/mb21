# MB21 · Lo stile dell'app (fonte unica)

*Cantiere 34. Lo stile lo decide Design (tela `https://claude.ai/artifact/DrR3qpbTytcsJNTL9Mje4E`, «MB21 · stile e schermate»); questo documento lo scrive e lo tiene allineato Code. Copia delle tavole lette il 19/09/2026: `tools/design/da_design/` (dati finti). Brief di partenza: `docs/MB21_v4_Brief_Design.md`.*

## La direzione scelta (Ignazio, 19/09/2026)
**C «Il colore che parla» con il respiro della A «Carta e inchiostro».** Fondo perla, card bianche molto tonde, carattere di sistema dell'iPhone, **un solo accento: l'inchiostro**. I colori che hanno un significato diventano la grafica: le righe e le card delle persone sono **tinte del colore della loro categoria**, così si capisce chi è chi prima di leggere. Dalla A viene il passo: **26 px fra le sezioni**, poche cose a schermo, più aria dentro le card. Scartate: A da sola e B «Blocchi» (resta nella tela come idea «da cantiere»).

## Correzione alla direzione, vista nell'app (Ignazio, 19/09/2026)
**Negli elenchi la riga resta bianca; la categoria la dice il tondo con le iniziali.** La riga tutta tinta della categoria (proposta di Design) sul fondo perla «non si vede benissimo, il contrasto è un po' fastidioso» (il rosa-pesca del Prospect, caldo, sul grigio freddo). Scelta «B» tra tre prove affiancate (`tools/design/confronto_coda.html`): riga bianca con l'ombra leggera, **tondo pieno del colore della categoria con le iniziali bianche**, esiti grigio chiaro. Vale per la coda, «Da catalogare» e la Lista Nomi. **La tinta (`--cat-*-tinta`) resta per dove c'è una persona sola in primo piano**: la testata della scheda contatto.

**I 4 modi di contattare tengono i loro colori** (Ignazio, 19/09/2026: «li farei con i colori originali di appartenenza»): Chiama verde · SMS blu · WhatsApp verde · Telegram azzurro, variabili `--ct-*`, un tono appena più scuro dell'originale perché il tratto sottile si legga sul bianco. Sono l'unica eccezione all'accento unico, insieme ai colori che hanno un significato.

## La regola sulle voci (Ignazio, 19/09/2026)
**Le voci dell'app non cambiano: cambia solo il vestito.** Nelle bozze (quelle di Code e quelle di Design) nomi, numeri e **scritte sono inventati**: «Buongiorno, Marco», le linguette «Attività · Prodotti · Team», «Da sentire oggi», «Vedi tutti», la riga unica «2 partner da avviare · 3 riordini», «128 contatti», «Registra esito». Nell'app restano **le voci, i contenuti e l'ordine di oggi**: per esempio le linguette della Dashboard sono **Volume · Azione · Segni Vitali · Crescita** (ognuna con il suo colore, che ha un significato: blu · arancio · verde · viola), la coda è «La tua coda», i richiami sono righe separate. Un'idea nuova vista nelle bozze (una voce, un bottone, un raggruppamento) **non entra da sola**: si propone a Ignazio e si decide a parte.

## Le variabili (da mettere in cima al foglio di stile, `:root`)
```css
:root{
  /* superfici e testo */
  --sfondo:#EFF1F5;       --superficie:#FFFFFF;
  --superficie-2:#F7F8FA; --bordo:#E3E7EE;
  --testo:#10151F;        --testo-soft:#5A6475;
  --testo-tenue:#7B8496;
  --accento:#10151F;      --accento-su:#FFFFFF;

  /* categorie dei contatti: colore pieno (pastiglia, targhetta) e tinta (fondo di card, riga, testata) */
  --cat-prospect:#C2410C;    --cat-prospect-tinta:#FDEEE2;
  --cat-cliente:#0E7490;     --cat-cliente-tinta:#DFF1F6;
  --cat-partner:#1D4ED8;     --cat-partner-tinta:#E7EFFE;
  --cat-ex:#5A6475;          --cat-ex-tinta:#EAECF1;
  --cat-unlinked:#7B8496;    --cat-unlinked-tinta:#F2F4F7;
  --cat-archiviato:#374151;  --cat-archiviato-tinta:#E4E7EC;

  /* segni vitali e stati */
  --bbs:#1D4ED8; --bbs-tinta:#E7EFFE; --wes:#C02626; --cep:#15803D; --spento:#C3C8D1;
  /* i segni vitali NON seguono le categorie: hanno i loro colori da sempre (BBS blu · WES rosso · CEP verde) */
  --ok:#15803D;        --ok-tinta:#E4F3E8;
  --pericolo:#C02626;  --pericolo-tinta:#FCEAEA;
  --proposta:#B45309;  --proposta-tinta:#FEF3C8;

  /* scritte */
  --font: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
  --dim-pagina:26px;   --dim-sezione:16px;
  --dim-corpo:15px;    --dim-piccolo:12.5px;
  --dim-etichetta:11px; --dim-numero:34px;
  --peso-medio:600;    --peso-forte:700;
  --interlinea:1.35;

  /* spazi (base 4) */
  --s1:4px;  --s2:8px;  --s3:12px; --s4:16px;
  --s5:24px; --s6:32px; --s7:48px;

  /* angoli */
  --raggio-bottone:14px; --raggio-riga:18px;
  --raggio-card:22px;    --raggio-foglio:28px;
  --raggio-pill:999px;

  /* ombre, misure, tocco */
  --ombra-card:0 2px 12px rgba(16,21,31,.05);
  --ombra-foglio:0 -8px 30px rgba(16,21,31,.14);
  --bottone-h:50px; --pill-h:40px; --tocco:44px;
  --pagina-x:16px;
}
```
Scala delle scritte: titolo di pagina 26/700 · sezione 16/700 · testo 15/400 · piccolo 12,5/400 · etichetta 11/700 maiuscolo con 1,2 px di spaziatura · numero grande 34/700. Interlinea 1,35 (1,15 per titoli e numeri).

## I pezzi
- **Bottoni** (alti 50, raggio 14): principale pieno inchiostro · secondario bianco con bordo · pericolo pieno rosso `--pericolo` · a sola scritta · spento grigio `--bordo`.
- **Esiti**: pastiglie alte 40 con icona e scritta, bordo grigio su bianco; quello scelto pieno inchiostro.
- **Card del contatto** (com'è nell'app, decisa con Ignazio il 19/09 guardando la Lista vera): fondo bianco, tondo 42 con le iniziali nel colore della categoria, **prima riga solo il nome**, poi la frase, la professione e, **in una riga loro in fondo**, «nuovo» e le targhette (accanto al nome «ci si perde»); cornetta a tratto nel cerchio e tre puntini a destra. Compatta: più alta solo per chi ha le targhette. Nella tavola di Design era: tutte alte **96 px**, raggio 20, pastiglia tonda 46 con le iniziali nel colore pieno, nome e riga sotto, targhette BBS · WES · CEP, tre puntini a destra.
- **Riquadro dei numeri**: superficie bianca raggio 22, numero grande con «/ obiettivo», barra alta 7.
- **Riga che si apre al tocco**: sotto compaiono gli esiti, separati da un filetto.
- **Linguette**: contenitore a pastiglia grigio chiaro, quella attiva piena inchiostro.
- **Targhette BBS · WES · CEP**: sempre in quest'ordine; piene del loro colore se accese, contorno grigio `--spento` se spente.
- **Foglio dal basso**: raggio 28 in alto, `--ombra-foglio`, maniglia grigia 44×5.
- **Avviso in basso**: fondo inchiostro, scritta bianca, «Annulla» sottolineato.
- **Barra in basso**: bianca, raggio 26 in alto, icona 23 con scritta 10,5; la pagina attiva in grassetto inchiostro, le altre grigie.
- **Scheda contatto**: testata con la tinta della categoria (indietro, tre puntini, pastiglia 62, nome, targhette, 4 cerchi per contattare) · linguette Dati · Azioni · Coach · Vendite · Segni vitali · riquadro giallo «L'app propone» (`--proposta-tinta`) · bottone principale sempre in fondo.

## Le icone
Una famiglia sola, a tratto: `viewBox 0 0 24 24`, `fill="none" stroke="currentColor"`, punte e giunzioni tonde, tratto **1,8** (Design ne usa 1,7 nel formato grande: nell'app si tiene 1,8 ovunque). Primo gruppo di Design: **29** (5 barra in basso · 7 categorie · 5 tipi di azione · 12 esiti più usati). Le 88 della versione 3 restano il vocabolario: le altre le disegna Design nello stesso tratto. Nell'app vivono in **un solo file** con un `<symbol id="ic-…">` per icona (nella tela sono disegni ripetuti, senza nome: i nomi li dà Code).

### Nell'app (lavoro 2, 19/09/2026)
File unico **`icone.js`**: l'elenco `DISEGNI` (nome → disegno), `MB21Icone.icona(nome, px)` per l'HTML scritto dal codice, e all'avvio mette nella pagina un `<symbol id="ic-nome">` per icona, così l'HTML scritto a mano usa `<svg class="ic"><use href="#ic-nome"/></svg>`. Lo stile `svg.ic` (tratto 1,8, un colore, grande quanto la scritta) è nel foglio di `index.html`. Prova: `tools/banco/prova_icone.js`. **Un'icona nuova si chiede a Design e si importa** con `python3 tools/design/importa_icone.py` (legge `tools/design/da_design/Icone.dc.html`, riscrive il blocco `DISEGNI`). Al 19/09/2026: **83 icone** (29 del primo gruppo + 54 del secondo).

### Richiesta a Design · secondo gruppo (le emoji che l'app usa oggi)
Contate nel codice il 19/09: **68 emoji diverse, 295 usi**. Le 88 icone della versione 3 descrivono le *fasi* del lavoro; all'app di oggi servono soprattutto icone **di comando e di richiamo**. Testo da incollare in Design:

> Le 29 icone vanno bene: sono già nell'app (barra in basso compresa). Adesso mi serve il secondo gruppo, nello stesso identico tratto (griglia 24×24, nessun riempimento, punte tonde, un colore solo, stroke currentColor). Non partire dalle 88 della versione 3: parti da questo elenco, che sono le emoji che oggi l'app usa davvero come icone e che vanno sostituite. Per ognuna il nome che userà Code.
> 
> Azioni e comandi: ic-modifica (matita) · ic-elimina (cestino) · ic-collega (catena) · ic-condividi (freccia che esce) · ic-aggiorna (due frecce in cerchio: «riprendi da capo») · ic-pausa · ic-riprendi (play) · ic-visione (occhio: «visione completa») · ic-info («come funziona») · ic-attenzione (triangolo) · ic-fatto (spunta in un cerchio) · ic-chiudi (X) · ic-piu (+) · ic-freccia (›) · ic-puntini (tre puntini) · ic-cerca (lente) · ic-foto (macchina fotografica)
> Lavoro di ogni giorno: ic-lampo (Check del giorno) · ic-obiettivi (bersaglio) · ic-telefonate (cornetta con onde) · ic-riordini (freccia che torna, su una scatola) · ic-conferme (calendario con spunta) · ic-vendite (carrello) · ic-consegna (pacco) · ic-propone (lampadina: «l'app propone») · ic-prossimo (dito o freccia: «prossimo passo») · ic-orario (orologio) · ic-catalogare (schedario: «da catalogare»)
> Persone e squadra: ic-persona (profilo) · ic-squadra (tre persone) · ic-avvio (razzo: l'avvio del partner) · ic-perche (stella: «perché ho iniziato») · ic-compleanno (torta) · ic-benvenuto (mano che saluta) · ic-complimenti (coriandoli o coppa)
> Segni vitali e numeri: ic-segnivitali (battito) · ic-crescita (linea che sale) · ic-biglietto (biglietto BBS / WES) · ic-volume (pila o moneta: VP)
> Telefono e app: ic-app (telefono: «usa l'app») · ic-installa (telefono con freccia in giù) · ic-avvisi (campana) · ic-avvisi-spenti (campana barrata) · ic-password (chiave) · ic-novita (scintille) · ic-invito (busta) · ic-file (foglio: file Amway) · ic-rubrica (rubrica del telefono) · ic-messaggio (fumetto) · ic-whatsapp (fumetto con cornetta, generico, senza marchio) · ic-email (busta aperta)
> Materiali: ic-audio (cuffie) · ic-libro · ic-admin (cursori: pagina Admin; Code ne ha messa una provvisoria)
> 
> Mettile nella tavola «Icone» sotto le prime 29, con lo stesso formato (nome sotto ogni icona, prova a 24 e a 16 px). I pallini colorati (🟠 🟢 🔴 🔵 🟣) non servono come icone: li fa Code con un cerchietto.

## Come si porta nell'app (lo fa solo Code)
Nella tela gli stili sono scritti dentro ogni elemento e le variabili sono solo un testo da copiare: nell'app diventano **variabili vere e classi**, in un posto solo. I pezzi propri dello strumento Design (`support.js`, `<x-dc>`, `{{accento}}`) non entrano nell'app. Nessun carattere da scaricare. Ordine dei lavori in `CANTIERI.md` → 34.
