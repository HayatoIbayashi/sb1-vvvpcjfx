import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  createAdminAccount,
  deleteAdminAccount,
  listAdminAccounts,
  updateAdminAccount,
  type AdminAccountRole,
} from './adminAccounts.js';

function response(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

class ValidationError extends Error {
  code = 'VALIDATION_ERROR';
}

type AdminAccountCreateInput = {
  email: string;
  name: string | null;
  password: string;
  role: AdminAccountRole;
};

type AdminAccountUpdateInput = {
  email: string;
  name: string | null;
  role: AdminAccountRole;
};

function parseJsonBody(event: APIGatewayProxyEventV2) {
  if (!event.body) return null;
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf-8')
    : event.body;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeString(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function requireString(value: unknown, fieldName: string) {
  const normalized = normalizeString(value);
  if (!normalized) throw new ValidationError(`${fieldName} is required`);
  return normalized;
}

function parseAdminRole(value: unknown): AdminAccountRole {
  if (value === 'admin' || value === 'super_admin') return value;
  throw new ValidationError('role must be admin or super_admin');
}

function parseLimit(value?: string | null) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.min(parsed, 500);
}

function parseOffset(value?: string | null) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function buildAdminAccountCreateInput(body: Record<string, unknown> | null): AdminAccountCreateInput {
  if (!body) throw new ValidationError('Invalid JSON body');

  const email = requireString(body.email, 'email');
  if (!email.includes('@')) {
    throw new ValidationError('email must be valid');
  }

  const password = requireString(body.password, 'password');
  if (password.length < 8) {
    throw new ValidationError('password must be at least 8 characters');
  }

  return {
    email,
    name: normalizeString(body.name),
    password,
    role: parseAdminRole(body.role),
  };
}

function buildAdminAccountUpdateInput(body: Record<string, unknown> | null): AdminAccountUpdateInput {
  if (!body) throw new ValidationError('Invalid JSON body');

  const email = requireString(body.email, 'email');
  if (!email.includes('@')) {
    throw new ValidationError('email must be valid');
  }

  return {
    email,
    name: normalizeString(body.name),
    role: parseAdminRole(body.role),
  };
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const method = event.requestContext.http.method;
    const path = event.rawPath || '';
    const adminAccountsMatch = path.match(/^\/v1\/admin\/admin-users(?:\/([^/]+))?$/);

    if (!adminAccountsMatch) {
      return response(404, { code: 'NOT_FOUND', message: 'Route not found' });
    }

    const adminAccountId = adminAccountsMatch[1] ? decodeURIComponent(adminAccountsMatch[1]) : null;

    try {
      if (method === 'GET' && !adminAccountId) {
        const q = event.queryStringParameters?.q?.trim();
        const role = event.queryStringParameters?.role?.trim();
        const limit = parseLimit(event.queryStringParameters?.limit);
        const offset = parseOffset(event.queryStringParameters?.offset);

        const items = await listAdminAccounts({
          q: q || undefined,
          role: role === 'admin' || role === 'super_admin' ? role : null,
        });

        const from = offset ?? 0;
        const to = limit != null ? from + limit : undefined;
        return response(200, { items: items.slice(from, to) });
      }

      if (method === 'POST' && !adminAccountId) {
        const created = await createAdminAccount(buildAdminAccountCreateInput(parseJsonBody(event)));
        if (!created) {
          return response(500, { code: 'COGNITO_ERROR', message: 'Failed to create admin account' });
        }
        return response(201, created);
      }

      if (adminAccountId && method === 'PUT') {
        const updated = await updateAdminAccount(
          adminAccountId,
          buildAdminAccountUpdateInput(parseJsonBody(event)),
        );
        if (!updated) {
          return response(404, { code: 'NOT_FOUND', message: 'Admin account not found' });
        }
        return response(200, updated);
      }

      if (adminAccountId && method === 'DELETE') {
        await deleteAdminAccount(adminAccountId);
        return response(200, { ok: true, deleted: true });
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        return response(400, { code: error.code, message: error.message });
      }
      if (typeof error === 'object' && error !== null && 'name' in error) {
        const errorName = String(error.name);
        if (errorName === 'UsernameExistsException' || errorName === 'AliasExistsException') {
          return response(409, { code: 'EMAIL_CONFLICT', message: 'Email already in use' });
        }
        if (errorName === 'UserNotFoundException') {
          return response(404, { code: 'NOT_FOUND', message: 'Admin account not found' });
        }
        if (errorName === 'InvalidPasswordException') {
          return response(400, { code: 'VALIDATION_ERROR', message: 'Password does not meet policy' });
        }
      }
      throw error;
    }

    return response(405, { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return response(500, { code: 'COGNITO_ERROR', message });
  }
};
