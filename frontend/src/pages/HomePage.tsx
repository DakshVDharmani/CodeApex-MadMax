import { motion, AnimatePresence } from "framer-motion";
import {
  ScanFace,
  FileSearch,
  ArrowRight,
  Shield,
  Zap,
  Clock,
  FileText,
  AlertTriangle,
  Star,
  Activity,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

/* ─────────────────────────────────────────────
   Unified Design Tokens (Consistent with AuthPage)
───────────────────────────────────────────── */
const T = {
  bg: "#ffffff",
  bg2: "#f8f9fa",
  bg3: "#f1f3f5",
  surface: "rgba(0,0,0,0.03)",
  border: "rgba(0,0,0,0.08)",
  borderHover: "rgba(0,0,0,0.16)",

  text: "#0f172a",
  text2: "#475569",
  text3: "#64748b",

  violet: "#7c3aed",
  violetMid: "rgba(124,58,237,0.12)",
  violetSoft: "rgba(124,58,237,0.06)",
  violetGlow: "rgba(124,58,237,0.25)",

  blue: "#2563eb",
  blueMid: "rgba(37,99,235,0.12)",
  blueSoft: "rgba(37,99,235,0.06)",
  blueGlow: "rgba(37,99,235,0.25)",

  red: "#ef4444",
  redSoft: "rgba(239,68,68,0.12)",

  cyan: "#06b6d4",
  cyanSoft: "rgba(6,182,212,0.10)",

  mono: '"JetBrains Mono", monospace',
  serif: '"Playfair Display", Georgia, serif',
  sans: '"Inter", system-ui, sans-serif',
};

/* Animation Variants */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

/* Ticker */
const TICKER_ITEMS = [
  "Deepfake incidents ↑ 900% YOY",
  "96 active misinfo campaigns detected",
  "Voice clones now undetectable by human ear",
  "AI-generated content: 38% of social media",
  "Reality Defense System: online",
  "Detection Lab: ready",
];

function Ticker() {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        background: T.bg3,
        borderTop: `1px solid ${T.border}`,
        borderBottom: `1px solid ${T.border}`,
        overflow: "hidden",
        height: 36,
        display: "flex",
        alignItems: "center",
      }}
    >
      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        style={{ display: "flex", gap: 48, whiteSpace: "nowrap", padding: "0 24px" }}
      >
        {doubled.map((item, i) => (
          <span
            key={i}
            style={{
              fontFamily: T.mono,
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: T.text3,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: 4,
                height: 4,
                background: T.violet,
                borderRadius: "50%",
                opacity: 0.7,
                display: "inline-block",
              }}
            />
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* Hero */
function Hero({ onManifesto }: { onManifesto: () => void }) {
  const navigate = useNavigate();

  return (
    <section
      style={{
        position: "relative",
        zIndex: 1,
        maxWidth: 1100,
        margin: "0 auto",
        padding: "80px 40px 100px",
        display: "grid",
        gridTemplateColumns: "1fr 420px",
        gap: 64,
        alignItems: "center",
      }}
    >
      <div>
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 12px",
            background: T.redSoft,
            border: `1px solid rgba(239,68,68,0.25)`,
            borderRadius: 100,
            fontFamily: T.mono,
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#ef4444",
            marginBottom: 28,
            fontWeight: 600,
          }}
        >
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              background: T.red,
              borderRadius: "50%",
            }}
          />
          Reality Integrity Warning
        </motion.div>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          style={{
            fontFamily: T.serif,
            fontSize: "clamp(38px, 5vw, 58px)",
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            marginBottom: 24,
            color: T.text,
          }}
        >
          The Age of AI Has
          <br />
          <span
            style={{
              background: `linear-gradient(135deg, ${T.violet} 0%, ${T.blue} 60%, ${T.cyan} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Broken Trust
            <br />
            in Reality
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          style={{
            fontFamily: T.sans,
            fontSize: 16,
            lineHeight: 1.75,
            color: T.text2,
            maxWidth: 520,
            marginBottom: 40,
          }}
        >
          Deepfakes, synthetic voices, and AI-generated misinformation now spread
          faster than truth. This platform detects, analyzes, and exposes what is
          real — before damage is done.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
          style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
        >
          <motion.button
            onClick={() => navigate("/auth")}
            whileHover={{ y: -2, boxShadow: `0 8px 32px ${T.violetGlow}` }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 24px",
              background: `linear-gradient(135deg, ${T.violet}, #6d28d9)`,
              border: "none",
              borderRadius: 10,
              color: "#fff",
              fontFamily: T.mono,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow: `0 0 24px ${T.violetGlow}`,
            }}
          >
            <ScanFace size={14} />
            Enter Detection Lab
            <ArrowRight size={12} />
          </motion.button>

          <motion.button
            onClick={onManifesto}
            whileHover={{ color: T.text, borderColor: T.borderHover, background: T.surface }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 24px",
              background: "transparent",
              border: `1px solid ${T.borderHover}`,
              borderRadius: 10,
              color: T.text2,
              fontFamily: T.mono,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Why This Matters
          </motion.button>
        </motion.div>
      </div>

      <motion.div variants={scaleIn} initial="hidden" animate="visible">
        <StatCard />
      </motion.div>
    </section>
  );
}

function StatCard() {
  const stats = [
    { label: "Daily Deepfakes", value: "↑ 900%", color: "#ef4444" },
    { label: "Misinfo Campaigns", value: "Active", color: T.cyan },
    { label: "Voice Clones", value: "Untraceable", color: "#7c3aed", small: true },
    { label: "Public Trust", value: "Declining", color: T.text3, small: true },
  ];

  return (
    <div
      style={{
        background: T.bg2,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: 28,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: `linear-gradient(90deg, transparent, rgba(124,58,237,0.5), transparent)`,
        }}
      />

      <div
        style={{
          fontFamily: T.mono,
          fontSize: 9,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: T.text3,
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <div style={{ width: 6, height: 6, background: T.red, borderRadius: "50%" }} />
        Global Threat Snapshot
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 16,
        }}
      >
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.1 }}
            whileHover={{ borderColor: T.borderHover, background: "rgba(0,0,0,0.02)" }}
            style={{
              background: "rgba(0,0,0,0.015)",
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              padding: 16,
              transition: "all 0.2s",
            }}
          >
            <div
              style={{
                fontFamily: T.mono,
                fontSize: 9,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: T.text3,
                marginBottom: 8,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: T.mono,
                fontSize: s.small ? 14 : 20,
                fontWeight: 600,
                color: s.color,
              }}
            >
              {s.value}
            </div>
          </motion.div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.18)",
          borderRadius: 8,
          padding: "10px 14px",
          fontFamily: T.mono,
          fontSize: 11,
          color: "#ef4444",
        }}
      >
        <AlertTriangle size={13} />
        38% of all social media content is now AI-generated
      </div>
    </div>
  );
}

