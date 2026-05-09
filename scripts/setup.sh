#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# Miamo — System Setup (installs all prerequisites)
# ═══════════════════════════════════════════════════════════════════
#
#  bash scripts/setup.sh              Auto-detect OS
#  bash scripts/setup.sh mac          macOS (Homebrew)
#  bash scripts/setup.sh linux        Linux/Ubuntu/Debian (apt)
#  bash scripts/setup.sh windows      Windows (Chocolatey, run in Git Bash)
#
#  After running this, your system is ready to:
#    bash scripts/start.sh local      — Just needs Node.js
#    bash scripts/start.sh dev        — Needs Node.js + Docker + minikube + kubectl
#
# ═══════════════════════════════════════════════════════════════════

set -e

# ─── Colors ──────────────────────────────────────────────────────
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[1;34m'; C='\033[0;36m'; NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")"; pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ─── Platform Detection ─────────────────────────────────────────
detect_platform() {
  case "$(uname -s 2>/dev/null || echo Windows)" in
    Darwin*)  echo "mac" ;;
    Linux*)   echo "linux" ;;
    MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
    *)        echo "linux" ;;
  esac
}

PLATFORM="${1:-$(detect_platform)}"

# Validate
if [[ "$PLATFORM" != "mac" && "$PLATFORM" != "linux" && "$PLATFORM" != "windows" ]]; then
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

INSTALLED=()
SKIPPED=()
FAILED=()

installed() { INSTALLED+=("$1"); echo -e "  ${G}✓ $1 installed${NC}"; }
skipped()   { SKIPPED+=("$1");  echo -e "  ${C}● $1 already installed${NC}"; }
failed()    { FAILED+=("$1");   echo -e "  ${R}✗ $1 failed${NC}"; }

# ═════════════════════════════════════════════════════════════════
#  macOS — Homebrew
# ═════════════════════════════════════════════════════════════════
if [[ "$PLATFORM" == "mac" ]]; then
  echo -e "${Y}[1/6]${NC} Homebrew..."
  if command -v brew &>/dev/null; then
    skipped "Homebrew"
  else
    echo "  Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # Add brew to PATH for Apple Silicon
    if [[ -f /opt/homebrew/bin/brew ]]; then
      eval "$(/opt/homebrew/bin/brew shellenv)"
      echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
    fi
    installed "Homebrew"
  fi

  echo -e "${Y}[2/6]${NC} Node.js..."
  if command -v node &>/dev/null; then
    NODE_V=$(node -v)
    skipped "Node.js ($NODE_V)"
  else
    brew install node && installed "Node.js" || failed "Node.js"
  fi

  echo -e "${Y}[3/6]${NC} Git..."
  if command -v git &>/dev/null; then
    skipped "Git"
  else
    brew install git && installed "Git" || failed "Git"
  fi

  echo -e "${Y}[4/6]${NC} Docker..."
  if command -v docker &>/dev/null; then
    skipped "Docker"
  else
    echo "  Installing Docker Desktop..."
    brew install --cask docker && installed "Docker Desktop" || failed "Docker Desktop"
    echo -e "  ${Y}⚠ Open Docker Desktop once to complete setup${NC}"
  fi

  echo -e "${Y}[5/6]${NC} kubectl..."
  if command -v kubectl &>/dev/null; then
    skipped "kubectl"
  else
    brew install kubectl && installed "kubectl" || failed "kubectl"
  fi

  echo -e "${Y}[6/6]${NC} minikube..."
  if command -v minikube &>/dev/null; then
    skipped "minikube"
  else
    brew install minikube && installed "minikube" || failed "minikube"
  fi
fi

