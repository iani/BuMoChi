#!/usr/bin/env bash
# One-time setup. Safe to re-run.
#
# Handles two failure modes that are easy to lose an evening to:
#   1. Version-manager shims (nvm/fnm/asdf) that are broken in non-interactive
#      shells, so `node` resolves to a stub that errors instead of running.
#   2. npm >= 11 refusing lifecycle scripts by default, which silently skips
#      Puppeteer's Chromium download. The install "succeeds" and the export
#      then fails at browser launch.

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

say() { printf '\033[1m%s\033[0m\n' "$*"; }
warn() { printf '\033[33m%s\033[0m\n' "$*"; }
die() { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

# --- 1. Find a node that actually runs -------------------------------------
# Prefer whatever is on PATH, but verify it executes rather than trusting it.
find_node() {
  local candidates=()
  command -v node >/dev/null 2>&1 && candidates+=("$(command -v node)")
  candidates+=(
    /opt/homebrew/bin/node
    /usr/local/bin/node
    /usr/bin/node
  )
  # Newest version-manager install, if any.
  for d in "$HOME"/.nvm/versions/node/* "$HOME"/.local/share/fnm/node-versions/*/installation; do
    [ -x "$d/bin/node" ] && candidates+=("$d/bin/node")
  done

  for c in "${candidates[@]}"; do
    if [ -x "$c" ] && "$c" --version >/dev/null 2>&1; then
      echo "$c"; return 0
    fi
  done
  return 1
}

NODE="$(find_node)" || die "No working node found. Install Node 20+ and re-run."
NPM="$(dirname "$NODE")/npm"
[ -x "$NPM" ] || NPM="$(command -v npm || true)"
[ -n "$NPM" ] && [ -x "$NPM" ] || die "Found node at $NODE but no usable npm alongside it."

say "node  $("$NODE" --version)  ->  $NODE"
say "npm   $("$NPM" --version)"

if [ "$(command -v node 2>/dev/null || true)" != "$NODE" ]; then
  warn "NOTE: 'node' on your PATH is not the one being used."
  warn "      Use this kit via 'npm run' or call $NODE directly."
fi

# --- 2. Dependencies -------------------------------------------------------
say "Installing dependencies..."
"$NPM" install --no-audit --no-fund

# --- 3. Chromium (the step npm 11 skips) -----------------------------------
say "Ensuring a Chromium build is present..."
if [ -x ./node_modules/.bin/puppeteer ]; then
  ./node_modules/.bin/puppeteer browsers install chrome
else
  die "Puppeteer CLI missing -- dependency install did not complete."
fi

# --- 4. Prove it works -----------------------------------------------------
say "Verifying export..."
"$NODE" src/export-pdf.mjs src/deck.html out/setup-check.pdf

cat <<DONE

Setup complete.

  Edit the deck    src/deck.html
  Recolour it      src/theme.css
  Build the PDF    npm run deck           (-> out/deck.pdf)
  Preview live     npm run deck:open      (arrow keys to navigate)

Verified output is at out/setup-check.pdf -- open it to confirm it looks right.
DONE
