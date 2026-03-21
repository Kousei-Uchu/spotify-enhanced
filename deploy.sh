#!/usr/bin/env bash
# =============================================================================
# Spotify Enhanced — GitHub Deploy Script
# Sets up a new GitHub repository, pushes the code, and creates the first tag.
# =============================================================================
set -e

BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

header() { echo -e "\n${BOLD}${GREEN}▶ $1${RESET}"; }
warn()   { echo -e "${YELLOW}⚠ $1${RESET}"; }
err()    { echo -e "${RED}✖ $1${RESET}"; exit 1; }
ok()     { echo -e "${GREEN}✔ $1${RESET}"; }

echo -e "${BOLD}"
echo "╔══════════════════════════════════════════╗"
echo "║   Spotify Enhanced — GitHub Deploy       ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${RESET}"

# ── Prerequisites ─────────────────────────────────────────────────────────────

header "Checking prerequisites"

command -v git  >/dev/null 2>&1 || err "git is not installed"
command -v gh   >/dev/null 2>&1 || {
  warn "GitHub CLI (gh) not found."
  echo "  Install it from: https://cli.github.com"
  echo "  Or create the repo manually and run: git remote add origin <url>"
  echo "  Then re-run this script with --skip-create"
  SKIP_CREATE=true
}

ok "git found: $(git --version)"

# ── Config ────────────────────────────────────────────────────────────────────

header "Configuration"

SKIP_CREATE="${SKIP_CREATE:-false}"

if [[ "$1" == "--skip-create" ]]; then
  SKIP_CREATE=true
fi

# Read GitHub username
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  GH_USER=$(gh api user --jq .login 2>/dev/null || echo "")
else
  GH_USER=""
fi

if [[ -z "$GH_USER" ]]; then
  read -rp "GitHub username: " GH_USER
fi

REPO_NAME="${REPO_NAME:-spotify-enhanced}"
DEFAULT_VERSION="1.0.0"

read -rp "Repository name [${REPO_NAME}]: " input
REPO_NAME="${input:-$REPO_NAME}"

read -rp "Initial version tag [${DEFAULT_VERSION}]: " input
VERSION="${input:-$DEFAULT_VERSION}"

echo ""
echo "  GitHub user : ${GH_USER}"
echo "  Repo name   : ${REPO_NAME}"
echo "  Version     : v${VERSION}"
echo "  Skip create : ${SKIP_CREATE}"
echo ""
read -rp "Continue? [Y/n] " confirm
[[ "${confirm,,}" == "n" ]] && exit 0

# ── Update Kousei-Uchu placeholders ──────────────────────────────────

header "Patching username placeholders"

for f in \
  custom_components/spotify_enhanced/manifest.json \
  hacs.json \
  README.md \
  docs/troubleshooting.md \
  docs/docker-install.md; do
  if [[ -f "$f" ]]; then
    sed -i "s/Kousei-Uchu/${GH_USER}/g" "$f"
    sed -i "s/Kousei-Uchu/spotify-enhanced/${GH_USER}\/${REPO_NAME}/g" "$f"
    ok "Patched $f"
  fi
done

# ── Git init ──────────────────────────────────────────────────────────────────

header "Initialising git repository"

if [[ ! -d ".git" ]]; then
  git init
  ok "Initialised new git repo"
else
  ok "Existing git repo found"
fi

# Make sure .gitignore exists
if [[ ! -f ".gitignore" ]]; then
  cat > .gitignore << 'GITIGNORE'
__pycache__/
*.pyc
*.pyo
.env
.venv/
node_modules/
*.zip
dist/
.DS_Store
Thumbs.db
GITIGNORE
  ok "Created .gitignore"
fi

git add -A
git commit -m "feat: initial release v${VERSION}" --allow-empty

# ── Create GitHub repo ────────────────────────────────────────────────────────

if [[ "$SKIP_CREATE" != "true" ]] && command -v gh >/dev/null 2>&1; then
  header "Creating GitHub repository"

  if gh repo view "${GH_USER}/${REPO_NAME}" >/dev/null 2>&1; then
    warn "Repository ${GH_USER}/${REPO_NAME} already exists — skipping create"
  else
    gh repo create "${REPO_NAME}" \
      --public \
      --description "Full-featured Spotify integration and Lovelace cards for Home Assistant" \
      --homepage "https://github.com/${GH_USER}/${REPO_NAME}" \
      --source . \
      --remote origin \
      --push
    ok "Created github.com/${GH_USER}/${REPO_NAME}"
  fi
else
  header "Skipping repo creation"
  if ! git remote get-url origin >/dev/null 2>&1; then
    echo ""
    echo "  Add your remote manually:"
    echo "  git remote add origin https://github.com/${GH_USER}/${REPO_NAME}.git"
    echo ""
    read -rp "Press Enter once you've added the remote, or Ctrl+C to abort…"
  fi
fi

# ── Push ──────────────────────────────────────────────────────────────────────

header "Pushing to GitHub"

# Ensure we're on main
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
if [[ "$BRANCH" != "main" ]]; then
  git branch -M main
fi

git push -u origin main 2>/dev/null || git push --set-upstream origin main
ok "Pushed to origin/main"

# ── Tag and release ───────────────────────────────────────────────────────────

header "Creating release tag v${VERSION}"

git tag -a "v${VERSION}" -m "Release v${VERSION}"
git push origin "v${VERSION}"
ok "Tagged v${VERSION}"

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  gh release create "v${VERSION}" \
    --title "Spotify Enhanced v${VERSION}" \
    --notes "Initial release. See README for installation instructions." \
    --latest
  ok "GitHub release created"
else
  warn "gh CLI not authenticated — create the release manually at:"
  echo "  https://github.com/${GH_USER}/${REPO_NAME}/releases/new"
fi

# ── HACS instructions ─────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  Done! Your repo is live.${RESET}"
echo ""
echo "  Repository: https://github.com/${GH_USER}/${REPO_NAME}"
echo ""
echo -e "${BOLD}  Add to HACS as a custom repository:${RESET}"
echo "  1. Open HACS in Home Assistant"
echo "  2. Go to Integrations → ⋮ → Custom repositories"
echo "  3. Add:  https://github.com/${GH_USER}/${REPO_NAME}"
echo "  4. Category: Integration"
echo "  5. Click Download"
echo ""
echo -e "${BOLD}  To publish a new version:${RESET}"
echo "  git tag -a v1.1.0 -m 'Release v1.1.0' && git push origin v1.1.0"
echo "  (GitHub Actions will build and publish the release automatically)"
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════${RESET}"
