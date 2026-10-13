// MB21 · funzione Edge «wallet_sync» (nota Admin 013): vedi logica.ts. Si pubblica con --no-verify-jwt: la protezione è la chiave segreta
// WALLET_SYNC_KEY (header Authorization: Bearer <chiave>), mai scritta nel repo. Usa la chiave di servizio e tocca SOLO le vendite di Ignazio.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { gestisci, type Vendita } from './logica.ts';

const IGNAZIO = 'c49c1286-7567-461b-b7e8-ef520ccdb9c6';
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

async function elenca(): Promise<Vendita[]> {
  const { data: v, error } = await db.from('vendite').select('id, data, brand, prodotto, pagato_con, incassato, contatto_id')
    .eq('user_id', IGNAZIO).not('pagato_con', 'is', null).not('incassato', 'is', null).is('wallet_il', null).order('data');
  if (error) throw error;
  if (!v.length) return [];
  const [conti, contatti] = await Promise.all([
    db.from('vendite_conti').select('id, provvigione').in('id', v.map(x => x.id)),
    db.from('contatti').select('id, nome').in('id', [...new Set(v.map(x => x.contatto_id))]),
  ]);
  if (conti.error || contatti.error) throw conti.error || contatti.error;
  const prov = new Map(conti.data.map(x => [x.id, x.provvigione])), nomi = new Map(contatti.data.map(x => [x.id, x.nome]));
  return v.map(x => ({ id: x.id, data: x.data, brand: x.brand, prodotto: x.prodotto, pagato_con: x.pagato_con, incassato: Number(x.incassato),
    provvigione: prov.get(x.id) == null ? null : Number(prov.get(x.id)), cliente: nomi.get(x.contatto_id) ?? '' }));
}

async function segna(id: string, walletId: string, oggi: string): Promise<boolean> {
  const { data, error } = await db.from('vendite').update({ wallet_il: oggi, wallet_id: walletId })
    .eq('id', id).eq('user_id', IGNAZIO).is('wallet_il', null).not('pagato_con', 'is', null).not('incassato', 'is', null).select('id');
  if (error) throw error;
  return data.length === 1;
}

Deno.serve(req => gestisci(req, { chiave: Deno.env.get('WALLET_SYNC_KEY') ?? '', elenca, segna }));
