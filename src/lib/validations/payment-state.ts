export type PaymentActionState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  paymentId?: string;
  reference?: string;
  checkoutUrl?: string;
};

export const initialPaymentState: PaymentActionState = { ok: false };
