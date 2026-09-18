-- ═══════════════════════════════════════════════════════════
-- Cantiere 26 · VENDITE — Lavoro 4 ter: «Ordine fatto» (Ignazio 18/09)
-- La data di consegna scritta alla vendita è una PREVISIONE: l'ordine può partire qualche giorno prima o dopo,
-- o slittare di un mese se la cliente dice «aspetta». Quindi una vendita «Più avanti» conta solo quando il
-- partner conferma con «📦 Ordine fatto»: `ordinata_il` = il giorno vero dell'ordine.
--   consegna vuota (Subito)            → conta_il = data
--   consegna piena, ordinata_il vuota  → conta_il vuoto: «da consegnare», fuori dai totali anche se la data è passata
--   consegna piena, ordinata_il pieno  → conta_il = ordinata_il
-- L'FC è quello di conta_il; finché l'ordine non è fatto, quello della consegna prevista (provvigione stimata).
-- Con «Ordine fatto» il promemoria «Consegna» ancora aperto in Agenda si chiude da solo (completato).
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

alter table public.vendite
  add column ordinata_il date check (ordinata_il is null or (consegna is not null and ordinata_il >= data));

drop view public.vendite_conti;
create view public.vendite_conti with (security_invoker = true) as
select v.*,
       case when v.consegna is null then v.data else v.ordinata_il end as conta_il,
       f.valore                           as fc,
       v.vp * f.valore * 0.20             as provvigione,
       v.vp * f.valore * 0.20 - v.sconto  as guadagno_netto
from public.vendite v
left join lateral (
  select valore from public.fattori_conversione
  where dal <= coalesce(v.ordinata_il, v.consegna, v.data) order by dal desc limit 1
) f on true;   -- left join: senza un FC per quella data la vendita resta, con la provvigione vuota

grant select on public.vendite_conti to authenticated;

-- «Ordine fatto»: il promemoria «Consegna» ancora aperto si chiude
create function public.mb21_vendita_ordinata() returns trigger
language plpgsql as $$
begin
  update public.azioni set completata = true
   where id = new.azione_consegna_id and not coalesce(completata, false);
  return null;
end $$;

create trigger mb21_vendita_ordinata after update of ordinata_il on public.vendite
  for each row when (old.ordinata_il is null and new.ordinata_il is not null)
  execute function public.mb21_vendita_ordinata();
