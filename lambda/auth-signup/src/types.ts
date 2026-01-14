export type SignUpReq = {
  email: string;
  password: string;
  gender?: string | null;
  age?: number | null;
  prefecture?: string | null;
  displayName?: string | null;
};

export type OkRes = { ok: true };
export type ErrorRes = { code: string; message: string };