# ═════════════════════════════════════════════════════════════════
#  Linux — apt (Debian/Ubuntu)
# ═════════════════════════════════════════════════════════════════
if [[ "$PLATFORM" == "linux" ]]; then
  # Check if we have sudo
  SUDO=""
  if [[ $EUID -ne 0 ]]; then
    if command -v sudo &>/dev/null; then
      SUDO="sudo"
    else
      echo -e "${R}✗ Need root or sudo to install packages${NC}"
      exit 1
    fi
  fi

  echo -e "${Y}[1/7]${NC} Updating package index..."
  $SUDO apt-get update -qq 2>/dev/null && echo -e "  ${G}✓${NC} Updated" || echo -e "  ${Y}⚠ Update failed (may not be apt-based)${NC}"

  echo -e "${Y}[2/7]${NC} Git & curl..."
  if command -v git &>/dev/null && command -v curl &>/dev/null; then
    skipped "Git & curl"
  else
    $SUDO apt-get install -y git curl ca-certificates gnupg 2>/dev/null && installed "Git & curl" || failed "Git & curl"
  fi

  echo -e "${Y}[3/7]${NC} Node.js..."
  if command -v node &>/dev/null; then
    NODE_V=$(node -v)
    skipped "Node.js ($NODE_V)"
  else
    echo "  Installing Node.js 20.x via nodesource..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO -E bash - 2>/dev/null
    $SUDO apt-get install -y nodejs 2>/dev/null && installed "Node.js" || failed "Node.js"
  fi

  echo -e "${Y}[4/7]${NC} Docker..."
  if command -v docker &>/dev/null; then
    skipped "Docker"
  else
    echo "  Installing Docker Engine..."
    # Add Docker GPG key and repo
    $SUDO install -m 0755 -d /etc/apt/keyrings 2>/dev/null
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null
    $SUDO chmod a+r /etc/apt/keyrings/docker.gpg 2>/dev/null
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      $SUDO tee /etc/apt/sources.list.d/docker.list > /dev/null 2>/dev/null
    $SUDO apt-get update -qq 2>/dev/null
    $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin 2>/dev/null && {
      installed "Docker"
      # Add current user to docker group (no sudo needed for docker commands)
      $SUDO usermod -aG docker "$USER" 2>/dev/null && \
        echo -e "  ${Y}⚠ Log out & back in for docker group to take effect${NC}"
    } || failed "Docker"
  fi

  echo -e "${Y}[5/7]${NC} kubectl..."
  if command -v kubectl &>/dev/null; then
    skipped "kubectl"
  else
    echo "  Installing kubectl..."
    curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.31/deb/Release.key | $SUDO gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg 2>/dev/null
    echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.31/deb/ /" | \
      $SUDO tee /etc/apt/sources.list.d/kubernetes.list > /dev/null 2>/dev/null
    $SUDO apt-get update -qq 2>/dev/null
    $SUDO apt-get install -y kubectl 2>/dev/null && installed "kubectl" || failed "kubectl"
  fi

  echo -e "${Y}[6/7]${NC} minikube..."
  if command -v minikube &>/dev/null; then
    skipped "minikube"
  else
    echo "  Installing minikube..."
    ARCH=$(dpkg --print-architecture 2>/dev/null || echo "amd64")
    curl -fsSL "https://storage.googleapis.com/minikube/releases/latest/minikube-linux-${ARCH}" -o /tmp/minikube
    $SUDO install /tmp/minikube /usr/local/bin/minikube
    rm -f /tmp/minikube
    installed "minikube" || failed "minikube"
  fi

  echo -e "${Y}[7/7]${NC} Build tools..."
  if command -v make &>/dev/null && command -v gcc &>/dev/null; then
    skipped "Build tools"
  else
    $SUDO apt-get install -y build-essential 2>/dev/null && installed "Build tools" || failed "Build tools"
  fi
fi

