// MB21 · le regole del QUANDO degli avvisi (cantiere 43 lavoro 3, 23/09): funzioni pure, senza database,
// così si provano con node (`node tools/banco/prova_avvisi.js`) prima di pubblicare la funzione `avvisi`.

// Le scelte di ognuno (utenti.avvisi_quando): solo quelle cambiate, il resto vale «già impostato».
// STESSE chiavi e valori di `AVVISI_QUANDO` in avvisi.js e di `imposta_avviso` (migrazione 20260923143237_avvisi_quando.sql):
// se cambia uno, cambiano tutti.
export const GIA_IMPOSTATO: Record<string, number> = {
  appuntamenti: 30, telefonate: 10, cose: 10, modelli: 0,   // minuti prima (0 = all'ora)
  com_e_andata: 60,                                          // minuti dopo la fine
  buongiorno: 9, check: 22, training: 13,                    // ora di Roma
};
export function scelta(quando: Record<string, number> | null | undefined, k: string): number {
  const v = (quando ?? {})[k];
  return typeof v === 'number' ? v : GIA_IMPOSTATO[k];
}

const MINUTO = 60000;
export const RITARDO_ALL_ORA = 5;   // «all'ora»: se l'orologio salta un giro, l'avviso parte lo stesso nei 5 minuti dopo
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
