# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Workout training API (bootcamp-treinos-api) built with Fastify + TypeScript. Manages workout plans, days, exercises, and sessions for authenticated users. Uses better-auth for email/password authentication and Prisma ORM with PostgreSQL.

## Commands

- **Dev server:** `pnpm dev` (runs `tsx --watch src/index.ts` on port 8081)
- **Lint:** `pnpm eslint .`
- **Format:** `pnpm prettier --write .`
- **Generate Prisma client:** `pnpm prisma generate`
- **Run migrations:** `pnpm prisma migrate dev`
- **Push schema to DB:** `pnpm prisma db push`

## Architecture

- **Entry point:** `src/index.ts` — sets up Fastify with Zod validation, Swagger docs (Scalar UI at `/docs`), CORS, and auth routes
- **Routes:** `src/routes/` — Fastify route modules registered with prefixes (e.g., `/workout-plans`)
- **Use cases:** `src/useCases/` — business logic classes with an `execute()` method pattern
- **Schemas:** `src/schemas/index.ts` — Zod schemas used for both request validation and response serialization via `fastify-type-provider-zod`
- **Errors:** `src/errors/index.ts` — custom error classes (e.g., `NotFoundError`)
- **Auth:** `src/lib/auth.ts` — better-auth config with Prisma adapter and OpenAPI plugin; auth routes are proxied at `/api/auth/*`
- **Database:** `src/lib/db.ts` — Prisma client using `@prisma/adapter-pg` for direct PostgreSQL connection
- **Prisma output:** `src/generated/prisma/` — auto-generated client (do not edit manually)

## Key Patterns

- Routes use `app.withTypeProvider<ZodTypeProvider>()` for type-safe schema validation
- Authentication is checked via `auth.api.getSession()` with `fromNodeHeaders()` from better-auth
- Prisma client is generated to `src/generated/prisma/` (configured in `prisma/schema.prisma`)
- ESM modules throughout (`"type": "module"` in package.json); imports use `.js` extensions
- ESLint enforces sorted imports via `eslint-plugin-simple-import-sort`
- Node 24.x required

## Environment

Requires a `.env` file with at minimum:

- `DATABASE_URL` — PostgreSQL connection string
- `PORT` (optional, defaults to 8081)
- `BETTER_AUTH_SECRET` — secret for better-auth

"Sempre responda em português do Brasil (pt-BR)."
