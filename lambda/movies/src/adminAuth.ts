import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import {
  AdminListGroupsForUserCommand,
  CognitoIdentityProviderClient,
  GetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

export type AuthorizedAdminRole = 'admin' | 'super_admin';

export class AuthError extends Error {
  constructor(public statusCode: 401 | 403, message: string) {
    super(message);
  }
}

const cognito = new CognitoIdentityProviderClient({
  region: process.env.COGNITO_REGION || process.env.AWS_REGION || 'ap-northeast-1',
});

function getUserPoolId() {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  if (!userPoolId) {
    throw new Error('Missing env: COGNITO_USER_POOL_ID');
  }
  return userPoolId;
}

function getBearerToken(headers: Record<string, string | undefined> | undefined) {
  const header = headers?.authorization || headers?.Authorization;
  if (!header) return null;
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7) : header;
}

export function authErrorBody(error: AuthError) {
  return {
    code: error.statusCode === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN',
    message: error.message,
  };
}

export async function requireAdminRole(event: APIGatewayProxyEventV2, requiredRole: AuthorizedAdminRole = 'admin') {
  const accessToken = getBearerToken(event.headers);
  if (!accessToken) {
    throw new AuthError(401, 'Authorization required');
  }

  let username: string | undefined;
  try {
    const user = await cognito.send(new GetUserCommand({ AccessToken: accessToken }));
    username = user.Username;
  } catch {
    throw new AuthError(401, 'Invalid authorization token');
  }

  if (!username) {
    throw new AuthError(401, 'Invalid authorization token');
  }

  const groups = await cognito.send(new AdminListGroupsForUserCommand({
    UserPoolId: getUserPoolId(),
    Username: username,
    Limit: 60,
  }));
  const groupNames = new Set((groups.Groups ?? []).map((group) => group.GroupName).filter(Boolean));
  const role: AuthorizedAdminRole | null = groupNames.has('super_admin')
    ? 'super_admin'
    : groupNames.has('admin')
      ? 'admin'
      : null;

  if (!role || (requiredRole === 'super_admin' && role !== 'super_admin')) {
    throw new AuthError(403, 'Admin permission required');
  }

  return role;
}
