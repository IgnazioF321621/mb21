// MB21 · le regole del QUANDO degli avvisi (cantiere 43 lavoro 3, 23/09): funzioni pure, senza database,
// così si provano con node (`node tools/banco/prova_avvisi.js`) prima di pubblicare la funzione `avvisi`.

// Le scelte di ognuno (utenti.avvisi_quando): solo quelle cambiate, il resto vale «già impostato».
// STESSE chiavi e valori di `AVVISI_QUANDO` in avvisi.js e di `imposta_avviso` (migrazione 20260923143237_avvisi_quando.sql):
// se cambia uno, cambiano tutti.
// 03/10 (Ignazio): i promemoria «Prima di…» (appuntamenti, telefonate, cose, modelli) sono usciti dall'app, li fa il calendario di ognuno:
// restano le scelte di «Com'è andata?», del Buongiorno e della sera. (Nel database `imposta_avviso` conosce ancora le chiavi vecchie: non servono, non fanno danno.)
export const GIA_IMPOSTATO: Record<string, number> = {
  com_e_andata: 60,   // minuti dopo la fine
  buongiorno: 9, check: 22,   // ora di Roma
};
export function scelta(quando: Record<string, number> | null | undefined, k: string): number {
  const v = (quando ?? {})[k];
  return typeof v === 'number' ? v : GIA_IMPOSTATO[k];
}

