# Cycling Group Website — Implementation Plan

## Overview

This document outlines a phased approach to building a cycling group event site with magic link authentication, ride posting, RSVPs, comments, emoji reactions, avatar uploads, and email notifications. The stack is **SvelteKit + Supabase + Netlify + Resend**.

Each phase produces something working and shippable on its own. You're not blocked from using the site until phase 5 — you can start organizing rides after phase 3.

---

## Phase 1 — Project Foundation & Local Dev Environment

**Goal:** Get a working local development environment with your tools connected and talking to each other. Nothing visible to users yet.

### Steps

1. **Create your Supabase project**
   - Sign up at supabase.com and create a new project
   - Choose a region close to you (e.g. US East)
   - Save your project URL and anon key — you'll need these soon
   - Spend 10–15 minutes exploring the Supabase dashboard: the Table Editor, Auth section, and SQL Editor are the three areas you'll use most

2. **Scaffold your SvelteKit app**
   - Run `npx sv create` and follow the prompts — choose the "Skeleton project" option
   - Select TypeScript when prompted
   - Install Tailwind CSS using `npx sv add tailwindcss` — this wires everything up automatically
   - Install the Supabase client package by running `npm install @supabase/supabase-js`
   - SvelteKit has first-class server-side rendering built in, so no special SSR adapter package is needed the way Next.js requires one

3. **Set up environment variables**
   - Create a `.env` file in your project root
   - Add your `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` from step 1
   - In SvelteKit, variables prefixed with `PUBLIC_` are safely exposed to the browser. Variables without that prefix stay server-only — useful later for your Resend API key
   - Never commit this file — make sure `.env` is in your `.gitignore`

4. **Create two Supabase client utilities**
   - A **browser client** initialized with your public env variables, used inside Svelte components for interactive UI
   - A **server client** created inside SvelteKit's `hooks.server.ts` file, which runs on every request and attaches the current user's session to the request context
   - SvelteKit's `hooks.server.ts` is the idiomatic place to handle this — it's similar in concept to Next.js middleware but more straightforward. Supabase's SvelteKit quickstart docs walk through this exact setup

5. **Create a GitHub repo and deploy to Netlify**
   - Push your scaffolded app to GitHub
   - Log into your existing Netlify account and connect the repo — Netlify detects SvelteKit automatically. Make sure `@sveltejs/adapter-netlify` is set as your adapter in `svelte.config.js` (you selected this during the `npx sv create` setup)
   - Add your environment variables in the Netlify dashboard under Site Configuration → Environment Variables
   - Every push to `main` will now auto-deploy — you'll use this throughout the project

### Checkpoint

A blank SvelteKit app with Tailwind running locally and deployed on Netlify, with Supabase connected. No UI yet, but your foundation is solid.

---

## Phase 2 — Database Schema

**Goal:** Design and create all the tables your app will need. Getting this right early saves significant refactoring later.

### Steps

1. **Open the Supabase SQL Editor**
   - You'll write SQL here to create your tables. Supabase saves your query history, which is helpful.

2. **Create the `profiles` table**
   - Fields: `id` (UUID, primary key, references `auth.users`), `christian_name` (text, NOT NULL — their real name), `bash_name` (text, nullable — their hash name/trail name), `email` (text), `role` (text, default 'user' — one of 'user', 'moderator', 'admin'), `avatar_url` (text, nullable), `avatar_emoji` (text, nullable), `subscribed_to_emails` (boolean, default true), `notify_on_mention` (boolean, default true), `created_at` (timestamp)
   - `role` controls permissions. Four levels:
     - **pending** — default for new signups. Completely locked out of the site until approved by an existing member. Can only see their own profile and set up their name/avatar while waiting.
     - **user** — approved member. Can create rides, RSVP, comment, react, upload photos. Can edit/delete only their own stuff.
     - **moderator** — can also delete any comment, delete any photo, and edit any user's profile (e.g. granting bash names). A few trusted members.
     - **admin** — full control over everything. Eventually gets an admin panel for site maintenance. Only one or two people.
   - Approving a user means changing their role from `pending` to `user`. To start, any approved user can do this; may be restricted to moderators later.
   - The app should show a list of pending users to approved members so they can approve newcomers.
   - `role` should only be changeable directly in the database or by an approved user (for pending→user) or admin (for other changes) — never exposed in the normal profile edit UI. Add a CHECK constraint to restrict values to the four valid options
   - `christian_name` is required (their real/given name). `bash_name` is optional — earned over time as is hash tradition. When displaying a user, show their bash name if they have one, otherwise fall back to christian name
   - `avatar_url` and `avatar_emoji` are mutually exclusive — whichever the user last set is the one that's active. Store both so switching between them doesn't destroy the other
   - Add a **unique constraint** on `bash_name` — this is essential for the `@mention` system in Phase 6, which looks up users by name. The @mention system should match against bash name first, then christian name. Enforce uniqueness at the database level and validate it in the profile setup UI with a friendly "that name is taken" message
   - This table stores public user info. The `auth.users` table is Supabase's internal auth table — `profiles` is your app's extension of it

