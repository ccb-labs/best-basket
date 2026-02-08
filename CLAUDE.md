# CLAUDE.md — Best Basket

## Project Overview
Best Basket is a shopping list and price comparison web app. Users create shopping lists, add prices from different stores, and the app shows where to buy each item to save the most money.

## Developer Context
- We are **beginner developers** — we know basic HTML, CSS, and JavaScript but are new to React, Next.js, and databases.
- **Always explain the "why" behind decisions**, not just the "what." We want to learn.
- Use **simple, readable code** over clever or compressed code.
- Add comments for anything a beginner might not understand.
- When introducing a new concept (hooks, server components, SQL joins, middleware, etc.), **explain it briefly before using it**.
- If we suggest something that's a bad practice, tell us and explain a better approach.

## Constraints
- **Budget: $0** — only free tiers
- **Deployment: Vercel** (auto-deploys from GitHub)
- **Keep it simple** — avoid overengineering. Fewer tools and dependencies. If something can be done simply, do it simply.

## Tech Stack
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Database:** Supabase (free tier — PostgreSQL + Auth + API)
- **Auth:** Supabase Auth (email/password + Google login)
- **Deployment:** Vercel (free tier)

## Core Features (MVP)
1. **Shopping Lists** — create, edit, delete, and name shopping lists
2. **List Items** — add products with: name, quantity, unit, and category. Default categories are provided (Cleaning, Beverages, Fruits, Grains, Personal Care, Legumes, Nuts & Seeds, Condiments, Snacks, Vegetables, Frozen) but users can also add their own
3. **Store Prices** — for each product, add price at different stores (e.g., "Milk → Lidl: €0.89, Continente: €1.05")
4. **Store coupons discounts** - for each store or store product, add discounts that must be considered in the final price
5. **Price Comparison Dashboard** — summary showing:
   - Total cost of the list at each store
   - Which store is cheapest overall, considering the discounts
   - "Smart split": which items to buy at which store to save the most
6. **Shopping Mode** — check off items while shopping, mobile-friendly
7. **Mobile-first design** — primary usage is on a phone in a store
8. **Shared Lists** — share a shopping list with other users so everyone can view and edit it
9. **Template Lists** — save a list as a reusable template (e.g., "Weekly Groceries"). Users can create a new list from a template anytime. Templates can be marked as weekly or monthly, and the app shows a reminder when it's time to create a new list

## Development Phases
- **Phase 1:** Project setup, folder structure, Supabase connection, basic auth (sign up / login / logout)
- **Phase 2:** CRUD for shopping lists (create, read, update, delete)
- **Phase 3:** CRUD for list items (add products, edit, delete, categorize)
- **Phase 4:** Store prices (add/edit prices per product per store)
- **Phase 5:** Store and store product coupon discounts
- **Phase 6:** Price comparison dashboard + smart split logic
- **Phase 7:** Shopping mode (check off items, mobile UX polish)
- **Phase 8:** Final polish, deploy to Vercel

## Database Schema (Supabase)
Tables to create (ask before implementing if unsure):
- `users` (handled by Supabase Auth)
- `categories` (id, user_id nullable, name) — `user_id = null` means default category (available to all users); with a `user_id` means user-created
- `shopping_lists` (id, user_id, name, created_at, is_template, recurrence) — `is_template` (default false) marks the list as a template; `recurrence` (`'weekly'`, `'monthly'`, or `null`) controls reminder frequency
- `list_items` (id, list_id, name, quantity, unit, category_id)
- `stores` (id, user_id, name)
- `item_prices` (id, item_id, store_id, price)
- `discounts` (id, user_id, store_id, item_price_id, type, value, description)
- `list_shares` (id, list_id, user_id)

## Code Style
- Use TypeScript (but keep types simple — no complex generics)
- Use named exports for components
- One component per file
- Keep components small — split when a file exceeds ~100 lines
- Use `async/await` over `.then()` chains
- Handle errors with try/catch and show user-friendly messages

## Testing
- **Before every commit**, create and run unit tests for the changed code
- Use **Jest** + **React Testing Library** for component and logic tests
- Test files go next to the source file: `ComponentName.test.tsx` or `utils.test.ts`
- Run tests with `npm test`

## Git Workflow
- Use **feature branches** for each phase/feature (e.g., `feature/phase-1-auth`, `feature/shopping-list-crud`). Create a PR to merge into `main`.
- Make small, focused commits after each meaningful change
- Use clear commit messages (e.g., "Add shopping list CRUD", "Connect Supabase auth")
- Work on one phase at a time
