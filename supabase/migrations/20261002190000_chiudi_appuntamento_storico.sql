-- Azioni vecchie (storico): chiudendo un'azione di più di 7 giorni fa, il rientro in coda del contatto NON si ricalcola (Ignazio 02/10, «ok per il
-- database»: chi importa azioni del 2020 non deve vedersi spostare il contatto in coda da oggi). Per le azioni di questi giorni resta tutto com'era.
-- Modifica di una funzione che esiste già: approvata da Ignazio il 02/10/2026. Definizione di prima (copia): 20260914233000_fase4_agenda.sql,
-- identica a quella viva il 02/10 salvo il controllo sul giorno dell'azione qui sotto.
create or replace function public.chiudi_appuntamento(p_azione uuid, p_esito text)
returns json
language plpgsql
set search_path to 'public'
as $function$
declare
  v_az    public.azioni;
  v_prec  public.contatti;
  v_giorni integer;
  v_oggi  date := (now() at time zone 'Europe/Rome')::date;
  v_storico boolean;
begin
  select * into v_az from public.azioni where id = p_azione;
  if not found then raise exception 'Appuntamento non trovato'; end if;
  select * into v_prec from public.contatti where id = v_az.contatto_id;

  update public.azioni set esito = p_esito, completata = true where id = p_azione;

  -- storico: l'azione è di più di 7 giorni fa → nessun rientro (come MB21Agenda.nelPassato nell'app)
  v_storico := v_az.inizio is not null and (v_az.inizio at time zone 'Europe/Rome')::date < v_oggi - 7;

  select giorni_rientro into v_giorni from public.sequenze
   where chiave = v_az.categoria || '-' || v_az.tipo_azione || '-' || p_esito;
  if v_giorni is not null and not v_storico then
    update public.contatti set rientro_il = v_oggi + v_giorni, in_coda_dal = null, aggiornato_il = now()
     where id = v_az.contatto_id;
  else
    v_giorni := null;   -- così «rientro_cambiato» dice il vero e Annulla non tocca il rientro
  end if;

  return json_build_object('azione_id', p_azione, 'esito_prec', v_az.esito, 'completata_prec', v_az.completata,
                           'contatto_id', v_az.contatto_id, 'rientro_prec', v_prec.rientro_il, 'in_coda_prec', v_prec.in_coda_dal,
                           'rientro_cambiato', v_giorni is not null);
end $function$;