# ═════════════════════════════════════════════════════════════════
#  Windows — Chocolatey (run in Git Bash as Administrator)
# ═════════════════════════════════════════════════════════════════
if [[ "$PLATFORM" == "windows" ]]; then
  echo -e "${Y}NOTE: Run this script in Git Bash as Administrator${NC}"
  echo ""

  # Check if running as admin (Git Bash on Windows)
  if ! net session &>/dev/null 2>&1; then
    echo -e "${R}✗ This script needs Administrator privileges on Windows.${NC}"
    echo ""
    echo "  Steps:"
    echo "  1. Right-click Git Bash → 'Run as Administrator'"
    echo "  2. cd to your Miamo folder"
    echo "  3. Run: bash scripts/setup.sh windows"
    echo ""
    exit 1
  fi

  echo -e "${Y}[1/6]${NC} Chocolatey..."
  if command -v choco &>/dev/null; then
    skipped "Chocolatey"
  else
    echo "  Installing Chocolatey..."
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \
      "[System.Net.ServicePointManager]::SecurityProtocol = 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))" 2>/dev/null
    # Refresh PATH
    export PATH="$PATH:/c/ProgramData/chocolatey/bin"
    if command -v choco &>/dev/null; then
      installed "Chocolatey"
    else
      failed "Chocolatey"
      echo -e "  ${R}Cannot continue without Chocolatey. Install manually:${NC}"
      echo "  https://chocolatey.org/install"
      exit 1
    fi
  fi

  echo -e "${Y}[2/6]${NC} Git..."
  if command -v git &>/dev/null; then
    skipped "Git"
  else
    choco install git -y --no-progress && installed "Git" || failed "Git"
  fi

  echo -e "${Y}[3/6]${NC} Node.js..."
  if command -v node &>/dev/null; then
    NODE_V=$(node -v)
    skipped "Node.js ($NODE_V)"
  else
    choco install nodejs-lts -y --no-progress && installed "Node.js" || failed "Node.js"
  fi

  echo -e "${Y}[4/6]${NC} Docker Desktop..."
  if command -v docker &>/dev/null; then
    skipped "Docker"
  else
    echo "  Installing Docker Desktop (this may take a few minutes)..."
    choco install docker-desktop -y --no-progress && {
      installed "Docker Desktop"
      echo -e "  ${Y}⚠ Restart your PC after Docker Desktop install${NC}"
      echo -e "  ${Y}⚠ Open Docker Desktop once to complete setup${NC}"
    } || failed "Docker Desktop"
  fi

  echo -e "${Y}[5/6]${NC} kubectl..."
  if command -v kubectl &>/dev/null; then
    skipped "kubectl"
  else
    choco install kubernetes-cli -y --no-progress && installed "kubectl" || failed "kubectl"
  fi

  echo -e "${Y}[6/6]${NC} minikube..."
  if command -v minikube &>/dev/null; then
    skipped "minikube"
  else
    choco install minikube -y --no-progress && installed "minikube" || failed "minikube"
  fi
fi

# ═════════════════════════════════════════════════════════════════
#  Install project dependencies (npm install)
# ═════════════════════════════════════════════════════════════════
echo ""
echo -e "${Y}[+]${NC} Installing project dependencies..."
cd "$ROOT"
if command -v npm &>/dev/null; then
  if [[ -d "services/web/node_modules" ]]; then
    skipped "npm packages (services/web)"
  else
    echo "  Running npm install in services/web..."
    (cd services/web && npm install) && installed "npm packages" || failed "npm packages"
  fi
else
  echo -e "  ${Y}⚠ npm not available yet — restart your terminal, then run:${NC}"
  echo "    cd services/web && npm install"
fi

# ═════════════════════════════════════════════════════════════════
#  Summary
# ═════════════════════════════════════════════════════════════════
echo ""
echo -e "${B}═══════════════════════════════════════════════${NC}"
echo -e "${B}  SETUP COMPLETE${NC}"
echo -e "${B}═══════════════════════════════════════════════${NC}"
echo ""

if [[ ${#INSTALLED[@]} -gt 0 ]]; then
  echo -e "  ${G}Installed:${NC}"
  for item in "${INSTALLED[@]}"; do
    echo -e "    ${G}✓${NC} $item"
  done
fi
if [[ ${#SKIPPED[@]} -gt 0 ]]; then
  echo -e "  ${C}Already had:${NC}"
  for item in "${SKIPPED[@]}"; do
    echo -e "    ${C}●${NC} $item"
  done
fi
if [[ ${#FAILED[@]} -gt 0 ]]; then
  echo ""
  echo -e "  ${R}Failed (install manually):${NC}"
  for item in "${FAILED[@]}"; do
    echo -e "    ${R}✗${NC} $item"
  done
fi

echo ""
echo -e "  ${G}Ready to go!${NC}"
echo ""
echo -e "  ${G}bash scripts/start.sh local${NC}   — Start local dev (mock data, hot reload)"
echo -e "  ${G}bash scripts/start.sh dev${NC}     — Full K8s deploy (minikube)"
echo ""

if [[ "$PLATFORM" == "windows" ]]; then
  echo -e "  ${Y}⚠ Restart your terminal (or PC if Docker was just installed)${NC}"
  echo -e "  ${Y}  so PATH changes take effect.${NC}"
  echo ""
fi

if [[ ${#FAILED[@]} -gt 0 ]]; then
  exit 1
fi
exit 0
