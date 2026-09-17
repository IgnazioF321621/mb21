// MB21 · avvisi push sul telefono (cantiere 24): riquadro «🔔 Avvisi» in Dashboard.
// Ogni dispositivo che dice «sì» diventa una riga in avvisi_dispositivi; spedisce la funzione Edge «avvisi».
// Su iPhone/iPad gli avvisi funzionano solo con l'app aggiunta alla schermata Home (iOS 16.4+).
const VAPID_PUBLIC = 'BPVIFab868X7amUZYY9wyHmCZxxi4jtSUjg9dona5Hs71odbvcP27p60X4Wg3POsIcqubQ3u8DKWg1ODF2mxuBU';   // chiave pubblica: identifica MB21 presso il servizio push (la privata sta su Supabase)
const AV = { stato: null, dispositivi: [] };

const avvisiSupportati = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const appInstallata = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const eIphone = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function base64aBytes(s) {
  const b = atob((s + '='.repeat((4 - s.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(b, c => c.charCodeAt(0));
}

function nomeDispositivo() {
  const ua = navigator.userAgent;
  const cosa = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Computer';
  const dove = /Edg\//.test(ua) ? 'Edge' : /Firefox/.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : 'browser';
  return cosa + ' · ' + dove + (appInstallata() ? ' · app' : '');
}

// Stato di questo dispositivo: 'no_supporto' · 'da_installare' (iPhone dal browser) · 'negato' · 'acceso' · 'spento'
async function leggiStatoAvvisi() {
  if (!avvisiSupportati()) return (AV.stato = eIphone() && !appInstallata() ? 'da_installare' : 'no_supporto');
  if (Notification.permission === 'denied') return (AV.stato = 'negato');
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  AV.sub = sub;
  return (AV.stato = sub ? 'acceso' : 'spento');
}

async function attivaAvvisi() {
  const permesso = await Notification.requestPermission();
  if (permesso !== 'granted') { AV.stato = permesso === 'denied' ? 'negato' : 'spento'; return mostraToast('Senza il permesso non posso mandare avvisi'); }
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64aBytes(VAPID_PUBLIC) });
  const j = sub.toJSON();
  const { error } = await dbq('registra dispositivo', supa.from('avvisi_dispositivi').upsert(
    { user_id: ST.utente.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, dispositivo: nomeDispositivo() }, { onConflict: 'endpoint' }));
  if (error) { await sub.unsubscribe(); return mostraToast(error.message || 'Non registrato: riprova.'); }
  AV.sub = sub; AV.stato = 'acceso';
  mostraToast('Avvisi accesi su questo dispositivo ✅');
  await mandaAvvisoDiProva();
}

async function spegniAvvisi() {
  if (AV.sub) {
    await dbq('togli dispositivo', supa.from('avvisi_dispositivi').delete().eq('endpoint', AV.sub.endpoint));
    await AV.sub.unsubscribe();
  }
  AV.sub = null; AV.stato = 'spento';
  mostraToast('Avvisi spenti su questo dispositivo');
}

// Chiede alla funzione Edge di mandare «Avvisi accesi ✓» ai dispositivi di chi è entrato
async function mandaAvvisoDiProva() {
  const { data, error } = await supa.functions.invoke('avvisi', { body: { tipo: 'prova' } });
  if (error || !data || data.errore) return mostraToast('Avviso di prova non partito: ' + ((data && data.errore) || (error && error.message) || 'riprova'));
  mostraToast(data.ok ? 'Avviso di prova inviato: guarda le notifiche' : 'Nessun dispositivo ha ricevuto l\'avviso');
}

function riquadroAvvisi() {
  const s = AV.stato;
  if (!s) return '';
  const testi = {
    no_supporto: 'Questo browser non supporta gli avvisi. Su iPhone/iPad servono l\'app sulla schermata Home e iOS 16.4 o più recente.',
    da_installare: 'Su iPhone/iPad gli avvisi arrivano solo dall\'app sulla schermata Home: in Safari tocca <b>Condividi</b> → <b>Aggiungi alla schermata Home</b>, poi apri MB21 da lì.',
    negato: 'Gli avvisi sono bloccati per MB21: riaccendili nelle Impostazioni del telefono (Notifiche → MB21) e riapri l\'app.',
    acceso: 'Accesi su questo dispositivo: alle <b>22</b> ti ricordo il Check del Giorno se non l\'hai ancora fatto.',
    spento: 'Alle <b>22</b> un promemoria per il Check del Giorno, anche con l\'app chiusa. Ogni dispositivo si accende da solo.',
  };
  const bottoni = s === 'acceso'
    ? '<div class="riga"><button class="link" id="av-prova">Manda un avviso di prova</button><button class="link" id="av-spegni">Spegni</button></div>'
    : s === 'spento' ? '<div class="riga"><button class="primario" id="av-attiva">Attiva gli avvisi</button></div>' : '';
  return `<div class="banner-big avvisi"><b>🔔 Avvisi sul telefono</b><small>${testi[s]}</small>${bottoni}</div>`;
}

function collegaAvvisi() {
  const su = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = () => { el.disabled = true; fn().catch(e => mostraToast(e.message || 'Errore')).finally(() => { ST.tab = 'oggi'; mostraTab(); }); }; };
  su('av-attiva', attivaAvvisi);
  su('av-spegni', spegniAvvisi);
  su('av-prova', mandaAvvisoDiProva);
}
