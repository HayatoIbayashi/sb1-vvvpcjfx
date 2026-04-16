const PASSWORD_POLICY_MESSAGE = 'パスワードは8文字以上で、大文字・小文字・数字・記号をそれぞれ1文字以上含めてください。';

export function getCognitoPasswordPolicyMessage() {
  return PASSWORD_POLICY_MESSAGE;
}

export function getCognitoPasswordPolicyError(password: string) {
  if (!password) {
    return null;
  }

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  if (hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSymbol) {
    return null;
  }

  return PASSWORD_POLICY_MESSAGE;
}
