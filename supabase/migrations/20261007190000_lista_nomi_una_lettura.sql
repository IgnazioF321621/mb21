-- ═══════════════════════════════════════════════════════════
-- Fondamenta e Backup, nota 031 → Pagine e Grafica 029 · «una lettura per schermata», prima schermata: Lista Nomi
-- 7 ottobre 2026
-- ═══════════════════════════════════════════════════════════
-- AGGIUNTA: una funzione nuova che l'app online non usa ancora. Preparata con l'ok di Ignazio del 07/10/2026 («procediamo con i nomi»);
-- la applica la Regia al rilascio, insieme a pagina-lista.js che la chiama.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21).
--
-- Perché: ogni richiesta all'app costa ~2,6 KB di registro su Supabase (misura del 07/10, nota 031): conta il numero di richieste.
-- Oggi aprire la Lista Nomi fa 7 richieste per un partner (lista, biglietti, CEP, coppie, BBS, WES, utenti dell'app) e 15 per l'Admin
-- (la lista a pagine da 1.000). Questa funzione restituisce tutto in una risposta sola: 1 richiesta al posto di 7-15.
--
-- Come: SECURITY INVOKER, cioè gira con i permessi di chi chiama. Le regole di accesso (RLS) di contatti, biglietti, cep, bbs, wes
-- valgono esattamente come oggi: ogni partner riceve gli stessi dati che riceveva con le 7 letture separate, l'Admin tutto.
-- Le letture dentro sono le stesse di pagina-lista.js (leggiListaPagine, leggiTarghe, leggiUsoApp), con gli stessi campi e lo stesso ordine.
-- Chi non è entrato (anon) non può eseguirla (regola CLAUDE.md § 4, nota Fondamenta 005); e comunque non vedrebbe nulla.
--
-- Uso dall'app:  const { data } = await supa.rpc('lista_nomi');   → { righe, biglietti, cep, coppie, bbs, wes, uso_app }
-- Per tornare indietro: `drop function public.lista_nomi();` (pagina-lista.js, se la funzione manca, rilegge come prima).
-- ═══════════════════════════════════════════════════════════

create or replace function public.lista_nomi() returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    -- la Lista intera (vista contatti_lista, già filtrata dalle regole di accesso di contatti), in ordine di id come le pagine di oggi
    'righe',     coalesce((select jsonb_agg(to_jsonb(l) order by l.id) from public.contatti_lista l), '[]'::jsonb),
    -- targhette BBS · WES · CEP e coppie: gli stessi campi di leggiTarghe
    'biglietti', coalesce((select jsonb_agg(jsonb_build_object('contatto_id', b.contatto_id, 'tipo', b.tipo, 'evento', b.evento,
                                                               'contatto', b.contatto, 'compagno', b.compagno, 'ospiti', b.ospiti))
                             from public.biglietti b), '[]'::jsonb),
    'cep',       coalesce((select jsonb_agg(jsonb_build_object('contatto_id', p.contatto_id, 'dal', p.dal, 'uscito_il', p.uscito_il))
                             from public.cep p), '[]'::jsonb),
    'coppie',    coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'compagno_id', c.compagno_id, 'compagno_nome', c.compagno_nome))
                             from public.contatti c where c.compagno_id is not null or c.compagno_nome is not null), '[]'::jsonb),
    'bbs',       coalesce((select jsonb_agg(jsonb_build_object('data', e.data)) from public.bbs e), '[]'::jsonb),
    'wes',       coalesce((select jsonb_agg(jsonb_build_object('data', e.data)) from public.wes e), '[]'::jsonb),
    -- schede che sono utenti dell'app (targhetta 📱): la stessa funzione di oggi
    'uso_app',   coalesce((select jsonb_agg(to_jsonb(s)) from public.schede_utenti_app() s), '[]'::jsonb)
  );
$$;
revoke execute on function public.lista_nomi() from public, anon;
grant execute on function public.lista_nomi() to authenticated;
comment on function public.lista_nomi() is 'Pagine 029 / Fondamenta 031: tutto quello che la Lista Nomi legge all''apertura, in una richiesta sola (security invoker: le regole di accesso valgono come per le letture separate).';
