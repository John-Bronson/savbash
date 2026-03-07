# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SavBash is a cycling group event website built with SvelteKit + Supabase + Netlify + Resend. Users authenticate via magic links, post rides, RSVP, comment with @mentions and emoji reactions, upload avatars, and receive email notifications. The full implementation plan is in `.claude/cycling-site-implementation-plan.md`.

## Commands

- `npm run dev` — start dev server (port 5173)
- `npm run build` — production build (Netlify adapter)
- `npm run preview` — preview production build
- `npm run check` — type-check with svelte-check
- `npm run lint` — prettier + eslint checks
- `npm run format` — auto-format with prettier

## Tech Stack

- **Svelte 5** with runes (`$props()`, `$state()`, etc.) — do NOT use legacy Svelte 4 syntax
- **SvelteKit** with `@sveltejs/adapter-netlify`, file-based routing in `src/routes/`
- **Tailwind CSS v4** via Vite plugin, config in `src/routes/layout.css` using `@import`/`@plugin` syntax (not a JS config file). Plugins: forms, typography
- **mdsvex** for `.svx` Markdown files (both `.svelte` and `.svx` are valid extensions)
- **Supabase** (`@supabase/supabase-js`) — auth (magic links), database (Postgres with RLS), storage (avatars bucket), realtime, Edge Functions
- **Resend** for transactional email (ride announcements, mention notifications)
- **TypeScript** in strict mode

## Code Style

- Tabs for indentation, single quotes, no trailing commas, 100 char print width
- Prettier with svelte and tailwindcss plugins
- `$lib` alias maps to `src/lib/`

## Architecture

- `src/routes/` — SvelteKit file-based routing. Data fetching in `+page.server.ts` load functions
- `src/lib/` — shared code, components, utilities
- `src/lib/database.types.ts` — auto-generated Supabase types (regenerate with `supabase gen types typescript`)
- `hooks.server.ts` — session management, route protection, Supabase server client
- Environment variables: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` (client-safe), `RESEND_API_KEY` (server-only)

## Database Schema (Supabase)

Six tables with RLS enabled: `profiles`, `rides`, `rsvps`, `comments`, `reactions`, `mentions`. Key constraints:
- `profiles.display_name` is unique (required for @mention system)
- `rsvps` has unique constraint on `(ride_id, user_id)`
- `reactions` has unique constraint on `(comment_id, user_id, emoji)`
- `mentions` has unique constraint on `(comment_id, mentioned_user_id)`, cascade deletes from comments
- `@everyone` mentions are expanded into individual rows at write time

## Key Patterns

- Use SvelteKit form actions for mutations (progressive enhancement)
- Optimistic UI updates for RSVPs, comments, and reactions
- Avatar component handles three states: uploaded photo, emoji (rendered oversized at ~1.5-2x container), or initials fallback
- `avatar_url` and `avatar_emoji` on profiles are mutually exclusive — whichever was last set is active
- Client-side image resize to 64x64 WebP before upload
- Comment @mentions parsed server-side via regex after insert, stored in `mentions` table
