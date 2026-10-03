# Pocket

A mobile-first expense tracker in Malaysian ringgit. No app account or backend is required.

## Run

Requires Node.js 20 or later. There are no application dependencies to install.

```sh
cd /workspace/pocket
npm run dev
```

Open http://localhost:3000. Set `PORT` to use a different port. `npm run check` checks JavaScript syntax and runs the data tests. Deploy the `dist` folder to any static host.

## Architecture

- `dist/app.js`: reusable expense rows, dialogs, navigation, Home, History and Insights views, and event handling.
- `dist/data.js`: repository boundary, validation, seed records, filtering, money calculations and CSV export. Totals are calculated in integer cents.
- `dist/icons.js`: small reusable SVG icons.
- `dist/styles.css`: responsive design, mobile bottom navigation, dialogs and accessible focus states.
- `server.mjs`: dependency-free local static server.
- `tests/data.test.mjs`: calculations, filtering, validation, persistence and CSV edge cases.

Each expense stores `id`, `amount`, `category`, `remark`, `date`, `createdAt` and `updatedAt`. Dates are local calendar dates; timestamps are ISO UTC. “Today” uses the device's calendar date. Custom category renaming updates existing records; hiding keeps records intact, and only unused custom categories can be deleted.

## Storage

Data is saved in browser `localStorage` under `pocket.expenses.v1`. Save operations persist before updating the visible UI. Data survives refreshes and browser reopening, and tabs receive changes through the storage event. Storage is specific to the browser, device and site origin; it does not sync across devices. Clearing site data removes expenses. CSV export provides a portable copy of every expense.

Four sample expenses dated 1–3 October 2026 are added on first use. Use **Clear samples** on Home or Preferences to remove only those records. They are not re-added after clearing. Monthly and daily totals always follow the actual device date.

## Adding a backend later

Replace `expenseRepository.load()` and `expenseRepository.save()` in `dist/data.js` with an asynchronous adapter for Supabase or another database, and await those calls in initialization and `commit()` in `dist/app.js`. The record shape, filtering, calculations and UI can stay the same. A database adapter can add granular insert/update/delete operations without changing the views. Add authentication and access policies at that time if shared storage is required.

## Verification

Data tests cover the sample total (RM 77.60), 3 October total (RM 30.80), category breakdown, filter combinations, invalid amounts/dates, empty-state persistence and CSV escaping. Completed browser checks exercise adding, editing, cancelling/confirming deletion, refreshed persistence, History filters, Insights, custom categories, CSV download and responsive layouts at 320px, 390px and 1440px. Enlarged text was also checked at 200%.

## Vercel deployment

The GitHub repository is private. Import this repository into Vercel with the Other preset and project root `./`. `vercel.json` runs syntax and data checks and publishes only `dist`.

Keep Vercel Authentication enabled for **All Deployments**, including the production domain. Repository privacy alone does not restrict website access. Sign into the authorized Vercel account to open the website.

Expenses remain local to the browser and site origin; this deployment does not add cross-device sync. Export CSV before clearing browser storage.

