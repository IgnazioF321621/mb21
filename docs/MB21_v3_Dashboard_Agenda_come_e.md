# MB21 v3.0 (Glide) — le tab Dashboard e Agenda come sono oggi

> Rilevato il 14/09/2026 da Claude Code, in sola lettura, nell'app pubblicata
> (`if-team-21-6x21.glide.page`), con l'utente di Ignazio (Admin), **Partner Select = Ignazio**.
> Browser di Claude Desktop (pannello accanto alla sessione), navigato da Ignazio, screenshot di Claude.
>
> **Stato: Dashboard chiusa il 14/09. Agenda rilevata il 14/09 (sera, due riprese automatiche, tema scuro).** Le sezioni raggiunte dai bottoni della Dashboard (Check, Report, scheda contatto) vanno rilevate in sessioni a parte (decisione di Ignazio: una cosa per volta).
>
> **Nessun dato è stato modificato.** Moduli aperti e chiusi con «Annulla» o con la freccia «‹»;
> mai toccati «Invia», «Salva», «Elimina», «Completato», «Pianifica nuova data».
>
> **Niente dati personali in questo file** (il repo è pubblico): nomi sostituiti da segnaposto.
> Gli **screenshot** hanno dati veri e stanno **fuori dal repo**, in
> `/Users/ignaziofiorito/mb21-import/screenshot-dashboard-agenda/` (Dashboard) e `/Users/ignaziofiorito/mb21-import/screenshot-agenda/` (Agenda).

---

## 1. Come ci si arriva

È la **prima tab** del menu (Dashboard · Agenda · Lista Nomi · Report · Check · Mappa, poi Libri · LOS · Register DEV · BSM). Si apre all'avvio dell'app.

⚠️ Dal Chrome del computer, con la finestra nascosta, la Dashboard si carica a metà (numeri vuoti, Segni Vitali «Nessun dato disponibile»): serve la finestra visibile e il Partner Select impostato.

---

## 2. Schermata Dashboard, dall'alto in basso
📷 `1-dashboard-alto.png` · `2-dashboard-azioni.png` · `3-dashboard-fondo.png` · `4-segni-vitali-fondo.png`

