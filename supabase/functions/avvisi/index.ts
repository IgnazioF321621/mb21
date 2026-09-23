// MB21 · funzione Edge «avvisi» (cantiere 24): spedisce gli avvisi push ai dispositivi registrati.
// Chiamata in due modi:
//  - dall'app, con l'accesso dell'utente: { tipo: 'prova' } → avviso di prova ai suoi dispositivi
//  - dall'orologio di Supabase (pg_cron → chiama_avvisi), con il segreto: { tipo: 'check_sera' }
//    → alle 22 di Roma, «Hai fatto il Check di oggi?» a chi non ha ancora salvato il Check del giorno
//    { tipo: 'mattino' } → alle 9 di Roma (dal cantiere 29; prima alle 8), «Buongiorno, Nome! Oggi N telefonate, N appuntamenti (N da confermare) e N riordini da sentire»
//    { tipo: 'promemoria' } → ogni 5 minuti: «Tra 30 minuti: PM 1a1 · Pino Manolo» agli appuntamenti tra 25 e 35 minuti
//      non ancora avvisati (azioni.promemoria_il); con { prova: true } dice cosa manderebbe senza mandare
//      (e con { prova: true, adesso: '<ISO>' } fa finta che sia quell'ora: serve solo a provare).
//      Dal 21/09 anche le TELEFONATE messe in Agenda con un orario (Contatto senza esito, non completato): quelle una dietro
//      l'altra (ognuna entro 30 minuti dalla precedente) fanno UN avviso solo, «Tra 30 minuti · 3 telefonate». Mai per le telefonate
//      di Riordino (le crea l'app: ci pensa l'avviso del mattino) né per la coda, che non ha orario.
//    { tipo: 'senza_esito' } → ogni 5 minuti: «Com'è andata? · PM 1a1 · Pino Manolo» un'ora dopo la fine di un appuntamento
//      ancora senza esito, una volta sola (azioni.senza_esito_avvisato_il); non più vecchi di un giorno
//    { tipo: 'tracce' } → ogni 15 minuti, solo tra le 9 e le 21 di Roma (cantiere 40, 22/09): la traccia condivisa dura 72 ore.
//      A 48 ore dalla condivisione non ancora «ascoltata» (Ignazio: «48 ore sia per lo sponsor sia per chi deve ascoltare»):
//      allo sponsor «⏳ La traccia di Mario scade domani: ricordaglielo» (condivisioni.avviso_48_il) e, se la persona usa MB21
//      (utenti.partner_id = contatti.codice_amway), a lei «⏳ La traccia che ti ha mandato Ignazio scade domani: ascoltala»
//      (avviso_ascolto_il). Quando è il partner a segnare «ascoltata» dalla sua Dashboard (segnata_dal_partner), allo sponsor
//      «🎧 Isabella ha ascoltato "…" e chiede la prossima. Sentitevi!» (avviso_sponsor_il; «chiede la prossima» se chiede_prossima_il).
//      Il momento della condivisione è `creato_il` se la riga è stata scritta il giorno stesso, altrimenti mezzogiorno di `condivisa_il`
//      (le condivisioni scritte a mano per giorni passati). Mai per lo storico di Glide. Con { prova: true } dice cosa manderebbe senza mandare.
//
//  CANTIERE 43 (23/09): ognuno sceglie QUANDO (utenti.avvisi_quando, schema nel Profilo; regole pure in ./regole.ts, provate con
//  node tools/banco/prova_avvisi.js). Le ore e i minuti scritti qui sopra sono ora i valori «già impostato»:
//   - check_sera e mattino: l'orologio chiama ogni ora nella fascia possibile, la funzione avvisa chi ha scelto quell'ora
//   - promemoria (ogni minuto): appuntamenti, telefonate, e ANCHE cose da fare con l'ora e voci dei modelli (tabella avvisi_mandati:
//     un avviso solo per cosa, giorno e ora), ognuno con i suoi minuti prima; parte da «N minuti prima» fino all'inizio
//   - senza_esito: «Com'è andata?» N minuti dopo la fine (30 · 60 · 120, scelta di ognuno)
//   Tutti accettano { prova: true, adesso: '<ISO>' }: dicono cosa manderebbero a quell'ora, senza mandare e senza segnare niente.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { scelta, eMomentoPrima, titoloPrima, coseConOra, chiaveAvviso, oraDi as oraRomaDi, giornoDi as giornoRomaDi, type ConOra, type Cosa, type Voce, type Modello } from './regole.ts';

