# Cloud Migration Audit

## Current Architecture

The application is a Next.js app built around a shared state layer under `lib/app-state` rather than a broad UI-specific state spread. The key backend pattern is:

- UI components fetch data from API routes under `app/api/app-state`
- Shared logic lives in `lib/app-state/service.ts`
- The persistence layer is currently a local SQLite database (`Knowledge/app-state.db`) managed by `lib/app-state/db.ts`
- Dashboard and planner flows consume derived data from that shared service instead of each page storing its own authoritative state

This is a good foundation for migration because it creates a single persistence boundary that can be swapped from SQLite to Supabase without rewriting every page.

## Existing State Sources

Primary user-facing persistent state currently comes from:

- `lib/app-state/db.ts` and `lib/app-state/service.ts`
- local browser persistence via `localStorage` in `components/app-state-migrator.tsx`
- app-level data integration in `app/api/app-state/*`
- course and upload state processed through the app-state service

## localStorage Usage

The app currently uses localStorage primarily for legacy migration bootstrapping, not as the core user dataset. The `AppStateMigrator` component reads legacy keys such as `units`, `studySessions`, and `settings`, then posts them to `/api/app-state/migrate-local-state`.

This is a migration mechanism rather than a permanent source of truth, and it should be retained only until the equivalent cloud records are verified and the user’s data has been migrated.

## Existing Backend/API Layer

The current backend architecture is a hybrid of:

- Next.js route handlers under `app/api`
- a SQLite-backed service layer in `lib/app-state/service.ts`
- local catalog/knowledge handling under `lib/knowledge-base`
- Prisma schema and database access (`lib/prisma.ts` and `prisma/schema.prisma`)

Notable shared entry points include:

- `getDashboard()`
- `getPlannerContext()`
- `listCourses()`
- `upsertCourse()`
- `createPlannerTask()`
- `updateUserSettings()`
- upload batch and document handling in the app-state service

## Proposed Supabase Schema

The most appropriate Supabase schema for MukBooks is a user-owned relational model with a small number of core tables:

- `profiles`
- `units`
- `tasks`
- `assessments`
- `planner_events`
- `study_sessions`
- `mastery_records`
- `uploads`
- `tutor_conversations`
- `tutor_messages`
- `user_settings`

Derived data such as dashboard cards and the “upcoming tasks” list should remain calculated from the underlying tables rather than being stored as separate copies.

## Authentication Architecture

The app should use Supabase Auth centrally, with a single auth-aware server/client layer rather than component-local auth. The design should use:

- `lib/supabase/client.ts` for browser auth
- `lib/supabase/server.ts` for server-side auth checks
- middleware-based route protection for authenticated pages

The database should store `user_id` as the auth owner on all user-specific tables.

## Storage Architecture

Academic uploads should be handled by Supabase Storage, with metadata stored in Postgres. Recommended structure:

- `user_id/unit_id/<generated-file-id>-<original-name>`

This keeps file buckets private to each account and prevents accidental cross-user access.

## Migration Risks

Main risks are:

- duplicated state between the local SQLite model and any future cloud model
- UI-specific state being stored in the wrong persistence layer
- hardcoded demo defaults downstream of the AppState service
- authentication and storage being implemented without RLS policies
- local storage being retained as the apparent source of truth after migration

## Proposed Migration Sequence

1. Preserve stable app baseline and secure repo state.
2. Add Supabase client/server auth foundation.
3. Define SQL schema and RLS policy baseline.
4. Migrate units, tasks, assessments and planner records.
5. Move uploads to Supabase Storage with metadata tracking.
6. Migrate study history and mastery records to user-owned tables.
7. Remove duplicate sources of truth and local migration flags after validation.
8. Deploy to Vercel with production env vars and verify multi-device behavior.

## Files That Will Likely Change

- `app/auth/login/page.tsx`
- `lib/supabase/*`
- `middleware.ts`
- `supabase/migrations/*`
- `app/api/app-state/*`
- `lib/app-state/service.ts`
- `components/home-dashboard.tsx`
- `components/units-manager.tsx`
- `components/planner-manager.tsx`
- `components/uploads-manager.tsx`

## Files That Should Not Need Major Changes

- `app/page.tsx`
- `components/navbar.tsx`
- the UI shell in `app/layout.tsx`
- general content pages that can continue to consume the same core API contracts

## Finding

The existing architecture already contains the right abstraction boundary. The most important technical decision is to preserve that AppState/service pattern and move its persistence layer to Supabase rather than scattering direct database calls through components.
