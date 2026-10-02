// MB21 · le regole del QUANDO degli avvisi (cantiere 43 lavoro 3, 23/09): funzioni pure, senza database,
// così si provano con node (`node tools/banco/prova_avvisi.js`) prima di pubblicare la funzione `avvisi`.

// Le scelte di ognuno (utenti.avvisi_quando): solo quelle cambiate, il resto vale «già impostato».
// STESSE chiavi e valori di `AVVISI_QUANDO` in avvisi.js e di `imposta_avviso` (migrazione 20260923143237_avvisi_quando.sql):
// se cambia uno, cambiano tutti.
export const GIA_IMPOSTATO: Record<string, number> = {
  appuntamenti: 30, telefonate: 15, cose: 15, modelli: 15,  // minuti prima (dal 02/10 si sceglie 15 · 30 · 60: tolti «all'ora», 5 e 10)
  com_e_andata: 60,                                          // minuti dopo la fine
  buongiorno: 9, check: 22,                                  // ora di Roma (il Training dal 02/10 non ha più l'avviso a parte: sta nella sera)
};
export function scelta(quando: Record<string, number> | null | undefined, k: string): number {
  const v = (quando ?? {})[k];
  return typeof v === 'number' ? v : GIA_IMPOSTATO[k];
}

const MINUTO = 60000;
export const RITARDO_ALL_ORA = 5;   // «all'ora» (0, non più nelle scelte dal 02/10; resta per eventuali scelte vecchie): se l'orologio salta un giro, l'avviso parte lo stesso nei 5 minuti dopo
// È il momento dell'avviso «prima»? Da `anticipo` minuti prima dell'inizio fino all'inizio (con «all'ora» fino a 5 minuti dopo).
// Non una finestra stretta: se l'orologio salta un giro, o la cosa è stata messa in agenda da poco, l'avviso parte lo stesso.
// Un avviso solo per cosa lo garantisce il segno «già avvisato» (promemoria_il, avvisi_mandati), non la finestra.
export function eMomentoPrima(inizio: number, anticipo: number, adesso: number): boolean {
  return adesso >= inizio - anticipo * MINUTO && adesso < inizio + (anticipo === 0 ? RITARDO_ALL_ORA * MINUTO : 0);
}
// «⏰ Tra 10 minuti» · «⏰ Tra 1 ora» · «⏰ Adesso»
export function titoloPrima(inizio: number, adesso: number): string {
  const minuti = Math.round((inizio - adesso) / MINUTO);
  if (minuti <= 0) return '⏰ Adesso';
  if (minuti === 60) return '⏰ Tra 1 ora';
  return `⏰ Tra ${minuti} ${minuti === 1 ? 'minuto' : 'minuti'}`;
}

