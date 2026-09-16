-- ═══════════════════════════════════════════════════════════
-- VPP e VPG del file Amway sempre anche in Dashboard e Check (richiesta di Ignazio 16/09:
-- «dove è presente VPP e VPG devono essere automatici»).
-- Prima la copia la faceva solo la pagina Admin dell'app: il caricamento delle 17:09 del 16/09 ha aggiornato
-- la Mappa ma non la Dashboard (verosimilmente il telefono aveva ancora la versione di prima).
-- Ora lo fa il database: ogni riga scritta in `volumi_mese` aggiorna `obiettivi_mese.vpp_amway/vpg_amway`
-- di ogni utente con quel codice Amway (le coppie condividono il codice). Tocca solo i dati Amway, mai gli obiettivi.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create or replace function public.mb21_volumi_in_obiettivi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.obiettivi_mese (user_id, mese, vpp_amway, vpg_amway)
  select u.id, to_date(new.mese::text, 'YYYYMM'), new.vpp, new.vpg
    from public.utenti u
   where u.partner_id = new.partner_id
  on conflict (user_id, mese) do update
     set vpp_amway = excluded.vpp_amway,
         vpg_amway = excluded.vpg_amway;
  return new;
end;
$$;

create trigger mb21_volumi_in_obiettivi
  after insert or update of vpp, vpg on public.volumi_mese
  for each row execute function public.mb21_volumi_in_obiettivi();

-- Allineamento una tantum: tutti i mesi già caricati (il 16/09 differiva solo settembre 2026)
insert into public.obiettivi_mese (user_id, mese, vpp_amway, vpg_amway)
select u.id, to_date(v.mese::text, 'YYYYMM'), v.vpp, v.vpg
  from public.volumi_mese v
  join public.utenti u on u.partner_id = v.partner_id
on conflict (user_id, mese) do update
   set vpp_amway = excluded.vpp_amway,
       vpg_amway = excluded.vpg_amway;
