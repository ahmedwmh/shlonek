import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the brand mark (public/brand/icon-logo.svg) in black on white. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
        <svg width="116" height="117" viewBox="0 0 808.42 812.39" fill="#111">
          <path d="M412.73,0C189.1,0,30.29,134.92,2.12,340.1c-1.08,7.88-1.78,24.63-2.11,43.71-.8,47.36,37.44,86.19,84.81,86.19h620.24c57.08,0,103.36-46.28,103.36-103.37v-8.08C808.42,161.51,637.22,0,412.73,0ZM185,327.87c24.22-103.37,114.67-169.59,227.73-169.59s198.65,66.22,222.88,169.59H185Z" />
          <path d="M647.83,628.2c-26.25-21.95-63.76-26.17-93.21-8.74-35.87,21.22-80.99,34.66-133.82,34.66-96.17,0-172.01-42.54-211.16-114.11-15.7-28.7-45.41-46.91-78.11-46.91h0c-69.51,0-111.56,76.15-75.27,135.43,70.07,114.48,198.94,183.86,364.54,183.86,81.03,0,153.41-17.29,213.71-49.46,50.95-27.17,57.61-97.68,13.32-134.73h0Z" />
        </svg>
      </div>
    ),
    size,
  );
}
