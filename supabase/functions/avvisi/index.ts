// MB21 · funzione Edge «avvisi» (cantiere 24): spedisce gli avvisi push ai dispositivi registrati.
// Chiamata in due modi:
//  - dall'app, con l'accesso dell'utente: { tipo: 'prova' } → avviso di prova ai suoi dispositivi
//  - dall'orologio di Supabase (pg_cron → chiama_avvisi), con il segreto: { tipo: 'check_sera' }
//    → alle 22 di Roma, «Hai fatto il Check di oggi?» a chi non ha ancora salvato il Check del giorno
//    { tipo: 'mattino' } → alle 9 di Roma (dal cantiere 29; prima alle 8), «Buongiorno! Oggi N telefonate, N appuntamenti (N da confermare) e N riordini da sentire»
//    { tipo: 'promemoria' } → ogni 5 minuti: «Tra 30 minuti: PM 1a1 · Pino Manolo» agli appuntamenti tra 25 e 35 minuti
//      non ancora avvisati (azioni.promemoria_il); con { prova: true } dice cosa manderebbe senza mandare
//    { tipo: 'senza_esito' } → ogni 5 minuti: «Com'è andata? · PM 1a1 · Pino Manolo» un'ora dopo la fine di un appuntamento
//      ancora senza esito, una volta sola (azioni.senza_esito_avvisato_il); non più vecchi di un giorno
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const URL_SUPABASE = Deno.env.get('SUPABASE_URL')!;
const CHIAVE_SERVIZIO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SEGRETO = Deno.env.get('AVVISI_SEGRETO') ?? '';
webpush.setVapidDetails('mailto:ignazio.f@me.com', Deno.env.get('VAPID_PUBLIC')!, Deno.env.get('VAPID_PRIVATE')!);

const db = createClient(URL_SUPABASE, CHIAVE_SERVIZIO, { auth: { persistSession: false } });

