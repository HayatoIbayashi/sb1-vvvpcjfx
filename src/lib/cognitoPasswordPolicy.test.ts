import { describe, expect, it } from 'vitest';
import { getCognitoPasswordPolicyError, getCognitoPasswordPolicyMessage } from './cognitoPasswordPolicy';

describe('cognitoPasswordPolicy', () => {
  it('accepts passwords that satisfy the Cognito policy', () => {
    expect(getCognitoPasswordPolicyError('Aa1!aaaa')).toBeNull();
  });

  it('rejects passwords that do not satisfy the Cognito policy', () => {
    expect(getCognitoPasswordPolicyError('short')).toBe(getCognitoPasswordPolicyMessage());
    expect(getCognitoPasswordPolicyError('password123')).toBe(getCognitoPasswordPolicyMessage());
  });
});
