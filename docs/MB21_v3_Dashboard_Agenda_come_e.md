# MB21 v3.0 (Glide) — le tab Dashboard e Agenda come sono oggi

> Rilevato il 14/09/2026 da Claude Code, in sola lettura, nell'app pubblicata
> (`if-team-21-6x21.glide.page`), con l'utente di Ignazio (Admin), **Partner Select = Ignazio**.
> Browser di Claude Desktop (pannello accanto alla sessione), navigato da Ignazio, screenshot di Claude.
>
> **Stato: Dashboard fatta. Agenda da fare** (fermata decisa da Ignazio, vedi [§8](#8-osservazioni-per-la-v4)).
>
> **Nessun dato è stato modificato.** Moduli aperti e chiusi con «Annulla» o con la freccia «‹»;
> mai toccati «Invia», «Salva», «Elimina», «Completato», «Pianifica nuova data».
>
> **Niente dati personali in questo file** (il repo è pubblico): nomi sostituiti da segnaposto.
> Gli **screenshot** hanno dati veri e stanno **fuori dal repo**, in
> `/Users/ignaziofiorito/mb21-import/screenshot-dashboard-agenda/`.

---

## 1. Come ci si arriva

È la **prima tab** del menu (Dashboard · Agenda · Lista Nomi · Report · Check · Mappa, poi Libri · LOS · Register DEV · BSM). Si apre all'avvio dell'app.

⚠️ Dal Chrome del computer, con la finestra nascosta, la Dashboard si carica a metà (numeri vuoti, Segni Vitali «Nessun dato disponibile»): serve la finestra visibile e il Partner Select impostato.

---

## 2. Schermata Dashboard, dall'alto in basso
📷 `1-dashboard-alto.png` · `2-dashboard-azioni.png` · `3-dashboard-fondo.png` · `4-segni-vitali-fondo.png`

1. **Partner Select** (solo Admin), fascia scura in alto: foto + nome, X per svuotare, freccia per scegliere.
2. **Riquadro stato e check** (dal giorno 1 del mese, finché non sono compilati, qui compare anche il **banner degli obiettivi**, [§3](#3-le-4-schede-degli-indicatori)):
   - banner verde **«✅ Abbonamento attivo · Buon lavoro!»**;
   - riquadro azzurro con fulmine **«Compila il Check del Giorno!»**, sotto «Ultimo check: **13/09/2026** · Tocca per aprire» (data sottolineata), freccia «›» → [§5](#5-check-del-giorno).
3. **Riquadro indicatori** con 4 schede ([§3](#3-le-4-schede-degli-indicatori)): 🔵 Volume · 🟠 Azione · 🟢 Segni Vitali · 🟣 Crescita.
4. Bottone con occhio **«Clicca qui per una visione completa!»** → porta alla sezione **Check** (da rilevare in un giro a parte).
5. **«⚡ Azioni da completare»** ([§4](#4-azioni-da-completare)).
6. **Segni Vitali** (riquadro scuro, [§6](#6-riquadro-segni-vitali)).
7. **«Mostra di più!»** (con occhio, in fondo a destra) → porta alla sezione **Report** (da rilevare in un giro a parte; per Ignazio apre «uno scenario futuro» importante).

---

## 3. Le 4 schede degli indicatori
📷 `1-dashboard-alto.png` (Volume) · `5-scheda-azione.png` · `6-scheda-segni-vitali.png` · `7-scheda-crescita.png`

Un riquadro per indicatore: **titolo**, **numero grande** (del periodo in corso, probabilmente il mese), poi un elenco puntato: **percentuale** raggiunta · **quanto manca «per obiettivo»** · **media «/giorno»**. Colore del testo come la scheda.

| Scheda | Riquadri | Esempio (Ignazio, 14/09) | Righe sotto il numero |
|---|---|---|---|
| 🔵 **Volume** | **VPP** · **VP Clienti** · **VPG** | 0,00 · 0,00 · 325,83 | % · per obiettivo · /giorno |
| 🟠 **Azione** | **Contatti** · **Piani Marketing** · **Nuovi Iscritti** | 9 · 1 · 0 | % · per obiettivo · /giorno |
| 🟢 **Segni Vitali** | **BBS** · **WES** · **CEP** | 5 · 10 · 6 | % · per obiettivo (**niente /giorno**) |
| 🟣 **Crescita** | **Tracce audio** · **Pagine libro** | 35 · 193 | % · per obiettivo · /giorno |

- Esempio completo di un riquadro: `VPG 325,83 • 13,6% • 2074,17 per obiettivo • 122,01/giorno`.
- «/giorno» è **quanto serve al giorno** per arrivare all'obiettivo (confermato da Ignazio il 14/09).
- **Da dove vengono i numeri** (confermato da Ignazio il 14/09): i Check del Giorno si **sommano** nella tabella Check e si **confrontano con gli obiettivi** del mese.
- **Obiettivi**: si impostano **a inizio mese in Check**. Dal **giorno 1** del mese in Dashboard compare un **banner** che resta finché gli obiettivi non sono compilati. Oggi (14/09, obiettivi già fatti) il banner non si vede: screenshot **da recuperare**.
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

**Da rilevare.** Fermata decisa da Ignazio il 14/09 prima di aprire l'Agenda.

---

## 8. Osservazioni per la v4

Solo osservazioni, nessuna decisione presa salvo dove indicato:

1. **«Azioni da completare» → OGGI** (indicazione di Ignazio, 14/09): nella v4 questo elenco viene **sostituito da OGGI**, cioè da cosa c'è da fare oggi. In Glide l'elenco era ragionato in un altro modo (azioni non completate, anche vecchie di mesi o future); OGGI è più intuitivo. Collegato al cantiere «OGGI dovrà contenere anche le altre azioni… e quindi un'agenda».
2. **Azione aperta**: si apre già in modifica, con Completato, Pianifica nuova data, NotePlan e Google Calendar. **Da discutere** con Ignazio cosa tenere.
3. **Check del Giorno**: compito serale del Partner, 11 numeri obbligatori + libro. Da portare nella v4 (tabella Check già vista nel CSV); probabilmente alimenta indicatori e Segni Vitali.
4. **4 schede indicatori** (Volume, Azione, Segni Vitali, Crescita): somma dei Check del mese confrontata con gli **obiettivi mensili** (impostati in Check a inizio mese, con banner in Dashboard finché mancano); percentuale, quanto manca e quanto serve al giorno.
5. **Segni Vitali**: oggi è una pagina esterna incorporata; nella v4 può diventare parte dell'app.
6. **Collegamenti ad altre sezioni** da rilevare in giri a parte: «Clicca qui per una visione completa!» → **Check**; «Mostra di più!» → **Report**.
7. Il pannello del Check si chiama «Aggiungi articolo» (nome di serie di Glide): nella v4 un titolo chiaro.

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

Non fatti: sezione Check (da «visione completa»), sezione Report (da «Mostra di più!»), Agenda.
