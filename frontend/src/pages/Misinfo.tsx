import { useState } from 'react';
import { Panel } from '../components/ui/Panel';
import {
  Search,
  Loader,
  CheckCircle,
  XCircle,
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

export const Misinfo = () => {
  const [text, setText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [scanning, setScanning] = useState(false);

  /* ==========================
      MAIN ANALYSIS HANDLER
  ========================== */
  const handleScan = async () => {
    if (!text.trim()) return;

    setScanning(true);
    setResult(null);

    try {

      const response = await fetch('http://localhost:8081/fact-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
        }),
      });

      if (!response.ok) throw new Error('Backend error');

      const data = await response.json();

      console.log('FACT CHECK RESPONSE:', data);

      setResult({
        claims: data.results
      });
      
    } catch (err) {
      setResult({
        claims: [
          {
            claim: 'Analysis failed',
            verdict: 'INSUFFICIENT',
            citations: [],
          },
        ],
      });
    } finally {
      setScanning(false);
    }
  };

  const isPartialSupport = (claim: any) => {
    if (!claim.scores) return false;
    return (
      claim.verdict === 'SUPPORTED' &&
      claim.scores.entailment < 0.7
    );
  };

  const getWikiFallback = (claim: string) => {
    const query = encodeURIComponent(
      claim.split(' ').slice(0, 6).join(' ')
    );
    return `https://en.wikipedia.org/wiki/Special:Search?search=${query}`;
  };  
  

  /* ==========================
      OCR HANDLER
  ========================== */
  const handleImageUpload = async (file: File) => {
    if (!file) return;

    try {
      const { data } = await Tesseract.recognize(file, 'eng', {
        logger: () => {},
      });

      const extractedText = data.text.trim();

      if (!extractedText) {
        return;
      }

      setText((prev) =>
        prev ? `${prev}\n\n${extractedText}` : extractedText
      );
    } catch {
      // Silently fail if OCR doesn't work
    }
  };

  const verdictStats = result?.claims?.reduce(
    (acc: any, c: any) => {
      acc[c.verdict] = (acc[c.verdict] || 0) + 1;
      return acc;
    },
    {}
  ) || {};
  
  const totalClaims = result?.claims?.length || 0;
  const refutedScore = totalClaims
    ? Math.round((verdictStats?.REFUTED || 0) / totalClaims * 100)
    : 0;
  

  return (
    <div className="h-full flex flex-col gap-8">
      {/* Invisible captcha mount point */}
      <div id="recaptcha" />

      {/* HEADER */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <div className="flex items-center justify-center gap-4 mb-4">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-950/30 border border-cyan-500/30"
          >
            <Shield className="w-6 h-6 text-cyan-400" />
          </motion.div>
          
          <h2
            className="text-4xl font-bold"
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              background: 'linear-gradient(135deg, #ffffff 0%, #00ffff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Reality Checker
          </h2>
        </div>
        
        <p className="text-gray-500 font-mono text-sm tracking-[0.15em] uppercase">
          Textual Analysis & Fact Verification
        </p>
      </motion.header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* INPUT PANEL */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Panel title="Input Data" className="h-full flex flex-col">
  <div className="flex-1 relative">
    {!result ? (
      <textarea
        className="w-full h-full min-h-[400px] bg-black/50 border border-white/10 focus:border-cyan-400/60 p-6 text-white font-mono text-sm outline-none resize-none rounded-xl transition-all"
        style={{ fontFamily: '"JetBrains Mono", monospace' }}
        placeholder="Paste suspicious text here for analysis..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    ) : (
      <div
        className="w-full h-full min-h-[400px] bg-black/50 border border-white/10 p-6 rounded-xl font-mono text-sm whitespace-pre-wrap overflow-y-auto"
        style={{ fontFamily: '"JetBrains Mono", monospace' }}
      >
        {(text.match(/[^.!?]+[.!?]+/g) || [text]).map((sentence, i) => {
          const claim = result?.claims?.[i];
          const verdict = claim && isPartialSupport(claim)
            ? 'PARTIAL'
            : claim?.verdict || 'INSUFFICIENT';
        
          const color =
            verdict === 'REFUTED'
              ? 'bg-red-900/40 text-red-300'
              : verdict === 'SUPPORTED'
              ? 'bg-cyan-900/40 text-cyan-300'
              : 'bg-yellow-900/40 text-yellow-300';          

          return (
            <span key={i} className={`${color} px-1 rounded`}>
              {sentence}
            </span>
          );
        })}
      </div>
    )}

    {/* Character count */}
    <div className="absolute bottom-4 right-4 text-[10px] font-mono text-gray-600">
      {text.length} characters
    </div>
  </div>

  <div className="mt-6 flex justify-between items-center">
  {result && (
    <button
      onClick={() => setResult(null)}
      className="text-xs font-mono text-gray-400 hover:text-cyan-400 transition-colors"
    >
      Reset & Edit Text
    </button>
  )}

  <div className="flex gap-3">
    <label className="relative">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) =>
          e.target.files && handleImageUpload(e.target.files[0])
        }
      />
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="px-6 py-4 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white font-mono text-sm tracking-[0.15em] uppercase font-semibold rounded-xl cursor-pointer flex items-center gap-2"
      >
        <Upload className="w-4 h-4" />
        Upload SS
      </motion.div>
    </label>

    <motion.button
      onClick={handleScan}
      disabled={!text || scanning}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="group relative px-8 py-4 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white font-mono text-sm tracking-[0.15em] uppercase font-semibold rounded-xl overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <span className="relative z-10 flex items-center gap-2">
        {scanning ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Run Diagnostics
          </>
        )}
      </span>
    </motion.button>
  </div>
