import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt =
  "Community Resilience Index — Postcode-level resilience intelligence for Australian communities";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#1a1812",
          padding: "0",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            display: "flex",
            height: "6px",
            width: "100%",
            background: "linear-gradient(90deg, #d97706, #16a34a, #d97706)",
          }}
        />

        <div
          style={{
            display: "flex",
            flex: 1,
            padding: "60px 80px",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Main content */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "32px",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "#22c55e",
                }}
              />
              <span
                style={{
                  fontSize: 16,
                  color: "#d97706",
                  fontWeight: 600,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.1em",
                }}
              >
                Live signals from public data
              </span>
            </div>

            {/* Title */}
            <div
              style={{
                fontSize: 56,
                fontWeight: 800,
                color: "#ffffff",
                lineHeight: 1.1,
                marginBottom: "20px",
              }}
            >
              Community Resilience Index
            </div>

            {/* Subtitle */}
            <div
              style={{
                fontSize: 26,
                color: "#a8a29e",
                lineHeight: 1.4,
                maxWidth: "700px",
              }}
            >
              Where the pressure is, who it reaches, and what your community can
              do about it.
            </div>
          </div>

          {/* Bottom info strip */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              width: "100%",
            }}
          >
            <div style={{ display: "flex", gap: "32px" }}>
              {[
                "Fuel price chain",
                "Exposure profile",
                "Live signals",
                "Action engine",
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <div
                    style={{
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      backgroundColor: "#d97706",
                    }}
                  />
                  <span style={{ fontSize: 14, color: "#78716c" }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
              }}
            >
              <span style={{ fontSize: 15, color: "#78716c" }}>
                australia.communityresilienceindex.net
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
