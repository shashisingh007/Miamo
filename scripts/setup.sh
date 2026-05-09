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

# ─── Fix Windows CRLF line endings (\r) if present ───────────────
if [[ "$(head -1 "$0" | od -c | head -1)" == *'\r'* ]] || head -1 "$0" | grep -q $'\r'; then
  _SELF="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")"; pwd)/$(basename "${BASH_SOURCE[0]:-$0}")"
  if command -v sed &>/dev/null; then
    sed -i.bak 's/\r$//' "$_SELF" 2>/dev/null || sed -i 's/\r$//' "$_SELF" 2>/dev/null
    rm -f "${_SELF}.bak" 2>/dev/null
    exec bash "$_SELF" "$@"
  fi
fi

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

  # Linux: common bin paths + user-local
  [[ -d "$HOME/.local/bin" ]] && export PATH="$HOME/.local/bin:$PATH"
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
      [[ -x "$HOME/.local/bin/kubectl" ]] && return 0
      ;;
    minikube)
      [[ -x /usr/local/bin/minikube ]] && return 0
      [[ -x "$HOME/.local/bin/minikube" ]] && return 0
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
#  Linux — multi-distro (apt / dnf / yum / pacman / zypper / apk)
#  Falls back to direct binary downloads if no pkg manager found
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

  # ── Detect package manager ──────────────────────────────────
  PKG=""
  if   command -v apt-get &>/dev/null; then PKG="apt"
  elif command -v dnf     &>/dev/null; then PKG="dnf"
  elif command -v yum     &>/dev/null; then PKG="yum"
  elif command -v pacman  &>/dev/null; then PKG="pacman"
  elif command -v zypper  &>/dev/null; then PKG="zypper"
  elif command -v apk     &>/dev/null; then PKG="apk"
  fi

  # Generic package install helper
  pkg_install() {
    [[ -z "$PKG" ]] && return 1
    case "$PKG" in
      apt)    $SUDO apt-get install -y "$@" 2>/dev/null ;;
      dnf)    $SUDO dnf install -y "$@" 2>/dev/null ;;
      yum)    $SUDO yum install -y "$@" 2>/dev/null ;;
      pacman) $SUDO pacman -S --noconfirm "$@" 2>/dev/null ;;
      zypper) $SUDO zypper install -y "$@" 2>/dev/null ;;
      apk)    $SUDO apk add --no-cache "$@" 2>/dev/null ;;
    esac
  }

  # Download helpers — use curl OR wget, whichever is available
  _dl() {
    local url="$1" dest="$2"
    if command -v curl &>/dev/null; then
      curl -fsSL "$url" -o "$dest" 2>/dev/null
    elif command -v wget &>/dev/null; then
      wget -qO "$dest" "$url" 2>/dev/null
    else
      return 1
    fi
  }
  _dl_pipe() {
    local url="$1"
    if command -v curl &>/dev/null; then
      curl -fsSL "$url" 2>/dev/null
    elif command -v wget &>/dev/null; then
      wget -qO- "$url" 2>/dev/null
    else
      return 1
    fi
  }

  # ── 1. Update package index ─────────────────────────────────
  echo -e "${Y}[1/7]${NC} Package index..."
  case "$PKG" in
    apt)    $SUDO apt-get update -qq 2>/dev/null && echo -e "  ${G}✓${NC} Updated" || echo -e "  ${Y}⚠ apt update had warnings${NC}" ;;
    dnf)    echo -e "  ${C}● Using dnf${NC}" ;;
    yum)    echo -e "  ${C}● Using yum${NC}" ;;
    pacman) $SUDO pacman -Sy --noconfirm 2>/dev/null && echo -e "  ${G}✓${NC} Synced" || true ;;
    zypper) $SUDO zypper refresh 2>/dev/null && echo -e "  ${G}✓${NC} Refreshed" || true ;;
    apk)    $SUDO apk update 2>/dev/null && echo -e "  ${G}✓${NC} Updated" || true ;;
    *)      echo -e "  ${Y}⚠ No package manager found — will use direct downloads${NC}" ;;
  esac

  # ── 2. Git & curl (needed for everything else) ──────────────
  echo -e "${Y}[2/7]${NC} Git & curl..."
  if has git && has curl; then
    skipped "Git & curl"
  else
    if [[ -n "$PKG" ]]; then
      # Package names vary slightly across distros
      case "$PKG" in
        apt)    pkg_install git curl ca-certificates gnupg || true ;;
        pacman) pkg_install git curl ca-certificates-utils || true ;;
        apk)    pkg_install git curl ca-certificates || true ;;
        *)      pkg_install git curl ca-certificates || true ;;
      esac
    fi
    refresh_path
    if has git && has curl; then
      installed "Git & curl"
    elif has git && has wget; then
      installed "Git (using wget for downloads)"
    elif has git; then
      installed "Git"
      echo -e "  ${Y}⚠ curl not available — some installs may be limited${NC}"
    else
      # Last resort: try to grab statically-linked curl if wget exists
      if has wget; then
        echo "  Trying to fetch curl via wget..."
        CARCH=$(uname -m); [[ "$CARCH" == "x86_64" ]] && CARCH="amd64"; [[ "$CARCH" == "aarch64" ]] && CARCH="arm64"
        wget -qO /tmp/curl.tar.xz "https://github.com/moparisthebest/static-curl/releases/latest/download/curl-${CARCH}.tar.xz" 2>/dev/null && \
          tar -xJf /tmp/curl.tar.xz -C /tmp/ 2>/dev/null && \
          ($SUDO install -m 0755 /tmp/curl /usr/local/bin/curl 2>/dev/null || install -m 0755 /tmp/curl "$HOME/.local/bin/curl" 2>/dev/null) && \
          rm -f /tmp/curl /tmp/curl.tar.xz 2>/dev/null
        refresh_path
        has curl && echo -e "  ${G}✓ Got curl via wget${NC}"
      fi
      (has git || has curl || has wget) && installed "Git/curl (partial)" || failed "Git & curl"
    fi
  fi

  # ── 3. Node.js ──────────────────────────────────────────────
  echo -e "${Y}[3/7]${NC} Node.js..."
  refresh_path
  if has node; then
    skipped "Node.js ($(node -v 2>/dev/null || echo '?'))"
  else
    echo "  Installing Node.js 20.x..."
    _NODE_OK=false

    # Method A: package-manager–specific repo setup
    if ! $_NODE_OK && [[ "$PKG" == "apt" ]] && (has curl || has wget); then
      _dl_pipe "https://deb.nodesource.com/setup_20.x" | $SUDO -E bash - 2>/dev/null || true
      $SUDO apt-get install -y nodejs 2>/dev/null || true
      refresh_path; has node && _NODE_OK=true
    fi
    if ! $_NODE_OK && [[ "$PKG" == "dnf" || "$PKG" == "yum" ]] && (has curl || has wget); then
      _dl_pipe "https://rpm.nodesource.com/setup_20.x" | $SUDO bash - 2>/dev/null || true
      $SUDO $PKG install -y nodejs 2>/dev/null || true
      refresh_path; has node && _NODE_OK=true
    fi
    if ! $_NODE_OK && [[ "$PKG" == "pacman" ]]; then
      pkg_install nodejs npm || true
      refresh_path; has node && _NODE_OK=true
    fi
    if ! $_NODE_OK && [[ "$PKG" == "zypper" ]]; then
      pkg_install nodejs20 npm20 2>/dev/null || pkg_install nodejs npm 2>/dev/null || true
      refresh_path; has node && _NODE_OK=true
    fi
    if ! $_NODE_OK && [[ "$PKG" == "apk" ]]; then
      pkg_install nodejs npm || true
      refresh_path; has node && _NODE_OK=true
    fi

    # Method B: direct binary download (works on ANY Linux)
    if ! $_NODE_OK && (has curl || has wget); then
      echo "  Package manager didn't work — trying direct binary download..."
      NARCH=$(uname -m)
      [[ "$NARCH" == "x86_64" ]]  && NARCH="x64"
      [[ "$NARCH" == "aarch64" ]] && NARCH="arm64"
      [[ "$NARCH" == "armv7l" ]]  && NARCH="armv7l"
      NODE_VER="v20.18.1"
      NODE_TAR="node-${NODE_VER}-linux-${NARCH}.tar.xz"
      NODE_URL="https://nodejs.org/dist/${NODE_VER}/${NODE_TAR}"

      if _dl "$NODE_URL" "/tmp/${NODE_TAR}"; then
        # Unpack: try xz first, then gz fallback
        if command -v xz &>/dev/null || command -v unxz &>/dev/null; then
          tar -xJf "/tmp/${NODE_TAR}" -C /tmp/ 2>/dev/null
        else
          # If xz is not installed, try fetching .tar.gz instead
          NODE_TAR="node-${NODE_VER}-linux-${NARCH}.tar.gz"
          NODE_URL="https://nodejs.org/dist/${NODE_VER}/${NODE_TAR}"
          _dl "$NODE_URL" "/tmp/${NODE_TAR}" && tar -xzf "/tmp/${NODE_TAR}" -C /tmp/ 2>/dev/null
        fi
        # Install to /usr/local or ~/.local
        if [[ -d "/tmp/node-${NODE_VER}-linux-${NARCH}" ]]; then
          $SUDO cp -r /tmp/node-${NODE_VER}-linux-${NARCH}/{bin,include,lib,share} /usr/local/ 2>/dev/null || {
            mkdir -p "$HOME/.local/bin" 2>/dev/null
            cp -r /tmp/node-${NODE_VER}-linux-${NARCH}/{bin,include,lib,share} "$HOME/.local/" 2>/dev/null
            export PATH="$HOME/.local/bin:$PATH"
          }
        fi
        rm -rf "/tmp/${NODE_TAR}" "/tmp/node-${NODE_VER}-linux-${NARCH}" 2>/dev/null
        refresh_path; has node && _NODE_OK=true
      fi
    fi

    # Method C: nvm
    if ! $_NODE_OK && (has curl || has wget); then
      echo "  Trying nvm..."
      export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
      _dl_pipe "https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh" | bash 2>/dev/null || true
      [[ -s "$NVM_DIR/nvm.sh" ]] && . "$NVM_DIR/nvm.sh" 2>/dev/null
      command -v nvm &>/dev/null && nvm install 20 2>/dev/null || true
      refresh_path; has node && _NODE_OK=true
    fi

    $_NODE_OK && installed "Node.js ($(node -v 2>/dev/null))" || failed "Node.js"
  fi

  # ── 4. Docker ───────────────────────────────────────────────
  echo -e "${Y}[4/7]${NC} Docker..."
  if has docker; then
    skipped "Docker"
  else
    echo "  Installing Docker Engine..."
    _DOCKER_OK=false

    # Method A: apt-based (Debian/Ubuntu)
    if ! $_DOCKER_OK && [[ "$PKG" == "apt" ]] && (has curl || has wget); then
      $SUDO install -m 0755 -d /etc/apt/keyrings 2>/dev/null || true
      if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        DISTRO_ID="${ID}"; DISTRO_CODENAME="${VERSION_CODENAME:-$(lsb_release -cs 2>/dev/null || echo jammy)}"
      else
        DISTRO_ID="ubuntu"; DISTRO_CODENAME="jammy"
      fi
      _dl_pipe "https://download.docker.com/linux/${DISTRO_ID}/gpg" | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null || true
      $SUDO chmod a+r /etc/apt/keyrings/docker.gpg 2>/dev/null || true
      echo "deb [arch=$(dpkg --print-architecture 2>/dev/null || echo amd64) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${DISTRO_ID} ${DISTRO_CODENAME} stable" | \
        $SUDO tee /etc/apt/sources.list.d/docker.list > /dev/null 2>/dev/null || true
      $SUDO apt-get update -qq 2>/dev/null || true
      $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin 2>/dev/null || true
      refresh_path; has docker && _DOCKER_OK=true
    fi

    # Method B: dnf/yum (Fedora/RHEL/CentOS)
    if ! $_DOCKER_OK && [[ "$PKG" == "dnf" || "$PKG" == "yum" ]]; then
      $SUDO $PKG install -y dnf-plugins-core 2>/dev/null || true
      $SUDO $PKG config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo 2>/dev/null || \
        $SUDO $PKG config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo 2>/dev/null || true
      $SUDO $PKG install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin 2>/dev/null || true
      refresh_path; has docker && _DOCKER_OK=true
    fi

    # Method C: pacman (Arch)
    if ! $_DOCKER_OK && [[ "$PKG" == "pacman" ]]; then
      pkg_install docker docker-buildx || true
      refresh_path; has docker && _DOCKER_OK=true
    fi

    # Method D: zypper (openSUSE)
    if ! $_DOCKER_OK && [[ "$PKG" == "zypper" ]]; then
      pkg_install docker docker-buildx || true
      refresh_path; has docker && _DOCKER_OK=true
    fi

    # Method E: apk (Alpine)
    if ! $_DOCKER_OK && [[ "$PKG" == "apk" ]]; then
      pkg_install docker docker-cli-buildx || true
      refresh_path; has docker && _DOCKER_OK=true
    fi

    # Method F: official convenience script (works on many distros)
    if ! $_DOCKER_OK && (has curl || has wget); then
      echo "  Trying official install script (get.docker.com)..."
      _dl_pipe "https://get.docker.com" | $SUDO sh 2>/dev/null || true
      refresh_path; has docker && _DOCKER_OK=true
    fi

    if $_DOCKER_OK; then
      $SUDO usermod -aG docker "$USER" 2>/dev/null || true
      $SUDO systemctl enable docker 2>/dev/null || true
      $SUDO systemctl start docker 2>/dev/null || true
      installed "Docker"
      echo -e "  ${Y}⚠ Log out & back in for docker group to take effect${NC}"
    else
      failed "Docker"
    fi
  fi

  # ── 5. kubectl ──────────────────────────────────────────────
  echo -e "${Y}[5/7]${NC} kubectl..."
  if has kubectl; then
    skipped "kubectl"
  else
    echo "  Installing kubectl..."
    _KUBE_OK=false

    # Try package manager repo first (apt)
    if ! $_KUBE_OK && [[ "$PKG" == "apt" ]] && (has curl || has wget); then
      _dl_pipe "https://pkgs.k8s.io/core:/stable:/v1.31/deb/Release.key" | $SUDO gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg 2>/dev/null || true
      echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.31/deb/ /" | \
        $SUDO tee /etc/apt/sources.list.d/kubernetes.list > /dev/null 2>/dev/null || true
      $SUDO apt-get update -qq 2>/dev/null || true
      $SUDO apt-get install -y kubectl 2>/dev/null || true
      refresh_path; has kubectl && _KUBE_OK=true
    fi

    # Try package manager (dnf/yum)
    if ! $_KUBE_OK && [[ "$PKG" == "dnf" || "$PKG" == "yum" ]]; then
      cat <<'KREPO' | $SUDO tee /etc/yum.repos.d/kubernetes.repo > /dev/null 2>/dev/null
