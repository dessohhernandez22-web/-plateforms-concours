"use client";

import { useActionState } from "react";

import { verifyPaymentAction } from "@/server/actions/payment";
import { initialPaymentState } from "@/lib/validations/payment-state";

export function PaymentActions({
  paymentId,
  purpose,
  canApprove,
}: {
  paymentId: string;
  purpose: "REGISTRATION" | "VOTE";
  canApprove: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    verifyPaymentAction,
    initialPaymentState,
  );

  return (
    <div className="flex flex-col gap-3">
      {state.message && (
        <p
          role="alert"
          className={`rounded-xl px-3 py-2 text-sm ${
            state.ok
              ? "border border-green-200 bg-green-50 text-green-800"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      )}
      {!canApprove && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          La validation est impossible tant qu&apos;aucune preuve de paiement n&apos;a été envoyée.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <form action={formAction}>
          <input type="hidden" name="paymentId" value={paymentId} />
          <input type="hidden" name="action" value="APPROVE" />
          <button
            type="submit"
            disabled={pending || !canApprove}
            className="rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
          >
            {purpose === "VOTE" ? "Valider le vote" : "Valider et générer le reçu"}
          </button>
        </form>
        <form action={formAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="paymentId" value={paymentId} />
          <input type="hidden" name="action" value="REJECT" />
          <input
            name="reason"
            placeholder="Motif du rejet (facultatif)"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            Rejeter
          </button>
        </form>
      </div>
    </div>
  );
}
