# SvelteKit + Supabase Guide for Angular Developers

A practical guide to understanding and maintaining the SavBash codebase. Every code example comes from real files in this project — file paths are included so you can read the full source.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Project Structure](#2-project-structure)
3. [Components](#3-components)
4. [Routing & Navigation](#4-routing--navigation)
5. [Data Loading](#5-data-loading)
6. [Form Actions & Mutations](#6-form-actions--mutations)
7. [Authentication with Supabase](#7-authentication-with-supabase)
8. [Database Queries with Supabase](#8-database-queries-with-supabase)
9. [Supabase Storage (File Uploads)](#9-supabase-storage-file-uploads)
10. [Styling with Tailwind CSS](#10-styling-with-tailwind-css)
11. [TypeScript Integration](#11-typescript-integration)
12. [Key Differences Summary Table](#12-key-differences-summary-table)
13. [Common Tasks Quick Reference](#13-common-tasks-quick-reference)

---

## 1. Introduction

### Who This Guide Is For

You know Angular. You've built apps with components, services, dependency injection, routing modules, and RxJS. Now you're looking at a SvelteKit codebase and wondering "where's the module?", "where's the service?", "why is there no constructor?"

This guide translates every major Angular concept into its SvelteKit equivalent using real code from SavBash — the cycling group app you co-built. By the end, you should be able to read, modify, and extend this codebase on your own.

### The Mental Model Shift

Angular is a **framework with ceremony** — you declare modules, configure providers, inject services, create separate files for template/styles/logic/tests, and write decorators everywhere. It's powerful but verbose.

Svelte is a **compiler with minimal ceremony** — a `.svelte` file *is* a component. There are no modules to register, no decorators, no dependency injection. You write what looks like enhanced HTML with JavaScript sprinkled in, and the compiler turns it into efficient vanilla JS.

| Angular mindset | Svelte mindset |
|---|---|
| "I need to register this in a module" | Just import and use it |
| "I need a service to share data" | Just export from a `.ts` file |
| "I need to subscribe/unsubscribe to observables" | Reactive variables auto-update the DOM |
| "I need 4 files per component" | One `.svelte` file does everything |
| "I need to configure routing in a module" | Put a file in the right folder |

The biggest shift: in Angular, you **tell** the framework about your code (decorators, modules, providers). In Svelte, the compiler **reads** your code and figures out the rest.

---

## 2. Project Structure

### Angular vs SvelteKit Directory Mapping

In Angular, your project might look like:
```
src/app/
  core/           ← singleton services, guards, interceptors
  shared/         ← shared components, pipes, directives
  features/
    rides/        ← feature module with routing
    profile/      ← feature module with routing
  app-routing.module.ts
  app.module.ts
```

In SvelteKit (SavBash), it looks like this:
```
src/
  routes/                    ← All pages & routing (file-based!)
    +layout.svelte           ← Root layout (like AppComponent template)
    +layout.server.ts        ← Root layout data loader
    +page.svelte             ← Homepage component
    +page.server.ts          ← Homepage server-side logic
    login/
      +page.svelte           ← Login page
    rides/
      [id]/                  ← Dynamic route (like :id in Angular)
        +page.svelte
        +page.server.ts
      new/
        +page.svelte
        +page.server.ts
    profile/
      +page.svelte
      +page.server.ts
    auth/
      callback/
        +server.ts           ← API endpoint (no UI)
  lib/                       ← Shared code (like Angular's shared/ + core/)
    components/              ← Reusable Svelte components
      Avatar.svelte
      AvatarChooser.svelte
      MentionInput.svelte
      ImageUpload.svelte
    supabaseClient.ts        ← Browser-side Supabase client
    utils.ts                 ← Shared utility functions
    email.ts                 ← Server-only email sending
    database.types.ts        ← Auto-generated Supabase types
  hooks.server.ts            ← Middleware (like interceptors + guards)
  app.d.ts                   ← Global TypeScript declarations
```

### The Special Filenames

SvelteKit uses specific filenames to determine what code does. This replaces Angular's decorators and module configuration:

| SvelteKit file | Angular equivalent | Purpose |
|---|---|---|
| `+page.svelte` | A routed component | The UI for a specific route |
| `+page.server.ts` | Resolver + service call + guard | Server-side data loading & form handling |
| `+layout.svelte` | Layout component wrapping `<router-outlet>` | Wraps all child routes (nav, footer, etc.) |
| `+layout.server.ts` | Root resolver | Data loading shared by all child routes |
| `+server.ts` | Controller / API endpoint | Pure server endpoint, no UI (REST-style) |
| `+error.svelte` | Error component | Shown when a route errors |

### Key Config Files

**`svelte.config.js`** — The main Svelte config. Ours is minimal:

```js
// svelte.config.js
import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-netlify';

const config = {
  kit: { adapter: adapter() },
  preprocess: [mdsvex()],
  extensions: ['.svelte', '.svx']
};

export default config;
```

- `adapter` = where/how you deploy (Netlify, Vercel, Node, etc.). Like Angular's build target.
- `preprocess` = transforms applied to `.svelte` files before compilation. mdsvex lets us use Markdown.
- `extensions` = file types Svelte treats as components.

**`vite.config.ts`** — The build tool config (Vite replaces Webpack/esbuild):

```ts
// vite.config.ts
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [tailwindcss(), sveltekit()] });
```

**`app.d.ts`** — Global type declarations (covered in [Section 11](#11-typescript-integration)).

---

## 3. Components

This is where the biggest differences live. In Angular, a component is spread across 3-4 files and registered in a module. In Svelte, a component is a single `.svelte` file with three optional sections:

```svelte
<script lang="ts">
  // Logic (like the Angular component class)
</script>

<!-- Markup (like the Angular template) -->

<style>
  /* Scoped styles (like Angular's component styles) */
</style>
```

That's it. No decorator, no module registration, no selector. To use a component, just import it.

### Props: `@Input()` → `$props()`

**Angular:**
```typescript
@Input() profile: Profile;
@Input() size: 'sm' | 'md' | 'lg' = 'md';
```

**Svelte — from `src/lib/components/Avatar.svelte`:**
```svelte
<script lang="ts">
  type AvatarProfile = {
    christian_name?: string | null;
    bash_name?: string | null;
    avatar_url?: string | null;
    avatar_emoji?: string | null;
  };

  let { profile, size = 'md' }: { profile: AvatarProfile | null; size?: 'sm' | 'md' | 'lg' } =
    $props();
</script>
```

The `$props()` rune is a special Svelte function (called a "rune") that destructures the component's props. The `= 'md'` provides a default value, just like Angular's `= 'md'` on an `@Input()`.

**Using the component — from `src/routes/+layout.svelte:41`:**
```svelte
<Avatar profile={data.profile} size="sm" />
```

No `<app-avatar>` selector needed. Just import and use the component name directly as a tag.

### State: Class Properties / Signals → `$state()`

**Angular:**
```typescript
// Angular class property (legacy)
email: string = '';
loading: boolean = false;

// Angular signal (modern)
email = signal('');
loading = signal(false);
```

**Svelte — from `src/routes/login/+page.svelte:5-11`:**
```svelte
<script lang="ts">
  let email = $state('');
  let loading = $state(false);
  let sent = $state(false);
  let error = $state('');
  let otp = $state('');
  let verifying = $state(false);
  let otpError = $state('');
</script>
```

`$state()` creates reactive state. When the value changes, anything in the template that references it re-renders automatically. No `this.cdr.detectChanges()`, no `.set()` on a signal — just assign a new value:

```ts
loading = true;  // UI updates wherever `loading` is referenced
error = authError.message;  // UI updates wherever `error` is referenced
```

This is like Angular signals but with simpler syntax — plain assignment instead of `.set()`.

### Computed / Derived: Getters / `computed()` → `$derived()`

**Angular:**
```typescript
// Angular computed signal
displayName = computed(() => this.profile()?.bash_name || this.profile()?.christian_name || '?');
```

**Svelte — from `src/lib/components/Avatar.svelte:51-64`:**
```svelte
<script lang="ts">
  const displayName = $derived(profile?.bash_name || profile?.christian_name || '?');

  const initials = $derived(
    displayName
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  );

  const colorIndex = $derived(
    displayName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length
  );
</script>
```

`$derived()` recomputes whenever any reactive value it reads changes. When `profile` changes, `displayName` recalculates, which causes `initials` and `colorIndex` to recalculate too. It's automatic dependency tracking — you don't need to list dependencies like in `useEffect` or `combineLatest`.

For more complex computed values that need multiple statements, use `$derived.by()`:

**From `src/lib/components/AvatarChooser.svelte:50-62`:**
```svelte
<script lang="ts">
  const emojiGroups = $derived.by(() => {
    const term = search.toLowerCase().trim();
    const filtered = term ? allEmojis.filter((e) => e.name.includes(term)) : allEmojis;

    const grouped: Record<string, { emoji: string; name: string }[]> = {};
    for (const e of filtered) {
      (grouped[e.group] ??= []).push(e);
    }

    return groupOrder
      .filter((g) => g in grouped)
      .map((g) => ({ label: g, emojis: grouped[g] }));
  });
</script>
```

`$derived()` takes an expression. `$derived.by()` takes a function body — use it when you need temporary variables or complex logic.

### Effects: `ngOnInit` / `ngOnChanges` → `$effect()`

**Angular:**
```typescript
ngOnInit() {
  // Run once after component initializes
}

ngOnChanges(changes: SimpleChanges) {
  if (changes['form']?.currentValue?.success) {
    this.saved = true;
    setTimeout(() => this.saved = false, 3000);
  }
}
```

**Svelte — from `src/routes/profile/+page.svelte:11-16`:**
```svelte
<script lang="ts">
  let saved = $state(false);

  $effect(() => {
    if (form?.success) {
      saved = true;
      setTimeout(() => (saved = false), 3000);
    }
  });
</script>
```

`$effect()` runs whenever any reactive value it reads changes. Here, it watches `form` (which comes from `$props()`) — when a form submission succeeds and SvelteKit updates the `form` prop with `{ success: true }`, the effect fires, shows a success message for 3 seconds, then hides it.

Key differences from Angular:
- No need to implement an interface (`OnInit`, `OnChanges`)
- No lifecycle hook names to remember
- Dependencies are tracked automatically (not listed manually)
- Effects run after the DOM updates, not before

**Another example — from `src/routes/rides/[id]/+page.svelte:110-118`:**
```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  let highlightedCommentId = $state<string | null>(null);

  onMount(() => {
    if (window.location.hash) {
      const id = window.location.hash.replace('#comment-', '');
      highlightedCommentId = id;
      setTimeout(() => {
        highlightedCommentId = null;
      }, 3000);
    }
  });
</script>
```

`onMount` is the closest thing to Angular's `ngOnInit` — it runs once when the component first renders in the browser. Use it when you need to access browser APIs like `window`.

### Two-Way Binding: `[(ngModel)]` → `bind:` + `$bindable()`

**Angular:**
```html
<input [(ngModel)]="email" />
<app-avatar-chooser [(avatarUrl)]="avatarUrl"></app-avatar-chooser>
```

**Svelte — simple input binding from `src/routes/login/+page.svelte:79`:**
```svelte
<input type="text" bind:value={otp} />
```

`bind:value` creates two-way binding between the input's value and the `otp` state variable. When the user types, `otp` updates. When code sets `otp`, the input updates.

**Svelte — component binding from `src/lib/components/AvatarChooser.svelte:4-6`:**
```svelte
<script lang="ts">
  let {
    avatarUrl = $bindable<string | null>(null),
    avatarEmoji = $bindable<string | null>(null),
    christianName = '',
    bashName = '',
    userId
  }: { /* types */ } = $props();
</script>
```

`$bindable()` marks a prop as two-way bindable. The parent can then use `bind:`:

**From `src/routes/profile/+page.svelte:29-35`:**
```svelte
<AvatarChooser
  bind:avatarUrl
  bind:avatarEmoji
  christianName={data.profile?.christian_name ?? ''}
  bashName={data.profile?.bash_name ?? ''}
  userId={data.userId}
/>
```

When `AvatarChooser` sets `avatarUrl = newUrl` internally, the parent's `avatarUrl` state variable updates too. Just like Angular's two-way binding with `@Input()` + `@Output()`, but with less boilerplate.

### Conditionals: `*ngIf` / `@if` → `{#if}`

**Angular:**
```html
<!-- Legacy -->
<div *ngIf="session">...</div>
<div *ngIf="profile?.avatar_url; else elseBlock">...</div>

<!-- Modern -->
@if (session) { ... } @else { ... }
```

**Svelte — from `src/lib/components/Avatar.svelte:67-94`:**
```svelte
{#if profile?.avatar_url}
  <!-- Photo avatar -->
  <div class="relative shrink-0 {sizeClasses[size]}">
    <img
      src={profile.avatar_url}
      alt={displayName}
      class="rounded-full object-cover {sizeClasses[size]}"
    />
  </div>
{:else if profile?.avatar_emoji}
  <!-- Emoji avatar -->
  <div class="relative flex shrink-0 items-center justify-center ...">
    <span class="leading-none {emojiSizeClasses[size]}">{profile.avatar_emoji}</span>
  </div>
{:else}
  <!-- Initials fallback -->
  <div class="flex shrink-0 items-center justify-center rounded-full {colors[colorIndex]} ...">
    <span class="font-medium text-white {initialsSizeClasses[size]}">{initials}</span>
  </div>
{/if}
```

The syntax: `{#if condition}...{:else if other}...{:else}...{/if}`. The `{#` starts a block, `{:` continues it, `{/` ends it.

### Loops: `*ngFor` / `@for` → `{#each}`

**Angular:**
```html
<!-- Legacy -->
<div *ngFor="let ride of upcomingRides">{{ride.title}}</div>

<!-- Modern -->
@for (ride of upcomingRides; track ride.id) { ... }
```

**Svelte — from `src/routes/+page.svelte:45-73`:**
```svelte
{#each data.upcomingRides as ride}
  <a href="/rides/{ride.id}" class="block rounded-lg ...">
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-lg font-semibold text-gray-100">{ride.title}</h2>
        <p class="mt-1 text-sm text-gray-400">
          {formatDate(ride.ride_date)} at {formatTime(ride.ride_date)}
        </p>
        <p class="mt-1 text-sm text-gray-500">{ride.meeting_spot_name}</p>
        {#if ride.ride_hares.length > 0}
          <p class="mt-1 text-sm text-gray-500">
            Hare{ride.ride_hares.length > 1 ? 's' : ''}:
            {ride.ride_hares.map(hareDisplayName).join(', ')}
          </p>
        {/if}
      </div>
      <div class="text-right text-sm">
        <span class="text-green-400">{rsvpCount(ride.rsvps, 'going')} going</span>
      </div>
    </div>
  </a>
{/each}
```

The syntax: `{#each array as item}...{/each}`. You can also destructure: `{#each array as { id, name }}` and get the index: `{#each array as item, i}`.

For keyed loops (like Angular's `track`), add a key expression in parentheses:

**From `src/lib/components/AvatarChooser.svelte:167`:**
```svelte
{#each emojiGroups as group (group.label)}
  ...
{/each}
```

### Events: `(click)="handler()"` → `onclick={handler}`

**Angular:**
```html
<button (click)="signOut()">Sign Out</button>
<button (click)="tab = 'photo'">Upload photo</button>
```

**Svelte — from `src/routes/+layout.svelte:44`:**
```svelte
<button onclick={signOut} class="text-sm text-gray-400 hover:text-gray-200">
  Sign Out
</button>
```

**Inline handler — from `src/lib/components/AvatarChooser.svelte:122`:**
```svelte
<button type="button" onclick={() => (tab = 'photo')} class="...">
  Upload photo
</button>
```

Events in Svelte use standard DOM event names prefixed with `on`: `onclick`, `onsubmit`, `oninput`, `onkeydown`, etc. No special syntax like Angular's `(event)` — it's just a prop.

### Rendering Children: `<router-outlet>` / `<ng-content>` → `{@render children()}`

**Angular layout component:**
```html
<nav>...</nav>
<router-outlet></router-outlet>
```

**Svelte — from `src/routes/+layout.svelte:7,54-56`:**
```svelte
<script lang="ts">
  let { data, children } = $props();
</script>

<!-- ... nav bar ... -->

<main class="mx-auto max-w-4xl px-4 py-8">
  {@render children()}
</main>
```

The `children` prop is a "snippet" — SvelteKit automatically passes the page content as `children` to layout components. `{@render children()}` renders it, just like `<router-outlet>` renders the routed component.

For content projection (Angular's `<ng-content>`), Svelte also uses snippets. A parent can pass markup to a child component using the `{#snippet}` syntax, and the child renders it with `{@render}`.

### Expressions in Templates: `{{ }}` → `{ }`

**Angular:**
```html
<span>{{ displayName }}</span>
<span>{{ ride.title }}</span>
<img [src]="profile.avatar_url" [alt]="displayName" />
<div [class]="isActive ? 'active' : 'inactive'">
```

**Svelte:**
```svelte
<span>{displayName}</span>
<span>{ride.title}</span>
<img src={profile.avatar_url} alt={displayName} />
<div class={isActive ? 'active' : 'inactive'}>
```

Single curly braces for expressions. Attribute binding doesn't need a special syntax — just use curly braces for the value.

### Raw HTML: `[innerHTML]` → `{@html}`

**Angular:**
```html
<div [innerHTML]="renderedHtml"></div>
```

**Svelte — from `src/routes/rides/[id]/+page.svelte:191`:**
```svelte
{@html renderedDescription}
```

Use sparingly — same XSS concerns as Angular's `innerHTML`.

---

## 4. Routing & Navigation

### File-Based Routing vs Angular's RouterModule

In Angular, you define routes in a configuration array:
```typescript
const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'rides/:id', component: RideDetailComponent },
  { path: 'rides/new', component: NewRideComponent },
  { path: 'profile', component: ProfileComponent },
];
```

In SvelteKit, routes are defined by the **file system**. Each folder in `src/routes/` is a route segment, and `+page.svelte` is the component that renders:

```
src/routes/
  +page.svelte                → /
  login/+page.svelte          → /login
  rides/[id]/+page.svelte     → /rides/:id  (dynamic)
  rides/new/+page.svelte      → /rides/new
  profile/+page.svelte        → /profile
  auth/callback/+server.ts    → /auth/callback  (API only, no UI)
```

No routing module, no configuration object, no `RouterModule.forRoot()`. Just put files in the right place.

### Dynamic Routes: `[id]` = `:id`

**Angular:**
```typescript
{ path: 'rides/:id', component: RideDetailComponent }

// In the component:
this.route.paramMap.subscribe(params => {
  const id = params.get('id');
});
```

**SvelteKit:** Create a folder named `[id]` (brackets in the folder name):

```
src/routes/rides/[id]/+page.svelte
src/routes/rides/[id]/+page.server.ts
```

The parameter is accessed in the load function (not the component):

**From `src/routes/rides/[id]/+page.server.ts:5`:**
```ts
export const load: PageServerLoad = async ({ params, locals }) => {
  const { data: ride } = await locals.supabase
    .from('rides')
    .select('...')
    .eq('id', params.id)  // params.id comes from the [id] folder name
    .single();
  // ...
};
```

### Layouts: `+layout.svelte` Wraps Child Routes

In Angular, you might create a `LayoutComponent` with a `<router-outlet>`:
```html
<app-nav></app-nav>
<router-outlet></router-outlet>
<app-footer></app-footer>
```

In SvelteKit, `+layout.svelte` does exactly this. Every `+page.svelte` is rendered inside its nearest parent `+layout.svelte`.

**From `src/routes/+layout.svelte`:**
```svelte
<script lang="ts">
  let { data, children } = $props();
</script>

<nav class="border-b border-gray-800 bg-gray-900">
  <!-- Navigation bar with sign in/out, avatar, etc. -->
</nav>

<main class="mx-auto max-w-4xl px-4 py-8">
  {@render children()}
</main>
```

The `{@render children()}` call is where the page content appears — like `<router-outlet>`. Every page in the app gets this nav bar and main wrapper.

Layouts can be nested. If you create `src/routes/admin/+layout.svelte`, it wraps all pages under `/admin/...`, and *its* parent layout wraps *it*.

### Navigation: Links and Programmatic

**Angular:**
```html
<a routerLink="/rides/123">View Ride</a>
<a [routerLink]="['/rides', ride.id]">View Ride</a>
```
```typescript
this.router.navigate(['/rides', rideId]);
```

**Svelte — just use regular `<a>` tags:**
```svelte
<a href="/rides/{ride.id}">View Ride</a>
<a href="/">Back to rides</a>
```

SvelteKit intercepts `<a>` clicks automatically — no special directive needed. The page navigates client-side without a full reload, just like Angular's `routerLink`.

**Programmatic navigation — from `src/routes/login/+page.svelte:2,50`:**
```svelte
<script lang="ts">
  import { goto } from '$app/navigation';

  // After successful OTP verification:
  goto('/', { invalidateAll: true });
</script>
```

`goto()` is SvelteKit's equivalent of Angular's `Router.navigate()`. The `invalidateAll: true` option forces all load functions to re-run (explained in [Section 5](#5-data-loading)).

---

## 5. Data Loading

This is one of the most important architectural differences. In Angular, you typically:
1. Create a service that wraps `HttpClient`
2. Inject the service into your component
3. Call the service in `ngOnInit` or a resolver
4. Subscribe to the Observable and store the result

In SvelteKit, data loading happens in **load functions** that run on the server before the page renders.

### Page Load Functions: `+page.server.ts`

**From `src/routes/+page.server.ts` (the homepage):**
```ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const now = new Date().toISOString();

  // Fetch upcoming rides
  const { data: upcomingRides } = await locals.supabase
    .from('rides')
    .select('*, ride_hares(*, profiles:user_id(christian_name, bash_name)), rsvps(status)')
    .gte('ride_date', now)
    .order('ride_date', { ascending: true });

  // Fetch past rides (last 10)
  const { data: pastRides } = await locals.supabase
    .from('rides')
    .select('*, ride_hares(*, profiles:user_id(christian_name, bash_name)), rsvps(status)')
    .lt('ride_date', now)
    .order('ride_date', { ascending: false })
    .limit(10);

  return {
    upcomingRides: upcomingRides ?? [],
    pastRides: pastRides ?? [],
    pendingUsers  // ... also fetched above
  };
};
```

Key points:
- The `load` function runs **on the server** for every request (not in the browser)
- It has access to `locals` (set by hooks — covered in [Section 7](#7-authentication-with-supabase))
- Whatever it returns becomes the `data` prop in the page component
- No services, no dependency injection, no subscriptions

### Layout Load Functions: `+layout.server.ts`

**From `src/routes/+layout.server.ts`:**
```ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  let unreadMentionCount = 0;

  if (locals.user) {
    const { count } = await locals.supabase
      .from('mentions')
      .select('*', { count: 'exact', head: true })
      .eq('mentioned_user_id', locals.user.id)
      .eq('is_read', false);

    unreadMentionCount = count ?? 0;
  }

  return {
    session: locals.session,
    user: locals.user,
    profile: locals.profile,
    unreadMentionCount
  };
};
```

Layout load data is available to **all child pages**. This is like having a root resolver in Angular that provides session data to every route.

### Consuming Load Data in Components

**From `src/routes/+page.svelte:4`:**
```svelte
<script lang="ts">
  let { data } = $props();
</script>

<!-- Now you can use data.upcomingRides, data.pastRides, etc. -->
{#each data.upcomingRides as ride}
  ...
{/each}
```

The `data` prop automatically includes everything returned by the page's load function AND the layout's load function. So a page component has access to both `data.upcomingRides` (from its own load) and `data.session` (from the layout's load).

In Angular terms: imagine every resolver and every parent resolver's data merged into one object and passed as a single `@Input()` to your component.

### `invalidateAll()`: Force Re-Fetch

After a mutation (like approving a user or logging in), you may want to re-run all load functions to get fresh data:

**From `src/routes/login/+page.svelte:50`:**
```svelte
goto('/', { invalidateAll: true });
```

This navigates to `/` and re-runs all load functions. In Angular terms, it's like navigating to a route and ensuring all resolvers re-execute.

---

## 6. Form Actions & Mutations

In Angular, mutations typically look like:
1. User clicks a button
2. Component calls a service method
3. Service sends an HTTP request
4. Component handles the response (success/error)

SvelteKit replaces this with **form actions** — server-side functions that handle form submissions.

### Defining Actions: `+page.server.ts`

**From `src/routes/rides/[id]/+page.server.ts:82-101` (RSVP action):**
```ts
export const actions: Actions = {
  rsvp: async ({ request, params, locals }) => {
    if (!locals.user) return fail(401, { message: 'Not logged in' });

    const formData = await request.formData();
    const status = formData.get('status') as string;

    if (!['going', 'maybe', 'not_going'].includes(status)) {
      return fail(400, { message: 'Invalid status' });
    }

    const { error: rsvpError } = await locals.supabase
      .from('rsvps')
      .upsert(
        { ride_id: params.id, user_id: locals.user.id, status },
        { onConflict: 'ride_id,user_id' }
      );

    if (rsvpError) return fail(500, { message: 'Failed to update RSVP' });
    return { success: true };
  },

  comment: async ({ request, params, locals }) => {
    // ... another named action
  },

  deleteRide: async ({ params, locals }) => {
    // ... another named action
  }
};
```

Each named function in `actions` handles a specific form submission. `fail()` returns error data to the form. Regular returns indicate success.

### Submitting Forms to Actions

**From `src/routes/rides/[id]/+page.svelte:201-223` (RSVP buttons):**
```svelte
{#each rsvpButtons as btn}
  <form method="POST" action="?/rsvp" use:enhance={() => {
    statusOverride = btn.status;
    return async ({ update }) => {
      statusOverride = null;
      update();
    };
  }}>
    <input type="hidden" name="status" value={btn.status} />
    <button type="submit" class="...">
      {btn.label}
    </button>
  </form>
{/each}
```

Key parts:
- `method="POST"` — must be POST for form actions
- `action="?/rsvp"` — targets the `rsvp` named action. `?/comment` would target `comment`, etc.
- `use:enhance` — makes the form submit via AJAX (no full page reload), like Angular's `HttpClient`
- Hidden inputs pass data to the server

Without `action="?/name"`, the form hits the `default` action:

**From `src/routes/rides/new/+page.svelte:22-35`:**
```svelte
<form method="POST" use:enhance={() => {
  submitting = true;
  return async ({ result, update }) => {
    if (result.type === 'redirect') {
      goto(result.location, { replaceState: true });
    } else {
      submitting = false;
      update();
    }
  };
}} class="space-y-5">
```

This hits the `default` action in `src/routes/rides/new/+page.server.ts`:

```ts
export const actions: Actions = {
  default: async ({ request, locals }) => {
    // ... create the ride
    redirect(303, `/rides/${ride.id}`);
  }
};
```

### The `form` Prop: Reading Action Responses

When an action returns data (or `fail()` data), it's available in the component as the `form` prop:

**From `src/routes/rides/new/+page.svelte:7,221-223`:**
```svelte
<script lang="ts">
  let { data, form } = $props();
</script>

{#if form?.message}
  <p class="text-sm text-red-400">{form.message}</p>
{/if}
```

If the server action calls `fail(400, { message: 'Title is required' })`, then `form.message` will be `'Title is required'`. This replaces Angular's pattern of subscribing to an Observable and storing error state.

### `use:enhance`: Progressive Enhancement

`use:enhance` is imported from `$app/forms` and turns a standard HTML form into an AJAX-powered form:

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
</script>

<form method="POST" use:enhance>
  <!-- Works without JavaScript (submits normally) -->
  <!-- With JavaScript, submits via AJAX and updates the page -->
</form>
```

You can customize the behavior by passing a callback:

**From `src/routes/rides/[id]/+page.svelte:521-528` (comment form):**
```svelte
<form method="POST" action="?/comment" use:enhance={() => {
  submittingComment = true;
  return async ({ update }) => {
    commentBody = '';
    submittingComment = false;
    update();
  };
}}>
```

The callback:
1. Runs **before** the request (set `submittingComment = true` for a loading state)
2. Returns a function that runs **after** the response (`update()` re-runs the load function to refresh data)

This is the optimistic UI pattern — show the loading state immediately, reset it when the server responds.

### Comparison: Angular vs SvelteKit Mutation Flow

**Angular:**
```
Component → Service.method() → HttpClient.post() → Observable → subscribe → update UI
```

**SvelteKit:**
```
<form action="?/name"> → action function → return data → form prop / update()
```

No services, no HttpClient, no Observables, no subscriptions. The form submits, the server processes it, and the page data refreshes.

---

## 7. Authentication with Supabase

### `hooks.server.ts`: The Middleware

In Angular, you'd use:
- An **HTTP interceptor** to attach auth tokens to requests
- A **route guard** (`CanActivate`) to protect routes
- A **service** to manage session state

SvelteKit combines all of these into `src/hooks.server.ts`:

**From `src/hooks.server.ts`:**
```ts
import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // 1. CREATE THE SUPABASE CLIENT (like an interceptor setting up auth headers)
  event.locals.supabase = createServerClient<Database>(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => event.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            event.cookies.set(name, value, { ...options, path: '/' });
          });
        }
      }
    }
  );

  // 2. GET THE SESSION (like an auth service checking if logged in)
  event.locals.safeGetSession = async () => { /* ... */ };

  const { session, user } = await event.locals.safeGetSession();
  event.locals.session = session;
  event.locals.user = user;

  // 3. FETCH THE PROFILE
  if (user) {
    const { data: profile } = await event.locals.supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    event.locals.profile = profile;
  }

  // 4. ROUTE PROTECTION (like CanActivate guards)
  const path = event.url.pathname;
  const publicPaths = ['/login', '/auth/callback'];
  const isPublicPath = publicPaths.some((p) => path.startsWith(p));

  // Not logged in → redirect to login
  if (!user && !isPublicPath) {
    redirect(303, '/login');
  }

  // Logged in but no name → redirect to profile setup
  if (user && event.locals.profile && !event.locals.profile.christian_name
      && path !== '/profile/setup') {
    redirect(303, '/profile/setup');
  }

  // Logged in but pending → redirect to pending page
  if (user && event.locals.profile && event.locals.profile.christian_name
      && event.locals.profile.role === 'pending'
      && path !== '/pending' && path !== '/profile/setup' && !isPublicPath) {
    redirect(303, '/pending');
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });
};
```

This function runs for **every request**, before any load function or action. It:
1. Creates a Supabase client with cookie-based auth (no token in localStorage)
2. Gets the current session and user
3. Fetches the user's profile from the database
4. Checks route protection rules and redirects if needed
5. Stores everything on `event.locals` so load functions and actions can access it

### The Data Flow

```
Request comes in
  → hooks.server.ts (set up auth, fetch profile, check permissions)
  → event.locals.session, event.locals.user, event.locals.profile are set
  → +layout.server.ts load() reads locals, returns session/profile to all pages
  → +page.server.ts load() reads locals, fetches page-specific data
  → +page.svelte receives all data via $props()
```

In Angular terms:
```
Request → Interceptor (hooks) → Guard (hooks) → Resolver (load) → Component (page)
```

### `event.locals`: Passing Data Through the Request

`event.locals` is a per-request object (think of it like Angular's dependency injection scope, but for a single HTTP request). The hooks file sets properties on it, and every load function and action can read them:

```ts
// In hooks.server.ts:
event.locals.user = user;
event.locals.profile = profile;

// In any +page.server.ts:
export const load = async ({ locals }) => {
  if (!locals.user) redirect(303, '/login');
  const userId = locals.user.id;
  // Use locals.supabase to query the database...
};
```

### The Auth Callback: Server Endpoint

**From `src/routes/auth/callback/+server.ts`:**
```ts
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
  const code = url.searchParams.get('code');

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  redirect(303, '/');
};
```

This is a `+server.ts` file — it defines a raw HTTP endpoint with no UI. When the user clicks the magic link in their email, they're redirected to `/auth/callback?code=...`. This endpoint exchanges the code for a session cookie and redirects to the homepage.

In Angular, this would be a route with a component that calls a service in `ngOnInit`.

### Client-Side Auth: The Login Page

**From `src/routes/login/+page.svelte:13-31`:**
```svelte
<script lang="ts">
  import { supabase } from '$lib/supabaseClient';

  async function handleSubmit(e: Event) {
    e.preventDefault();
    loading = true;
    error = '';

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    loading = false;
    if (authError) {
      error = authError.message;
    } else {
      sent = true;
    }
  }
</script>
```

The login page uses the **browser-side** Supabase client directly (not through a form action) because the auth flow happens client-side (sending the magic link/OTP).

**Browser-side Supabase client — from `src/lib/supabaseClient.ts`:**
```ts
import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import type { Database } from './database.types';

export const supabase = createBrowserClient<Database>(
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_PUBLISHABLE_KEY
);
```

This is a simple module export — no service, no `@Injectable()`, no dependency injection. Any component that needs the browser Supabase client just imports it.

---

## 8. Database Queries with Supabase

Supabase provides a typed query builder on top of PostgreSQL. It's not an ORM (like TypeORM or Prisma) and it's not raw SQL — it's a chainable API that maps to PostgREST queries.

### Basic CRUD Operations

**SELECT (read) — from `src/routes/+page.server.ts:8-12`:**
```ts
const { data: upcomingRides } = await locals.supabase
  .from('rides')
  .select('*, ride_hares(*, profiles:user_id(christian_name, bash_name)), rsvps(status)')
  .gte('ride_date', now)
  .order('ride_date', { ascending: true });
```

**INSERT (create) — from `src/routes/rides/new/+page.server.ts:43-56`:**
```ts
const { data: ride, error } = await locals.supabase
  .from('rides')
  .insert({
    title,
    description,
    ride_date: rideDatetime,
    meeting_spot_name: meetingSpotName,
    meeting_spot_lat: meetingSpotLat ? parseFloat(meetingSpotLat) : null,
    meeting_spot_lng: meetingSpotLng ? parseFloat(meetingSpotLng) : null,
    image_url: imageUrl,
    created_by: locals.user.id
  })
  .select('id')
  .single();
```

The `.select('id').single()` after `.insert()` makes it return the newly created row's id (just that column, as a single object instead of an array).

**UPDATE — from `src/routes/profile/+page.server.ts:39-49`:**
```ts
const { error } = await locals.supabase
  .from('profiles')
  .update({
    christian_name: christianName,
    bash_name: bashName,
    avatar_url: avatarUrl,
    avatar_emoji: avatarEmoji,
    subscribed_to_emails: subscribedToEmails,
    notify_on_mention: notifyOnMention
  })
  .eq('id', locals.user.id);
```

**UPSERT (insert or update) — from `src/routes/rides/[id]/+page.server.ts:93-98`:**
```ts
const { error: rsvpError } = await locals.supabase
  .from('rsvps')
  .upsert(
    { ride_id: params.id, user_id: locals.user.id, status },
    { onConflict: 'ride_id,user_id' }
  );
```

Upsert inserts a row, but if a row with the same `ride_id` and `user_id` already exists (unique constraint), it updates that row instead. Perfect for RSVPs where a user can change their status.

**DELETE — from `src/routes/rides/[id]/+page.server.ts:315`:**
```ts
const { error: deleteError } = await locals.supabase
  .from('rides')
  .delete()
  .eq('id', params.id);
```

**Soft DELETE (update a flag) — from `src/routes/rides/[id]/+page.server.ts:223-229`:**
```ts
const { error: deleteError } = await locals.supabase
  .from('comments')
  .update({
    is_deleted: true,
    deleted_at: new Date().toISOString(),
    deleted_by: locals.user.id
  })
  .eq('id', commentId);
```

### Filtering

```ts
.eq('id', params.id)              // WHERE id = params.id
.neq('role', 'pending')           // WHERE role != 'pending'
.gte('ride_date', now)            // WHERE ride_date >= now
.lt('ride_date', now)             // WHERE ride_date < now
.in('status', ['going', 'maybe']) // WHERE status IN ('going', 'maybe')
.or(`bash_name.ilike.${name},christian_name.ilike.${name}`)  // WHERE bash_name ILIKE name OR christian_name ILIKE name
```

### Relations / Joins: Nested Select Syntax

This is one of Supabase's most powerful features. Instead of writing SQL JOINs, you use nested select syntax:

**From `src/routes/rides/[id]/+page.server.ts:7-15`:**
```ts
const { data: ride } = await locals.supabase
  .from('rides')
  .select(`
    *,
    creator:profiles!created_by(christian_name, bash_name, avatar_url, avatar_emoji),
    editor:profiles!updated_by(christian_name, bash_name),
    ride_hares(*, hare_profile:profiles!user_id(christian_name, bash_name, avatar_url, avatar_emoji)),
    rsvps(id, user_id, status, rsvp_profile:profiles!user_id(christian_name, bash_name, avatar_url, avatar_emoji))
  `)
  .eq('id', params.id)
  .single();
```

Breaking this down:
- `*` — select all columns from `rides`
- `creator:profiles!created_by(...)` — join `profiles` table via the `created_by` foreign key, alias the result as `creator`
- `ride_hares(...)` — join `ride_hares` table (automatically uses the foreign key to `rides`)
- `hare_profile:profiles!user_id(...)` — within each ride_hare, join `profiles` via `user_id`, alias as `hare_profile`

The pattern is: `alias:table!foreign_key(columns)`. If there's only one foreign key between the tables, you can omit `!foreign_key`.

### Count Queries

**From `src/routes/+layout.server.ts:7-11`:**
```ts
const { count } = await locals.supabase
  .from('mentions')
  .select('*', { count: 'exact', head: true })
  .eq('mentioned_user_id', locals.user.id)
  .eq('is_read', false);
```

`{ count: 'exact', head: true }` returns just the count without fetching any rows. Like SQL's `SELECT COUNT(*) FROM mentions WHERE ...`.

---

## 9. Supabase Storage (File Uploads)

SavBash uploads images to Supabase Storage buckets. The pattern is:
1. User selects a file
2. Client-side: resize and convert to WebP
3. Upload to Supabase Storage
4. Get the public URL
5. Pass the URL to a form action via a hidden input

### Client-Side Image Resize

**From `src/lib/components/AvatarChooser.svelte:72-78`:**
```ts
// Resize to 64x64 WebP using Canvas
const bitmap = await createImageBitmap(file);
const canvas = new OffscreenCanvas(64, 64);
const ctx = canvas.getContext('2d')!;
ctx.drawImage(bitmap, 0, 0, 64, 64);
const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
```

`OffscreenCanvas` resizes the image in the browser before uploading. This keeps avatars small (64x64) and in a consistent format (WebP).

**From `src/lib/components/ImageUpload.svelte:26-33`** (for larger images like ride banners):
```ts
const bitmap = await createImageBitmap(file);
const scale = Math.min(1, maxWidth / bitmap.width);
const w = Math.round(bitmap.width * scale);
const h = Math.round(bitmap.height * scale);
const canvas = new OffscreenCanvas(w, h);
const ctx = canvas.getContext('2d')!;
ctx.drawImage(bitmap, 0, 0, w, h);
const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.85 });
```

This scales proportionally with a maximum width, rather than forcing a fixed size.

### Upload to Supabase Storage

**From `src/lib/components/AvatarChooser.svelte:85-97`:**
```ts
const path = `${userId}/avatar.webp`;
const { error: uploadError } = await supabase.storage
  .from('avatars')                    // bucket name
  .upload(path, blob, {
    upsert: true,                     // overwrite if exists
    contentType: 'image/webp'
  });

if (uploadError) throw uploadError;

const { data: { publicUrl } } = supabase.storage
  .from('avatars')
  .getPublicUrl(path);

// Add cache-buster to force browser to reload the new image
avatarUrl = `${publicUrl}?t=${Date.now()}`;
avatarEmoji = null;
```

The cache-buster `?t=...` trick forces the browser to fetch the new image even though the URL path is the same.

### Passing URLs to Form Actions

**From `src/lib/components/AvatarChooser.svelte:196-197`:**
```svelte
<!-- Hidden inputs for form submission -->
<input type="hidden" name="avatar_url" value={avatarUrl ?? ''} />
<input type="hidden" name="avatar_emoji" value={avatarEmoji ?? ''} />
```

The upload happens client-side, but the URL is saved to the database via a form action. Hidden inputs bridge the two — the form action reads the URL from `formData.get('avatar_url')`.

### The ImageUpload Component: Drag & Drop

**From `src/lib/components/ImageUpload.svelte:93-114`:**
```svelte
<label
  class="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed ..."
  ondragover={(e) => { e.preventDefault(); dragOver = true; }}
  ondragleave={() => { dragOver = false; }}
  ondrop={onDrop}
>
  <input type="file" accept="image/*" onchange={onFileInput} class="hidden" />
  <span class="text-gray-400">
    {#if uploading}
      Uploading...
    {:else}
      {label}
    {/if}
  </span>
</label>

<input type="hidden" name="image_url" value={value ?? ''} />
```

This component handles both click-to-upload (via the hidden file input inside a `<label>`) and drag-and-drop (via `ondragover`/`ondrop` events). After upload, it stores the URL in a hidden input for form submission.

---

## 10. Styling with Tailwind CSS

### Tailwind v4 Setup

Tailwind CSS v4 uses a pure CSS configuration (no `tailwind.config.js` file). The setup is in two places:

**`vite.config.ts`:**
```ts
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [tailwindcss(), sveltekit()] });
```

**`src/routes/layout.css`:**
```css
@import 'tailwindcss';
@plugin '@tailwindcss/forms';
@plugin '@tailwindcss/typography';

html {
  color-scheme: dark;
  scroll-behavior: smooth;
}

body {
  @apply bg-gray-950 text-gray-100;
}
```

- `@import 'tailwindcss'` — loads all of Tailwind's utility classes
- `@plugin` — loads plugins (replaces the `plugins` array in the old config)
- `@apply` — uses Tailwind utilities inside regular CSS rules

This CSS file is imported in the root layout:

**From `src/routes/+layout.svelte:2`:**
```svelte
<script lang="ts">
  import './layout.css';
</script>
```

### Dark Theme Conventions

SavBash uses a dark theme throughout. Here's the color palette:

| Use | Tailwind class | What it looks like |
|---|---|---|
| Page background | `bg-gray-950` | Nearly black |
| Card/surface background | `bg-gray-900` | Dark gray |
| Interactive surface | `bg-gray-800` | Slightly lighter |
| Borders | `border-gray-800` or `border-gray-700` | Subtle separation |
| Primary text | `text-gray-100` | Near-white |
| Secondary text | `text-gray-400` | Medium gray |
| Muted text | `text-gray-500` | Darker gray |
| De-emphasized text | `text-gray-600` | Very subtle |
| Primary action | `bg-blue-600` + `text-white` | Blue button |
| Success | `text-green-400`, `bg-green-900/50` | Green text/bg |
| Warning | `text-yellow-300`, `border-yellow-800` | Yellow |
| Error | `text-red-400` | Red text |

### Utility-First Approach

In Angular, you might have component-specific SCSS files:
```scss
.ride-card {
  display: flex;
  border-radius: 0.5rem;
  border: 1px solid #333;
  padding: 1rem;
  &:hover { border-color: #555; }
}
```

In Tailwind, you put all styles directly on the element:

**From `src/routes/+page.svelte:48-49`:**
```svelte
<a
  href="/rides/{ride.id}"
  class="block rounded-lg border border-gray-800 bg-gray-900 p-4 transition hover:border-gray-700"
>
```

Each class is a single CSS property: `block` = `display: block`, `rounded-lg` = `border-radius: 0.5rem`, `p-4` = `padding: 1rem`, `hover:border-gray-700` = changes border color on hover.

### Responsive Utilities

**From `src/routes/+layout.svelte:43`:**
```svelte
<span class="hidden text-sm text-gray-400 sm:inline">{displayName}</span>
```

- `hidden` — hide by default
- `sm:inline` — show as inline on screens >= 640px

This shows the username next to the avatar on wider screens but hides it on mobile. The pattern is `{breakpoint}:{utility}`.

### Dynamic Classes

Svelte lets you use JavaScript expressions in class attributes:

**From `src/lib/components/AvatarChooser.svelte:123-125`:**
```svelte
<button
  class="rounded px-3 py-1.5 text-sm {tab === 'photo'
    ? 'bg-blue-600 text-white'
    : 'bg-gray-800 text-gray-400'}"
>
```

The curly braces `{}` contain a JavaScript expression that conditionally applies different classes.

---

## 11. TypeScript Integration

### `app.d.ts`: Global Type Declarations

**From `src/app.d.ts`:**
```ts
import type { Session, User } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

declare global {
  namespace App {
    interface Locals {
      supabase: ReturnType<typeof import('@supabase/ssr').createServerClient<Database>>;
      safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
      session: Session | null;
      user: User | null;
      profile: Profile | null;
    }
  }
}
```

This file declares the shape of `event.locals` (the per-request object set by hooks). In Angular terms, it's like defining the interface for an injectable token.

The `App.Locals` interface tells TypeScript what properties exist on `locals`, so when you write `locals.user` in a load function, TypeScript knows it's `User | null`.

### Auto-Generated Database Types

`src/lib/database.types.ts` is auto-generated by running:
```bash
supabase gen types typescript
```

This reads your Supabase database schema and generates TypeScript types for every table, view, and function. The Supabase client is typed with `<Database>`, so queries return properly typed results:

```ts
// createServerClient<Database>(...) means:
const { data } = await locals.supabase
  .from('profiles')    // TypeScript knows 'profiles' is a valid table
  .select('id, christian_name, bash_name')  // TypeScript knows these columns exist
  .eq('role', 'pending');  // TypeScript knows 'role' is a valid column
// data is typed as { id: string; christian_name: string; bash_name: string | null }[]
```

### `$types` Imports for Load/Action Typing

Each `+page.server.ts` and `+layout.server.ts` can import auto-generated types from `'./$types'`:

```ts
import type { PageServerLoad } from './$types';
import type { Actions } from './$types';
import type { LayoutServerLoad } from './$types';
```

These types are generated by SvelteKit based on your route structure. `PageServerLoad` gives you the correct types for `params`, `locals`, etc. based on the route's dynamic segments.

### Environment Variables

SvelteKit provides typed access to environment variables:

```ts
// Client-safe (PUBLIC_ prefix required):
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

// Server-only (no prefix, only available in server files):
import { env } from '$env/dynamic/private';
const apiKey = env.RESEND_API_KEY;
```

In Angular, you'd use `environment.ts` files. SvelteKit uses the `$env` module, which enforces that server-only secrets can't leak to the browser.

---

## 12. Key Differences Summary Table

| Concept | Angular | SvelteKit |
|---|---|---|
| **Component definition** | `@Component` decorator + module registration | Single `.svelte` file, just import and use |
| **Props / inputs** | `@Input() name: Type` | `let { name } = $props()` |
| **State** | Class property or `signal()` | `$state()` |
| **Computed values** | Getter or `computed()` | `$derived()` / `$derived.by()` |
| **Side effects** | `ngOnInit`, `ngOnChanges` | `$effect()`, `onMount()` |
| **Two-way binding** | `[(ngModel)]="value"` | `bind:value` + `$bindable()` |
| **Conditionals** | `*ngIf` / `@if` | `{#if}...{:else}...{/if}` |
| **Loops** | `*ngFor` / `@for` | `{#each array as item}...{/each}` |
| **Events** | `(click)="handler()"` | `onclick={handler}` |
| **Content projection** | `<ng-content>` | `{@render children()}` / snippets |
| **Raw HTML** | `[innerHTML]` | `{@html expr}` |
| **Routing** | `RouterModule` + config array | File-based (`src/routes/` folders) |
| **Route params** | `ActivatedRoute.paramMap` | `params` in load function |
| **Navigation** | `routerLink` / `Router.navigate()` | `<a href>` / `goto()` |
| **Layout** | Layout component + `<router-outlet>` | `+layout.svelte` + `{@render children()}` |
| **Data fetching** | Service + HttpClient + resolver | `load()` in `+page.server.ts` |
| **Mutations** | Service + HttpClient | Form actions in `+page.server.ts` |
| **HTTP interceptor** | `@Injectable() HttpInterceptor` | `hooks.server.ts` |
| **Route guard** | `CanActivate` guard | Redirect logic in `hooks.server.ts` or `load()` |
| **Shared services** | `@Injectable({ providedIn: 'root' })` | Regular TypeScript module exports |
| **Dependency injection** | Constructor injection | Import statements |
| **Scoped styles** | Component `.scss` file with `ViewEncapsulation` | `<style>` block in `.svelte` file (auto-scoped) |
| **Global styles** | `styles.scss` | `layout.css` imported in root layout |
| **Build tool** | Angular CLI (Webpack/esbuild) | Vite |
| **Deployment config** | `angular.json` build targets | Adapter in `svelte.config.js` |
| **Type generation** | Manual interfaces | `supabase gen types typescript` |
| **Template expressions** | `{{ expression }}` | `{ expression }` |
| **Attribute binding** | `[attr]="value"` | `attr={value}` |

---

## 13. Common Tasks Quick Reference

### "How do I add a new page?"

1. Create a new folder in `src/routes/` matching the URL path you want.
2. Create `+page.svelte` for the UI.
3. Optionally create `+page.server.ts` if the page needs data loading or form handling.

**Example: adding `/about`:**
```
src/routes/about/
  +page.svelte    ← The page UI
```

```svelte
<!-- src/routes/about/+page.svelte -->
<h1 class="text-2xl font-bold text-gray-100">About SavBash</h1>
<p class="mt-4 text-gray-400">A cycling group event website.</p>
```

That's it. Navigate to `/about` and it works.

### "How do I add a new component?"

1. Create a `.svelte` file in `src/lib/components/`.
2. Import it where you need it.

**Example:**
```svelte
<!-- src/lib/components/Badge.svelte -->
<script lang="ts">
  let { text, color = 'blue' }: { text: string; color?: string } = $props();
</script>

<span class="rounded-full px-2 py-0.5 text-xs bg-{color}-900 text-{color}-300">
  {text}
</span>
```

```svelte
<!-- In any page or component -->
<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
</script>

<Badge text="New" color="green" />
```

### "How do I fetch data for a page?"

Create or edit `+page.server.ts` and export a `load` function:

```ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: items } = await locals.supabase
    .from('your_table')
    .select('*')
    .order('created_at', { ascending: false });

  return { items: items ?? [] };
};
```

Then access it in the page:
```svelte
<script lang="ts">
  let { data } = $props();
</script>

{#each data.items as item}
  <p>{item.name}</p>
{/each}
```

### "How do I handle a form submission?"

Add an `actions` export to `+page.server.ts`:

```ts
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const formData = await request.formData();
    const name = formData.get('name') as string;

    if (!name) return fail(400, { message: 'Name is required' });

    const { error } = await locals.supabase
      .from('your_table')
      .insert({ name, created_by: locals.user!.id });

    if (error) return fail(500, { message: 'Something went wrong' });
    return { success: true };
  }
};
```

In the page:
```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  let { form } = $props();
</script>

<form method="POST" use:enhance>
  <input name="name" required />
  {#if form?.message}
    <p class="text-red-400">{form.message}</p>
  {/if}
  <button type="submit">Submit</button>
</form>
```

### "How do I protect a route?"

**Option 1: In hooks (for broad protection)**

Add a condition to `src/hooks.server.ts`:
```ts
// Only admins can access /admin routes
if (path.startsWith('/admin') && event.locals.profile?.role !== 'admin') {
  redirect(303, '/');
}
```

**Option 2: In the load function (for specific pages)**

```ts
export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(303, '/login');
  if (locals.profile?.role !== 'admin') redirect(303, '/');
  // ... load data
};
```

### "How do I add a new database table?"

1. Create the table in Supabase Dashboard (or write a migration).
2. Set up Row Level Security (RLS) policies.
3. Regenerate types:
   ```bash
   supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
   ```
4. Now you can query the new table with full TypeScript support:
   ```ts
   const { data } = await locals.supabase
     .from('new_table')
     .select('*');
   ```

### "How do I add a server-only API endpoint?"

Create a `+server.ts` file (no `+page.svelte`):

```ts
// src/routes/api/something/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  const { data } = await locals.supabase.from('table').select('*');
  return json(data);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await request.json();
  // ... process
  return json({ success: true });
};
```

This creates endpoints at `GET /api/something` and `POST /api/something`.

### "How do I share data between components without a service?"

Export from a regular TypeScript module:

```ts
// src/lib/stores/counter.ts
import { writable } from 'svelte/store';
export const count = writable(0);
```

Or for simpler cases, just pass data as props from parent to child, or use load functions to provide data from the server.

### "Where do I put server-only code?"

Any `.server.ts` file is server-only. SvelteKit will never include it in the browser bundle:
- `+page.server.ts` — page load functions and form actions
- `+layout.server.ts` — layout load functions
- `+server.ts` — API endpoints
- `hooks.server.ts` — middleware
- `src/lib/email.ts` — while not named `.server.ts`, this file only works server-side because it imports `$env/dynamic/private`

If you try to import a server-only module from a client-side file, SvelteKit will throw a build error. This prevents accidental secret leaks.

---

## Closing Notes

The biggest adjustments coming from Angular:

1. **Less ceremony** — No modules, no decorators, no DI. Just files, imports, and conventions.
2. **File-based routing** — The folder structure *is* the routing config.
3. **Server-first data loading** — Load functions replace services + resolvers.
4. **Form actions replace HTTP calls** — HTML forms with `use:enhance` handle mutations.
5. **Reactive primitives** — `$state()`, `$derived()`, and `$effect()` replace signals, computed, and lifecycle hooks.

When in doubt, look at the existing code. SavBash uses consistent patterns throughout — once you understand one page (load function → page component → form action), you understand them all.