3. **Create the `rides` table**
   - Fields: `id` (UUID), `title`, `description`, `ride_date` (timestamp), `meeting_spot_name` (text — human-readable label like "Starbucks on Main St"), `meeting_spot_lat` (numeric, nullable), `meeting_spot_lng` (numeric, nullable), `image_url` (text, nullable — banner image for the event), `created_by` (UUID, references profiles), `created_at` (timestamp), `updated_at` (timestamp, nullable), `updated_by` (UUID, nullable, references profiles)
   - `updated_at` and `updated_by` track the last edit — null means never edited. The UI can show "edited 2 hours ago by Dave" when these are set
   - Coordinates are optional — if provided, the app can generate links to Google Maps (`https://www.google.com/maps?q=LAT,LNG`), Apple Maps, Waze, etc. If only a name is given, the meeting spot displays as plain text with no map link
   - The UI should offer Google Places Autocomplete so users can search for a location and have the name + coordinates filled in automatically, but they can also just type a name manually
   - This is a Hash House Harriers–style group: one or two "hares" lay a trail in flour/chalk and the pack follows. Hare assignments are stored in the separate `ride_hares` table (see step 3b)

3b. **Create the `ride_hares` table**

- Fields: `id` (UUID), `ride_id` (references rides, cascade delete), `user_id` (UUID, nullable, references profiles), `name` (text, nullable), `created_at`
- Each ride has one or two hares. Each row represents one hare.
- Either `user_id` or `name` must be set (add a CHECK constraint: `user_id IS NOT NULL OR name IS NOT NULL`). Use `user_id` when the hare is a registered user on the site, or `name` as plain text for someone who isn't on the app yet (e.g. "Dave's friend Mike")
- If a `user_id` is set, the app should display their profile info (avatar, display name). If only `name` is set, just show the text.

3c. **Create the `ride_photos` table**

- Fields: `id` (UUID), `ride_id` (references rides, cascade delete), `user_id` (references profiles), `photo_url` (text), `caption` (text, nullable), `created_at`
- This is the post-ride photo gallery — anyone who attended can upload photos after the event
- Photos are stored in a Supabase Storage bucket (see step 8)

4. **Create the `rsvps` table**
   - Fields: `id` (UUID), `ride_id` (references rides), `user_id` (references profiles), `status` (text: going/maybe/not_going), `created_at`
   - Add a **unique constraint** on `(ride_id, user_id)` — one RSVP per person per ride. This prevents duplicates at the database level, which is cleaner than trying to handle it in your app code

5. **Create the `comments` table**
   - Fields: `id` (UUID), `ride_id` (references rides), `user_id` (references profiles), `body` (text), `is_deleted` (boolean, default false), `deleted_at` (timestamp, nullable), `deleted_by` (UUID, nullable, references profiles), `created_at`, `updated_at` (timestamp, nullable), `updated_by` (UUID, nullable, references profiles)
   - Comments use soft delete — setting `is_deleted = true` with `deleted_at` and `deleted_by`. The body and user are preserved in the database for admin review, but the UI shows "this comment was deleted" with no author or content visible
   - `updated_at` and `updated_by` track the last edit — the UI can show "(edited)" next to the timestamp when a comment has been modified
   - No hard delete — the RLS policy allows updates (for editing and soft-deleting) but not DELETE operations

6. **Create the `reactions` table**
   - Fields: `id` (UUID), `comment_id` (references comments), `user_id` (references profiles), `emoji` (text — stores a single emoji character like "👍" or "🔥"), `created_at`
   - Add a **unique constraint** on `(comment_id, user_id)` — one reaction per person per comment. If a user picks a different emoji, it replaces their existing one (upsert). This keeps the UI simple — no stacking multiple emojis per person
   - This design is simple and flexible — you don't need to predefine which emojis are allowed

7. **Create the `mentions` table**
   - Fields: `id` (UUID), `comment_id` (references comments), `mentioned_user_id` (UUID, references profiles), `ride_id` (references rides), `is_read` (boolean, default false), `created_at`
   - Unlike the previous design, `mentioned_user_id` is **not** nullable — `@everyone` mentions are expanded into individual rows at write time, one row per RSVPed user. This makes every subsequent query (unread count, notifications inbox) a simple filter on `mentioned_user_id` with no special `@everyone` branching logic needed
   - Add a **unique constraint** on `(comment_id, mentioned_user_id)` to prevent duplicate mention records for the same person in the same comment
   - `is_read` is the flag that drives the unread badge count in the nav bar — `false` by default, flipped to `true` when the user views the notification
   - Cascade delete from `comments` so that deleting a comment automatically cleans up its mention rows

