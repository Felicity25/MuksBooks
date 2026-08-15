# MukBooks Architecture Decisions

## 2026-08-13 - Tutor Context Must Read Upload Knowledge From AppState APIs

Decision:
- The Tutor chat client now loads upload/unit/chunk context from `GET /api/app-state/lesson-context` instead of localStorage upload and knowledge shadow state.

Alternatives considered:
- Keep localStorage `uploads` + `knowledgeChunks` as Tutor context source.
- Read knowledge catalog files directly from the client via custom endpoints.

Why this approach won:
- Preserves single source of truth in shared persistent AppState.
- Keeps Tutor context aligned with Home/Planner/Units migration.
- Ensures uploaded resources remain discoverable across refresh/restart/new conversation.

Trade-offs:
- Tutor context now depends on backend endpoint availability.
- Legacy localStorage session persistence remains only for chat transcript continuity.

Systems affected:
- `components/ai-tutor-chat.tsx`
- `app/api/app-state/lesson-context/route.ts`
- `lib/app-state/service.ts`
- `lib/tutor-agent/service.ts`

Migration implications:
- Do not reintroduce localStorage upload/chunk state as Tutor source of truth.
- Continue migrating remaining localStorage summaries (assignment/error/memory context) to AppState-backed APIs.
