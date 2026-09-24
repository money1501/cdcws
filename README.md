# Drawgon — Collaborative Canvas Web Platform

> A full-stack collaborative whiteboard app built with React 19, NestJS, tldraw, and PostgreSQL.  
> Users can draw, publish, and explore each other's boards — with auth, voting, comments, and bookmarks.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Running Locally](#running-locally)
- [Available Scripts](#available-scripts)
- [Database & Migrations](#database--migrations)
- [Features](#features)
- [Deployment](#deployment)
- [Known Gaps / In Progress](#known-gaps--in-progress)

---

## Overview

Drawgon (codename `ccws`) is a community driven collaborative workspace where users can:

- Create and edit infinite whiteboards powered by [tldraw](https://tldraw.dev)
- Persist drawings in a PostgreSQL database (JSONB snapshot per board)
- Publish boards publicly and explore a community feed
- Vote (upvote/downvote), comment, bookmark, and duplicate other users' boards
- Manage their account with email/password auth via [better-auth](https://better-auth.com)

---

## Tech Stack

### Frontend

| Library | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| TypeScript | ~6.0.2 | Type safety |
| Vite | ^8 | Build tool / dev server |
| tldraw | ^5 | Canvas / whiteboard engine |
| React Router | ^7 | Client-side routing |
| Tailwind CSS | ^4 | Styling |
| better-auth (client) | ^1.7.1 | Auth session management |
| Zustand | ^5 | State management |
| Axios | ^1 | HTTP client |
| Socket.IO client | ^4 | Real-time / voice gateway |
| lucide-react | ^1 | Icons |

### Backend

| Library | Version | Purpose |
|---|---|---|
| NestJS | ^11 | API framework |
| TypeORM | ^1.1 | ORM / migration runner |
| PostgreSQL (`pg`) | ^8 | Database driver |
| better-auth (server) | ^1.7.1 | Auth — session, cookie, email/password |
| `@thallesp/nestjs-better-auth` | ^2.7 | NestJS adapter + global guard for better-auth |
| Kysely | ^0.29 | SQL query builder (used by better-auth internally) |
| Socket.IO | ^4 | WebSocket gateway |
| class-validator / class-transformer | ^0.5 | DTO validation |

### Infrastructure

| Service | Purpose |
|---|---|
| PostgreSQL 16 (Docker) | Local development database |
| Netlify | Frontend static hosting |
| Render | Backend NestJS API hosting |
| Supabase | Production PostgreSQL |

---

## Project Structure

```
ccwp/
├── src/                        # Frontend (React + Vite)
│   ├── features/
│   │   ├── canvas/             # BoardCanvas (tldraw wrapper, autosave)
│   │   ├── community/          # VoteButtons, BoardCard, CommentThread
│   │   ├── share/              # Share / export utilities
│   │   └── voice/              # Voice gateway (Socket.IO)
│   ├── pages/                  # Route-level page components
│   │   ├── DashboardPage.tsx   # User's own boards
│   │   ├── BoardPage.tsx       # Edit a single board
│   │   ├── CommunityFeedPage.tsx
│   │   ├── CommunityBoardPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── SignupPage.tsx
│   │   └── ...
│   ├── lib/                    # Shared utilities & auth client
│   ├── routes/                 # Router config + ProtectedRoute
│   └── store/                  # Zustand stores
│
├── backend/                    # NestJS API
│   └── src/
│       ├── modules/
│       │   ├── boards/         # CRUD + visibility toggle + snapshot PATCH
│       │   ├── community/      # Feed, detail, votes, comments, bookmarks, duplicate
│       │   └── voice/          # Socket.IO gateway
│       ├── common/auth/        # better-auth instance + NestJS wiring
│       └── database/           # TypeORM data-source config
│
├── database/
│   ├── migrations/             # TypeORM migration files (plain TS)
│   └── seed/                   # Seed script
│
├── shared/                     # Shared types between frontend and backend
├── docker-compose.yml          # Local Postgres container
├── render.yaml                 # Render deployment blueprint (backend)
├── netlify.toml                # Netlify config (frontend)
└── .env.example                # Frontend env template
```

---

## Getting Started

> For an in-depth setup walkthrough after cloning the repository, see the [Setup Guide](docs/setup.md).

### Prerequisites

- **Node.js** `>= 20.11` (see `.nvmrc` — use `nvm use`)
- **Docker** (for local Postgres) or a local PostgreSQL 16 instance
- **npm** (comes with Node)

### Environment Variables

**Frontend** (root `.env`):

```env
VITE_API_URL=http://localhost:3000
VITE_TLDRAW_LICENSE_KEY=        # Required for non-localhost deployments only
```

Copy `.env.example` → `.env` and fill in values.

**Backend** (`backend/.env`):

```env
DATABASE_URL=postgresql://ccwp:ccwp_dev_password@localhost:5432/ccwp
BETTER_AUTH_SECRET=<generate a long random string>
BETTER_AUTH_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
```

Copy `backend/.env.example` → `backend/.env` and fill in values.

> **Note:** `VITE_TLDRAW_LICENSE_KEY` is only required in production. On `localhost`, tldraw detects a development environment and skips license enforcement. Without the key in production, the canvas is replaced with a hidden div 5 seconds after mount.

### Running Locally

**1. Start the database**

```bash
# With Docker Compose plugin
docker compose up -d

# Or plain Docker CLI (if only the CLI is installed)
docker run -d \
  --name ccwp-postgres \
  -e POSTGRES_USER=ccwp \
  -e POSTGRES_PASSWORD=ccwp_dev_password \
  -e POSTGRES_DB=ccwp \
  -p 5432:5432 \
  postgres:16-alpine
```

**2. Install dependencies**

```bash
# Frontend (from repo root)
npm install

# Backend
cd backend && npm install
```

**3. Run database migrations**

```bash
cd backend
npm run migration:run
```

**4. Start the backend**

```bash
cd backend
npm run start:dev
# Runs on http://localhost:3000
```

**5. Start the frontend**

```bash
# From repo root
npm run dev
# Runs on http://localhost:5173
```

---

## Available Scripts

### Frontend (repo root)

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run lint` | Run Oxlint |
| `npm run preview` | Preview production build locally |

### Backend (`cd backend`)

| Command | Description |
|---|---|
| `npm run start:dev` | Start NestJS in watch mode |
| `npm run start:prod` | Start compiled production build |
| `npm run build` | Compile TypeScript (`nest build` + `tsc-alias`) |
| `npm run test` | Run unit tests (Jest) |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run migration:generate -- --name=<Name>` | Generate a new TypeORM migration |
| `npm run migration:run` | Apply all pending migrations |
| `npm run migration:revert` | Revert the last applied migration |
| `npm run seed` | Run the database seed script |

---

## Database & Migrations

Migrations live in `database/migrations/` and are managed via the TypeORM CLI, run from the `backend/` directory (the CLI resolves the data-source from `backend/src/database/data-source.ts`).

### Key schema

| Table | Notes |
|---|---|
| `boards` | tldraw JSONB snapshot, `visibility` (`private`/`public`), `owner_id` FK → `user.id` |
| `user`, `session`, `account`, `verification` | Owned by better-auth; hand-written migration matches better-auth's computed schema exactly |
| `votes` | Unique per `(boardId, userId)`, `value` is `+1` or `-1` |
| `comments` | Flat list with a `parentCommentId` column reserved for future threading |
| `bookmarks` | Unique per `(boardId, userId)` |

> **Always read generated migrations before applying them**, especially when hand-written and auto-generated migrations touch the same tables. TypeORM's differ can produce destructive SQL (e.g., dropping a FK constraint it doesn't recognise) if entity declarations don't precisely match the existing schema.

---

## Features

### ✅ Implemented

| Phase | Feature |
|---|---|
| **Phase 0** | Vite + React 19 + NestJS + TypeORM + Postgres scaffold, end-to-end health check |
| **Phase 1** | Email/password auth (better-auth), deny-by-default global guard, `ProtectedRoute`, session-scoped board ownership |
| **Phase 2** | Boards CRUD, tldraw canvas with fetch-before-mount pattern, 1.5 s debounced autosave via `PATCH .../snapshot` |
| **Phase 5** | Community feed, voting (Reddit-style toggle-off-on-repeat), comments, bookmarks, board duplication, read-only canvas view, publish/unpublish toggle |

### 🚧 Not Started

| Phase | Feature |
|---|---|
| **Phase 3** | Content-block custom shapes |
| **Phase 4** | Real-time collaborative sync |
| **Phase 6** | Export (PDF / image) |

---

## Deployment

### Frontend → Netlify

The frontend is deployed as a static site on Netlify. Configuration is in `netlify.toml`.

Set the following environment variables in the **Netlify dashboard**:

| Variable | Value |
|---|---|
| `VITE_API_URL` | Your Render backend URL, e.g. `https://drawgon-api.onrender.com` |
| `VITE_TLDRAW_LICENSE_KEY` | Your tldraw SDK license key (required in production) |

### Backend → Render

The backend is deployed as a Node web service on Render. Configuration is in `render.yaml`.

Set the following in the **Render dashboard** (never commit these):

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase session pooler URI — use port `5432`, not `6543` |
| `BETTER_AUTH_SECRET` | Long random secret |
| `BETTER_AUTH_URL` | `https://<your-render-service>.onrender.com` |

The backend health check path is `GET /`, which also verifies the Postgres connection via `SELECT 1`.

### Database → Supabase

Production uses Supabase (PostgreSQL). The `ap-northeast-1` (Tokyo) region is used; the Render backend deploys to Singapore for the shortest database round-trip.

---
