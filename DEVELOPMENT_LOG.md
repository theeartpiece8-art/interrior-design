# DEVELOPMENT LOG — MAC SPACE STUDIO

Backend integration of the static multi-page site with Supabase.
Newest entries at the top.

---

## 2026-07-04 (late night) — Email notifications for contact messages (ready to activate)

### Objective
Send an email to the studio inbox the moment a contact message is stored.

### Design
Postgres AFTER INSERT trigger on `messages` using pg_net → Resend API.
Chosen over Edge Function + webhook (fewer moving parts) and over EmailJS
(client-side = exposed key). Properties:
- exactly one email per stored message (AFTER INSERT = no duplicates)
- async + exception-swallowed: email failure can never block a visitor
- Resend API key encrypted in Supabase Vault, never in website code
- every attempt logged to `email_notifications_log` (join with
  `net._http_response` for status codes; Resend dashboard has final say)
- reply_to = visitor's email, so replying answers them directly

### Files
- `supabase-email-notifications.sql` — NEW: complete setup (vault secret,
  log table, trigger function with branded HTML template, trigger,
  delivery-check query). Website files untouched.

### Activation steps (user)
1. Sign up free at resend.com (with nsbgjohnpaul@gmail.com), create an
   API key.
2. Paste the key into the marked placeholder in the SQL file.
3. Run the whole file in Supabase SQL Editor.
4. Submit the live contact form once; email should arrive within seconds.

### Notes
- Resend free tier without domain verification sends FROM
  onboarding@resend.dev TO the signup email only. Verifying the
  macspace.studio domain in Resend later allows from/to any address.
- Verified today: visitor-path insert into `messages` still returns 201.
- Secret key from earlier chat is still active — rotation still pending.

---

## 2026-07-04 (night) — Responsive optimization pass, all pages clean 320px→2560px

### Objective
Make the site fully responsive (phones → ultra-wide) without changing the
design. Audited with headless Chrome at 13 widths × 7 pages, fixed the
findings, re-verified to zero issues.

### Root causes found by the audit
1. Header CTA rules targeted `.lets-talk-open` — a class the markup never
   uses — so the "Let's Talk" button never shrank/hid (overflow on every
   page below ~500px). Retargeted to `.header-actions .btn`.
2. `#about .container` padding of gutter×6 left a 56px-wide text column at
   320px. Now steps down at 1100px and 700px.
3. Footer email address (unbreakable token) wider than its grid track on
   small phones → `overflow-wrap:anywhere` + footer stacks at ≤480px.
4. Stats grid min-content overflow at 320px → stacks at ≤380px.
5. index "Recent interiors" gallery sits outside `.container`, so its
   container-compensating negative margins bled 40px past the viewport on
   both sides → `section > .hscroll{ margin-inline: 0 }`.
6. Nav overlay had no overflow-y: on landscape phones links were clipped
   and unreachable → `overflow-y:auto`.
7. Header at 768–840px (iPad portrait): "Dark mode" / "Let's Talk" wrapped
   to two lines → compact-header rules extended from 720px to 840px.

### Also added (usability/perf, no visual change at desktop)
- `height:100dvh` fallback for the cart drawer (iOS address-bar).
- 16px form controls ≤720px (prevents iOS Safari zoom-on-focus).
- 32px cart qty buttons on touch devices (tap-target size).
- `min-width:0` on newsletter/checkout inputs (flex/grid shrink).
- Fluid logo size on small screens (clamp).
- `loading="lazy" decoding="async"` on 54 below-fold images; hero strip
  and page-hero backgrounds intentionally stay eager (LCP).
- Ultra-wide (≥2048px): content column capped at 1920px and centered;
  header bar, ticker and section backgrounds stay full-bleed.

### Files modified
- `styles.css` — 3 surgical in-place fixes + one appended, commented
  "RESPONSIVE ADAPTATIONS" section
- all 7 `.html` files — lazy-loading attributes on below-fold images only

### Testing performed
- Headless-Chrome audit: 7 pages × 13 widths (320/375/390/414/480/576/
  768/820/1024/1280/1440/1920/2560) → zero horizontal overflow, zero
  squeezed containers. Nav-overlay scrollable on 667×375 landscape.
- Screenshots eyeballed at 320/375/390/768/820/1440/2560 — identical
  design language at every size; 1440 desktop pixel-faithful to original.

### Known issues
- None open from this pass.

---

## 2026-07-04 (evening) — LIVE: connected to production Supabase, all E2E tests pass

### Objective
Connect the site to the real Supabase project and verify every flow
against the live database.

