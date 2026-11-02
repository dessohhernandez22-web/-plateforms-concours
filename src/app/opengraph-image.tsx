import { ImageResponse } from "next/og";

import { SITE } from "@/lib/constants";

export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #102d26 0%, #1f4439 55%, #8d4a27 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              background: "#e7b66b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#17372e",
              fontSize: "30px",
              fontWeight: 800,
            }}
          >
            SPP
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "20px", letterSpacing: "4px", color: "#f1c77f" }}>
              TALENTS DU BÉNIN
            </span>
            <span style={{ fontSize: "28px", fontWeight: 700 }}>{SITE.name}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <span style={{ fontSize: "64px", fontWeight: 800, lineHeight: 1.05 }}>
            La scène est à vous.
          </span>
          <span style={{ fontSize: "28px", color: "rgba(255,255,255,0.8)" }}>
            {SITE.tagline}. Inscriptions, votes et paiements en ligne.
          </span>
        </div>

        <div style={{ display: "flex", gap: "32px", fontSize: "22px", color: "#f1c77f" }}>
          <span>Concours artisanaux & sportifs</span>
          <span>·</span>
          <span>Paiement Mobile Money & Saspay</span>
          <span>·</span>
          <span>Résultats officiels</span>
        </div>
      </div>
    ),
    size,
  );
}
