#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# Miamo — System Setup (installs all prerequisites)
# ═══════════════════════════════════════════════════════════════════
#
#  bash scripts/setup.sh              Auto-detect OS
#  bash scripts/setup.sh mac          macOS (Homebrew)
#  bash scripts/setup.sh linux        Linux/Ubuntu/Debian (apt)
#  bash scripts/setup.sh windows      Windows (Git Bash / PowerShell)
#
#  Installs: Node.js, npm, Docker, kubectl, minikube, Git
#  Skips anything already installed. Safe to run multiple times.
#
#  After setup:
#    bash scripts/start.sh local      — Just needs Node.js
#    bash scripts/start.sh dev        — Needs Node.js + Docker + minikube + kubectl
# ═══════════════════════════════════════════════════════════════════

# DO NOT use set -e — we handle errors per-tool
# so one failure doesn't kill the whole script

# ─── Colors ──────────────────────────────────────────────────────
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[1;34m'; C='\033[0;36m'; NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")"; pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ─── Track results ──────────────────────────────────────────────
INSTALLED=()
SKIPPED=()
FAILED=()
installed() { INSTALLED+=("$1"); echo -e "  ${G}✓ $1 installed${NC}"; }
skipped()   { SKIPPED+=("$1");  echo -e "  ${C}● $1 already installed${NC}"; }
failed()    { FAILED+=("$1");   echo -e "  ${R}✗ $1 FAILED — install manually${NC}"; }

# ═════════════════════════════════════════════════════════════════
#  PATH REFRESH — crucial so newly installed tools are found
# ═════════════════════════════════════════════════════════════════
refresh_path() {
  # Clear bash's command hash table so it picks up new binaries
  hash -r 2>/dev/null || true

  # macOS: Homebrew paths (Intel + Apple Silicon)
  [[ -f /opt/homebrew/bin/brew ]] && eval "$(/opt/homebrew/bin/brew shellenv)" 2>/dev/null
  [[ -f /usr/local/bin/brew ]]    && eval "$(/usr/local/bin/brew shellenv)" 2>/dev/null

  # Windows: Chocolatey + common install paths
  if [[ "$PLATFORM" == "windows" ]]; then
    # Chocolatey
    [[ -d "/c/ProgramData/chocolatey/bin" ]] && export PATH="/c/ProgramData/chocolatey/bin:$PATH"
    # Node.js common locations
    [[ -d "/c/Program Files/nodejs" ]]       && export PATH="/c/Program Files/nodejs:$PATH"
    [[ -d "$APPDATA/npm" ]]                  && export PATH="$APPDATA/npm:$PATH"
    # Docker
    [[ -d "/c/Program Files/Docker/Docker/resources/bin" ]] && export PATH="/c/Program Files/Docker/Docker/resources/bin:$PATH"
    # kubectl & minikube (choco puts them in chocolatey/bin, already added above)

    # Try to pull full Windows PATH into Git Bash
    if command -v cmd.exe &>/dev/null; then
      WIN_PATH=$(cmd.exe /c "echo %PATH%" 2>/dev/null | tr ';' '\n' | sed 's|\\|/|g; s|^\([A-Za-z]\):|/\L\1|' | tr '\n' ':')
      [[ -n "$WIN_PATH" ]] && export PATH="$PATH:$WIN_PATH"
    fi
  fi

  # Linux: common bin paths
  export PATH="/usr/local/bin:/usr/bin:/bin:/snap/bin:$PATH"

  hash -r 2>/dev/null || true
}

# ─── Platform Detection ─────────────────────────────────────────
detect_platform() {
  case "$(uname -s 2>/dev/null || echo Windows)" in
    Darwin*)  echo "mac" ;;
    Linux*)
      # Check if running inside WSL
      if grep -qi microsoft /proc/version 2>/dev/null; then
        echo "linux"  # WSL is still linux
      else
        echo "linux"
      fi
      ;;
    MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
    *)        echo "linux" ;;
  esac
}

PLATFORM="${1:-$(detect_platform)}"

# Validate
if [[ "$PLATFORM" != "mac" && "$PLATFORM" != "linux" && "$PLATFORM" != "windows" ]]; then
  echo ""
  echo -e "${R}Unknown platform: ${PLATFORM}${NC}"
  echo ""
  echo "Usage: bash scripts/setup.sh [mac|linux|windows]"
  echo "       bash scripts/setup.sh    (auto-detect)"
  exit 1
