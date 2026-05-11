import { upsertUserAndProfile } from './db.js';
import type { UpsertUserAndProfileReq, UpsertUserAndProfileRes } from './types.js';

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}

export const handler = async (event: UpsertUserAndProfileReq): Promise<UpsertUserAndProfileRes> => {
  if (!event?.userId || !event?.email) {
    return { ok: false, message: 'userId and email are required' };
  }

  try {
    await upsertUserAndProfile({
      userId: event.userId,
      email: event.email,
      gender: event.gender ?? null,
      age: event.age ?? null,
      prefecture: event.prefecture ?? null,
      displayName: event.displayName ?? null,
    });
    return { ok: true };
  } catch (error: unknown) {
    return { ok: false, message: getErrorMessage(error, 'DB error') };
  }
};
