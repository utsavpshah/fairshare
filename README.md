# FairShare

FairShare is a mobile-first shared-expense app for small groups of friends and family. The frontend is a static React application designed for GitHub Pages, with Supabase handling authentication, database access, storage, and Row Level Security.

## Current status

The current build includes:

- React 19 + TypeScript + Vite foundation
- Tailwind-based UI shell with dark mode
- Protected routing
- Supabase browser client wiring
- Controlled email/password sign-in flow
- Private groups and membership management
- Expense creation with equal and exact splits
- Balance calculation with settlement tracking
- Vitest coverage for split and balance utilities
- Supabase migrations through Phase 4

## Local development

### 1. Use a modern Node version

This project was scaffolded and validated with Node 22.

```bash
source ~/.nvm/nvm.sh
nvm use 22.22.2
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Supabase env vars

The project includes a local env file at [/.env.local](/Users/svhf/Documents/Projects/POC/fairshare/.env.local). Replace the placeholder values with your Supabase project settings:

- `VITE_SUPABASE_URL`: your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: your Supabase anon public key

These values are available in Supabase under Project Settings and API.

### 4. Configure Supabase Auth for a private user list

In the Supabase dashboard:

1. Go to Authentication.
2. Keep email/password sign-in enabled.
3. Disable public sign-ups if you want a closed user list.
4. Add your allowed users manually in Authentication → Users.
5. For each user, create an account and assign a temporary password that you will share directly.

There is no Google provider required for this flow.

### 5. Run the app

```bash
npm run dev -- --host 0.0.0.0
```

Then open:

```text
http://localhost:5173
```

## GitHub Pages deployment

This app can be deployed as a static site on GitHub Pages.

### Store Supabase frontend credentials in GitHub

Add these repository secrets in GitHub under Settings -> Secrets and variables -> Actions:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

These are browser-safe values. Do not store the Supabase `service_role` key in the repo or in GitHub Pages build settings.

### Enable GitHub Pages

1. Push the repository to GitHub.
2. Go to Settings -> Pages.
3. Set Source to GitHub Actions.
4. Push to `main` to trigger deployment.

The workflow in [.github/workflows/deploy-pages.yml](/Users/svhf/Documents/Projects/POC/fairshare/.github/workflows/deploy-pages.yml) builds the app, injects the two public Supabase values during the build, and publishes `dist/` to Pages.

### Supabase allow-list

In Supabase Authentication settings, add your GitHub Pages site URL to the allowed site URLs. For a project site this will usually look like:

```text
https://<github-username>.github.io/fairshare/
```

If you later move to a custom domain, add that URL there too.

## Managing your private user list

For a small friends-and-family app, the simplest approach is:

1. Open Supabase Authentication → Users.
2. Create each user account yourself.
3. Share the email and password with that person.
4. Do not expose a signup screen in the app.

If you want literal usernames instead of email addresses, that becomes a custom auth system and is not a good fit for a static site without a backend. This project currently uses Supabase's built-in email/password auth and a private user list.

## Testing

```bash
npm test
```

## Production build

```bash
npm run build
```

## Project structure

```text
src/
  components/
  hooks/
  layouts/
  lib/
  pages/
  services/
  test/
  types/
  utils/
supabase/
  migrations/
```

## Current Supabase migrations

The project currently includes:

- [202607310001_initial_auth.sql](/Users/svhf/Documents/Projects/POC/fairshare/supabase/migrations/202607310001_initial_auth.sql)
- [202607310002_groups_and_members.sql](/Users/svhf/Documents/Projects/POC/fairshare/supabase/migrations/202607310002_groups_and_members.sql)
- [202607310003_expenses_and_splits.sql](/Users/svhf/Documents/Projects/POC/fairshare/supabase/migrations/202607310003_expenses_and_splits.sql)
- [202607310004_settlements.sql](/Users/svhf/Documents/Projects/POC/fairshare/supabase/migrations/202607310004_settlements.sql)
- [202607310000_full_setup.sql](/Users/svhf/Documents/Projects/POC/fairshare/supabase/migrations/202607310000_full_setup.sql)

## Next implementation phases

- Phase 5: dashboard data, receipt upload, and filters
- Phase 6: deployment hardening and broader test coverage