fi

echo ""
echo -e "${B}═══════════════════════════════════════════════${NC}"
echo -e "${B}  MIAMO SETUP — ${PLATFORM}${NC}"
echo -e "${B}═══════════════════════════════════════════════${NC}"
echo ""

# ═════════════════════════════════════════════════════════════════
#  HELPER: try to find a command (checks PATH + known locations)
# ═════════════════════════════════════════════════════════════════
has() {
  command -v "$1" &>/dev/null && return 0

  # Fallback: check known install locations
  case "$1" in
    brew)
      [[ -x /opt/homebrew/bin/brew ]] && return 0
      [[ -x /usr/local/bin/brew ]]    && return 0
      ;;
    node)
      [[ -x "/c/Program Files/nodejs/node.exe" ]] && return 0
      [[ -x /usr/local/bin/node ]]                && return 0
      ;;
    npm)
      [[ -x "/c/Program Files/nodejs/npm" ]]  && return 0
      [[ -x "/c/Program Files/nodejs/npm.cmd" ]] && return 0
      [[ -x /usr/local/bin/npm ]]              && return 0
      ;;
    docker)
      [[ -x "/c/Program Files/Docker/Docker/resources/bin/docker.exe" ]] && return 0
      [[ -x /usr/local/bin/docker ]] && return 0
      [[ -x /usr/bin/docker ]]       && return 0
      ;;
    choco)
      [[ -x "/c/ProgramData/chocolatey/bin/choco.exe" ]] && return 0
      ;;
    kubectl)
      [[ -x /usr/local/bin/kubectl ]] && return 0
      ;;
    minikube)
      [[ -x /usr/local/bin/minikube ]] && return 0
      ;;
  esac
  return 1
}

# ═════════════════════════════════════════════════════════════════
#  macOS — Homebrew
# ═════════════════════════════════════════════════════════════════
if [[ "$PLATFORM" == "mac" ]]; then

  # 1. Homebrew
  echo -e "${Y}[1/6]${NC} Homebrew..."
  if has brew; then
    skipped "Homebrew"
  else
    echo "  Installing Homebrew (you may be asked for your password)..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || true
    refresh_path
    if has brew; then
      # Persist for future shells
      if [[ -f /opt/homebrew/bin/brew ]]; then
        grep -q 'brew shellenv' ~/.zprofile 2>/dev/null || echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
      fi
      installed "Homebrew"
    else
      failed "Homebrew"
    fi
  fi

  # 2. Node.js
  echo -e "${Y}[2/6]${NC} Node.js..."
  refresh_path
  if has node; then
    skipped "Node.js ($(node -v 2>/dev/null || echo '?'))"
  else
    brew install node 2>/dev/null || true
    refresh_path
    has node && installed "Node.js ($(node -v))" || failed "Node.js"
  fi

  # 3. Git
  echo -e "${Y}[3/6]${NC} Git..."
  if has git; then
    skipped "Git"
  else
    brew install git 2>/dev/null || true
    refresh_path
    has git && installed "Git" || failed "Git"
  fi

  # 4. Docker
  echo -e "${Y}[4/6]${NC} Docker..."
  if has docker; then
    skipped "Docker"
  else
    echo "  Installing Docker Desktop (may take a few minutes)..."
    brew install --cask docker 2>/dev/null || true
    refresh_path
    if has docker; then
      installed "Docker Desktop"
    else
      installed "Docker Desktop (open it once to finish setup)"
    fi
    echo -e "  ${Y}⚠ Open Docker Desktop app once to complete setup${NC}"
  fi

  # 5. kubectl
  echo -e "${Y}[5/6]${NC} kubectl..."
  if has kubectl; then
    skipped "kubectl"
  else
    brew install kubectl 2>/dev/null || true
    refresh_path
    has kubectl && installed "kubectl" || failed "kubectl"
  fi

  # 6. minikube
  echo -e "${Y}[6/6]${NC} minikube..."
  if has minikube; then
    skipped "minikube"
  else
    brew install minikube 2>/dev/null || true
    refresh_path
    has minikube && installed "minikube" || failed "minikube"
  fi
