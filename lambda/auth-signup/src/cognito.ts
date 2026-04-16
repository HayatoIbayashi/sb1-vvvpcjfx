import crypto from 'crypto';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import type { CognitoSignUpReq } from './types.js';

const REGION = process.env.COGNITO_REGION || 'ap-northeast-1';
const CLIENT_ID = process.env.COGNITO_CLIENT_ID as string;
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET; // optional

function secretHash(username: string): string | undefined {
  if (!CLIENT_SECRET) return undefined;
  const hmac = crypto.createHmac('sha256', CLIENT_SECRET);
  hmac.update(username + CLIENT_ID);
  return hmac.digest('base64');
}

const cognito = new CognitoIdentityProviderClient({ region: REGION });

function buildUserAttributes(payload: CognitoSignUpReq) {
  const attributes = [
    { Name: 'email', Value: payload.email },
  ];

  if (payload.displayName) {
    attributes.push({ Name: 'name', Value: payload.displayName });
    attributes.push({ Name: 'preferred_username', Value: payload.displayName });
  }

  if (payload.gender) {
    attributes.push({ Name: 'gender', Value: payload.gender });
  }

  return attributes;
}

export async function signUpToCognito(payload: CognitoSignUpReq) {
  if (!CLIENT_ID) throw new Error('Missing env: COGNITO_CLIENT_ID');
  const params = {
    ClientId: CLIENT_ID,
    Username: payload.email,
    Password: payload.password,
    SecretHash: secretHash(payload.email),
    UserAttributes: buildUserAttributes(payload),
  };
  const res = await cognito.send(new SignUpCommand(params));
  return { userSub: res.UserSub as string, userConfirmed: !!res.UserConfirmed };
}
