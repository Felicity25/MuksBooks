# MuksBooks

MuksBooks is an AI-powered study platform for Monash actuarial science students. It is built with Next.js, TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

## Local setup

1. Install dependencies:
   - Node.js 20 or 22 LTS and npm (Node 24 is not supported for this project)
2. Copy environment example:
   - `cp .env.example .env`
3. Start PostgreSQL with Docker:
   - `docker compose up -d`
4. Install packages:
   - `npm install`
5. Generate Prisma client:
   - `npm run prisma:generate`
6. Run database migration and seed data:
   - `npm run prisma:migrate`
   - `npm run seed`
8. Add your OpenAI API key to `.env`:
   - `OPENAI_API_KEY=your-openai-api-key`
   - Optional: `OPENAI_MODEL=gpt-4o-mini`
9. Start development server:
   - `npm run dev`

### If dev startup hangs or times out on macOS

- Ensure you are running Node 20/22 LTS: `node -v`
- If your project lives under Desktop/Documents with cloud sync enabled, move it to a local path such as `~/Projects/MuksBooks`
- Remove stale listeners before restart:
   - `lsof -nP -iTCP:3000-3010 -sTCP:LISTEN`
   - `kill <pid>` for old `node` processes
- Start again with a clean port:
   - `npm run dev -- --hostname 127.0.0.1 --port 3000`

## AI Tutor setup
- The AI Tutor page at `/ai-tutor` uses the OpenAI API when `OPENAI_API_KEY` is configured.
- If no API key is present, the app falls back to a structured demo mode.
- The tutor can answer concept questions, generate lessons, review assignment-style prompts, and suggest study actions.

## Features

- Home dashboard with semester progress, tasks, uploads and mastery insights
- Unit and academic year management
- Upload centre for files, rubrics, lecture slides and assignment briefs
- AI Tutor tab with unit-aware assistance and lesson generation
- Lesson generator linked to unit topic structure
- Quiz room for active recall, calculation and exam-style questions
- Assignment reviewer with rubric alignment and HD feedback guidance
- Learning resources and actuarial news tracking
- Planner calendar and Pomodoro focus room
- Feynman explanation room, mastery tracker, error log and study templates
- Prisma ORM with PostgreSQL data models and seed data

## Database

- PostgreSQL is configured via `docker-compose.yml`
- Prisma schema is located at `prisma/schema.prisma`
- Seed script is `prisma/seed.ts`

## Notes

- This app uses the Next.js App Router and a clean modular component structure.
- The UI is designed to be calm, readable and student-focused.

## Actuarial News / Intelligence Hub

- News is stored in the same shared local SQLite backend used across MuksBooks (`Knowledge/app-state.db`, see `lib/app-state/db.ts`) — not Postgres/Prisma and not a localStorage/demo-data pathway. Tables: `news_items`, `news_saved_items`, `news_followed_topics` (added by `lib/news/db.ts`).
- Source registry (`lib/news/sources.ts`) is tiered (regulator/government/professional body/academic first). Verified sources currently include APRA, Australian Treasury, RBA, ASFA, The Actuary, Actuarial Eye, Insurance Business Australia, Insurance Journal, Risk.net, and arXiv q-fin (Risk Management / Pricing) for the Research category.
- The pipeline (`lib/news/pipeline.ts`) fetches each source, classifies category/practice areas/actuarial concepts/country/importance/regulatory status (`lib/news/classify.ts`), generates a grounded "why this matters" note (`lib/news/relevance.ts` — AI enrichment is opt-in via `NEWS_AI_ENRICHMENT=true` and always falls back to the heuristic note), and dedupes/clusters near-duplicate coverage of the same event into one card with "also covered by" supporting sources (`lib/news/store.ts`).
- `GET /api/news` returns `{ items, brief, sinceYesterday, concepts, savedIds }` and accepts `category`, `country`, `range` (today/7d/30d), `q`, `concept`, `practiceArea`, `savedOnly` query params. It also triggers a background refresh when the newest item is more than 24 hours old.
- `GET/POST /api/news/saved` lists/toggles a user's saved articles (shared backend, not localStorage).
- `GET /api/news/refresh` runs the full pipeline; `vercel.json` schedules it daily at 02:00 UTC. Protect it by setting `NEWS_CRON_SECRET` and sending `Authorization: Bearer <NEWS_CRON_SECRET>`.
- Run `npm run collect-news` to run the pipeline locally/manually.
- Known gap: ASIC and the Actuaries Institute (Australia) have no working public RSS feed at time of writing, so they are intentionally left out of the registry rather than guessing a URL.

