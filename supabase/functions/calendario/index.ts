// MB21 · funzione Edge «calendario» (cantiere 38, lavoro 2): l'agenda di un utente come calendario .ics, a un indirizzo segreto.
// Il Calendario Apple ci si abbona una volta («Collega al Calendario Apple» nel Profilo) e poi lo rilegge da solo: MB21 resta
// l'unica verità, il Calendario è uno specchio a senso unico (quello che si scrive là non torna qui).
//   GET …/functions/v1/calendario?t=<utenti.calendario_token>   → text/calendar; con un segreto sbagliato o spento: 404, senza dire perché.
// Pubblicata con `supabase functions deploy calendario --no-verify-jwt` (il Calendario non ha l'accesso dell'utente: vale il segreto).
//
// COSA C'È DENTRO (decisione di Ignazio 21/09: appuntamenti e telefonate con un orario), da 30 giorni fa in avanti:
//  - gli appuntamenti veri (tipo ≠ Contatto), anche già chiusi;
//  - le telefonate messe in Agenda con un orario e non ancora fatte (come le mostra l'Agenda), MAI i Riordini (li crea l'app);
//  - i «PM Fissato» / «Appuntamento» dati dalla coda con giorno e ora, finché non c'è l'appuntamento vero alla stessa ora
//    (stessa regola del promemoria in `avvisi`).
// STESSO FORMATO di `MB21Agenda.fileCalendario` in agenda.js (il bottone del lavoro 1): qui l'app non arriva, va tenuto uguale a mano —
// titolo «MB21 · PM 1a1 · Nome», senza fine 1 ora, ora di Roma con VTIMEZONE, UID fisso `azione-<id>@mb21`, niente telefono.
// Gli appuntamenti eliminati spariscono e basta: il Calendario Apple a ogni rilettura prende l'elenco intero.
import { createClient } from 'npm:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

const FUSO_ROMA_ICS = ['BEGIN:VTIMEZONE', 'TZID:Europe/Rome',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE'];
const testoIcs = (s: string) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
// le righe di un .ics non passano i 75 byte: il resto va a capo con uno spazio davanti
function piegaIcs(riga: string) {
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
const aRoma = (iso: string | number) => FMT.format(new Date(iso)).replace(/[-:]/g, '').replace(' ', 'T');   // «20260918T183000»
const compatto = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');

type Azione = { id: string; contatto_id: string | null; tipo_azione: string; modalita: string | null; esito: string | null; inizio: string; fine: string | null;
  data_scelta: string | null; ospite: string | null; note: string | null; contatti: unknown };

function evento(a: Azione, adesso: Date) {
  const dallaCoda = a.tipo_azione === 'Contatto' && !!a.data_scelta;
  const inizio = dallaCoda ? a.data_scelta! : a.inizio;
  const fine = !dallaCoda && a.fine ? a.fine : Date.parse(inizio) + 3600000;
  const nome = (a.contatti as { nome?: string } | null)?.nome || '—';
  const cosa = dallaCoda ? (a.esito === 'PM Fissato' ? 'PM' : 'Appuntamento') : (a.modalita || a.tipo_azione || '');
  const dettagli = [a.ospite ? `Ospite: ${a.ospite}` : '', a.note || ''].filter(Boolean).join('\n');
  return ['BEGIN:VEVENT', `UID:azione-${a.id}@mb21`, `DTSTAMP:${compatto(adesso)}`,
    `DTSTART;TZID=Europe/Rome:${aRoma(inizio)}`, `DTEND;TZID=Europe/Rome:${aRoma(fine)}`,
    `SUMMARY:${testoIcs(`MB21 · ${cosa} · ${nome}`)}`,
    ...(dettagli ? [`DESCRIPTION:${testoIcs(dettagli)}`] : []),
    'END:VEVENT'];
}

const niente = () => new Response('', { status: 404 });

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return niente();
  const token = new URL(req.url).searchParams.get('t') ?? '';
  if (!/^[0-9a-f]{64}$/.test(token)) return niente();
  const { data: utente } = await db.from('utenti').select('id').eq('calendario_token', token).eq('accesso_attivo', true).is('eliminato_il', null).maybeSingle();
  if (!utente) return niente();

  const adesso = new Date(), da = new Date(adesso.getTime() - 30 * 86400000).toISOString();
  const CAMPI = 'id, contatto_id, tipo_azione, modalita, esito, inizio, fine, data_scelta, ospite, note, contatti(nome)';
  const [app, tel, coda] = await Promise.all([
    db.from('azioni').select(CAMPI).eq('user_id', utente.id).neq('tipo_azione', 'Contatto').gte('inizio', da).order('inizio').limit(2000),
    db.from('azioni').select(CAMPI).eq('user_id', utente.id).eq('tipo_azione', 'Contatto').is('data_scelta', null).eq('completata', false).gte('inizio', da).order('inizio').limit(2000),
    db.from('azioni').select(CAMPI).eq('user_id', utente.id).eq('tipo_azione', 'Contatto').in('esito', ['PM Fissato', 'Appuntamento']).gte('data_scelta', da).order('data_scelta').limit(2000),
  ]);
  if (app.error || tel.error || coda.error) return new Response('', { status: 500 });
  // via i Riordini (vendite.azione_riordino_id) e i doppioni della coda (c'è già l'appuntamento vero, stesso contatto e stessa ora)
  let telefonate = (tel.data ?? []) as Azione[];
  if (telefonate.length) {
    const { data: v, error } = await db.from('vendite').select('azione_riordino_id').in('azione_riordino_id', telefonate.map(x => x.id));
    if (error) return new Response('', { status: 500 });
    const riordini = new Set((v ?? []).map(x => x.azione_riordino_id));
    telefonate = telefonate.filter(x => !riordini.has(x.id));
  }
  const veri = new Set(((app.data ?? []) as Azione[]).map(x => `${x.contatto_id}|${Date.parse(x.inizio)}`));
  const daCoda = ((coda.data ?? []) as Azione[]).filter(x => !veri.has(`${x.contatto_id}|${Date.parse(x.data_scelta!)}`));

  const righe = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MB21//Agenda//IT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:MB21', 'X-WR-TIMEZONE:Europe/Rome', ...FUSO_ROMA_ICS,
    ...[...((app.data ?? []) as Azione[]), ...telefonate, ...daCoda].flatMap(a => evento(a, adesso)),
    'END:VCALENDAR', ''];
  const corpo = righe.map(piegaIcs).join('\r\n');
  return new Response(req.method === 'HEAD' ? null : corpo, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-store' } });
});
