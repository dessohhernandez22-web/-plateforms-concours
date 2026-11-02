export default function LoadingPage() {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="mx-auto flex min-h-[50vh] max-w-6xl flex-col items-center justify-center gap-4 px-5 py-16"
    >
      <span className="size-8 animate-spin rounded-full border-2 border-stone-200 border-t-clay-600" />
      <p className="text-sm text-stone-500">Chargement…</p>
    </main>
  );
}
