-- ════════════════════════════════════════════════════════════════════════════
-- «Dove» (Ignazio 05/10/2026, dopo il rilascio delle 15:01): un campo solo nel modulo, link se è online, posto se è dal vivo.
--   `luogo`: il posto o l'indirizzo (hotel, sala…) di un appuntamento (`azioni`) o di una serata (`spazi`), fino a 200 caratteri; l'app lo apre nelle Mappe.
--   Il link resta in `link` (migrazione 20261005120000). Chi riceve lo vede (impegni_ricevuti / impegni_ricevuti_di ora danno anche `luogo`;
--   le due funzioni cambiano tipo di risposta, quindi si tolgono e si rifanno uguali con la colonna in più) e il feed `calendario` lo mette in LOCATION.
-- Aggiunte facoltative; da applicare al rilascio insieme alla nuova funzione Edge `calendario`.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.azioni add column if not exists luogo text check (luogo is null or length(luogo) <= 200);
alter table public.spazi  add column if not exists luogo text check (luogo is null or length(luogo) <= 200);

drop function if exists public.impegni_ricevuti(timestamptz, timestamptz);
drop function if exists public.impegni_ricevuti_di(uuid, timestamptz, timestamptz);

create function public.impegni_ricevuti_di(p_utente uuid, p_da timestamptz, p_a timestamptz)
returns table (origine text, id uuid, inizio timestamptz, fine timestamptz, titolo text, tipo text, da_utente uuid, da_nome text,
               link text, luogo text, punti jsonb, punti_condivisi boolean, visto_il timestamptz, risposta text)
language sql stable security definer set search_path = public as $$
  with me as (select u.id, u.partner_id from public.utenti u where u.id = p_utente)
  select 'azione', a.id, a.inizio, coalesce(a.fine, a.inizio + interval '1 hour'),
         coalesce(a.modalita, a.tipo_azione), a.tipo_azione, a.user_id, coalesce(nullif(o.nome, ''), o.nome_cognome),
         a.link, a.luogo, case when a.punti_condivisi then a.punti end, a.punti_condivisi, r.visto_il, r.risposta
    from public.azioni a
    join public.utenti o on o.id = a.user_id
    left join public.impegni_risposte r on r.origine = 'azione' and r.impegno_id = a.id and r.utente_id = p_utente
   where a.condiviso_con = p_utente and a.user_id <> p_utente and a.inizio >= p_da and a.inizio < p_a
  union all
  select 'spazio', s.id, s.inizio, s.inizio + make_interval(mins => coalesce(s.durata, 60)),
         coalesce(nullif(s.nome, ''), case s.tipo when 'Team' then 'Incontro di Team' when 'LOS' then 'Incontro LdS' else s.tipo end), s.tipo,
         s.user_id, coalesce(nullif(o.nome, ''), o.nome_cognome),
         s.link, s.luogo, case when s.punti_condivisi then s.punti end, s.punti_condivisi, r.visto_il, r.risposta
    from public.spazi s
    join public.utenti o on o.id = s.user_id
    join me on me.partner_id is not null
    left join public.impegni_risposte r on r.origine = 'spazio' and r.impegno_id = s.id and r.utente_id = p_utente
   where s.condiviso_con is not null and s.user_id <> p_utente and s.inizio >= p_da and s.inizio < p_a
     and public.sotto_il_codice(case s.condiviso_con when 'team' then o.partner_id else s.linea_codice end, me.partner_id)
  order by 3;
$$;
revoke execute on function public.impegni_ricevuti_di(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.impegni_ricevuti_di(uuid, timestamptz, timestamptz) to service_role;

create function public.impegni_ricevuti(p_da timestamptz, p_a timestamptz)
returns table (origine text, id uuid, inizio timestamptz, fine timestamptz, titolo text, tipo text, da_utente uuid, da_nome text,
               link text, luogo text, punti jsonb, punti_condivisi boolean, visto_il timestamptz, risposta text)
language sql stable security definer set search_path = public as $$
  select * from public.impegni_ricevuti_di(public.utente_corrente(), p_da, p_a) where public.utente_corrente() is not null;
$$;
revoke execute on function public.impegni_ricevuti(timestamptz, timestamptz) from public, anon;
grant execute on function public.impegni_ricevuti(timestamptz, timestamptz) to authenticated;
