import type { Policy } from "../api";

export function canUsePolicyActions(policy: Policy): boolean {
  if (policy.sourceType == null) {
    return true;
  }

  return policy.sourceType === "internal" || policy.sourceType === "external";
}
