# Hacker application baseline

The user requested the complete Storke hacker application and explicitly authorized
resetting submitted demo applications. This replaces the earlier miniature hacker
form without legacy-version compatibility. Accounts, event configuration, and
memberships are retained. Future incompatible revisions can use the existing form
version metadata; there is no historical application variant to maintain now.

## Reference data and fields

The reference checkout stores its lists as TypeScript arrays, not JSON. The full
school and major arrays and the demographic/study/shirt options were copied from
`../storke/src/lib/constants/` into `src/lib/options/`. Source entries are retained;
the selector removes duplicates and puts UC Berkeley first instead of UCSB.
These static lists contain no applicant records and require no API or credentials.
Graduation years retain Storke's 2026–2035 options; update the list for future events.

The hacker form collects:

- Name, introduction, and optional portfolio link retained from the existing portal.
- Phone number, date of birth, gender/ethnicity (including prefer-not-to-answer),
  T-shirt size, ten dietary choices, and additional dietary details.
- University, level of study, graduation year, major, technical skill level, and
  number of hackathons attended. University and major use searchable dropdowns;
  the other categorical lists use the same searchable control where appropriate.
- Address lines, city, state/province, postal code, and country.
- Three optional essays, each capped at 500 characters: motivation, building/learning,
  and a technical challenge. Existing storage keys remain `interests`, `ambition`,
  and `experience`; labels and meaning follow Storke's corresponding questions.
- A required PDF resume for hacker submission, with the existing private 2 MiB
  upload/preview and frozen-on-submission behavior. Mentor resumes stay optional.
- Required MLH code-of-conduct/privacy acknowledgements and an optional mailing-list
  opt-in. These default unchecked and are validated on submission. Recording an
  acknowledgement does not send data or email to MLH; no external MLH integration
  or mailing-list subscription is performed by this demo.

The main cards follow Storke's form layout and shared Colmena typography/colors.
Additional dietary details remain visible so they can describe a selected allergy,
not only “Other.” Postal codes support international addresses instead of enforcing
Storke's US-only ZIP expression. Essays are optional as in the reference. Partial
drafts allow missing selections; final submission validates list membership, phone,
calendar date, graduation year, integer hackathon count, address, consents, and PDF.

## Searchable selections

`SearchSelect.svelte` is a native input/listbox combobox with arrow-key navigation,
Enter selection, Escape dismissal, ordinary Tab navigation, and click selection.
It uses stable Svelte IDs and announces expanded/current-option state. Search ignores
case/diacritics, matches words and abbreviations, and recognizes UC campus aliases.
The popup opens upward when space is limited. It renders at most 100 matching options
at once; typing searches the entire list. Unknown values cannot be submitted as a
university or major; both source lists provide an “Other (not listed)” option.
Only a selected option enters the hidden form field, so an unfinished search does
not overwrite an earlier selection. The dropdown closes on outside click or blur.

Radio inputs and checkboxes have explicit 17px sizing. They are excluded from
full-width text-input styles; hidden combobox inputs are excluded too.

## Persistence, review, and autosave

`hacker_profile` is a typed relational table keyed to `hacker_answer`. Personal and
operational details are kept outside ordinary application/review selects. Profile
fields use bounded text (including numeric form values, preserving blank drafts)
and actual booleans for checkboxes. Submission validates numeric strings before
storing them. The application's existing `organization` column stores the selected
university, keeping event queries and school analytics consistent without a duplicate
university column. The three essay columns stay in `hacker_answer`.

Profile, answers, resume, submission, and version changes commit together in the
existing SQLite immediate transaction. A stale writer cannot overwrite any part
of another save. Read-only submitted applications show their complete stored form.
Admission review receives only academic fields and essays, not the profile's
address, phone, birthday, gender, ethnicity, dietary or consent fields. Resumes
remain applicant-provided documents, so this is not anonymous/blind review.
Event-day staff receive submitted dietary restrictions alongside confirmation notes.
Manager-only application CSV/JSON exports include the full submitted profile;
private drafts and auth data remain excluded.

As in Storke, changes autosave after 15 seconds of inactivity. Manual save/submit
and autosave share one persistence path. The client sends the version it last
successfully saved and serializes in-flight requests. It keeps editing enabled
during draft saves, tracks edits made during the request, and schedules another
save when needed. Failures remain visible and retain unsaved inputs. The response
updates version/resume metadata without reloading the form or replacing newer
input. Submission disables editing while pending and reloads the locked server view.
Navigation warns about unsaved changes; timers stop on navigation/unmount. Autosave
requires JavaScript, like the existing authenticated editor.

## Development reset

Migration 0005 only adds `hacker_profile`; it does not delete data on deployment.
The authorized greenfield reset is an explicit development script:

```sh
pnpm db:migrate
pnpm demo:reset-applications --confirm
pnpm db:seed
```

The reset refuses production mode and creates a SQLite backup under `data/backups/`
before deleting applications and their dependent resumes, reviews, claims, decisions,
releases, attendance, and meals. Sponsor inventory is retained but claims are cleared.
Application-related audit history is removed; event/team and sponsor setup history
remains. Accounts, events, and memberships are preserved. The seed rebuilds synthetic
complete hacker applications and PDFs, including the published waitlist and accepted
demo accounts. Never run this reset against real admissions data.
