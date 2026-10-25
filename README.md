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
- `dist/journal.js`: Monday-first monthly calendar cells, exact daily totals and photo memory grouping.
- `dist/backup.js`: versioned complete backup serialization, strict import validation and photo integrity checks.
- `dist/icons.js`: small reusable SVG icons.
- `dist/styles.css`: base components, responsive layout and dialogs.
- `dist/playful.css`: cream, berry-pink and butter-yellow journal theme, calendar, photo wall and backup controls.
- `server.mjs`: dependency-free local static server.
- `tests/data.test.mjs`: calculations, filtering, validation, persistence and CSV edge cases.
- `tests/analytics.test.mjs`: weekly date boundaries, leap-year months, missing days and average calculations.

## Design

The scrapbook-inspired interface uses cream paper, berry-pink controls, butter-yellow and lavender cards, rounded Nunito typography, small tape details and gently tilted photo cards. Home puts the complete daily journal first, with clear links to Calendar and Memories. Mobile bottom navigation includes Home, History, Calendar, Memories and Insights; Add expense stays easy to reach.

Calendar uses Monday-first weeks, shows daily amounts and photo thumbnails, and opens the selected day's complete expense list with its exact total. Adding an expense from Calendar defaults to the selected date. Memories presents every attached photo by month, newest first, with month filtering and links back to the editable expense. Existing spending charts and category drill-down remain available.

Each expense stores `id`, `amount`, `category`, `remark`, `date`, `createdAt`, `updatedAt` and an optional `photos` array. Each photo stores an ID, original filename, compressed image Blob, dimensions and creation timestamp. Dates are local calendar dates; timestamps are ISO UTC. “Today” uses the device's calendar date. Custom category renaming updates existing records; hiding keeps records intact, and only unused custom categories can be deleted.

## Storage

Data and photo Blobs are saved in browser IndexedDB: database `pocket.expenses`, object store `state`, key `current`. Expenses, categories and photos are saved atomically before the UI updates. Existing `pocket.expenses.v1` localStorage data is migrated on first use; the original value stays untouched as a migration backup. If migration fails, the original records are not overwritten. Once the database exists, clearing samples or expenses does not re-import old data.

Storage remains specific to the browser, device and site origin; it does not sync across devices. Clearing site data removes expenses and photos. CSV export includes transaction fields, not photo attachments. Cross-tab updates use BroadcastChannel and focus refresh; revision checks reject stale saves instead of silently overwriting newer records.

## Photo memories

Add or edit an expense and choose **Add photos**. Up to four photos can be attached, previewed and removed. Uploading remains optional. Supported images are resized to a maximum dimension of 1600 pixels and re-encoded as JPEG locally, with EXIF metadata removed. Original files up to 20 MB are accepted if the browser can decode them; unsupported formats show an error without changing the draft.

Photos appear as thumbnails in the daily journal and as a gallery in expense details. Tap a gallery image to open the large view. Cancelling an edit preserves saved photos; deleting an expense removes its attachments in the same transaction. Photos are never uploaded to GitHub or Vercel.

Four sample expenses dated 1–3 October 2026 are added on first use. Use **Clear samples** on Home or Preferences to remove only those records. They are not re-added after clearing. Monthly and daily totals always follow the actual device date.

## Complete backup and restore

Open **Backup & restore** from the sidebar, the archive button in the mobile header, or Preferences. **Download backup** saves a versioned `pocket-complete-backup-YYYY-MM-DD.json` file containing every expense, category (including hidden custom categories) and the complete compressed photo bytes. CSV remains available for spreadsheet use and does not contain photos.

Choose a complete backup file to inspect expense, photo and category counts before restoring. Restoration requires an explicit **Replace and restore** confirmation and replaces this browser's current diary; the preview also offers **Download current backup first**. Cancelling or rejecting a damaged file leaves current data unchanged. Restoration uses the same atomic IndexedDB transaction and stale-save protection as other mutations. Backup import accepts files up to 256 MB and validates IDs, dates, amounts, category references, duplicate records, image formats, dimensions and decodability before writing anything.

Backups are ordinary unencrypted local JSON files. Keep them somewhere you trust. Nothing is uploaded as part of exporting or restoring a backup.

## Adding a backend later

Replace the repository adapter in `dist/storage.js` with a Supabase or other database implementation. Initialization and UI mutations already await `load()` and `save()`. A remote adapter can store photo files in private object storage and preserve the expense-to-photo associations. The record shape, filtering, calculations and UI can stay the same. A database adapter can add granular insert/update/delete operations without changing the views. Add authentication and access policies at that time if shared storage is required.

## Verification

`npm run check` validates all JavaScript modules and runs data, analytics, calendar/memory and complete-backup tests. The browser verification includes the existing 38 expense/photo checks plus 45 checks for calendar navigation, selected-date entry, photo-wall grouping, month filters, complete backup download, cancelled and invalid restores, restored photo-byte equality, refreshed persistence and responsive layouts across all five pages at 320px, 390px and 1440px. See `tests/verification.md` for the recorded checks.

## Vercel deployment

The GitHub repository is private. Import this repository into Vercel with the Other preset and project root `./`. `vercel.json` runs syntax and data checks and publishes only `dist`.

Keep Vercel Authentication enabled for **All Deployments**, including the production domain. Repository privacy alone does not restrict website access. Sign into the authorized Vercel account to open the website.

Expenses remain local to the browser and site origin; this deployment does not add cross-device sync. Export CSV before clearing browser storage.
