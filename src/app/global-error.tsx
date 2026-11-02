"use client";

export default function GlobalError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f7f4",
          color: "#17231e",
          fontFamily: "system-ui, sans-serif",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <main style={{ maxWidth: "480px" }}>
          <p style={{ color: "#94400c", fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase" }}>
            Service momentanément indisponible
          </p>
          <h1 style={{ fontSize: "28px", margin: "12px 0" }}>
            Une erreur inattendue est survenue.
          </h1>
          <p style={{ color: "#57534e", fontSize: "14px", lineHeight: 1.6 }}>
            Veuillez recharger la page. Si le problème persiste, réessayez plus tard.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: "20px",
              border: 0,
              borderRadius: "12px",
              background: "#b45309",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 600,
              padding: "12px 20px",
            }}
          >
            Recharger
          </button>
        </main>
      </body>
    </html>
  );
}
