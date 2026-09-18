-- ═══════════════════════════════════════════════════════════
-- Cantiere 26 · VENDITE — Lavoro 4: ordine/consegna differiti e riordino in Agenda (Ignazio 18/09)
--
-- 1. `vendite.consegna`: quando parte l'ordine Amway e si consegna. Vuota = subito, insieme alla vendita.
--    Le promo: il cliente paga oggi (data), l'ordine parte mesi dopo (consegna). Amway conta i VP negli ordini,
--    quindi VP e provvigione CONTANO nel giorno dell'ordine: `conta_il` = consegna, oppure data se è vuota.
--    Anche l'FC è quello valido a `conta_il`.
-- 2. La vendita scrive da sola in Agenda (trigger, così vale da qualunque punto si registri):
--      · telefonata «Riordino»: Contatto · Telefonata, 10 giorni prima del riordino, ore 10:00, 5 minuti;
--        se quel giorno è già passato, domani
--      · promemoria «Consegna»: Contatto · Presenza, il giorno della consegna, ore 10:00, 30 minuti;
--        solo se la consegna è nel futuro
--    Cambiando la data si sposta, eliminando la vendita sparisce: solo finché l'azione non è completata.
--    Le vendite importate da Glide (da_glide) nascono senza: le loro telefonate sono già in `azioni` dall'import.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

-- ── 1. consegna e collegamenti alle azioni ─────────────────
alter table public.vendite
  add column consegna           date check (consegna is null or consegna >= data),
  add column azione_riordino_id uuid references public.azioni(id) on delete set null,
  add column azione_consegna_id uuid references public.azioni(id) on delete set null;

drop view public.vendite_conti;
create view public.vendite_conti with (security_invoker = true) as
select v.*,
       coalesce(v.consegna, v.data)       as conta_il,
       f.valore                           as fc,
       v.vp * f.valore * 0.20             as provvigione,
       v.vp * f.valore * 0.20 - v.sconto  as guadagno_netto
from public.vendite v
left join lateral (
  select valore from public.fattori_conversione
  where dal <= coalesce(v.consegna, v.data) order by dal desc limit 1
) f on true;   -- left join: senza un FC per quella data la vendita resta, con la provvigione vuota

grant select on public.vendite_conti to authenticated;

-- ── 2. la vendita scrive in Agenda ─────────────────────────
create function public.mb21_vendita_agenda() returns trigger
language plpgsql as $$
declare
  oggi     date := (now() at time zone 'Europe/Rome')::date;
  cat      text;
  giorno   date;
  aperta   uuid;
begin
  select categoria into cat from public.contatti where id = new.contatto_id;

  -- telefonata di riordino
  if tg_op = 'INSERT' or new.riordino is distinct from old.riordino then
    giorno := case when new.riordino is null then null else greatest(new.riordino - 10, oggi + 1) end;
    select id into aperta from public.azioni where id = new.azione_riordino_id and not coalesce(completata, false);
    if aperta is not null and giorno is null then
      delete from public.azioni where id = aperta;
      new.azione_riordino_id := null;
    elsif aperta is not null then
      update public.azioni set inizio = (giorno + time '10:00') at time zone 'Europe/Rome',
                               fine   = (giorno + time '10:05') at time zone 'Europe/Rome' where id = aperta;
    elsif giorno is not null and not (tg_op = 'INSERT' and new.da_glide) then
      insert into public.azioni (user_id, contatto_id, categoria, tipo_azione, modalita, area, brand, inizio, fine, completata, note)
      values (new.user_id, new.contatto_id, cat, 'Contatto', 'Telefonata', 'Prodotti', new.brand,
              (giorno + time '10:00') at time zone 'Europe/Rome', (giorno + time '10:05') at time zone 'Europe/Rome',
              false, left('Riordino · ' || new.prodotto, 100))
      returning id into new.azione_riordino_id;
    end if;
  end if;

  -- promemoria di consegna
  if tg_op = 'INSERT' or new.consegna is distinct from old.consegna then
    giorno := case when new.consegna is null or new.consegna <= oggi then null else new.consegna end;
    select id into aperta from public.azioni where id = new.azione_consegna_id and not coalesce(completata, false);
    if aperta is not null and giorno is null then
      delete from public.azioni where id = aperta;
      new.azione_consegna_id := null;
    elsif aperta is not null then
      update public.azioni set inizio = (giorno + time '10:00') at time zone 'Europe/Rome',
                               fine   = (giorno + time '10:30') at time zone 'Europe/Rome' where id = aperta;
    elsif giorno is not null and not (tg_op = 'INSERT' and new.da_glide) then
      insert into public.azioni (user_id, contatto_id, categoria, tipo_azione, modalita, area, brand, inizio, fine, completata, note)
      values (new.user_id, new.contatto_id, cat, 'Contatto', 'Presenza', 'Prodotti', new.brand,
              (giorno + time '10:00') at time zone 'Europe/Rome', (giorno + time '10:30') at time zone 'Europe/Rome',
              false, left('Consegna · ' || new.prodotto, 100))
      returning id into new.azione_consegna_id;
    end if;
  end if;

  -- brand o prodotto cambiati: le azioni ancora aperte li seguono (la data non si tocca: può averla spostata il partner)
  if tg_op = 'UPDATE' and (new.brand is distinct from old.brand or new.prodotto is distinct from old.prodotto) then
    update public.azioni set brand = new.brand, note = left('Riordino · ' || new.prodotto, 100)
      where id = new.azione_riordino_id and not coalesce(completata, false);
    update public.azioni set brand = new.brand, note = left('Consegna · ' || new.prodotto, 100)
      where id = new.azione_consegna_id and not coalesce(completata, false);
  end if;
  return new;
end $$;

create trigger mb21_vendita_agenda before insert or update on public.vendite
  for each row execute function public.mb21_vendita_agenda();

-- vendita eliminata: via le sue azioni ancora aperte (quelle completate restano, sono storico)
create function public.mb21_vendita_eliminata() returns trigger
language plpgsql as $$
begin
  delete from public.azioni
   where id in (old.azione_riordino_id, old.azione_consegna_id) and not coalesce(completata, false);
  return null;
end $$;

create trigger mb21_vendita_eliminata after delete on public.vendite
  for each row execute function public.mb21_vendita_eliminata();