// ── Il giorno e l'ora di Roma ──
export const giornoDi = (iso: string | number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
export const oraDi = (iso: string | number) => Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', hour: '2-digit', hour12: false }).format(new Date(iso)).slice(0, 2)) % 24;
function partiRoma(iso: string) {
  const p = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome', dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  return { giorno: p.slice(0, 10), ora: p.slice(11, 16) };
}
// «2026-09-23» + «06:00» di Roma → istante (ms). STESSA regola di `MB21Agenda.isoDaRoma` in agenda.js
export function istanteRoma(giorno: string, ora: string): number {
  const guess = new Date(`${giorno}T${ora.slice(0, 5)}:00Z`);
  const { giorno: g, ora: o } = partiRoma(guess.toISOString());
  return guess.getTime() - (Date.parse(`${g}T${o}:00Z`) - guess.getTime());
}
const giornoSettimana = (giorno: string) => (new Date(giorno + 'T12:00:00Z').getUTCDay() + 6) % 7 + 1;   // 1 = lunedì … 7 = domenica

// ── Le cose da fare con l'ora e le voci dei modelli di un giorno ──
// STESSA REGOLA della Timeline di MB Plan (`coseConOra` in pagina-agenda.js, con `MB21Agenda.vociDelGiorno` in agenda.js):
// qui l'app non arriva, va tenuta uguale a mano. Solo le NON fatte.
//  - cosa da fare: di quel giorno, con l'ora, scritta a mano (non riga di un modello né del Core), scala «giorno»
//  - voce di un modello: modello acceso e di scala «giorno», voce accesa, non Core, che compare quel giorno della settimana;
//    l'ora è quella della riga del giorno se la voce è stata spostata «solo oggi», altrimenti quella del modello
export type Cosa = { id: string; user_id: string; testo: string; giorno: string; ora: string | null; fatto_il: string | null; modello_id: string | null; core: string | null; scala: string | null };
export type Voce = { id: string; user_id: string; testo: string; giorni: number[] | null; attivo: boolean | null; core: string | null; modello_id: string | null; ora: string | null };
export type Modello = { id: string; attivo: boolean | null; scala: string | null };
export type ConOra = { tipo: 'cose' | 'modelli'; id: string; user_id: string; testo: string; giorno: string; ora: string; inizio: number };

export function coseConOra(cose: Cosa[], voci: Voce[], modelli: Modello[], giorno: string): ConOra[] {
  const fuori: ConOra[] = [];
  for (const c of cose) {
    if (c.giorno !== giorno || !c.ora || c.modello_id || c.core || (c.scala || 'giorno') !== 'giorno' || c.fatto_il) continue;
    const ora = c.ora.slice(0, 5);
    fuori.push({ tipo: 'cose', id: c.id, user_id: c.user_id, testo: c.testo, giorno, ora, inizio: istanteRoma(giorno, ora) });
  }
  const accesi = new Set(modelli.filter(m => m.attivo !== false && (m.scala || 'giorno') === 'giorno').map(m => m.id));
  const dow = giornoSettimana(giorno);
  for (const v of voci) {
    if (v.core || v.attivo === false || !v.modello_id || !accesi.has(v.modello_id)) continue;
    if (v.giorni && v.giorni.length && !v.giorni.includes(dow)) continue;
    const delGiorno = cose.find(c => c.modello_id === v.id && c.giorno === giorno);
    if (delGiorno && delGiorno.fatto_il) continue;
    const ora = (delGiorno && delGiorno.ora) || v.ora;
    if (!ora) continue;
    fuori.push({ tipo: 'modelli', id: v.id, user_id: v.user_id, testo: v.testo, giorno, ora: ora.slice(0, 5), inizio: istanteRoma(giorno, ora.slice(0, 5)) });
  }
  return fuori;
}
// Il segno «già avvisato» di una cosa o voce (tabella avvisi_mandati): con il giorno e l'ora, così una cosa spostata a un'altra ora avvisa di nuovo
export const chiaveAvviso = (x: ConOra) => `${x.tipo === 'cose' ? 'cosa' : 'voce'}:${x.id}:${x.giorno}:${x.ora}`;

// ── «Domani hai…» nel Check della sera (24/09, Ignazio: dalla lista «Avvisi» di MB App) ──
// Gli impegni di domani di una persona: appuntamenti (anche PM/Appuntamento dalla coda) e telefonate in agenda, mai Riordini.
// → { titolo: «2 appuntamenti e 1 telefonata», ora: «09:30», primo: «PM · Pino Manolo» }; niente = null.
export type Impegno = { inizio: number; testo: string; telefonata: boolean };
const quanti = (n: number, uno: string, tanti: string) => `${n} ${n === 1 ? uno : tanti}`;
export const oraMinuti = (t: number) => new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' }).format(new Date(t));
export function riepilogoDomani(impegni: Impegno[]): { titolo: string; ora: string; primo: string } | null {
  if (!impegni.length) return null;
  const app = impegni.filter(x => !x.telefonata).length, tel = impegni.length - app;
  const pezzi = [app ? quanti(app, 'appuntamento', 'appuntamenti') : '', tel ? quanti(tel, 'telefonata', 'telefonate') : ''].filter(Boolean);
  const primo = [...impegni].sort((x, y) => x.inizio - y.inizio)[0];
  return { titolo: pezzi.join(' e '), ora: oraMinuti(primo.inizio), primo: primo.testo };
}

// ── I complimenti della sera (lista «Avvisi» di MB App, 30/09): la giornata già scritta nell'app, detta a parole ──
// «3 contatti, 1 appuntamento fissato e 1 vendita»; niente di fatto = null (nessun complimento inventato).
// Testi neutri (né maschile né femminile): il coach parla con gli stessi toni della chat, senza «io».
export type ContiGiorno = { contatti: number; fissati: number; pm: number; vendite: number; training?: boolean };
export function complimentiDelGiorno(c: ContiGiorno): string | null {
  const pezzi = [
    c.contatti ? quanti(c.contatti, 'contatto', 'contatti') : '',
    c.fissati ? quanti(c.fissati, 'appuntamento fissato', 'appuntamenti fissati') : '',
    c.pm ? `${c.pm} PM` : '',
    c.vendite ? quanti(c.vendite, 'vendita', 'vendite') : '',
    c.training ? '5 minuti di Training' : '',   // 02/10: il Training fatto oggi si festeggia nella sera
  ].filter(Boolean);
  if (!pezzi.length) return null;
  return pezzi.length === 1 ? pezzi[0] : `${pezzi.slice(0, -1).join(', ')} e ${pezzi[pezzi.length - 1]}`;
}

// ── Gli obiettivi del mese nell'avviso della sera (Ignazio 01/10: «il foglio degli obiettivi è nuovo e speciale») ──
// Un avviso a parte (tocco → Dashboard, dove ci sono il riquadro e la riga «Obiettivi di <mese>»), mandato insieme a quello del Check.
// NON insistente né opprimente (Ignazio 02/10):
//  - a chi gli obiettivi del mese non li ha ancora impostati: solo la sera del 1° e quella del 3° del mese, poi silenzio
//  - dall'1 al 3 ottobre 2026, a chi li aveva già scritti con il foglio vecchio: «puoi rifarli, riportando i dati», UNA volta sola
//    (segno `obiettivi-rifai:<mese>:<utente>` in avvisi_mandati, che si pulisce dopo 3 giorni: per questo la finestra è di 3 giorni)
//  - a chi ha toccato «Non questo mese» (tabella obiettivi_salto): niente, per tutto il mese
// STESSA regola di `haObiettivi` in dashboard.js: almeno uno dei 12 obiettivi maggiore di zero.
export const CAMPI_OBIETTIVI = ['vpp', 'vpv', 'vpg', 'contatti', 'pm', 'sponsor_personali', 'sponsor_gruppo', 'bbs', 'wes', 'cep', 'tracce', 'pagine'];
export const haObiettivi = (o: Record<string, unknown> | null | undefined) => !!o && CAMPI_OBIETTIVI.some(k => Number(o[k]) > 0);
const NOMI_MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
export const FOGLIO_NUOVO = { dal: '2026-10-01', al: '2026-10-03' };
export const GIORNI_INVITO_OBIETTIVI = [1, 3];   // le sere in cui parte l'invito automatico
export type AvvisoObiettivi = { titolo: string; testo: string; rifai: boolean; riga: string };   // `riga` = la frase che entra nell'avviso della sera (02/10: un avviso solo)
// L'invito (anche quello mandato a mano dall'Admin: stesso testo)
export function invitoObiettivi(giorno: string): AvvisoObiettivi {
  const mese = NOMI_MESI[Number(giorno.slice(5, 7)) - 1];
  return { titolo: `🎯 Gli obiettivi di ${mese}`, testo: `È iniziato ${mese}: nel foglio nuovo si scelgono i traguardi del mese, con il consiglio e le linee. Tocca per aprirlo.`, rifai: false, riga: `Gli obiettivi di ${mese} ti aspettano nel foglio nuovo.` };
}
export function avvisoObiettivi(giorno: string, obiettivi: Record<string, unknown> | null | undefined, saltato = false): AvvisoObiettivi | null {
  if (saltato) return null;
  const giornoDelMese = Number(giorno.slice(8, 10)), mese = NOMI_MESI[Number(giorno.slice(5, 7)) - 1];
  if (!haObiettivi(obiettivi)) return GIORNI_INVITO_OBIETTIVI.includes(giornoDelMese) ? invitoObiettivi(giorno) : null;
  if (giorno >= FOGLIO_NUOVO.dal && giorno <= FOGLIO_NUOVO.al) return { titolo: `🎯 Gli obiettivi di ${mese}, nel foglio nuovo`, testo: 'Il foglio degli obiettivi è nuovo: chi li aveva già scritti può rifarli, riportando i dati. Tocca per aprirlo.', rifai: true, riga: `Gli obiettivi di ${mese} sono nel foglio nuovo: chi li aveva già scritti può rifarli, riportando i dati.` };
  return null;
}

// ── L'avviso della sera, uno solo e «omnicomprensivo» (Ignazio 02/10: «gli avvisi sono veramente tanti»; la sera è quello che conta di più: il Check) ──
// Dentro: i complimenti per la giornata (compreso il Training fatto), il Check da chiudere, «Domani hai…», il Training se oggi non è stato fatto
// (un consiglio) e, il 1° e il 3° del mese, gli obiettivi. Niente avvisi a parte per Training e obiettivi.
//  · Check non fatto → apre il Check · Check fatto e domani c'è qualcosa → apre l'Agenda di domani
//  · Check fatto, domani niente, ma c'è il Training da consigliare o gli obiettivi → un avviso corto; se non c'è niente di tutto questo si tace
export type DatiSera = {
  bravo: string | null; checkFatto: boolean; domani: { titolo: string; ora: string; primo: string } | null; ilGiornoDopo: string;
  training: 'fatto' | 'mai' | 'da_fare'; daRipassare: number; obiettivi: AvvisoObiettivi | null;
  traguardo?: string;   // la frase di rigaTraguardo(): cosa manca per il prossimo traguardo (vuota = niente)
};
export type MessaggioSera = { titolo: string; testo: string; url: string; tag: string };
export function messaggioSera(d: DatiSera): MessaggioSera | null {
  const trainingRiga = d.training === 'fatto' ? '' : d.training === 'mai' ? 'Se ti va, 5 minuti per provare il Training.'
    : d.daRipassare > 0 ? `Se ti va, 5 minuti di Training: oggi ${quanti(d.daRipassare, 'carta', 'carte')} da ripassare.` : 'Se ti va, restano 5 minuti di Training.';
  // `coda` = le righe in fondo; il traguardo si aggiunge a un avviso che c'è già, non ne fa partire uno da solo (i consigli sì: Training e obiettivi)
  const consigli = [trainingRiga, d.obiettivi?.riga ?? ''].filter(Boolean).join(' ');
  const coda = [d.traguardo ?? '', consigli].filter(Boolean).join(' ');
  const fine = coda ? ` ${coda}` : '';
  const domaniRiga = d.domani ? ` Domani: ${d.domani.titolo}, si comincia alle ${d.domani.ora} (${d.domani.primo}).` : '';
  if (!d.checkFatto) return {
    titolo: d.bravo ? '⚡ Il riepilogo del «tuo giorno» è quasi pronto' : '⚡ Hai scritto il riepilogo del «tuo giorno»?',
    testo: (d.bravo ? `Oggi ${d.bravo}. Bastano due minuti per chiuderlo: tocca per aprire «Il mio giorno».` : 'Due minuti per chiudere la giornata: tocca per aprire «Il mio giorno».') + domaniRiga + fine,
    url: './?apri=check', tag: 'check_sera',
  };
  if (d.domani) return {
    titolo: `📅 Domani hai ${d.domani.titolo}`,
    testo: `${d.bravo ? `Oggi ${d.bravo}, bel lavoro. ` : ''}Si comincia alle ${d.domani.ora}: ${d.domani.primo}.${fine} Tocca per vedere la giornata.`,
    url: `./?apri=agenda&giorno=${d.ilGiornoDopo}`, tag: 'domani',
  };
  if (!consigli) return null;   // Check fatto, domani niente, niente da consigliare: si tace (il traguardo da solo non fa partire un avviso)
  return {
    titolo: trainingRiga ? '🏋️ 5 minuti di Training?' : d.bravo ? '👏 Bel lavoro oggi!' : '🎯 Gli obiettivi del mese',
    testo: `${d.bravo ? `Oggi ${d.bravo}, bel lavoro. ` : ''}${coda}`,
    url: trainingRiga ? (d.daRipassare > 0 ? './?apri=training&vista=ripassa' : './?apri=training') : './', tag: 'sera',
  };
}

// ── Avvisi vicini in uno solo (Ignazio 02/10: «gli avvisi sono veramente tanti») ──
// PROMEMORIA: quando di una persona scatta un promemoria (`due`), nello stesso avviso entrano anche gli impegni che cominciano entro 30 minuti dopo
// il suo (appuntamenti, telefonate, cose da fare, modelli: di qualunque tipo), anche se il loro momento non è ancora arrivato: arrivano un po' prima,
// ma in un avviso solo, e non se ne riparla. Gli impegni PRIMA di quello che scatta restano per conto loro (hanno la loro scelta di minuti).
export const FINESTRA_VICINI = 30 * MINUTO;
export function raggruppaVicini<T extends { utente: string; inizio: number; due: boolean }>(voci: T[], finestra = FINESTRA_VICINI): T[][] {
  const perUtente = new Map<string, T[]>();
  for (const v of voci) perUtente.set(v.utente, [...(perUtente.get(v.utente) ?? []), v]);
  const gruppi: T[][] = [];
  for (const sue of perUtente.values()) {
    const ordinate = [...sue].sort((a, b) => a.inizio - b.inizio);
    const presi = new Set<T>();
    for (const ancora of ordinate) {
      if (!ancora.due || presi.has(ancora)) continue;
      const gruppo = ordinate.filter(v => !presi.has(v) && v.inizio >= ancora.inizio && v.inizio <= ancora.inizio + finestra);
      gruppo.forEach(v => presi.add(v));
      gruppi.push(gruppo);
    }
  }
  return gruppi;
}
// «COM'È ANDATA?»: tutti quelli che scattano nello stesso giro per la stessa persona fanno un avviso solo (qui non si guarda avanti: non si chiede
// com'è andata a un appuntamento che non è ancora finito). L'ordine resta quello di arrivo.
export function raggruppaPerUtente<T extends { utente: string }>(voci: T[]): T[][] {
  const per = new Map<string, T[]>();
  for (const v of voci) per.set(v.utente, [...(per.get(v.utente) ?? []), v]);
  return [...per.values()];
}
// «alle 10:00 PM · Pino · 10:20 Telefonata · Anna · … e altre 2»: i primi tre, poi quanti altri
export function elencoImpegni(righe: { inizio: number; riga: string }[]): string {
  return righe.slice(0, 3).map(v => `${oraMinuti(v.inizio)} ${v.riga}`).join(' · ') + (righe.length > 3 ? ` e altre ${righe.length - 3}` : '');
}

// ── Cosa manca per il prossimo traguardo (Ignazio 02/10) ──
// L'app salva in `utenti.prossimo_traguardo` { nome, mancano[], mese, aggiornato_il } (check.js → prossimoTraguardo, le sue stesse regole);
// qui si legge. Vale solo se è del mese in corso e aggiornato da non più di 4 giorni: chi non apre l'app non riceve una cosa vecchia.
export type Traguardo = { nome?: string; mancano?: string[]; mese?: string; aggiornato_il?: string } | null | undefined;
export const GIORNI_TRAGUARDO_VALIDO = 4;
export function rigaTraguardo(t: Traguardo, oggi: string, adesso: number): string {
  if (!t || !t.nome || !Array.isArray(t.mancano) || !t.mancano.length) return '';
  if (t.mese !== `${oggi.slice(0, 8)}01`) return '';
  if (!(adesso - Date.parse(t.aggiornato_il ?? '') <= GIORNI_TRAGUARDO_VALIDO * 86400000)) return '';   // vuota o data illeggibile: niente
  const con = t.nome.startsWith('Executive') ? "l'" : 'il ';
  return `Verso ${con}${t.nome}: ${t.mancano.join(' · ')}.`;
}
