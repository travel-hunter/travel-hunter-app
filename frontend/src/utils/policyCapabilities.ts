import type { Policy } from "../api";

export function canUsePolicyActions(_policy: Policy): boolean {
  return true;
}
