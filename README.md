# ♠️ Poker

A premium, fully-local poker app built with TanStack Start, Supabase, and Tailwind CSS.

## Features

- **Full Texas Hold'em gameplay** — preflop, flop, turn, river with proper betting rounds
- **Real-time multiplayer** — WebSocket subscriptions via Supabase Realtime for live table updates
- **Hand equity calculator** — Monte Carlo simulation (200 iterations) estimates win/tie/loss odds in real time
- **Pot odds math** — automatic pot-odds vs. hand-strength comparison to guide decisions
- **Premium iPhone-style UI** — smooth animations (card deal, chip stacking, pot glow), glassmorphism, gold accents, GPU-accelerated transitions
- **Fully local** — No cloud dependencies. Supabase runs in Docker on your machine
- **Email/password auth** — local Supabase auth with instant sign-up (no email confirmation required in dev)
- **Multi-table lobby** — join tables, sit/stand, buy in with configurable amounts
- **In-table chat** — real-time messaging with desktop sidebar + mobile drawer
- **Admin panel** — monitor tables, users, and game state via `/_authenticated/admin`

## Tech Stack

| Layer        | Technology                                               |
| ------------ | -------------------------------------------------------- |
| Framework    | [TanStack Start](https://tanstack.com/start) (SSR + SPA) |
| UI Library   | React 19                                                  |
| Styling      | Tailwind CSS 4 + custom animations                        |
| Database     | PostgreSQL (via Supabase)                                 |
| Auth         | Supabase Auth (email/password)                            |
| State        | TanStack React Query                                      |
| Build        | Vite 7 + Bun                                              |
| Container    | Docker Desktop + Supabase CLI                             |

## Prerequisites

- **Docker Desktop** (required for local Supabase)
- **Bun** (or Node.js 20+)
- **Supabase CLI** (`npm install -g supabase` or `bun install -g supabase`)

## Installation

```bash
# Clone the repo
git clone https://github.com/boop-web/poker.git
cd poker

# Install dependencies
bun install

# Start local Supabase
supabase start

# Expected output (takes ~2 min first time):
# Started supabase local development setup:
#          API URL: http://127.0.0.1:54321
#          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
#      Studio URL: http://127.0.0.1:54323
#    Inbucket URL: http://127.0.0.1:54324
#         anon key: <publishable-key>
# service_role key: <service-role-key>

# Verify environment variables in .env (defaults point to local Supabase)
cat .env

# Run database migrations
supabase db push

# Start the dev server
bun run dev
# → http://localhost:8080
```

## Local Supabase Services

| Service           | URL                                |
| ----------------- | ---------------------------------- |
| App (dev server)  | http://localhost:8080               |
| Supabase API      | http://127.0.0.1:54321              |
| Supabase Studio   | http://127.0.0.1:54323              |
| Mailpit (emails)  | http://127.0.0.1:54324              |

## Project Structure

```
src/
├── components/
│   ├── poker/          # Game UI components (Seat, PlayingCard, ChipStack, ActionBar, etc.)
│   └── ui/             # shadcn/ui primitives (button, dialog, input, etc.)
├── hooks/              # useAuth, use-mobile
├── integrations/
│   └── supabase/       # Client, server client, auth middleware, types
├── lib/
│   ├── poker.ts        # Core poker logic (deck, hand evaluation, Monte Carlo)
│   └── poker.functions.ts  # Server functions (joinSeat, startHand, performAction, etc.)
├── routes/             # TanStack Router file-based routes
│   ├── login.tsx
│   ├── register.tsx
│   └── _authenticated/
│       ├── lobby.tsx
│       ├── admin.tsx
│       └── table.$tableId.tsx
└── styles.css          # Global styles, animations, premium utilities
```

## Scripts

| Command           | Description                      |
| ----------------- | -------------------------------- |
| `bun run dev`     | Start dev server on port 8080     |
| `bun run build`   | Production build                  |
| `bun run preview` | Preview production build          |
| `bun run lint`    | ESLint                           |
| `bun run format`  | Prettier                         |