8. **Set up Supabase Storage buckets**
   - In the Supabase dashboard → Storage, create three public buckets: `avatars`, `ride-images`, and `ride-photos`
   - `avatars` — user profile pictures. RLS: anyone can read, authenticated users can upload to their own path (`avatars/{user_id}/avatar.webp`)
   - `ride-images` — banner images set by hares when creating a ride. RLS: anyone can read, authenticated users can upload (`ride-images/{ride_id}/banner.webp`)
   - `ride-photos` — post-ride gallery photos uploaded by attendees. RLS: anyone can read, authenticated users can upload (`ride-photos/{ride_id}/{user_id}/{filename}`)
   - All three are public — no signed URLs needed for display

9. **Set up the automatic profile creation trigger**
   - Write a Postgres function + trigger that fires when a new user signs up via Supabase Auth, automatically creating a corresponding row in your `profiles` table
   - This is a common Supabase pattern and there are good examples in their docs. It means you never have to manually create profile rows — it just happens
   - **Note:** If you used Supabase's built-in option to auto-create this trigger when setting up your project, check what columns the generated `profiles` table has — it likely needs `christian_name`, `bash_name`, `role`, `avatar_url`, `avatar_emoji`, `subscribed_to_emails`, and `notify_on_mention` added manually to match the schema above

10. **Enable Row Level Security (RLS) on all tables**