const aRoma = (opzioni: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', ...opzioni }).format(new Date());
const oggiRoma = () => aRoma({ year: 'numeric', month: '2-digit', day: '2-digit' });             // «2026-09-17»
const oraRoma = () => Number(aRoma({ hour: '2-digit', hour12: false }).slice(0, 2));             // 0..23
// Inizio e fine del giorno di Roma (ISO): Roma è UTC+2 con l'ora legale, UTC+1 con quella solare
function giornoRoma(giorno: string) {
  const scarto = (new Date(giorno + 'T12:00:00Z').getTime() - new Date(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(giorno + 'T12:00:00Z')).replace(' ', 'T') + 'Z').getTime()) / 3600000;
  const inizio = new Date(new Date(giorno + 'T00:00:00Z').getTime() + scarto * 3600000);
  return { inizio: inizio.toISOString(), fine: new Date(inizio.getTime() + 86400000).toISOString() };
}
const giornoDi = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
const plurale = (n: number, uno: string, tanti: string) => `${n} ${n === 1 ? uno : tanti}`;

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
    const { data: u } = await db.from('utenti').select('id').eq('auth_id', user.id).is('eliminato_il', null).maybeSingle();
    if (!u) return risposta({ errore: 'utente non trovato' }, 403);
    const esito = await spedisciA([u.id], { titolo: 'MB21 · Avvisi accesi ✓', testo: 'Da stasera alle 22 ti ricordo il Check del Giorno.', url: './', tag: 'prova' });
    return risposta(esito);
  }

  // Avvisi dell'orologio: solo con il segreto condiviso
  if (!SEGRETO || req.headers.get('x-avvisi-segreto') !== SEGRETO) return risposta({ errore: 'non autorizzato' }, 401);

  if (tipo === 'check_sera') {
    if (oraRoma() !== 22 && !corpo.forza) return risposta({ saltato: `a Roma sono le ${oraRoma()}, non le 22` });
    const oggi = oggiRoma();
    const [{ data: attivi, error: e1 }, { data: fatti, error: e2 }] = await Promise.all([
      db.from('utenti').select('id').eq('accesso_attivo', true).is('eliminato_il', null),
      db.from('check_giorno').select('user_id').eq('data', oggi),
    ]);
    if (e1 || e2) return risposta({ errore: (e1 || e2)!.message }, 500);
    const giaFatto = new Set((fatti ?? []).map(x => x.user_id));
    const daAvvisare = (attivi ?? []).map(x => x.id).filter(id => !giaFatto.has(id));
    const esito = await spedisciA(daAvvisare, { titolo: '⚡ Hai fatto il Check di oggi?', testo: 'Due minuti per chiudere la giornata: tocca per aprire il Check del Giorno.', url: './?apri=check', tag: 'check_sera' });
    return risposta({ oggi, utenti: daAvvisare.length, ...esito });
  }

  // Riepilogo del mattino (cantiere 24 passo 2): stessi conti della Dashboard, ognuno per la propria agenda
  if (tipo === 'mattino') {
    if (oraRoma() !== 9 && !corpo.forza) return risposta({ saltato: `a Roma sono le ${oraRoma()}, non le 9` });
    const oggi = oggiRoma(), g = giornoRoma(oggi), adesso = Date.now(), limiteConferme = new Date(adesso + 12 * 3600000).toISOString();
    // Riordini da sentire (cantiere 29): STESSA REGOLA di `MB21Agenda.riordiniDaSentire` in agenda.js (qui l'app non arriva, va tenuta uguale a mano):
    // telefonate di riordino nate dalle vendite, senza esito e non completate, da oggi indietro; più quelle importate da Glide
    // (Contatto con glide_id ed esito «Riordino», non completate) dal 1° settembre 2026 (INIZIO_RIORDINI_GLIDE) a oggi.
    const [{ data: attivi, error: e1 }, { data: fatti, error: e2 }, { data: appuntamenti, error: e3 }, { data: daCoda, error: e4 }, { data: vendite, error: e5 }, { data: glide, error: e6 }] = await Promise.all([
      db.from('utenti').select('id, contatti_al_giorno').eq('accesso_attivo', true).is('eliminato_il', null),
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
      const telefonate = Math.max(0, u.contatti_al_giorno - (fatti ?? []).filter(x => x.user_id === u.id).length);
      const miei = tutti.filter(a => a.user_id === u.id);
      const conferme = miei.filter(a => !a.confermato && a.quando > new Date(adesso).toISOString() && a.quando <= limiteConferme).length;
      const pezzi = [plurale(telefonate, 'telefonata', 'telefonate')];
      if (miei.length) pezzi.push(plurale(miei.length, 'appuntamento', 'appuntamenti') + (conferme ? ` (${conferme} da confermare)` : ''));
      const riordini = riordiniDi.filter(id => id === u.id).length;
      if (riordini) pezzi.push(plurale(riordini, 'riordino', 'riordini') + ' da sentire');
      const testo = `Oggi ${pezzi.length > 1 ? pezzi.slice(0, -1).join(', ') + ' e ' + pezzi[pezzi.length - 1] : pezzi[0]}. Tocca per aprire l'Agenda.`;
      esiti.push({ utente: u.id, testo, ...(await spedisciA([u.id], { titolo: '☀️ Buongiorno!', testo, url: './?apri=agenda', tag: 'mattino' })) });
    }
    return risposta({ oggi, utenti: esiti.length, esiti: corpo.forza ? esiti : undefined });
  }

  // Promemoria prima dell'appuntamento (cantiere 24 passo 3): stesso titolo dell'Agenda («PM 1a1 · Pino Manolo»)
  if (tipo === 'promemoria') {
    const ANTICIPO = 30, adesso = Date.now();
    const da = new Date(adesso + (ANTICIPO - 5) * 60000).toISOString(), a = new Date(adesso + (ANTICIPO + 5) * 60000).toISOString();
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
      const quando = az.tipo_azione === 'Contatto' ? az.data_scelta : az.inizio;
      const minuti = Math.round((Date.parse(quando) - adesso) / 60000);
      const testo = `${cosa} · ${nome}`;
      if (corpo.prova) { esiti.push({ azione: az.id, minuti, testo }); continue; }
      const esito = await spedisciA([az.user_id], { titolo: `⏰ Tra ${minuti} minuti`, testo, url: `./?apri=agenda&azione=${az.id}`, tag: `promemoria-${az.id}` });
      await db.from('azioni').update({ promemoria_il: new Date().toISOString() }).eq('id', az.id);
      esiti.push({ azione: az.id, minuti, ...esito });
    }
    return risposta({ appuntamenti: esiti.length, esiti });
  }

  // Appuntamento passato senza esito (cantiere 24 passo 4): un'ora dopo la fine, «Com'è andata?»
  if (tipo === 'senza_esito') {
    const adesso = Date.now(), ORA = 3600000;
    // Candidati: iniziati tra 1 giorno e 1 ora fa (la fine, o l'inizio + 1 ora, deve essere passata da almeno un'ora)
    const { data, error } = await db.from('azioni').select('id, user_id, inizio, fine, tipo_azione, modalita, contatti(nome)')
      .neq('tipo_azione', 'Contatto').eq('completata', false).is('esito', null).is('senza_esito_avvisato_il', null)
      .gte('inizio', new Date(adesso - 24 * ORA).toISOString()).lt('inizio', new Date(adesso - ORA).toISOString());
    if (error) return risposta({ errore: error.message }, 500);
    const esiti: Record<string, unknown>[] = [];
    for (const az of data ?? []) {
      const fine = az.fine ? Date.parse(az.fine) : Date.parse(az.inizio) + ORA;
      if (fine + ORA > adesso) continue;   // è finito da meno di un'ora: si aspetta
      const nome = (az.contatti as unknown as { nome?: string } | null)?.nome || '—';
      const testo = `${az.modalita || az.tipo_azione} · ${nome}`;
      if (corpo.prova) { esiti.push({ azione: az.id, testo }); continue; }
      const esito = await spedisciA([az.user_id], { titolo: '❓ Com\'è andata?', testo, url: `./?apri=agenda&azione=${az.id}&giorno=${giornoDi(az.inizio)}`, tag: `senza-esito-${az.id}` });
      await db.from('azioni').update({ senza_esito_avvisato_il: new Date().toISOString() }).eq('id', az.id);
      esiti.push({ azione: az.id, testo, ...esito });
    }
    return risposta({ appuntamenti: esiti.length, esiti });
  }

  return risposta({ errore: `tipo sconosciuto: ${tipo}` }, 400);
});
