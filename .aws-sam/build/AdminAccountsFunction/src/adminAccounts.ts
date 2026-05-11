import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminDeleteUserAttributesCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  AdminListGroupsForUserCommand,
  AdminRemoveUserFromGroupCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
  CreateGroupCommand,
  ListUsersInGroupCommand,
  type AdminGetUserCommandOutput,
  type AttributeType,
  type UserType,
} from '@aws-sdk/client-cognito-identity-provider';

export type AdminAccountRole = 'admin' | 'super_admin';

export type AdminAccountRecord = {
  id: string;
  email: string;
  name: string | null;
  role: AdminAccountRole;
  enabled: boolean;
  status: string;
  created_at: string | null;
  updated_at: string | null;
};

export type CreateAdminAccountInput = {
  email: string;
  name: string | null;
  password: string;
  role: AdminAccountRole;
};

export type UpdateAdminAccountInput = {
  email: string;
  name: string | null;
  role: AdminAccountRole;
};

const ROLE_TO_GROUP: Record<AdminAccountRole, string> = {
  admin: 'admin',
  super_admin: 'super_admin',
};

const cognito = new CognitoIdentityProviderClient({
  region: process.env.COGNITO_REGION || 'ap-northeast-1',
});

function getUserPoolId() {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  if (!userPoolId) {
    throw new Error('Missing env: COGNITO_USER_POOL_ID');
  }
  return userPoolId;
}

function getAttribute(attributes: AttributeType[] | undefined, attributeName: string) {
  const match = attributes?.find((attribute) => attribute.Name === attributeName);
  return match?.Value ?? null;
}

function toIsoString(value?: Date) {
  return value ? value.toISOString() : null;
}

function mapListUser(user: UserType, role: AdminAccountRole): AdminAccountRecord {
  const email = getAttribute(user.Attributes, 'email') ?? user.Username ?? '';
  return {
    id: user.Username ?? email,
    email,
    name: getAttribute(user.Attributes, 'name'),
    role,
    enabled: user.Enabled ?? true,
    status: user.UserStatus ?? 'UNKNOWN',
    created_at: toIsoString(user.UserCreateDate),
    updated_at: toIsoString(user.UserLastModifiedDate),
  };
}

function mapAdminUser(user: AdminGetUserCommandOutput, role: AdminAccountRole): AdminAccountRecord {
  const email = getAttribute(user.UserAttributes, 'email') ?? user.Username ?? '';
  return {
    id: user.Username ?? email,
    email,
    name: getAttribute(user.UserAttributes, 'name'),
    role,
    enabled: user.Enabled ?? true,
    status: user.UserStatus ?? 'UNKNOWN',
    created_at: toIsoString(user.UserCreateDate),
    updated_at: toIsoString(user.UserLastModifiedDate),
  };
}

function isAwsError(error: unknown, name: string) {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === name;
}

async function ensureGroupExists(role: AdminAccountRole) {
  try {
    await cognito.send(new CreateGroupCommand({
      UserPoolId: getUserPoolId(),
      GroupName: ROLE_TO_GROUP[role],
      Description: role === 'super_admin' ? 'Super administrators' : 'Administrators',
    }));
  } catch (error) {
    if (isAwsError(error, 'GroupExistsException')) {
      return;
    }
    throw error;
  }
}

async function listUsersInRole(role: AdminAccountRole) {
  await ensureGroupExists(role);

  const items: AdminAccountRecord[] = [];
  let nextToken: string | undefined;

  do {
    const res = await cognito.send(new ListUsersInGroupCommand({
      UserPoolId: getUserPoolId(),
      GroupName: ROLE_TO_GROUP[role],
      Limit: 60,
      NextToken: nextToken,
    }));

    for (const user of res.Users ?? []) {
      items.push(mapListUser(user, role));
    }

    nextToken = res.NextToken;
  } while (nextToken);

  return items;
}

async function resolveRoleForUser(username: string): Promise<AdminAccountRole | null> {
  const res = await cognito.send(new AdminListGroupsForUserCommand({
    UserPoolId: getUserPoolId(),
    Username: username,
    Limit: 60,
  }));

  const groupNames = new Set((res.Groups ?? []).map((group) => group.GroupName).filter(Boolean));
  if (groupNames.has(ROLE_TO_GROUP.super_admin)) return 'super_admin';
  if (groupNames.has(ROLE_TO_GROUP.admin)) return 'admin';
  return null;
}

