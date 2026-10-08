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
//  - gli incontri di gruppo (nota 024, Ignazio 04/10/2026): Team, LdS e SdS/OPEN, righe della tabella `spazi`, con il nome della serata se c'è;
//  - gli impegni ricevuti da altri (nota 027, 05/10/2026), con «da Ignazio» nel titolo.
// IL FORMATO vive solo in `formato.ts` (provato da Node: tools/banco/prova_calendario.js; il bottone del lavoro 1, `fileCalendario` in agenda.js, è stato tolto il 21/09:
// «solo specchi, mai copie»): titolo «MB21 · PM 1a1 · Nome», senza fine 1 ora, ora di Roma con VTIMEZONE, UID fisso `azione-<id>@mb21` (`spazio-<id>@mb21` per gli incontri di gruppo), niente telefono.
// NOTE E OSPITE (Ignazio 04/10/2026): per un'ora il feed li ha tolti per riservatezza (opzione B), poi rimessi lo stesso giorno: senza le note
// nell'appuntamento si perde il contesto del lavoro da fare. Nella DESCRIPTION: «Ospite: …» e le note dell'azione. Il Profilo avvisa che chi ha il link le legge.
// Gli appuntamenti eliminati spariscono e basta: il Calendario Apple a ogni rilettura prende l'elenco intero.
//
// REGISTRI SUPABASE (note Pagine 013 · 017, 05/10/2026): i telefoni rileggono il feed ~220 volte al giorno e ogni richiesta al database è una riga di registro.
// Da oggi: (1) una chiamata sola, la funzione `calendario_righe(p_token)` (migrazione 20261005190000) dà azioni, telefonate, coda, spazi e impegni
// ricevuti insieme; se non c'è ancora (prima della migrazione) si fa come prima, con le letture separate; (2) il feed già costruito resta in memoria
// per 10 minuti per ogni segreto: dentro quei 10 minuti una rilettura non tocca il database (lo specchio era già «lento», 3-4 ore sul Calendario Apple).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { calendario, type Azione, type Spazio, type Ricevuto, TIPI_SPAZIO_NEL_CALENDARIO } from './formato.ts';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

const niente = () => new Response('', { status: 404 });
const TENUTA_MS = 10 * 60000;
const TENUTI = new Map<string, { quando: number; corpo: string }>();   // il feed per segreto, finché questa istanza vive

// Tutto in una chiamata (calendario_righe); null = segreto sbagliato o spento
async function righeInUnaChiamata(token: string) {
  const { data, error } = await db.rpc('calendario_righe', { p_token: token });
  if (error) throw error;
  return data as null | { azioni: Azione[]; telefonate: Azione[]; coda: Azione[]; spazi: Spazio[]; ricevuti: Ricevuto[] };
}

// Come prima della migrazione 20261005190000: le letture separate (resta finché la funzione non è applicata ovunque)
async function righeSeparate(token: string) {
  const { data: utente } = await db.from('utenti').select('id').eq('calendario_token', token).eq('accesso_attivo', true).is('eliminato_il', null).maybeSingle();
  if (!utente) return null;
  // nota Fondamenta 033 (08/10): scaduto = come un segreto spento (la stessa scadenza dell'app; se la funzione manca si va avanti come prima)
  const { data: attivo } = await db.rpc('abbonamento_attivo', { p_utente: utente.id });
  if (attivo === false) return null;
  const da = new Date(Date.now() - 30 * 86400000).toISOString();
  const CAMPI = 'id, contatto_id, tipo_azione, modalita, esito, inizio, fine, data_scelta, ospite, note, contatti(nome)';
  const [app, tel, coda] = await Promise.all([
    db.from('azioni').select(CAMPI).eq('user_id', utente.id).neq('tipo_azione', 'Contatto').gte('inizio', da).order('inizio').limit(2000),
    db.from('azioni').select(CAMPI).eq('user_id', utente.id).eq('tipo_azione', 'Contatto').is('data_scelta', null).eq('completata', false).gte('inizio', da).order('inizio').limit(2000),
    db.from('azioni').select(CAMPI).eq('user_id', utente.id).eq('tipo_azione', 'Contatto').in('esito', ['PM Fissato', 'Appuntamento']).gte('data_scelta', da).order('data_scelta').limit(2000),
  ]);
  if (app.error || tel.error || coda.error) throw app.error || tel.error || coda.error;
  let telefonate = (tel.data ?? []) as Azione[];
  if (telefonate.length) {
    const { data: v, error } = await db.from('vendite').select('azione_riordino_id').in('azione_riordino_id', telefonate.map(x => x.id));
    if (error) throw error;
    const riordini = new Set((v ?? []).map(x => x.azione_riordino_id));
    telefonate = telefonate.filter(x => !riordini.has(x.id));
  }
  const leggiSpazi = (campi: string) => db.from('spazi').select(campi).eq('user_id', utente.id).in('tipo', TIPI_SPAZIO_NEL_CALENDARIO).gte('inizio', da).order('inizio').limit(2000);
  let sp = await leggiSpazi('id, tipo, inizio, durata, nome');
  if (sp.error) sp = await leggiSpazi('id, tipo, inizio, durata');
  const ric = await db.rpc('impegni_ricevuti_di', { p_utente: utente.id, p_da: da, p_a: new Date(Date.now() + 366 * 86400000).toISOString() });
  return { azioni: (app.data ?? []) as Azione[], telefonate, coda: (coda.data ?? []) as Azione[],
    spazi: (sp.error ? [] : sp.data ?? []) as unknown as Spazio[], ricevuti: (ric.error || !Array.isArray(ric.data) ? [] : ric.data) as Ricevuto[] };
}

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return niente();
  const token = new URL(req.url).searchParams.get('t') ?? '';
  if (!/^[0-9a-f]{64}$/.test(token)) return niente();
  const adesso = new Date();
  const tenuto = TENUTI.get(token);
  let corpo: string;
  if (tenuto && adesso.getTime() - tenuto.quando < TENUTA_MS) corpo = tenuto.corpo;
  else {
    let righe;
    try { righe = await righeInUnaChiamata(token); }
    catch { try { righe = await righeSeparate(token); } catch { return new Response('', { status: 500 }); } }
    if (!righe) return niente();
    // via i doppioni della coda (c'è già l'appuntamento vero, stesso contatto e stessa ora)
    const veri = new Set(righe.azioni.map(x => `${x.contatto_id}|${Date.parse(x.inizio)}`));
    const daCoda = righe.coda.filter(x => !veri.has(`${x.contatto_id}|${Date.parse(x.data_scelta!)}`));
    corpo = calendario([...righe.azioni, ...righe.telefonate, ...daCoda], righe.spazi, adesso, righe.ricevuti);
    TENUTI.set(token, { quando: adesso.getTime(), corpo });
    if (TENUTI.size > 500) TENUTI.clear();
  }
  return new Response(req.method === 'HEAD' ? null : corpo, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'private, max-age=600' } });
});
