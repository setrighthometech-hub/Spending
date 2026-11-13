# Spending app

A personal spending tracker used on an iPhone as a home-screen web app (PWA), hosted
free on GitHub Pages. Household details (names, amounts, how the owner likes to work)
are in `CLAUDE.local.md`, which is private and never pushed. Read it first.

## How it works
- Two money pots: **Groceries & Gas** and **Personal**. Groceries, Gas and Other purchases
  come out of Groceries & Gas; Personal purchases come out of Personal. Each is still tracked
  as its own category.
- Money in: weekly payday transfers (groceries + gas, and sometimes personal) plus extras.
  Each has an **arrived** checkmark and only counts once ticked.
- Purchases: amount, category, store (remembered), date, optional note.
- "What's left" counts the payday week, **Wednesday to Tuesday**. Leftovers carry over.
  **Adjust total** saves the difference as an adjustment, kept apart from spending.
- Views: Home (pots), Days (day by day), Stores, More (month totals, money in, adjustments, backups).
- Data lives only on the phone (browser storage), with Back up / Restore to a file.

## Rules
- Money is whole cents (integers). Logic goes in `src/logic/` with tests in `tests/`.
- The saved data is read defensively. Changing its shape means bumping `SCHEMA_VERSION`
  and still reading the old shape.
- **Never store account numbers, card numbers or bank passwords. No bank connections.**
- This repo is public. Never commit names, real amounts or backup files.
- Commit only with the owner's OK.

## Commands (PowerShell: use `npm.cmd`)
- `npm.cmd run dev`: runs the app on the PC, reachable from a phone on the same Wi-Fi (http, not https)
- `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run build` (puts the site in `dist/`)
- `node scripts/render-icons.mjs`: rebuilds the PNG icons from `public/icon.svg`
