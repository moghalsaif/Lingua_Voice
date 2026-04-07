# Lingua Voice

## Overview

Lingua Voice is a voice-based language learning PWA built as a pnpm workspace monorepo. Users upload an audio sample to clone their voice via ElevenLabs, then practice speaking a target language with an AI tutor that responds in their own cloned voice.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/lingua-voice), Tailwind CSS, shadcn/ui, wouter router
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM (lib/db)
- **Auth**: Clerk (@clerk/react + @clerk/express)
- **AI**: OpenAI (Whisper STT + GPT-4o-mini), ElevenLabs (voice cloning + TTS)
- **Validation**: Zod (zod/v4), drizzle-zod
- **API codegen**: Orval (from OpenAPI spec → hooks + Zod schemas)
- **Build**: esbuild (API server bundle)
- **Logger**: pino (use req.log in handlers, logger singleton elsewhere)

## Artifacts

- `artifacts/lingua-voice` — React+Vite frontend PWA (previewPath: `/`)
- `artifacts/api-server` — Express API server (port 8080)

## Libs

- `lib/api-spec` — OpenAPI YAML spec (source of truth for API contracts)
- `lib/api-client-react` — Generated TanStack Query hooks via Orval
- `lib/api-zod` — Generated Zod schemas via Orval
- `lib/db` — Drizzle ORM schema + database client

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — typecheck and build lib packages only
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/lingua-voice run dev` — run frontend dev server

## Pages / Routes

- `/` — Home page (landing for signed-out, redirects signed-in to /dashboard)
- `/sign-in` — Clerk sign-in page
- `/sign-up` — Clerk sign-up page
- `/onboarding` — Voice cloning flow (upload audio sample)
- `/dashboard` — Curriculum generation + 7-day lesson cards
- `/practice/:day` — Core practice session (MediaRecorder → Whisper STT → GPT-4o-mini → ElevenLabs TTS)

## API Endpoints

- `GET /api/healthz` — Health check
- `GET /api/users/me` — Get current user profile (Clerk auth)
- `PUT /api/users/me/voice` — Update user voiceId
- `POST /api/voice/clone` — Clone user voice (multipart audio upload → ElevenLabs)
- `POST /api/curriculum` — Generate 7-day curriculum (GPT-4o-mini)
- `POST /api/conversation` — Send audio message, get AI response with TTS audio (multipart)
- `POST /api/feedback` — Get language feedback and corrections

## Database Schema

- `users` — id, clerkUserId, email, voiceId, createdAt, updatedAt
- `curricula` — id, userId, language, level, goal, days (JSON), createdAt, updatedAt
- `sessions` — for tracking practice sessions

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (provisioned automatically)
- `CLERK_SECRET_KEY` — Clerk server secret key
- `CLERK_PUBLISHABLE_KEY` — Clerk publishable key
- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk publishable key for frontend
- `OPENAI_API_KEY` — OpenAI API key
- `ELEVENLABS_API_KEY` — ElevenLabs API key

## Important Notes

- API server uses Express 5 — async handlers need `Promise<void>` return type
- Never use `console.log` in backend — use `req.log` in handlers, `logger` singleton elsewhere
- Early returns after res.status().json(): `res.status().json(); return;`
- lib/api-zod tsconfig includes `"dom"` lib for File/Blob types in multipart schemas
- lib/api-zod/src/index.ts only exports from `./generated/api` (not types folder, to avoid duplicate export conflicts)
- Buffer to ArrayBuffer conversion needed for native Blob/File constructors: `buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer`
