# Best Basket

Best Basket is a shopping list and price comparison web app. Users create shopping lists, add prices from different stores, and the app shows where to buy each item to save the most money.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org) (App Router)
- **Styling:** Tailwind CSS
- **Database & Auth:** [Supabase](https://supabase.com) (PostgreSQL + Auth)
- **Deployment:** [Vercel](https://vercel.com)

## Prerequisites

- [Node.js](https://nodejs.org) (v22 or later)
- [Docker](https://www.docker.com) (required to run Supabase locally)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) (or use `npx supabase` without installing globally)

## Running Locally

### 1. Install dependencies

```bash
npm install
```

### 2. Start the local Supabase instance

This spins up Supabase services (database, auth, API, etc.) in Docker containers:

```bash
npx supabase start
```

Once it finishes, it will output the local credentials:

```
API URL: http://127.0.0.1:54321
anon key: eyJ...
service_role key: eyJ...
```

### 3. Configure environment variables

Copy the example file and fill in the values from the `npx supabase start` output:

```bash
cp .env.local.example .env.local
```

Update `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from npx supabase start>
```

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Stopping Supabase

When you're done, stop the local Supabase containers:

```bash
npx supabase stop
```

## Testing

```bash
# Unit tests
npm test

# E2E tests (requires the dev server and Supabase to be running)
npm run test:e2e

# E2E tests with interactive UI
npm run test:e2e:ui
```

## Deploy on Vercel

The easiest way to deploy is via the [Vercel Platform](https://vercel.com). Check the [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for details.
