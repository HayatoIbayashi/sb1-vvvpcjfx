import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

export function getCognitoRegion() {
  return import.meta.env.VITE_COGNITO_REGION ?? 'ap-northeast-1';
}

export function getCognitoClientId() {
  return import.meta.env.VITE_COGNITO_CLIENT_ID ?? '51p21ae4hhsgjtd1jfakg4mpiu';
}

export function createCognitoClient() {
  return new CognitoIdentityProviderClient({ region: getCognitoRegion() });
}
