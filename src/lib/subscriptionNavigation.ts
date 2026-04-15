type AppLocationLike = Pick<Location, 'pathname' | 'search' | 'hash'>;

export const DEFAULT_MEMBERSHIP_RETURN_TO = '/';
const SUBSCRIPTION_PATH = '/subscription';
const SUBSCRIPTION_COMPLETE_PATH = '/subscription/complete';

export function normalizeReturnTo(
  value?: string | null,
  fallback = DEFAULT_MEMBERSHIP_RETURN_TO,
) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  if (value.startsWith(SUBSCRIPTION_COMPLETE_PATH)) {
    return fallback;
  }

  return value;
}

export function getReturnToFromLocation(location: AppLocationLike) {
  return normalizeReturnTo(`${location.pathname}${location.search}${location.hash}`);
}

function buildPathWithReturnTo(basePath: string, returnTo?: string | null) {
  const normalizedReturnTo = normalizeReturnTo(returnTo, '');

  if (!normalizedReturnTo) {
    return basePath;
  }

  const searchParams = new URLSearchParams({ returnTo: normalizedReturnTo });
  return `${basePath}?${searchParams.toString()}`;
}

export function buildSubscriptionPath(returnTo?: string | null) {
  return buildPathWithReturnTo(SUBSCRIPTION_PATH, returnTo);
}

export function buildSubscriptionCompletionPath(returnTo?: string | null) {
  return buildPathWithReturnTo(SUBSCRIPTION_COMPLETE_PATH, returnTo);
}

export function buildAbsoluteAppUrl(origin: string, relativePath: string) {
  return new URL(relativePath, origin).toString();
}
