# Drawgon — Local Setup Guide

This guide walks you through setting up and running **Drawgon** locally from scratch after pulling or cloning the repository from Git.

---

## 1. Prerequisites (What to Install)

Before running the project, make sure you have the following tools installed on your operating system:

| Tool | Recommended Version | Download / Installation Link | Purpose |
|---|---|---|---|
| **Node.js** | `>= 20.11.0` (LTS recommended) | [nodejs.org](https://nodejs.org/) or via `nvm` / `fnm` | JavaScript runtime for frontend & backend |
| **npm** | `>= 10.0.0` | Bundled with Node.js | Package manager |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) | Version control |
| **Docker & Docker Compose** | Latest Desktop or Engine | [docker.com](https://www.docker.com/) | Runs local PostgreSQL 16 container |
| *Alternative:* **PostgreSQL** | `16.x` | [postgresql.org](https://www.postgresql.org/) | If not using Docker |

> [!TIP]
> If you use **nvm** (Node Version Manager) or **nvm-windows**, run `nvm use` in the repository root — it will automatically match the `.nvmrc` version.

---

## 2. Step-by-Step Setup

### Step 1: Clone / Pull the Repository

```bash
git clone <repository-url>
cd Drawgon
```

If you already have the repository:
```bash
git pull origin main
```

---

### Step 2: Install Dependencies

Drawgon has two separate dependency trees: the **root (frontend)** and the **backend (NestJS API)**.

#### 1. Install Frontend Dependencies (Root)
```bash
npm install
```

#### 2. Install Backend Dependencies
```bash
cd backend
npm install
cd ..
```

---

### Step 3: Configure Environment Variables

Both the frontend and backend require a `.env` file created from their respective `.env.example` templates.

#### 1. Frontend Environment (`.env` in repository root)

Copy `.env.example` to `.env`:

- **macOS / Linux:**
  ```bash
  cp .env.example .env
  ```
- **Windows (PowerShell):**
  ```powershell
  Copy-Item .env.example .env
  ```

Contents of `.env`:
```env
# Frontend API endpoint (points to local NestJS backend)
VITE_API_URL=http://localhost:3000

# Optional for localhost development (tldraw runs without license on localhost)
VITE_TLDRAW_LICENSE_KEY=
```

#### 2. Backend Environment (`backend/.env`)

Copy `backend/.env.example` to `backend/.env`:

- **macOS / Linux:**
  ```bash
  cp backend/.env.example backend/.env
  ```
- **Windows (PowerShell):**
  ```powershell
  Copy-Item backend/.env.example backend/.env
  ```

Contents of `backend/.env`:
```env
NODE_ENV=development
PORT=3000

# Local Docker Postgres URI (matches docker-compose.yml)
DATABASE_URL=postgresql://ccwp:ccwp_dev_password@localhost:5432/ccwp

# Secret key for better-auth session signing (any random 32+ char string)
BETTER_AUTH_SECRET=drawgon_dev_secret_key_change_in_production_12345

# URL where backend is accessible
BETTER_AUTH_URL=http://localhost:3000

# URL where frontend runs (for CORS and cookie authentication)
FRONTEND_URL=http://localhost:5173
```

> [!NOTE]
> To generate a secure secret on macOS/Linux or Git Bash: `openssl rand -hex 32`.

---

### Step 4: Start the Database

Run the provided PostgreSQL 16 container via Docker Compose:

```bash
docker compose up -d
```

Verify the container is running and healthy:
```bash
docker ps
```
You should see a container named `drawgon-postgres` (or `ccwp-postgres`) bound to port `5432`.

*(Optional without Docker: If you have a local PostgreSQL 16 instance installed, create a database named `ccwp`, user `ccwp` with password `ccwp_dev_password`, or update the `DATABASE_URL` in `backend/.env` with your credentials).*

---

### Step 5: Run Database Migrations

Apply the database schema (tables for auth, boards, communities, comments, files, and profiles):

```bash
cd backend
npm run migration:run
cd ..
```

Output should confirm migration files applied successfully:
- Initial schema (`User`, `Session`, `Account`, `Verification`, `Board`, `BoardCommunity`, `Community`, `CommunityMember`, `Vote`, `Comment`, `Bookmark`)
- `UserProfiles`
- `Follows`
- `BoardCollaborators`

---

### Step 6: Start the Development Servers

You will need **two terminal windows**:

#### Terminal 1 — Backend API (NestJS):
```bash
cd backend
npm run start:dev
```
- Server starts at: **`http://localhost:3000`**
- API health check: **`http://localhost:3000/api/health`**

#### Terminal 2 — Frontend App (Vite + React):
```bash
npm run dev
```
- Client starts at: **`http://localhost:5173`**

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 3. Useful Commands

### Root (Frontend)
- `npm run dev` — Start Vite development server
- `npm run build` — Type-check and produce production bundle in `dist/`
- `npm run lint` — Run oxlint code linter
- `npm run preview` — Preview the production build locally

### Backend
- `npm run start:dev` — Start NestJS server with hot-reload (`--watch`)
- `npm run build` — Build NestJS bundle with path aliases
- `npm run test` — Run unit tests
- `npm run migration:run` — Run pending TypeORM migrations
- `npm run migration:revert` — Revert the last applied migration

---

## 4. Troubleshooting

### 1. Port 5432 Already in Use
- **Cause:** Another local PostgreSQL service or container is already running on port 5432.
- **Fix:** Either stop the local PostgreSQL service (`net stop postgresql` on Windows or `sudo systemctl stop postgresql` on Linux), or change the host port mapping in `docker-compose.yml` (e.g., `5433:5432`) and update `DATABASE_URL` in `backend/.env` accordingly.

### 2. Node Version Incompatibility
- **Cause:** Errors during `npm install` with packages requiring modern Node.js features.
- **Fix:** Ensure `node -v` shows `>= 20.11.0`. Update Node.js via [nodejs.org](https://nodejs.org/) or run `nvm install 20 && nvm use 20`.

### 3. Authentication & CORS Issues (401 / 403 on Login)
- **Cause:** Mismatch between `FRONTEND_URL` and the browser origin.
- **Fix:** If accessing the frontend at `http://127.0.0.1:5173` instead of `http://localhost:5173`, ensure `FRONTEND_URL` in `backend/.env` matches the exact hostname you use in the browser.

### 4. Database Connection Refused
- **Cause:** The Docker container is still initializing or stopped.
- **Fix:** Check `docker compose logs -f postgres` to ensure Postgres is ready to accept connections.
