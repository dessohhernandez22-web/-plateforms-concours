export type AuthActionState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export const initialAuthState: AuthActionState = { ok: false };
