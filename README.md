# Lingua Voice

A voice-based language learning PWA where you clone your own voice and practice speaking a target language with an AI tutor that listens, corrects, and responds back in your own cloned voice.

## Demo

[Watch the demo on YouTube](https://youtu.be/8qhR6WWt31E)


## What it does

- **Voice cloning** — Record a sample and ElevenLabs clones your voice
- **7-day curriculum** — GPT-4o-mini generates a personalized plan based on your language, level, and goal
- **Phrase pronunciation** — Tap any lesson phrase to hear it spoken in your own cloned voice before you practice
- **AI conversation** — Speak into the mic, ElevenLabs Scribe transcribes it, the AI tutor responds, and plays the reply back in your voice
- **Feedback** — Grammar corrections and natural phrasing suggestions after each response
- **Audio replay** — Re-listen to your own recording and the tutor's response at any time

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite + Tailwind + shadcn/ui |
| Backend | Express 5 + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Clerk |
| STT | ElevenLabs Scribe |
| TTS + Voice Cloning | ElevenLabs |
| AI Chat | OpenRouter (gpt-4o-mini) |

## Demo limits

This is a demo build — 20 users max, one curriculum per account.

## Getting started

```bash
pnpm install
pnpm run dev
```

Requires: `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `ELEVENLABS_API_KEY`, `OPENAI_API_KEY` (OpenRouter key), `DATABASE_URL`.