### Completed
- `backend-config.js` filled in with the production project URL
  (https://qqlxjevnnqnqrtaydera.supabase.co) and the publishable key.
  (Publishable key only — the secret key is not stored anywhere in the
  project and should be rotated in the dashboard since it was shared
  in chat.)
- Database confirmed live: `messages`, `newsletter`, `orders` all exist
  with insert-only RLS.
- **Bug found & fixed**: newsletter used upsert (`ON CONFLICT DO NOTHING`),
  which Postgres RLS rejects without a public SELECT policy. Fix: plain
  insert; duplicate error code 23505 is treated as a successful
  re-subscription. Security model unchanged (public still cannot read).

### Files modified
- `backend-config.js` — real URL + publishable key
- `main.js` — newsletter submit: upsert → insert + 23505-as-success

### Testing performed (all against the LIVE database)
- 13/13 end-to-end tests pass: contact insert, newsletter insert,
  duplicate newsletter silently accepted, order insert, RLS blocks
  public reads on all 3 tables, all rows verified to land, test rows
  cleaned up afterwards.
- jsdom regression: all 7 pages execute cleanly, all form handlers fire.

### Remaining work
- Rotate the secret key (Project Settings → API keys → Roll) — nothing
  in the site uses it, so rotating is free.
- Optional: store contact form Phone + Interest fields.
- Optional: deploy (any static host; no build step).

---

## 2026-07-04 (later) — Full DOM regression test passed

### Objective
Verify the complete integration end-to-end as far as possible without live
Supabase credentials.

### Testing performed
- jsdom smoke test (scratchpad, not part of the site): loaded each of the
  7 real pages, executed the real `backend-config.js` + `main.js`,
  dispatched DOMContentLoaded, then simulated a submit on all 11 forms.
- Result: **ALL PAGES PASS** — zero runtime errors, every form has a live
  handler, guard paths behave as designed (placeholder credentials produce
  the "backend setup is not complete" alert; empty-cart checkout is blocked).
- No HTML/CSS/JS files were modified in this session.

### Remaining work
Only the live connection: no Supabase credentials, CLI, or MCP connection
exist on this machine yet. Blocked until the project URL + anon key are
added to `backend-config.js` and `supabase-schema.sql` is run in the
Supabase SQL Editor.

---

## 2026-07-04 — Backend integration complete, awaiting Supabase credentials

### Completed
- **Project analysis**: 7 HTML pages, 1 shared JS file (`main.js`), 1 stylesheet,
  11 forms total (1 contact, 1 checkout, 9 newsletter/signup).
- **Backend design**: Supabase (hosted Postgres + auto REST API), accessed from
  the browser via the official `@supabase/supabase-js` client loaded on demand
  from CDN. No build step, no Node server, no authentication required —
  all three flows are anonymous public submissions protected by insert-only
  Row Level Security.
- **Database schema** (`supabase-schema.sql`): `messages`, `newsletter`
  (unique email), `orders` (jsonb items, total, status) + created_at indexes
  + insert-only RLS policies for the `anon` role.
- **Contact form** (`contact.html` → `messages` table): validates name/email/
  message, disables button while sending, shows existing confirmation panel on
  success, friendly alert on failure.
- **Newsletter forms** (all 9 forms → `newsletter` table): email lowercased,
  duplicates silently ignored via upsert `on_conflict=email`, button disabled
  during submit, "Thank you!" / "Try again" feedback on the button itself.
- **Mock checkout** (`shop.html` → `orders` table): stores customer details,
  cart items and total. Card number / CVC are never read or transmitted.
  Blocks submission when the cart is empty.
- **Config separation**: public Supabase URL + anon key live in
  `backend-config.js` (loaded before `main.js` on every page) — the static-site
  equivalent of environment variables. The service role key is never used
  anywhere in the frontend.
- **Verification**: all 7 pages + 3 assets return 200 on a local server;
  `main.js` and `backend-config.js` pass syntax checks; all three insert
  calls match the schema's table and column names exactly.

### Modified Files
- `main.js` — Supabase client bootstrap + real submit handlers for contact,
  newsletter, checkout (all other behaviour untouched)
- `index.html`, `contact.html`, `shop.html`, `interiors.html`, `gardens.html`,
  `initiatives.html`, `journal.html` — one added line each:
  `<script src="backend-config.js"></script>` before `main.js`
- `backend-config.js` — NEW: public config placeholders
- `supabase-schema.sql` — NEW: full database schema + RLS
- `DEVELOPMENT_LOG.md` — NEW: this file

### Database Changes
- Tables: `messages`, `newsletter`, `orders` (see `supabase-schema.sql`)
- Not yet applied — waiting for a Supabase project to be created.

### Remaining Tasks
1. Create Supabase project, run `supabase-schema.sql` in the SQL Editor.
2. Paste project URL + anon key into `backend-config.js`.
3. End-to-end test: submit each form, confirm rows in Table Editor,
   check browser console is clean.
4. (Optional) store contact form Phone + Interest fields — currently
   collected in the UI but not saved.
5. (Optional) deployment — any static host works (Netlify / Vercel /
   GitHub Pages); no server code to deploy.

### Known Issues
- Forms show a "backend setup is not complete" alert until
  `backend-config.js` is filled in (intentional fallback).
- The Supabase JS client loads from jsdelivr CDN at first form submit;
  offline visitors get the friendly error message.
