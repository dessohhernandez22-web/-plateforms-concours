export type CandidateActionState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export const initialCandidateState: CandidateActionState = { ok: false };
