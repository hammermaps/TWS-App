#!/usr/bin/env bash
# Wrapper-Script für android:build mit korrekter Node.js-Version
# Dieses Script lädt nvm und nutzt die in .nvmrc definierte Node.js-Version

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# nvm laden
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    source "$NVM_DIR/nvm.sh"
    # Node.js-Version aus .nvmrc laden (falls vorhanden)
    if [ -f "$SCRIPT_DIR/.nvmrc" ]; then
        nvm use
    fi
else
    echo "WARNUNG: nvm nicht gefunden unter $NVM_DIR"
fi

# Node-Version anzeigen
echo "Verwende Node.js: $(node --version)"
echo "Verwende npm: $(npm --version)"

# Build ausführen
cd "$SCRIPT_DIR"
npm run build && npx cap sync android

