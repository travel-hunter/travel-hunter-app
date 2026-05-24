# Policy Category URL State Design

## Goal

Keep the selected policy category visible after moving from the policy list to a policy detail page and returning with the back button.

## Approach

The policy list category filter will be backed by the `/policies` URL query string. Selecting `여행상품` will produce `/policies?category=여행상품`; selecting `전체` will remove the query parameter. The list page will derive the active category from `useSearchParams`, so browser history, direct entry, refresh, and back navigation all restore the same selected category.

## Scope

- Persist only the top category tab in the URL for this change.
- Keep region, period, amount, and saved-only filters as local state.
- Keep policy cards linked to `/policies/{slug}` and keep detail back navigation as `navigate(-1)`.
- Ignore unknown category query values by falling back to `전체`.

## Tests

Add a frontend route test proving that `/policies?category=여행상품` renders the `여행상품` tab as active and filters out other categories.
