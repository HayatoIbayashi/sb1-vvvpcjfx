const MOCK_PURCHASED_VALUES = new Set(['1', 'true', 'purchased', 'completed']);

export function isMockPurchasedSearch(search: string) {
  const value = new URLSearchParams(search).get('mockPurchase');
  if (!value) {
    return false;
  }

  return MOCK_PURCHASED_VALUES.has(value.toLowerCase());
}
