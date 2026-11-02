"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  createRegistrationPaymentAction,
  submitRegistrationPaymentProofAction,
} from "@/server/actions/payment";
import { uploadMediaFile } from "@/lib/upload-client";
import { initialPaymentState } from "@/lib/validations/payment-state";

type UploadedMedia = {
  id: string;
  url: string;
  type: string;
  mimeType: string;
};

export function PaymentForm({
  candidateId,
  amount,
  existingPayment,
  saspayEnabled,
}: {
  candidateId: string;
  amount: number;
  saspayEnabled: boolean;
  existingPayment: {
    id: string;
    reference: string;
    status: string;
    provider: string;
    payerName: string | null;
    payerPhone: string | null;
    declaredTransactionId: string | null;
    proofMediaId: string | null;
    checkoutUrl: string | null;
  } | null;
}) {
  const [createState, createAction] = useActionState(
    createRegistrationPaymentAction,
    initialPaymentState,
  );
  const [proofState, proofAction] = useActionState(
    submitRegistrationPaymentProofAction,
    initialPaymentState,
  );
  const [proof, setProof] = useState<UploadedMedia | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [provider, setProvider] = useState<"SASPAY" | "MANUAL">(
    existingPayment?.provider === "MANUAL" || !saspayEnabled ? "MANUAL" : "SASPAY",
  );

  const paymentId = existingPayment?.id ?? createState.paymentId;
  const isSaspayActive = Boolean(
    createState.checkoutUrl ||
      existingPayment?.checkoutUrl ||
      existingPayment?.provider === "SASPAY" ||
      (!existingPayment && provider === "SASPAY"),
  );

  async function uploadProof(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const payload = await uploadMediaFile(file, "payment-proof");
      setProof(payload);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Échec de l'envoi.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-stone-900">Montant à payer</h2>
        <p className="mt-1 text-2xl font-bold text-clay-700">{amount.toLocaleString("fr-FR")} F CFA</p>
        <p className="mt-2 text-sm text-stone-600">
          {isSaspayActive
            ? "Payez le montant exact affiché sur SasPay en XOF, puis revenez ici pour envoyer votre reçu."
            : "Effectuez le transfert Mobile Money en indiquant la référence générée, puis envoyez votre preuve de paiement."}
        </p>
        <div className="mt-4 rounded-xl bg-stone-50 p-4 text-sm text-stone-700">
          <p className="font-semibold">Mode de paiement</p>
          <p className="mt-1">
            {isSaspayActive
              ? "SasPay · Mobile Money · Cartes · Paiements sécurisés"
              : "Mobile Money manuel · vérification par l'organisation"}
          </p>
        </div>
      </section>

      {!paymentId ? (
        <form action={createAction} className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6">
          <input type="hidden" name="candidateId" value={candidateId} />
          <input type="hidden" name="provider" value={provider} />
          <h2 className="text-lg font-semibold text-stone-900">Informations du payeur</h2>
          {saspayEnabled && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(
                [
                  { value: "SASPAY", label: "Paiement en ligne", hint: "SasPay · Mobile Money / carte" },
                  { value: "MANUAL", label: "Mobile Money manuel", hint: "Preuve à envoyer" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setProvider(option.value)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm ${
                    provider === option.value
                      ? "border-clay-600 bg-clay-50 text-clay-800"
                      : "border-stone-300 bg-white text-stone-600"
                  }`}
                >
                  <span className="block font-semibold">{option.label}</span>
                  <span className="mt-0.5 block text-xs">{option.hint}</span>
                </button>
              ))}
            </div>
          )}
          {(createState.message || createState.errors) && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {createState.message}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-stone-700">Nom complet *</span>
              <input
                name="payerName"
                required
                defaultValue={existingPayment?.payerName ?? ""}
                className="rounded-xl border border-stone-300 px-3 py-2"
              />
              {createState.errors?.payerName && (
                <span className="text-xs text-red-600">{createState.errors.payerName[0]}</span>
              )}
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-stone-700">Numéro Mobile Money *</span>
              <input
                name="payerPhone"
                required
                defaultValue={existingPayment?.payerPhone ?? ""}
                className="rounded-xl border border-stone-300 px-3 py-2"
              />
              {createState.errors?.payerPhone && (
                <span className="text-xs text-red-600">{createState.errors.payerPhone[0]}</span>
              )}
            </label>
          </div>
          <SubmitButton>
            {provider === "SASPAY" ? "Payer via SasPay" : "Créer le paiement manuel"}
          </SubmitButton>
        </form>
      ) : (
        <section className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Référence de paiement</h2>
              <p className="mt-1 text-xl font-bold tracking-wide text-clay-700">
                {existingPayment?.reference ?? createState.reference}
              </p>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              {isSaspayActive ? "Redirection vers Saspay" : "À compléter"}
            </span>
          </div>
          <p className="text-sm text-stone-600">
            {isSaspayActive
              ? `Ouvrez le lien SasPay, saisissez exactement ${amount.toLocaleString("fr-FR")} XOF, puis revenez ici pour envoyer votre reçu.`
              : `Effectuez le transfert de ${amount.toLocaleString("fr-FR")} F CFA en indiquant cette référence. Envoyez ensuite la capture ou le reçu ci-dessous.`}
          </p>

          {(createState.checkoutUrl || existingPayment?.checkoutUrl) && (
            <a
              href={createState.checkoutUrl ?? existingPayment?.checkoutUrl ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-clay-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-clay-700"
            >
              Payer sur SasPay
            </a>
          )}

          <form action={proofAction} className="flex flex-col gap-4">
            <input type="hidden" name="paymentId" value={paymentId} />
            <input type="hidden" name="proofMediaId" value={proof?.id ?? ""} />
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-stone-700">N° de transaction (optionnel)</span>
              <input
                name="declaredTransactionId"
                defaultValue={existingPayment?.declaredTransactionId ?? ""}
                className="rounded-xl border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-stone-700">Preuve de paiement (capture, reçu) *</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadProof(file);
                }}
                className="text-sm"
              />
              {uploading && <p className="text-xs text-stone-500">Envoi en cours...</p>}
              {proof && <p className="text-xs font-medium text-green-700">Preuve envoyée.</p>}
              {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
              {proofState.errors?.proofMediaId && (
                <p className="text-xs text-red-600">{proofState.errors.proofMediaId[0]}</p>
              )}
            </label>
            {(proofState.message) && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {proofState.message}
              </p>
            )}
            <SubmitButton disabled={!proof || uploading}>Envoyer la preuve de paiement</SubmitButton>
          </form>
        </section>
      )}
    </div>
  );
}

function SubmitButton({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-xl bg-clay-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-clay-700 disabled:opacity-60"
    >
      {pending ? "Envoi..." : children}
    </button>
  );
}
