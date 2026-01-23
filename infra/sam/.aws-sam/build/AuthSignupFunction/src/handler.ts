import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { signUpToCognito } from './cognito.js';
import { upsertUserAndProfile } from './db.js';
import type { SignUpReq } from './types.js';

function response(statusCode: number, body: unknown, headers?: Record<string, string>): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
    body: JSON.stringify(body),
  };
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    if (event.requestContext.http.method !== 'POST') {
      return response(405, { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
    }

    const body = event.body ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf-8') : event.body) : '{}';
    const payload = JSON.parse(body) as SignUpReq;

    // Basic validation
    if (!payload.email || !payload.password) {
      return response(400, { code: 'VALIDATION_ERROR', message: 'email and password are required' });
    }
    if (payload.age != null && (payload.age < 0 || payload.age > 120)) {
      return response(400, { code: 'VALIDATION_ERROR', message: 'age must be 0..120' });
    }

    // 1) Cognito SignUp
    let userSub: string;
    try {
      const { userSub: sub } = await signUpToCognito(payload.email, payload.password);
      userSub = sub;
    } catch (e: any) {
      const msg = e?.name || e?.message || 'Cognito error';
      if (msg === 'UsernameExistsException') {
        return response(409, { code: 'USERNAME_EXISTS', message: 'User already exists' });
      }
      return response(500, { code: 'COGNITO_ERROR', message: msg });
    }

    // 2) DB upsert (users + profiles)
    try {
      await upsertUserAndProfile({
        userId: userSub,
        email: payload.email,
        gender: payload.gender ?? null,
        age: payload.age ?? null,
        prefecture: payload.prefecture ?? null,
        displayName: payload.displayName ?? null,
      });
    } catch (e: any) {
      return response(500, { code: 'DB_ERROR', message: e?.message || 'DB error' });
    }

    return response(200, { ok: true });
  } catch (e: any) {
    return response(500, { code: 'UNEXPECTED', message: e?.message || 'Unexpected error' });
  }
};
