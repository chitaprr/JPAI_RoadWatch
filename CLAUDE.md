# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

RoadWatch is a road-infrastructure damage reporting platform (student project, language: Polish for user-facing strings and commit messages). Residents file geolocated reports with photos; officials (urzędnik) triage and assign them to contractors (wykonawca), who document repairs. The repo is a two-package monorepo: `backend/` (Node + Express + Prisma + PostgreSQL) and `frontend/` (React + Vite + Leaflet).

## Commands

Run all commands from `backend/` or `frontend/` respectively (each has its own `package.json`).

**Start Postgres** (from repo root): `docker compose up -d` — exposes Postgres on `localhost:5432`. `docker-compose.yml` also builds backend (port 8000) and frontend (port 3000), but during dev the apps are usually run directly with `npm run dev`.

**Backend** (`backend/`):
- `npm run dev` — start with nodemon (ts-node, hot reload)
- `npm run build` — `tsc` → `dist/`; `npm start` runs the compiled output
- `npm run check` — **run before committing**; this is what CI enforces (`prisma format` + `prettier` + `eslint`)
- `npm run lint` / `npm run lint:fix`
- `npm run prisma:generate` — regenerate client into `src/generated/prisma` (**required after any schema change**, and CI runs it before linting)
- `npm run prisma:push` — sync schema to DB without a migration; `npm run prisma:migrate` — create a dev migration
- `npm run prisma:studio` — DB browser

**Frontend** (`frontend/`):
- `npm run dev` — Vite dev server on port 3000
- `npm run build`, `npm run preview`
- `npm run check` — prettier + eslint (run before committing)

**No test suite exists.** CI (`.github/workflows/*-lint.yml`) only runs lint/format checks on `main` pushes and PRs.

**Env setup:** `cp example.env .env` in `backend/`. Required vars: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `ALLOWED_ORIGINS` (semicolon-separated), `PRODUCTION`. `config/index.ts` validates that none are null at startup via `checkConfigFields()` and exits if any are missing.

## Backend architecture

**Entry flow:** `src/index.ts` runs `checkConfigFields()` + `initDB()` (Prisma `$connect`) before `src/server.ts` (the Express app) starts listening. `server.ts` wires CORS (origins from config, compiled to regexes), `express.json()`, `cookie-parser`, the request logger, then mounts `src/routes/main.router.ts` at `/`, with a catch-all `NOT_FOUND` fallback.

**Feature module pattern** — each feature is a folder under `src/routes/<name>/` with three files, registered in `main.router.ts` via `router.use("/<name>", <name>Router)`:
- `*.router.ts` — Express `Router`, attaches `authenticateJWT` middleware per-route where auth is needed
- `*.controller.ts` — validates `req.body` with a **Zod** schema (`safeParse` → `MISSING_BODY_FIELDS` on failure), calls the service, returns via a response helper, wraps logic in try/catch → `SERVER_ERROR`
- `*.service.ts` — Prisma data access only; no Express types

Follow this layering when adding endpoints (e.g. a Zgloszenia module). `auth` and `user` are the reference implementations.

**Responses:** never call `res.json` directly. Use the named helpers in `src/utils/httpCodeResponses/messages.ts` (`SUCCESS`, `CREATED`, `BAD_REQUEST`, `UNAUTHORIZED`, `NOT_FOUND`, `SERVER_ERROR`, etc.). They produce a uniform `{ success, msg, ...data }` envelope. Note the quirk: `CREATED` nests payload under `data`, while `SUCCESS` spreads it at the top level.

**API docs:** OpenAPI is generated from the **same Zod schemas** that validate requests (`src/docs/openapi.ts` via `zod-openapi`'s `createDocument`) — so the docs can't drift from validation. Each module's request schemas are exported from its controller (e.g. `registerSchema`, `createSchema`) and referenced in the spec. When adding/changing an endpoint, export its schema and add the path to `openapi.ts`. Served (dev only, guarded by `!config.PRODUCTION`) as Swagger UI at `/docs` and raw spec at `/openapi.json` (wired in `server.ts`). `npm run docs:generate` writes a static `openapi.json` (gitignored) for Postman/client generation. Response schemas must mirror the envelope quirk below (`SUCCESS` top-level vs `CREATED` under `data`) to stay accurate.

**Auth:** `src/middlewares/authMiddleware.ts` exports `authenticateJWT`, which reads `Authorization: Bearer <token>`, verifies the JWT, and attaches `{ userId, email, isSuperadmin }` to `req.user`. Controllers needing the user type their request as `AuthenticatedRequest`. Tokens are signed in `auth.service.ts` (`generateToken`, 24h expiry); passwords hashed with bcrypt (`SALT_ROUNDS = 10`).

**Prisma:** the client is **generated into `src/generated/prisma`** (not `node_modules`) — import the shared singleton from `src/utils/prisma.ts`, which wires the `@prisma/adapter-pg` driver adapter. The generated directory is **gitignored**, so run `npm run prisma:generate` after cloning and after editing `prisma/schema.prisma` (CI does this before linting). Schema config (datasource URL from env) lives in `prisma.config.ts`.

**CI does not run `tsc`** — only `npm run check` (lint + format). Type errors compile-break locally but pass CI, so run `npm run build` before relying on a green pipeline.

**Data model** (`prisma/schema.prisma`): `User` belongs to a `Gmina` (municipality). `Zgloszenie` (report) has three User/Wykonawca FKs — reporter (`userId`), assigned official (`urzednikId`), and contractor (`contractorId`) — plus lat/lng, priority, status, deadline. `Zdjecie` holds report photos (cascade-deleted with the report); `Naprawa` (repair) is the contractor's work record with its own `NaprawaZdjecie` photos. DB table names are mapped to Polish (`@@map`) and snake_case columns (`@map`).

## Frontend architecture

React 19 + Vite, plain JS/JSX (no TypeScript). `src/main.jsx` is the entry; `src/App.jsx` holds routing (`react-router-dom`). Maps use `leaflet` / `react-leaflet` (`Map.jsx`).

**API access:** always go through the configured Axios instance in `src/services/api.js`. Its request interceptor injects the JWT from `localStorage.getItem("token")`; its response interceptor clears the token and redirects to `/login` on any 401. Base URL comes from `VITE_API_URL` (defaults to `http://localhost:8000/`).

## Conventions

- User-facing API messages and code comments are written in **Polish**; commit messages are typically Polish too.
- Both packages enforce Prettier + ESLint via `npm run check`; keep it clean or CI fails.
