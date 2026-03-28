import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, 
  AlertTriangle, 
  ExternalLink, 
  BarChart3, 
  TrendingUp, 
  Shield, 
  Eye, 
  Instagram, 
  Facebook, 
  Youtube 
} from 'lucide-react';

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

interface Claim {
  id: string;
  text: string;
  context: string;
  domain: string;
  claim_type: string;
  risk_score: number;
  risk_level: string;
  confidence: number;
  validity_score: number;
  method_accuracy: number;
  is_misinformation: boolean;
  validation_result: string;
  color: string;
  analysis_method: string;
  research_grade: boolean;
  evidence_count: number;
  retrieval_quality: number;
  dataset_warning: boolean;
  preprint_alert: boolean;
  timestamp: string;
  start_position: number;
  end_position: number;
  evidence_sources: any[];
  rag_verification: any;
}

interface VideoMetadata {
  video_id?: string;
  post_id?: string;
  url: string;
  title: string;
  duration?: string;
  word_count: number;
  transcript_method?: string;
  total_claims_found: number;
  misinformation_claims: number;
  high_risk_claims: number;
  misinformation_detected: boolean;
  platform: string;
}

export default function FakeMedia() {
  const [transcript, setTranscript] = useState('');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [mediaMetadata, setMediaMetadata] = useState<VideoMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [mediaUrl, setMediaUrl] = useState('');
  const [detectedPlatform, setDetectedPlatform] = useState<string>('');

  const stats = {
    total_claims: claims.length,
    high_risk: claims.filter(c => c.risk_score >= 70).length,
    medium_risk: claims.filter(c => c.risk_score >= 40 && c.risk_score < 70).length,
    low_risk: claims.filter(c => c.risk_score < 40).length,
    misinformation: claims.filter(c => c.is_misinformation).length
  };

  const detectPlatformFromUrl = (url: string): string => {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('instagram.com')) return 'instagram';
    if (urlLower.includes('facebook.com')) return 'facebook';
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'youtube';
    return 'unknown';
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setMediaUrl(url);
    const platform = detectPlatformFromUrl(url);
    setDetectedPlatform(platform);
  };

  const handleMediaSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!mediaUrl.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/youtube/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'url',
          url: mediaUrl.trim() 
        })
      });
      const data = await response.json();
      
      if (data.success) {
        setTranscript(data.extracted_text || '');
        setClaims(data.claims || []);
        setMediaMetadata({
          ...data.video_metadata,
          platform: data.platform,
          url: data.url
        });
      } else {
        console.error('Analysis failed:', data);
      }
    } catch (error) {
      console.error('Error processing media:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClaims = claims.filter(claim => {
    if (filter === 'all') return true;
    if (filter === 'high') return claim.risk_score >= 70;
    if (filter === 'medium') return claim.risk_score >= 40 && claim.risk_score < 70;
    if (filter === 'low') return claim.risk_score < 40;
    if (filter === 'misinformation') return claim.is_misinformation;
    return true;
  });

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return <Instagram className="w-5 h-5 text-pink-500" />;
      case 'facebook': return <Facebook className="w-5 h-5 text-blue-500" />;
      case 'youtube': return <Youtube className="w-5 h-5 text-red-500" />;
      default: return <ExternalLink className="w-5 h-5 text-gray-400" />;
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return T.red;
    if (score >= 40) return T.warning;
    return T.success;
  };

  const getRiskLevel = (score: number) => {
    if (score >= 70) return { level: 'High Risk', color: T.red };
    if (score >= 40) return { level: 'Medium Risk', color: T.warning };
    return { level: 'Low Risk', color: T.success };
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      color: T.text,
      fontFamily: T.sans,
      padding: '24px 32px 60px',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {/* Professional Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: 32 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
            <motion.div
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              style={{
                width: 40,
                height: 40,
                background: T.violetMid,
                border: `1px solid rgba(124,58,237,0.3)`,
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield size={20} color={T.violet} />
            </motion.div>

            <h1 style={{
              fontFamily: T.serif,
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              background: `linear-gradient(90deg, ${T.violet}, ${T.cyan})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Fake Media Detection
            </h1>
          </div>

          <p style={{
            fontFamily: T.mono,
            fontSize: 13,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: T.text3,
          }}>
            Multi-Platform Deepfake & Misinformation Analysis
          </p>
        </motion.header>

        {/* Media Input */}
        <div style={{
          background: T.bg2,
          border: `1px solid ${T.border}`,
          borderRadius: 24,
          padding: 24,
          marginBottom: 24,
        }}>
          <form onSubmit={handleMediaSubmit}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.2em', color: T.text3, marginBottom: 8 }}>SOCIAL MEDIA URL</div>
              <input
                type="url"
                value={mediaUrl}
                onChange={handleUrlChange}
                placeholder="https://www.instagram.com/p/... or https://www.youtube.com/watch?v=..."
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  background: '#ffffff',
                  border: `1px solid ${T.border}`,
                  borderRadius: 16,
                  fontSize: 14,
                  color: T.text,
                  outline: 'none',
                }}
              />
              {detectedPlatform && detectedPlatform !== 'unknown' && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, color: T.cyan }}>
                  {getPlatformIcon(detectedPlatform)}
                  <span style={{ fontFamily: T.mono, fontSize: 13 }}>Platform Detected: {detectedPlatform}</span>
                </div>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={!mediaUrl.trim() || loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%',
                padding: '14px',
                background: `linear-gradient(135deg, ${T.violet}, #6d28d9)`,
                color: '#fff',
                border: 'none',
                borderRadius: 16,
                fontFamily: T.mono,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: loading || !mediaUrl.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !mediaUrl.trim() ? 0.75 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  ANALYZING MEDIA...
                </>
              ) : (
                'Analyze for Misinformation & Deepfakes'
              )}
            </motion.button>
          </form>
        </div>

        {/* Media Metadata */}
        <AnimatePresence>
          {mediaMetadata && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{
                background: T.bg2,
                border: `1px solid ${T.border}`,
                borderRadius: 24,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <div style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.2em', color: T.text3, marginBottom: 8 }}>
                MEDIA INFORMATION — {mediaMetadata.platform?.toUpperCase() || 'UNKNOWN'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <div>
                  <div style={{ color: T.text3, fontSize: 12, marginBottom: 4 }}>Title</div>
                  <div style={{ color: T.text, fontWeight: 500 }}>{mediaMetadata.title}</div>
                </div>
                <div>
                  <div style={{ color: T.text3, fontSize: 12, marginBottom: 4 }}>Platform</div>
                  <div style={{ color: T.text, fontWeight: 500, textTransform: 'capitalize' }}>{mediaMetadata.platform}</div>
                </div>
                <div>
                  <div style={{ color: T.text3, fontSize: 12, marginBottom: 4 }}>Word Count</div>
                  <div style={{ color: T.text, fontWeight: 500 }}>{mediaMetadata.word_count}</div>
                </div>
                <div>
                  <div style={{ color: T.text3, fontSize: 12, marginBottom: 4 }}>Transcript Method</div>
                  <div style={{ color: T.text, fontWeight: 500 }}>{mediaMetadata.transcript_method || 'Multi-Source'}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Overview */}
        <AnimatePresence>
          {claims.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}
            >
              <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 20, padding: 16 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: T.text }}>{stats.total_claims}</div>
                <div style={{ fontFamily: T.mono, fontSize: 12, color: T.text3 }}>Total Claims</div>
              </div>
              <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 20, padding: 16 }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: T.red }}>{stats.high_risk}</div>
                <div style={{ fontFamily: T.mono, fontSize: 12, color: T.text3 }}>High Risk</div>
              </div>
              <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 20, padding: 16 }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: T.warning }}>{stats.medium_risk}</div>
                <div style={{ fontFamily: T.mono, fontSize: 12, color: T.text3 }}>Medium Risk</div>
              </div>
              <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 20, padding: 16 }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: T.success }}>{stats.low_risk}</div>
                <div style={{ fontFamily: T.mono, fontSize: 12, color: T.text3 }}>Low Risk</div>
              </div>
              <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 20, padding: 16 }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: T.red }}>{stats.misinformation}</div>
                <div style={{ fontFamily: T.mono, fontSize: 12, color: T.text3 }}>Misinformation</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter */}
        <AnimatePresence>
          {claims.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <span style={{ fontFamily: T.mono, fontSize: 12, color: T.text3 }}>Filter Claims:</span>
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                style={{
                  padding: '10px 16px',
                  background: T.bg2,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  color: T.text,
                  fontFamily: T.mono,
                  fontSize: 13,
                }}
              >
                <option value="all">All Claims</option>
                <option value="high">High Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="low">Low Risk</option>
                <option value="misinformation">Misinformation Only</option>
              </select>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Claims List */}
        <AnimatePresence>
          {filteredClaims.map((claim, index) => {
            const risk = getRiskLevel(claim.risk_score);
            return (
              <motion.div
                key={claim.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                style={{
                  background: T.bg2,
                  border: `1px solid ${T.border}`,
                  borderRadius: 24,
                  padding: 40,
                  marginBottom: 24,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <div>
                    <div style={{ fontFamily: T.mono, fontSize: 11, color: T.text3, marginBottom: 4 }}>CLAIM {index + 1}</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: T.text, lineHeight: 1.5 }}>{claim.text}</div>
                  </div>
                  <div style={{
                    padding: '8px 20px',
                    background: `${risk.color}15`,
                    color: risk.color,
                    borderRadius: 999,
                    fontFamily: T.mono,
                    fontSize: 12,
                    fontWeight: 600,
                  }}>
                    {risk.level}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
                  <div>
                    <div style={{ fontFamily: T.mono, fontSize: 11, color: T.text3 }}>Domain</div>
                    <div style={{ color: T.text, fontWeight: 500 }}>{claim.domain}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: T.mono, fontSize: 11, color: T.text3 }}>Claim Type</div>
                    <div style={{ color: T.text, fontWeight: 500 }}>{claim.claim_type}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: T.mono, fontSize: 11, color: T.text3 }}>Confidence</div>
                    <div style={{ color: T.text, fontWeight: 500 }}>{(claim.confidence * 100).toFixed(0)}%</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: T.mono, fontSize: 11, color: T.text3 }}>Validation</div>
                    <div style={{ color: T.text, fontWeight: 500 }}>{claim.validation_result}</div>
                  </div>
                </div>

                {claim.context && (
                  <div style={{ marginTop: 32, padding: 24, background: '#fff', borderRadius: 16, border: `1px solid ${T.border}` }}>
                    <div style={{ fontFamily: T.mono, fontSize: 11, color: T.text3, marginBottom: 8 }}>CONTEXT</div>
                    <p style={{ color: T.text2, lineHeight: 1.7 }}>{claim.context}</p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Transcript Display */}
        <AnimatePresence>
          {transcript && !loading && claims.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                background: T.bg2,
                border: `1px solid ${T.border}`,
                borderRadius: 24,
                padding: 40,
              }}
            >
              <div style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.2em', color: T.text3, marginBottom: 16 }}>EXTRACTED TRANSCRIPT</div>
              <div style={{
                background: '#fff',
                border: `1px solid ${T.border}`,
                borderRadius: 16,
                padding: 32,
                fontFamily: T.mono,
                fontSize: 15,
                lineHeight: 1.8,
                color: T.text,
                maxHeight: 400,
                overflowY: 'auto',
              }}>
                {transcript}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}