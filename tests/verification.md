# Browser verification — little albums and monthly keepsakes

Verified locally in Chromium on 26 October 2026 (Asia/Kuala_Lumpur), using separate browser profiles and generated photo fixtures. No user expense data or personal photos were used.

## Expense and photo flows

- migrates all legacy expenses to IndexedDB
- retains original localStorage migration backup
- Home displays more than five records and every recorded day
- each day shows its correct subtotal
- dates show weekday names
- category click opens monthly transaction details
- category detail total matches category summary
- category detail preserves selected month
- expense entry date also shows weekday
- photo upload shows two previews
- photos and expense saved atomically
- photo is resized for mobile storage
- expense photos survive refresh
- photo thumbnail displayed beside expense
- details display all photo attachments
- photo opens large view
- cancel edit preserves original photo attachments
- edit saves photo removal and new amount
- invalid image leaves existing attachment intact
- photo count limit gives clear validation
- failed storage write preserves form draft and saved photos
- concurrent stale saves cannot overwrite newer records
- delete asks confirmation before removing photos
- deleting an expense removes its attachments
- non-photo files rejected
- oversize images rejected
- custom category management still saves
- home fits 320px
- history fits 320px
- insights fits 320px
- home fits 390px
- history fits 390px
- insights fits 390px
- home fits 1440px
- history fits 1440px
- insights fits 1440px
- blank add form save action fits phone height
- no runtime errors

## Calendar, photo wall and backup

- calendar renders all 31 days of October
- calendar initially selects today
- calendar shows an image for a photo day
- day selection shows exact total and transactions
- empty calendar day has a useful empty state
- add from calendar defaults to selected date
- saving updates selected calendar day immediately
- month navigation shows correct days
- previous month spending and photos are available
- photo wall contains every attached photo
- photo wall groups newest month first
- memory opens a full image with amount and weekday
- memory links to editable expense details
- memories can be filtered by month
- empty photo month is handled
- show all restores complete photo wall
- complete backup is downloaded as JSON
- backup includes all records, hidden categories and every photo
- photo bytes are embedded in backup
- invalid JSON does not replace current data
- damaged photo backup is rejected without data changes
- restore preview shows photo and expense counts
- restore requires explicit replacement confirmation
- cancel restore preserves existing records and photos
- restore reconstructs all expense records and hidden custom categories
- restored photo bytes and expense metadata match the backup
- restored diary survives refresh
- restored photo is viewable
- empty backup restore stays empty and does not re-seed
- home fits 320px
- history fits 320px
- calendar fits 320px
- memories fits 320px
- insights fits 320px
- home fits 390px
- history fits 390px
- calendar fits 390px
- memories fits 390px
- insights fits 390px
- home fits 1440px
- history fits 1440px
- calendar fits 1440px
- memories fits 1440px
- insights fits 1440px
- new features raise no runtime errors

## Albums, captions, cover photos and monthly cards

- existing diary opens with an empty album collection
- photo cover and notes stay in the unsaved expense draft
- cancelling expense edit preserves saved photo metadata
- cancelling the note editor leaves the expense draft untouched
- saving an expense persists individual captions and chosen cover
- expense row thumbnail uses the chosen cover
- calendar model respects selected covers
- photo wall displays each photo note
- large photo view uses its own note
- album list has a friendly empty state
- new album opens the expense picker
- picker calculates selected expense total
- selection survives search filtering
- album shows the right total without duplicating diary records
- album photo view includes all related photos and notes
- expense editor shows existing album membership
- editing an expense immediately updates its album total
- cancelling selection keeps album membership
- removing from an album keeps the underlying expense
- new expense added inside an album is linked automatically
- deleting an expense cleans album references and updates total
- album name and colour persist
- one expense can belong to multiple albums without duplicate records
- album deletion asks confirmation
- deleting an album preserves expenses and photo notes
- monthly card shows exact total and expense count
- monthly card uses the most frequent category
- monthly card selects expense covers and their notes
- monthly card downloads a real 1080×1440 PNG
- privacy option hides amount in card preview
- hidden-amount PNG excludes computed amounts
- month change updates card statistics and photos
- empty monthly card is handled
- Insights opens the card for its selected month
- complete backup includes albums, photo notes and cover choices
- restore reconstructs album membership, notes and covers
- all scrapbook metadata survives refresh
- previous complete backup format is still accepted
- photos view fits 320px
- albums view fits 320px
- recap view fits 320px
- album details fit 320px
- photos view fits 390px
- albums view fits 390px
- recap view fits 390px
- album details fit 390px
- photos view fits 1440px
- albums view fits 1440px
- recap view fits 1440px
- album details fit 1440px
- scrapbook features raise no runtime errors

Runtime errors: 0

Syntax, calculations, backup validation and model checks: `npm run check`.
