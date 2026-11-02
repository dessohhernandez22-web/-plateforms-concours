"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Imprimer / Enregistrer en PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
    >
      <Printer className="size-4" aria-hidden />
      {label}
    </button>
  );
}
