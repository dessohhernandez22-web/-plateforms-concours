export type ContestActionState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export const initialContestState: ContestActionState = { ok: false };
