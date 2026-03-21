# Spotify Enhanced — Publishing & Installation Guide

This guide covers everything from the files in your ZIP to a live HACS-installable
GitHub repository, then how to install it in Home Assistant.

---

## Part 0 — Understanding the ZIP contents

When you extract the ZIP you'll find two folders:

```
spotify_enhanced/
└── se/                          ← THIS is your GitHub repository root
    ├── custom_components/
    │   └── spotify_enhanced/    ← The HA integration (Python)
    ├── www/
    │   └── spotify-enhanced-card/
    │       └── spotify-enhanced-card.js   ← Lovelace card
    ├── .github/
    │   └── workflows/
    │       ├── ci.yml           ← Runs on every push/PR
    │       └── release.yml      ← Runs on version tags, builds release ZIPs
    ├── docs/
    ├── examples/
    ├── hacs.json                ← Tells HACS what this repo is
    ├── manifest.json            ← (lives inside custom_components/spotify_enhanced/)
    ├── README.md
    ├── LICENSE
    ├── install.sh               ← Manual install script
    └── deploy.sh                ← Interactive GitHub setup helper
```

**The `/se` folder is your repo root.** Everything inside it goes to GitHub directly —
not in a subfolder. The outer `spotify_enhanced/` wrapper is just how the ZIP was
packaged; ignore it.

The old `/spotify_enhanced` folder in the ZIP is a previous iteration.
**Use `/se` — it is the correct, HACS-compatible version.**

---

## Part 1 — Prerequisites

You need:

