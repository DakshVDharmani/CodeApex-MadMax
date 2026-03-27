import { useState } from "react";
import { useNavigate } from "react-router-dom";

// ─── Main Landing Page ─────────────────────────────────────────────────────
export function LandingPage() {
  const navigate = useNavigate();
  return (
    
    <div style={pageRoot}>
      {/* Global styles via injected style tag */}
      <style>{globalStyles}</style>


      {/* ── NAV ── */}
      <nav style={navStyles}>
        <div style={navLogo}>MADMAX</div>
        <div style={{ display: "flex", alignItems: "center", gap: "2.5rem" }}>
          <a href="#mission" style={navLink}
            onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
          >Mission</a>
          <a href="#capabilities" style={navLink}
            onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
          >Capabilities</a>
          <a href="#threat" style={navLink}
            onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
          >Threat Data</a>
<button
  style={navCta}
  onClick={() => navigate("/auth")}
>
  Sign In
</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={heroSection}>
        <div style={heroGrid}>
          {/* Left: Text */}
          <div style={heroLeft} className="hero-fade-in">
            <p style={heroEyebrow}>Reality Defense System</p>
            <h1 style={heroTitle}>MADMAX</h1>
            <p style={heroDividerLine} />
            <p style={heroDesc}>
              Synthetic media has industrialized deception. AI-generated video,
              cloned voices, and coordinated misinformation now operate at a scale
              no human editor can match. MADMAX exists to close that gap —
              with forensic precision, not speculation.
            </p>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" as const, marginTop: "2.5rem" }}>
<button
  style={heroPrimary}
  onClick={() => navigate("/auth")}
>
  Access the System
</button>
              <a
                href="#capabilities"
                style={heroSecondary}
                onMouseEnter={e => {
                  e.currentTarget.style.color = "#fff";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                }}
              >
                View Capabilities
              </a>
            </div>
          </div>

          {/* Right: Terminal readout */}
          <div style={terminalBox} className="hero-fade-in-delay">
            <div style={terminalHeader}>
              <span style={terminalDot("#c0392b")} />
              <span style={terminalDot("#e67e22")} />
              <span style={terminalDot("#27ae60")} />
              <span style={terminalTitle}>MADMAX // FORENSIC REPORT</span>
            </div>
            <div style={terminalBody}>
              <TerminalLine label="SUBJECT" value="Video file — 00:47 duration" delay="0.1s" />
              <TerminalLine label="FACIAL LANDMARKS" value="⚠ Anomaly detected" delay="0.3s" color="#e74c3c" />
              <TerminalLine label="SPECTRAL ANALYSIS" value="Synthetic artifacts present" delay="0.5s" color="#e74c3c" />
              <TerminalLine label="COMPRESSION" value="GAN signature identified" delay="0.7s" color="#e74c3c" />
              <TerminalLine label="ORIGIN CLUSTER" value="Unknown / unverified" delay="0.9s" />
              <TerminalLine label="PROPAGATION" value="Detected across 14 nodes" delay="1.1s" />
              <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <TerminalLine label="VERDICT" value="94.7% FABRICATED" delay="1.3s" color="#c0392b" bold />
                <TerminalLine label="STATUS" value="FLAGGED — ESCALATED" delay="1.5s" color="#c0392b" bold />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STAT BAR ── */}
      <div id="threat" style={statBar}>
        {[
          { num: "900%", label: "Deepfake growth year-over-year" },
          { num: "4.2B", label: "Disinfo impressions per day" },
          { num: "62%", label: "Adults cannot detect synthetic media" },
          { num: "3 sec", label: "Time to clone a human voice" },
        ].map((s, i) => (
          <div key={i} style={statItem}>
            <span style={statNum}>{s.num}</span>
            <span style={statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── MISSION ── */}
      <section id="mission" style={missionSection}>
        <div style={missionInner}>
          <div style={sectionMeta}>
            <span style={sectionTag}>01 — Mission</span>
            <h2 style={sectionTitle}>
              The cost of lying<br />at scale is now zero.
            </h2>
          </div>
          <div style={missionText}>
            <p style={bodyText}>
              Generative AI has made fabrication trivial. A convincing deepfake
              video costs less than a cup of coffee. A cloned voice requires
              three seconds of audio. A coordinated misinformation campaign can
              be deployed by a single actor across thousands of accounts within
              hours.
            </p>
            <p style={bodyText}>
              The platforms are outpaced. Regulators are behind. Human editors
              cannot keep up. MADMAX was built on the premise that the only
              credible answer to AI-scale deception is AI-scale verification —
              rigorous, forensic, and fast.
            </p>
            <ul style={missionList}>
              {[
                "Detect synthetic media before it reaches critical spread",
                "Trace coordinated amplification networks to their origin",
                "Verify claims against structured factual databases",
                "Produce court-ready forensic documentation",
                "Defend public discourse with speed and precision",
              ].map((item, i) => (
                <li key={i} style={missionListItem}>
                  <span style={missionBullet} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── CAPABILITIES ── */}
      <section id="capabilities" style={capabilitiesSection}>
        <div style={capsHeader}>
          <span style={sectionTag}>02 — Capabilities</span>
          <h2 style={{ ...sectionTitle, marginBottom: 0 }}>Two fronts. One mission.</h2>
        </div>
        <div style={capGrid}>
          {capabilities.map((cap, i) => (
            <CapCard key={i} {...cap} />
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={ctaSection}>
        <div style={ctaInner}>
          <p style={ctaEyebrow}>System Operational</p>
          <h2 style={ctaTitle}>
            Truth requires<br />infrastructure now.
          </h2>
          <p style={ctaBody}>
            Every second, synthetic content is reshaping what people believe.
            The question is whether verification keeps pace. MADMAX was built
            so it can.
          </p>
<button
  style={heroPrimary}
  onClick={() => navigate("/auth")}
>
  Access the System
</button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={footerStyles}>
        <span style={footerLogo}>MADMAX</span>
        <span style={footerText}>Reality Defense System · Detect · Verify · Defend</span>
        <span style={{ ...footerText, color: "#c0392b" }}>System Online ●</span>
      </footer>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────
function TerminalLine({
  label, value, delay, color, bold,
}: { label: string; value: string; delay: string; color?: string; bold?: boolean }) {
  return (
    <div className="terminal-line" style={{ display: "flex", gap: "1rem", marginBottom: "0.6rem", animationDelay: delay }}>
      <span style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.7rem", width: "140px", flexShrink: 0, paddingTop: "1px" }}>
        {label}
      </span>
      <span style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "0.75rem",
        color: color || "rgba(255,255,255,0.7)",
        fontWeight: bold ? 700 : 400,
      }}>
        {value}
      </span>
    </div>
  );
}

function CapCard({ num, icon, title, desc, tags }: {
  num: string; icon: string; title: string; desc: string; tags: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        ...capCard,
        borderColor: hovered ? "rgba(192,57,43,0.4)" : "rgba(255,255,255,0.06)",
        background: hovered ? "rgba(255,255,255,0.03)" : "transparent",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <span style={capNum}>{num}</span>
        <span style={{ fontSize: "1.3rem" }}>{icon}</span>
      </div>
      <h3 style={{ ...capTitle, color: hovered ? "#fff" : "rgba(255,255,255,0.85)" }}>{title}</h3>
      <p style={capDesc}>{desc}</p>
      <p style={capTags}>{tags}</p>
    </div>
  );
}

// ─── Data ───────────────────────────────────────────────────────────────────
const capabilities = [
  { num: "01", icon: "📡", title: "Deepfake Detection", desc: "Multi-layer forensic analysis of video and audio for synthetic artifacts, facial inconsistencies, and manipulation traces imperceptible to the human eye.", tags: "Video · Audio · Image" },
  { num: "02", icon: "🔍", title: "Misinformation Analysis", desc: "Structural claim decomposition, narrative manipulation detection, and cross-reference against verified factual databases and known disinfo signatures.", tags: "Fact-check · Source trace · Narrative" },
  { num: "03", icon: "🧬", title: "Voice Clone Detection", desc: "Spectral frequency analysis identifying AI-synthesized voice patterns across compression artifacts and platform distortion — even at low bitrate.", tags: "Spectral · Prosody · Fingerprint" },
  { num: "04", icon: "🕸", title: "Network Propagation Tracing", desc: "Real-time mapping of how fabricated content moves through networks. Identify origin clusters, coordinated amplification, and bot-driven campaigns.", tags: "Network · Origin · Amplification" },
  { num: "05", icon: "⚡", title: "Real-Time Threat Alerts", desc: "Continuous monitoring of trending synthetic content with threshold-based alerts — delivered before fabricated media crosses critical engagement points.", tags: "Live · Alerts · Monitoring" },
  { num: "06", icon: "🛡", title: "Forensic Report Generation", desc: "Export structured forensic reports with confidence scores, artifact markers, and chain-of-custody documentation. Built for journalists, investigators, and legal teams.", tags: "Legal · Export · Documentation" },
];

// ─── Styles ──────────────────────────────────────────────────────────────────
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&family=Playfair+Display:wght@700;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }

  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes terminalReveal {
    from { opacity: 0; transform: translateX(-8px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .hero-fade-in {
    animation: fadeInUp 0.9s ease both;
  }
  .hero-fade-in-delay {
    animation: fadeInUp 0.9s ease both 0.3s;
    opacity: 0;
    animation-fill-mode: forwards;
  }
  .terminal-line {
    animation: terminalReveal 0.4s ease both;
    animation-fill-mode: forwards;
    opacity: 0;
  }

  a { text-decoration: none; }
  ::selection { background: rgba(192,57,43,0.3); }
`;

const pageRoot: React.CSSProperties = {
  background: "#0a0a0a",
  color: "#fff",
  fontFamily: "'DM Sans', sans-serif",
  minHeight: "100vh",
  overflowX: "hidden",
};

// NAV
const navStyles: React.CSSProperties = {
  position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "1.25rem 3rem",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(10,10,10,0.92)",
  backdropFilter: "blur(16px)",
};
const navLogo: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "1rem",
  fontWeight: 700,
  letterSpacing: "0.2em",
  color: "#c0392b",
};
const navLink: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "0.65rem",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.45)",
  transition: "color 0.2s",
};
const navCta: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "0.65rem",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  padding: "0.5rem 1.25rem",
  border: "1px solid rgba(192,57,43,0.5)",
  background: "transparent",
  color: "#c0392b",
  cursor: "pointer",
  transition: "all 0.2s",
};

// HERO
const heroSection: React.CSSProperties = {
  padding: "10rem 3rem 6rem",
  maxWidth: "1280px",
  margin: "0 auto",
};
const heroGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "5rem",
  alignItems: "center",
};
const heroLeft: React.CSSProperties = {
  display: "flex", flexDirection: "column",
};
const heroEyebrow: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "0.65rem",
  letterSpacing: "0.25em",
  textTransform: "uppercase",
  color: "#c0392b",
  marginBottom: "1.25rem",
};
const heroTitle: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: "clamp(4.5rem, 9vw, 8.5rem)",
  fontWeight: 900,
  lineHeight: 0.92,
  letterSpacing: "-0.02em",
  color: "#fff",
  marginBottom: "1.5rem",
};
const heroDividerLine: React.CSSProperties = {
  width: "3rem",
  height: "2px",
  background: "#c0392b",
  margin: "0 0 1.5rem",
  flexShrink: 0,
};
const heroDesc: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 300,
  fontSize: "1rem",
  lineHeight: 1.85,
  color: "rgba(255,255,255,0.5)",
  maxWidth: "420px",
};
const heroPrimary: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "0.7rem",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  padding: "0.9rem 2rem",
  background: "#c0392b",
  color: "#fff",
  border: "none",
  cursor: "pointer",
  transition: "all 0.2s",
  display: "inline-block",
};
const heroSecondary: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "0.7rem",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  padding: "0.9rem 2rem",
  background: "transparent",
  color: "rgba(255,255,255,0.5)",
  border: "1px solid rgba(255,255,255,0.15)",
  cursor: "pointer",
  transition: "all 0.2s",
};

// TERMINAL
const terminalBox: React.CSSProperties = {
  background: "#111",
  border: "1px solid rgba(255,255,255,0.08)",
  overflow: "hidden",
};
const terminalHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
  padding: "0.75rem 1.25rem",
  background: "#0d0d0d",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};
const terminalDot = (color: string): React.CSSProperties => ({
  width: "10px", height: "10px", borderRadius: "50%", background: color,
});
const terminalTitle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "0.6rem",
  letterSpacing: "0.15em",
  color: "rgba(255,255,255,0.25)",
  marginLeft: "0.5rem",
};
const terminalBody: React.CSSProperties = {
  padding: "1.5rem",
};

// STAT BAR
const statBar: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  borderTop: "1px solid rgba(255,255,255,0.06)",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};
const statItem: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.4rem",
  padding: "2.5rem 3rem",
  borderRight: "1px solid rgba(255,255,255,0.06)",
};
const statNum: React.CSSProperties = {
  fontFamily: "'Playfair Display', serif",
  fontSize: "2.5rem",
  fontWeight: 700,
  color: "#c0392b",
  lineHeight: 1,
};
const statLabel: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 300,
  fontSize: "0.8rem",
  color: "rgba(255,255,255,0.35)",
  lineHeight: 1.4,
};

// MISSION
const missionSection: React.CSSProperties = {
  padding: "7rem 3rem",
  maxWidth: "1280px",
  margin: "0 auto",
};
const missionInner: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "6rem",
  alignItems: "start",
};
const sectionMeta: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: "1.5rem",
};
const sectionTag: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "0.65rem",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: "#c0392b",
};
const sectionTitle: React.CSSProperties = {
  fontFamily: "'Playfair Display', serif",
  fontSize: "clamp(2rem, 3.5vw, 3rem)",
  fontWeight: 700,
  lineHeight: 1.2,
  color: "#fff",
  marginBottom: "2rem",
};
const missionText: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: "1.25rem", paddingTop: "0.25rem",
};
const bodyText: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 300,
  fontSize: "0.95rem",
  lineHeight: 1.85,
  color: "rgba(255,255,255,0.45)",
};
const missionList: React.CSSProperties = {
  listStyle: "none",
  marginTop: "0.75rem",
  display: "flex",
  flexDirection: "column",
  gap: "0",
};
const missionListItem: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.875rem",
  padding: "0.875rem 0",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "0.875rem",
  fontWeight: 400,
  color: "rgba(255,255,255,0.6)",
};
const missionBullet: React.CSSProperties = {
  width: "4px", height: "4px", borderRadius: "50%",
  background: "#c0392b", flexShrink: 0,
};

// CAPABILITIES
const capabilitiesSection: React.CSSProperties = {
  background: "#0d0d0d",
  borderTop: "1px solid rgba(255,255,255,0.06)",
  padding: "7rem 3rem",
};
const capsHeader: React.CSSProperties = {
  maxWidth: "1280px",
  margin: "0 auto 4rem",
  display: "flex",
  flexDirection: "column",
  gap: "1.25rem",
};
const capGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  maxWidth: "1280px",
  margin: "0 auto",
  border: "1px solid rgba(255,255,255,0.06)",
};
const capCard: React.CSSProperties = {
  padding: "2.25rem",
  borderRight: "1px solid rgba(255,255,255,0.06)",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  transition: "all 0.25s",
  cursor: "default",
};
const capNum: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "0.65rem",
  letterSpacing: "0.15em",
  color: "rgba(255,255,255,0.2)",
};
const capTitle: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "1rem",
  fontWeight: 500,
  marginBottom: "0.75rem",
  transition: "color 0.2s",
};
const capDesc: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 300,
  fontSize: "0.85rem",
  lineHeight: 1.75,
  color: "rgba(255,255,255,0.35)",
  marginBottom: "1.25rem",
};
const capTags: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "0.6rem",
  letterSpacing: "0.1em",
  color: "rgba(192,57,43,0.6)",
  textTransform: "uppercase",
};

// CTA
const ctaSection: React.CSSProperties = {
  padding: "8rem 3rem",
  maxWidth: "1280px",
  margin: "0 auto",
};
const ctaInner: React.CSSProperties = {
  maxWidth: "600px",
};
const ctaEyebrow: React.CSSProperties = {
  ...sectionTag, display: "block", marginBottom: "1.5rem",
};
const ctaTitle: React.CSSProperties = {
  fontFamily: "'Playfair Display', serif",
  fontSize: "clamp(2.5rem, 5vw, 4rem)",
  fontWeight: 700,
  lineHeight: 1.1,
  color: "#fff",
  marginBottom: "1.5rem",
};
const ctaBody: React.CSSProperties = {
  ...bodyText,
  marginBottom: "2.5rem",
  maxWidth: "480px",
};

// FOOTER
const footerStyles: React.CSSProperties = {
  borderTop: "1px solid rgba(255,255,255,0.06)",
  padding: "2rem 3rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};
const footerLogo: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "0.75rem",
  letterSpacing: "0.25em",
  color: "rgba(255,255,255,0.2)",
};
const footerText: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "0.6rem",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.2)",
};

// MODAL
const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 200,
  background: "rgba(0,0,0,0.75)",
  backdropFilter: "blur(8px)",
  display: "grid", placeItems: "center",
  padding: "1rem",
};
const modal: React.CSSProperties = {
  background: "#111",
  border: "1px solid rgba(255,255,255,0.1)",
  padding: "2.5rem",
  width: "100%",
  maxWidth: "420px",
  position: "relative",
  animation: "fadeInUp 0.3s ease both",
};
const closeBtn: React.CSSProperties = {
  position: "absolute", top: "1.25rem", right: "1.25rem",
  background: "none", border: "none", color: "rgba(255,255,255,0.3)",
  cursor: "pointer", fontSize: "1rem", lineHeight: 1,
};
const modalEyebrow: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "0.6rem", letterSpacing: "0.2em",
  color: "#c0392b", marginBottom: "0.75rem",
};
const modalTitle: React.CSSProperties = {
  fontFamily: "'Playfair Display', serif",
  fontSize: "2rem", fontWeight: 700,
  color: "#fff", marginBottom: "0.4rem",
};
const modalSubtitle: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 300, fontSize: "0.875rem",
  color: "rgba(255,255,255,0.4)",
};
const fieldGroup: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: "0.5rem",
};
const fieldLabel: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "0.6rem", letterSpacing: "0.15em",
  textTransform: "uppercase", color: "rgba(255,255,255,0.3)",
};
const fieldInput: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff",
  padding: "0.75rem 1rem",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "0.9rem",
  outline: "none",
  transition: "border-color 0.2s",
  width: "100%",
};
const forgotLink: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "0.6rem", letterSpacing: "0.1em",
  color: "rgba(255,255,255,0.25)", textDecoration: "none",
};
const submitBtn: React.CSSProperties = {
  background: "#c0392b", color: "#fff", border: "none",
  padding: "0.875rem", width: "100%",
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "0.7rem", letterSpacing: "0.15em",
  textTransform: "uppercase", cursor: "pointer",
  transition: "all 0.2s", marginTop: "0.25rem",
};
const toggleText: React.CSSProperties = {
  marginTop: "1.5rem",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "0.825rem",
  color: "rgba(255,255,255,0.3)",
  textAlign: "center",
};
const toggleBtn: React.CSSProperties = {
  background: "none", border: "none",
  color: "#c0392b", cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "0.825rem", padding: 0,
};
