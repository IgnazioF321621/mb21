// MB21 · funzione Edge «avvisi» (cantiere 24): spedisce gli avvisi push ai dispositivi registrati.
// Chiamata in due modi:
//  - dall'app, con l'accesso dell'utente: { tipo: 'prova' } → avviso di prova ai suoi dispositivi
//  - dall'orologio di Supabase (pg_cron → chiama_avvisi), con il segreto: { tipo: 'check_sera' }
//    → alle 22 di Roma, «Hai fatto il Check di oggi?» a chi non ha ancora salvato il Check del giorno
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

  return risposta({ errore: `tipo sconosciuto: ${tipo}` }, 400);
});
