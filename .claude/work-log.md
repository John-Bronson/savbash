# SavBash Work Log

A record of everything done during development, so you can review and learn from it later.

---

## Session 1 — 2026-03-08: Database Schema Design

### What we did

1. **Discussed the implementation plan** — Reviewed the 8-phase plan in `.claude/cycling-site-implementation-plan.md` covering project setup through launch.

2. **Customized the rides table for hash-style riding**
   - Removed `distance_miles` and `difficulty` fields (not relevant to hare-and-hounds format)
   - Added `image_url` for a banner image on each ride
   - Created a `ride_hares` junction table for 1-2 hares per ride, supporting both registered users (`user_id`) and non-members (`name` as plain text)
   - Created a `ride_photos` table for post-ride photo galleries

3. **Replaced `display_name` with hash-style names**
   - `christian_name` (required) — real/given name
   - `bash_name` (optional, unique) — hash name earned over time
   - Display logic: show bash name if set, fall back to christian name

4. **Changed reactions to one-per-person**
   - Unique constraint changed from `(comment_id, user_id, emoji)` to `(comment_id, user_id)`
   - Picking a new emoji replaces your old one via upsert

5. **Added map-linkable locations**
   - Replaced `meeting_spot` (text) with `meeting_spot_name` + `meeting_spot_lat`/`meeting_spot_lng`
   - Coordinates are optional — when present, the app generates Google Maps/Apple Maps/Waze links
   - Plan includes Google Places Autocomplete for easy location picking in the UI

6. **Added role-based permissions**
   - Replaced boolean `is_admin` with `role` field: `user`, `moderator`, `admin`
   - Updated all RLS policies to account for roles
   - Hares can edit/delete rides they're haring
   - Moderators can delete any comment/photo, edit any profile
   - Admins get full control (admin panel planned for later)

7. **Added edit tracking on rides and comments**
   - `updated_at` and `updated_by` columns (both nullable — null means never edited)
   - UI can show "(edited)" or "edited 2 hours ago by Dave"

8. **Added soft delete on comments**
   - `is_deleted`, `deleted_at`, `deleted_by` columns
   - Body and author preserved in DB for admin review
   - UI shows "this comment was deleted" with no author or content visible
   - No hard DELETE — soft delete is done via UPDATE

9. **Added database indexes**
   - 11 indexes on all foreign keys plus `rides.ride_date`
   - Prevents full table scans as data grows (e.g. "get all comments for this ride")

10. **Set up Supabase CLI**
    - Installed via npm (`supabase` package)
    - Ran `npx supabase init` to create the `supabase/` directory with `config.toml`
    - Ran `npx supabase link --project-ref pdszhutifwllfwjsxfkv` to connect to the remote project
    - Wrote the full schema as a migration file at `supabase/migrations/20260308000000_initial_schema.sql`

### Key concepts introduced

- **Junction tables** — `ride_hares` is a separate table linking rides to hares, rather than embedding hare data in the rides table. This is the SQL equivalent of an embedded array in MongoDB.
- **Foreign keys** — columns that reference an `id` in another table, enforced by the database so references are always valid.
- **CHECK constraints** — rules the database enforces on column values (e.g. role must be one of three values, ride_hares must have either user_id or name).
- **Unique constraints** — prevent duplicate data (e.g. one RSVP per person per ride).
- **Cascade deletes** — when a parent row is deleted, child rows are automatically cleaned up (e.g. deleting a ride removes its comments, RSVPs, photos, etc.).
- **RLS (Row Level Security)** — Supabase's permission system at the database level. Policies control who can read/write what, even if someone bypasses the UI.
- **Indexes** — speed up queries by letting the database quickly find rows matching a condition, rather than scanning every row.
- **Migrations** — SQL files that define schema changes, run in order. Keeps the database structure versioned and reproducible.
- **Soft delete** — marking a row as deleted rather than removing it, so data is preserved for review.

### Files modified

- `.claude/cycling-site-implementation-plan.md` — updated rides table, added ride_hares/ride_photos/storage, updated RLS policies, added edit tracking and soft delete
- `CLAUDE.md` — updated schema summary and key patterns sections
- `supabase/migrations/20260308000000_initial_schema.sql` — created (full schema, RLS, indexes, storage buckets, triggers)

11. **Pushed the initial migration to Supabase**
    - Ran `npx supabase db push` — all tables, RLS, indexes, triggers, and storage buckets are now live
    - Generated TypeScript types at `src/lib/database.types.ts` via `npx supabase gen types typescript`

12. **Added `pending` role for new signups**
    - New users default to `pending` instead of `user`
    - Pending users are completely locked out — RLS policies block them from seeing rides, comments, RSVPs, photos, reactions, everything
    - They can still see profiles (needed for the approval list UI) and update their own profile (to set up name/avatar while waiting)
    - Approving a user = changing their role from `pending` to `user`
    - Created a second migration: `supabase/migrations/20260308000001_add_pending_role.sql`
    - This demonstrates how schema changes work after the initial setup: you write a new migration file that alters the existing schema, then push it

13. **Created this work log**
    - `.claude/work-log.md` — a running record of everything done, with key concepts explained
    - Added a reminder to `CLAUDE.md` so future sessions keep updating it

### Key concepts introduced (continued)

- **Incremental migrations** — rather than editing the original migration file after it's been pushed, you create a new migration that alters the existing schema. Migrations run in order, so the database ends up in the right state. This is why the pending role change is a separate file from the initial schema.

### Files modified (continued)

