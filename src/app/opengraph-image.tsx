import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "شلونك.com — منصة لايف كوتشينج تفاعلية";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const asDataUri = async (file: string) =>
  `data:image/svg+xml;base64,${(await readFile(join(process.cwd(), "public/brand", file))).toString("base64")}`;

/**
 * Share card for WhatsApp/Telegram/social: the wordmark over the five characters on
 * white, built from the brand SVGs (no Arabic text rendering needed).
 */
export default async function OpenGraphImage() {
  const [logo, people] = await Promise.all([asDataUri("logo.svg"), asDataUri("people.svg")]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#fff",
          padding: "64px 80px 0",
        }}
      >
        <img src={logo} width={640} height={81} alt="" />
        <img src={people} width={860} height={431} alt="" />
      </div>
    ),
    size,
  );
}
