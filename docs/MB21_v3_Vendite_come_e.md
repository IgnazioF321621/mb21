# MB21 v3.0 (Glide) — la sezione Vendite della scheda contatto come è oggi

> Rilevato il 18/09/2026 da Claude Code, in sola lettura, nell'app pubblicata
> (`if-team-21-6x21.glide.page`) aperta in Arc, con l'utente di Ignazio (Admin).
> Navigato da Ignazio; Claude ha solo fotografato la finestra a ogni «foto» (5 schermate), senza clic.
>
> **Nessun dato cambiato.** Aperti «Vendita +», il menu «…» di una riga e «Modifica/Completa», chiusi senza salvare.
>
> **Niente dati personali in questo file** (il repo è pubblico). Questa volta le foto **non sono state salvate su disco**:
> quello che si leggeva è tutto scritto qui. I dati veri stanno fuori dal repo, in
> `/Users/ignaziofiorito/mb21-import/Vendite.csv`.

---

## 1. Come ci si arriva

- **Lista Nomi** → scheda di un contatto → barra delle sezioni: **Dati · Azioni · Coach Yes · Vendite**.
- La sezione **Vendite** c'è nei contatti con attività sui prodotti (al posto di Sharing; vedi rilievo Lista Nomi §5.2).

---

## 2. Testata della scheda (parte che riguarda le vendite)

- Sotto nome e telefono, riquadro **Brand** con 5 targhette: **Artistry · eSpring · Home · Nutrilite/XS · Persona**.
  Quella del brand comprato è **accesa** (nei due clienti visti: eSpring).
- ❓ Non rilevato: se la targhetta si accende da sola dalle vendite o se si sceglie a mano (in «Modifica» o toccandola).

---

## 3. Sezione Vendite, dall'alto in basso

1. **Tre riquadri colorati**, uno sotto l'altro, ognuno con un numero:
   - 🔵 **VP Totali** — somma dei VP delle vendite del contatto (es. 229,94)
   - 🟣 **Provvigione Totale** — in € (es. 101,98€)
   - 🟢 **Guadagno Netto** — in € (es. 41,98€)
2. Riquadro **«PROSSIMA AZIONE DI VENDITA»**: icona del brand, riga `Contatto • eSpring • Riordino • <data e ora>`, bottone **«Modifica/Completa»** (§6).
3. Bottone **«Vendita +»** (§4).
4. **Tabella** con ricerca («Cerca»): **Data · Area · Prodotto/i · VP · Provvigione**, dalla più recente; «Area» è il brand.
   A destra di ogni riga **«…»** → menu **Modifica** · **Elimina** (§5).

---

## 4. Modulo «Vendita» (da «Vendita +»)

Pannello a destra, titolo **Vendita**, X per chiudere. In alto avviso rosso:
**«Registra una riga per ogni brand — es. Nutrilite + Artistry = 2 vendite separate»**.

| Campo | Tipo | Obbligatorio | Colonna export |
|---|---|---|---|
| **Data di vendita** | data | sì | `DataVendita` |
| **Brand di vendita** | 5 targhette (Artistry · eSpring · Home · Nutrilite/XS · Persona), una sola | sì | `Brand_vnd` |
| **Prodotto/i** | testo libero, max 50 caratteri | sì | `Prodotto_vnd` |
| **VP di vendita** | numero con decimali | sì | `VPVendita_vnd` |
| **Sconto applicato** | € | no | `Sconto_vnd` |
| **Data di riordino** | data | sì | `DataRiordino` |

In fondo: **Invia** · **Annulla**.

---

## 5. Menu «…» di una riga

- **Modifica** — non aperto; ❓ da confermare con Ignazio che è lo stesso modulo del §4 già compilato.
- **Elimina** — non toccato.

---

## 6. «Modifica/Completa» della prossima azione di vendita

Apre il **normale modulo dell'azione** (lo stesso dell'Agenda), già compilato:

- Nome del contatto · Partner Amway · «Apri Contatto!» · Categoria (**Cliente**)
- **Area**: Attività · **Prodotti** (acceso)
- **Brand**: le 5 targhette, acceso quello della vendita
- **Tipo di azione**: **Contatto** · **Tipo di contatto**: **Telefonata** (· Messaggio · Presenza)
- **Data**: la data di riordino, con ora
- Durata · Coach Script · Note · Completato · «Pianifica nuova data» · Salva · Elimina

**Quindi la «prossima azione di vendita» è un'azione come le altre**: `Contatto • <brand> • Riordino` alla data di riordino.
❓ Non rilevato come nasce (da sola al salvataggio della vendita, o a mano).

---

## 7. I conti, verificati sull'export

`Vendite.csv`: **147 vendite**, **55 clienti**, **5 partner**, dal 21/03/2019 al 31/08/2026 (⚠️ le date sono scritte in due formati, `GG/MM/AAAA, HH:MM:SS` e `AAAA-MM-GG…`: da gestire nell'import).
Colonne: `UserEmail · ClienteID · Nominativo · DataVendita · Brand_vnd · Prodotto_vnd · VPVendita_vnd · Sconto_vnd · DataRiordino`.

- **Aggancio ai contatti**: `ClienteID` = `ContattoID` di `Lista Nomi.csv` → **147 su 147** agganciate.
- **Brand**: eSpring 65 · Nutrilite/XS 32 · Persona 18 · Nutrilite 15 · Home 12 · Artistry 5
  (⚠️ «Nutrilite» e «Nutrilite/XS» sono due scritture dello stesso brand: nel modulo c'è solo «Nutrilite/XS»).
- **Sconto** pieno in 13 vendite; **Data di riordino** piena in 81 (oggi è obbligatoria, in passato no).
- **Provvigione**: nell'export **non c'è**, la calcola Glide. Su tre casi visti è sempre **VP × 0,4435 circa**
  (53,00 → 23,51 · 176,94 → 78,48 · 88,47 → 39,24). ❓ Da dove viene la percentuale: da chiedere a Ignazio.
- **Guadagno Netto = Provvigione Totale − somma degli Sconti** (verificato al centesimo:
  101,98 − 60 = 41,98 · 39,24 − 39 = 0,24).

---

## 8. Legami con il resto dell'app (già presenti nella v4)

- **Agenda**: Consulenza PRD con esiti **Vendita · No Vendita**.
- **Report**: riquadro Consulenze con Prodotti · Vendita · No Vendita; «Vendita» è un esito positivo.
- **Check del Giorno / Dashboard**: **VP Clienti** (`vpv`), oggi scritto a mano ogni giorno.
  ❓ Se in futuro si calcola dalle vendite registrate: da decidere con Ignazio.