fi

# ═════════════════════════════════════════════════════════════════
#  Linux — apt (Debian/Ubuntu) + fallback to direct downloads
# ═════════════════════════════════════════════════════════════════
if [[ "$PLATFORM" == "linux" ]]; then
  SUDO=""
  if [[ $EUID -ne 0 ]]; then
    if command -v sudo &>/dev/null; then
      SUDO="sudo"
    else
      echo -e "${Y}⚠ Not root and sudo not found. Some installs may fail.${NC}"
    fi
  fi

  HAS_APT=false
  command -v apt-get &>/dev/null && HAS_APT=true

  # 1. Update package index
  echo -e "${Y}[1/7]${NC} Package index..."
  if $HAS_APT; then
    $SUDO apt-get update -qq 2>/dev/null && echo -e "  ${G}✓${NC} Updated" || echo -e "  ${Y}⚠ apt update failed${NC}"
  else
    echo -e "  ${Y}⚠ apt not found — will try direct downloads${NC}"
  fi

  # 2. Git & curl
  echo -e "${Y}[2/7]${NC} Git & curl..."
  if has git && has curl; then
    skipped "Git & curl"
  else
    if $HAS_APT; then
      $SUDO apt-get install -y git curl ca-certificates gnupg 2>/dev/null || true
    fi
    refresh_path
    has git && has curl && installed "Git & curl" || failed "Git & curl (install manually: sudo apt install git curl)"
  fi

  # 3. Node.js
  echo -e "${Y}[3/7]${NC} Node.js..."
  refresh_path
  if has node; then
    skipped "Node.js ($(node -v 2>/dev/null || echo '?'))"
  else
    echo "  Installing Node.js 20.x..."
    if has curl; then
      curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO -E bash - 2>/dev/null || true
      $SUDO apt-get install -y nodejs 2>/dev/null || true
    fi
    refresh_path
    has node && installed "Node.js ($(node -v))" || failed "Node.js — install manually: https://nodejs.org"
  fi

  # 4. Docker
  echo -e "${Y}[4/7]${NC} Docker..."
  if has docker; then
    skipped "Docker"
  else
    echo "  Installing Docker Engine..."
    if has curl && $HAS_APT; then
      $SUDO install -m 0755 -d /etc/apt/keyrings 2>/dev/null || true

      # Detect distro for correct Docker repo
      if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        DISTRO_ID="${ID}"
        DISTRO_CODENAME="${VERSION_CODENAME:-$(lsb_release -cs 2>/dev/null || echo '')}"
      else
        DISTRO_ID="ubuntu"
        DISTRO_CODENAME="jammy"
      fi

      curl -fsSL "https://download.docker.com/linux/${DISTRO_ID}/gpg" | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null || true
      $SUDO chmod a+r /etc/apt/keyrings/docker.gpg 2>/dev/null || true
      echo "deb [arch=$(dpkg --print-architecture 2>/dev/null || echo amd64) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${DISTRO_ID} ${DISTRO_CODENAME} stable" | \
        $SUDO tee /etc/apt/sources.list.d/docker.list > /dev/null 2>/dev/null || true
      $SUDO apt-get update -qq 2>/dev/null || true
      $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin 2>/dev/null || true
      $SUDO usermod -aG docker "$USER" 2>/dev/null || true
    fi
    refresh_path
    if has docker; then
      installed "Docker"
      echo -e "  ${Y}⚠ Log out & back in for docker group to take effect${NC}"
    else
      failed "Docker — install manually: https://docs.docker.com/engine/install/"
    fi
  fi

  # 5. kubectl
  echo -e "${Y}[5/7]${NC} kubectl..."
  if has kubectl; then
    skipped "kubectl"
  else
    echo "  Installing kubectl..."
    # Try apt repo first, fallback to direct download
    if $HAS_APT && has curl; then
      curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.31/deb/Release.key | $SUDO gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg 2>/dev/null || true
      echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.31/deb/ /" | \
        $SUDO tee /etc/apt/sources.list.d/kubernetes.list > /dev/null 2>/dev/null || true
      $SUDO apt-get update -qq 2>/dev/null || true
      $SUDO apt-get install -y kubectl 2>/dev/null || true
    fi
    # Fallback: direct binary download
    if ! has kubectl && has curl; then
      echo "  Trying direct download..."
      KARCH=$(uname -m); [[ "$KARCH" == "x86_64" ]] && KARCH="amd64"; [[ "$KARCH" == "aarch64" ]] && KARCH="arm64"
      curl -fsSL "https://dl.k8s.io/release/$(curl -fsSL https://dl.k8s.io/release/stable.txt)/bin/linux/${KARCH}/kubectl" -o /tmp/kubectl 2>/dev/null || true
      $SUDO install -o root -g root -m 0755 /tmp/kubectl /usr/local/bin/kubectl 2>/dev/null || true
      rm -f /tmp/kubectl
    fi
    refresh_path
    has kubectl && installed "kubectl" || failed "kubectl — install manually: https://kubernetes.io/docs/tasks/tools/"
  fi

  # 6. minikube
  echo -e "${Y}[6/7]${NC} minikube..."
  if has minikube; then
    skipped "minikube"
  else
    echo "  Installing minikube..."
    if has curl; then
      MARCH=$(uname -m); [[ "$MARCH" == "x86_64" ]] && MARCH="amd64"; [[ "$MARCH" == "aarch64" ]] && MARCH="arm64"
      curl -fsSL "https://storage.googleapis.com/minikube/releases/latest/minikube-linux-${MARCH}" -o /tmp/minikube 2>/dev/null || true
      $SUDO install /tmp/minikube /usr/local/bin/minikube 2>/dev/null || true
      rm -f /tmp/minikube
    fi
    refresh_path
    has minikube && installed "minikube" || failed "minikube — install manually: https://minikube.sigs.k8s.io/docs/start/"
  fi

  # 7. Build tools
  echo -e "${Y}[7/7]${NC} Build tools..."
  if has make && has gcc; then
    skipped "Build tools"
  else
    $HAS_APT && $SUDO apt-get install -y build-essential 2>/dev/null || true
    refresh_path
    has make && installed "Build tools" || echo -e "  ${Y}⚠ build-essential not installed (optional)${NC}"
  fi
