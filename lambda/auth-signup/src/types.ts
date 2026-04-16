export type SignUpReq = {
  email: string;
  password: string;
  gender?: string | null;
  age?: number | null;
  prefecture?: string | null;
  displayName?: string | null;
};

export type CognitoSignUpReq = {
  email: string;
  password: string;
  gender?: string | null;
  displayName?: string | null;
};

export type UpsertUserAndProfileReq = {
  userId: string;
  email: string;
  gender?: string | null;
  age?: number | null;
  prefecture?: string | null;
  displayName?: string | null;
};

export type OkRes = { ok: true };
export type ErrorRes = { code: string; message: string };
export type UpsertUserAndProfileRes = { ok: true } | { ok: false; message: string };
