# Pocket

A mobile-first expense tracker in Malaysian ringgit. No app account or backend is required.

## Run

Requires Node.js 20 or later. There are no application dependencies to install.

```sh
cd pocket-expense-tracker
npm run dev
```

Open http://localhost:3000. Set `PORT` to use a different port. `npm run check` checks JavaScript syntax and runs the data tests. Deploy the `dist` folder to any static host.

## Architecture

- `dist/app.js`: reusable expense rows, dialogs, navigation, Home, History and Insights views, and event handling.
- `dist/data.js`: validation, seed records, weekday/date formatting, daily grouping, filtering, money calculations and CSV export. Totals are calculated in integer cents.
- `dist/storage.js`: asynchronous IndexedDB repository, atomic localStorage migration, Blob persistence and revision checks for concurrent tabs.
- `dist/photos.js`: local photo validation, orientation-aware resizing and JPEG compression.
- `dist/analytics.js`: local-date daily series, monthly metrics and elapsed-day averages for real spending charts.
- `dist/icons.js`: small reusable SVG icons.
- `dist/styles.css`: responsive design, mobile bottom navigation, dialogs and accessible focus states.
- `server.mjs`: dependency-free local static server.
- `tests/data.test.mjs`: calculations, filtering, validation, persistence and CSV edge cases.
- `tests/analytics.test.mjs`: weekly date boundaries, leap-year months, missing days and average calculations.

## Design

The warm ivory and forest-green interface pairs editorial serif headings with DM Sans, quiet borders, generous spacing and clear amounts. Home includes a monthly overview, a seven-day spending chart and a category ring. Insights includes daily spending for the selected month and a complete category breakdown. Both charts reflect recorded expenses; zero-spend days stay empty. Home shows the complete journal grouped by date, with weekday names and daily subtotals. Clicking a category on Home or Insights opens the corresponding month and category in History, where individual expenses can be viewed, edited or deleted. A Back to Insights action preserves the selected month.

The design takes inspiration from the layout hierarchy of [shadcn/ui](https://github.com/shadcn-ui/ui) and the typography and restrained color system of [Radix Themes](https://github.com/radix-ui/themes). The app remains dependency-free and uses its own HTML, CSS and SVG components.

Each expense stores `id`, `amount`, `category`, `remark`, `date`, `createdAt`, `updatedAt` and an optional `photos` array. Each photo stores an ID, original filename, compressed image Blob, dimensions and creation timestamp. Dates are local calendar dates; timestamps are ISO UTC. “Today” uses the device's calendar date. Custom category renaming updates existing records; hiding keeps records intact, and only unused custom categories can be deleted.

## Storage

Data and photo Blobs are saved in browser IndexedDB: database `pocket.expenses`, object store `state`, key `current`. Expenses, categories and photos are saved atomically before the UI updates. Existing `pocket.expenses.v1` localStorage data is migrated on first use; the original value stays untouched as a migration backup. If migration fails, the original records are not overwritten. Once the database exists, clearing samples or expenses does not re-import old data.

Storage remains specific to the browser, device and site origin; it does not sync across devices. Clearing site data removes expenses and photos. CSV export includes transaction fields, not photo attachments. Cross-tab updates use BroadcastChannel and focus refresh; revision checks reject stale saves instead of silently overwriting newer records.

## Photo memories

Add or edit an expense and choose **Add photos**. Up to four photos can be attached, previewed and removed. Uploading remains optional. Supported images are resized to a maximum dimension of 1600 pixels and re-encoded as JPEG locally, with EXIF metadata removed. Original files up to 20 MB are accepted if the browser can decode them; unsupported formats show an error without changing the draft.

Photos appear as thumbnails in the daily journal and as a gallery in expense details. Tap a gallery image to open the large view. Cancelling an edit preserves saved photos; deleting an expense removes its attachments in the same transaction. Photos are never uploaded to GitHub or Vercel.

Four sample expenses dated 1–3 October 2026 are added on first use. Use **Clear samples** on Home or Preferences to remove only those records. They are not re-added after clearing. Monthly and daily totals always follow the actual device date.

## Adding a backend later

Replace the repository adapter in `dist/storage.js` with a Supabase or other database implementation. Initialization and UI mutations already await `load()` and `save()`. A remote adapter can store photo files in private object storage and preserve the expense-to-photo associations. The record shape, filtering, calculations and UI can stay the same. A database adapter can add granular insert/update/delete operations without changing the views. Add authentication and access policies at that time if shared storage is required.

## Verification

Data and analytics tests cover totals, filter combinations, daily grouping, weekday names, integer-cent subtotals, CSV escaping, date boundaries, leap years and daily averages. The update passed 38 Chromium browser checks covering legacy data migration, complete daily lists, category drill-down, photo upload/resizing, refreshed Blob persistence, photo viewing/removal, cancelled edits, invalid and oversized files, failed storage writes, stale-save conflicts, deletion and custom categories. Home, History and Insights fit at 320px, 390px and 1440px. See `tests/verification.md` for the recorded checks.

## Vercel deployment

The GitHub repository is private. Import this repository into Vercel with the Other preset and project root `./`. `vercel.json` runs syntax and data checks and publishes only `dist`.

Keep Vercel Authentication enabled for **All Deployments**, including the production domain. Repository privacy alone does not restrict website access. Sign into the authorized Vercel account to open the website.

Expenses remain local to the browser and site origin; this deployment does not add cross-device sync. Export CSV before clearing browser storage.
