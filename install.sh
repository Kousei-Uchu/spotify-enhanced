#!/usr/bin/env bash
# =============================================================================
# Spotify Enhanced — Local Installation Script
# Usage: ./install.sh [/path/to/ha/config]
# Default config path: /config  (works on HAOS, Supervised, Docker)
# =============================================================================
set -e

HA_CONFIG="${1:-/config}"
BOLD="\033[1m"; GREEN="\033[32m"; YELLOW="\033[33m"; RESET="\033[0m"
ok()   { echo -e "${GREEN}✔ $1${RESET}"; }
warn() { echo -e "${YELLOW}⚠ $1${RESET}"; }

echo -e "${BOLD}"
echo "╔══════════════════════════════════════════╗"
echo "║  Spotify Enhanced — Installer v1.0.0    ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${RESET}"

[[ -d "$HA_CONFIG" ]] || { echo "Config dir not found: $HA_CONFIG"; exit 1; }

echo "Installing to: $HA_CONFIG"
echo ""

mkdir -p "$HA_CONFIG/custom_components/spotify_enhanced/translations"
mkdir -p "$HA_CONFIG/www/spotify-enhanced-card"

cp -r custom_components/spotify_enhanced/. "$HA_CONFIG/custom_components/spotify_enhanced/"
ok "Integration installed"

cp -r www/spotify-enhanced-card/. "$HA_CONFIG/www/spotify-enhanced-card/"
ok "Lovelace card installed"

echo ""
echo -e "${BOLD}${GREEN}══════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  Installation complete!${RESET}"
echo ""
echo "  Next steps:"
echo "  1. Restart Home Assistant"
echo "  2. Settings → Devices & Services → Add Integration"
echo "  3. Search 'Spotify Enhanced' and follow the setup wizard"
echo ""
echo "  The setup wizard will tell you the exact Redirect URI"
echo "  to add to your Spotify Developer app."
echo ""
echo "  Card resource (auto-registered, or add manually):"
echo "  /local/spotify-enhanced-card/spotify-enhanced-card.js"
echo -e "${BOLD}${GREEN}══════════════════════════════════════════════════${RESET}"
