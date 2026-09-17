-- ═══════════════════════════════════════════════════════════
-- Approvazione di una richiesta: se c'è già un utente con lo stesso codice Amway (la coppia ha un codice solo),
-- il nuovo nasce «in comune con» lui → niente 15 giorni gratis, vale la scadenza di chi paga (Ignazio 17/09).
-- Chi paga = il primo registrato con quel codice che paga per sé (non Admin, non eliminato).
-- Utente eliminato che rientra: come prima (stessa riga, nessun cambiamento all'abbonamento).
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create or replace function public.approva_richiesta(p_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare r richieste_accesso; v_id uuid; v_paga uuid;
begin
  if not is_admin() then raise exception 'Solo Admin'; end if;
  select * into r from richieste_accesso where id = p_id and stato = 'in_attesa' for update;
  if not found then raise exception 'Richiesta non trovata'; end if;
  update utenti set eliminato_il = null, accesso_attivo = true, nel_partner_select = true,
                    nome_cognome = r.nome_cognome, partner_id = r.codice_amway
   where lower(email) = lower(r.email) and eliminato_il is not null
  returning id into v_id;
  if v_id is null then
    select id into v_paga from utenti
     where partner_id = r.codice_amway and abbonamento_con is null and eliminato_il is null
       and coalesce(ruolo, 'ABO') <> 'Admin'
     order by creato_il limit 1;
    -- con abbonamento_con già scritto il trigger mb21_prova_gratuita non mette i 15 giorni
    insert into utenti (email, nome_cognome, nome, partner_id, accesso_attivo, abbonamento_con)
    values (r.email, r.nome_cognome, split_part(r.nome_cognome, ' ', 1), r.codice_amway, true, v_paga)
    returning id into v_id;
  end if;
  update richieste_accesso set stato = 'approvata', utente_id = v_id, gestita_il = now() where id = p_id;
  return v_id;
end $$;
