import React, { useState } from 'react';
import { Panel } from '../components/ui/Panel';
import { GlitchButton } from '../components/ui/GlitchButton';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertTriangle, ExternalLink, BarChart3, TrendingUp, Shield, Eye } from 'lucide-react';

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
  video_id: string;
  url: string;
  title: string;
  duration: string;
  word_count: number;
  transcript_method: string;
  total_claims_found: number;
  misinformation_claims: number;
  high_risk_claims: number;
  misinformation_detected: boolean;
}

/* ================= METRIC BAR ================= */
const MetricBar = ({ label, value, color, highlight }: { label: string; value: number; color: string; highlight?: boolean }) => (
  <div className={`space-y-1.5 transition-all duration-700 ${highlight ? 'opacity-100' : 'opacity-60'}`}>
    <div className="flex justify-between items-center">
      <span className={`text-[10px] font-mono uppercase tracking-widest ${highlight ? 'text-white' : 'text-gray-400'}`}>{label}</span>
      <span className="text-[10px] font-mono text-white">{(value * 100).toFixed(1)}%</span>
    </div>
    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
      <motion.div
        animate={{ width: `${Math.min(value * 100, 100)}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        className={`h-full ${color} ${highlight ? 'shadow-[0_0_12px_rgba(255,255,255,0.4)]' : ''}`}
      />
    </div>
  </div>
);

/* ================= STAT CARD ================= */
const StatCard = ({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="relative bg-obsidian/60 backdrop-blur-sm border border-white/10 p-4 hover:border-white/20 transition-all duration-300"
  >
    <div className="flex items-center justify-between">
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-gray-400 uppercase tracking-wider">{label}</div>
      </div>
      <div className={`p-2 rounded-lg ${color}`}>
        {icon}
      </div>
    </div>
  </motion.div>
);

export default function YouTubeIngest() {
  const [transcript, setTranscript] = useState('');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [videoUrl, setVideoUrl] = useState('');
  const [stats, setStats] = useState({
    total_claims: 0,
    high_risk: 0,
    medium_risk: 0,
    low_risk: 0,
    misinformation: 0
  });

  const handleVideoSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/youtube/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl.trim() })
      });
      const data = await response.json();
      setTranscript(data.transcript);
      setClaims(data.claims);
      setVideoMetadata(data.video_metadata);
      calculateStats(data.claims);
    } catch (error) {
      console.error('Error processing video:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (claimsData: Claim[]) => {
    const stats = {
      total_claims: claimsData.length,
      high_risk: claimsData.filter(c => c.risk_score >= 70).length,
      medium_risk: claimsData.filter(c => c.risk_score >= 40 && c.risk_score < 70).length,
      low_risk: claimsData.filter(c => c.risk_score < 40).length,
      misinformation: claimsData.filter(c => c.is_misinformation).length
    };
    setStats(stats);
  };

  const filteredClaims = claims.filter(claim => {
    if (filter === 'all') return true;
    if (filter === 'high') return claim.risk_score >= 70;
    if (filter === 'medium') return claim.risk_score >= 40 && claim.risk_score < 70;
    if (filter === 'low') return claim.risk_score < 40;
    if (filter === 'misinformation') return claim.is_misinformation;
    return true;
  });

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'bg-red-500 shadow-[0_0_12px_rgba(255,0,51,0.5)]';
    if (score >= 40) return 'bg-yellow-500 shadow-[0_0_12px_rgba(255,191,0,0.5)]';
    return 'bg-green-500 shadow-[0_0_12px_rgba(0,255,0,0.5)]';
  };

  const getRiskLevel = (score: number) => {
    if (score >= 70) return { level: 'High', color: 'text-red-400' };
    if (score >= 40) return { level: 'Medium', color: 'text-yellow-400' };
    return { level: 'Low', color: 'text-green-400' };
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <ExternalLink className="w-6 h-6 text-red-500" />
          </motion.div>
          <h1 className="text-3xl font-display font-bold uppercase tracking-wider">YouTube Misinformation Analysis</h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 border border-red-500/30 rounded-full">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs text-red-400 font-mono">Beta</span>
        </div>
      </div>

      {/* Video Input Form */}
      <Panel title="Analyze YouTube Video" glow="red">
        <form onSubmit={handleVideoSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-gray-400">YouTube Video URL</label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={loading}
              className="w-full px-4 py-3 bg-obsidian/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-red-500/50 focus:outline-none transition-all duration-300"
            />
          </div>
          <GlitchButton 
            type="submit" 
            disabled={!videoUrl.trim() || loading} 
            className="w-full"
            variant="primary"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing Video...
              </>
            ) : (
              'Analyze Video'
            )}
          </GlitchButton>
        </form>
      </Panel>

      {/* Video Information */}
      <AnimatePresence>
        {videoMetadata && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Panel title="Video Information" glow="cyan">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Title</p>
                  <p className="font-medium text-sm truncate">{videoMetadata.title}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Duration</p>
                  <p className="font-medium text-sm">{videoMetadata.duration}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Words</p>
                  <p className="font-medium text-sm">{videoMetadata.word_count}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Method</p>
                  <p className="font-medium text-sm">{videoMetadata.transcript_method}</p>
                </div>
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Cards */}
      <AnimatePresence>
        {claims.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-5 gap-4"
          >
            <StatCard 
              label="Total Claims" 
              value={stats.total_claims} 
              color="bg-blue-500/20"
              icon={<BarChart3 className="w-4 h-4 text-blue-400" />}
            />
            <StatCard 
              label="High Risk" 
              value={stats.high_risk} 
              color="bg-red-500/20"
              icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
            />
            <StatCard 
              label="Medium Risk" 
              value={stats.medium_risk} 
              color="bg-yellow-500/20"
              icon={<TrendingUp className="w-4 h-4 text-yellow-400" />}
            />
            <StatCard 
              label="Low Risk" 
              value={stats.low_risk} 
              color="bg-green-500/20"
              icon={<Shield className="w-4 h-4 text-green-400" />}
            />
            <StatCard 
              label="Misinformation" 
              value={stats.misinformation} 
              color="bg-purple-500/20"
              icon={<Eye className="w-4 h-4 text-purple-400" />}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter */}
      <AnimatePresence>
        {claims.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center gap-4"
          >
            <label className="text-xs font-mono uppercase tracking-wider text-gray-400">Filter Claims</label>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 bg-obsidian/50 border border-white/10 rounded-lg text-white text-sm focus:border-red-500/50 focus:outline-none transition-all duration-300"
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
            >
              <Panel title={`Claim Analysis - Risk: ${risk.level}`} glow={claim.risk_score >= 70 ? 'red' : claim.risk_score >= 40 ? 'purple' : 'cyan'}>
                {claim.is_misinformation && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 text-sm font-medium">⚠️ Misinformation Detected</span>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Claim Text</p>
                    <p className="text-white font-medium">{claim.text}</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Domain</p>
                      <p className="text-sm text-white">{claim.domain}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Claim Type</p>
                      <p className="text-sm text-white">{claim.claim_type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Confidence</p>
                      <p className="text-sm text-white">{(claim.confidence * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Validation</p>
                      <p className="text-sm text-white">{claim.validation_result}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Method Accuracy</p>
                      <p className="text-sm text-white">{(claim.method_accuracy * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Evidence Count</p>
                      <p className="text-sm text-white">{claim.evidence_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Research Grade</p>
                      <p className="text-sm text-white">{claim.research_grade ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Analysis Method</p>
                      <p className="text-sm text-white">{claim.analysis_method}</p>
                    </div>
                  </div>

                  {/* Risk Analysis */}
                  <div className="border-t border-white/10 pt-4">
                    <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-red-400" />
                      Risk Analysis
                    </h4>
                    
                    <div className="space-y-3">
                      <MetricBar 
                        label="Overall Risk" 
                        value={claim.risk_score / 100} 
                        color={getRiskColor(claim.risk_score)}
                        highlight={claim.risk_score >= 70}
                      />
                      <MetricBar 
                        label="Claim Validity" 
                        value={claim.confidence} 
                        color="bg-blue-500 shadow-[0_0_12px_rgba(0,100,255,0.5)]"
                        highlight={claim.confidence > 0.7}
                      />
                      <MetricBar 
                        label="Method Accuracy" 
                        value={claim.method_accuracy} 
                        color="bg-purple-500 shadow-[0_0_12px_rgba(128,0,255,0.5)]"
                        highlight={claim.method_accuracy > 0.8}
                      />
                    </div>

                    {/* Risk Factors */}
                    <div className="mt-4 p-3 bg-obsidian/30 rounded-lg">
                      <h5 className="text-xs font-medium text-gray-300 mb-2">Risk Factors</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-1 ${
                            claim.risk_score >= 70 ? 'bg-red-500' : 'bg-gray-500'
                          }`}></div>
                          <span className="text-gray-400">High Risk Score</span>
                        </div>
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-1 ${
                            claim.confidence <= 0.5 ? 'bg-red-500' : 'bg-gray-500'
                          }`}></div>
                          <span className="text-gray-400">Low Validity</span>
                        </div>
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-1 ${
                            claim.method_accuracy <= 0.6 ? 'bg-red-500' : 'bg-gray-500'
                          }`}></div>
                          <span className="text-gray-400">Poor Method</span>
                        </div>
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-1 ${
                            claim.dataset_warning ? 'bg-orange-500' : 'bg-gray-500'
                          }`}></div>
                          <span className="text-gray-400">Dataset Issues</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {claim.context && (
                    <div className="p-3 bg-obsidian/30 rounded-lg">
                      <p className="text-xs font-medium text-gray-300 mb-1">Context</p>
                      <p className="text-sm text-gray-400 italic">{claim.context}</p>
                    </div>
                  )}
                </div>
              </Panel>
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
            exit={{ opacity: 0, y: -20 }}
          >
            <Panel title="Transcript" glow="cyan">
              <div className="max-h-96 overflow-y-auto bg-obsidian/30 p-4 rounded-lg">
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{transcript}</p>
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