const URL_SUPABASE = Deno.env.get('SUPABASE_URL')!;
const CHIAVE_SERVIZIO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SEGRETO = Deno.env.get('AVVISI_SEGRETO') ?? '';
webpush.setVapidDetails('mailto:ignazio.f@me.com', Deno.env.get('VAPID_PUBLIC')!, Deno.env.get('VAPID_PRIVATE')!);

const db = createClient(URL_SUPABASE, CHIAVE_SERVIZIO, { auth: { persistSession: false } });

// Inizio e fine del giorno di Roma (ISO): Roma è UTC+2 con l'ora legale, UTC+1 con quella solare
function giornoRoma(giorno: string) {
  const scarto = (new Date(giorno + 'T12:00:00Z').getTime() - new Date(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(giorno + 'T12:00:00Z')).replace(' ', 'T') + 'Z').getTime()) / 3600000;
  const inizio = new Date(new Date(giorno + 'T00:00:00Z').getTime() + scarto * 3600000);
  return { inizio: inizio.toISOString(), fine: new Date(inizio.getTime() + 86400000).toISOString() };
}
const giornoDi = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
const plurale = (n: number, uno: string, tanti: string) => `${n} ${n === 1 ? uno : tanti}`;

const oraDi = (iso: string) => new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

// ── Telefonate in Agenda (21/09) ── quelle messe a mano con giorno e ora: Contatto senza esito e non completato.
type Telefonata = { id: string; user_id: string; inizio: string; fine: string | null; contatti: unknown };
const GIRO = 30 * 60000;   // due telefonate sono «una dietro l'altra» se la seconda comincia entro 30 minuti dalla prima
const nomeDi = (az: { contatti: unknown }) => (az.contatti as { nome?: string } | null)?.nome || '—';
// senza «fine» una telefonata dura 15 minuti, come in MB Plan (MB21Agenda.DURATA_CONTATTO, Ignazio 23/09; prima 5)
const DURATA_TELEFONATA = 15 * 60000;
const fineTelefonata = (az: Telefonata) => (az.fine ? Date.parse(az.fine) : Date.parse(az.inizio) + DURATA_TELEFONATA);
// Via le telefonate di Riordino, quelle che l'app crea da sola da una vendita (vendite.azione_riordino_id)
async function senzaRiordini(telefonate: Telefonata[]) {
  if (!telefonate.length) return telefonate;
  const { data, error } = await db.from('vendite').select('azione_riordino_id').in('azione_riordino_id', telefonate.map(x => x.id));
  if (error) throw error;
  const riordini = new Set((data ?? []).map(v => v.azione_riordino_id));
  return telefonate.filter(x => !riordini.has(x.id));
}
// I giri di telefonate, utente per utente: ogni giro è un elenco in ordine di orario
function giriDiTelefonate(telefonate: Telefonata[]) {
  const giri: Telefonata[][] = [];
  const perUtente = new Map<string, Telefonata[]>();
  for (const x of telefonate) perUtente.set(x.user_id, [...(perUtente.get(x.user_id) ?? []), x]);
  for (const sue of perUtente.values()) {
    sue.sort((x, y) => Date.parse(x.inizio) - Date.parse(y.inizio));
    let giro: Telefonata[] = [];
    for (const x of sue) {
      if (giro.length && Date.parse(x.inizio) - Date.parse(giro[giro.length - 1].inizio) > GIRO) { giri.push(giro); giro = []; }
      giro.push(x);
    }
    if (giro.length) giri.push(giro);
  }
  return giri;
}
const elencoNomi = (giro: Telefonata[]) => giro.slice(0, 3).map(nomeDi).join(', ') + (giro.length > 3 ? ` e ${giro.length === 4 ? 'un\'altra' : `altre ${giro.length - 3}`}` : '');

type Dispositivo = { id: string; endpoint: string; p256dh: string; auth: string };
type Avviso = { titolo: string; testo: string; url: string; tag: string };

// Spedisce un avviso a un dispositivo; se il dispositivo non esiste più (404/410) lo toglie dalla tabella
async function spedisci(d: Dispositivo, avviso: Avviso) {
  try {
    await webpush.sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, JSON.stringify(avviso), { TTL: 3600 });
    await db.from('avvisi_dispositivi').update({ ultimo_invio: new Date().toISOString(), ultimo_errore: null }).eq('id', d.id);
    return 'ok';
  } catch (e) {
    const codice = (e as { statusCode?: number }).statusCode;
    if (codice === 404 || codice === 410) { await db.from('avvisi_dispositivi').delete().eq('id', d.id); return 'tolto'; }
    await db.from('avvisi_dispositivi').update({ ultimo_errore: `${codice ?? ''} ${(e as Error).message}`.trim() }).eq('id', d.id);
    return 'errore';
  }
}

