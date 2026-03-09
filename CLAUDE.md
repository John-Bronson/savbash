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
- **Dark theme** by default (`bg-gray-950`, `text-gray-100`). Use dark palette throughout: `gray-800`/`gray-900` for surfaces, `gray-300`/`gray-400` for secondary text, `gray-700` for borders
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

Eight tables with RLS enabled: `profiles`, `rides`, `ride_hares`, `ride_photos`, `rsvps`, `comments`, `reactions`, `mentions`. Key constraints:

- `profiles.christian_name` is required (real name), `profiles.bash_name` is optional (hash name) with unique constraint
- Display name logic: show bash name if set, otherwise christian name. @mentions match bash name first, then christian name
- `ride_hares` has either `user_id` (references profiles) or `name` (text) set — CHECK constraint ensures at least one is present. Cascade deletes from rides
- `ride_photos` stores post-ride gallery images uploaded by attendees. Cascade deletes from rides
- `rsvps` has unique constraint on `(ride_id, user_id)`
- `reactions` has unique constraint on `(comment_id, user_id)` — one reaction per person per comment, changing emoji replaces it
- `mentions` has unique constraint on `(comment_id, mentioned_user_id)`, cascade deletes from comments
- `@everyone` mentions are expanded into individual rows at write time
- Rides are Hash House Harriers–style: hares lay a trail, the pack follows. No distance/difficulty fields.
- `rides` and `comments` have `updated_at`/`updated_by` columns (nullable) to track the last edit and who made it
- Comments use soft delete (`is_deleted`, `deleted_at`, `deleted_by`) — body preserved for admin review, UI shows "this comment was deleted" with no author or content
- `profiles.role` is an enum-like text field: 'pending' (default), 'user', 'moderator', 'admin'. Pending users are completely locked out until approved. Moderators can delete any comment/photo and edit profiles. Admins have full control. Hares can edit/delete rides they're haring.
- Approving a user = changing role from 'pending' to 'user'. Currently any approved user can do this.
- `role` is only changeable in the database or by an approved user/admin — never exposed in normal profile UI

## Key Patterns

- Use SvelteKit form actions for mutations (progressive enhancement)
- Optimistic UI updates for RSVPs, comments, and reactions
- Avatar component handles three states: uploaded photo, emoji (rendered oversized at ~1.5-2x container), or initials fallback
- `avatar_url` and `avatar_emoji` on profiles are mutually exclusive — whichever was last set is active
- Profiles have `christian_name` (required, real name) and `bash_name` (optional, hash name)
- Client-side image resize to 64x64 WebP before upload
- Comment @mentions parsed server-side via regex after insert, stored in `mentions` table

## Work Log

**IMPORTANT: Always update `.claude/work-log.md` before ending a session or after completing a significant chunk of work.** Do not wait to be asked — proactively append a summary including: what was done, key concepts introduced, files created/modified, and anything not yet completed. This helps the user review and learn from the development process.
