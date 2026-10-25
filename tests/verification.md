# Browser verification — daily journal and photo memories

Verified locally in Chromium on 25 October 2026 with a separate test browser profile and generated image fixtures. No personal expenses or user photos were used.

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

Runtime errors: 0

Unit and syntax checks: `npm run check`.