- RLS is Supabase's system for controlling who can read/write what. Think of it as database-level permissions.
- Turn it ON for every table (it's off by default)
- Write policies for each table. Here's the general logic:
  - **profiles**: Anyone can read. Owner can update their own profile. Moderators and admins can update any profile (e.g. granting bash names). Only admins can change the `role` field.
  - **rides**: Anyone can read. Only authenticated users can insert. The ride creator, any hare on the ride, or a moderator/admin can update/delete.
  - **ride_hares**: Anyone can read. The ride creator or a moderator/admin can insert/update/delete hares for a ride.
  - **ride_photos**: Anyone can read. Only authenticated users can insert. The uploader, a moderator, or an admin can delete.
  - **rsvps**: Anyone can read. Only authenticated users can insert/update/delete their own RSVPs. Admins can remove any RSVP.
  - **comments**: Anyone can read. Only authenticated users can insert. The author, a moderator, or an admin can delete.
  - **reactions**: Anyone can read. Only authenticated users can insert their own reactions. Only the owner can delete their own reaction.
  - **mentions**: Only the mentioned user can read their own rows. Only authenticated server-side code inserts rows (users never write directly). Users can update only their own rows, and only the `is_read` field. Cascade delete from comments handles cleanup automatically.
- RLS means even if someone calls your API directly, they can't access data they shouldn't

11. **Generate TypeScript types**

- Install the Supabase CLI and run `supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts` to generate TypeScript types for all your tables. To install the CLI: on Mac run `brew install supabase/tap/supabase`, on Windows/Linux follow the instructions at supabase.com/docs/guides/cli/getting-started
- Run this now and again any time you change the schema — keeping types in sync means the compiler catches mismatches before they become runtime bugs
- Commit the generated types file to your repo so the whole project benefits from them

### Checkpoint

A fully designed database with proper relationships, constraints, security rules, and an auto-trigger for new users. You also have a configured Supabase Storage bucket ready for avatar images. You can verify all of this in the Supabase table editor and Storage dashboard.

---

## Phase 3 — Authentication

**Goal:** A working sign-in flow with magic links. After this phase, users can log in and stay logged in.

### Steps

1. **Configure Supabase Auth settings**
   - In your Supabase dashboard → Authentication → Settings
   - Set your site URL (your Netlify URL for now, `localhost:5173` for local — SvelteKit's default dev port)
   - Add both localhost and your Netlify URL to the allowed redirect URLs list
   - Magic links are enabled by default — no extra config needed

2. **Customize the magic link email**
   - In Supabase dashboard → Authentication → Email Templates
   - Edit the "Magic Link" template with your group's name and a friendly message
   - Keep the `{{ .ConfirmationURL }}` placeholder — that's the actual link

2b. **Set up custom SMTP so auth emails come from your domain**

- By default, Supabase sends auth emails from `noreply@mail.app.supabase.io`. To send from `admin@savbash.com` instead, configure a custom SMTP provider.
- In Supabase dashboard → Project Settings → Authentication → SMTP Settings, enable "Custom SMTP" and enter your SMTP credentials.
- Resend (which you'll set up in Phase 7) can serve as your SMTP provider — it provides SMTP credentials on your verified domain. This means both auth emails and app emails (ride announcements, mention notifications) come from the same `@savbash.com` address.
- Steps: (1) verify `savbash.com` in Resend, (2) get SMTP credentials from Resend dashboard, (3) enter them in Supabase SMTP settings, (4) set sender address to `admin@savbash.com`.
- This can wait until Phase 7 when you set up Resend — the default Supabase emails work fine for development.

3. **Build the sign-in page**
   - Route: `/login`
   - A simple form: one email input, one submit button
   - On submit, call `supabase.auth.signInWithOtp({ email })` — this sends the magic link
   - Show a confirmation message: "Check your email for a sign-in link!"
   - No password field, no confirmation email, nothing else

4. **Handle the auth callback route**
   - When a user clicks their magic link, Supabase redirects them to `/auth/callback` with a token in the URL
   - In SvelteKit, create this as a server-only route at `src/routes/auth/callback/+server.ts`
   - It exchanges the token for a session, sets the session cookie, and redirects the user to the homepage
   - This is about 10 lines of code. Supabase's SvelteKit docs have an exact example

5. **Use `hooks.server.ts` for session and route protection**
   - This file (created in Phase 1) already refreshes the session on every request
   - Extend it to protect certain routes — check if the user is logged in, and redirect to `/login` if someone tries to visit `/rides/new` without a session
   - SvelteKit's `locals` object is the idiomatic way to pass the current user/session down to individual pages — set `locals.user` here and read it in any page's `+page.server.ts` load function

6. **Add a nav bar with auth state**
   - Show the user's display name and a "Sign Out" button when logged in
   - Show a "Sign In" link when logged out
   - Use a Svelte writable store to hold the current session, populated from the server on page load and kept in sync via Supabase's `onAuthStateChange` listener — this is a natural fit for Svelte's reactive store system

7. **First-time login: profile setup prompt**
   - When a user logs in for the first time, their profile row has been created by the trigger but `display_name` is empty, `avatar_url` is null, and `avatar_emoji` is null
   - Detect this condition by checking for an empty `display_name` and redirect them to `/profile/setup` — a one-time onboarding screen
   - This screen should ask for their display name (required), validate it is unique against existing profiles, and offer an optional avatar choice (photo or emoji)
   - Keep it light: a name field, a friendly avatar picker, and a "Let's ride" button. This only ever happens once

### Checkpoint

Full authentication working end-to-end. You can sign in via email, click the link, land on the site logged in, and sign out. Sessions persist across browser restarts.

---

## Phase 4 — Core Features: Rides & RSVPs

**Goal:** The main functionality — posting rides, viewing them, and RSVPing. This is the heart of the site.

### Steps

1. **Homepage (`/`)**
   - Fetch upcoming rides from Supabase (ordered by date, `ride_date > now()`)
   - Display each as a card: title, date/time, meeting spot, hare name(s), banner image, and RSVP count
   - Include a "Past Rides" section below the fold showing the last 5-10 rides
   - Add a prominent "Post a Ride" button in the header (only shows when logged in)
   - In SvelteKit, data fetching happens in a `+page.server.ts` load function that runs on the server before the page renders — this is the natural SvelteKit pattern and gives you fast initial page loads with no client-side loading spinners

2. **Individual ride page (`/rides/[id]`)**
   - Full ride details: all fields, with the meeting spot name linked to Google Maps using the stored coordinates. Optionally embed a small static map preview
   - **RSVP section**: three buttons — "I'm In", "Maybe", "Can't Make It"
   - Show current RSVP status highlighted if the user has already RSVPed
   - Display an attendee grid: small avatars or initials of everyone who said they're going
   - Clicking an RSVP button when already RSVPed should update (not create a duplicate) — your unique constraint from Phase 2 enforces this, use an "upsert" operation

3. **RSVP interactivity**
   - The RSVP buttons should feel instant. Use optimistic UI updates: update the local state immediately when clicked, then sync with the database in the background
   - If the database update fails, roll back the local state and show an error
   - This makes the site feel snappy even on slower connections

4. **Real-time RSVP count updates (optional enhancement)**
   - Supabase has a real-time feature that lets you subscribe to database changes
   - Subscribe to `rsvps` changes on the ride page so that if two people are viewing the same ride page simultaneously, they see each other's RSVPs appear without refreshing
   - This is a polish feature — it works fine without it, but it's a fun one to add

5. **Create a ride page (`/rides/new`)**
   - A form with fields for all the `rides` columns: title, date, time, meeting spot, description, and a banner image upload
   - A "Hares" section where the creator can add one or two hares — either by searching for a registered user or typing a name for someone not on the app
   - The description field supports Markdown — add a small note below it ("Formatting supported: **bold**, _italic_, bullet lists") and use `marked` to render it as HTML on the ride page. Install it with `npm install marked`. The `@tailwindcss/typography` plugin you installed gives the rendered output clean styling for free via the `prose` class
   - On submit, insert into Supabase and redirect to the new ride's page
   - Validate inputs client-side before submitting (required fields, date must be in the future, etc.)
   - Consider making "Post a Ride" available to any logged-in member, or restricting it to specific admin accounts — your call based on how your group operates

6. **Edit/delete a ride**
   - Only the creator should see edit/delete options on a ride they posted
   - Add an edit form at `/rides/[id]/edit` — in SvelteKit this is a `+page.svelte` file inside `src/routes/rides/[id]/edit/`
   - For delete, use a confirmation dialog before executing
   - Your RLS policies from Phase 2 will enforce this at the database level even if someone bypasses the UI

### Checkpoint

The site is usable. You can post rides, view them, and RSVP. This is your v1 — you could start using it with your group right now.

---

## Phase 5 — Avatar Uploads

**Goal:** Let users set a profile avatar — either by uploading a photo or by choosing an emoji. Avatars appear throughout the site next to names, with emoji avatars displayed oversized for a fun, distinctive look.

### Steps

1. **Build the avatar chooser UI**
   - Add an avatar section to the `/profile` page (and the first-time `/profile/setup` screen from Phase 3)
   - Present two options side by side: **"Upload a photo"** and **"Pick an emoji"** — a simple tab or toggle switcher works well
   - Show the current avatar in a large preview circle above the switcher so users can see what they'll look like before saving
   - If no avatar is set yet, show the initials placeholder as the preview

2. **Photo upload path**
   - An "Upload photo" button opens a file picker — accept `image/*` only
   - Show a preview of the selected image before confirming
   - Use the browser's built-in `Canvas` API to resize the image client-side to 64×64 WebP before it ever leaves the device — no server processing needed. This keeps files tiny (typically under 5KB) and consistent across all users
   - Upload the resized blob to your `avatars` Supabase Storage bucket at `{user_id}/avatar.webp`, get the public URL, save it to `profiles.avatar_url`, and clear `profiles.avatar_emoji`

3. **Emoji avatar path**
   - Show a scrollable grid of curated emojis to choose from — a few dozen is plenty. Group them loosely by theme (faces, animals, sports, food, objects) for easy browsing
   - Avoid showing the full Unicode emoji set — it's overwhelming on mobile. Curate ~60–80 fun options
   - When the user taps an emoji, show it immediately in the preview circle above at large size so they can see how it'll look before saving
   - On confirm, save the chosen emoji character to `profiles.avatar_emoji` and clear `profiles.avatar_url`

4. **Rendering emoji avatars large**
   - When a user has `avatar_emoji` set, render it in a neutral-colored circle (light grey or a soft tint works well as a backdrop) instead of an image
   - The emoji itself should be rendered significantly larger than the circle — around 1.5–2× the container size with `overflow: visible` — so it feels bold and expressive rather than small and clipped. A 64px container with a ~80–90px emoji font size hits a nice sweet spot
   - This oversized treatment only applies to emoji avatars — photo avatars still render as a standard cropped circle

5. **Display avatars throughout the site**
   - The same avatar component is used everywhere: nav bar, RSVP attendee grid, comment threads, and reaction attribution
   - The component takes a profile and renders the right thing based on which field is set: photo → cropped circle image, emoji → oversized emoji on a tinted circle, neither → initials on a deterministic color circle
   - Build this as a single reusable Svelte component (e.g. `Avatar.svelte`) that you drop in anywhere — it accepts a `profile` prop and handles all three cases internally. This way the oversized emoji style is consistent everywhere without duplicating logic

### Checkpoint

Users can set their avatar as either a uploaded photo or a chosen emoji. Emoji avatars render oversized and bold throughout the site. A single reusable `Avatar.svelte` component handles all three states — photo, emoji, and initials fallback — consistently everywhere.

---

## Phase 6 — Comments & Emoji Reactions

**Goal:** Per-ride discussion threads with emoji reactions on individual comments. This adds the social layer that makes the site feel alive.

### Steps

1. **Comments section on the ride page**
   - Render below the RSVP section on `/rides/[id]`
   - Show each comment with: avatar (or initials fallback), display name, relative timestamp (e.g. "2 hours ago"), and comment body
   - Show a text input and "Post" button for logged-in users
   - Show a "Sign in to comment" prompt for logged-out visitors

2. **Posting a comment**
   - Insert into the `comments` table with `ride_id` and `user_id`
   - Use a SvelteKit form action so the post works even without JavaScript (progressive enhancement — a nice touch)
   - After posting, clear the input and append the new comment to the list without a full page reload
   - Optimistic UI helps here: show the comment immediately in the list, sync with the database in the background
   - After the comment is inserted, parse the body for mentions and insert corresponding rows into the `mentions` table (see step 5 below) — do this server-side in the same form action handler

3. **Deleting a comment**
   - Show a small delete button on comments the current user authored
   - A simple inline confirm ("Delete this comment?") is less disruptive than a modal for something this small
   - Your RLS policy handles authorization automatically at the database level
   - Because `mentions.comment_id` has a cascading foreign key to `comments`, deleting a comment automatically cleans up its mention records too

4. **@mention support in the comment input**
   - When a user types `@` in the comment box, show a small autocomplete dropdown listing members by display name
   - Populate the dropdown by querying the `profiles` table filtered by whatever text follows the `@` — e.g. typing `@sam` narrows the list to names containing "sam"
   - Selecting a name from the dropdown inserts the mention into the text as `@DisplayName` and closes the dropdown
   - `@everyone` is a special reserved keyword — show it as the first option in the dropdown whenever `@` is typed, with a label like "Notify everyone going to this ride"
   - On mobile, the autocomplete dropdown should appear above the keyboard rather than below the input

5. **Parsing and storing mentions on submit**
   - When the form action receives the comment body, run a server-side parse to extract all `@mentions` from the text using a simple regex
   - For each `@DisplayName` found, look up the matching profile by `display_name` and insert a row into `mentions` with `comment_id`, `mentioned_user_id`, and `ride_id`
   - For `@everyone`, query all profiles that have RSVPed to the ride (status `going` or `maybe`), then insert one `mentions` row per person — this expansion at write time keeps all subsequent reads simple
   - Exclude the comment author from the mention rows — no need to notify someone they mentioned themselves or used `@everyone` in their own comment
   - Do all of this in a single database transaction with the comment insert so that if something fails, no partial data is saved

6. **Rendering mentions in comment text**
   - When displaying a comment body, replace any `@DisplayName` tokens with a highlighted styled span — a subtle colored background or bold text works well
   - If the mention matches the currently logged-in user, use a more prominent highlight (similar to how Slack highlights your own name)
   - This is purely a display transformation — the raw comment body stored in the database is plain text, which keeps things simple and portable

7. **Notifications bell in the nav bar**
   - Add a bell icon (🔔) to the nav bar, visible only to logged-in users
   - On page load, query the `mentions` table for `count(*) where mentioned_user_id = current_user AND is_read = false` — this is your unread badge count
   - Show a small red badge on the bell when the count is greater than zero — hide it entirely when it's zero
   - Use a Svelte derived store so the badge count is reactive: it updates automatically when new mentions arrive via Supabase Realtime without needing a page reload

8. **Notifications dropdown or page**
   - Clicking the bell opens a dropdown panel (on desktop) or navigates to a `/notifications` page (on mobile — dropdowns are fiddly on small screens)
   - Each notification row shows: the avatar and name of whoever mentioned you, a short preview of the comment body (truncated to ~80 characters), the ride name, and a relative timestamp
   - Each row links directly to the specific comment using an HTML anchor fragment — render each comment with `id="comment-{comment_id}"` in the DOM, then make the notification link `/rides/[id]#comment-{comment_id}`. The browser scrolls to the right comment automatically, no JavaScript needed
   - Add `scroll-behavior: smooth` to your global CSS so the scroll animates rather than jumps
   - Add a brief highlight on the targeted comment — on mount, check if the comment's id matches `window.location.hash` and if so apply a background color that fades out after a second or two via a CSS transition. This "yellow fade" helps the user immediately spot which comment they were linked to in a long thread
   - Clicking a notification row marks that mention as read (`is_read = true`) before navigating
   - If there are no notifications yet, show a friendly empty state ("No mentions yet — go post a ride!")
   - A "Mark all as read" button at the top of the list for convenience

9. **Marking mentions as read**
   - When a user clicks a notification row, update that mention row's `is_read` to `true` in Supabase before navigating
   - For "Mark all as read", batch update all unread mentions for the current user in one query
   - Optionally, also mark mentions as read automatically when the user visits the ride page the mention belongs to — this covers the case where someone clicks directly to the ride from an email notification and never opens the bell dropdown
   - The RLS policy on `mentions` should allow users to update only their own rows (`mentioned_user_id = auth.uid()`) and only the `is_read` field — they shouldn't be able to modify anything else

10. **Emoji reaction picker**

- Below each comment, show a small "Add reaction" button (a smiley face icon works well)
- Tapping it opens a small popover with a curated set of relevant emojis — keep it short and fun: 👍 ❤️ 😂 🔥 🚴 💪 👏
- Don't use a full emoji keyboard — a hand-picked set of 6–8 options is faster to tap and more on-brand
- On mobile, the popover should appear above the comment to avoid being hidden behind the keyboard

11. **Displaying reactions**

- Group reactions by emoji and show counts next to each (e.g. 👍 3 🔥 2)
- If the current user has reacted with a given emoji, highlight it distinctly (a filled background works well)
- Tapping an emoji the user has already reacted with **removes** their reaction — this is the toggle behavior people expect from emoji reactions
- To implement the toggle: attempt an upsert on the `reactions` table, and if the row already exists (thanks to your unique constraint), delete it instead

12. **Fetching reactions efficiently**

- When loading a ride page, fetch comments and their reaction counts in a single query using a Postgres join rather than making separate requests per comment
- Supabase supports this via select with embedded counts: `comments(*, reactions(emoji))` — then group and count in your load function
- Also fetch which emojis the current user has reacted with so you can show the highlighted state correctly on page load

13. **Real-time updates (optional)**

- Subscribe to both `comments` and `reactions` table changes via Supabase Realtime on the ride page
- New comments and reactions appear instantly for everyone viewing the same ride — particularly fun on ride day when people are checking in

### Checkpoint

Comments, @mentions, emoji reactions, and a notifications inbox are fully working. The bell icon in the nav bar shows a live unread badge count. Clicking a notification links directly to the relevant ride discussion and marks it read. `@everyone` expands to all RSVPed riders at write time, keeping queries fast and simple throughout.

---

## Phase 7 — Email Notifications

**Goal:** Automatically email subscribers when a new ride is posted. This is what keeps people coming back even if they don't check the site regularly.

### Steps

1. **Sign up for Resend**
   - resend.com — free tier is 3,000 emails/month, more than enough
   - Add your sending domain (or use their default `@resend.dev` for testing)
   - Add your `RESEND_API_KEY` to your `.env` file locally and to your Netlify site's Environment Variables dashboard

2. **Design your ride announcement email**
   - Resend supports sending HTML emails — write a simple HTML email template as a string in your SvelteKit server code, or use a library like `mjml` for a more maintainable responsive email layout
   - The email should include: ride title, date/time, meeting spot, hare name(s), a short description, the banner image, and a big "I'm In" button that links directly to the ride's RSVP page
   - Keep it clean and mobile-friendly — most people will read it on their phone
   - Include a one-click unsubscribe link at the bottom

3. **Create a Supabase Edge Function to send the emails**
   - An Edge Function is a serverless function that lives inside your Supabase project
   - Write one called `send-ride-announcement` that:
     1. Accepts a `ride_id` as input
     2. Fetches all profiles where `subscribed_to_emails = true`
     3. Calls the Resend API to send the email to each subscriber
   - Edge Functions are written in TypeScript/Deno and deploy from your local machine using the Supabase CLI

4. **Write a second Edge Function for mention notifications**
   - Call it `send-mention-notification`
   - It accepts a `comment_id` as input. Because `@everyone` is already expanded into individual rows at write time, there is no special casing needed — every row in `mentions` for this `comment_id` is treated identically: fetch the `mentioned_user_id`, check their `notify_on_mention` preference, and send if enabled
   - The email should show who mentioned them, a preview of the comment, and a direct link to the ride page anchored to the specific comment (`/rides/[id]#comment-{comment_id}`)
   - Never send a mention notification to the person who wrote the comment — add a guard for `mentioned_user_id != comment.user_id`

5. **Trigger the mention function after a comment is posted**
   - In the same SvelteKit form action that handles comment submission, after inserting the `mentions` rows, call `send-mention-notification` with the new `comment_id`
   - Do this after the database transaction completes so you're not sending emails for comments that failed to save

6. **Trigger the ride announcement function when a new ride is posted**
   - Two options:
     - **From your SvelteKit app**: After a ride is successfully created, call the Edge Function directly from your `/rides/new` form action handler. Simple and explicit.
     - **Database trigger**: Set up a Postgres trigger that calls the Edge Function automatically whenever a row is inserted into `rides`. More automatic, but slightly more complex to set up.
   - For a first version, calling it from the form action handler is simpler and easier to debug. SvelteKit's form actions (in `+page.server.ts`) are the natural place for this logic

7. **Email preferences in the profile page**
   - Add two toggles on the `/profile` page:
     - "Email me when a new ride is posted" — maps to `subscribed_to_emails`
     - "Email me when someone mentions me in a comment" — maps to `notify_on_mention`
   - Both default to `true` — new users are opted in automatically but can easily opt out of either independently

8. **First-login email subscription prompt**
   - When a user sets their display name for the first time, include both email preference checkboxes on the onboarding screen
   - Both pre-checked, with brief plain-language labels

### Checkpoint

Two email flows working: new ride announcements go to all subscribers, and mention notifications go to the specific users tagged in a comment (or all RSVPed riders for `@everyone`). Both are independently configurable per user.

---

## Phase 8 — Polish & Launch

**Goal:** Make the site feel finished, handle edge cases, and prepare it for your actual group.

### Steps

1. **Mobile responsiveness**
   - Test every page on your phone. Most of your members will use this on mobile.
   - Ensure the RSVP buttons are large and tappable
   - Make sure the ride cards look good on small screens
   - The attendee grid should wrap gracefully

2. **Loading and error states**
   - Add loading skeletons or spinners while data is fetching
   - Handle errors gracefully: what happens if the RSVP fails? If the comment doesn't post?
   - Show clear feedback for all user actions ("You're in!", "Comment posted", "Ride created")

3. **Empty states**
   - What does the homepage look like when there are no upcoming rides? Add a friendly message.
   - What does a ride page look like with no RSVPs yet? No comments?

4. **Meta tags and share previews**
   - Add Open Graph meta tags to ride pages so that when someone shares a ride link in iMessage or a group chat, it shows a nice preview card with the ride title and date
   - In SvelteKit, use the `<svelte:head>` block inside your `+page.svelte` file to inject per-page meta tags — it's clean and straightforward

5. **Custom domain via Netlify**
   - In your Netlify dashboard, go to your site → Domain management → Register and buy a domain — search for something short and fun like `[groupname].bike` or `[groupname].rides`
   - Because you're buying through Netlify directly, DNS is configured automatically and a wildcard SSL certificate is provisioned immediately — no manual DNS records to copy anywhere
   - The one manual step: go to Supabase dashboard → Authentication → Settings and add your new domain to the allowed redirect URLs list so magic link emails route correctly

6. **Soft launch with your group**
   - Share the site with one or two people first to catch obvious issues
   - Then send it to the full group with a brief explanation of how it works
   - Consider sending a "welcome" email from Resend explaining the magic link flow so people aren't confused by the passwordless sign-in

7. **Ongoing maintenance**
   - Supabase and Netlify both have dashboards showing usage, errors, and deploy logs
   - Set up Netlify email alerts so you get notified if a deploy fails
   - The free tiers of both Supabase and Netlify should comfortably handle a group of friends indefinitely

---

## Summary Timeline

| Phase     | Description                                   | Estimated Time   |
| --------- | --------------------------------------------- | ---------------- |
| 1         | Project foundation & environment              | 2–3 hours        |
| 2         | Database schema & RLS                         | 2–3 hours        |
| 3         | Authentication (magic links)                  | 3–4 hours        |
| 4         | Rides & RSVPs                                 | 4–6 hours        |
| 5         | Avatar uploads (photo + emoji)                | 3–4 hours        |
| 6         | Comments, mentions, notifications & reactions | 6–8 hours        |
| 7         | Email notifications                           | 3–4 hours        |
| 8         | Polish & launch                               | 2–4 hours        |
| **Total** |                                               | **~25–36 hours** |

A focused weekend gets you through phases 1–4 (a working, usable site). Phases 5–7 can happen over a few subsequent evenings.

---

## Key Decisions to Make Before Starting

- **TypeScript** is the chosen language for this project. Select it when prompted by `npx sv create`. Run the Supabase CLI type generation after completing Phase 2 so all your table types are available from the start.
- **Who can post rides?** Any logged-in member, or just a few admins? Start open and restrict later if needed.
- **Opt-in or opt-out for emails?** This plan defaults to opt-in for both ride announcements and mention notifications. Both are independently togglable.
- **Which emojis to include in the reaction picker?** A curated set of 6–8 is recommended over a full emoji keyboard. Suggested set: 👍 ❤️ 😂 🔥 🚴 💪 👏 — but make it your own.
- **Avatar upload required or optional?** This plan treats it as optional. If you want the site to feel more personal from day one, you could nudge users harder to set one during onboarding, but don't make it a blocker.
- **Should `@everyone` be limited to ride creators?** Opening it up to all members keeps things friendly for a small group, but if spammy `@everyone` usage becomes a problem later you can restrict it to whoever posted the ride.
