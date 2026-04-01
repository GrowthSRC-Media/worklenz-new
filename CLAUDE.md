# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Worklenz is an open-source project management platform. It is a monorepo with two main packages:
- **worklenz-backend/** — Express.js + TypeScript API server (Node 20+, npm)
- **worklenz-frontend/** — React 18 + TypeScript SPA (Vite, npm)

Database: PostgreSQL 15+. Cache/sessions: Redis. File storage: MinIO (S3-compatible) / AWS S3 / Azure Blob.

## Development Commands

### Backend (`worklenz-backend/`)
```bash
npm run dev:all          # Build, watch, and auto-restart (main dev command)
npm run build:dev        # TypeScript compile for development
npm run build:prod       # Production build with minification
npm start                # Start production server (build/bin/www.js)
npm test                 # Run Jest tests
```

### Frontend (`worklenz-frontend/`)
```bash
npm run dev              # Start Vite dev server
npm run build            # Production build
npm run format           # Prettier formatting
npm test                 # Run Vitest (watch mode)
npm run test:run         # Single test run
npm run test:coverage    # Coverage report
```

### Docker (from repo root)
```bash
./quick-setup.sh                                  # Interactive first-time setup
docker compose --profile express up -d             # Start all services (bundled mode)
docker compose --profile express --profile ssl up -d  # With SSL
./manage.sh status|logs|backup|restore|upgrade     # Management CLI
```

### Database Setup (manual, without Docker)
SQL scripts must be run in order against a PostgreSQL database named `worklenz_db`:
1. `database/sql/0_extensions.sql`
2. `database/sql/1_tables.sql`
3. `database/sql/indexes.sql`
4. `database/sql/4_functions.sql`
5. `database/sql/triggers.sql`
6. `database/sql/3_views.sql`
7. `database/sql/2_dml.sql`

Backend environment: copy `worklenz-backend/.env.template` to `.env` and fill in values. Key vars: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `SESSION_SECRET`, `COOKIE_SECRET`, `JWT_SECRET`, `FRONTEND_URL`.

## Architecture

### Backend
- **Entry point**: `src/bin/www.ts` → `src/app.ts` (Express setup)
- **Routes**: `src/routes/apis/` — ~50 RESTful API router files (e.g., `projects-api-router.ts`, `tasks-api-router.ts`)
- **Controllers**: `src/controllers/` — business logic handlers, one per domain
- **Database access**: Direct `pg` (node-postgres) queries — no ORM. Significant business logic lives in PostgreSQL stored functions (`database/sql/4_functions.sql`, 276KB+)
- **Real-time**: Socket.io server in `src/socket.io/`, PostgreSQL LISTEN/NOTIFY in `src/pg_notify_listeners/`
- **Auth**: Passport.js (local + Google OAuth) with express-session, stored in PostgreSQL
- **Scheduled jobs**: `src/cron_jobs/`
- **Request validation**: JSON schemas in `src/json_schemas/`
- **Logging**: Winston

### Frontend
- **State management**: Redux Toolkit with 50+ slices in `src/features/` (feature-based organization)
- **API layer**: `src/api/` — Axios-based services organized by domain
- **UI libraries**: Ant Design + PrimeReact + Tailwind CSS
- **Real-time**: Socket.io client in `src/socket/`
- **Routing**: React Router v6 with lazy loading
- **Rich text**: TinyMCE
- **i18n**: i18next

### Data Flow
1. React components dispatch Redux actions or call API services directly
2. API services (Axios) call backend REST endpoints
3. Controllers execute PostgreSQL queries/functions via `pg`
4. Socket.io pushes real-time updates to connected clients
5. Redux slices update state, components re-render

### Database
- Schema is defined in SQL files, not code-level migrations
- Heavy use of PostgreSQL functions for business logic (task aggregation, status calculations, reporting)
- Custom migration scripts in `worklenz-backend/database/migrations/`
- Triggers handle cascading updates and data integrity

## Key Conventions

- **Package manager**: npm only (not yarn — enforced in engines field)
- **Backend TypeScript**: ES2022 target, strict mode, decorators enabled
- **Frontend TypeScript**: ES5 target, paths aliased via `@/` to `src/`
- **Backend linting**: ESLint (`.eslintrc.json`)
- **Frontend formatting**: Prettier (`npm run format`)
- **Backend port**: 3000 (default)
- **Frontend dev port**: 5173 (Vite default)
