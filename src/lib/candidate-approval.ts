export type CandidateApprovalEligibility = {
  registrationFee?: number;
  registrationPaymentId?: string | null;
  registrationPayment?: {
    status?: string | null;
  } | null;
};

export function canCandidateBeApproved(
  candidate: CandidateApprovalEligibility,
): boolean {
  if (candidate.registrationFee === 0) return true;
  return Boolean(candidate.registrationPaymentId) && candidate.registrationPayment?.status === "SUCCESS";
}

export function hasContestCapacity(
  maxCandidates: number | null | undefined,
  currentCandidates: number,
): boolean {
  if (!maxCandidates || maxCandidates <= 0) return true;
  return currentCandidates < maxCandidates;
}
