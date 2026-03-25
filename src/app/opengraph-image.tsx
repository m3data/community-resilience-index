import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Community Resilience Index — How resilient is your community?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          width: "100%",
          height: "100%",
          backgroundColor: "#14532d",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.15,
              marginBottom: 24,
            }}
          >
            Community Resilience Index
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#dcfce7",
              lineHeight: 1.4,
            }}
          >
            How resilient is your community?
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            width: "100%",
          }}
        >
          <div
            style={{
              fontSize: 20,
              color: "#86efac",
            }}
          >
            communityresilience.au
          </div>
          <div
            style={{
              fontSize: 16,
              color: "#4ade80",
            }}
          >
            Open data. Peer-reviewed methods.
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
