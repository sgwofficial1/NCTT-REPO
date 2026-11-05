# NCTT development test — November 1, 2026

The current NCTT site was tested in development using an isolated browser plan and fictional document fixtures. Production checks used owner-private service access without changing sharing or reading a visitor’s documents.

## Automated checks

Run `npm test` from the project directory. The nine test files cover:

- Account setup, legacy-plan migration, validation, non-destructive settings saves, TRS synchronization and reminder preferences.
- Sign-in/sign-out links, safe return URLs, identity-aware sign-out responses and private caching.
- Budget, rent-versus-buy, VA funding-fee and college estimates, including zero-interest and enrollment edge cases.
- File type validation, authenticated document access, same-origin writes and folder ownership.
- File and nested-folder deletion against isolated in-memory storage, ownership isolation, conflict detection and storage failures.
- Calendar arithmetic, bounded recurrence, multi-day overlap, completion synchronization, and cancelled/confirmed removal in isolated state.
- Backup import rejection, legacy imports, cancellation and preservation of the current plan after storage or rendering failures.
- Vault encryption/decryption, encrypted-only persistence, fresh IVs, wrong-password rejection and clearing decrypted data when locked. These tests use dummy credentials in an isolated runtime.
- Resource request validation, request-size limits, origin checks, location bounds, upstream failures and exclusion of budget/password fields from searches.

## Browser checks

- Landing images and section anchors loaded; the example progress control updated; sign-in and back-to-home links worked.
- Setup rejected an empty goal selection, updated its live preview, resumed a saved draft after reload and created a plan.
- Settings saved and reloaded a display name and reminder preference; changed EAS dates recalculated milestone dates.
- Calendar Month/Week/Day views opened. A weekly item produced three occurrences; its subtask and completion state survived reload, with only the selected occurrence completed.
- All nine My checklist views retained white navigation and had no desktop horizontal overflow.
- Finance inputs of $1,000 income, $3,000 spending and $6,000 savings produced a $2,000 monthly deficit and a three-month runway; scenario saving worked. The sample housing comparison showed $1,620/month rent versus $2,314/month buy.
- Fictional TXT, DOCX, XLSX, PPTX, CSV, PNG and PDF files opened in their intended viewers. No production documents were uploaded, edited or deleted.
- Setup, Settings, Calendar, Finances, Housing and College layouts fit a 390-pixel mobile frame (375-pixel usable width with a scrollbar), retained white sidebars and had no horizontal document overflow.
- No application-origin console errors were observed during the browser flows.

## Production HTTP checks

- Landing, sign-in, sign-out, tracker, setup and settings returned 200 with private/no-store page caching.
- The document API returned 401 without a visitor identity, even when service access was supplied.
- An unknown route returned 404.
- The live resource refresh returned three checked official source pages and five search results. External sources were unavailable from the development runtime, where the fallback links appeared correctly.

## Fixes from this test

1. A malformed profile backup could pass the old import checks, be saved and break rendering. Imports now validate their structure before replacement; cancelled imports and failures preserve the existing saved plan. The file selector resets after a rejected import.
2. Malformed JSON or a non-object resource request was classified as an upstream failure. These requests now return 400; genuine upstream failures retain 502.
3. Added the repeatable `npm test` command and regression coverage for backup restores, vault behavior, resource input validation and planner removal.

## Limits and pending scope

- This is development and regression testing, not an independent security audit or a guarantee about benefit eligibility or financial estimates.
- The full live ChatGPT authentication cycle was not performed; routing logic and entry pages were tested.
- Phone push/SMS delivery is not implemented and was not tested.
- Help & Support, Privacy & Terms and the branded error screens remain mockups; the deployed unknown-route response is the framework 404.
- No public access changes were made. Calendar and plan test data were kept under a separate development storage key; the temporary QA pages are excluded from the published build.
