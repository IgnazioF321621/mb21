// MB21 · funzione Edge «wallet_sync» (nota Admin 013, Ignazio 13/10): l'accesso dedicato della routine «MB21 sincro Wallet».
// Parte pura (provata con node tools/banco/prova_wallet_sync.js, node 23.6+): chiave, azioni, risposte. L'accesso al database è in index.ts.
// Due azioni sole, sempre e solo sull'utente di Ignazio:
//  { azione: 'elenca' }                       → le sue vendite con «come ha pagato» e «incassato» compilati e non ancora mandate
//  { azione: 'segna', id, wallet_id }         → segna la vendita come mandata (wallet_il = oggi di Roma, wallet_id = il movimento in Wallet)
// Niente log con i nomi dei clienti.

export type Vendita = { id: string; data: string; brand: string; prodotto: string; pagato_con: string; incassato: number; provvigione: number | null; cliente: string };
export type Accesso = {
  chiave: string;                                                  // il segreto WALLET_SYNC_KEY (vuoto = funzione chiusa)
  elenca: () => Promise<Vendita[]>;
  segna: (id: string, walletId: string, oggi: string) => Promise<boolean>;   // true = segnata; false = non c'è, non è sua o è già mandata
  adesso?: () => number;
};

export const giornoRoma = (ms: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));

// Confronto a tempo costante: si confrontano le impronte (SHA-256) byte per byte, senza fermarsi al primo diverso.
export async function chiaveGiusta(attesa: string, ricevuta: string): Promise<boolean> {
  if (!attesa || !ricevuta) return false;
  const imp = async (t: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)));
  const [a, b] = [await imp(attesa), await imp(ricevuta)];
  let diverso = 0;
  for (let i = 0; i < a.length; i++) diverso |= a[i] ^ b[i];
  return diverso === 0;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });

export async function gestisci(req: Request, acc: Accesso): Promise<Response> {
  if (req.method !== 'POST') return json({ errore: 'metodo non ammesso' }, 405);
  const intestazione = req.headers.get('Authorization') ?? '';
  const ricevuta = /^Bearer\s+/i.test(intestazione) ? intestazione.replace(/^Bearer\s+/i, '') : '';   // senza «Bearer» non vale
  if (!(await chiaveGiusta(acc.chiave, ricevuta))) return json({ errore: 'non autorizzato' }, 401);
  let corpo: any;
  try { corpo = await req.json(); } catch { return json({ errore: 'richiesta non valida' }, 400); }
  if (corpo && corpo.azione === 'elenca') {
    try { return json({ vendite: await acc.elenca() }); } catch { return json({ errore: 'lettura non riuscita' }, 500); }
  }
  if (corpo && corpo.azione === 'segna') {
    const walletId = typeof corpo.wallet_id === 'string' ? corpo.wallet_id.trim() : '';
    if (typeof corpo.id !== 'string' || !UUID.test(corpo.id)) return json({ errore: 'id vendita non valido' }, 400);
    if (!walletId || walletId.length > 100) return json({ errore: 'wallet_id non valido' }, 400);
    try {
      const oggi = giornoRoma((acc.adesso ?? Date.now)());
      return (await acc.segna(corpo.id, walletId, oggi)) ? json({ segnata: true, wallet_il: oggi }) : json({ errore: 'vendita non trovata o già mandata' }, 409);
    } catch { return json({ errore: 'scrittura non riuscita' }, 500); }
  }
  return json({ errore: 'azione non valida' }, 400);
}
