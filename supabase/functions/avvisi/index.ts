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
//      allo sponsor «⏳ La traccia di Mario scade domani: può essere il momento di ricordarglielo» (condivisioni.avviso_48_il) e, se la persona usa MB21
//      (utenti.partner_id = contatti.codice_amway), a lei «⏳ La traccia che ti ha mandato Ignazio scade domani: ascoltala»
//      (avviso_ascolto_il). Quando è il partner a segnare «ascoltata» dalla sua Dashboard (segnata_dal_partner), allo sponsor
//      «🎧 Isabella ha ascoltato "…" e chiede la prossima. Può essere il momento di sentirvi!» (avviso_sponsor_il; «chiede la prossima» se chiede_prossima_il).
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
//  02/10 (Ignazio: «gli avvisi sono veramente tanti»): meno avvisi. Il Buongiorno parte solo se oltre alle telefonate c'è altro (appuntamenti, riordini);
//   il Training non ha più l'avviso a parte; la sera è UN avviso solo (regole.ts → messaggioSera): Check, complimenti, domani, Training e obiettivi.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { scelta, eMomentoPrima, titoloPrima, coseConOra, chiaveAvviso, riepilogoDomani, complimentiDelGiorno, messaggioSera, avvisoObiettivi, invitoObiettivi, haObiettivi, raggruppaVicini, raggruppaPerUtente, elencoImpegni, oraMinuti, FINESTRA_VICINI, type Impegno, oraDi as oraRomaDi, giornoDi as giornoRomaDi, type ConOra, type Cosa, type Voce as VoceModello, type Modello } from './regole.ts';

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
    const esito = await spedisciA([u.id], { titolo: 'MB21 · Avvisi accesi ✓', testo: `Da stasera, alle ${scelta(u.avvisi_quando, 'check')}, arriva il ricordo per «Il mio giorno».`, url: './', tag: 'prova' });
    return risposta(esito);
  }

  // L'invito agli obiettivi mandato a mano dall'Admin (nota 040, 02/10): persona per persona, mai «a tutti», e non insistente:
  // niente se ha già gli obiettivi o ha toccato «Non questo mese», niente se non ha gli avvisi accesi, e un invio ogni 3 giorni.
  //   { tipo: 'obiettivi_admin', azione: 'stato' }            → { ultimi: { <utente>: <quando è stato mandato> } }
  //   { tipo: 'obiettivi_admin', azione: 'manda', utente: id } → { esito: 'mandato' | 'avvisi_spenti' | 'ha_gia_gli_obiettivi' | 'non_questo_mese' | 'gia_mandato', ultimo? }
  if (tipo === 'obiettivi_admin') {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: { user } } = await db.auth.getUser(token);
    if (!user) return risposta({ errore: 'non autorizzato' }, 401);
    const { data: io } = await db.from('utenti').select('id, ruolo').eq('auth_id', user.id).is('eliminato_il', null).maybeSingle();
    if (!io || io.ruolo !== 'Admin') return risposta({ errore: 'solo l\'Admin' }, 403);
    const oggi = giornoRomaDi(Date.now()), mese = `${oggi.slice(0, 8)}01`, prefisso = `obiettivi-admin:${mese}:`;
    const { data: mandati, error: em } = await db.from('avvisi_mandati').select('chiave, mandato_il').like('chiave', `${prefisso}%`);
    if (em) return risposta({ errore: em.message }, 500);
    const ultimi: Record<string, string> = {};
    for (const m of mandati ?? []) ultimi[m.chiave.slice(prefisso.length)] = m.mandato_il;
    if (corpo.azione === 'stato') return risposta({ ultimi });
    if (corpo.azione !== 'manda' || !corpo.utente) return risposta({ errore: 'richiesta non valida' }, 400);
    const [{ data: p }, { data: ob }, { data: salto }] = await Promise.all([
      db.from('utenti').select('id, ruolo, accesso_attivo').eq('id', corpo.utente).is('eliminato_il', null).maybeSingle(),
      db.from('obiettivi_mese').select('*').eq('user_id', corpo.utente).eq('mese', mese).maybeSingle(),
      db.from('obiettivi_salto').select('user_id').eq('user_id', corpo.utente).eq('mese', mese).maybeSingle(),
    ]);
    if (!p || p.ruolo === 'Admin' || !p.accesso_attivo) return risposta({ errore: 'utente non valido' }, 400);
    if (salto) return risposta({ esito: 'non_questo_mese' });
    if (haObiettivi(ob)) return risposta({ esito: 'ha_gli_obiettivi' });
    const ultimo = ultimi[corpo.utente];
    if (ultimo && Date.now() - Date.parse(ultimo) < 3 * 86400000) return risposta({ esito: 'gia_mandato', ultimo });
    const invito = invitoObiettivi(oggi);
    const spedito = await spedisciA([corpo.utente], { titolo: invito.titolo, testo: invito.testo, url: './', tag: 'obiettivi' });
    if (!spedito.dispositivi) return risposta({ esito: 'avvisi_spenti' });
    const adesso = new Date().toISOString();
    await db.from('avvisi_mandati').upsert({ chiave: prefisso + corpo.utente, user_id: corpo.utente, mandato_il: adesso }, { onConflict: 'chiave' });
    return risposta({ esito: 'mandato', ultimo: adesso, ...spedito });
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
    // 24/09 («Domani hai…», lista Avvisi di MB App): un avviso solo la sera. Check non fatto → «Hai fatto il Check?» con in fondo
    // gli impegni di domani; Check fatto → «📅 Domani hai…», solo se domani c'è qualcosa (appuntamenti e telefonate in agenda, mai Riordini).
    const oggi = oggiAdesso, domani = giornoRoma(giornoRomaDi(adessoVero + 86400000)), ilGiornoDopo = giornoRomaDi(adessoVero + 86400000);
    const [{ data: attivi, error: e1 }, { data: fatti, error: e2 }, { data: app, error: e3 }, { data: daCoda, error: e4 }, { data: tel, error: e5 }, { data: conti, error: e6 }, { data: vend, error: e7 }, { data: obMese, error: e8 }, { data: giaRifatto, error: e9 }, { data: saltati, error: e10 }, { data: allenati, error: e11 }, { data: carte, error: e12 }] = await Promise.all([
      db.from('utenti').select('id').eq('accesso_attivo', true).is('eliminato_il', null),
      db.from('check_giorno').select('user_id').eq('data', oggi),
      db.from('azioni').select('user_id, contatto_id, inizio, tipo_azione, modalita, contatti(nome)').neq('tipo_azione', 'Contatto').eq('completata', false).gte('inizio', domani.inizio).lt('inizio', domani.fine),
      db.from('azioni').select('user_id, contatto_id, data_scelta, esito, contatti(nome)').eq('tipo_azione', 'Contatto').in('esito', ['PM Fissato', 'Appuntamento']).gte('data_scelta', domani.inizio).lt('data_scelta', domani.fine),
      db.from('azioni').select('id, user_id, inizio, fine, contatti(nome)').eq('tipo_azione', 'Contatto').eq('completata', false).is('esito', null).gte('inizio', domani.inizio).lt('inizio', domani.fine),
      // 30/09 i complimenti: la giornata già scritta, contata come la Dashboard (viste azioni_conti e vendite_conti, giorno di Roma)
      db.from('azioni_conti').select('user_id, esito, contatti, pm').eq('giorno', oggi),
      db.from('vendite_conti').select('user_id, contatto_id').eq('conta_il', oggi),
      // 01/10 gli obiettivi del mese: chi li ha già impostati e a chi è già stato mandato il «rifalli» (segno in avvisi_mandati)
      db.from('obiettivi_mese').select('*').eq('mese', `${oggi.slice(0, 8)}01`),
      db.from('avvisi_mandati').select('chiave').like('chiave', `obiettivi-rifai:${oggi.slice(0, 7)}:%`),
      db.from('obiettivi_salto').select('user_id').eq('mese', `${oggi.slice(0, 8)}01`),   // 02/10 chi ha toccato «Non questo mese»
      // 02/10 il Training nella sera: chi si è già allenato oggi (complimenti) e le carte di ognuno (da ripassare)
      db.from('training_giorni').select('user_id').eq('giorno', oggi),
      db.from('training_carte').select('user_id, prossima'),
    ]);
    const err = e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8 || e9 || e10 || e11 || e12;
    if (err) return risposta({ errore: err.message }, 500);
    const nome = (x: { contatti: unknown }) => (x.contatti as { nome?: string } | null)?.nome || '—';
    const veri = new Set((app ?? []).map(x => `${x.contatto_id}|${Date.parse(x.inizio)}`));   // senza doppioni della coda, come il promemoria
    const impegni: (Impegno & { user_id: string })[] = [
      ...(app ?? []).map(x => ({ user_id: x.user_id, inizio: Date.parse(x.inizio), testo: `${x.modalita || x.tipo_azione} · ${nome(x)}`, telefonata: false })),
      ...(daCoda ?? []).filter(x => !veri.has(`${x.contatto_id}|${Date.parse(x.data_scelta)}`))
        .map(x => ({ user_id: x.user_id, inizio: Date.parse(x.data_scelta), testo: `${x.esito === 'PM Fissato' ? 'PM' : 'Appuntamento'} · ${nome(x)}`, telefonata: false })),
      ...(await senzaRiordini((tel ?? []) as Telefonata[])).map(x => ({ user_id: x.user_id, inizio: Date.parse(x.inizio), testo: `Telefonata · ${nomeDi(x)}`, telefonata: true })),
    ];
    const giaFatto = new Set((fatti ?? []).map(x => x.user_id));
    const esiti: Record<string, unknown>[] = [];
    for (const { id } of attivi ?? []) {
      if (!corpo.forza && quando(id, 'check') !== oraAdesso) continue;
      const d = riepilogoDomani(impegni.filter(x => x.user_id === id));
      // il coach guarda la giornata scritta nell'app: se c'è qualcosa la prima riga sono i complimenti, se no niente di inventato
      const mieiConti = (conti ?? []).filter(x => x.user_id === id);
      const mieCarte = (carte ?? []).filter(c => c.user_id === id);
      const allenato = (allenati ?? []).some(x => x.user_id === id);
      const bravo = complimentiDelGiorno({
        contatti: mieiConti.reduce((n, x) => n + (x.contatti || 0), 0),
        fissati: mieiConti.filter(x => x.esito === 'PM Fissato' || x.esito === 'Appuntamento').length,
        pm: mieiConti.reduce((n, x) => n + (x.pm || 0), 0),
        vendite: new Set((vend ?? []).filter(x => x.user_id === id).map(x => x.contatto_id)).size,
        training: allenato,
      });
      // gli obiettivi del mese: una riga dentro lo stesso avviso (02/10: un avviso solo, niente avviso a parte)
      let ob = avvisoObiettivi(oggi, (obMese ?? []).find(x => x.user_id === id), (saltati ?? []).some(x => x.user_id === id));
      const chiaveRifai = `obiettivi-rifai:${oggi.slice(0, 7)}:${id}`;
      if (ob?.rifai && (giaRifatto ?? []).some(x => x.chiave === chiaveRifai)) ob = null;
      const avviso = messaggioSera({
        bravo, checkFatto: giaFatto.has(id), domani: d, ilGiornoDopo, obiettivi: ob,
        training: allenato ? 'fatto' : mieCarte.length ? 'da_fare' : 'mai', daRipassare: mieCarte.filter(c => c.prossima && c.prossima <= oggi).length,
      });
      if (!avviso) continue;   // Check fatto, domani niente, niente da consigliare: si tace
      if (corpo.prova) { esiti.push({ utente: id, ...avviso }); continue; }
      esiti.push({ utente: id, ...(await spedisciA([id], avviso)) });
      if (ob?.rifai) await db.from('avvisi_mandati').upsert({ chiave: chiaveRifai, user_id: id }, { onConflict: 'chiave', ignoreDuplicates: true });
    }
    return risposta({ oggi, ora: oraAdesso, utenti: esiti.length, esiti: corpo.prova ? esiti : undefined });
  }

  // Il Training non ha più un avviso a parte (02/10, Ignazio: «gli avvisi sono veramente tanti»): lo ricorda o lo festeggia l'avviso della sera (`check_sera`).

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
      const riordini = riordiniDi.filter(id => id === u.id).length;
      // 02/10 (Ignazio: «gli avvisi sono veramente tanti»): il Buongiorno parte solo se oltre alle telefonate c'è altro di programmato
      // (appuntamenti, riordini); con sole telefonate no. Con «0 contatti al giorno» (pausa) vale lo stesso, e senza «0 telefonate».
      const inPausa = u.contatti_al_giorno === 0;
      if (!miei.length && !riordini) continue;
      const pezzi = inPausa ? [] : [plurale(telefonate, 'telefonata', 'telefonate')];
      if (miei.length) pezzi.push(plurale(miei.length, 'appuntamento', 'appuntamenti') + (conferme ? ` (${conferme} da confermare)` : ''));
      const nome = String(u.nome ?? '').trim();   // nome proprio nel titolo (Ignazio 18/09); senza nome resta «Buongiorno!»
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
    const adesso = adessoVero, MASSIMO = 60, MINUTO = 60000, VICINI = FINESTRA_VICINI / MINUTO;
    // si guarda anche i 30 minuti oltre il più lontano momento possibile: chi scatta porta con sé i vicini (02/10, un avviso solo)
    const da = new Date(adesso - 5 * MINUTO).toISOString(), a = new Date(adesso + (MASSIMO + VICINI + 1) * MINUTO).toISOString();
    const [{ data: appuntamenti, error: e1 }, { data: daCoda, error: e2 }] = await Promise.all([
      db.from('azioni').select('id, user_id, contatto_id, inizio, tipo_azione, modalita, esito, contatti(nome)').neq('tipo_azione', 'Contatto').eq('completata', false).is('promemoria_il', null).gte('inizio', da).lt('inizio', a),
      db.from('azioni').select('id, user_id, contatto_id, data_scelta, tipo_azione, modalita, esito, contatti(nome)').eq('tipo_azione', 'Contatto').in('esito', ['PM Fissato', 'Appuntamento']).is('promemoria_il', null).gte('data_scelta', da).lt('data_scelta', a),
    ]);
    if (e1 || e2) return risposta({ errore: (e1 || e2)!.message }, 500);
    const veri = new Set((appuntamenti ?? []).map(x => `${x.contatto_id}|${Date.parse(x.inizio)}`));
    const tutti = [...(appuntamenti ?? []), ...(daCoda ?? []).filter(x => !veri.has(`${x.contatto_id}|${Date.parse(x.data_scelta)}`))];   // senza doppioni della coda

    // Tutti gli impegni della finestra, di ogni tipo, come «voci»; `due` = è il momento (la scelta di minuti di ognuno). Poi si raggruppano i vicini.
    type Voce = { utente: string; inizio: number; due: boolean; riga: string; testo: string; titoloExtra?: string; url: string; tag: string; giorno: string; azioni: string[]; chiavi: { chiave: string; user_id: string }[] };
    const voci: Voce[] = [];
    for (const az of tutti) {
      const nome = (az.contatti as unknown as { nome?: string } | null)?.nome || '—';
      const cosa = az.tipo_azione === 'Contatto' ? (az.esito === 'PM Fissato' ? 'PM' : 'Appuntamento') : (az.modalita || az.tipo_azione);
      const ore = az as unknown as { inizio?: string; data_scelta?: string };   // appuntamento vero (inizio) o dalla coda (data_scelta)
      const iso = (az.tipo_azione === 'Contatto' ? ore.data_scelta : ore.inizio) ?? '';
      const inizio = Date.parse(iso);
      voci.push({ utente: az.user_id, inizio, due: eMomentoPrima(inizio, quando(az.user_id, 'appuntamenti'), adesso), riga: `${cosa} · ${nome}`, testo: `${cosa} · ${nome}`,
        url: `./?apri=agenda&azione=${az.id}`, tag: `promemoria-${az.id}`, giorno: giornoDi(iso), azioni: [az.id], chiavi: [] });
    }
    // Le telefonate in Agenda: si guarda fino a 3 ore oltre per prendere tutto il giro (quelle una dietro l'altra sono UN impegno); il momento è quello della PRIMA
    const { data: tel, error: e3 } = await db.from('azioni').select('id, user_id, inizio, fine, contatti(nome)').eq('tipo_azione', 'Contatto').eq('completata', false)
      .is('esito', null).is('promemoria_il', null).gte('inizio', da).lt('inizio', new Date(adesso + (MASSIMO + 180) * MINUTO).toISOString());
    if (e3) return risposta({ errore: e3.message }, 500);
    for (const giro of giriDiTelefonate(await senzaRiordini((tel ?? []) as Telefonata[]))) {
      const inizio = Date.parse(giro[0].inizio);
      voci.push({ utente: giro[0].user_id, inizio, due: eMomentoPrima(inizio, quando(giro[0].user_id, 'telefonate'), adesso),
        riga: giro.length === 1 ? `Telefonata · ${nomeDi(giro[0])}` : `${giro.length} telefonate: ${elencoNomi(giro)}`,
        testo: giro.length === 1 ? `Telefonata · ${nomeDi(giro[0])}` : `dalle ${oraDi(giro[0].inizio)}: ${elencoNomi(giro)}`,
        titoloExtra: giro.length === 1 ? undefined : ` · ${giro.length} telefonate`,
        url: giro.length === 1 ? `./?apri=agenda&azione=${giro[0].id}` : `./?apri=agenda&giorno=${giornoDi(giro[0].inizio)}`,
        tag: `promemoria-${giro[0].id}`, giorno: giornoDi(giro[0].inizio), azioni: giro.map(x => x.id), chiavi: [] });
    }
    // Cantiere 43: le cose da fare con l'ora e le voci dei modelli (stessa regola della Timeline di MB Plan: `coseConOra` in regole.ts). Oggi, e domani se è vicino.
    const giorni = [...new Set([oggiAdesso, giornoRomaDi(adesso + (MASSIMO + VICINI + 1) * MINUTO)])];
    const [{ data: cose, error: e4 }, { data: vociModelli, error: e5 }, { data: modelli, error: e6 }] = await Promise.all([
      db.from('cose_da_fare').select('id, user_id, testo, giorno, ora, fatto_il, modello_id, core, scala').in('giorno', giorni),
      db.from('modello_giorno').select('id, user_id, testo, giorni, attivo, core, modello_id, ora').not('modello_id', 'is', null).is('core', null),
      db.from('modelli').select('id, attivo, scala'),
    ]);
    if (e4 || e5 || e6) return risposta({ errore: (e4 || e5 || e6)!.message }, 500);
    const dellaFinestra = giorni.flatMap(g => coseConOra((cose ?? []) as Cosa[], (vociModelli ?? []) as VoceModello[], (modelli ?? []) as Modello[], g))
      .filter(x => x.inizio >= adesso - 5 * MINUTO && x.inizio <= adesso + (MASSIMO + VICINI + 1) * MINUTO);
    const { data: mandati, error: e7 } = dellaFinestra.length ? await db.from('avvisi_mandati').select('chiave').in('chiave', dellaFinestra.map(chiaveAvviso)) : { data: [], error: null };
    if (e7) return risposta({ errore: e7.message }, 500);
    const gia = new Set((mandati ?? []).map(m => m.chiave));
    for (const x of dellaFinestra) {
      if (gia.has(chiaveAvviso(x))) continue;   // già avvisata
      voci.push({ utente: x.user_id, inizio: x.inizio, due: eMomentoPrima(x.inizio, quando(x.user_id, x.tipo), adesso), riga: x.testo, testo: `${x.ora} · ${x.testo}`,
        url: `./?apri=agenda&giorno=${x.giorno}`, tag: `cosa-${chiaveAvviso(x)}`, giorno: x.giorno, azioni: [], chiavi: [{ chiave: chiaveAvviso(x), user_id: x.user_id }] });
    }

    // Un avviso per gruppo di vicini: da solo com'era; più di uno «Tra 30 minuti · 3 impegni» con l'elenco con le ore
    const esiti: Record<string, unknown>[] = [];
    for (const gruppo of raggruppaVicini(voci)) {
      const primo = gruppo[0], titolo = titoloPrima(primo.inizio, adesso);
      const avviso = gruppo.length === 1
        ? { titolo: titolo + (primo.titoloExtra ?? ''), testo: primo.testo, url: primo.url, tag: primo.tag }
        : { titolo: `${titolo} · ${gruppo.length} impegni`, testo: elencoImpegni(gruppo), url: `./?apri=agenda&giorno=${primo.giorno}`, tag: primo.tag };
      if (corpo.prova) { esiti.push({ utente: primo.utente, impegni: gruppo.length, ...avviso }); continue; }
      const esito = await spedisciA([primo.utente], avviso);
      const idAzioni = gruppo.flatMap(x => x.azioni), segni = gruppo.flatMap(x => x.chiavi);
      if (idAzioni.length) await db.from('azioni').update({ promemoria_il: new Date().toISOString() }).in('id', idAzioni);
      if (segni.length) await db.from('avvisi_mandati').upsert(segni, { onConflict: 'chiave', ignoreDuplicates: true });
      esiti.push({ impegni: gruppo.length, ...esito });
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
    // Appuntamenti e telefonate che adesso scattano, come «voci»; poi UN avviso per persona (02/10, Ignazio: gli avvisi sono veramente tanti)
    type Voce = { utente: string; inizio: number; riga: string; testo: string; titoloExtra?: string; url: string; tag: string; giorno: string; ids: string[] };
    const voci: Voce[] = [];
    for (const az of data ?? []) {
      const fine = az.fine ? Date.parse(az.fine) : Date.parse(az.inizio) + ORA;
      if (fine + dopo(az.user_id) > adesso) continue;   // dalla fine non è ancora passato il tempo scelto: si aspetta
      const nome = (az.contatti as unknown as { nome?: string } | null)?.nome || '—';
      const testo = `${az.modalita || az.tipo_azione} · ${nome}`;
      voci.push({ utente: az.user_id, inizio: Date.parse(az.inizio), riga: testo, testo, url: `./?apri=agenda&azione=${az.id}&giorno=${giornoDi(az.inizio)}`, tag: `senza-esito-${az.id}`, giorno: giornoDi(az.inizio), ids: [az.id] });
    }
    // Le telefonate in Agenda rimaste senza esito (21/09): quelle di un giro sono un impegno solo, un'ora dopo la fine dell'ULTIMA del giro
    const { data: tel, error: e2 } = await db.from('azioni').select('id, user_id, inizio, fine, contatti(nome)').eq('tipo_azione', 'Contatto').eq('completata', false)
      .is('esito', null).is('senza_esito_avvisato_il', null).gte('inizio', new Date(adesso - 24 * ORA).toISOString()).lt('inizio', new Date(adesso).toISOString());
    if (e2) return risposta({ errore: e2.message }, 500);
    for (const giro of giriDiTelefonate(await senzaRiordini((tel ?? []) as Telefonata[]))) {
      if (fineTelefonata(giro[giro.length - 1]) + dopo(giro[0].user_id) > adesso) continue;   // l'ultima non è finita da abbastanza: si aspetta
      const una = giro.length === 1;
      voci.push({ utente: giro[0].user_id, inizio: Date.parse(giro[0].inizio),
        riga: una ? `Telefonata · ${nomeDi(giro[0])}` : `${giro.length} telefonate: ${elencoNomi(giro)}`, testo: una ? `Telefonata · ${nomeDi(giro[0])}` : elencoNomi(giro),
        titoloExtra: una ? undefined : ` · ${giro.length} telefonate senza esito`,
        url: una ? `./?apri=agenda&azione=${giro[0].id}&giorno=${giornoDi(giro[0].inizio)}` : `./?apri=agenda&giorno=${giornoDi(giro[0].inizio)}`,
        tag: `senza-esito-${giro[0].id}`, giorno: giornoDi(giro[0].inizio), ids: giro.map(x => x.id) });
    }
    const esiti: Record<string, unknown>[] = [];
    for (const gruppo of raggruppaPerUtente(voci)) {
      const primo = gruppo[0];
      const avviso = gruppo.length === 1
        ? { titolo: `❓ Com'è andata?${primo.titoloExtra ?? ''}`, testo: primo.testo, url: primo.url, tag: primo.tag }
        : { titolo: `❓ Com'è andata? · ${gruppo.length} senza esito`, testo: elencoImpegni(gruppo), url: `./?apri=agenda&giorno=${primo.giorno}`, tag: primo.tag };
      if (corpo.prova) { esiti.push({ utente: primo.utente, impegni: gruppo.length, ...avviso }); continue; }
      const esito = await spedisciA([primo.utente], avviso);
      await db.from('azioni').update({ senza_esito_avvisato_il: new Date().toISOString() }).in('id', gruppo.flatMap(x => x.ids));
      esiti.push({ impegni: gruppo.length, ...esito });
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
        if (!k.avviso_48_il) await manda(k, [k.user_id], { titolo: `⏳ La traccia di ${nome} scade domani`, testo: `${traccia} · condivisa 2 giorni fa e non ancora ascoltata: può essere il momento di ricordarglielo, poi si segna qui.`, url: urlScheda, tag: `traccia-48-${k.id}` }, 'avviso_48_il');
        if (partner && !k.avviso_ascolto_il) await manda(k, [partner], { titolo: `⏳ La traccia che ti ha mandato ${sponsor} scade domani`, testo: `${traccia} · si può ascoltare nell'app N21, poi si tocca «Ascoltata» in MB21.`, url: './', tag: `traccia-ascolto-${k.id}` }, 'avviso_ascolto_il');
      }
      if (k.ascoltata && k.segnata_dal_partner && !k.avviso_sponsor_il) {
        await manda(k, [k.user_id], { titolo: `🎧 ${nome} ha ascoltato la traccia`, testo: `${traccia}${k.chiede_prossima_il ? ' · e chiede la prossima' : ''}. Può essere il momento di sentirvi!`, url: urlScheda, tag: `traccia-ascoltata-${k.id}` }, 'avviso_sponsor_il');
      }
    }
    return risposta({ tracce: esiti.length, esiti });
  }

  return risposta({ errore: `tipo sconosciuto: ${tipo}` }, 400);
});
