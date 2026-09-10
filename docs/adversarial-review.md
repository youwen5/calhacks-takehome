# Final adversarial plan review

This is a design review, not evidence of implemented correctness. Application code
now exists in the workspace; this review does not certify that it satisfies the
contract. Resolutions are incorporated in the architecture's final implementation
contract.

## Final pass: remaining findings

The core design is coherent. No additional product decision is needed to implement
the agreed scope. The following planning issues need explicit treatment:

1. **Medium — claims are a grading dependency, not a later optional add-on.** The
   implementation contract requires a current claim token for every review write,
   but the implementation sequence puts claims after grading. Build acquisition,
   expiration, renewal, and release alongside grading. Multiple-event management
   already satisfies the additional-feature requirement.
2. **Medium — distinguish assignment delivery from current execution scope.** The
   assignment requires a public URL, but the active implementation instruction
   prohibits production deployment. Prepare and locally verify the image and
   persistence; retain public deployment as an outstanding assignment deliverable.
   Neither a successful build nor local container smoke tests satisfy that item.
3. **Medium — acceptance evidence must demonstrate races, not just sequential
   conflicts.** Use independent database connections/processes to contend for the
   same claim and application draft. Assert exactly one acquisition/creation wins,
   stale input survives a conflict, and deadline checks happen after lock waits.
   Test integer score constraints directly as well as through form validation.
4. **Low — historical documents must not imply implementation verification.** The
   earlier documentation-only state is obsolete. Keep design findings separate
   from a dated verification record with commands, results, and untested boundaries.

Retain the explicit scope limits: unranked manual waitlists, portal-only admission
results, independent acceptances across types, immutable completed reviews, and
at most 500 decisions per atomic release. These are intentional product limits,
not missing automatic ranking, capacity management, or whole-event publication.

## Findings ordered by severity

| Severity | Failure scenario                                                                              | Plan correction                                                                                                                  |
| -------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| High     | Manager cannot grade themselves but can publish their own acceptance or read internal notes   | Extend self-ownership restrictions across types, internal reads, decisions, and mixed batches; no implicit platform-admin bypass |
| High     | Stale preview, competing release, or network retry publishes unintended decisions             | Exact revision IDs, all-or-nothing validation, monotonic sequences, bounded batches, release-ID idempotency                      |
| High     | Completed grades change underneath a prepared decision                                        | Completed reviews immutable; prepared decisions reference the completed review version                                           |
| High     | Hidden fields still leak through serialized server data, or organizers see unfinished answers | Explicit applicant projections, draft-answer privacy, and no shared sensitive-response caching                                   |
| High     | Revoked reviewer or stale reacquired lease can still write                                    | Transaction-time membership checks plus lease token and review version                                                           |
| Medium   | User/event-only queries mix hacker and mentor applications                                    | User/event/type uniqueness, one review per application, and paired-type integration coverage                                     |
| Medium   | Redeployment changes old forms/rubrics                                                        | Pin versions when offered publicly and retain version-specific rendering/validation                                              |
| Medium   | SQLite lock wait carries a submission past the deadline                                       | Check server time after acquiring the write transaction                                                                          |
| Medium   | Image cannot run native driver/migrations or schema rollback is assumed automatic             | Test real image early, runtime migration entry point, one instance during updates, tested backup restoration                     |
| Medium   | Provider failure strands new accounts, or fallback exposes verification links publicly        | Explicit live/local modes, recoverable resend, production config validation, no public outbox                                    |
| Medium   | Membership escalation or archival prevents revocation                                         | Explicit role boundaries, last-manager protection, archived-event access administration                                          |
| Medium   | Optional workflows consume the take-home scope                                                | Claims follow core flows; no exports, ranking, automatic promotion, RSVP, admission mail, or workers initially                   |

## Required adversarial acceptance cases

1. Manager/applicant cannot inspect internal reviews or publish their own decision,
   including a second application type or mixed batch. Another non-owner manager can.
2. Overlapping release drafts: one succeeds, the stale one conflicts. Replay returns
   the original result. One invalid item publishes none of the other items. Retry
   after a lost success response is safe.
3. Published waitlist remains visible while promotion is prepared, superseded, or
   cancelled. Inspect serialized page/API data for unreleased-decision leakage.
4. Draft status is distinct from submitted. Organizer lists may count drafts but
   cannot open unfinished answers.
5. Revoke an active reviewer; next save fails. Reacquire an expired claim as the same
   user; the prior claim token remains invalid.
6. One account submits both types at one event and another application at a second
   event. Answers, reviews, permissions, and decisions remain independent.
7. Concurrent draft creation respects uniqueness. Stale save/submit cannot overwrite
   newer input, and conflict responses preserve the user's work.
8. Hold a write lock until after closing; submission fails. Archive after release
   preview; publication fails. Revocation still works on archived events.
9. Deploy new form versions while an earlier event remains active; old questions,
   validation, and rubrics remain available and unchanged.
10. Build/run the Nix image, migrate fresh/existing databases, test migration failure,
    replace the container, and restore a backup with application data intact.
11. Exercise local-outbox and live-email signup/recovery, delivery failures, and
    resend. Outbox files/routes are inaccessible in production.

## Remaining inputs and limits

Implementation can begin without further product clarification. Deployment still
needs a persistent-storage host, public HTTPS domain, and live email credentials/
sender setup. A registry is optional if the image is transferred directly. Local
development and builds require no provider credentials.

This plan does not establish capacity for tens of thousands of concurrent users.
Measure representative seeded data before making throughput claims. One instance
and 500-item release batches favor a small, explainable implementation.

Waitlists are unranked and manager-driven. Multiple type acceptances are independent.
Release is manual and notifications are portal-only. Completed reviews cannot be
edited in this version; decision corrections use a reason and a new published revision.

Core assignment delivery requires both forms, multiple events, permissions, grading,
waitlists, gated release, and persistent public deployment. Current implementation
work stops at locally verified artifacts under the explicit no-production-deployment
instruction. Build review claims alongside grading because review writes require
them; claims cannot replace any core requirement.
