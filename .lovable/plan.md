## What I'll build

### Part A — Login system (Lovable preview, runs immediately)
The Cherry preview app gets a real auth flow using Lovable Cloud (managed Postgres + auth — same SQL as MySQL, zero setup). MySQL on Railway stays dedicated to payments only, as you requested.

1. **Enable Lovable Cloud** (one click — gives us auth + database)
2. **`/auth` route** — Cherry logo at top, then a card with:
   - Email Address
   - Password
   - Forgot Password link
   - Login button
   - "Create account" tab for new signups
   - Google sign-in button
3. **`/reset-password` route** — public page where the email link lands; sets a new password
4. **Protect `/` (chat)** — unauthenticated users redirected to `/auth`
5. **Profiles table + RLS** — stores display name, created_at, subscription tier (free/pro)
6. **User activity table** — logs chat sessions, login events (RLS-protected)
7. **Header**: shows logged-in email + Logout button

### Part B — MySQL (Railway) for payments + Google Sheets sync
This part lives in the Railway zip, NOT the preview (preview can't reach your MySQL). I'll give you ready-to-paste files:

1. **Prisma schema additions** for MySQL:
   - `payments` (id, user_email, amount, currency, stripe_payment_id, status, created_at)
   - `subscriptions` (id, user_email, plan, status, current_period_end, stripe_subscription_id)
2. **Stripe webhook handler** (`/api/stripe/webhook`) — on `checkout.session.completed` and `invoice.paid`, inserts into MySQL
3. **Google Sheets sync worker** — after every MySQL insert/update, appends a row to your Google Sheet via the Google Sheets API. Two columns of sheets:
   - **Payments History** — date, email, plan, amount, status, stripe id
   - **Active Members** — email, plan, status, next billing date
4. **`README-PAYMENTS.md`** — step-by-step: create Google service account, share sheet with it, paste credentials into Railway env vars

### What you'll need to provide later (not now)
- Google Cloud service account JSON (for Sheets write access)
- The Google Sheet URL you want data written to
- Stripe test keys (already on your Railway todo list)

### Files I'll create/edit in preview
- `src/routes/auth.tsx` (new)
- `src/routes/reset-password.tsx` (new)
- `src/routes/_authenticated/route.tsx` (new — guards chat)
- `src/routes/_authenticated/index.tsx` (move current chat here)
- `src/components/cherry-header.tsx` (new — logo + logout)
- DB migration: `profiles`, `user_activity` tables + RLS

### Files I'll add to a downloadable folder for Railway
- `prisma/schema.prisma` additions
- `src/routes/stripe-webhook.ts`
- `src/lib/sheets-sync.ts`
- `README-PAYMENTS.md`

Confirm and I'll start with Part A (preview login) — Part B Railway files come after.