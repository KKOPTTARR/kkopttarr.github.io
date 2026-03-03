export const TIER_ORDER = ['Bronze', 'Silver', 'Gold', 'Diamond']

export const TIER_LABELS = { Bronze: '铜', Silver: '银', Gold: '金', Diamond: '钻' }

export function nextTierOf(tier) {
  return TIER_ORDER[TIER_ORDER.indexOf(tier) + 1] ?? tier
}

export function nextTierLabel(t) {
  const map = { Silver: '⭐白银', Gold: '⭐⭐黄金', Diamond: '⭐⭐⭐钻石' }
  return map[t] || t
}