- A [GitHub](https://github.com) account (free)
- Git installed on your computer
  - macOS: `brew install git`  or it's bundled with Xcode Command Line Tools
  - Windows: download from [git-scm.com](https://git-scm.com)
  - Linux: `sudo apt install git` / `sudo dnf install git`
- (Optional but recommended) [GitHub CLI](https://cli.github.com) — `gh`
  - macOS: `brew install gh`
  - Windows: `winget install GitHub.cli`
  - Linux: see [cli.github.com/manual/installation](https://cli.github.com/manual/installation)

Verify everything is installed:

```bash
git --version    # should print git version 2.x.x
gh --version     # should print gh version 2.x.x  (optional)
```

---

## Part 2 — Prepare the files

### 2.1 Extract the ZIP and navigate into the repo root

```bash
# Unzip (replace the filename with whatever you downloaded)
unzip spotify_enhanced.zip

# The repo root is the /se folder inside
cd spotify_enhanced/se
```

Your working directory should now contain `hacs.json`, `README.md`,
`custom_components/`, `www/`, etc. — **not** another `se/` subfolder.

### 2.2 Replace placeholder text

Every place that says `YOUR_GITHUB_USERNAME` needs your actual GitHub username.
Run this one-liner (replace `your_actual_username`):

```bash
# macOS / Linux
USERNAME="your_actual_username"
REPO="spotify-enhanced"

find . -type f \( -name "*.json" -o -name "*.md" -o -name "*.yml" -o -name "*.sh" \) \
  | xargs sed -i.bak \
      -e "s/YOUR_GITHUB_USERNAME/${USERNAME}/g" \
      -e "s|your-repo|${USERNAME}/${REPO}|g"

# Remove the .bak files sed creates on macOS
find . -name "*.bak" -delete
```

```powershell
# Windows PowerShell
$USERNAME = "your_actual_username"
$REPO     = "spotify-enhanced"

Get-ChildItem -Recurse -Include *.json,*.md,*.yml,*.sh | ForEach-Object {
    (Get-Content $_.FullName) `
        -replace 'YOUR_GITHUB_USERNAME', $USERNAME `
        -replace 'your-repo', "$USERNAME/$REPO" |
    Set-Content $_.FullName
}
```

Files that contain the placeholder and need to be updated:

| File | What changes |
|------|-------------|
| `hacs.json` | `documentation` and `issue_tracker` URLs |
| `custom_components/spotify_enhanced/manifest.json` | `documentation`, `issue_tracker`, `codeowners` |
| `README.md` | Badge URLs, install links |
| `.github/workflows/*.yml` | Release notes links |

### 2.3 Initialise git

```bash
git init
git add -A
git commit -m "feat: initial release v1.0.0"
```

---

## Part 3 — Create the GitHub repository

### Option A — Using GitHub CLI (easiest)

```bash
# Log in if you haven't already (opens a browser)
gh auth login

# Create the repo (public is required for free HACS)
gh repo create spotify-enhanced \
  --public \
  --description "Full-featured Spotify integration for Home Assistant" \
  --source . \
  --remote origin \
  --push
```

That's it — your code is now on GitHub.

### Option B — Using the GitHub website

1. Go to [github.com/new](https://github.com/new)
2. Fill in:
   - **Repository name:** `spotify-enhanced`
   - **Description:** `Full-featured Spotify integration for Home Assistant`
   - **Visibility:** Public ← *required for HACS on the free tier*
   - **Do NOT** tick "Add a README" or any other initialisation options
3. Click **Create repository**
4. GitHub shows you a block of commands — run the "push an existing repository" block:

```bash
git remote add origin https://github.com/YOUR_USERNAME/spotify-enhanced.git
git branch -M main
git push -u origin main
```

---

## Part 4 — Create the first release

HACS installs specific **tagged releases**, not raw commits.
You must create at least one release before HACS can install anything.

### 4.1 Tag the version

```bash
git tag -a v1.0.0 -m "Release v1.0.0 — initial release"
git push origin v1.0.0
```

### 4.2 Create the GitHub Release

**Using GitHub CLI:**
```bash
gh release create v1.0.0 \
  --title "Spotify Enhanced v1.0.0" \
  --notes "Initial release." \
  --latest
```

**Using the website:**
1. Go to your repo on GitHub
2. Click **Releases** (right sidebar) → **Create a new release**
3. Under **Choose a tag**, select `v1.0.0`
4. Set the title to `Spotify Enhanced v1.0.0`
5. Click **Publish release**

> **Note:** The GitHub Actions `release.yml` workflow will automatically build and
> attach release ZIPs to any future release you create by pushing a `v*` tag.
> For this first release you're creating it manually.

### 4.3 Verify the release is visible

Go to `https://github.com/YOUR_USERNAME/spotify-enhanced/releases` —
you should see `v1.0.0` listed. If you can see it, HACS can see it.

---

## Part 5 — Verify HACS compatibility (optional but recommended)

HACS has strict requirements. You can validate locally before submitting:

```bash
pip install homeassistant

# Check hacs.json exists and has the right fields
python - << 'EOF'
import json, sys

with open("hacs.json") as f:
    h = json.load(f)

required = ["name", "category"]
missing = [k for k in required if k not in h]
if missing:
    print(f"hacs.json missing: {missing}")
    sys.exit(1)

assert h["category"] == "integration", "category must be 'integration'"
print(f"hacs.json OK — name: {h['name']}")

with open("custom_components/spotify_enhanced/manifest.json") as f:
    m = json.load(f)

for key in ["domain", "name", "version", "config_flow", "iot_class"]:
    assert key in m, f"manifest.json missing key: {key}"

print(f"manifest.json OK — version: {m['version']}")
print("All checks passed ✓")
EOF
```

Key HACS rules this repo already satisfies:

| Requirement | How it's met |
|-------------|-------------|
| Public repository | You created it as public |
| `hacs.json` at repo root | ✓ present |
| `custom_components/<domain>/` at repo root | ✓ `custom_components/spotify_enhanced/` |
| `manifest.json` with `config_flow: true` | ✓ present |
| At least one GitHub Release with a semantic version tag | ✓ `v1.0.0` |
| `codeowners` not empty | ✓ set to your username |

---

## Part 6 — Install in Home Assistant via HACS

### 6.1 Make sure HACS is installed

If you don't have HACS yet:
1. In HA, go to **Settings → Add-ons** (HAOS/Supervised) and install the **Terminal & SSH** add-on, or use your container's shell
2. Run the HACS install script:
   ```bash
   wget -O - https://get.hacs.xyz | bash -
   ```
3. Restart Home Assistant
4. Go to **Settings → Devices & Services → Add Integration → HACS** and complete setup

### 6.2 Add Spotify Enhanced as a custom repository

1. Open **HACS** in the HA sidebar
2. Click **Integrations**
3. Click the **⋮** (three dots) menu in the top-right corner
4. Click **Custom repositories**
5. In the dialog:
   - **Repository:** `https://github.com/YOUR_USERNAME/spotify-enhanced`
   - **Category:** Integration
6. Click **Add**
7. Close the dialog

### 6.3 Install the integration

1. Still in HACS → Integrations, search for **Spotify Enhanced**
2. Click the card that appears
3. Click **Download** (bottom-right)
4. Leave the version on the latest (`v1.0.0`) and click **Download**
5. **Restart Home Assistant** when prompted

### 6.4 Install the Lovelace card

The card JS file lives in `www/spotify-enhanced-card/` in the repo.
HACS does **not** install frontend resources from integration repos automatically —
you need to register it once.

**After the integration installs and HA restarts:**

1. Go to **Settings → Dashboards**
2. Click **⋮** (top-right) → **Resources**
3. Click **+ Add Resource**
4. Fill in:
   - **URL:** `/local/spotify-enhanced-card/spotify-enhanced-card.js`
   - **Resource type:** JavaScript Module
5. Click **Create**

> The integration attempts to auto-register this resource on first load.
> If you see the cards in the picker, it worked and you can skip this step.
> If not, register it manually as above and hard-refresh your browser (`Ctrl+Shift+R`).

---

## Part 7 — Set up the integration in Home Assistant

### 7.1 Create a Spotify Developer App

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click **Create App**
4. Fill in:
   - **App name:** Home Assistant (or anything)
   - **App description:** HA integration
   - **Redirect URI:** leave blank for now — you'll get the exact value in the next step
   - **APIs used:** tick **Web API**
5. Click **Save**

### 7.2 Add the integration to Home Assistant

1. Go to **Settings → Devices & Services**
2. Click **+ Add Integration**
3. Search for **Spotify Enhanced** and click it
4. A dialog opens showing your **Redirect URI** — it looks like:
   ```
   http://192.168.1.99:8123/auth/external/callback
   ```
   or for external access:
   ```
   https://your-domain.duckdns.org/auth/external/callback
   ```
5. **Copy this URI exactly**

### 7.3 Add the Redirect URI to your Spotify app

1. Go back to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Open your app → click **Edit Settings**
3. Under **Redirect URIs**, paste the URI you copied and click **Add**
4. Click **Save** at the bottom

### 7.4 Complete the HA setup

1. Back in Home Assistant, enter your **Client ID** and **Client Secret**
   (both are on your Spotify app's dashboard page)
2. Click **Submit**
3. A Spotify login window opens — log in and click **Agree**
4. The window closes and you're redirected back to HA

You now have:
- `media_player.spotify_enhanced`
- `sensor.spotify_enhanced_now_playing`
- `sensor.spotify_enhanced_spotify_devices`

### 7.5 Add a card to your dashboard

1. Open a dashboard and click **Edit** (pencil icon)
2. Click **+ Add Card**
3. Search for **Spotify Enhanced** — three cards appear:
   - **Spotify Enhanced — Full Deck** (recommended starting point)
   - **Spotify Enhanced — Mini Player**
   - **Spotify Enhanced — Device Picker**
4. Select one, choose your entity (`media_player.spotify_enhanced`), click **Save**

---

## Part 8 — Publishing future updates

When you make changes to the integration:

```bash
# Make your changes, then:
git add -A
git commit -m "fix: description of what changed"

# Update the version in manifest.json (important — HACS uses this)
# Edit custom_components/spotify_enhanced/manifest.json:
#   "version": "1.1.0"

git add custom_components/spotify_enhanced/manifest.json
git commit -m "chore: bump version to 1.1.0"

# Tag and push — GitHub Actions builds the release automatically
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin main
git push origin v1.1.0
```

GitHub Actions (`release.yml`) will then:
1. Validate the manifest, JSON files, and JS syntax
2. Run HACS validation
3. Build release ZIPs
4. Create a GitHub Release tagged `v1.1.0`

HACS users will see an **Update available** badge in their HACS panel within a few hours
(HACS checks for updates periodically, or users can force-check with the refresh button).

---

## Part 9 — Troubleshooting the publish process

### HACS says "Repository not found" when I add it
- Make sure the repo is **public**, not private
- Double-check the URL format: `https://github.com/username/repo-name` (no trailing slash, no `.git`)
- Wait 2–3 minutes after creating the repo before adding to HACS — GitHub's API caches can lag

### HACS adds the repo but shows no integration to install
- Confirm there is at least one GitHub **Release** (not just a tag — it must be a published Release)
- Confirm `hacs.json` is at the root of the repository (not inside a subfolder)
- Confirm `custom_components/spotify_enhanced/` is also at the root

### "Invalid manifest" error in HACS
Open `custom_components/spotify_enhanced/manifest.json` and check:
- `"config_flow": true` is present
- `"version"` is a string like `"1.0.0"` (not a number)
- `"domain"` matches the folder name exactly: `"spotify_enhanced"`

### The Lovelace card doesn't appear in the picker
- Confirm `/local/spotify-enhanced-card/spotify-enhanced-card.js` was registered as a **JavaScript Module** resource
- Hard-refresh the browser: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (macOS)
- Open browser DevTools → Console and look for any JS errors

### Auth callback fails / "Invalid state" error
This version uses HA's native `AbstractOAuth2FlowHandler`, which does not have the
`my.home-assistant.io` state-mismatch issue. If you see it:
- Delete the in-progress integration entry and start again
- Make sure HA's URL is set: **Settings → System → Network → Home Assistant URL**
- The Redirect URI in Spotify must exactly match what the wizard showed you (copy-paste, don't retype)