</div>

</Panel>
        </motion.div>

        {/* RESULT PANEL */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-1"
        >
          <Panel
            title="Analysis Result"
            glow={result ? (refutedScore > 50 ? 'red' : 'cyan') : 'cyan'}
            className="h-full"
          >
            <div className="h-full flex flex-col">
              <AnimatePresence mode="wait">
                {!result && !scanning && (
                  <motion.div
                    key="waiting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center text-center space-y-4"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      className="relative"
                    >
                      <Search className="w-12 h-12 text-gray-700" />
                      <motion.div
                        className="absolute inset-0 border-2 border-cyan-500/30 rounded-full"
                        animate={{ scale: [1, 1.3], opacity: [1, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </motion.div>
                    <p className="text-gray-600 font-mono text-xs uppercase tracking-wide">
                      Waiting for input...
                    </p>
                  </motion.div>
                )}

                {scanning && (
                  <motion.div
                    key="scanning"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <div className="space-y-3 font-mono text-xs">
                      {[
                        { label: 'Captcha', status: 'Verified' },
                        { label: 'Text Analysis', status: 'Running' },
                        { label: 'Pattern Match', status: 'Processing' },
                        { label: 'Fact Check', status: 'Querying' },
                      ].map((step, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.2 }}
                          className="flex justify-between items-center p-3 bg-black/40 border border-cyan-500/20 rounded-lg"
                        >
                          <span className="text-gray-400">{step.label}</span>
                          <span className="text-cyan-400">{step.status}</span>
                        </motion.div>
                      ))}
                    </div>

                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                  </motion.div>
                )}

                {result && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    {/* Score Display */}
                    <div className="text-center p-8 bg-black/40 border border-white/10 rounded-xl relative overflow-hidden">
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent"
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      
                      <div className="relative z-10">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 200 }}
                          className="text-7xl font-bold mb-3"
                          style={{
                            fontFamily: '"JetBrains Mono", monospace',
                            color: refutedScore > 50 ? '#ef4444' : '#22d3ee',
                          }}
                        >
                          {refutedScore}%

                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className={`inline-flex items-center gap-2 px-4 py-2 border rounded-full font-mono text-xs tracking-wide uppercase ${
                            refutedScore > 50
                              ? 'border-red-500 text-red-500 bg-red-950/30'
                              : 'border-cyan-500 text-cyan-500 bg-cyan-950/30'
                          }`}
                        >
                          {refutedScore > 50 ? (
                            <XCircle className="w-3 h-3" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          {refutedScore > 50 ? 'HIGH RISK' : 'LOW RISK'}
                        </motion.div>
                        
                      </div>
                    </div>

                    <div className="space-y-4">
  <h4 className="text-xs font-mono uppercase tracking-wide text-gray-500">
    Sources & Citations
  </h4>

  {(result?.claims || []).map((c: any, i: number) => (
    <div
      key={i}
      className="p-3 bg-black/40 border border-white/10 rounded-lg"
    >
      <p className="text-xs text-gray-400 mb-2">
        {c.claim}
      </p>

      {c.citations?.length ? (
  c.citations.map((url: string, j: number) => (
    <a
      key={j}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block text-cyan-400 text-xs truncate hover:underline"
    >
      {url}
    </a>
  ))
) : (
  <a
    href={getWikiFallback(c.claim)}
    target="_blank"
    rel="noopener noreferrer"
    className="block text-yellow-400 text-xs hover:underline"
  >
    Wikipedia reference (general)
  </a>
)}

    </div>
  ))}
</div>

                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Panel>
        </motion.div>
      </div>

    </div>
  );
};