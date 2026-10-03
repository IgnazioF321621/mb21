#!/bin/zsh
# Copia di sicurezza di MB21 sul disco esterno «Disk Esterno LaCie» (Fondamenta 020, Ignazio 03/10/2026: lancio a mano, niente automatico).
# Copia, in una cartella con data e ora, tre cose che esistono solo su questo Mac o che conviene avere a portata:
#   1. ~/mb21-import   (cartella privata: carte del Training, appunti, script, CSV storici, materiale prodotti)
#   2. ~/mb21          (il repo dell'app, con la storia dei commit)
#   3. la memoria del progetto delle sessioni di Claude Code (~/.claude/projects/-Users-ignaziofiorito-mb21)
# Le versioni precedenti restano; i file uguali alla copia precedente non occupano spazio due volte (rsync --link-dest).
# Niente va su internet. Se il disco non è collegato, si ferma e lo dice.
#
# Si lancia da Terminale:   ~/mb21/scripts/backup_lacie.sh
# Per tornare a una versione: le cartelle stanno in «/Volumes/Disk Esterno LaCie/MB21 Backup/AAAA-MM-GG_HHMMSS/».

set -u
setopt null_glob   # senza copie precedenti il «20*» non deve dare errore
DISCO="/Volumes/Disk Esterno LaCie"
DEST="$DISCO/MB21 Backup"
ORA=$(TZ=Europe/Rome date "+%Y-%m-%d_%H%M%S")

if [ ! -d "$DISCO" ]; then
  echo "❌ Il disco «Disk Esterno LaCie» non è collegato: copia non fatta."
  exit 1
fi
mkdir -p "$DEST" || { echo "❌ Non riesco a scrivere sul disco."; exit 1; }

# L'ultima copia riuscita, per non riscrivere i file uguali
ULTIMA=$(ls -1d "$DEST"/20*/ 2>/dev/null | sort | tail -1)
LINK=()
if [ -n "$ULTIMA" ]; then LINK=(--link-dest="${ULTIMA%/}"); fi

NUOVA="$DEST/$ORA"
mkdir -p "$NUOVA"
ok=1
copia() {   # copia <cartella sorgente> <nome nella copia>
  if [ ! -d "$1" ]; then echo "⚠️  Manca $1: saltata."; return; fi
  rsync -a --delete --exclude .DS_Store "${LINK[@]/%//$2}" "$1/" "$NUOVA/$2/" || { echo "❌ Errore copiando $1"; ok=0; }
}
copia "$HOME/mb21-import" "mb21-import"
copia "$HOME/mb21"        "mb21"
copia "$HOME/.claude/projects/-Users-ignaziofiorito-mb21" "memoria-sessioni"

if [ $ok = 1 ]; then
  echo "✅ Copia fatta: $NUOVA"
  echo "   Copie presenti: $(ls -1d "$DEST"/20*/ 2>/dev/null | wc -l | tr -d ' ') · spazio usato: $(du -sh "$DEST" | cut -f1) · libero sul disco: $(df -h "$DISCO" | awk 'NR==2{print $4}')"
else
  echo "⚠️  Copia incompleta: controlla i messaggi sopra."
  exit 1
fi
