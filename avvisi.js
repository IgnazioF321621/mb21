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

// «Non ora» (Ignazio 17/09): il riquadro sparisce per 7 giorni su questo dispositivo, poi si ripresenta
const NON_ORA_GIORNI = 7, CHIAVE_NON_ORA = 'mb21_avvisi_non_ora';
function rimandato() { try { return Date.now() < Number(localStorage.getItem(CHIAVE_NON_ORA) || 0); } catch (e) { return false; } }
async function nonOra() { try { localStorage.setItem(CHIAVE_NON_ORA, String(Date.now() + NON_ORA_GIORNI * 86400000)); } catch (e) { /* senza memoria: torna alla prossima apertura */ } }

// Riquadro in alto: solo quando gli avvisi sono spenti e non si è detto «Non ora»
function riquadroAvvisi() {
  if (AV.stato !== 'spento' || rimandato()) return '';
  return `<div class="banner-big avvisi"><b>🔔 Avvisi sul telefono</b>
    <small>Alle <b>8</b> il riepilogo della giornata (telefonate e appuntamenti) e alle <b>22</b> il promemoria per il Check del Giorno, anche con l'app chiusa. Ogni dispositivo si accende da solo.</small>
    <div class="riga"><button class="primario" id="av-attiva">Attiva gli avvisi</button><button class="link" id="av-nonora">Non ora</button></div></div>`;
}

// Riga piccola in fondo alla Dashboard, accanto a «Cambia password»: c'è sempre (tranne dove gli avvisi non esistono)
function rigaAvvisi() {
  const s = AV.stato, b = (id, t) => `<button class="link" id="${id}">${t}</button>`;
  const testi = {
    acceso: `🔔 Avvisi accesi · ${b('av-spegni', 'Spegni')} · ${b('av-prova', 'Prova')}`,
    spento: `🔔 Avvisi spenti · ${b('av-attiva', 'Attiva')}`,
    da_installare: '🔔 Avvisi: aggiungi MB21 alla schermata Home (Condividi → Aggiungi alla schermata Home) per riceverli',
    negato: '🔔 Avvisi bloccati: riaccendili nelle Impostazioni del telefono (Notifiche → MB21)',
  };
  return testi[s] ? `<div class="riga-avvisi">${testi[s]}</div>` : '';
}

function collegaAvvisi() {
  const su = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = () => { el.disabled = true; fn().catch(e => mostraToast(e.message || 'Errore')).finally(() => { ST.tab = 'oggi'; mostraTab(); }); }; };
  su('av-attiva', attivaAvvisi);
  su('av-spegni', spegniAvvisi);
  su('av-prova', mandaAvvisoDiProva);
  su('av-nonora', nonOra);
}