// ── Il giorno e l'ora di Roma ──
export const giornoDi = (iso: string | number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
export const oraDi = (iso: string | number) => Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', hour: '2-digit', hour12: false }).format(new Date(iso)).slice(0, 2)) % 24;
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

// ── Buongiorno e sera: due avvisi «di base uguali» (Ignazio 03/10) ──
// Gli appuntamenti e i promemoria li fa il calendario di ognuno; l'app avvisa solo dell'attività nel suo insieme.
// Tre voci di consiglio, le stesse la mattina e la sera: 🏋️ Training · 🎯 obiettivi del mese · 🚩 cosa manca per il prossimo traguardo.
// Ognuna una volta sola al giorno: se la mattina è già arrivata, la sera non la ripete (`dette`, che l'avviso del mattino segna in avvisi_mandati).
export type Consigli = {
  training: 'fatto' | 'mai' | 'da_fare'; daRipassare: number; obiettivi: AvvisoObiettivi | null;
  traguardo?: string;   // la frase di rigaTraguardo(): cosa manca per il prossimo traguardo (vuota = niente)
};
export type VoceConsiglio = 'training' | 'obiettivi' | 'traguardo';
export type RigheConsigli = Record<VoceConsiglio, string>;
// Ogni riga comincia con il SUO segno, sempre lo stesso (Ignazio 02/10, tranne il titolo): 📝 il riepilogo di oggi e il Check · 📅 gli appuntamenti ·
// 📞 telefonate e riordini · 🚩 il prossimo traguardo · 🏋️ il Training · 🎯 gli obiettivi. Un avviso del telefono è testo semplice: ogni cosa va a capo.
const riga = (segno: string, testo: string) => (testo ? `${segno} ${testo}` : '');
const blocchi = (...b: string[]) => b.filter(Boolean).join('\n');
export function righeConsigli(c: Consigli, dette: Partial<Record<VoceConsiglio, boolean>> = {}): RigheConsigli {
  const training = c.training === 'fatto' ? '' : c.training === 'mai' ? 'Se ti va, 5 minuti per provare il Training.'
    : c.daRipassare > 0 ? `Se ti va, 5 minuti di Training: oggi ${quanti(c.daRipassare, 'carta', 'carte')} da ripassare.` : 'Se ti va, restano 5 minuti di Training.';
  return {
    training: dette.training ? '' : riga('🏋️', training),
    obiettivi: dette.obiettivi ? '' : riga('🎯', c.obiettivi?.riga ?? ''),
    traguardo: dette.traguardo ? '' : riga('🚩', c.traguardo ?? ''),
  };
}
export type MessaggioSera = { titolo: string; testo: string; url: string; tag: string };

// ☀️ IL BUONGIORNO: parte sempre che ci sia qualcosa da dire. Se ci sono appuntamenti, solo quelli; se no, telefonate e riordini; poi le tre voci.
export type DatiMattino = Consigli & {
  nome?: string; appuntamenti: number; conferme: number; telefonate: number; riordini: number;
  inPausa: boolean;   // «0 contatti al giorno»: niente telefonate da contare
  dette?: Partial<Record<VoceConsiglio, boolean>>;
};
export function messaggioMattino(d: DatiMattino): MessaggioSera | null {
  const dopoOggi = ". Tocca per aprire l'Agenda.";
  let primaRiga = '';
  if (d.appuntamenti) primaRiga = riga('📅', `Oggi ${quanti(d.appuntamenti, 'appuntamento', 'appuntamenti')}${d.conferme ? ` (${d.conferme} da confermare)` : ''}${dopoOggi}`);
  else {
    const pezzi = [!d.inPausa && d.telefonate > 0 ? quanti(d.telefonate, 'telefonata', 'telefonate') : '', d.riordini ? `${quanti(d.riordini, 'riordino', 'riordini')} da sentire` : ''].filter(Boolean);
    if (pezzi.length) primaRiga = riga('📞', `Oggi ${pezzi.join(' e ')}${dopoOggi}`);
  }
  const r = righeConsigli(d, d.dette);
  const testo = blocchi(primaRiga, r.traguardo, r.training, r.obiettivi);
  if (!testo) return null;
  const nome = (d.nome ?? '').trim();   // nome proprio nel titolo (Ignazio 18/09); senza nome resta «Buongiorno!»
  return { titolo: nome ? `☀️ Buongiorno, ${nome}!` : '☀️ Buongiorno!', testo, url: primaRiga ? './?apri=agenda' : r.training ? './?apri=training' : './', tag: 'mattino' };
}

// 🌙 L'AVVISO DELLA SERA, uno solo e «omnicomprensivo» (Ignazio 02/10: la sera è quello che conta di più: il Check)
// Dentro: i complimenti per la giornata (compreso il Training fatto), il Check da chiudere, «Domani hai…» e le tre voci non ancora dette la mattina.
//  · Check non fatto → apre il Check · Check fatto e domani c'è qualcosa → apre l'Agenda di domani
//  · Check fatto, domani niente, ma c'è il Training da consigliare o gli obiettivi → un avviso corto; se non c'è niente di tutto questo si tace
export type DatiSera = Consigli & {
  bravo: string | null; checkFatto: boolean; domani: { titolo: string; ora: string; primo: string } | null; ilGiornoDopo: string;
  dette?: Partial<Record<VoceConsiglio, boolean>>;
};
export function messaggioSera(d: DatiSera): MessaggioSera | null {
  const r = righeConsigli(d, d.dette);
  // il traguardo non fa partire un avviso da solo; Training e obiettivi sì
  const consigli = [r.training, r.obiettivi];
  const domaniRiga = d.domani ? `Domani: ${d.domani.titolo}, si comincia alle ${d.domani.ora} (${d.domani.primo}).` : '';
  // il titolo è sempre lo stesso, anche con la giornata a zero: è comunque un riepilogo (Ignazio 02/10); senza segno nel titolo
  if (!d.checkFatto) return {
    titolo: 'Il riepilogo del «tuo giorno» è quasi pronto',
    testo: blocchi(riga('📝', d.bravo ? `Oggi ${d.bravo}. Bastano due minuti per chiuderlo: tocca per aprire «Il mio giorno».` : 'Due minuti per chiudere la giornata: tocca per aprire «Il mio giorno».'), riga('📅', domaniRiga), r.traguardo, ...consigli),
    url: './?apri=check', tag: 'check_sera',
  };
  if (d.domani) return {
    titolo: `📅 Domani hai ${d.domani.titolo}`,
    testo: blocchi(riga('📝', d.bravo ? `Oggi ${d.bravo}, bel lavoro.` : ''), riga('📅', `Si comincia alle ${d.domani.ora}: ${d.domani.primo}. Tocca per vedere la giornata.`), r.traguardo, ...consigli),
    url: `./?apri=agenda&giorno=${d.ilGiornoDopo}`, tag: 'domani',
  };
  if (!r.training && !r.obiettivi) return null;   // Check fatto, domani niente, niente da consigliare: si tace (il traguardo da solo non fa partire un avviso)
  return {
    titolo: r.training ? '🏋️ 5 minuti di Training?' : d.bravo ? '👏 Bel lavoro oggi!' : '🎯 Gli obiettivi del mese',
    testo: blocchi(riga('📝', d.bravo ? `Oggi ${d.bravo}, bel lavoro.` : ''), r.traguardo, ...consigli),
    url: r.training ? (d.daRipassare > 0 ? './?apri=training&vista=ripassa' : './?apri=training') : './', tag: 'sera',
  };
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
