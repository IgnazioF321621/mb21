-- Nota Pagine 194 (feedback di Ignazio 17/11: «quando [la partner] fissa un appuntamento in cui ci devo essere pure io deve poter spuntare … da mettere nel
-- mio calendario e quindi da poter essere accettato da me»; risposta: «l'app la usiamo solo io e [la partner]… può essere soltanto noi due»).
-- SOLO AGGIUNTE (§ 4): tre funzioni nuove; condividi_azione, impegni_ricevuti_di, le tabelle e le regole di accesso restano come sono.
-- Chi organizza un appuntamento con un prospect o un cliente (chi non può riceverlo: condividi_azione vale solo per un Partner con l'app) lo può mandare
-- anche all'altro utente con l'app della sua stessa linea: lo sponsor diretto o la persona sponsorizzata direttamente (squadra.sponsor_id). Si usa lo
-- stesso campo azioni.condiviso_con: chi riceve lo trova nella sua Agenda e nel calendario e risponde «Partecipi?» (impegni_ricevuti_di, impegni_risposte).
-- Un destinatario solo per appuntamento, come oggi.

-- interna: gli utenti con l'app nella stessa linea di p_utente (sponsor diretto o sponsorizzati diretti), con il nome da mostrare
create or replace function public.altri_in_linea_di(p_utente uuid)
returns table (id uuid, nome text)
language sql stable security definer set search_path = public as $$
  select o.id, coalesce(nullif(o.nome, ''), o.nome_cognome)
    from public.utenti me
    join public.utenti o on o.id <> me.id and o.accesso_attivo and o.eliminato_il is null and o.partner_id is not null
   where me.id = p_utente and me.partner_id is not null
     and exists (select 1 from public.squadra s
                  where (s.partner_id = me.partner_id and s.sponsor_id = o.partner_id)
                     or (s.partner_id = o.partner_id and s.sponsor_id = me.partner_id))
   order by 2;
$$;
revoke execute on function public.altri_in_linea_di(uuid) from public, anon, authenticated;
grant execute on function public.altri_in_linea_di(uuid) to service_role;

-- per l'app: a chi posso mandare anche i miei appuntamenti (chi chiama = l'utente entrato)
create or replace function public.altro_in_linea()
returns table (id uuid, nome text)
language sql stable security definer set search_path = public as $$
  select l.id, l.nome from public.altri_in_linea_di(public.utente_corrente()) l where public.utente_corrente() is not null;
$$;
revoke execute on function public.altro_in_linea() from public, anon;
grant execute on function public.altro_in_linea() to authenticated, service_role;

-- manda (p_utente) o non manda più (p_utente null) un mio appuntamento all'altro della mia linea
create or replace function public.condividi_azione_con(p_azione uuid, p_utente uuid, p_punti boolean default false)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  io uuid := public.utente_corrente();
  a record;
  nome_dest text;
begin
  if io is null then raise exception 'Non sei entrato'; end if;
  select * into a from public.azioni where id = p_azione;
  if a is null or (a.user_id <> io and not public.is_admin()) then return jsonb_build_object('esito', 'non_tua'); end if;
  if p_utente is null then
    update public.azioni set condiviso_con = null, punti_condivisi = false where id = p_azione;
    return jsonb_build_object('esito', 'ok');
  end if;
  if a.condiviso_con is not null and a.condiviso_con <> p_utente then return jsonb_build_object('esito', 'gia_condiviso'); end if;
  select l.nome into nome_dest from public.altri_in_linea_di(a.user_id) l where l.id = p_utente;
  if nome_dest is null then return jsonb_build_object('esito', 'non_in_linea'); end if;
  update public.azioni set condiviso_con = p_utente, punti_condivisi = coalesce(p_punti, false) where id = p_azione;
  return jsonb_build_object('esito', 'ok', 'nome', nome_dest, 'utente', p_utente);
end $$;
revoke execute on function public.condividi_azione_con(uuid, uuid, boolean) from public, anon;
grant execute on function public.condividi_azione_con(uuid, uuid, boolean) to authenticated, service_role;
