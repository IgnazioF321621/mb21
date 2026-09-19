# MB21 · Lo stile dell'app (fonte unica)

*Cantiere 34. Lo stile lo decide Design (tela `https://claude.ai/artifact/DrR3qpbTytcsJNTL9Mje4E`, «MB21 · stile e schermate»); questo documento lo scrive e lo tiene allineato Code. Copia delle tavole lette il 19/09/2026: `tools/design/da_design/` (dati finti). Brief di partenza: `docs/MB21_v4_Brief_Design.md`.*

## La direzione scelta (Ignazio, 19/09/2026)
**C «Il colore che parla» con il respiro della A «Carta e inchiostro».** Fondo perla, card bianche molto tonde, carattere di sistema dell'iPhone, **un solo accento: l'inchiostro**. I colori che hanno un significato diventano la grafica: le righe e le card delle persone sono **tinte del colore della loro categoria**, così si capisce chi è chi prima di leggere. Dalla A viene il passo: **26 px fra le sezioni**, poche cose a schermo, più aria dentro le card. Scartate: A da sola e B «Blocchi» (resta nella tela come idea «da cantiere»).

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
  --cat-cliente:#1D4ED8;     --cat-cliente-tinta:#E7EFFE;
  --cat-partner:#6D28D9;     --cat-partner-tinta:#F0E9FD;
  --cat-ex:#5A6475;          --cat-ex-tinta:#EAECF1;
  --cat-unlinked:#7B8496;    --cat-unlinked-tinta:#F2F4F7;
  --cat-archiviato:#374151;  --cat-archiviato-tinta:#E4E7EC;

  /* segni vitali e stati */
  --bbs:#1D4ED8; --wes:#C02626; --cep:#15803D; --spento:#C3C8D1;
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
- **Card del contatto**: tutte alte **96 px**, raggio 20, fondo = tinta della categoria, pastiglia tonda 46 con le iniziali nel colore pieno, nome e riga sotto, targhette BBS · WES · CEP, tre puntini a destra.
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

## Come si porta nell'app (lo fa solo Code)
Nella tela gli stili sono scritti dentro ogni elemento e le variabili sono solo un testo da copiare: nell'app diventano **variabili vere e classi**, in un posto solo. I pezzi propri dello strumento Design (`support.js`, `<x-dc>`, `{{accento}}`) non entrano nell'app. Nessun carattere da scaricare. Ordine dei lavori in `CANTIERI.md` → 34.
