# ERD To API Mapping Eval

## Sources

- ERD SQL: `../files/travel_hunter_schema_v0.3.sql`
- ERD analysis: `../files/ERD_v0.3_결정안건_상세분석.md`
- API contract: `docs/mvp-api-contract.md`

## ERD v0.3 Decisions To Preserve

- `policies.slug` exists and powers policy detail lookup.
- `trips.slug` is not part of the current decision.
- `trip_invites` exists for invite link lifecycle.
- `users` remains the unified user/profile table for the current phase.
- `users.gender` exists.
- `users.preferred_regions` stores user interest regions.
- `users.travel_style` and `users.travel_budget` are v0.3.1 profile persistence extension fields.
- `user_saved_policies` is the v0.3.2 standalone saved policy persistence extension table.
- Trip child tables use the `trip_*` singular prefix, such as `trip_days`, `trip_members`, `trip_policies`, `trip_places`, and `trip_invites`.

## API Mapping Checks

| API field | DB source | Notes |
|---|---|---|
| `Policy.slug` | `policies.slug` | Detail lookup key |
| `Policy.org` | `policies.organization` | API uses concise frontend label |
| `Policy.deadline` | `policies.end_date` | API field remains `deadline` |
| `Policy.amount` | `policies.benefit_amount` + `policies.benefit_detail` | API may compose display text |
| `Policy.summary` | `policies.policy_comment` | Display summary |
| `Policy.category` | `policies.policy_type` | Frontend category label |
| `Policy.documents` | `policy_documents.document_name[]` | Joined list |
| `Policy.officialUrl` | `policies.official_url` | External application/detail link, nullable |
| `Policy.applyUrl` | `policies.apply_url` | External application deep link, nullable |
| `SavePolicyResponse.policyId` | `policies.slug` through `user_saved_policies.policy_id` | Standalone saved policy |
| `SavePolicyResponse.saved` | `user_saved_policies` row existence | Idempotent save response |
| `Trip.id` | `trips.id` | API returns numeric DB id as string |
| `Trip.dates` | `trips.start_date` + `trips.end_date` | Display string |
| `Trip.people` | `trip_members` + `users.nickname` | Joined list |
| `Trip.days` | `trip_days` + `trip_places` | Nested display shape |
| `InviteState.inviteToken` | `trip_invites.invite_token` | Invite link token |
| `InviteState.acceptedAt` | `trip_invites.accepted_at` | Set by DB-backed invite acceptance |
| `Profile.region` | `users.region` | Onboarding/profile preference |
| `Profile.style` | `users.travel_style` | v0.3.1 extension |
| `Profile.budget` | `users.travel_budget` | v0.3.1 extension |

## Non-DB API Values

These are calculated values or UI state and must not be treated as direct DB columns without a deliberate design change:

- `Policy.match`
- `Trip.expectedSaving`
- `InviteState.copied`
- `InviteState.invited`
