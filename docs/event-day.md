# Event passes, meals, and sponsor codes

## Walkthrough

Run migrations before starting the dev server. Existing accounts/applications are
preserved. No new environment variables, vendor accounts, or cloud keys are required.

1. Sign in as `jordan@example.com` with `CalHacks-demo-2026!`. This seeded
   applicant already has a published acceptance for Cal Hacks 12.0. Open
   **Event pass & meals**, select that event, and confirm attendance. Optional
   dietary details are visible to that event's staff.
2. In another browser profile, sign in as `manager@example.com` (same password).
   Open **Check-in & meals**, select Cal Hacks 12.0, and scan Jordan's pass.
   A camera, uploaded QR image, or pasted pass URL/user ID all open the same
   staff page. Confirm identity at the desk and click **Check in attendee**.
3. Click Breakfast, Lunch, Dinner, or Snack to consume a ticket; click again to
   undo a mistaken entry. The applicant pass refreshes every 15 seconds while
   visible, and when returning to its tab. It pauses refresh while enlarged.
4. As manager, open **Manage sponsor codes**, add a sponsor, then upload codes
   separated by commas or newlines. Use synthetic values for local testing.
5. As the checked-in attendee, open **Sponsor codes** and redeem a code. It opens
   in a dialog with copy and (for HTTP/HTTPS codes) open-link controls. Reopening
   or retrying returns the same assigned code. Other attendees cannot see it.
6. Managers can filter/search codes, see redeemer identity/time, export CSV, and
   remove unused codes or sponsors with no redemptions.

The sidebar's bottom **Manage events** link opens event administration. Creation
is collapsed behind its button. Platform administrators can delete an empty event
by typing its slug; events with applications or attendance must be archived.
Deletion removes the empty event's configuration, memberships, unused sponsor
inventory, and event-scoped setup audit entries. Archival preserves history.

## Design and boundaries

These pages follow Storke's pass card, fullscreen QR, four meal tickets, attendee
funnel, meal bars, check-in detail, sponsor cards, and code management flows. They
retain Colmena branding, shared typography/palette, and page transitions.

`src/lib/server/event-day.ts` owns authorization and transactional operations.
Routes authenticate the session, validate bounded form input, and call that module.
There is one attendance record per event/user, shared across application types.
Any currently **published** accepted application qualifies; an unpublished
preparation or superseded acceptance does not. Confirmation is required before
staff check-in. A pass contains a scoped staff URL with the user's ID, not a
password or authorization token. Knowing it grants no staff access. Staff should
still verify the attendee's identity; a copied QR is not proof of identity.

Event members can check in attendees and serve meals. Managers additionally
manage sponsor inventories. Platform administrator status alone does not grant
event-day access. Staff cannot check themselves in or alter their own meal tickets.
Mutations recheck membership and require a published (non-archived) event.

Check-in is idempotent. Meals have explicit desired state and versions: two staff
members using stale screens cannot consume/undo each other's updates. Undo retains
the row and increments its version. Four tickets per person/event match Storke;
multi-day or configurable meal slots are not implemented.

Sponsor allocation runs in a SQLite immediate transaction. A unique
(sponsorId, redeemedBy) constraint enforces one claim per attendee/sponsor.
Repeated code values are intentionally permitted for reusable promotional codes;
each inventory row is a separate available allocation. A retry returns the
existing claim. Redeemed rows and their sponsors cannot be deleted, preserving
claim history and preventing deletion from enabling a second claim. This is an
intentional integrity improvement over Storke's unrestricted deletion.

Admission confirmation is a simple attendance commitment and optional dietary
text. It does not copy SB Hacks' legal waivers, demographic fields, or emergency
contact form. No acceptance email, capacity enforcement, or automatic admission
reversal is implied. Correcting an admission after check-in does not erase recorded
attendance, meal usage, or sponsor claims.

## Dependencies and setup

QR generation uses `qrcode`; scanning uses `qr-scanner`, including its bundled
worker. Both run locally in the browser, require no API keys, and send no camera
frames or QR images to a third party. Their versions are captured in pnpm-lock.yaml.
A camera requires HTTPS (or localhost) and browser permission. Grant camera
permission in the browser's site settings; close other camera-using apps if busy.
Switch camera changes front/back preference. Closing/navigating away stops the
stream. Scanner preference persists locally so repeated desk scans are convenient.
Denied or unavailable camera access leaves image upload and manual entry usable.
Invalid/off-origin/wrong-event passes never navigate to arbitrary URLs.

Native fullscreen and screen wake lock are used when supported, with a viewport
overlay fallback. Screen wake locks are optional and may be refused in low-power
mode. Escape or tapping closes the enlarged pass. Reduced-motion preferences
remain respected by the shared page animation.

Actual sponsor codes must be obtained from the sponsor's partnership contact or
their redemption/promotion dashboard. There is no automatic vendor integration:
the manager pastes the agreed inventory into this event. Do not paste API secrets
or account passwords. The portal assigns codes but cannot verify their value,
expiration, or redemption at the vendor. Test using a vendor-approved test code
before uploading a live allocation. Commas/newlines delimit codes; if a vendor
provides URLs containing literal commas, obtain an encoded or delimiter-free form.
Each upload supports up to 500 codes, 2,000 characters each, within the ordinary
64 KiB request limit; split larger inventories into batches.

All records reside in SQLite and are covered by the existing backup and persistent
volume procedures. Migration 0004 adds tables without rewriting existing records.
See README and deployment documentation for backup-before-migration instructions.
Sponsor CSVs contain codes and redeemer information; only current event managers
may download them. Responses are private/no-store and spreadsheet formulas are escaped.