1. **Partner Select** (solo Admin), fascia scura in alto: foto + nome, X per svuotare, freccia per scegliere.
2. **Riquadro stato e check** — due banner, che cambiano con la situazione del partner ([§2.1](#21-i-banner-in-cima)):
   - banner **abbonamento**: verde «✅ Abbonamento attivo · Buon lavoro!» oppure rosso «Abbonamento scaduto»;
   - banner rosso «🎯 Imposta gli obiettivi del mese!» (solo quando mancano);
   - riquadro azzurro «⚡ Compila il Check del Giorno!» con «Ultimo check: **13/09/2026** · Tocca per aprire» e freccia «›» → [§5](#5-check-del-giorno).
3. **Riquadro indicatori** con 4 schede ([§3](#3-le-4-schede-degli-indicatori)): 🔵 Volume · 🟠 Azione · 🟢 Segni Vitali · 🟣 Crescita.
4. Bottone con occhio **«Clicca qui per una visione completa!»** → porta alla sezione **Check** (da rilevare in un giro a parte).
5. **«⚡ Azioni da completare»** ([§4](#4-azioni-da-completare)).
6. **Segni Vitali** (riquadro scuro, [§6](#6-riquadro-segni-vitali)).
7. **«Mostra di più!»** (con occhio, in fondo a destra) → porta alla sezione **Report** (da rilevare in un giro a parte; per Ignazio apre «uno scenario futuro» importante).

### 2.1 I banner in cima
📷 `1-dashboard-alto.png` (tutto a posto) · `12-banner-scaduto-obiettivi.png` (abbonamento scaduto + obiettivi da impostare)

| Situazione | Banner abbonamento | Banner sotto |
|---|---|---|
| **Tutto a posto** (Ignazio, 14/09) | verde, «✅ Abbonamento attivo · Buon lavoro!» | azzurro, fulmine, **«Compila il Check del Giorno!»** · «Ultimo check: <data> · Tocca per aprire» › |
| **Abbonamento scaduto + obiettivi mancanti** (altri partner, 14/09) | rosa con bordo rosso, pallino rosso, **«Abbonamento scaduto»** · «Accesso limitato alle funzionalità», bottone rosso pieno **«Rinnova subito →»** | rosa con barra rossa a sinistra, bersaglio 🎯, **«Imposta gli obiettivi del mese!»** · «Clicca su questo banner»; **sotto resta** «Compila il Check del Giorno!» |

- Il banner **obiettivi** compare **dal giorno 1 del mese** finché gli obiettivi non sono impostati (in Check); **non sostituisce** «Compila il Check del Giorno!», che resta sotto (`ripresa-grezza/002.png`; nel n. 12 la parte bassa è fuori inquadratura).
- Con obiettivi **a zero** i riquadri indicatori mostrano «**oltre obiettivo**» (es. `VPP 102,12 • 102,12 oltre obiettivo • 6,01/giorno`); in un caso si sono visti **vuoti** (solo puntini e «/giorno»).
- **«Imposta gli obiettivi del mese!»** → porta alla sezione **Check** (📷 `13-obiettivi-mese.png`). Stranezza: lì compare «🎉 Obiettivi impostati! Buon mese!» ma gli obiettivi sono tutti **Tgt: 0**; il selettore lì si chiama «**User Select**».
- **«Rinnova subito →»** → apre la **scheda profilo** «Dashboard / <utente>»: foto, ruolo (Admin), Email, PartnerID, Abbonamento MB21, Data scadenza MB21 (📷 `14-rinnova-profilo.png`). Mostra il profilo di **chi usa l'app**, non del partner scelto. **Da confermare** con Ignazio che venga da «Rinnova subito».

---

## 3. Le 4 schede degli indicatori
📷 `1-dashboard-alto.png` (Volume) · `5-scheda-azione.png` · `6-scheda-segni-vitali.png` · `7-scheda-crescita.png`

Un riquadro per indicatore: **titolo**, **numero grande** (somma dei Check del mese), poi un elenco puntato: **percentuale** dell'obiettivo raggiunta · **quanto manca «per obiettivo»** · **quanto serve «/giorno»**. Colore del testo come la scheda.

| Scheda | Riquadri | Esempio (Ignazio, 14/09) | Righe sotto il numero |
|---|---|---|---|
| 🔵 **Volume** | **VPP** · **VP Clienti** · **VPG** | 0,00 · 0,00 · 325,83 | % · per obiettivo · /giorno |
| 🟠 **Azione** | **Contatti** · **Piani Marketing** · **Nuovi Iscritti** | 9 · 1 · 0 | % · per obiettivo · /giorno |
| 🟢 **Segni Vitali** | **BBS** · **WES** · **CEP** | 5 · 10 · 6 | % · per obiettivo (**niente /giorno**) |
| 🟣 **Crescita** | **Tracce audio** · **Pagine libro** | 35 · 193 | % · per obiettivo · /giorno |

- Esempio completo di un riquadro: `VPG 325,83 • 13,6% • 2074,17 per obiettivo • 122,01/giorno`.
- «/giorno» è **quanto serve al giorno** per arrivare all'obiettivo (confermato da Ignazio il 14/09).
- **Da dove vengono i numeri** (confermato da Ignazio il 14/09): i Check del Giorno si **sommano** nella tabella Check e si **confrontano con gli obiettivi** del mese.
- **Obiettivi**: si impostano **a inizio mese in Check**. Dal **giorno 1** del mese in Dashboard compare il banner **«Imposta gli obiettivi del mese!»**, che resta finché non sono compilati ([§2.1](#21-i-banner-in-cima)).
- Le schede cambiano solo i riquadri; il resto della pagina resta uguale.

---

## 4. Azioni da completare
📷 `2-dashboard-azioni.png`

- Titolo **«⚡ AZIONI DA COMPLETARE»**, **5 righe**, ognuna con freccia «›».
- Riga: `<Nome> - <Tipo azione> • <Area> | <Fase> • <Brand> • ⏳ Da completare`, sotto **data e ora** (`20/03/2026, 18:20`).
  - Esempi di forma: `<Nome> - Telefonata • Attività | Mai contattato o 2+ anni • ⏳ Da completare`, `<Nome> - Contattare • Prodotti | Mai Contattato • eSpring • ⏳ Da completare`, `<Nome> - PM Casa • Attività | ⏳ Da completare`.
- Ci sono **date passate** (marzo 2026) e **future** (luglio 2026): sono le azioni non segnate come Completato, non quelle di oggi.
- L'ordine **cambia col Partner Select**: con il pannello vuoto (Chrome) comparivano altre 5 azioni, anche di anni prima (2024).
- Non si vede un «vedi tutte»: il «Mostra di più!» in fondo alla pagina porta al Report.

### 4.1 Azione aperta
📷 `8-azione-aperta.png` · `9-azione-aperta-fondo.png`

Toccando una riga si apre **«‹ Dashboard / Azione»**, **già modificabile** (non è una scheda di sola lettura):

| Parte | Contenuto |
|---|---|
| in alto a destra | bottoni **NotePlan** (blu scuro) e **Google Calendar** |
| dati | **Nome** · **Partner Amway** (Ignazio) |
| bottone | **«Apri Contatto!»** → scheda del contatto (Lista) |
| categoria | **Categoria:** etichetta colorata (Prospect, arancio) |
| avviso | «⚠️ I passi successivi sono in funzione della categoria — fai sempre attenzione ad inserire la categoria corretta!» |
| **Area** * | due bottoni con icona: **Attività** · **Prodotti** |
| **Scegli il tipo di Azione** * | menu (es. Contatto), X per svuotare |
| **Tipo di contatto** * | **Telefonata** · **Messaggio** · **Presenza** |
| **Data** * | data e ora con calendario, X |
| **Durata** | **5 min** · **30 min** · **1 ora** · **1h 30** · **2 ore** |
| riquadro | «💡 Il suggerimento N21 è nella scheda contatto» |
| **Coach Script** | interruttore, «Hai il consiglio del coach di YesApp?» |
| **Note** | testo, «Scrivi qualcosa da ricordare», max 100 |
| **Completato** | interruttore |
| bottone | **«Pianifica nuova data»** |
| in fondo | **Salva** · **Elimina** |

\* = «Obbligatorio».

Si esce con «‹» in alto. **Da discutere con Ignazio** (vedi §8).

---

## 5. Check del Giorno
📷 `10-check-giorno.png` · `11-check-giorno-fondo.png`

Dal riquadro «Compila il Check del Giorno!» si apre un **pannello da destra**, titolo **«Aggiungi articolo»** (titolo generico di Glide), X per chiudere. Compito che il Partner **dovrebbe fare ogni sera** per registrare cosa ha fatto; i dati finiscono nella tabella **Check** (vista nel CSV).

| # | Campo | Suggerimento | Obbligatorio |
|---|---|---|---|
| 1 | 📅 **Data Check** | «Data del giorno di cui fare il check» | sì |
| 2 | 📞 **Contatti** | «Nr. contatti effettuati nella giornata» | sì |
| 3 | **PM** | «Nr. PM effettuati nella giornata» | sì |
| 4 | **Sponsor Personali** | «Nr. iscritti personali nella giornata» | sì |
| 5 | **Sponsor Gruppo** | «Nr. iscritti di gruppo nella giornata» | sì |
| 6 | 🛒 **VP Clienti** | «VP da vendite effettuate nella giornata» | sì |
| 7 | **CEP** | «Nr. iscritti al CEP nella giornata» | sì |
| 8 | **BBS** | «Nr. ticket BBS nel gruppo nella giornata» | sì |
| 9 | 🌍 **WES** | «Nr. ticket WES nel gruppo nella giornata» | sì |
| 10 | 🎧 **Tracce** | «Nr. tracce audio ascoltate nella giornata» | sì |
| 11 | 📖 **Pagine** | «Nr. pagine lette nella giornata» | sì |
| 12 | **Libro** | scelta da elenco, «—» | no |
| 13 | **Note del libro** | testo, max 150 | no |

In fondo **Invia** (spento finché mancano i campi obbligatori) e **Annulla**.

- **Il Check è la fonte degli indicatori della Dashboard** ([§3](#3-le-4-schede-degli-indicatori)): i check si sommano e si confrontano con gli obiettivi del mese (confermato da Ignazio il 14/09).
- «Ultimo check: 13/09/2026» sul riquadro mostra l'ultima data compilata.

---

## 6. Riquadro Segni Vitali
📷 `2-dashboard-azioni.png` · `3-dashboard-fondo.png` · `4-segni-vitali-fondo.png`

- Riquadro **scuro**, incorporato da una pagina esterna: `ignaziof321621.github.io/mb21-segni-vitali/` (repo da non toccare). Ha una **barra di scorrimento sua**.
- Titolo **«📊 Segni Vitali»**, «Ultimi 12 mesi», «👤 <nome del partner>».
- Legenda: ⚪ Contatti · 🟧 PM · 🟦 BBS · 🟥 WES · 🟩 CEP.
- **Tabella**: una riga per mese (**OTT 25 → SET 26**, 12 righe), una colonna per indicatore; ogni cella è un **quadrato colorato con il numero**. Più il numero è alto, più il colore è acceso; 0 = cella spenta.
- In fondo, **riga dei totali**: `CONTATTI 161 · ~13.4/mese` · `PM 49 · ~4.1/mese` · `BBS 8 · record GEN 26` · `WES 10 · record SET 26` · `CEP 7 · record LUG 26` (per BBS/WES/CEP il numero è il **record** e il mese in cui è stato fatto, non la somma).
- Senza Partner Select (Chrome) mostrava «Nessun dato disponibile».

---

## 7. Agenda
📷 in `mb21-import/screenshot-agenda/` (nomi dei file nei paragrafi; tutte le foto delle due riprese in `ripresa-grezza/` e `ripresa-grezza-2/`)

Seconda tab del menu. Rilevata con **Ignazio Admin**: vede gli appuntamenti di **tutti i partner** (quelli degli altri hanno il nome del partner tra parentesi quadre, i suoi no); **gli altri partner vedono solo i propri** (confermato da Ignazio). In cima non si vede il Partner Select.

### 7.1 Schermata, dall'alto in basso
📷 `1-agenda-vuota.png` · `3-contatti-del-giorno.png` · `5-lista-agenda.png`

1. **Riquadro saluto** con diamante: «<Nome>, Ecco i tuoi prossimi appuntamenti e/o azioni per far crescere la tua attività».
2. **«Contatti del giorno»** (parte alta, in azzurro) — sottotitolo «Seleziona la data per vedere i contatti programmati»:
   - campo **data** con calendario (📷 `2-scegli-data.png`: mese, frecce, griglia L-D, Annulla / OK) e X per svuotare; si apre su **oggi**;
   - sotto, le **azioni di tipo Contatto** di quel giorno, **card a 3 colonne**: icona «Attività», riga blu maiuscola `<PARTNER> ✅ COMPLETATO • 18:29` oppure `<PARTNER> ⏳ DA COMPLETARE • 18:34`, **nome del contatto**, «Telefonata • Attività», esito / nota (es. «Mai contattato o 2+ anni • Telefonata di riallaccio contatto»). Nessuna card se il giorno è vuoto.
3. Bottone **«Appuntamento»** → [§7.4](#74-aggiungi-appuntamento).
4. **Riquadro arancio del calendario** (parte bassa) = **gli appuntamenti presi**:
   - **Cerca** · titolo **«Settembre 2026»** · **Oggi** · menu vista **Mese / Settimana / Giorno / Agenda** (📷 `4-menu-viste.png`) · frecce **‹ ›**;
   - vista **Agenda** (predefinita): a sinistra il giorno («11 set, ven»), a destra una riga per appuntamento: `<Contatto> - <Modalità> • <Area> | <Fase> • ✅ Completato [<Partner>]` oppure `⏳ Da completare`, sotto l'orario («09:45 - 10:45»). Esempi di forma: `PM 1a1 • Attività | No Show`, `Prodotti | Promo/Sconto • eSpring`, `Counseling • Attività | c/Downline`, `Lista/Contatti • Attività | Telefonate`;
   - vista **Mese** (📷 `14-vista-mese.png`): griglia lun-dom, etichette blu con il nome accorciato («Carolina C…»), oggi evidenziato;
   - vista **Settimana** (📷 `15-vista-settimana.png`): «Settembre 2026 W36», colonne «31 lun … 06 dom», ore 12 AM → 11 PM (formato americano), blocchi con nome e modalità;
   - vista **Giorno** (📷 `16-vista-giorno.png`): «1 Settembre 2026 martedì», colonna unica di ore;
   - con periodo vuoto: «No events available for this period» (testo inglese di Glide).

### 7.2 Distinzione alto / basso
Spiegata da Ignazio: **in alto le azioni di tipo Contatto** (le telefonate del giorno), **in basso gli appuntamenti presi**. Fatta così in Glide perché sembrava più interessante; **si può cambiare** se c'è una proposta più intuitiva.

### 7.3 Appuntamento aperto
📷 `12-appuntamento-aperto.png` · `13-appuntamento-aperto-fondo.png`

Toccando una riga del calendario si apre un **pannello da destra «Azione»**, **già modificabile**: è lo **stesso modulo** dell'azione aperta dalla Dashboard ([§4.1](#41-azione-aperta)). Esempio visto (categoria Partner, tipo Appuntamento):
- NotePlan · Google Calendar · Nome · Partner Amway · «Apri Contatto!» · Categoria (Partner, viola) + avviso
- Area* · **Scegli il tipo di Azione*** = menu (qui «Appuntamento»)
- **Tipo di Appuntamento***: **Avvio · Counseling · Lista/Contatti · Meeting/Evento · Ordine**
- Data* · Durata (5 min · 30 min · 1 ora · 1h 30 · 2 ore)
- riquadro **Fase/Esito attuale*** (es. «c/Downline») con «💡 Il suggerimento N21 è nella scheda contatto»
- Coach Script · Note (100) · Completato · «Pianifica nuova data» · Salva · Elimina

### 7.4 Aggiungi Appuntamento
📷 `6-appuntamento-vuoto.png` · `7-scegli-contatto.png` · `18-categorie.png` · `8-appuntamento-contatto.png` · `9-appuntamento-pm.png` · `10-fase-pm.png` · `11-suggerimenti-pm.png` · `17-pm-fondo.png` · `19-follow-up.png` · `20-consulenza-prd.png`

Pannello da destra **«Aggiungi Appuntamento»**, X, in fondo **Invia** (spento finché mancano gli obbligatori) e **Annulla**. **I campi compaiono uno dopo l'altro** mano a mano che si sceglie:

| # | Campo | Scelte |
|---|---|---|
| 1 | **Scegli Contatto** | elenco con **Cerca**, in ordine alfabetico, tutti i nomi |
| 2 | **Scegli Categoria*** | Prospect · Partner · Cliente · Ex Partner/Cliente · Referral · Unlinked · Archiviato (con icona); sotto l'avviso «I passi successivi sono in funzione della categoria…» |
| 3 | **Area*** | Attività · Prodotti |
| 4 | **Scegli il tipo di azione*** | con Prospect: **Contatto · Piano Marketing · Follow Up · Consulenza PRD** (con Partner nell'azione aperta compare anche «Appuntamento»: i tipi probabilmente **cambiano con la categoria**, da verificare) |

Poi, **secondo il tipo**:

| Tipo | Campi successivi |
|---|---|
| **Contatto** | **Tipo di contatto***: Telefonata · Messaggio · Presenza → **Data*** (calendario + ore e minuti) → **Fase/Esito attuale*** → Note (100) → Completato |
| **Piano Marketing** | **Tipo di PM***: PM 1a1 · PM Upline · PM Casa/Pull · PM Open → **Data*** → **Fase/Esito attuale***: Presentazione · No BuonFine · Rimandato · No Show · Prodotti · Dare Seguito · Iscrizione (con icona) → **Suggerimenti (cliccaci)*** (scelta tra «—» e i testi N21 della fase, es. 🟢 «Connettiti con il candidato attraverso domande sulle sue motivazioni…» 🔵 … 🔴 … «p. 15, 16, 25 Manuale N21») → **Durata del PM** (menu, predefinito «1 ora») → **Ospite** (testo, max 50) → Note (100) → Completato |
| **Follow Up** | **Tipo di follow up***: Personale · Upline · Meeting/Evento → **Data*** → **Fase/Esito attuale*** → Note (100) → Completato |
| **Consulenza PRD** | **Data*** → Note (100) → Completato (niente tipo né fase) |

- La data scelta nel calendario ha **ore e minuti** a rotella.
- Qui i **suggerimenti N21 sono una scelta obbligatoria** del modulo, non solo testo da leggere.

### 7.5 Categoria → tipo di azione → fasi/esiti
Confermato da Ignazio (14/09): **ogni categoria ha le sue azioni, i suoi tipi e i suoi esiti**. Ricostruito dall'export, senza editor di Glide: `Scelte.csv` (quali tipi per categoria e i sottotipi) + `Sequenze` (le fasi per categoria e tipo, già nel DB v4).

**Tipi di azione per categoria** (`Scelte.csv`: `TipoAzione` + `CategTipoAzione`):

| Categoria | Tipi di azione |
|---|---|
| **Prospect** | Contatto · Piano Marketing · Follow Up · Consulenza PRD |
| **Partner** | Contatto · Piano Marketing · Follow Up · **Appuntamento** |
| **Cliente** | Contatto · Consulenza PRD |
| Ex Partner/Cliente · Referral · Unlinked · Archiviato | nessun tipo in `Scelte.csv` |

**Sottotipi** (il secondo gruppo di bottoni del modulo):

| Tipo | Sottotipi (`Scelte.csv`) |
|---|---|
| Contatto | Telefonata · Messaggio · Presenza (`TipoCT`) |
| Piano Marketing | PM 1a1 · PM Upline · PM Casa/Pull · PM Open (`TipoPM`) |
| Follow Up | Personale · Upline · Meeting/Evento (`TipoFUp`) |
| Appuntamento | Avvio · Counseling · Lista/Contatti · Meeting/Evento · Ordine (`TipoAPT`) |
| Consulenza PRD | Assistenza · Demo · Promo/Sconto · Riordino (`TipoPRD`) |

**Fasi/esiti per categoria e tipo** (`Sequenze` di Glide):

| Categoria · Tipo | Fasi/esiti |
|---|---|
| Prospect · Contatto | Mai contattato o 2+ anni · PM Fissato · No Risposta · Telefono OFF · No Interesse · Richiamare · Relazione · Consult Prodotti |
| Prospect · Piano Marketing | Presentazione · Iscrizione · No BuonFine · Rimandato · No Show · Dare Seguito · Prodotti |
| Prospect · Follow Up | DS Fissato · Iscrizione · No BuonFine · Rimandato · No Show · Prodotti |
| Prospect · Consulenza PRD | **nessuna** (nel modulo infatti non compare la fase: 📷 `20-consulenza-prd.png`) |
| Partner · Piano Marketing | come Prospect |
| Partner · Follow Up | come Prospect |
| Partner · Appuntamento | c/Downline · c/Upline · Inaugurazione · Incontro N21 · Lista nomi · ListaStart · Motivazione · OrdineStart · RolePlay · Telefonate · VP Personali |
| Partner · Contatto | **nessuna in Glide** (in v4 aggiunte in Fase 1: Appuntamento · Richiamare) |
| Cliente · Contatto | **nessuna in Glide** (in v4 aggiunte in Fase 1: Appuntamento · Richiamare) |
| Cliente · Consulenza PRD | Assistenza · Demo · Promo/Sconto · Riordino |

`Scelte.csv` ha anche elenchi di esiti per tipo, non legati alla categoria: `EsitoCT` (PM Fissato · No Risposta · Telefono OFF · No Interesse · Richiamare · Consult Prodotti), `EsitoPM`, `EsitoFUp`, `EsitoAPT` (Fatto · Rimandato · No Show), `EsitoPRD` (Vendita · No Vendita).

**Risposte di Ignazio (14/09):**
- **Dentro Appuntamento le fasi cambiano col sottotipo** (Avvio, Counseling…).
- Quale elenco usi esattamente «Fase/Esito attuale» in Glide Ignazio non lo ricorda: **le scelte per categoria · tipo · sottotipo si predisporranno quando si costruisce l'Agenda v4** (proposta di Claude, conferma di Ignazio).

**Fasi usate davvero per sottotipo di Appuntamento** (storico `azioni` importato, 56 azioni; è un indizio, non la regola di Glide — ci sono anche valori vecchi come «Iscr+Ordine», «Team Meeting»):

| Sottotipo | Fasi trovate |
|---|---|
| Avvio | Lista nomi · ListaStart · Motivazione · OrdineStart · RolePlay · Telefonate · Prodotti · Iscr+Ordine |
| Counseling | c/Downline · c/Upline · Motivazione |
| Lista/Contatti | Lista nomi · Motivazione · Telefonate |
| Meeting/Evento | Incontro N21 |
| Ordine | OrdineStart · VP Personali · Cliente · Iscr+Ordine |

(«Inaugurazione» è in Sequenze ma non compare nello storico.)

---

## 8. Osservazioni per la v4

Solo osservazioni, nessuna decisione presa salvo dove indicato:

**Agenda**
- A1. **Alto/basso** (Contatti del giorno / appuntamenti presi): Ignazio è aperto a una proposta più intuitiva e coinvolgente.
- A2. Admin vede gli appuntamenti di tutti con «[Partner]»; i partner solo i propri: stesso schema delle regole di accesso v4.
- A3. Il modulo «Aggiungi Appuntamento» e l'«Azione» aperta sono **lo stesso modulo** di Glide, con campi che dipendono da categoria e tipo (mappa completa in [§7.5](#75-categoria--tipo-di-azione--fasiesiti)): in v4 i bottoni esito della coda coprono solo la parte Contatto.
- A4. Testi inglesi del calendario («No events available for this period», ore AM/PM): in v4 in italiano, ore 24h.
- A5. Suggerimenti N21 **da scegliere** nel modulo PM: in v4 sono sospesi (decisione Fase 2).

**Dashboard**

1. **«Azioni da completare» → OGGI** (indicazione di Ignazio, 14/09): nella v4 questo elenco viene **sostituito da OGGI**, cioè da cosa c'è da fare oggi. In Glide l'elenco era ragionato in un altro modo (azioni non completate, anche vecchie di mesi o future); OGGI è più intuitivo. Collegato al cantiere «OGGI dovrà contenere anche le altre azioni… e quindi un'agenda».
2. **Azione aperta**: si apre già in modifica, con Completato, Pianifica nuova data, NotePlan e Google Calendar. **Da discutere** con Ignazio cosa tenere.
3. **Check del Giorno**: compito serale del Partner, 11 numeri obbligatori + libro. Da portare nella v4 (tabella Check già vista nel CSV); probabilmente alimenta indicatori e Segni Vitali.
4. **4 schede indicatori** (Volume, Azione, Segni Vitali, Crescita): somma dei Check del mese confrontata con gli **obiettivi mensili** (impostati in Check a inizio mese, con banner in Dashboard finché mancano); percentuale, quanto manca e quanto serve al giorno.
5. **Segni Vitali**: oggi è una pagina esterna incorporata; nella v4 può diventare parte dell'app.
6. **Collegamenti ad altre sezioni** da rilevare in giri a parte: «Clicca qui per una visione completa!» → **Check**; «Mostra di più!» → **Report**.
7. **Obiettivi del mese da semplificare** (indicazione di Ignazio, 14/09): in Glide l'inserimento è articolato e complicato per un partner non ancora avviato; nella v4 va reso semplice. In più oggi si possono avere «obiettivi impostati» tutti a zero.
8. **Banner di stato**: abbonamento (attivo/scaduto con «Rinnova subito») e obiettivi del mese da impostare: da prevedere nella v4 (l'abbonamento riguarda la parte a pagamento).
9. Il pannello del Check si chiama «Aggiungi articolo» (nome di serie di Glide): nella v4 un titolo chiaro.

---

## Screenshot

In `/Users/ignaziofiorito/mb21-import/screenshot-dashboard-agenda/` (fuori dal repo, dati veri):

| File | Cosa |
|---|---|
| `1-dashboard-alto.png` | Partner Select, stato, Check del Giorno, scheda Volume |
| `2-dashboard-azioni.png` | Azioni da completare, inizio Segni Vitali |
| `3-dashboard-fondo.png` | Segni Vitali (OTT 25 – MAG 26), «Mostra di più!» |
| `4-segni-vitali-fondo.png` | Segni Vitali fino a SET 26 e riga dei totali |
| `5-scheda-azione.png` | scheda Azione |
| `6-scheda-segni-vitali.png` | scheda Segni Vitali |
| `7-scheda-crescita.png` | scheda Crescita |
| `8-azione-aperta.png` | azione aperta, parte alta |
| `9-azione-aperta-fondo.png` | azione aperta, parte bassa |
| `10-check-giorno.png` | Check del Giorno, parte alta |
| `11-check-giorno-fondo.png` | Check del Giorno, parte bassa |
| `12-banner-scaduto-obiettivi.png` | banner «Abbonamento scaduto» e «Imposta gli obiettivi del mese!» (altro partner) |
| `13-obiettivi-mese.png` | sezione Check aperta dal banner obiettivi |
| `14-rinnova-profilo.png` | scheda profilo aperta (da «Rinnova subito», da confermare) |
| `ripresa-grezza/001…018.png` | ripresa automatica: Check (parte alta), Dashboard di altri partner, inizio del Report — materiale per le sessioni Check e Report |

Da fare in sessioni a parte: **sezione Check** (intera), **sezione Report** (intera), **«Apri Contatto!»**.

Agenda: 20 screenshot scelti in `mb21-import/screenshot-agenda/` (numerati 1-20, nomi nei paragrafi di §7) + `ripresa-grezza/` (24) e `ripresa-grezza-2/` (31).
