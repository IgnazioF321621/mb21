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
//  - gli incontri di gruppo (nota 024, Ignazio 04/10/2026): Team, LdS e SdS/OPEN, righe della tabella `spazi`, con il nome della serata se c'è.
// IL FORMATO vive solo in `formato.ts` (provato da Node: tools/banco/prova_calendario.js; il bottone del lavoro 1, `fileCalendario` in agenda.js, è stato tolto il 21/09:
// «solo specchi, mai copie»): titolo «MB21 · PM 1a1 · Nome», senza fine 1 ora, ora di Roma con VTIMEZONE, UID fisso `azione-<id>@mb21` (`spazio-<id>@mb21` per gli incontri di gruppo), niente telefono.
// NOTE E OSPITE (Ignazio 04/10/2026): per un'ora il feed li ha tolti per riservatezza (opzione B), poi rimessi lo stesso giorno: senza le note
// nell'appuntamento si perde il contesto del lavoro da fare. Nella DESCRIPTION: «Ospite: …» e le note dell'azione. Il Profilo avvisa che chi ha il link le legge.
// Gli appuntamenti eliminati spariscono e basta: il Calendario Apple a ogni rilettura prende l'elenco intero.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { calendario, type Azione, type Spazio, TIPI_SPAZIO_NEL_CALENDARIO } from './formato.ts';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

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

  // Gli incontri di gruppo stanno in `spazi`, non in `azioni`. Sono un'aggiunta: se la lettura non riesce (o la colonna `nome` non c'è ancora, prima della migrazione
  // `20261004170000_spazi_nome_serata`), il calendario esce lo stesso, senza di loro, invece di sparire per tutti.
  const leggiSpazi = (campi: string) => db.from('spazi').select(campi).eq('user_id', utente.id).in('tipo', TIPI_SPAZIO_NEL_CALENDARIO).gte('inizio', da).order('inizio').limit(2000);
  let sp = await leggiSpazi('id, tipo, inizio, durata, nome');
  if (sp.error) sp = await leggiSpazi('id, tipo, inizio, durata');
  const spazi = (sp.error ? [] : sp.data ?? []) as unknown as Spazio[];

  const corpo = calendario([...((app.data ?? []) as Azione[]), ...telefonate, ...daCoda], spazi, adesso);
  return new Response(req.method === 'HEAD' ? null : corpo, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-store' } });
});