/* Capabilities */
function Capabilities() {
  const navigate = useNavigate();

  const cards = [
    {
      accent: T.violet,
      accentMid: T.violetMid,
      accentBorder: "rgba(124,58,237,0.35)",
      accentGlow: "0 16px 48px rgba(124,58,237,0.15)",
      icon: <ScanFace size={22} color="#7c3aed" strokeWidth={1.8} />,
      iconBg: T.violetMid,
      iconBorder: "rgba(124,58,237,0.25)",
      title: "Deepfake Detection",
      desc: "Analyze video, audio, and visual media for synthetic artifacts, facial inconsistencies, voice cloning, and manipulation traces invisible to the human eye.",
      meta: "Used against fake scandals · impersonation · fraud · political manipulation",
      cta: "Open Detection Lab",
      onClick: () => navigate("/home/deepfake"),
    },
    {
      accent: T.blue,
      accentMid: T.blueMid,
      accentBorder: "rgba(37,99,235,0.35)",
      accentGlow: "0 16px 48px rgba(37,99,235,0.15)",
      icon: <FileSearch size={22} color="#3b82f6" strokeWidth={1.8} />,
      iconBg: T.blueMid,
      iconBorder: "rgba(37,99,235,0.25)",
      title: "Misinformation Analysis",
      desc: "Break down claims, detect narrative manipulation, verify sources, and compare content against known factual databases and coordinated misinfo patterns.",
      meta: "Designed for journalists · researchers · investigators · citizens",
      cta: "Analyze a Claim",
      onClick: () => navigate("/home/misinfo"),
    },
  ];

  return (
    <section id="capabilities" style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "80px 40px" }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
      >
        <SectionEyebrow>Core Capabilities</SectionEyebrow>
        <h2 style={{ fontFamily: T.serif, fontSize: "clamp(28px,4vw,40px)", fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 16, color: T.text }}>
          Two Fronts. One Mission.
        </h2>
        <p style={{ fontFamily: T.sans, fontSize: 15, color: T.text2, lineHeight: 1.7, maxWidth: 540 }}>
          Reality must be defended at both the media level and the factual level. Our system operates across both simultaneously.
        </p>
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 48 }}>
        {cards.map((card, i) => (
          <CapCard key={i} card={card} delay={i * 0.1} />
        ))}
      </div>
    </section>
  );
}

