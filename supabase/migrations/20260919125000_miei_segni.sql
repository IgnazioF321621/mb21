-- Cantiere 25 bis lavoro 2 (Ignazio 19/09): nel Profilo ognuno vede e tocca le proprie targhette BBS · WES · CEP.
-- BBS e WES: si accendono, si spengono e si rifanno da soli finché l'evento è in vendita (prima: una risposta sola, correzioni dall'Admin).
-- I segni stanno sulla scheda del partner nella lista dell'Admin, che il partner non legge: per questo `security definer`.

-- I miei segni, GREZZI (le targhette le calcola l'app con `MB21Lista.targheSegni`, la stessa della scheda contatto):
-- { scheda, compagno, bbs, wes, biglietti: [...], cep: [...] } · bbs/wes = evento in vendita (l'ultimo caricato)
-- biglietti e periodi CEP: quelli della propria scheda e della scheda del compagno/a collegato (`mio` = sulla propria scheda)
create function public.miei_segni()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  u public.utenti; sc public.contatti;
begin
  select * into u from public.utenti where id = public.utente_corrente();
  if u.id is null then raise exception 'Utente non abilitato'; end if;
  if u.partner_id is not null then sc := public._scheda_segni(u.partner_id, u.id); end if;
  return jsonb_build_object(
    'scheda', sc.id is not null,
    'compagno', coalesce(sc.compagno_nome, (select nome from public.contatti where id = sc.compagno_id)),
    'bbs', (select max(data) from public.bbs),
    'wes', (select max(data) from public.wes),
    'biglietti', coalesce((select jsonb_agg(jsonb_build_object('tipo', b.tipo, 'evento', b.evento, 'contatto', b.contatto,
        'compagno', b.compagno, 'ospiti', b.ospiti, 'mio', b.contatto_id = sc.id))
      from public.biglietti b where b.contatto_id = sc.id or b.contatto_id = sc.compagno_id), '[]'::jsonb),
    'cep', coalesce((select jsonb_agg(jsonb_build_object('dal', p.dal, 'uscito_il', p.uscito_il, 'mio', p.contatto_id = sc.id))
      from public.cep p where p.contatto_id = sc.id or p.contatto_id = sc.compagno_id), '[]'::jsonb));
end;
$$;

-- Spegne il proprio biglietto dell'evento in vendita (per rifarlo o perché era un errore). La risposta resta:
-- la Dashboard non richiede «Hai il biglietto?», si riaccende dal Profilo.
create function public.togli_mio_biglietto(p_tipo text, p_evento date)
returns void
language plpgsql security definer set search_path = public as $$
declare
  u public.utenti; sc public.contatti; in_vendita date; tolti integer;
begin
  select * into u from public.utenti where id = public.utente_corrente();
  if u.id is null or u.partner_id is null then raise exception 'Non puoi togliere biglietti da qui'; end if;
  if p_tipo = 'BBS' then select max(data) into in_vendita from public.bbs;
  elsif p_tipo = 'WES' then select max(data) into in_vendita from public.wes;
  else raise exception 'Tipo sconosciuto'; end if;
  if in_vendita is null or in_vendita <> p_evento then raise exception 'Questo evento non è più in vendita'; end if;
  sc := public._scheda_segni(u.partner_id, u.id);
  if sc.id is null then raise exception 'Non hai una scheda collegata al tuo codice Amway'; end if;
  delete from public.biglietti where contatto_id = sc.id and tipo = p_tipo and evento = p_evento;
  get diagnostics tolti = row_count;
  if tolti = 0 then raise exception 'Il biglietto non è sulla tua scheda: chiedi all''Admin'; end if;
  insert into public.risposte_biglietto (utente_id, tipo, evento) values (u.id, p_tipo, p_evento) on conflict do nothing;
end;
$$;

revoke all on function public.miei_segni() from public;
revoke all on function public.togli_mio_biglietto(text, date) from public;
grant execute on function public.miei_segni() to authenticated;
grant execute on function public.togli_mio_biglietto(text, date) to authenticated;
