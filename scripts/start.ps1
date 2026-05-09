# ═══════════════════════════════════════════════════════════════════
# Miamo — Windows Start / Stop Script (PowerShell)
# ═══════════════════════════════════════════════════════════════════
# Usage:
#   .\scripts\start.ps1 local   — Fast local dev (next dev, mock data, hot reload)
#   .\scripts\start.ps1 dev     — Full K8s deployment (minikube + Docker)
#   .\scripts\start.ps1 stop    — Stop everything
# ═══════════════════════════════════════════════════════════════════

param(
    [Parameter(Position = 0)]
    [ValidateSet("local", "dev", "stop", "")]
    [string]$Mode = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
Set-Location $Root

# ─── Usage ───────────────────────────────────────────────────────
if (-not $Mode) {
    Write-Host ""
    Write-Host "═══ Miamo Start Script ═══" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  .\scripts\start.ps1 local" -ForegroundColor Green -NoNewline
    Write-Host "   Fast local dev (no Docker/K8s needed)"
    Write-Host "  .\scripts\start.ps1 dev" -ForegroundColor Green -NoNewline
    Write-Host "     Full K8s deployment (minikube + Docker)"
    Write-Host "  .\scripts\start.ps1 stop" -ForegroundColor Green -NoNewline
    Write-Host "    Stop everything"
    Write-Host ""
    exit 0
}

# ═════════════════════════════════════════════════════════════════
#  Helper: Kill process on a port
# ═════════════════════════════════════════════════════════════════
function Kill-Port {
    param([int]$Port)
    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        if ($conn.OwningProcess -and $conn.OwningProcess -ne 0) {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}

# ═════════════════════════════════════════════════════════════════
#  STOP MODE
# ═════════════════════════════════════════════════════════════════
if ($Mode -eq "stop") {
    Write-Host ""
    Write-Host "═══ MIAMO STOP ═══" -ForegroundColor Cyan
    Write-Host ""

    # Stop local dev servers
    Write-Host "[1/3] " -ForegroundColor Yellow -NoNewline
    Write-Host "Stopping local dev servers..."
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -match "next dev"
    } | Stop-Process -Force -ErrorAction SilentlyContinue
    Kill-Port 3100
    Kill-Port 3101
    Write-Host "  ✓ Local dev servers stopped" -ForegroundColor Green

    # Stop port-forwards
    Write-Host "[2/3] " -ForegroundColor Yellow -NoNewline
    Write-Host "Stopping port-forwards..."
    Get-Process -Name "kubectl" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -match "port-forward"
    } | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ Port-forwards stopped" -ForegroundColor Green

    # Scale K8s
    Write-Host "[3/3] " -ForegroundColor Yellow -NoNewline
    Write-Host "Stopping K8s services..."
    $kubectlExists = Get-Command kubectl -ErrorAction SilentlyContinue
    if ($kubectlExists) {
        $ns = kubectl get ns miamo --no-headers 2>$null
        if ($ns) {
            kubectl scale deployment --all --replicas=0 -n miamo 2>$null
            Write-Host "  ✓ K8s deployments scaled to 0" -ForegroundColor Green
        } else {
            Write-Host "  ✓ No K8s cluster running" -ForegroundColor Green
        }
    } else {
        Write-Host "  ✓ kubectl not installed — skipping K8s" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "All stopped." -ForegroundColor Green -NoNewline
    Write-Host " Run " -NoNewline
    Write-Host ".\scripts\start.ps1 local" -ForegroundColor Yellow -NoNewline
    Write-Host " to restart."
    Write-Host ""
    exit 0
}

# ═════════════════════════════════════════════════════════════════
#  LOCAL MODE — Fast dev
# ═════════════════════════════════════════════════════════════════
if ($Mode -eq "local") {
    Write-Host ""
    Write-Host "═══ MIAMO LOCAL DEV ═══" -ForegroundColor Cyan
    Write-Host ""

    # Check Node.js
    $nodeExists = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeExists) {
        Write-Host "  ✗ Node.js not found." -ForegroundColor Red
        Write-Host "    Install: winget install OpenJS.NodeJS"
        Write-Host "    Or: https://nodejs.org"
        exit 1
    }
    $nodeV = node -v
    Write-Host "  ✓ Node.js $nodeV" -ForegroundColor Green

    # Install deps
    Write-Host "[1/3] " -ForegroundColor Yellow -NoNewline
    Write-Host "Checking dependencies..."
    if (-not (Test-Path "services\web\node_modules")) {
        Write-Host "  Installing web dependencies..."
        Push-Location "services\web"
        npm install
        Pop-Location
    }
    Write-Host "  ✓ Dependencies ready" -ForegroundColor Green

    # Clean up
    Write-Host "[2/3] " -ForegroundColor Yellow -NoNewline
    Write-Host "Cleaning up old processes..."
    Kill-Port 3100
    Start-Sleep -Seconds 1
    Write-Host "  ✓ Clean" -ForegroundColor Green

    # Start dev server
    Write-Host "[3/3] " -ForegroundColor Yellow -NoNewline
    Write-Host "Starting Next.js dev server on port 3100..."

    Write-Host ""
    Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  MIAMO LOCAL DEV IS RUNNING" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  ➜ Web App:  " -NoNewline
    Write-Host "http://localhost:3100" -ForegroundColor Green
    Write-Host ""
    Write-Host "  All pages show mock data — no backend needed." -ForegroundColor Yellow
    Write-Host "  File changes auto-reload instantly." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Stop: Ctrl+C or .\scripts\start.ps1 stop" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""

    # Run in foreground
    Set-Location "services\web"
    npx next dev -p 3100
    exit 0
}

# ═════════════════════════════════════════════════════════════════
#  DEV MODE — Full K8s (minikube)
# ═════════════════════════════════════════════════════════════════
if ($Mode -eq "dev") {
    Write-Host ""
    Write-Host "═══ MIAMO K8S DEPLOY [dev] ═══" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  For K8s deployment on Windows, use Git Bash or WSL:" -ForegroundColor Yellow
    Write-Host "    bash scripts/start.sh dev" -ForegroundColor Green
    Write-Host ""
    Write-Host "  The K8s deploy script relies on bash-specific features" -ForegroundColor Yellow
    Write-Host "  (YAML parser, sed templating) that work best in bash." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Install Git Bash: https://git-scm.com/download/win" -ForegroundColor Cyan
    Write-Host "  Or use WSL:       wsl bash scripts/start.sh dev" -ForegroundColor Cyan
    Write-Host ""
    exit 0
}
