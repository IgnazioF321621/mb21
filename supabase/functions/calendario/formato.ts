// MB21 · il FORMATO del calendario .ics (funzione «calendario»): le regole pure, senza rete e senza database, così si provano da Node
// (tools/banco/prova_calendario.js, node 23.6+ legge il TypeScript da solo) e la funzione online (index.ts) le importa e basta.
// Qui sta TUTTO il formato: gli appuntamenti e le telefonate (`evento`) e gli incontri di gruppo (`eventoSpazio`, nota 024).
export const FUSO_ROMA_ICS = ['BEGIN:VTIMEZONE', 'TZID:Europe/Rome',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE'];
export const testoIcs = (s: string) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
// le righe di un .ics non passano i 75 byte: il resto va a capo con uno spazio davanti
export function piegaIcs(riga: string) {
  const pezzi: string[] = []; let corrente = '', peso = 0;
  for (const ch of riga) {
    const b = new TextEncoder().encode(ch).length;
    if (peso + b > (pezzi.length ? 74 : 75)) { pezzi.push(corrente); corrente = ''; peso = 0; }
    corrente += ch; peso += b;
  }
  pezzi.push(corrente);
  return pezzi.join('\r\n ');
}
const FMT = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
export const aRoma = (iso: string | number) => FMT.format(new Date(iso)).replace(/[-:]/g, '').replace(' ', 'T');   // «20260918T183000»
export const compatto = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');

export type Azione = { id: string; contatto_id: string | null; tipo_azione: string; modalita: string | null; esito: string | null; inizio: string; fine: string | null;
  data_scelta: string | null; ospite: string | null; note: string | null; luogo?: string | null; contatti: unknown };

// il posto, dal vivo (nota 028, 05/10): LOCATION, così il Calendario mostra la mappa (vale per i propri appuntamenti, le serate e gli impegni ricevuti)
const rigaLuogo = (luogo: unknown) => { const l = String(luogo ?? '').replace(/\s+/g, ' ').trim(); return l ? [`LOCATION:${testoIcs(l)}`] : []; };

const nomeDi = (a: Azione) => (a.contatti as { nome?: string } | null)?.nome || '—';
// Nota Pagine 142 (Ignazio 29/10: «mi fa comparire cinque appuntamenti. Mi dovrebbe comparire solo un appuntamento generale»): un incontro con più persone
// è un evento solo. Stessa regola di MB21Agenda.incontri e della riga dell'Agenda (agenda.js, nota 109): stessa ora d'inizio, stesso tipo e sottotipo, solo
// gli appuntamenti (le telefonate e la coda restano una per riga); la stessa persona una volta sola (nota 120). Nel database restano le righe per persona.
export function incontriCalendario(azioni: Azione[]) {
  const fuori: Azione[][] = [], per = new Map<string, Azione[]>();
  for (const a of azioni) {
    if (!a.tipo_azione || a.tipo_azione === 'Contatto' || !a.inizio) { fuori.push([a]); continue; }
    const k = [Date.parse(a.inizio), a.tipo_azione, a.modalita || ''].join('|'), g = per.get(k);
    if (g) { if (!a.contatto_id || !g.some(x => x.contatto_id === a.contatto_id)) g.push(a); continue; }
    const n = [a]; per.set(k, n); fuori.push(n);
  }
  return fuori;
}
// I nomi come nella riga dell'Agenda (agenda.js `riga`, nota 109): «Persona A, Persona B», da quattro in su «Persona A, Persona B (+3)». Si cambiano insieme.
export const nomiIncontro = (persone: Azione[]) => persone.length > 3
  ? `${persone.slice(0, 2).map(nomeDi).join(', ')} (+${persone.length - 2})` : persone.map(nomeDi).join(', ');

// `persone`: tutte le righe dello stesso incontro (la prima è `a`); l'UID è quello dell'id più piccolo, così resta lo stesso a ogni rilettura
export function evento(a: Azione, adesso: Date, persone: Azione[] = [a]) {
  const dallaCoda = a.tipo_azione === 'Contatto' && !!a.data_scelta;
  const inizio = dallaCoda ? a.data_scelta! : a.inizio;
  const fine = !dallaCoda && a.fine ? a.fine : Date.parse(inizio) + 3600000;
  const piu = persone.length > 1;
  const nome = piu ? nomiIncontro(persone) : nomeDi(a);
  const cosa = dallaCoda ? (a.esito === 'PM Fissato' ? 'PM' : 'Appuntamento') : (a.modalita || a.tipo_azione || '');
  // con più persone: prima tutti i nomi, poi ospite e note di ognuno col suo nome davanti
  const dettagli = (piu
    ? [`Persone: ${persone.map(nomeDi).join(', ')}`, ...persone.flatMap(p => [p.ospite ? `${nomeDi(p)} · Ospite: ${p.ospite}` : '', p.note ? `${nomeDi(p)}: ${p.note}` : ''])]
    : [a.ospite ? `Ospite: ${a.ospite}` : '', a.note || '']).filter(Boolean).join('\n');
  const uid = persone.map(p => p.id).reduce((x, y) => (y < x ? y : x));
  return ['BEGIN:VEVENT', `UID:azione-${uid}@mb21`, `DTSTAMP:${compatto(adesso)}`,
    `DTSTART;TZID=Europe/Rome:${aRoma(inizio)}`, `DTEND;TZID=Europe/Rome:${aRoma(fine)}`,
    `SUMMARY:${testoIcs(`MB21 · ${cosa} · ${nome}`)}`,
    ...rigaLuogo(a.luogo),
    ...(dettagli ? [`DESCRIPTION:${testoIcs(dettagli)}`] : []),
    'END:VEVENT'];
}

// Gli incontri di gruppo (nota 024, Ignazio 04/10/2026): non sono azioni ma righe di `spazi` (tabella scritta da «Prepara la settimana»). Entrano solo Team, LdS (nel
// database `LOS`) e SdS/OPEN; gli spazi «da riempire» dei Piani e delle Consulenze no: col nome diventano un appuntamento vero e entrano da soli.
// Titolo «MB21 · Incontro LdS · Serata Rubino» (senza il nome della serata, «MB21 · Incontro LdS»); inizio e durata in minuti (di solito 60); niente note;
// UID fisso `spazio-<id>@mb21`, così uno spostamento aggiorna lo stesso evento nel Calendario.
export const TIPI_SPAZIO_NEL_CALENDARIO = ['Team', 'LOS', 'SdS/OPEN'];
const NOME_SPAZIO: Record<string, string> = { 'Team': 'Incontro di Team', 'LOS': 'Incontro LdS', 'SdS/OPEN': 'SdS/OPEN' };
export type Spazio = { id: string; tipo: string; inizio: string; durata: number | null; nome?: string | null; luogo?: string | null };
export function eventoSpazio(s: Spazio, adesso: Date) {
  const nomeTipo = NOME_SPAZIO[s.tipo] || s.tipo;
  const serata = (s.tipo === 'SdS/OPEN' ? '' : String(s.nome ?? '').replace(/\s+/g, ' ').trim());   // la SdS/OPEN è sempre la stessa: niente nome
  const minuti = s.durata && s.durata > 0 ? s.durata : 60;
  return ['BEGIN:VEVENT', `UID:spazio-${s.id}@mb21`, `DTSTAMP:${compatto(adesso)}`,
    `DTSTART;TZID=Europe/Rome:${aRoma(s.inizio)}`, `DTEND;TZID=Europe/Rome:${aRoma(Date.parse(s.inizio) + minuti * 60000)}`,
    `SUMMARY:${testoIcs(['MB21', nomeTipo, serata].filter(Boolean).join(' · '))}`,
    ...rigaLuogo(s.luogo),
    'END:VEVENT'];
}

// Gli impegni ricevuti da altri (nota Pagine 027, Ignazio 05/10/2026): un appuntamento condiviso dalla persona con cui è fissato, o una serata di Team/Linea
// condivisa da Ignazio. Righe della funzione `impegni_ricevuti_di`. Niente avvisi push: l'avviso lo dà il calendario personale, quindi entrano qui.
// Titolo «MB21 · PM 1a1 · da Ignazio»; nella descrizione il link della chiamata e, se condivisi, i punti da trattare; UID fisso `ricevuto-<origine>-<id>@mb21`.
export type Ricevuto = { origine: string; id: string; inizio: string; fine: string | null; titolo: string; da_nome: string | null; link: string | null;
  luogo?: string | null; punti: { t: string; fatto?: boolean }[] | null; risposta?: string | null };
export function eventoRicevuto(r: Ricevuto, adesso: Date) {
  const fine = r.fine || Date.parse(r.inizio) + 3600000;
  const punti = Array.isArray(r.punti) ? r.punti.filter(p => p && typeof p.t === 'string' && p.t.trim()).map(p => `${p.fatto ? '✓' : '•'} ${p.t}`) : [];
  const dettagli = [r.link ? `Chiamata: ${r.link}` : '', punti.length ? ['Punti da trattare:', ...punti].join('\n') : ''].filter(Boolean).join('\n');
  return ['BEGIN:VEVENT', `UID:ricevuto-${r.origine}-${r.id}@mb21`, `DTSTAMP:${compatto(adesso)}`,
    `DTSTART;TZID=Europe/Rome:${aRoma(r.inizio)}`, `DTEND;TZID=Europe/Rome:${aRoma(fine)}`,
    `SUMMARY:${testoIcs(`MB21 · ${r.titolo} · da ${r.da_nome || '—'}`)}`,
    ...rigaLuogo(r.luogo),
    ...(dettagli ? [`DESCRIPTION:${testoIcs(dettagli)}`] : []),
    ...(r.risposta === 'non_ci_sono' ? ['STATUS:CANCELLED', 'TRANSP:TRANSPARENT'] : []),   // «Non ci sono»: resta nel calendario, ma non occupa
    'END:VEVENT'];
}

// Il calendario intero: la testata, il fuso, gli eventi (appuntamenti e telefonate, poi gli incontri di gruppo, poi quelli ricevuti), la coda; ogni riga piegata a 75 byte
export function calendario(azioni: Azione[], spazi: Spazio[], adesso: Date, ricevuti: Ricevuto[] = []) {
  const righe = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MB21//Agenda//IT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:MB21', 'X-WR-TIMEZONE:Europe/Rome', ...FUSO_ROMA_ICS,
    ...incontriCalendario(azioni).flatMap(g => evento(g[0], adesso, g)),   // nota 142: un incontro, un evento
    ...spazi.filter(s => TIPI_SPAZIO_NEL_CALENDARIO.includes(s.tipo)).flatMap(s => eventoSpazio(s, adesso)),
    ...ricevuti.flatMap(r => eventoRicevuto(r, adesso)),
    'END:VCALENDAR', ''];
  return righe.map(piegaIcs).join('\r\n');
}
