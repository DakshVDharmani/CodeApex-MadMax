import { useState } from 'react';
import {
  Search,
  Loader,
  Sparkles,
  Shield,
  Upload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Tesseract from 'tesseract.js';

declare global {
  interface Window {
    grecaptcha: any;
  }
}

/* Unified Light Mode Design Tokens */
const T = {
  bg: "#ffffff",
  bg2: "#f8f9fa",
  surface: "#ffffff",
  border: "rgba(0,0,0,0.08)",
  borderHover: "rgba(0,0,0,0.16)",
  text: "#0f172a",
  text2: "#475569",
  text3: "#64748b",
  violet: "#7c3aed",
  violetMid: "rgba(124,58,237,0.12)",
  violetGlow: "rgba(124,58,237,0.25)",
  cyan: "#06b6d4",
  cyanSoft: "rgba(6,182,212,0.10)",
  red: "#ef4444",
  redSoft: "rgba(239,68,68,0.12)",
  success: "#22c55e",
  warning: "#eab308",
  mono: '"JetBrains Mono", monospace',
  serif: '"Playfair Display", Georgia, serif',
  sans: '"Inter", system-ui, sans-serif',
};

/* Fixed height shared by both panels */
const PANEL_HEIGHT = 560;

/* Highlight colours — fully opaque so they're always visible on white */
const VERDICT_HIGHLIGHT: Record<string, { bg: string; border: string; text: string }> = {
  REFUTED:      { bg: '#fecaca', border: '#f87171', text: '#991b1b' },
  SUPPORTED:    { bg: '#bbf7d0', border: '#4ade80', text: '#14532d' },
  INSUFFICIENT: { bg: '#fef08a', border: '#facc15', text: '#713f12' },
};

/* Slice fullText into plain/highlighted segments based on claim positions */
function buildHighlightedText(fullText: string, claims: any[]) {
  if (!claims?.length) return [{ text: fullText, verdict: null, claim: null }];

  const mapped = claims
    .map((c) => ({ ...c, idx: fullText.indexOf(c.claim) }))
    .filter((c) => c.idx !== -1)
    .sort((a, b) => a.idx - b.idx);

  if (!mapped.length) return [{ text: fullText, verdict: null, claim: null }];

  const segments: { text: string; verdict: string | null; claim: any }[] = [];
  let cursor = 0;

  for (const c of mapped) {
    if (c.idx > cursor) {
      segments.push({ text: fullText.slice(cursor, c.idx), verdict: null, claim: null });
    }
    segments.push({ text: c.claim, verdict: c.verdict, claim: c });
    cursor = c.idx + c.claim.length;
  }

  if (cursor < fullText.length) {
    segments.push({ text: fullText.slice(cursor), verdict: null, claim: null });
  }

  return segments;
}

export const Misinfo = () => {
  const [text, setText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [hoveredClaim, setHoveredClaim] = useState<number | null>(null);

  const handleScan = async () => {
    if (!text.trim()) return;
    setScanning(true);
    setResult(null);
    try {
      const response = await fetch('http://localhost:8081/fact-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error('Backend error');
      const data = await response.json();
      setResult({ claims: data.results || [] });
    } catch {
      setResult({ claims: [{ claim: 'Analysis failed', verdict: 'INSUFFICIENT', citations: [] }] });
    } finally {
      setScanning(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    try {
      const { data } = await Tesseract.recognize(file, 'eng', { logger: () => {} });
      const extracted = data.text.trim();
      if (extracted) setText((prev) => (prev ? `${prev}\n\n${extracted}` : extracted));
    } catch { /* silently fail */ }
  };

  const verdictStats = result?.claims?.reduce((acc: any, c: any) => {
    acc[c.verdict] = (acc[c.verdict] || 0) + 1;
    return acc;
  }, {}) || {};

  const totalClaims = result?.claims?.length || 0;
  const refutedScore = totalClaims
    ? Math.round(((verdictStats?.REFUTED || 0) / totalClaims) * 100)
    : 0;

  const highlightedSegments = result
    ? buildHighlightedText(text, result.claims || [])
    : [];

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      color: T.text,
      fontFamily: T.sans,
      padding: '20px 24px 60px',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 32 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
            <motion.div
              animate={{ rotate: [0, 6, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              style={{
                width: 40, height: 40,
                background: T.violetMid,
                border: `1px solid rgba(124,58,237,0.3)`,
                borderRadius: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Shield size={20} color={T.violet} />
            </motion.div>
            <h1 style={{
              fontFamily: T.serif, fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em',
              background: `linear-gradient(90deg, ${T.violet}, ${T.cyan})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Reality Checker
            </h1>
          </div>
          <p style={{
            fontFamily: T.mono, fontSize: 13, letterSpacing: '0.15em',
            textTransform: 'uppercase', color: T.text3,
          }}>
            Textual Analysis &amp; Fact Verification
          </p>
        </motion.header>

        {/* Legend */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}
            >
              {Object.entries(VERDICT_HIGHLIGHT).map(([verdict, colors]) => (
                <div key={verdict} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: 4,
                    background: colors.bg, border: `1.5px solid ${colors.border}`,
                  }} />
                  <span style={{
                    fontFamily: T.mono, fontSize: 11, letterSpacing: '0.1em',
                    color: colors.text, fontWeight: 600,
                  }}>{verdict}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid — row height is locked to PANEL_HEIGHT */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 20,
          height: PANEL_HEIGHT,
        }}>

          {/* ── LEFT: Input Panel ── */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            style={{ height: '100%' }}
          >
            <div style={{
              height: '100%',
              boxSizing: 'border-box',
              background: T.bg2,
              border: `1px solid ${T.border}`,
              borderRadius: 24,
              padding: '28px 32px 24px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}>

              {/* Title */}
              <div style={{ flexShrink: 0, marginBottom: 14 }}>
                <div style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.2em', color: T.text3, marginBottom: 4 }}>INPUT</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Enter Suspicious Content</div>
              </div>

              {/* Text area — fills remaining vertical space */}
              <div style={{ flex: 1, position: 'relative', minHeight: 0, marginBottom: 16 }}>
                {!result ? (
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste the text, claim, or article you want to verify..."
                    style={{
                      width: '100%',
                      height: '100%',
                      background: '#ffffff',
                      border: `1px solid ${T.border}`,
                      borderRadius: 20,
                      padding: 20,
                      color: T.text,
                      fontFamily: T.mono,
                      fontSize: 14,
                      lineHeight: 1.75,
                      resize: 'none',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: '#ffffff',
                    border: `1px solid ${T.border}`,
                    borderRadius: 20,
                    padding: 20,
                    boxSizing: 'border-box',
                    overflowY: 'auto',
                    scrollbarWidth: 'thin',
                    scrollbarColor: `${T.border} transparent`,
                    fontFamily: T.mono,
                    fontSize: 14,
                    lineHeight: 1.85,
                    color: T.text,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {highlightedSegments.map((seg, i) => {
                      if (!seg.verdict) return <span key={i}>{seg.text}</span>;

                      const colors = VERDICT_HIGHLIGHT[seg.verdict] || VERDICT_HIGHLIGHT.INSUFFICIENT;
                      const claimIndex = result.claims?.findIndex((c: any) => c.claim === seg.text);
                      const isHovered = hoveredClaim === claimIndex;

                      return (
                        <motion.span
                          key={i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.04 }}
                          onMouseEnter={() => setHoveredClaim(claimIndex)}
                          onMouseLeave={() => setHoveredClaim(null)}
                          title={seg.verdict}
                          style={{
                            display: 'inline',
                            backgroundColor: isHovered ? colors.border : colors.bg,
                            borderBottom: `2px solid ${colors.border}`,
                            borderRadius: 4,
                            color: colors.text,
                            padding: '1px 3px',
                            cursor: 'default',
                            transition: 'background-color 0.15s ease',
                            fontWeight: isHovered ? 600 : 400,
                          }}
                        >
                          {seg.text}
                        </motion.span>
                      );
                    })}
                  </div>
                )}

                {/* Character count */}
                <div style={{
                  position: 'absolute', bottom: 12, right: 16,
                  fontFamily: T.mono, fontSize: 12, color: T.text3, pointerEvents: 'none',
                }}>
                  {text.length} characters
                </div>
              </div>

              {/* Bottom action bar */}
              <div style={{
                flexShrink: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                {result ? (
                  <button
                    onClick={() => { setResult(null); setHoveredClaim(null); }}
                    style={{
                      fontFamily: T.mono, fontSize: 13, color: T.text3,
                      cursor: 'pointer', background: 'none', border: 'none', padding: 0,
                    }}
                  >
                    ← Reset &amp; Edit Text
                  </button>
                ) : <div />}

                <div style={{ display: 'flex', gap: 12 }}>
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])}
                    />
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        padding: '12px 22px',
                        background: T.bg2,
                        border: `1px solid ${T.border}`,
                        borderRadius: 14,
                        color: T.text2,
                        fontFamily: T.mono,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <Upload size={16} />
                      Upload Image
                    </motion.div>
                  </label>

                  <motion.button
                    onClick={handleScan}
                    disabled={!text.trim() || scanning}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      padding: '12px 30px',
                      background: `linear-gradient(135deg, ${T.violet}, #6d28d9)`,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 14,
                      fontFamily: T.mono,
                      fontSize: 13,
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      cursor: scanning || !text.trim() ? 'not-allowed' : 'pointer',
                      opacity: scanning || !text.trim() ? 0.75 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    {scanning ? (
                      <><Loader className="animate-spin" size={16} /> ANALYZING...</>
                    ) : (
                      <><Sparkles size={16} /> RUN ANALYSIS</>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── RIGHT: Result Panel ── */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            style={{ height: '100%' }}
          >
            <div style={{
              height: '100%',
              boxSizing: 'border-box',
              background: T.bg2,
              border: `1px solid ${T.border}`,
              borderRadius: 24,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}>

              {/* Panel title */}
              <div style={{ flexShrink: 0, marginBottom: 16 }}>
                <div style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.2em', color: T.text3 }}>ANALYSIS OUTPUT</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Fact Check Results</div>
              </div>

              <AnimatePresence mode="wait">
                {/* Empty state */}
                {!result && !scanning && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{
                      flex: 1, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      textAlign: 'center', color: T.text3,
                    }}
                  >
                    <Search size={52} style={{ opacity: 0.25, marginBottom: 20 }} />
                    <p style={{ fontFamily: T.mono, fontSize: 13 }}>Enter text above and run analysis</p>
                  </motion.div>
                )}

                {/* Scanning state */}
                {scanning && (
                  <motion.div
                    key="scanning"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ flex: 1 }}
                  >
                    <div style={{ fontFamily: T.mono, fontSize: 13, color: T.violet, marginBottom: 16 }}>PROCESSING...</div>
                    <div style={{ height: 6, background: T.bg, borderRadius: 999, overflow: 'hidden' }}>
                      <motion.div
                        animate={{ width: ['0%', '100%'] }}
                        transition={{ duration: 2.2, repeat: Infinity }}
                        style={{ height: '100%', background: `linear-gradient(to right, ${T.violet}, ${T.cyan})` }}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Results state */}
                {result && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
                  >
                    {/* Risk score — pinned, never scrolls */}
                    <div style={{
                      flexShrink: 0,
                      textAlign: 'center',
                      padding: '14px 20px',
                      background: '#fff',
                      border: `2px solid ${refutedScore > 50 ? T.red : T.success}`,
                      borderRadius: 20,
                      marginBottom: 12,
                    }}>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                        style={{
                          fontFamily: T.mono, fontSize: 44, fontWeight: 700,
                          lineHeight: 1, color: refutedScore > 50 ? T.red : T.success,
                        }}
                      >
                        {refutedScore}%
                      </motion.div>
                      <div style={{
                        fontSize: 13, fontWeight: 600,
                        color: refutedScore > 50 ? T.red : T.success,
                        marginTop: 6,
                      }}>
                        {refutedScore > 50 ? 'HIGH RISK DETECTED' : 'LOW RISK'}
                      </div>
                    </div>

                    {/* Claims label — pinned */}
                    <div style={{
                      flexShrink: 0,
                      fontFamily: T.mono, fontSize: 12, letterSpacing: '0.1em',
                      color: T.text3, marginBottom: 10,
                    }}>
                      DETECTED CLAIMS ({totalClaims})
                    </div>

                    {/* Scrollable claims list */}
                    <div style={{
                      flex: 1,
                      overflowY: 'auto',
                      paddingRight: 4,
                      scrollbarWidth: 'thin',
                      scrollbarColor: `${T.border} transparent`,
                    }}>
                      {(result.claims || []).map((claim: any, i: number) => {
                        const verdict = claim.verdict || 'INSUFFICIENT';
                        const colors = VERDICT_HIGHLIGHT[verdict] || VERDICT_HIGHLIGHT.INSUFFICIENT;
                        const isHovered = hoveredClaim === i;

                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            onMouseEnter={() => setHoveredClaim(i)}
                            onMouseLeave={() => setHoveredClaim(null)}
                            style={{
                              background: isHovered ? colors.bg : '#fff',
                              border: `1.5px solid ${isHovered ? colors.border : colors.bg}`,
                              borderRadius: 16,
                              padding: 18,
                              marginBottom: 12,
                              transition: 'all 0.15s ease',
                              cursor: 'default',
                            }}
                          >
                            <p style={{ fontSize: 14, lineHeight: 1.65, color: T.text, marginBottom: 12 }}>
                              {claim.claim}
                            </p>

                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '5px 14px',
                              background: colors.bg,
                              color: colors.text,
                              border: `1px solid ${colors.border}`,
                              borderRadius: 999,
                              fontFamily: T.mono,
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: '0.08em',
                            }}>
                              {verdict}
                            </div>

                            {claim.citations?.length > 0 && (
                              <div style={{ marginTop: 14 }}>
                                {claim.citations.map((url: string, j: number) => (
                                  <a
                                    key={j}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      color: T.cyan, fontSize: 12, display: 'block',
                                      marginBottom: 4, textDecoration: 'underline', wordBreak: 'break-all',
                                    }}
                                  >
                                    {url}
                                  </a>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
};