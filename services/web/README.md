# Miamo Web

Next.js 14 frontend for the Miamo dating platform. Premium romantic UI with 3D glass effects and heart animations.

## Features

- **Premium Glass UI** — 3D mirror-glass buttons, frosted glass sidebar/header with `backdrop-blur-xl`
- **Romantic Animations** — Floating hearts, heartbeat pulse, shimmer effects
- **Pink Theme** — Soft romantic palette (`#FDF2F5` base, pink-500/600 accents)
- **Hearts Logo** — Custom SVG with overlapping gradient hearts
- **Responsive** — Mobile-first with sidebar navigation on desktop
- **Standalone Mode** — Optimized Docker production build (~185MB)

## Tech Stack

- Next.js 14 (App Router, standalone output)
- TypeScript
- Tailwind CSS
- Framer Motion (animations)
- Zustand (state)

## Pages

| Route | Description |
|-------|-------------|
| `/discover` | Swipe cards with AI compatibility scores |
| `/matches` | Match list with chat initiation |
| `/messages` | Real-time messaging |
| `/feed` | Social feed posts |
| `/stories` | Stories carousel |
| `/videos` | Short video reels |
| `/ai-match` | AI-powered matching |
| `/profile` | User profile editor |
| `/search` | User search with filters |
| `/notifications` | Activity notifications |
| `/settings` | App settings |
| `/premium` | Premium subscription |
| `/beats` | Music beats sharing |
| `/creativity` | Creative content |
| `/safety` | Safety center |
| `/serious-mode` | Serious dating mode |

## Development

```bash
cd services/web
npm install
npm run dev    # http://localhost:3100
```

## Build & Deploy

```bash
# Build Docker image (from project root)
eval $(minikube docker-env)
docker build -f docker/web.Dockerfile -t miamo-web:latest .

# Redeploy
kubectl rollout restart deployment/web -n miamo
```

## Custom CSS Utilities

Defined in `src/app/globals.css`:

- `.btn-glass` — 3D glass mirror button with hover lift
- `.floating-hearts` — Animated romantic hearts overlay
- `.heartbeat` — Pulsing heartbeat animation
- `.shimmer-glass` — Glass shimmer effect
- `.glow-border` — Soft glowing border
- `.hover-lift` — Hover scale + shadow lift
- `.text-romantic` — Gradient romantic text
- `.card-3d` — 3D perspective card
