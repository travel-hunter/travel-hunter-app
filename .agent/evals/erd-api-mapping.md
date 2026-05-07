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
- `users.phone_number` and `users.phone_verified_at` are notification-delivery contact extension fields.
- `password_reset_tokens` stores password reset token hashes and usage/expiry metadata.
- `social_accounts` links OAuth provider identities to users.
- `user_saved_policies` is the v0.3.2 standalone saved policy persistence extension table.
- `user_notification_settings` is the standalone per-user notification preference table.
- `notification_deliveries` is the delivery history and duplicate-prevention table for deadline notifications.
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
| `Trip place move` | `trip_places.trip_day_id`, `trip_places.order_num` | Moving a place changes day membership when needed and normalizes affected day ordering |
| `Trip.currentUserRole` | `trips.owner_id` + `trip_members.role` | `owner` when requester owns the trip, otherwise `editor` or `viewer` membership role |
| `InviteState.inviteToken` | `trip_invites.invite_token` | Invite link token |
| `InviteState.acceptedAt` | `trip_invites.accepted_at` | Set by DB-backed invite acceptance |
| `InviteState.role` | `trip_invites.role` | `viewer` or `editor`; accepted invite writes this value to `trip_members.role` for new members |
| `Profile.region` | `users.region` | Onboarding/profile preference |
| `Profile.style` | `users.travel_style` | v0.3.1 extension |
| `Profile.budget` | `users.travel_budget` | v0.3.1 extension |
| `PasswordResetToken.tokenHash` | `password_reset_tokens.token_hash` | Raw token is never stored; API confirm matches by SHA-256 hash |
| `PasswordResetToken.usedAt` | `password_reset_tokens.used_at` | Set after successful reset to prevent reuse |
| `OAuth provider link` | `social_accounts.provider`, `social_accounts.provider_id` | Callback logs in an existing social account or links/creates a user |
| `OAuth user email` | `users.email` | Used as secondary link key when no social account exists |
| `ContactInfo.phoneNumber` | `users.phone_number` | Kakao AlimTalk destination contact, nullable |
| `ContactInfo.phoneVerified` | `users.phone_verified_at != null` | Read-only verification state for this phase |
| `NotificationSettings.deadlineEnabled` | `user_notification_settings.deadline_enabled` | Defaults to true when no row exists |
| `NotificationSettings.deadlineLeadDays` | server constant `[7, 1]` | Not persisted in DB |
| `NotificationDelivery` duplicate key | `notification_deliveries(user_id, policy_id, channel, lead_day, target_deadline_date)` | Prevents duplicate D-7/D-1 sends |
| `NotificationDeliveryTarget.policyId` | `user_saved_policies.policy_id` + `policies.id` | Internal service DTO only; public API unchanged |
| `NotificationDeliveryTarget.targetDeadlineDate` | `policies.end_date` | Candidate when `end_date == today + lead_day` |
| `NotificationDeliveryTarget.deliveryStatus` | `notification_deliveries.status` | `pending` for verified contact, `skipped` for missing/unverified contact |
| `NotificationDispatch.sent` | `notification_deliveries.status`, `provider_message_id`, `sent_at` | SOLAPI accepted response is recorded as `sent` in MVP |
| `NotificationDispatch.failed` | `notification_deliveries.status`, `attempt_count`, `error_message`, `failed_at` | SOLAPI failed response, HTTP error, or timeout is recorded as `failed` |
| `NotificationDispatch.retry` | `notification_deliveries.status`, `attempt_count`, `failed_at` | Retry uses existing failed rows without a new table or status |
| `SolapiWebhook.messageId` | `notification_deliveries.provider_message_id` | Provider-facing webhook lookup key |
| `SolapiWebhook.success` | `notification_deliveries.status`, `sent_at` | SOLAPI final success status `4000` marks the matched delivery `sent` |
| `SolapiWebhook.failure` | `notification_deliveries.status`, `attempt_count`, `error_message`, `failed_at` | SOLAPI final failure statuses mark the matched delivery `failed` |

## Non-DB API Values

These are calculated values or UI state and must not be treated as direct DB columns without a deliberate design change:

- `Policy.match`
- `Trip.expectedSaving`
- `InviteState.copied`
- `InviteState.invited`