async function spedisciA(utenti: string[], avviso: Avviso) {
  if (!utenti.length) return { dispositivi: 0 };
  const { data, error } = await db.from('avvisi_dispositivi').select('id, endpoint, p256dh, auth').in('user_id', utenti);
  if (error) throw error;
  const esiti = await Promise.all((data as Dispositivo[]).map(d => spedisci(d, avviso)));
  return { dispositivi: esiti.length, ok: esiti.filter(x => x === 'ok').length, tolti: esiti.filter(x => x === 'tolto').length, errori: esiti.filter(x => x === 'errore').length };
}

// Le scelte del QUANDO di tutti gli utenti (cantiere 43): (utente, chiave) → la sua scelta o il «già impostato»
async function scelteDiTutti() {
  const { data, error } = await db.from('utenti').select('id, avvisi_quando');
  if (error) throw error;
  const per = new Map<string, Record<string, number>>();
  for (const u of data ?? []) per.set(u.id, u.avvisi_quando ?? {});
  return (id: string, k: string) => scelta(per.get(id), k);
}

const risposta = (corpo: unknown, stato = 200) => new Response(JSON.stringify(corpo), { status: stato, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey' } });
  const corpo = await req.json().catch(() => ({}));
  const tipo = corpo.tipo as string;

  // Avviso di prova: chi lo chiede deve essere entrato nell'app
  if (tipo === 'prova') {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: { user } } = await db.auth.getUser(token);
    if (!user) return risposta({ errore: 'non autorizzato' }, 401);
    const { data: u } = await db.from('utenti').select('id, avvisi_quando').eq('auth_id', user.id).is('eliminato_il', null).maybeSingle();
    if (!u) return risposta({ errore: 'utente non trovato' }, 403);
    const esito = await spedisciA([u.id], { titolo: 'MB21 · Avvisi accesi ✓', testo: `Da stasera alle ${scelta(u.avvisi_quando, 'check')} ti ricordo il Check del Giorno.`, url: './', tag: 'prova' });
    return risposta(esito);
  }

  // Avvisi dell'orologio: solo con il segreto condiviso
  if (!SEGRETO || req.headers.get('x-avvisi-segreto') !== SEGRETO) return risposta({ errore: 'non autorizzato' }, 401);
  // «Adesso»: quello vero, oppure con { prova: true, adesso } quello finto (solo in prova: niente parte, niente si segna)
  const adessoVero = corpo.prova && corpo.adesso ? Date.parse(corpo.adesso) : Date.now();
  const oraAdesso = oraRomaDi(adessoVero), oggiAdesso = giornoRomaDi(adessoVero);
  const quando = await scelteDiTutti();

  if (tipo === 'check_sera') {
    // cantiere 43: l'orologio chiama ogni ora dalle 20 alle 22 di Roma; avvisa chi ha scelto quest'ora (già impostato: 22)
    if (![20, 21, 22].includes(oraAdesso) && !corpo.forza) return risposta({ saltato: `a Roma sono le ${oraAdesso}: il Check della sera si sceglie tra le 20 e le 22` });
    const oggi = oggiAdesso;
    const [{ data: attivi, error: e1 }, { data: fatti, error: e2 }] = await Promise.all([
      db.from('utenti').select('id').eq('accesso_attivo', true).is('eliminato_il', null),
      db.from('check_giorno').select('user_id').eq('data', oggi),
    ]);
    if (e1 || e2) return risposta({ errore: (e1 || e2)!.message }, 500);
    const giaFatto = new Set((fatti ?? []).map(x => x.user_id));
    const daAvvisare = (attivi ?? []).map(x => x.id).filter(id => !giaFatto.has(id) && (corpo.forza || quando(id, 'check') === oraAdesso));
    if (corpo.prova) return risposta({ oggi, ora: oraAdesso, utenti: daAvvisare });
    const esito = await spedisciA(daAvvisare, { titolo: '⚡ Hai fatto il Check di oggi?', testo: 'Due minuti per chiudere la giornata: tocca per aprire il Check del Giorno.', url: './?apri=check', tag: 'check_sera' });
    return risposta({ oggi, utenti: daAvvisare.length, ...esito });
  }

  // Riepilogo del mattino (cantiere 24 passo 2): stessi conti della Dashboard, ognuno per la propria agenda
  if (tipo === 'mattino') {
    // cantiere 43: l'orologio chiama ogni ora dalle 7 alle 10 di Roma; avvisa chi ha scelto quest'ora (già impostato: 9)
    if (![7, 8, 9, 10].includes(oraAdesso) && !corpo.forza) return risposta({ saltato: `a Roma sono le ${oraAdesso}: il buongiorno si sceglie tra le 7 e le 10` });
    const oggi = oggiAdesso, g = giornoRoma(oggi), adesso = adessoVero, limiteConferme = new Date(adesso + 12 * 3600000).toISOString();
    // Riordini da sentire (cantiere 29): STESSA REGOLA di `MB21Agenda.riordiniDaSentire` in agenda.js (qui l'app non arriva, va tenuta uguale a mano):
    // telefonate di riordino nate dalle vendite, senza esito e non completate, da oggi indietro; più quelle importate da Glide
    // (Contatto con glide_id ed esito «Riordino», non completate) dal 1° settembre 2026 (INIZIO_RIORDINI_GLIDE) a oggi.
    const [{ data: attivi, error: e1 }, { data: fatti, error: e2 }, { data: appuntamenti, error: e3 }, { data: daCoda, error: e4 }, { data: vendite, error: e5 }, { data: glide, error: e6 }] = await Promise.all([
      db.from('utenti').select('id, nome, contatti_al_giorno').eq('accesso_attivo', true).is('eliminato_il', null),
      db.from('azioni').select('user_id').eq('da_coda', true).gte('inizio', g.inizio).lt('inizio', g.fine),   // esiti dalla coda già dati oggi
      db.from('azioni').select('user_id, contatto_id, inizio, confermato_il').neq('tipo_azione', 'Contatto').eq('completata', false).gte('inizio', g.inizio).lt('inizio', g.fine),
      db.from('azioni').select('user_id, contatto_id, data_scelta, confermato_il').eq('tipo_azione', 'Contatto').in('esito', ['PM Fissato', 'Appuntamento']).gte('data_scelta', g.inizio).lt('data_scelta', g.fine),
      db.from('vendite').select('user_id, azione:azioni!azione_riordino_id(completata, esito, inizio)').not('azione_riordino_id', 'is', null),
      db.from('azioni').select('user_id').eq('tipo_azione', 'Contatto').eq('esito', 'Riordino').not('glide_id', 'is', null).or('completata.is.null,completata.eq.false')
        .gte('inizio', giornoRoma('2026-09-01').inizio).lt('inizio', g.fine),
    ]);
    const err = e1 || e2 || e3 || e4 || e5 || e6;
    if (err) return risposta({ errore: err.message }, 500);
    const { data: dispositivi } = await db.from('avvisi_dispositivi').select('user_id');
    const conDispositivo = new Set((dispositivi ?? []).map(x => x.user_id));
    const veri = new Set((appuntamenti ?? []).map(a => `${a.contatto_id}|${Date.parse(a.inizio)}`));
    const tutti = [
      ...(appuntamenti ?? []).map(a => ({ user_id: a.user_id, quando: a.inizio, confermato: !!a.confermato_il })),
      ...(daCoda ?? []).filter(a => !veri.has(`${a.contatto_id}|${Date.parse(a.data_scelta)}`)).map(a => ({ user_id: a.user_id, quando: a.data_scelta, confermato: !!a.confermato_il })),   // senza doppioni della coda
    ];
    const riordiniDi = [
      // deno-lint-ignore no-explicit-any
      ...(vendite ?? []).filter((v: any) => v.azione && !v.azione.completata && !v.azione.esito && v.azione.inizio < g.fine),
      ...(glide ?? []),
    ].map(r => r.user_id);
    const esiti: Record<string, unknown>[] = [];
    for (const u of attivi ?? []) {
      if (!conDispositivo.has(u.id)) continue;
      if (!corpo.forza && quando(u.id, 'buongiorno') !== oraAdesso) continue;
      const telefonate = Math.max(0, u.contatti_al_giorno - (fatti ?? []).filter(x => x.user_id === u.id).length);
      const miei = tutti.filter(a => a.user_id === u.id);
      const conferme = miei.filter(a => !a.confermato && a.quando > new Date(adesso).toISOString() && a.quando <= limiteConferme).length;
      const pezzi = [plurale(telefonate, 'telefonata', 'telefonate')];
      if (miei.length) pezzi.push(plurale(miei.length, 'appuntamento', 'appuntamenti') + (conferme ? ` (${conferme} da confermare)` : ''));
      const nome = String(u.nome ?? '').trim();   // nome proprio nel titolo (Ignazio 18/09); senza nome resta «Buongiorno!»
      const riordini = riordiniDi.filter(id => id === u.id).length;
      if (riordini) pezzi.push(plurale(riordini, 'riordino', 'riordini') + ' da sentire');
      const testo = `Oggi ${pezzi.length > 1 ? pezzi.slice(0, -1).join(', ') + ' e ' + pezzi[pezzi.length - 1] : pezzi[0]}. Tocca per aprire l'Agenda.`;
      if (corpo.prova) { esiti.push({ utente: u.id, testo }); continue; }
      esiti.push({ utente: u.id, testo, ...(await spedisciA([u.id], { titolo: nome ? `☀️ Buongiorno, ${nome}!` : '☀️ Buongiorno!', testo, url: './?apri=agenda', tag: 'mattino' })) });
    }
    return risposta({ oggi, ora: oraAdesso, utenti: esiti.length, esiti: corpo.forza || corpo.prova ? esiti : undefined });
  }

  // Promemoria prima dell'appuntamento (cantiere 24 passo 3): stesso titolo dell'Agenda («PM 1a1 · Pino Manolo»).
  // Cantiere 43: i minuti prima sono la scelta di ognuno («appuntamenti», «telefonate», «cose», «modelli»); si guarda da 5 minuti fa
  // (per «all'ora») fino a un'ora avanti (la scelta più lunga) e decide `eMomentoPrima`.
  if (tipo === 'promemoria') {
    const adesso = adessoVero, MASSIMO = 60;
    const da = new Date(adesso - 5 * 60000).toISOString(), a = new Date(adesso + (MASSIMO + 1) * 60000).toISOString();
    const [{ data: appuntamenti, error: e1 }, { data: daCoda, error: e2 }] = await Promise.all([
      db.from('azioni').select('id, user_id, contatto_id, inizio, tipo_azione, modalita, esito, contatti(nome)').neq('tipo_azione', 'Contatto').eq('completata', false).is('promemoria_il', null).gte('inizio', da).lt('inizio', a),
      db.from('azioni').select('id, user_id, contatto_id, data_scelta, tipo_azione, modalita, esito, contatti(nome)').eq('tipo_azione', 'Contatto').in('esito', ['PM Fissato', 'Appuntamento']).is('promemoria_il', null).gte('data_scelta', da).lt('data_scelta', a),
    ]);
    if (e1 || e2) return risposta({ errore: (e1 || e2)!.message }, 500);
    const veri = new Set((appuntamenti ?? []).map(x => `${x.contatto_id}|${Date.parse(x.inizio)}`));
    const tutti = [...(appuntamenti ?? []), ...(daCoda ?? []).filter(x => !veri.has(`${x.contatto_id}|${Date.parse(x.data_scelta)}`))];   // senza doppioni della coda
    const esiti: Record<string, unknown>[] = [];
    for (const az of tutti) {
      const nome = (az.contatti as unknown as { nome?: string } | null)?.nome || '—';
      const cosa = az.tipo_azione === 'Contatto' ? (az.esito === 'PM Fissato' ? 'PM' : 'Appuntamento') : (az.modalita || az.tipo_azione);
      const ore = az as unknown as { inizio?: string; data_scelta?: string };   // appuntamento vero (inizio) o dalla coda (data_scelta)
      const inizio = Date.parse((az.tipo_azione === 'Contatto' ? ore.data_scelta : ore.inizio) ?? '');
      if (!eMomentoPrima(inizio, quando(az.user_id, 'appuntamenti'), adesso)) continue;   // non è ancora il momento
      const avviso = { titolo: titoloPrima(inizio, adesso), testo: `${cosa} · ${nome}`, url: `./?apri=agenda&azione=${az.id}`, tag: `promemoria-${az.id}` };
      if (corpo.prova) { esiti.push({ azione: az.id, utente: az.user_id, ...avviso }); continue; }
      const esito = await spedisciA([az.user_id], avviso);
      await db.from('azioni').update({ promemoria_il: new Date().toISOString() }).eq('id', az.id);
      esiti.push({ azione: az.id, ...esito });
    }
    // Le telefonate in Agenda: si guarda fino a 3 ore oltre per prendere tutto il giro, ma l'avviso parte solo quando è il momento
    // della PRIMA ancora senza promemoria; con lei si segnano tutte quelle del giro.
    const { data: tel, error: e3 } = await db.from('azioni').select('id, user_id, inizio, fine, contatti(nome)').eq('tipo_azione', 'Contatto').eq('completata', false)
      .is('esito', null).is('promemoria_il', null).gte('inizio', da).lt('inizio', new Date(adesso + (MASSIMO + 180) * 60000).toISOString());
    if (e3) return risposta({ errore: e3.message }, 500);
    for (const giro of giriDiTelefonate(await senzaRiordini((tel ?? []) as Telefonata[]))) {
      const inizio = Date.parse(giro[0].inizio);
      if (!eMomentoPrima(inizio, quando(giro[0].user_id, 'telefonate'), adesso)) continue;   // non è ancora il momento: se ne riparla al suo turno
      const titolo = titoloPrima(inizio, adesso);
      const avviso = giro.length === 1
        ? { titolo, testo: `Telefonata · ${nomeDi(giro[0])}`, url: `./?apri=agenda&azione=${giro[0].id}`, tag: `promemoria-${giro[0].id}` }
        : { titolo: `${titolo} · ${giro.length} telefonate`, testo: `dalle ${oraDi(giro[0].inizio)}: ${elencoNomi(giro)}`, url: `./?apri=agenda&giorno=${giornoDi(giro[0].inizio)}`, tag: `promemoria-${giro[0].id}` };
      if (corpo.prova) { esiti.push({ telefonate: giro.length, utente: giro[0].user_id, ...avviso }); continue; }
      const esito = await spedisciA([giro[0].user_id], avviso);
      await db.from('azioni').update({ promemoria_il: new Date().toISOString() }).in('id', giro.map(x => x.id));
      esiti.push({ telefonate: giro.length, ...esito });
    }
    // Cantiere 43: le cose da fare con l'ora e le voci dei modelli (stessa regola della Timeline di MB Plan: `coseConOra` in regole.ts).
    // Oggi, e domani se tra un'ora è già domani. Quelle della stessa persona alla stessa ora fanno un avviso solo.
    const giorni = [...new Set([oggiAdesso, giornoRomaDi(adesso + (MASSIMO + 1) * 60000)])];
    const [{ data: cose, error: e4 }, { data: voci, error: e5 }, { data: modelli, error: e6 }] = await Promise.all([
      db.from('cose_da_fare').select('id, user_id, testo, giorno, ora, fatto_il, modello_id, core, scala').in('giorno', giorni),
      db.from('modello_giorno').select('id, user_id, testo, giorni, attivo, core, modello_id, ora').not('modello_id', 'is', null).is('core', null),
      db.from('modelli').select('id, attivo, scala'),
    ]);
    if (e4 || e5 || e6) return risposta({ errore: (e4 || e5 || e6)!.message }, 500);
    const pronte = giorni.flatMap(g => coseConOra((cose ?? []) as Cosa[], (voci ?? []) as Voce[], (modelli ?? []) as Modello[], g))
      .filter(x => eMomentoPrima(x.inizio, quando(x.user_id, x.tipo), adesso));
    const { data: mandati, error: e7 } = pronte.length ? await db.from('avvisi_mandati').select('chiave').in('chiave', pronte.map(chiaveAvviso)) : { data: [], error: null };
    if (e7) return risposta({ errore: e7.message }, 500);
    const gia = new Set((mandati ?? []).map(m => m.chiave));
    const gruppi = new Map<string, ConOra[]>();
    for (const x of pronte) {
      if (gia.has(chiaveAvviso(x))) continue;   // già avvisata
      const k = `${x.user_id}|${x.inizio}`;
      gruppi.set(k, [...(gruppi.get(k) ?? []), x]);
    }
    for (const gruppo of gruppi.values()) {
      const primo = gruppo[0], titolo = titoloPrima(primo.inizio, adesso);
      const nomi = gruppo.slice(0, 3).map(x => x.testo).join(', ') + (gruppo.length > 3 ? ` e altre ${gruppo.length - 3}` : '');
      const avviso = gruppo.length === 1
        ? { titolo, testo: `${primo.ora} · ${primo.testo}`, url: `./?apri=agenda&giorno=${primo.giorno}`, tag: `cosa-${chiaveAvviso(primo)}` }
        : { titolo: `${titolo} · ${gruppo.length} cose`, testo: `alle ${primo.ora}: ${nomi}`, url: `./?apri=agenda&giorno=${primo.giorno}`, tag: `cosa-${chiaveAvviso(primo)}` };
      if (corpo.prova) { esiti.push({ cose: gruppo.map(x => `${x.tipo} ${x.id}`), utente: primo.user_id, ...avviso }); continue; }
      const esito = await spedisciA([primo.user_id], avviso);
      await db.from('avvisi_mandati').upsert(gruppo.map(x => ({ chiave: chiaveAvviso(x), user_id: x.user_id })), { onConflict: 'chiave', ignoreDuplicates: true });
      esiti.push({ cose: gruppo.length, ...esito });
    }
    // i segni più vecchi di 3 giorni non servono più (la chiave ha dentro il giorno): si puliscono una volta al giorno, alle 3 di notte
    if (!corpo.prova && oraAdesso === 3) await db.from('avvisi_mandati').delete().lt('mandato_il', new Date(adesso - 3 * 86400000).toISOString());
    return risposta({ avvisi: esiti.length, esiti });
  }

  // Appuntamento passato senza esito (cantiere 24 passo 4): un'ora dopo la fine, «Com'è andata?»
  if (tipo === 'senza_esito') {
    const adesso = adessoVero, ORA = 3600000, MINUTO = 60000;
    // cantiere 43: «dopo» = la scelta di ognuno (30 · 60 · 120 minuti dopo la fine; già impostato 60)
    const dopo = (utente: string) => quando(utente, 'com_e_andata') * MINUTO;
    // Candidati: iniziati tra 1 giorno e 30 minuti fa (la scelta più corta); decide la fine + la scelta
    const { data, error } = await db.from('azioni').select('id, user_id, inizio, fine, tipo_azione, modalita, contatti(nome)')
      .neq('tipo_azione', 'Contatto').eq('completata', false).is('esito', null).is('senza_esito_avvisato_il', null)
      .gte('inizio', new Date(adesso - 24 * ORA).toISOString()).lt('inizio', new Date(adesso - 30 * MINUTO).toISOString());
    if (error) return risposta({ errore: error.message }, 500);
    const esiti: Record<string, unknown>[] = [];
    for (const az of data ?? []) {
      const fine = az.fine ? Date.parse(az.fine) : Date.parse(az.inizio) + ORA;
      if (fine + dopo(az.user_id) > adesso) continue;   // dalla fine non è ancora passato il tempo scelto: si aspetta
      const nome = (az.contatti as unknown as { nome?: string } | null)?.nome || '—';
      const testo = `${az.modalita || az.tipo_azione} · ${nome}`;
      if (corpo.prova) { esiti.push({ azione: az.id, testo }); continue; }
      const esito = await spedisciA([az.user_id], { titolo: '❓ Com\'è andata?', testo, url: `./?apri=agenda&azione=${az.id}&giorno=${giornoDi(az.inizio)}`, tag: `senza-esito-${az.id}` });
      await db.from('azioni').update({ senza_esito_avvisato_il: new Date().toISOString() }).eq('id', az.id);
      esiti.push({ azione: az.id, testo, ...esito });
    }
    // Le telefonate in Agenda rimaste senza esito (21/09): un avviso solo per giro, un'ora dopo la fine dell'ULTIMA del giro
    const { data: tel, error: e2 } = await db.from('azioni').select('id, user_id, inizio, fine, contatti(nome)').eq('tipo_azione', 'Contatto').eq('completata', false)
      .is('esito', null).is('senza_esito_avvisato_il', null).gte('inizio', new Date(adesso - 24 * ORA).toISOString()).lt('inizio', new Date(adesso).toISOString());
    if (e2) return risposta({ errore: e2.message }, 500);
    for (const giro of giriDiTelefonate(await senzaRiordini((tel ?? []) as Telefonata[]))) {
      if (fineTelefonata(giro[giro.length - 1]) + dopo(giro[0].user_id) > adesso) continue;   // l'ultima non è finita da abbastanza: si aspetta
      const avviso = giro.length === 1
        ? { titolo: '❓ Com\'è andata?', testo: `Telefonata · ${nomeDi(giro[0])}`, url: `./?apri=agenda&azione=${giro[0].id}&giorno=${giornoDi(giro[0].inizio)}`, tag: `senza-esito-${giro[0].id}` }
        : { titolo: `❓ Com'è andata? · ${giro.length} telefonate senza esito`, testo: elencoNomi(giro), url: `./?apri=agenda&giorno=${giornoDi(giro[0].inizio)}`, tag: `senza-esito-${giro[0].id}` };
      if (corpo.prova) { esiti.push({ telefonate: giro.length, ...avviso }); continue; }
      const esito = await spedisciA([giro[0].user_id], avviso);
      await db.from('azioni').update({ senza_esito_avvisato_il: new Date().toISOString() }).in('id', giro.map(x => x.id));
      esiti.push({ telefonate: giro.length, ...esito });
    }
    return risposta({ appuntamenti: esiti.length, esiti });
  }

  // Le tracce condivise (cantiere 40 lavori 5 e 6): a 48 ore non ascoltata → sponsor e (se usa MB21) la persona; ascoltata dal partner → sponsor
  if (tipo === 'tracce') {
    const adesso = adessoVero, ORA = 3600000;
    if (oraAdesso < 9 || oraAdesso >= 21) return risposta({ tracce: 0, nota: 'di notte si tace: gli avvisi partono dalle 9' });
    type Riga = { id: string; user_id: string; contatto_id: string; condivisa_il: string; creato_il: string; ascoltata: boolean; ascoltata_il: string | null;
      avviso_48_il: string | null; avviso_ascolto_il: string | null; avviso_sponsor_il: string | null; segnata_dal_partner: boolean; chiede_prossima_il: string | null;
      contatti: { nome?: string; codice_amway?: string | null } | null; materiali: { titolo?: string } | null; utenti: { nome?: string } | null };
    const { data, error } = await db.from('condivisioni')
      .select('id, user_id, contatto_id, condivisa_il, creato_il, ascoltata, ascoltata_il, avviso_48_il, avviso_ascolto_il, avviso_sponsor_il, segnata_dal_partner, chiede_prossima_il, contatti(nome, codice_amway), materiali(titolo), utenti:user_id(nome)')
      .eq('da_glide', false).gte('condivisa_il', giornoDi(new Date(adesso - 5 * 24 * ORA).toISOString())).gte('creato_il', new Date(adesso - 8 * 24 * ORA).toISOString());
    if (error) return risposta({ errore: error.message }, 500);
    // chi usa MB21 tra le persone di queste condivisioni: il codice Amway della scheda = utenti.partner_id
    const codici = [...new Set((data as unknown as Riga[] ?? []).map(k => k.contatti?.codice_amway).filter(Boolean))] as string[];
    const { data: utenti } = codici.length ? await db.from('utenti').select('id, partner_id').in('partner_id', codici) : { data: [] };
    const utenteDi = (codice: string | null | undefined) => (utenti ?? []).find(u => u.partner_id === codice)?.id ?? null;
    const esiti: Record<string, unknown>[] = [];
    const manda = async (k: Riga, a: string[], avviso: Avviso, campo: string) => {
      if (corpo.prova) { esiti.push({ condivisione: k.id, campo, ...avviso }); return; }
      const esito = await spedisciA(a, avviso);
      await db.from('condivisioni').update({ [campo]: new Date().toISOString() }).eq('id', k.id);
      esiti.push({ condivisione: k.id, campo, ...esito });
    };
    for (const k of (data as unknown as Riga[]) ?? []) {
      const momento = giornoDi(k.creato_il) === k.condivisa_il ? Date.parse(k.creato_il) : Date.parse(giornoRoma(k.condivisa_il).inizio) + 12 * ORA;
      const ore = (adesso - momento) / ORA;
      const nome = (k.contatti?.nome || 'la persona').split(' ')[0], sponsor = (k.utenti?.nome || 'il tuo sponsor').split(' ')[0];
      const traccia = k.materiali?.titolo || 'la traccia';
      const urlScheda = `./?apri=lista&contatto=${k.contatto_id}&sezione=sharing`;
      const partner = utenteDi(k.contatti?.codice_amway);
      if (!k.ascoltata && ore >= 48) {
        if (!k.avviso_48_il) await manda(k, [k.user_id], { titolo: `⏳ La traccia di ${nome} scade domani`, testo: `${traccia} · condivisa 2 giorni fa e non ancora ascoltata: ricordaglielo, poi segna qui.`, url: urlScheda, tag: `traccia-48-${k.id}` }, 'avviso_48_il');
        if (partner && !k.avviso_ascolto_il) await manda(k, [partner], { titolo: `⏳ La traccia che ti ha mandato ${sponsor} scade domani`, testo: `${traccia} · ascoltala nell'app N21, poi tocca «Ascoltata» in MB21.`, url: './', tag: `traccia-ascolto-${k.id}` }, 'avviso_ascolto_il');
      }
      if (k.ascoltata && k.segnata_dal_partner && !k.avviso_sponsor_il) {
        await manda(k, [k.user_id], { titolo: `🎧 ${nome} ha ascoltato la traccia`, testo: `${traccia}${k.chiede_prossima_il ? ' · e chiede la prossima' : ''}. Sentitevi!`, url: urlScheda, tag: `traccia-ascoltata-${k.id}` }, 'avviso_sponsor_il');
      }
    }
    return risposta({ tracce: esiti.length, esiti });
  }

  return risposta({ errore: `tipo sconosciuto: ${tipo}` }, 400);
});
