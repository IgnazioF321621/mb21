# MB21 v4.0 — Scelte dell'Agenda (bozza da confermare)

> Fase 4 · lavoro 1 · 14/09/2026. **Bozza**: Ignazio conferma, toglie, aggiunge. Nulla va nel database prima del suo ok.
> Fonti: `Scelte.csv` (tipi per categoria, sottotipi), `Sequenze` di Glide (fasi per categoria e tipo), storico `azioni` (fasi per sottotipo di Appuntamento). Dettaglio nel rilievo §7.5.
>
> Colonna **Prossima data**: proposta di Claude per la decisione C (dopo l'esito l'app chiede la nuova data). ✅ = chiede · — = non chiede.
> **Ospite**: Piano Marketing e Follow Up (decisione 8).

## Prospect
| Tipo | Sottotipi | Fasi / esiti | Prossima data |
|---|---|---|---|
| Contatto | Telefonata · Messaggio · Presenza | Mai contattato o 2+ anni · PM Fissato · No Risposta · Telefono OFF · No Interesse · Richiamare · Relazione · Consult Prodotti | come la coda di OGGI (bottoni esito già in uso) |
| Piano Marketing | PM 1a1 · PM Upline · PM Casa/Pull · PM Open | Presentazione ✅ · Dare Seguito ✅ · Rimandato ✅ · No Show ✅ · Iscrizione — · No BuonFine — · Prodotti — | vedi fasi |
| Follow Up | Personale · Upline · Meeting/Evento | DS Fissato ✅ · Rimandato ✅ · No Show ✅ · Iscrizione — · No BuonFine — · Prodotti — | vedi fasi |
| Consulenza PRD | Assistenza · Demo · Promo/Sconto · Riordino | ❓ in Glide **nessuna fase**. Proposta: **Vendita · No Vendita** (da `Scelte.csv`) | — |

## Partner
| Tipo | Sottotipi | Fasi / esiti | Prossima data |
|---|---|---|---|
| Contatto | Telefonata · Messaggio · Presenza | ❓ in Glide **nessuna fase**; in v4 dalla Fase 1: Appuntamento ✅ · Richiamare ✅ | ✅ |
| Piano Marketing | come Prospect | come Prospect | come Prospect |
| Follow Up | come Prospect | come Prospect | come Prospect |
| **Appuntamento** | **Avvio** | Lista nomi · ListaStart · Motivazione · OrdineStart · RolePlay · Telefonate · ❓ Inaugurazione (in Sequenze, mai usata) · ❓ Prodotti · ❓ Iscr+Ordine (vecchie) | — |
| | **Counseling** | c/Downline · c/Upline · Motivazione | — |
| | **Lista/Contatti** | Lista nomi · Motivazione · Telefonate | — |
| | **Meeting/Evento** | Incontro N21 | — |
| | **Ordine** | OrdineStart · VP Personali · ❓ Cliente · ❓ Iscr+Ordine (vecchie) | — |

❓ Alternativa per Appuntamento: gli esiti generici di `Scelte.csv` **Fatto · Rimandato · No Show** (+ il sottotipo dice cosa si è fatto).

## Cliente
| Tipo | Sottotipi | Fasi / esiti | Prossima data |
|---|---|---|---|
| Contatto | Telefonata · Messaggio · Presenza | ❓ in Glide **nessuna fase**; in v4 dalla Fase 1: Appuntamento ✅ · Richiamare ✅ | ✅ |
| Consulenza PRD | Assistenza · Demo · Promo/Sconto · Riordino | ❓ in Glide le fasi **sono i sottotipi** (Assistenza · Demo · Promo/Sconto · Riordino). Proposta: fasi **Vendita · No Vendita** | Riordino: ✅ ❓ |

## Ex Partner/Cliente · Referral · Unlinked · Archiviato
Nessun tipo di azione in `Scelte.csv`. ❓ Proposta: **nessun appuntamento** per queste categorie (per Referral: si cambia prima la categoria). Nello storico ci sono però PM con Ex/Unlinked/Archiviato.

## Punti da decidere (❓)
1. Consulenza PRD: fasi **Vendita · No Vendita** per Prospect e Cliente?
2. Contatto di Partner e Cliente: tenere **Appuntamento · Richiamare**?
3. Appuntamento: fasi **per sottotipo** (tabella) o **Fatto · Rimandato · No Show**? Tenere/togliere Inaugurazione, Prodotti, Iscr+Ordine, Cliente?
4. Colonna **Prossima data**: le ✅ vanno bene?
5. Ex/Referral/Unlinked/Archiviato: niente appuntamenti?
