import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          backgroundColor: "#14532d",
          borderRadius: "50%",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: -0.5,
          }}
        >
          CR
        </div>
      </div>
    ),
    { ...size }
  );
}
