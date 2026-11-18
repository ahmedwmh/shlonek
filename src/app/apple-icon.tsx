import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the brand's black square with an Arabic question mark (a mirrored "?"). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111",
          color: "#fff",
          fontSize: 120,
          fontWeight: 700,
        }}
      >
        <span style={{ transform: "scaleX(-1)", display: "flex" }}>?</span>
      </div>
    ),
    size,
  );
}