[kubernetes]
name=Kubernetes
baseurl=https://pkgs.k8s.io/core:/stable:/v1.31/rpm/
enabled=1
gpgcheck=1
gpgkey=https://pkgs.k8s.io/core:/stable:/v1.31/rpm/repodata/repomd.xml.key
KREPO
      $SUDO $PKG install -y kubectl 2>/dev/null || true
      refresh_path; has kubectl && _KUBE_OK=true
    fi

    # Try native package (pacman/zypper/apk)
    if ! $_KUBE_OK && [[ "$PKG" == "pacman" || "$PKG" == "zypper" || "$PKG" == "apk" ]]; then
      pkg_install kubectl || true
      refresh_path; has kubectl && _KUBE_OK=true
    fi

    # Direct binary download (any Linux)
    if ! $_KUBE_OK && (has curl || has wget); then
      echo "  Trying direct download..."
      KARCH=$(uname -m); [[ "$KARCH" == "x86_64" ]] && KARCH="amd64"; [[ "$KARCH" == "aarch64" ]] && KARCH="arm64"
      K_VER=$(_dl_pipe "https://dl.k8s.io/release/stable.txt" 2>/dev/null || echo "v1.31.0")
      _dl "https://dl.k8s.io/release/${K_VER}/bin/linux/${KARCH}/kubectl" /tmp/kubectl && \
        ($SUDO install -m 0755 /tmp/kubectl /usr/local/bin/kubectl 2>/dev/null || install -m 0755 /tmp/kubectl "$HOME/.local/bin/kubectl" 2>/dev/null)
      rm -f /tmp/kubectl
      refresh_path; has kubectl && _KUBE_OK=true
    fi

    $_KUBE_OK && installed "kubectl" || failed "kubectl"
  fi

  # ── 6. minikube ─────────────────────────────────────────────
  echo -e "${Y}[6/7]${NC} minikube..."
  if has minikube; then
    skipped "minikube"
  else
    echo "  Installing minikube..."
    _MINI_OK=false

    # Try native package
    if ! $_MINI_OK && [[ "$PKG" == "pacman" || "$PKG" == "apk" ]]; then
      pkg_install minikube || true
      refresh_path; has minikube && _MINI_OK=true
    fi

    # Direct binary download (most reliable)
    if ! $_MINI_OK && (has curl || has wget); then
      MARCH=$(uname -m); [[ "$MARCH" == "x86_64" ]] && MARCH="amd64"; [[ "$MARCH" == "aarch64" ]] && MARCH="arm64"
      _dl "https://storage.googleapis.com/minikube/releases/latest/minikube-linux-${MARCH}" /tmp/minikube && \
        ($SUDO install /tmp/minikube /usr/local/bin/minikube 2>/dev/null || install -m 0755 /tmp/minikube "$HOME/.local/bin/minikube" 2>/dev/null)
      rm -f /tmp/minikube
      refresh_path; has minikube && _MINI_OK=true
    fi

    $_MINI_OK && installed "minikube" || failed "minikube"
  fi

  # ── 7. Build tools (optional) ──────────────────────────────
  echo -e "${Y}[7/7]${NC} Build tools..."
  if has make && has gcc; then
    skipped "Build tools"
  else
    case "$PKG" in
      apt)           pkg_install build-essential || true ;;
      dnf|yum)       pkg_install gcc gcc-c++ make || true ;;
      pacman)        pkg_install base-devel || true ;;
      zypper)        pkg_install -t pattern devel_basis || true ;;
      apk)           pkg_install build-base || true ;;
    esac
    refresh_path
    has make && installed "Build tools" || echo -e "  ${Y}⚠ Build tools not installed (optional)${NC}"
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