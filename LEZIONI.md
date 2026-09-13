# Lezioni apprese — MB21 v4.0

## L1 — Nei file del repo pubblico non si scrivono dati di persone
*13 settembre 2026.* Due email (una di una persona esterna) sono finite in `CANTIERI.md` e nello script di import, e da lì nella cronologia pubblica di GitHub. Toglierle dai file è un commit; toglierle dalla cronologia richiede una riscrittura con push forzato, che non si annulla e va autorizzata.
**Regola:** nei documenti e negli script si descrive il criterio («email che non sono in User»), mai il dato. Prima di ogni commit: `git grep` di email e numeri di telefono fuori da `docs/`.

## L2 — Il primo accesso crea l'account: chiudere la registrazione lo impedisce
*13 settembre 2026.* Con la registrazione pubblica chiusa, il codice via email arriva solo a chi ha già un account. Ma gli utenti di MB21 esistono in `utenti`, non ancora tra gli account. La porta si chiude invece con un controllo sul database alla creazione dell'account (`mb21_controlla_account`): passa solo chi è in `utenti` con `accesso_attivo`.

## L3 — Una priorità giusta sulla carta può affamare un gruppo sui dati veri
*13 settembre 2026.* Nella coda, «mai contattati» viene prima di «rientrati». Sui dati di Ignazio i mai contattati sono 1.150: finché ce n'è uno, i 196 rientrati non entrano mai nei 5. Le prove con dati finti non lo mostrano. **Regola:** ogni regola di ordinamento si prova anche sui numeri reali prima di darla per chiusa.