fi

# ═════════════════════════════════════════════════════════════════
#  Windows — Chocolatey (Git Bash or PowerShell)
# ═════════════════════════════════════════════════════════════════
if [[ "$PLATFORM" == "windows" ]]; then
  echo -e "${Y}TIP: Run Git Bash as Administrator for best results.${NC}"
  echo -e "${Y}     Right-click Git Bash → 'Run as Administrator'${NC}"
  echo ""

  # Check admin (non-fatal — we'll try anyway)
  IS_ADMIN=false
  if net session &>/dev/null 2>&1; then
    IS_ADMIN=true
    echo -e "  ${G}✓${NC} Running as Administrator"
  else
    echo -e "  ${Y}⚠ Not running as Administrator — some installs may need manual steps${NC}"
  fi
  echo ""

  # 1. Chocolatey
  echo -e "${Y}[1/6]${NC} Chocolatey..."
  refresh_path
  if has choco; then
    skipped "Chocolatey"
  else
    echo "  Installing Chocolatey..."
    if command -v powershell.exe &>/dev/null; then
      powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \
        "[System.Net.ServicePointManager]::SecurityProtocol = 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))" 2>/dev/null || true
    elif command -v powershell &>/dev/null; then
      powershell -NoProfile -ExecutionPolicy Bypass -Command \
        "[System.Net.ServicePointManager]::SecurityProtocol = 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))" 2>/dev/null || true
    fi
    refresh_path
    if has choco; then
      installed "Chocolatey"
    else
      failed "Chocolatey"
      echo ""
      echo -e "  ${Y}Manual install:${NC}"
      echo "  1. Open PowerShell as Admin"
      echo "  2. Run: Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
      echo "  3. Close & reopen Git Bash, then re-run this script"
      echo ""
    fi
  fi

  # Helper: install via choco with PATH refresh
  choco_install() {
    local name="$1" pkg="$2" cmd="$3"
    echo -e "${Y}[$4]${NC} ${name}..."
    refresh_path
    if has "$cmd"; then
      skipped "$name"
      return
    fi
    if has choco; then
      echo "  Installing via Chocolatey..."
      choco install "$pkg" -y --no-progress 2>/dev/null || true
      refresh_path
      if has "$cmd"; then
        installed "$name"
      else
        # Try finding it even if command -v misses
        echo -e "  ${Y}⚠ Installed but may need terminal restart to be found${NC}"
        installed "$name (restart terminal to use)"
      fi
    else
      echo -e "  ${R}✗ Chocolatey not available — install $name manually${NC}"
      failed "$name"
    fi
  }

  # 2. Git
  choco_install "Git" "git" "git" "2/6"

  # 3. Node.js
  choco_install "Node.js" "nodejs-lts" "node" "3/6"

  # 4. Docker Desktop
  echo -e "${Y}[4/6]${NC} Docker Desktop..."
  refresh_path
  if has docker; then
    skipped "Docker"
  else
    if has choco; then
      echo "  Installing Docker Desktop (this takes a few minutes)..."
      choco install docker-desktop -y --no-progress 2>/dev/null || true
      refresh_path
      if has docker; then
        installed "Docker Desktop"
      else
        installed "Docker Desktop (restart PC, then open Docker Desktop)"
      fi
      echo -e "  ${Y}⚠ IMPORTANT: Restart your PC after Docker Desktop install${NC}"
      echo -e "  ${Y}⚠ Then open Docker Desktop once to finish setup${NC}"
    else
      failed "Docker Desktop"
    fi
  fi

  # 5. kubectl
  choco_install "kubectl" "kubernetes-cli" "kubectl" "5/6"

  # 6. minikube
  choco_install "minikube" "minikube" "minikube" "6/6"