function CapCard({ card, delay }: { card: any; delay: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.7 }}
      onClick={card.onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: T.bg2,
        border: `1px solid ${hovered ? card.accentBorder : T.border}`,
        borderRadius: 16,
        padding: 32,
        cursor: "pointer",
        transform: hovered ? "translateY(-6px)" : "translateY(0)",
        boxShadow: hovered ? card.accentGlow : "none",
        transition: "all 0.25s cubic-bezier(0.22,1,0.36,1)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 20% 20%, ${card.accentMid} 0%, transparent 60%)`,
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.3s",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: card.iconBg,
          border: `1px solid ${card.iconBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        {card.icon}
      </div>

      <h3 style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 700, marginBottom: 10, color: T.text }}>{card.title}</h3>

      <p style={{ fontFamily: T.sans, fontSize: 14, color: T.text2, lineHeight: 1.7, marginBottom: 20, flex: 1 }}>
        {card.desc}
      </p>

      <p style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: "0.1em", color: T.text3, textTransform: "uppercase", marginBottom: 20 }}>
        {card.meta}
      </p>

      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: hovered ? 10 : 6,
          fontFamily: T.mono,
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          fontWeight: 600,
          color: card.accent,
          transition: "gap 0.2s",
        }}
      >
        {card.cta}
        <ArrowRight size={12} />
      </span>
    </motion.div>
  );
}

/* Features */
const FEATURES = [
  { icon: <Shield size={16} />, color: T.violet, colorBg: "rgba(124,58,237,0.08)", colorBorder: "rgba(124,58,237,0.18)", title: "Multi-Modal Analysis", desc: "Simultaneous inspection of video, audio, image, and text signals in a single pass." },
  { icon: <Clock size={16} />, color: T.blue, colorBg: "rgba(37,99,235,0.08)", colorBorder: "rgba(37,99,235,0.18)", title: "Real-Time Detection", desc: "Sub-second artifact identification as content is captured or uploaded." },
  { icon: <Activity size={16} />, color: T.cyan, colorBg: "rgba(6,182,212,0.08)", colorBorder: "rgba(6,182,212,0.18)", title: "Provenance Tracking", desc: "Trace the origin and modification history of any piece of digital media." },
  { icon: <FileText size={16} />, color: "#fb923c", colorBg: "rgba(251,146,60,0.08)", colorBorder: "rgba(251,146,60,0.18)", title: "Forensic Reports", desc: "Court-ready evidence packages with chain-of-custody documentation." },
  { icon: <AlertTriangle size={16} />, color: "#ef4444", colorBg: "rgba(239,68,68,0.08)", colorBorder: "rgba(239,68,68,0.18)", title: "Threat Alerting", desc: "Immediate notification when high-confidence manipulations are identified." },
  { icon: <Star size={16} />, color: "#22c55e", colorBg: "rgba(34,197,94,0.08)", colorBorder: "rgba(34,197,94,0.18)", title: "Confidence Scoring", desc: "Calibrated probability estimates with transparent uncertainty bounds." },
];

function Features() {
  return (
    <section id="features" style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "80px 40px", borderTop: `1px solid ${T.border}` }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
      >
        <SectionEyebrow>Platform Features</SectionEyebrow>
        <h2 style={{ fontFamily: T.serif, fontSize: "clamp(28px,4vw,40px)", fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.02em", color: T.text }}>
          Built for the Modern
          <br />
          Information Threat
        </h2>
      </motion.div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          marginTop: 48,
        }}
      >
        {FEATURES.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.6 }}
            whileHover={{ y: -3, borderColor: T.borderHover }}
            style={{
              background: T.bg2,
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              padding: 24,
              transition: "border-color 0.2s",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: f.colorBg,
                border: `1px solid ${f.colorBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
                color: f.color,
              }}
            >
              {f.icon}
            </div>
            <div style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 6, color: T.text }}>
              {f.title}
            </div>
            <p style={{ fontFamily: T.sans, fontSize: 12.5, color: T.text2, lineHeight: 1.65 }}>
              {f.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* Mission */
const WHY_STATS = [
  { val: "96M", color: "#ef4444", label: "AI-generated images circulating on social media daily", tag: "Critical", tagBg: "rgba(239,68,68,0.1)", tagColor: "#ef4444" },
  { val: "4 min", color: "#fb923c", label: "Average time for a deepfake to spread to 1,000 accounts", tag: "High", tagBg: "rgba(251,146,60,0.1)", tagColor: "#fb923c" },
  { val: "68%", color: "#7c3aed", label: "People who cannot distinguish synthetic audio from real speech", tag: "Urgent", tagBg: "rgba(124,58,237,0.12)", tagColor: "#7c3aed" },
  { val: "↓ 31%", color: T.text2, label: "Global trust in online information since 2020", tag: "Trend", tagBg: "rgba(0,0,0,0.05)", tagColor: T.text3 },
];

function Mission({ onManifesto }: { onManifesto: () => void }) {
  return (
    <section
      id="mission"
      style={{
        position: "relative",
        zIndex: 1,
        maxWidth: 1100,
        margin: "0 auto",
        padding: "80px 40px",
        borderTop: `1px solid ${T.border}`,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          {WHY_STATS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              whileHover={{ borderColor: T.borderHover }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: T.bg2,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: "16px 20px",
                transition: "border-color 0.2s",
              }}
            >
              <div style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 700, minWidth: 80, color: s.color }}>
                {s.val}
              </div>
              <div style={{ fontFamily: T.sans, fontSize: 13, color: T.text2, lineHeight: 1.5 }}>
                {s.label}
              </div>
              <span
                style={{
                  marginLeft: "auto",
                  fontFamily: T.mono,
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "3px 8px",
                  borderRadius: 4,
                  fontWeight: 600,
                  background: s.tagBg,
                  color: s.tagColor,
                  flexShrink: 0,
                }}
              >
                {s.tag}
              </span>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <SectionEyebrow style={{ marginBottom: 20 }}>Why This Platform Exists</SectionEyebrow>

          <blockquote
            style={{
              borderLeft: `2px solid ${T.violet}`,
              paddingLeft: 24,
              margin: 0,
            }}
          >
            <p
              style={{
                fontFamily: T.serif,
                fontSize: 22,
                lineHeight: 1.55,
                color: T.text,
                marginBottom: 16,
              }}
            >
              "AI has removed the cost of lying at scale. Without verification
              systems, truth collapses — and with it, democracy, justice, and trust."
            </p>
            <cite
              style={{
                fontFamily: T.mono,
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: T.text3,
                fontStyle: "normal",
              }}
            >
              MADMAX Platform Manifesto
            </cite>
          </blockquote>

          <p style={{ fontFamily: T.sans, fontSize: 14, color: T.text2, lineHeight: 1.75, marginTop: 28, marginBottom: 24 }}>
            Anyone can now fabricate evidence, speeches, confessions, or events.
            This platform exists to restore friction, verification, and
            accountability to the information ecosystem.
          </p>

          <motion.button
            onClick={onManifesto}
            whileHover={{ color: T.text, borderColor: T.borderHover, background: T.surface }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 24px",
              background: "transparent",
              border: `1px solid ${T.borderHover}`,
              borderRadius: 10,
              color: T.text2,
              fontFamily: T.mono,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Read the Full Manifesto
            <ArrowRight size={12} />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}

/* CtaBanner */
function CtaBanner() {
  const navigate = useNavigate();

  return (
    <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "0 40px 80px" }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        style={{
          background: T.bg2,
          border: `1px solid ${T.border}`,
          borderRadius: 20,
          padding: 48,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 32,
        }}
      >
        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              fontFamily: T.mono,
              fontSize: 9,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: T.text3,
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <div style={{ width: 6, height: 6, background: "#22c55e", borderRadius: "50%" }} />
            System Ready — No Queue
          </div>
          <div style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 8, color: T.text }}>
            Enter the Detection Lab
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 12, color: T.text2 }}>
            Analyze media. Verify claims. Defend reality.
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 10, minWidth: 200 }}>
          <motion.button
            onClick={() => navigate("/home/deepfake")}
            whileHover={{ y: -2, boxShadow: `0 8px 32px ${T.violetGlow}` }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              padding: "12px 24px",
              background: `linear-gradient(135deg, ${T.violet}, #6d28d9)`,
              border: "none",
              borderRadius: 10,
              color: "#fff",
              fontFamily: T.mono,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow: `0 0 24px ${T.violetGlow}`,
            }}
          >
            Deploy System
            <ArrowRight size={12} />
          </motion.button>

          <motion.button
            onClick={() => navigate("/home/misinfo")}
            whileHover={{ color: T.text, borderColor: T.borderHover, background: T.surface }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              padding: "12px 24px",
              background: "transparent",
              border: `1px solid ${T.borderHover}`,
              borderRadius: 10,
              color: T.text2,
              fontFamily: T.mono,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <FileSearch size={12} />
            Analyze Misinfo
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

/* Footer */
function Footer() {
  return (
    <footer
      style={{
        position: "relative",
        zIndex: 1,
        borderTop: `1px solid ${T.border}`,
        padding: "28px 40px",
        maxWidth: 1100,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: T.text3 }}>
        Reality Defense System ©️ {new Date().getFullYear()}
      </div>
      <div style={{ display: "flex", gap: 24 }}>
        {["Privacy", "Terms", "Contact"].map((label) => (
          <button
            key={label}
            style={{
              fontFamily: T.mono,
              fontSize: 10,
              letterSpacing: "0.1em",
              color: T.text3,
              background: "none",
              border: "none",
              cursor: "pointer",
              transition: "color 0.2s",
              padding: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = T.text2)}
            onMouseLeave={(e) => (e.currentTarget.style.color = T.text3)}
          >
            {label}
          </button>
        ))}
      </div>
    </footer>
  );
}

/* Manifesto Modal */
function ManifestoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.75)",
            backdropFilter: "blur(16px)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 20 }}
            transition={{ ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: T.bg2,
              border: `1px solid ${T.borderHover}`,
              borderRadius: 20,
              maxWidth: 560,
              width: "100%",
              overflow: "hidden",
              boxShadow: `0 0 80px ${T.violetGlow}`,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                background: `linear-gradient(90deg, transparent, rgba(124,58,237,0.6), transparent)`,
              }}
            />

            <div
              style={{
                padding: "28px 32px 20px",
                borderBottom: `1px solid ${T.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: T.text3, marginBottom: 6 }}>
                  Platform Agenda
                </div>
                <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 700, color: T.text }}>
                  Why This System Exists
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                style={{
                  background: "none",
                  border: "none",
                  color: T.text3,
                  cursor: "pointer",
                  padding: 4,
                  lineHeight: 1,
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = T.text)}
                onMouseLeave={(e) => (e.currentTarget.style.color = T.text3)}
              >
                <X size={18} />
              </motion.button>
            </div>

            <div style={{ padding: "28px 32px" }}>
              <p style={{ fontFamily: T.sans, fontSize: 14.5, color: T.text2, lineHeight: 1.75, marginBottom: 16 }}>
                Artificial intelligence has eliminated the cost of deception.
                Fake videos, cloned voices, and manufactured evidence can now
                destabilize reputations, elections, and justice systems in minutes.
              </p>
              <p style={{ fontFamily: T.sans, fontSize: 14.5, color: T.text2, lineHeight: 1.75, marginBottom: 24 }}>
                This platform exists to analyze, verify, and expose manipulated
                media and misinformation before it causes irreversible harm —
                giving journalists, investigators, and citizens the tools to fight back.
              </p>
              <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 20 }}>
                <p style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: T.violet, margin: 0 }}>
                  Detect &nbsp;·&nbsp; Verify &nbsp;·&nbsp; Defend Reality
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SectionEyebrow({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        fontFamily: T.mono,
        fontSize: 10,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: T.violet,
        marginBottom: 12,
        fontWeight: 600,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Background() {
  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(124,58,237,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,58,237,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", width: 600, height: 600, top: -200, left: -200, background: "rgba(124,58,237,0.08)", borderRadius: "50%", filter: "blur(140px)" }} />
        <div style={{ position: "absolute", width: 500, height: 500, bottom: 0, right: -150, background: "rgba(37,99,235,0.07)", borderRadius: "50%", filter: "blur(140px)" }} />
        <div style={{ position: "absolute", width: 300, height: 300, top: "40%", left: "30%", background: "rgba(239,68,68,0.04)", borderRadius: "50%", filter: "blur(110px)" }} />
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   HomePage — Full Export
───────────────────────────────────────────── */
export const HomePage = () => {
  const [showManifesto, setShowManifesto] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        color: T.text,
        fontFamily: T.sans,
        overflowX: "hidden",
        position: "relative",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800&family=JetBrains+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; }
        ::selection { background: rgba(124,58,237,0.25); }
        html { scroll-behavior: smooth; }
      `}</style>

      <Background />
      <Ticker />
      <Hero onManifesto={() => setShowManifesto(true)} />
      <div style={{ borderTop: `1px solid ${T.border}` }} />
      <Capabilities />
      <Features />
      <Mission onManifesto={() => setShowManifesto(true)} />
      <CtaBanner />
      <Footer />
      <ManifestoModal open={showManifesto} onClose={() => setShowManifesto(false)} />
    </div>
  );
};