async function syncRoleGroups(username: string, role: AdminAccountRole) {
  await Promise.all([
    ensureGroupExists('admin'),
    ensureGroupExists('super_admin'),
  ]);

  for (const currentRole of ['admin', 'super_admin'] as const) {
    if (currentRole === role) continue;
    try {
      await cognito.send(new AdminRemoveUserFromGroupCommand({
        UserPoolId: getUserPoolId(),
        Username: username,
        GroupName: ROLE_TO_GROUP[currentRole],
      }));
    } catch (error) {
      if (isAwsError(error, 'ResourceNotFoundException') || isAwsError(error, 'UserNotFoundException')) {
        continue;
      }
      throw error;
    }
  }

  await cognito.send(new AdminAddUserToGroupCommand({
    UserPoolId: getUserPoolId(),
    Username: username,
    GroupName: ROLE_TO_GROUP[role],
  }));
}

export async function listAdminAccounts(query?: { q?: string; role?: AdminAccountRole | null }) {
  const [admins, superAdmins] = await Promise.all([
    listUsersInRole('admin'),
    listUsersInRole('super_admin'),
  ]);

  const records = new Map<string, AdminAccountRecord>();

  for (const account of [...admins, ...superAdmins]) {
    const existing = records.get(account.id);
    if (!existing || account.role === 'super_admin') {
      records.set(account.id, account);
    }
  }

  let items = Array.from(records.values()).sort((a, b) => {
    const left = a.created_at ?? '';
    const right = b.created_at ?? '';
    return right.localeCompare(left);
  });

  if (query?.role) {
    items = items.filter((item) => item.role === query.role);
  }

  const normalizedQuery = query?.q?.trim().toLowerCase();
  if (normalizedQuery) {
    items = items.filter((item) => {
      const haystack = [item.email, item.name ?? '', item.role].join(' ').toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }

  return items;
}

export async function getAdminAccount(username: string) {
  const user = await cognito.send(new AdminGetUserCommand({
    UserPoolId: getUserPoolId(),
    Username: username,
  }));

  const role = await resolveRoleForUser(username);
  if (!role) return null;
  return mapAdminUser(user, role);
}

export async function createAdminAccount(input: CreateAdminAccountInput) {
  await Promise.all([
    ensureGroupExists('admin'),
    ensureGroupExists('super_admin'),
  ]);

  const created = await cognito.send(new AdminCreateUserCommand({
    UserPoolId: getUserPoolId(),
    Username: input.email,
    TemporaryPassword: input.password,
    MessageAction: 'SUPPRESS',
    UserAttributes: [
      { Name: 'email', Value: input.email },
      { Name: 'email_verified', Value: 'true' },
      ...(input.name ? [{ Name: 'name', Value: input.name }] : []),
    ],
  }));

  const username = created.User?.Username ?? input.email;

  await cognito.send(new AdminSetUserPasswordCommand({
    UserPoolId: getUserPoolId(),
    Username: username,
    Password: input.password,
    Permanent: true,
  }));

  await syncRoleGroups(username, input.role);

  return getAdminAccount(username);
}

export async function updateAdminAccount(username: string, input: UpdateAdminAccountInput) {
  await cognito.send(new AdminUpdateUserAttributesCommand({
    UserPoolId: getUserPoolId(),
    Username: username,
    UserAttributes: [
      { Name: 'email', Value: input.email },
      { Name: 'email_verified', Value: 'true' },
      ...(input.name ? [{ Name: 'name', Value: input.name }] : []),
    ],
  }));

  if (!input.name) {
    await cognito.send(new AdminDeleteUserAttributesCommand({
      UserPoolId: getUserPoolId(),
      Username: username,
      UserAttributeNames: ['name'],
    }));
  }

  await syncRoleGroups(username, input.role);

  return getAdminAccount(username);
}

export async function deleteAdminAccount(username: string) {
  await cognito.send(new AdminDeleteUserCommand({
    UserPoolId: getUserPoolId(),
    Username: username,
  }));
}