fi

# ═════════════════════════════════════════════════════════════════
#  Install project dependencies (npm)
# ═════════════════════════════════════════════════════════════════
echo ""
echo -e "${Y}[+]${NC} Installing project dependencies..."
cd "$ROOT"
refresh_path

if has npm; then
  if [[ -d "services/web/node_modules" ]]; then
    skipped "npm packages (services/web)"
  else
    echo "  Running npm install in services/web..."
    (cd services/web && npm install 2>&1) && installed "npm packages" || failed "npm packages"
  fi
else
  echo -e "  ${Y}⚠ npm not found in current shell.${NC}"
  echo -e "  ${Y}  Close this terminal, open a new one, then run:${NC}"
  echo "      cd $(basename "$ROOT") && cd services/web && npm install"
fi

# ═════════════════════════════════════════════════════════════════
#  SUMMARY
# ═════════════════════════════════════════════════════════════════
echo ""
echo -e "${B}═══════════════════════════════════════════════${NC}"
echo -e "${B}  SETUP COMPLETE${NC}"
echo -e "${B}═══════════════════════════════════════════════${NC}"
echo ""

if [[ ${#INSTALLED[@]} -gt 0 ]]; then
  echo -e "  ${G}Freshly installed:${NC}"
  for item in "${INSTALLED[@]}"; do echo -e "    ${G}✓${NC} $item"; done
  echo ""
fi
if [[ ${#SKIPPED[@]} -gt 0 ]]; then
  echo -e "  ${C}Already had:${NC}"
  for item in "${SKIPPED[@]}"; do echo -e "    ${C}●${NC} $item"; done
  echo ""
fi
if [[ ${#FAILED[@]} -gt 0 ]]; then
  echo -e "  ${R}Need manual install:${NC}"
  for item in "${FAILED[@]}"; do echo -e "    ${R}✗${NC} $item"; done
  echo ""
fi

# Final instructions
if [[ ${#INSTALLED[@]} -gt 0 ]]; then
  echo -e "  ${Y}★ IMPORTANT: Close this terminal and open a new one${NC}"
  echo -e "  ${Y}  so all PATH changes take effect.${NC}"
  echo ""
fi

if [[ "$PLATFORM" == "windows" ]] && [[ " ${INSTALLED[*]} " =~ "Docker" ]]; then
  echo -e "  ${Y}★ Restart your PC after Docker Desktop install.${NC}"
  echo ""
fi

echo -e "  ${G}Next steps:${NC}"
echo ""
echo -e "  ${G}bash scripts/start.sh local${NC}   Start local dev (fast, mock data)"
echo -e "  ${G}bash scripts/start.sh dev${NC}     Full K8s deploy (minikube)"
echo ""

[[ ${#FAILED[@]} -gt 0 ]] && exit 1
exit 0