- `supabase/migrations/20260308000001_add_pending_role.sql` — created (adds pending role, updates RLS)
- `src/lib/database.types.ts` — regenerated with updated schema
- `.claude/work-log.md` — created
- `.claude/cycling-site-implementation-plan.md` — updated role descriptions
- `CLAUDE.md` — updated role info, added work log reminder

---

## Session 1 (continued) — Phase 3: Authentication

### What we did

1. **Installed `@supabase/ssr`** — This package is needed for server-side Supabase auth in SvelteKit. The original `@supabase/supabase-js` only works in the browser; `@supabase/ssr` creates server clients that manage session cookies properly.

2. **Replaced the browser-only Supabase client**
   - `src/lib/supabaseClient.ts` now uses `createBrowserClient` from `@supabase/ssr` (instead of `createClient` from `@supabase/supabase-js`), typed with the `Database` types
   - This client is for interactive UI in Svelte components (e.g. the sign-out button, the magic link form)

3. **Created `src/hooks.server.ts`** — This is the core of auth. It runs on every request and:
   - Creates a server-side Supabase client using `createServerClient` with cookie handling
   - Provides a `safeGetSession()` function that validates the session (calls `getUser()` to verify the JWT isn't tampered with)
   - Fetches the user's profile from the `profiles` table
   - Redirects unauthenticated users to `/login`
   - Redirects users with no christian name to `/profile/setup` (first-time setup)
   - Redirects pending users to `/pending` (waiting for approval)
   - Sets `locals.session`, `locals.user`, `locals.profile`, and `locals.supabase` so any page can access them

4. **Updated `src/app.d.ts`** — Extended the `App.Locals` interface so TypeScript knows about `session`, `user`, `profile`, and `supabase` on `locals`. This is SvelteKit's way of passing per-request data through the app.

5. **Created `src/routes/+layout.server.ts`** — A root layout load function that passes `session`, `user`, and `profile` to all pages. This means every page can access auth state via `data`.

6. **Built the nav bar** (`src/routes/+layout.svelte`)
   - Shows the user's bash name (or christian name as fallback) and a "Sign Out" button when logged in
   - Shows a "Sign In" link when logged out
   - Uses Tailwind for styling

7. **Built the login page** (`src/routes/login/+page.svelte`)
   - Email input, "Send Magic Link" button
   - Calls `supabase.auth.signInWithOtp()` which sends the magic link email
   - Shows a confirmation message after sending
   - Error handling for failed sends

8. **Built the auth callback route** (`src/routes/auth/callback/+server.ts`)
   - A server-only route (no UI, just logic)
   - When a user clicks the magic link in their email, Supabase redirects them here with a `code` parameter
   - Exchanges the code for a session, then redirects to the homepage
   - This is only ~10 lines of code

9. **Built the profile setup page** (`src/routes/profile/setup/`)
   - First-time onboarding: christian name (required) + bash name (optional)
   - Uses a SvelteKit form action for the submission — this means it works even without JavaScript (progressive enhancement)
   - Server-side validation: checks that christian name is provided, checks bash name uniqueness
   - On success, redirects to homepage

10. **Built the pending page** (`src/routes/pending/+page.svelte`)
    - Friendly waiting screen for unapproved users
    - Shows their name and a sign-out button
    - Bike emoji for personality

11. **Built the approval flow** (`src/routes/+page.server.ts` and `+page.svelte`)
    - Homepage shows a list of pending users to any approved member
    - Each pending user has an "Approve" button
    - The approve action updates their role from `pending` to `user`
    - Uses a SvelteKit form action

### Key concepts introduced

- **`hooks.server.ts`** — SvelteKit's middleware. Runs on every request before any page loads. This is where you handle auth, set up the request context, and redirect unauthorized users. Similar to middleware in Express or Next.js.
- **`locals`** — SvelteKit's per-request context object. Data set on `locals` in hooks is available in any page's `load` function or form action. It only lives for the duration of one request.
- **Server client vs browser client** — The server client (`createServerClient`) manages cookies and runs on the server. The browser client (`createBrowserClient`) runs in the browser for interactive features. Both talk to the same Supabase project but serve different purposes.
- **`safeGetSession()`** — `getSession()` reads from the JWT stored in the cookie, which could be tampered with. `getUser()` makes a round-trip to Supabase to verify the user actually exists. Using both together is the secure pattern.
- **Form actions** — SvelteKit's way of handling form submissions on the server. The form posts to the same page, the server processes it, and returns data back. Works without JavaScript (progressive enhancement) and integrates with the `use:enhance` directive for a smooth SPA-like experience when JS is available.
- **`use:enhance`** — A SvelteKit directive that upgrades a regular HTML form to submit via fetch instead of a full page navigation. The form still works without JS, but with JS it's smoother.
- **Layout load functions** — `+layout.server.ts` runs before any page under that layout. Data returned from it is available to all child pages. This is how we make auth state accessible everywhere.

### Files created/modified

- `src/hooks.server.ts` — created (session management, route protection, pending user handling)
- `src/app.d.ts` — updated (added Locals types for session, user, profile, supabase)
- `src/lib/supabaseClient.ts` — updated (switched to `createBrowserClient` from `@supabase/ssr`)
- `src/routes/+layout.server.ts` — created (passes auth state to all pages)
- `src/routes/+layout.svelte` — updated (nav bar with auth state)
- `src/routes/+page.server.ts` — replaced (pending user list + approve action, removed instruments demo)
- `src/routes/+page.svelte` — replaced (homepage with pending user approval, removed instruments demo)
- `src/routes/login/+page.svelte` — created (magic link login form)
- `src/routes/auth/callback/+server.ts` — created (magic link token exchange)
- `src/routes/profile/setup/+page.server.ts` — created (profile setup form action)
- `src/routes/profile/setup/+page.svelte` — created (profile setup UI)
- `src/routes/pending/+page.svelte` — created (pending approval waiting screen)

---

## Session 1 (continued) — Dark Theme + Phase 4: Rides & RSVPs

### What we did

1. **Switched to dark theme**
   - Set `color-scheme: dark` on `<html>` and `bg-gray-950 text-gray-100` on `<body>` in `layout.css`
   - Updated all existing components (nav, login, profile setup, pending, homepage) to use dark palette
   - Dark palette convention: `gray-950` page bg, `gray-900` surfaces, `gray-800` inputs/cards, `gray-700` borders, `gray-100` primary text, `gray-400` secondary text

2. **Built the homepage** (`/`)
   - Fetches upcoming rides (ride_date > now, sorted ascending) and past rides (last 10, sorted descending)
   - Each ride card shows: title, date/time, meeting spot, hare names, and RSVP counts (going + maybe)
   - "Post a Ride" button in the header for logged-in users
   - Pending user approval section still at the bottom

3. **Built the create ride page** (`/rides/new`)
   - Form with: title, date, time, meeting spot, description (Markdown supported)
   - Hare picker with two modes: select a registered member from a dropdown, or type a name for someone not on the app
   - "Add second hare" button that reveals a second hare picker
   - Hidden lat/lng fields ready for Google Places Autocomplete later
   - Server-side form action inserts the ride then inserts hare rows, redirects to the new ride page

4. **Built the individual ride page** (`/rides/[id]`)
   - Full ride details with Markdown description rendered via `marked` + Tailwind `prose-invert` for dark theme typography
   - Meeting spot links to Google Maps when coordinates are available
   - Shows edit history ("edited [date] by [name]") when a ride has been updated
   - Three RSVP buttons: "I'm In", "Maybe", "Can't Make It" — with optimistic UI updates (button highlights instantly before server confirms)
   - Attendee list grouped by going/maybe, showing bash name or christian name
   - Uses Supabase `upsert` with `onConflict: 'ride_id,user_id'` so changing your RSVP updates the existing row
   - Edit/Delete buttons only visible to the creator, hares, or moderators/admins
   - Delete has inline confirmation ("Delete Ride" → "Confirm Delete" / "Cancel")

5. **Built the edit ride page** (`/rides/[id]/edit`)
   - Same form as create, pre-populated with existing ride data
   - Permission check: only creator, hares, or mods can access
   - On save, updates the ride and sets `updated_at`/`updated_by`
   - Replaces hares (deletes existing, inserts new)

6. **Installed `marked`** for Markdown rendering of ride descriptions

### Key concepts introduced

- **Supabase relational queries** — Instead of making separate API calls for rides, hares, and RSVPs, Supabase lets you fetch related data in a single query using the `select` syntax: `rides(*, ride_hares(*), rsvps(*))`. This is like a SQL JOIN but expressed more readably. When a table has multiple foreign keys to the same table (rides → profiles via both `created_by` and `updated_by`), you need to add a "hint" to disambiguate: `profiles!created_by(...)`.
- **Upsert** — "Insert or update." When a user RSVPs, we use `upsert` with `onConflict: 'ride_id,user_id'`. If no RSVP exists, it inserts one. If one already exists (matching the unique constraint), it updates the status instead. This prevents duplicate RSVPs without needing to check first.
- **Optimistic UI** — The RSVP buttons update visually the instant you click them, before waiting for the server response. A local `statusOverride` state is set immediately, then cleared when the server responds. If the server fails, the UI reverts to the actual state. This makes the app feel fast.
- **`$derived`** — Svelte 5's reactive computed values. `const goingRsvps = $derived(data.ride.rsvps.filter(...))` automatically recalculates whenever `data.ride.rsvps` changes. Similar to computed properties in Vue or useMemo in React.
- **Dynamic routes** — `src/routes/rides/[id]/` uses a bracket parameter in the folder name. SvelteKit extracts the value and passes it as `params.id` in load functions and form actions.

### Files created/modified

- `src/routes/layout.css` — updated (dark theme base styles)
- `src/routes/+layout.svelte` — updated (dark nav bar)
- `src/routes/+page.server.ts` — updated (fetches upcoming + past rides with hares and RSVPs)
- `src/routes/+page.svelte` — updated (ride cards with hare names and RSVP counts)
- `src/routes/login/+page.svelte` — updated (dark theme)
- `src/routes/profile/setup/+page.svelte` — updated (dark theme)
- `src/routes/pending/+page.svelte` — updated (dark theme)
- `src/routes/rides/new/+page.server.ts` — created (create ride form action + profile list for hare picker)
- `src/routes/rides/new/+page.svelte` — created (create ride form UI)
- `src/routes/rides/[id]/+page.server.ts` — created (ride detail load + RSVP/delete actions)
- `src/routes/rides/[id]/+page.svelte` — created (ride detail view + RSVP buttons + edit/delete)
- `src/routes/rides/[id]/edit/+page.server.ts` — created (edit ride form action)
- `src/routes/rides/[id]/edit/+page.svelte` — created (edit ride form UI)
- `CLAUDE.md` — updated (dark theme convention)

### Not yet done

- Banner image upload on rides (depends on Phase 5 storage patterns)
- Google Places Autocomplete for meeting spot (needs API key)
- Real-time RSVP updates (optional enhancement)

---

## Session 1 (continued) — Phase 5: Avatars

### What we did

1. **Built the `Avatar.svelte` component** (`src/lib/components/Avatar.svelte`)
   - Reusable across the entire site. Accepts a `profile` prop and a `size` (sm/md/lg).
   - Three rendering modes:
     - **Photo**: cropped circle `<img>` from `avatar_url`
     - **Emoji**: oversized emoji on a dark circle (`overflow: visible`), emoji renders 1.5-2x the container size
     - **Initials fallback**: first letters of the display name on a deterministic colored circle (color is derived from the name so it's always the same for the same person)
   - Dark theme colors for the initials backgrounds (17 muted color options)

2. **Built the `AvatarChooser.svelte` component** (`src/lib/components/AvatarChooser.svelte`)
   - Reusable avatar picker used in both profile setup and profile edit
   - Tab switcher: "Upload photo" / "Pick an emoji"
   - **Photo upload**: file picker → client-side resize to 64x64 WebP via `OffscreenCanvas` → upload to Supabase Storage `avatars` bucket → saves public URL
   - **Emoji picker**: ~60 curated emojis in 5 groups (Faces, Sports, Animals, Food, Objects & Symbols)
   - Live preview at the top showing how the avatar will look
   - Uses `$bindable` props so the parent form can read the selected avatar values
   - Hidden `<input>` fields so the values are submitted with the form

3. **Updated profile setup** (`/profile/setup`)
   - Added the AvatarChooser above the name fields
   - Server action now saves `avatar_url` and `avatar_emoji` along with the name

4. **Built the profile edit page** (`/profile`)
   - Full profile editor: avatar chooser, christian name, bash name, email notification preferences (ride announcements + mention notifications)
   - "Profile saved!" confirmation banner on success
   - Linked from the nav bar (clicking your avatar/name)

5. **Added avatars to the nav bar**
   - Small avatar next to the user's name, links to `/profile`

6. **Added avatars to the RSVP attendee list**
   - Each attendee in the going/maybe lists shows their avatar (small) next to their name in a pill-shaped badge
   - Updated the Supabase query to fetch `avatar_url` and `avatar_emoji` for RSVP profiles

### Key concepts introduced

- **Client-side image processing** — The Canvas API (specifically `OffscreenCanvas`) lets you resize images in the browser before uploading. This means you never send a 5MB phone photo to the server — it gets shrunk to a tiny 64x64 WebP blob (~5KB) right on the device.
- **`$bindable` props** — Svelte 5's way of creating two-way bindings between parent and child components. The AvatarChooser uses `$bindable` for `avatarUrl` and `avatarEmoji` so the parent form can read the values selected in the chooser.
- **Supabase Storage** — File storage separate from the database. Files are uploaded to "buckets" (like `avatars`), and each file gets a public URL. The `upsert: true` option means re-uploading to the same path replaces the old file.
- **Deterministic colors** — The initials fallback picks a color by hashing the user's name (summing character codes, modulo the number of colors). This means the same name always gets the same color, even across different pages and sessions.

### Files created/modified

- `src/lib/components/Avatar.svelte` — created (reusable avatar component)
- `src/lib/components/AvatarChooser.svelte` — created (avatar picker with photo upload + emoji grid)
- `src/routes/profile/+page.server.ts` — created (profile edit form action)
- `src/routes/profile/+page.svelte` — created (profile edit UI with avatar, names, email prefs)
- `src/routes/profile/setup/+page.server.ts` — updated (saves avatar fields)
- `src/routes/profile/setup/+page.svelte` — updated (added AvatarChooser)
- `src/routes/+layout.svelte` — updated (avatar in nav bar, profile link)
- `src/routes/rides/[id]/+page.server.ts` — updated (fetch avatar data in RSVP profiles)
- `src/routes/rides/[id]/+page.svelte` — updated (avatars in attendee list)

### Not yet done

- Banner image upload on rides (storage is set up, just needs UI)
- Phase 6: Comments, mentions, reactions, notifications
- Phase 7: Email notifications
- Phase 8: Polish & launch

---

## Session 1 (continued) — Phase 6: Comments, @Mentions, Reactions & Notifications

### What we did

1. **Created utility helpers** (`src/lib/utils.ts`)
   - `timeAgo(dateStr)` — converts timestamps to human-readable relative time ("2h ago", "3 days ago", etc.)
   - `highlightMentions(body, currentUserNames)` — wraps `@mentions` in styled `<span>` tags, highlighting mentions of the current user in blue

2. **Built the full comments section** (`/rides/[id]`)
   - Comments displayed below ride details with author avatar, name, timestamp, and "(edited)" indicator
   - Comment form with textarea ("Use @ to mention someone") and Post button
   - Soft delete: deleted comments show "This comment was deleted" with no author or content
   - Delete button with inline confirmation, visible to comment author + moderators/admins
   - Comment count in the header excludes deleted comments

3. **Built emoji reactions**
   - Seven reaction emojis: 👍❤️😂🔥🚴💪👏
   - Grouped reaction display: each unique emoji shows with a count and a highlight ring if the current user reacted with it
   - Clicking an existing reaction toggles it off; clicking a different emoji replaces your reaction
   - Reaction picker popup (😀+ button) appears above the button, auto-closes after picking
   - One reaction per user per comment (enforced by unique constraint in DB)

4. **Built @mention system**
   - Server-side mention parsing after comment insert using regex: `/@([\w][\w\s]*?)(?=\s@|$|\s(?![\w])|\.|,|!|\?)/g`
   - Looks up mentioned users by `bash_name` or `christian_name` (case-insensitive)
   - `@everyone` expands to all users with going/maybe RSVPs (excluding the commenter)
   - Deduplicates mentions by `mentioned_user_id` before inserting into `mentions` table
   - Mentions are automatically marked as read when visiting the ride page

5. **Built the notifications page** (`/notifications`)
   - Lists all mentions for the current user, newest first (limit 50)
   - Each notification shows: commenter avatar, commenter name, "mentioned you in [ride title]", comment preview (80 chars), timestamp
   - Unread indicator: blue dot on unread notifications, different border/bg styling
   - "Mark all as read" button (only shown when there are unread mentions)
   - Clicking a notification links to the specific comment via `#comment-{id}` anchor

6. **Added comment anchor highlighting**
   - When navigating to a comment via `#comment-{id}`, the comment card highlights with a blue border/bg that fades after 3 seconds
   - Added `scroll-behavior: smooth` to CSS for smooth scrolling to the anchor

7. **Added notification bell to the nav bar**
   - 🔔 icon with unread count badge (red circle with white number)
   - Badge only appears when there are unread mentions
   - Unread count fetched in root layout load function

### Key concepts introduced

- **Soft delete UX** — The database preserves the full comment record, but the UI shows a simple "This comment was deleted" message. This lets admins review deleted content while keeping the user experience clean.
- **Mention parsing** — Mentions are parsed server-side after the comment is inserted, not in the UI. This ensures mentions work consistently even if someone submits a form without JavaScript. The regex handles edge cases like multiple mentions, punctuation after names, and multi-word names.
- **`@everyone` expansion** — Rather than storing a single "@everyone" mention, the system expands it into individual rows for each RSVPed user. This makes the notifications query simple — just `WHERE mentioned_user_id = current_user`.
- **Anchor-based navigation** — Using URL hash fragments (`#comment-123`) combined with `scroll-behavior: smooth` and `onMount` to highlight the target comment. This is how the notifications page links directly to specific comments.
- **Grouped reactions** — Reactions are stored individually in the DB (one row per user per comment) but displayed grouped by emoji with counts. The `groupReactions()` function transforms the flat array into a map of `{ emoji → { count, userReacted } }`.

### Files created/modified

- `src/lib/utils.ts` — created (timeAgo, highlightMentions helpers)
- `src/routes/+layout.server.ts` — updated (fetches unread mention count)
- `src/routes/+layout.svelte` — updated (bell icon with unread badge)
- `src/routes/rides/[id]/+page.server.ts` — updated (added comment, deleteComment, react actions; mention parsing; marks mentions as read)
- `src/routes/rides/[id]/+page.svelte` — updated (comments section, reactions, mention highlighting, anchor highlighting)
- `src/routes/notifications/+page.server.ts` — created (mentions list + markAllRead action)
- `src/routes/notifications/+page.svelte` — created (notifications inbox UI)
- `src/routes/layout.css` — updated (smooth scrolling)

### Not yet done

- @mention autocomplete dropdown in comment textarea (currently mentions are typed manually)
- Banner image upload on rides
- Google Places Autocomplete for meeting spots
- Phase 7: Email notifications via Resend
- Phase 8: Polish & launch

---

## Session 1 (continued) — Phase 7: Email Notifications

### What we did

1. **Installed Resend SDK** (`npm install resend`)

2. **Created `src/lib/email.ts`** — centralized email utility with two functions:
   - `sendRideAnnouncement(ride, subscribers)` — sends a styled HTML email to all subscribers when a new ride is posted. Includes ride title, date/time, meeting spot, hare names, description preview, and a "View Ride" button. Uses BCC to send one email to all subscribers at once.
   - `sendMentionNotification(data)` — sends an email to a mentioned user with the commenter's name, a preview of the comment, the ride title, and a "View Comment" button linking to the specific comment anchor.
   - Both use a shared `emailWrapper()` for consistent dark-themed HTML email styling matching the site's look.
   - Both include an "Email preferences" link in the footer so recipients can easily opt out.
   - HTML is escaped via `escapeHtml()` to prevent XSS in email content.

3. **Wired ride announcements into ride creation** (`/rides/new/+page.server.ts`)
   - After creating a ride and inserting hares, queries all profiles with `subscribed_to_emails = true` and `role != 'pending'`
   - Resolves hare display names for the email
   - Calls `sendRideAnnouncement()` as fire-and-forget (doesn't block the redirect)

4. **Wired mention notifications into comment posting** (`/rides/[id]/+page.server.ts`)
   - After inserting mention rows, fetches each mentioned user's email and `notify_on_mention` preference
   - Sends individual emails only to users who have `notify_on_mention = true`
   - Includes the commenter's name, comment body preview, ride title, and deep link to the comment

5. **Added email preferences to profile setup** (`/profile/setup`)
   - Two checkboxes on the onboarding screen, both pre-checked:
     - "Email me when a new ride is posted" (`subscribed_to_emails`)
     - "Email me when someone mentions me" (`notify_on_mention`)
   - Server action now saves these preferences along with name/avatar

6. **Added `PUBLIC_SITE_URL` environment variable**
   - Used in email templates for generating links to rides and comments
   - Set to `http://localhost:5173` locally; needs to be set to production URL on Netlify

### Key concepts introduced

- **Fire-and-forget emails** — Email sending is called without `await`, so the user isn't blocked waiting for the email to send. If the email fails, it logs an error but doesn't break the user experience. The comment/ride is already saved in the database by the time the email goes out.
- **BCC for bulk emails** — Ride announcements use BCC (blind carbon copy) to send one email to all subscribers at once, rather than making separate API calls per recipient. Recipients can't see each other's email addresses.
- **HTML email styling** — Email clients don't support CSS classes or external stylesheets, so all styling must be inline (`style="..."` attributes). The email template uses inline styles matching the site's dark theme.
- **Resend SDK** — A simple wrapper around the Resend API. `resend.emails.send()` takes `from`, `to`, `subject`, and `html` — no complex configuration needed.

### Files created/modified

- `src/lib/email.ts` — created (email utility with ride announcement + mention notification)
- `src/routes/rides/new/+page.server.ts` — updated (sends ride announcement after creation)
- `src/routes/rides/[id]/+page.server.ts` — updated (sends mention notifications after comment)
- `src/routes/profile/setup/+page.svelte` — updated (email preference checkboxes)
- `src/routes/profile/setup/+page.server.ts` — updated (saves email preferences)
- `.env` — updated (added RESEND_API_KEY and PUBLIC_SITE_URL)

### Not yet done

- @mention autocomplete dropdown in comment textarea
- Banner image upload on rides
- Google Places Autocomplete for meeting spots
- Phase 8: Polish & launch

---

## Session 1 (continued) — Phase 8: Photos, Banner Images & Polish

### What we did

1. **Created `ImageUpload.svelte` component** (`src/lib/components/ImageUpload.svelte`)
   - Reusable image upload component used for both banner images and gallery photos
   - Drag-and-drop support with visual feedback (blue border on drag over)
   - Client-side resize via `OffscreenCanvas` — scales down to max width (default 1200px) and converts to WebP
   - Live preview of uploaded image with "Remove" button
   - Accepts `bucket`, `path`, `maxWidth`, `label` props — works with any Supabase storage bucket
   - Uses `$bindable` for the `value` prop so parent forms can read the URL
   - Hidden `<input name="image_url">` for form submission

2. **Added banner image upload to ride creation** (`/rides/new`)
   - ImageUpload component between description and hare picker
   - Uploads to `ride-images` bucket with path `banners/{uuid}.webp`
   - Server action saves the URL as `rides.image_url`

3. **Added banner image upload to ride editing** (`/rides/[id]/edit`)
   - Same component, pre-populated with existing banner if one exists
   - Uploads to `ride-images` bucket with path `banners/{ride_id}.webp` (overwrites on re-upload)
   - Server action updates `image_url` along with other ride fields

4. **Added banner image display on ride detail page**
   - Full-width rounded image at the top of the ride page, max 300px tall, object-cover
   - Only renders if the ride has an `image_url`

5. **Built the photo gallery on ride detail page** (`/rides/[id]`)
   - Section between attendees and comments with photo count in the header
   - "+ Add Photo" button (logged-in users only) reveals an upload form with:
     - ImageUpload component uploading to `ride-photos` bucket
     - Optional caption text input
     - Submit button (disabled until photo is uploaded)
   - Photo grid: 2 columns on mobile, 3 on larger screens, square aspect-ratio thumbnails
   - **Lightbox**: clicking a photo opens it full-screen on a dark overlay, click to dismiss
   - **Delete button**: appears on hover for the uploader or mods, with inline confirmation
   - Photo metadata: caption, uploader name displayed below each thumbnail

6. **Added server actions for photos**
   - `uploadPhoto` — inserts a `ride_photos` row with the URL, caption, ride_id, and user_id
   - `deletePhoto` — checks ownership or mod status before deleting the row

7. **Added Open Graph meta tags** to ride detail page
   - `og:title` — ride title
   - `og:description` — date, time, and meeting spot
   - `og:image` — banner image (if set)
   - Page `<title>` set to "{ride title} — SavBash"

8. **Added permission-labeled panels for ride management**
   - Edit/Delete buttons now grouped in a labeled panel showing WHY the user has access
   - Labels: "Your Ride" (creator), "Hare" (hare for this ride), "Admin" (moderator/admin), "Hare / Admin" (both)
   - Server now passes `isCreator`, `isHare`, `isMod` booleans to the frontend

### Key concepts introduced

- **Drag and drop uploads** — HTML5 drag and drop events (`ondragover`, `ondragleave`, `ondrop`) let users drag files directly onto the upload zone. The `e.preventDefault()` call is essential to stop the browser from navigating to the file.
- **Lightbox pattern** — A fixed-position overlay (`fixed inset-0 z-50`) with a dark background that shows the full-size image. Click anywhere to dismiss. Simple and effective without any library.
- **Open Graph meta tags** — `og:title`, `og:description`, and `og:image` control how links appear when shared in iMessage, Slack, Discord, etc. SvelteKit's `<svelte:head>` block makes it easy to set per-page meta tags.
- **Aspect-ratio thumbnails** — Using `aspect-square` (Tailwind) with `object-cover` creates uniform square thumbnails in the grid regardless of the original photo dimensions.

### Files created/modified

- `src/lib/components/ImageUpload.svelte` — created (reusable image upload with drag-drop, resize, preview)
- `src/routes/rides/new/+page.svelte` — updated (banner image upload)
- `src/routes/rides/new/+page.server.ts` — updated (saves image_url)
- `src/routes/rides/[id]/edit/+page.svelte` — updated (banner image upload)
- `src/routes/rides/[id]/edit/+page.server.ts` — updated (saves image_url)
- `src/routes/rides/[id]/+page.svelte` — updated (banner display, photo gallery, lightbox, OG meta tags, permission panels)
- `src/routes/rides/[id]/+page.server.ts` — updated (fetches photos, uploadPhoto/deletePhoto actions, passes permission flags)

---

## Session 1 (continued) — Phase 8 Continued: @Mention Autocomplete, Places, Error States

### What we did

1. **Built `MentionInput.svelte` component** (`src/lib/components/MentionInput.svelte`)
   - Replaces the plain comment textarea with a mention-aware input
   - Typing `@` triggers a dropdown showing all members + "@everyone"
   - Dropdown filters as you type, showing matching names with christian name as subtitle
   - Keyboard navigation: Arrow Up/Down to select, Enter/Tab to insert, Escape to close
   - Clicking a suggestion inserts `@Name ` at the cursor position and re-focuses the textarea
   - Dropdown positioned above the textarea to avoid being clipped
   - "@everyone" appears first with "Notify all RSVPs" subtitle

2. **Built `PlacesAutocomplete.svelte` component** (`src/lib/components/PlacesAutocomplete.svelte`)
   - Google Places Autocomplete for meeting spot selection on ride create/edit pages
   - Dynamically loads the Google Maps JS API only when `PUBLIC_GOOGLE_MAPS_API_KEY` is set
   - When a place is selected, populates the name, latitude, and longitude automatically
   - Falls back to a plain text input when no API key is configured (works exactly as before)
   - Hidden inputs for lat/lng are included in the component

3. **Created error page** (`src/routes/+error.svelte`)
   - Shows the HTTP status code (large, dimmed) and error message
   - "Back to rides" link to return to the homepage
   - Handles 404, 403, 500, etc. consistently

4. **Wired everything in**
   - Ride detail page comment form now uses MentionInput with member list
   - Ride create and edit pages now use PlacesAutocomplete
   - Added `PUBLIC_GOOGLE_MAPS_API_KEY` to .env (empty — works without it, activates when key is added)
   - Server loads member profiles for the mention autocomplete

### Key concepts introduced

- **Cursor-aware autocomplete** — The mention input tracks the cursor position in the textarea to find the `@` trigger character. The query is the text between `@` and the cursor. When a mention is inserted, the cursor is repositioned after the inserted name using `setSelectionRange()`.
- **Dynamic script loading** — The Google Maps API script is loaded on-demand in `onMount()` rather than in the HTML head, so it only loads on pages that need it and only when an API key is configured.
- **Graceful degradation** — Both new components work without their optional dependencies: MentionInput works as a plain textarea if no members are passed, PlacesAutocomplete works as a plain text input without an API key.

### Files created/modified

- `src/lib/components/MentionInput.svelte` — created (@mention autocomplete textarea)
- `src/lib/components/PlacesAutocomplete.svelte` — created (Google Places meeting spot picker)
- `src/routes/+error.svelte` — created (error page)
- `src/routes/rides/[id]/+page.svelte` — updated (uses MentionInput for comments)
- `src/routes/rides/[id]/+page.server.ts` — updated (fetches member profiles for autocomplete)
- `src/routes/rides/new/+page.svelte` — updated (uses PlacesAutocomplete)
- `src/routes/rides/[id]/edit/+page.svelte` — updated (uses PlacesAutocomplete)
- `.env` — updated (added PUBLIC_GOOGLE_MAPS_API_KEY)

---

## Session 2 — 2026-03-09: Members Page & Role Management

### What we did

1. **Created DB migration for role change protection** (`supabase/migrations/20260309000000_protect_role_changes.sql`)
   - `BEFORE UPDATE` trigger on `profiles` that enforces role change rules at the DB level
   - `pending → user`: any approved user can do this
   - All other role changes: admin only
   - Defense-in-depth — the app also checks, but this prevents bypass via direct Supabase client calls

2. **Created `/members` route** (`src/routes/members/`)
   - Server load: guards for authenticated non-pending users, fetches all profiles sorted by name
   - Two form actions: `approve` (any approved user, pending→user) and `changeRole` (admin only, validates role, prevents self-change)
   - Client-side search filtering with `$state` + `$derived`
   - Pending section with yellow border, avatar, name, email, approve button
   - Active members section with avatar, display name (+ christian name if different), role badge, admin role dropdown
   - Role badges: admin=purple, moderator=blue, user=gray, pending=yellow
   - Admin dropdown: `<select>` with auto-submit on change, hidden for non-admins and on own row

3. **Added Members nav link** in `+layout.svelte`
   - Visible to logged-in, non-pending users
   - Positioned between SavBash logo and the right-side icons

### Files created

- `supabase/migrations/20260309000000_protect_role_changes.sql`
- `src/routes/members/+page.server.ts`
- `src/routes/members/+page.svelte`

### Files modified

- `src/routes/+layout.svelte` (added Members nav link)

---

## Session 2 (continued) — 2026-03-09: Emoji Picker, Admin Profile Editor, Cancel Buttons

### What we did

1. **Full emoji picker for AvatarChooser**
   - Installed `unicode-emoji-json` package (lightweight emoji database with names and categories)
   - Rewrote `AvatarChooser.svelte` to use the full emoji dataset instead of ~60 hardcoded emojis
   - Added search input that filters emojis by name in real-time
   - Organized into 9 categories (Smileys & Emotion, People & Body, Animals & Nature, Food & Drink, Travel & Places, Activities, Objects, Symbols, Flags) with sticky headers
   - Scrollable container (`max-h-64 overflow-y-auto`) with "No emojis found" message

2. **Created admin profile editor** (`/members/[id]/edit`)
   - Admin-only page for editing any user's profile
   - Permission check: only `role = 'admin'` can access
   - Editable fields: avatar (photo/emoji via AvatarChooser), christian name, bash name, email preferences
   - Server-side validation: christian name required, bash name uniqueness (excluding target user)
   - "Back to members" link at top, "Profile saved!" confirmation banner
   - Same visual design as the `/profile` self-edit page

3. **Added Cancel buttons to profile edit pages**
   - `/profile` — Cancel link (`<a href="/">`) navigates to homepage
   - `/members/[id]/edit` — Cancel link (`<a href="/members">`) navigates to members list
   - Both styled as gray outlined buttons in a flex row next to Save Profile
   - Used `<a>` tags so cancel works without JS (progressive enhancement)

### Files created

- `src/routes/members/[id]/edit/+page.server.ts` — admin profile editor load + form action
- `src/routes/members/[id]/edit/+page.svelte` — admin profile editor UI

### Files modified

- `package.json`, `package-lock.json` — added `unicode-emoji-json`
- `src/lib/components/AvatarChooser.svelte` — full emoji picker with search and categories
- `src/routes/profile/+page.svelte` — cancel button added
- `src/routes/members/[id]/edit/+page.svelte` — cancel button added

---

## Session 3 — 2026-03-09: OTP Support & Navigation Fix

### What we did

- Added OTP (one-time passcode) support alongside magic links for login
- Fixed navigation bug so navbar updates correctly after OTP verification using `invalidateAll`

---

## Session 4 — 2026-03-09: SvelteKit + Supabase Developer Guide

### What we did

1. **Created `GUIDE.md`** — a comprehensive (~1800 lines) developer guide for Angular developers learning SvelteKit + Supabase
   - Uses real code snippets from every major file in the SavBash codebase with file paths
   - 13 sections covering: components, routing, data loading, form actions, auth, database queries, storage, Tailwind, TypeScript
   - Every Angular concept mapped to its SvelteKit equivalent with side-by-side comparisons
   - Quick reference section for common tasks ("how do I add a page?", "how do I protect a route?", etc.)
   - Summary comparison table of Angular vs SvelteKit concepts

### Files created

- `GUIDE.md` — SvelteKit + Supabase guide for Angular developers

---

## Session 5 — 2026-03-12: Fix Mention Emails + Approval Notification Email

### What we did

1. **Fixed mention insert RLS policy** — Mention rows were silently failing to insert because there was no INSERT policy on the `mentions` table. The code uses the user's authenticated client (not the service role key), so RLS blocked the insert. Added an INSERT policy allowing approved users to insert mentions.

2. **Added approval notification email** — When an admin/member approves a pending user, they now receive a "You're in!" email with a link to the site. Follows the same fire-and-forget pattern as mention emails.

3. **Wired approval email into both approve actions** — Both the homepage (`/`) and members page (`/members`) approve actions now fetch the approved user's email and send the notification.

### Files created

- `supabase/migrations/20260312000000_add_mentions_insert_policy.sql` — INSERT policy for mentions table

### Files modified

- `src/lib/email.ts` — added `sendApprovalNotification()` function
- `src/routes/members/+page.server.ts` — import + fire-and-forget approval email after approve
- `src/routes/+page.server.ts` — same approval email wiring

---

## Session: 2026-03-12 — Google Maps Location Picker & Preview

### What was done

Re-added Google Maps integration for ride location picking with a build-safe approach. Previously removed because `$env/static/public` broke Netlify builds when the API key wasn't set.

**Key concepts:**
- Uses `$env/dynamic/public` (runtime) instead of `$env/static/public` (build-time) so the build succeeds even without the key set
- API key is passed from layout server data → component props
- PlacesAutocomplete gracefully degrades to a plain text input when no API key is available

### Changes

**`src/routes/+layout.server.ts`** — Import `PUBLIC_GOOGLE_MAPS_API_KEY` via `$env/dynamic/public` and add `googleMapsApiKey` to layout data

**`src/lib/components/PlacesAutocomplete.svelte`** — Full rewrite:
- Accepts optional `apiKey` prop
- Dynamically loads Google Maps JS API with Places library
- Initializes autocomplete on the text input; populates name/lat/lng on place selection
- Shows a 150px inline map below the input with a draggable pin
- Map is clickable to reposition the pin for fine-tuning
- Dark-themed map styles to match the app
- Falls back to plain text input when no API key

**`src/routes/rides/new/+page.svelte`** — Pass `apiKey={data.googleMapsApiKey}` to PlacesAutocomplete

**`src/routes/rides/[id]/edit/+page.svelte`** — Same API key pass-through

**`src/routes/rides/[id]/+page.svelte`** — Added:
- Static map image (Google Maps Static API, 400x200 @2x) when lat/lng exist and API key is available
- "Open in..." links for Google Maps, Apple Maps, and Waze below the location

**`@types/google.maps`** — Installed as dev dependency for TypeScript support

### Not yet done
- No changes to `.env.example` needed (already had the key listed)
- API key must be set up in Google Cloud Console with Maps JavaScript API, Places API, and Maps Static API enabled
