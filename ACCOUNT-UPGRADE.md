# Account upgrade — private preview

Supabase Auth handles registration, verified-email login, password recovery and logout. The app only opens a diary after the auth service verifies the account. New accounts start with an empty diary.

`pocket_diaries` uses ownership RLS; each row belongs to `auth.uid()`. Private `pocket-photos` objects are UID-prefixed and protected by storage RLS. Uploads are immutable and SHA-256 checked before the diary revision commits. Downloads are authenticated, then checked before display. Photo blobs are held in memory, not shared browser caches. Logout clears the interface and revokes image object URLs.

Owner-only import is determined by private database configuration and verified email, never editable user metadata. It downloads a complete backup, copies old local data to an empty account diary, compares the complete result including photo bytes, and leaves the old browser database intact. Other devices must be opened and imported by the owner on those devices. Do not assume the in-app browser contains the owner's real records.

## Before public release

1. Configure custom SMTP in Supabase Auth; the default service cannot deliver confirmation mail to arbitrary users.
2. Set the production Site URL and allow the private preview URL under Auth URL Configuration. Keep email confirmation enabled.
3. Owner registers personally and verifies email; never put their password in chat or source.
4. Complete real browser A/B signup, login, expense/photo CRUD, logout/account switching and direct Storage API denial tests. Database-role RLS tests already passed, but are not a substitute for these flows.
5. Run an owner import on the actual device containing real records, verify backup, totals, photos and albums.
6. Only after these checks, promote and make GitHub/public production access available. Keep preview deployments protected.

The original 16 tests pass; Supabase security advisor returned no findings. The deployed database has no user data yet. SQL role tests used temporary rows in a transaction and rolled them back. Storage SQL direct deletion is forbidden by Supabase and was not bypassed; HTTP photo deletion testing remains pending.
