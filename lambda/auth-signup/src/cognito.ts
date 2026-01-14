import crypto from 'crypto';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider';

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

export async function signUpToCognito(email: string, password: string) {
  if (!CLIENT_ID) throw new Error('Missing env: COGNITO_CLIENT_ID');
  const params = {
    ClientId: CLIENT_ID,
    Username: email,
    Password: password,
    SecretHash: secretHash(email),
    UserAttributes: [
      { Name: 'email', Value: email },
    ],
  };
  const res = await cognito.send(new SignUpCommand(params));
  return { userSub: res.UserSub as string, userConfirmed: !!res.UserConfirmed };
}

