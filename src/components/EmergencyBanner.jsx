import { useNavigate } from "react-router-dom";

export default function EmergencyBanner({ visible }) {
  if (!visible) return null;

  return (
    <div
      className="mx-5 mt-4 p-4 rounded-xl anim-fade-in"
      style={{
        background: "var(--red-dim)",
        border: "1px solid rgba(239,68,68,.5)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 flex items-center justify-center rounded-full"
          style={{
            width: 32,
            height: 32,
            background: "var(--red)",
            animation: "pulseRing 1.2s infinite",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
          </svg>
        </div>
        <div>
          <p
            className="font-syne font-semibold text-sm"
            style={{ color: "var(--red)" }}
          >
            Emergency detected
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-2)" }}>
            Your symptoms suggest a potentially serious condition. Please call
            emergency services immediately.
          </p>

          <a
            href="tel:108"
            className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: "var(--red)", color: "#fff" }}
          >
            Call 108 now
          </a>
        </div>
      </div>
    </div>
  );
}
