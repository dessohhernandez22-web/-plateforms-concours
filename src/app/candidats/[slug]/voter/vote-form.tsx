"use client";

import { useActionState, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { uploadMediaFile } from "@/lib/upload-client";
import { calculateVoteSummary } from "@/lib/vote-utils";
import { initialPaymentState } from "@/lib/validations/payment-state";
import { submitPaymentProofAction } from "@/server/actions/payment";
import { createVoteAction, initialVoteState } from "@/server/actions/vote";

type UploadedMedia = {
  id: string;
  url: string;
  type: string;
  mimeType: string;
};

export function VoteForm({
  candidateSlug,
  unitPrice,
  candidateName,
  saspayEnabled,
}: {
  candidateSlug: string;
  unitPrice: number;
  candidateName: string;
  saspayEnabled: boolean;
}) {
  const [quantity, setQuantity] = useState(1);
  const [provider, setProvider] = useState<"SASPAY" | "MANUAL">(
    saspayEnabled ? "SASPAY" : "MANUAL",
  );
  const [state, formAction] = useActionState(createVoteAction, initialVoteState);
  const [proofState, proofAction] = useActionState(submitPaymentProofAction, initialPaymentState);
  const [proof, setProof] = useState<UploadedMedia | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const summary = useMemo(() => calculateVoteSummary(quantity, unitPrice), [quantity, unitPrice]);

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
    <div className="mt-6 flex flex-col gap-5">
      {!state.paymentId ? (
        <form action={formAction} className="flex flex-col gap-5">
          <input type="hidden" name="candidateSlug" value={candidateSlug} />
          <input type="hidden" name="provider" value={provider} />

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

          <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
            Nombre de votes
            <input
              type="number"
              name="quantity"
              min={1}
              max={100}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value || 1))}
              className="h-11 rounded-xl border border-stone-300 bg-white px-3 text-stone-900 focus:border-clay-500 focus:ring-2 focus:ring-clay-200 focus:outline-none"
            />
          </label>

          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <div className="flex items-center justify-between text-sm text-stone-600">
              <span>{summary.quantity} vote(s)</span>
              <span>{summary.unitPrice.toLocaleString("fr-FR")} F CFA / vote</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-stone-200 pt-3 text-base font-semibold text-stone-900">
              <span>Total</span>
              <span>{summary.amount.toLocaleString("fr-FR")} F CFA</span>
            </div>
          </div>

          {state.message && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.message}
            </p>
          )}

          <Button type="submit" className="w-full">
            {provider === "SASPAY" ? "Continuer vers SasPay" : "Créer la commande manuelle"}
          </Button>
        </form>
      ) : (
        <section className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-5">
          <div>
            <h2 className="font-semibold text-stone-900">Commande de vote en attente</h2>
            <p className="mt-1 text-sm text-stone-600">
              {state.quantity} vote(s) pour {candidateName} · Réf. {state.reference}
            </p>
            <p className="mt-1 text-lg font-bold text-clay-700">
              {state.amount?.toLocaleString("fr-FR")} F CFA
            </p>
          </div>
          <p className="text-sm text-stone-600">
            {state.checkoutUrl
              ? "Sur SasPay, saisissez exactement ce montant en XOF. Revenez ensuite ici et joignez le reçu. Les votes seront comptabilisés après vérification."
              : "Effectuez le transfert Mobile Money en indiquant cette référence, puis joignez la preuve de paiement. Les votes seront comptabilisés après vérification."}
          </p>
          {state.checkoutUrl && (
            <a
              href={state.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-clay-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-clay-700"
            >
              Payer sur SasPay
            </a>
          )}
          <form action={proofAction} className="flex flex-col gap-4">
            <input type="hidden" name="paymentId" value={state.paymentId} />
            <input type="hidden" name="proofMediaId" value={proof?.id ?? ""} />
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-stone-700">N° de transaction (optionnel)</span>
              <input name="declaredTransactionId" className="rounded-xl border border-stone-300 px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-stone-700">Preuve de paiement *</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadProof(file);
                }}
                className="text-sm"
              />
              {uploading && <span className="text-xs text-stone-500">Envoi en cours...</span>}
              {proof && <span className="text-xs font-medium text-green-700">Preuve envoyée.</span>}
              {uploadError && <span className="text-xs text-red-600">{uploadError}</span>}
              {proofState.errors?.proofMediaId && (
                <span className="text-xs text-red-600">{proofState.errors.proofMediaId[0]}</span>
              )}
            </label>
            {proofState.message && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {proofState.message}
              </p>
            )}
            <Button type="submit" disabled={!proof || uploading} className="w-full">
              Envoyer la preuve de paiement
            </Button>
          </form>
        </section>
      )}
    </div>
  );
}
