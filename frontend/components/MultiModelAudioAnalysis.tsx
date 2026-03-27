import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileAudio, Loader, CheckCircle, AlertTriangle, Activity, Zap } from 'lucide-react';
import { modelService, ModelResult, MultiModelAnalysis } from '../services/modelService';

interface MultiModelAudioAnalysisProps {
  onAnalysisComplete: (result: MultiModelAnalysis) => void;
}

export const MultiModelAudioAnalysis: React.FC<MultiModelAudioAnalysisProps> = ({ onAnalysisComplete }) => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<MultiModelAnalysis | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      setResult(null);
    }
  };

  const analyzeWithAllModels = async () => {
    if (!audioFile) return;

    setAnalyzing(true);
    try {
      const analysisResult = await modelService.analyzeWithAllModels(audioFile);
      setResult(analysisResult);
      onAnalysisComplete(analysisResult);
    } catch (error) {
      console.error('Multi-model analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const getModelStatusColor = (modelResult: ModelResult) => {
    if (modelResult.error) return 'text-red-500';
    if (modelResult.is_deepfake) return 'text-orange-500';
    return 'text-green-500';
  };

  const getModelStatusIcon = (modelResult: ModelResult) => {
    if (modelResult.error) return <AlertTriangle className="w-4 h-4" />;
    if (modelResult.is_deepfake) return <Zap className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-400" />
          Multi-Model Audio Analysis
        </h3>
        
        {!audioFile ? (
          <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-white/20 rounded-xl bg-black/30 cursor-pointer group hover:border-purple-500/50 transition-all">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-center"
            >
              <FileAudio className="w-8 h-8 mx-auto text-gray-600 group-hover:text-purple-400 transition-colors mb-2" />
              <p className="text-sm font-mono text-gray-500 group-hover:text-gray-400">
                Upload audio for multi-model analysis
              </p>
              <p className="text-xs font-mono text-gray-700 mt-1">
                WAV, MP3, M4A supported
              </p>
            </motion.div>
            <input
              type="file"
              accept="audio/*"
              hidden
              onChange={handleFileChange}
            />
          </label>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-black/60 rounded-lg border border-purple-500/30">
              <FileAudio className="w-5 h-5 text-purple-400" />
              <div className="flex-1">
                <p className="text-sm font-mono text-white truncate">
                  {audioFile.name}
                </p>
                <p className="text-xs font-mono text-gray-500">
                  {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={() => {
                  setAudioFile(null);
                  setResult(null);
                }}
                className="text-gray-500 hover:text-red-400 transition-colors"
              >
                ×
              </button>
            </div>

            <motion.button
              onClick={analyzeWithAllModels}
              disabled={analyzing}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-xl font-mono text-sm tracking-wide transition-all disabled:opacity-50 relative overflow-hidden group"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="relative z-10 flex items-center justify-center gap-2">
                {analyzing ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Analyzing with 3 Models...
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4" />
                    Analyze with All Models
                  </>
                )}
              </span>
            </motion.button>
          </div>
        )}
      </div>

      {/* Results Section */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Consensus Result */}
          <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h4 className="text-lg font-bold text-white mb-4">Consensus Result</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${result.consensus.prediction === 'fake' ? 'text-red-500' : 'text-green-500'}`}>
                  {result.consensus.prediction.toUpperCase()}
                </div>
                <p className="text-xs text-gray-500 mt-1">Final Prediction</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {(result.consensus.confidence * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500 mt-1">Confidence</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">
                  {result.consensus.agreement_count}/{result.consensus.total_models}
                </div>
                <p className="text-xs text-gray-500 mt-1">Model Agreement</p>
              </div>
            </div>
          </div>

          {/* Individual Model Results */}
          <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h4 className="text-lg font-bold text-white mb-4">Individual Model Results</h4>
            <div className="space-y-3">
              {result.results.map((modelResult, index) => (
                <motion.div
                  key={modelResult.modelId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-black/60 rounded-lg border border-white/10 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getModelStatusIcon(modelResult)}
                      <span className="font-mono text-sm text-white">
                        {modelResult.modelName}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-mono ${getModelStatusColor(modelResult)}`}>
                        {modelResult.error ? 'ERROR' : modelResult.prediction.toUpperCase()}
                      </div>
                      {modelResult.response_time && (
                        <div className="text-[10px] font-mono text-gray-500">
                          {modelResult.response_time}ms
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {!modelResult.error && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Confidence:</span>
                        <span className="text-white font-mono">
                          {(modelResult.confidence * 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Fake Prob:</span>
                        <span className="text-orange-400 font-mono">
                          {(modelResult.fake_probability * 100).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {modelResult.error && (
                    <div className="text-xs text-red-400 font-mono mt-2">
                      {modelResult.error}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h4 className="text-lg font-bold text-white mb-4">Performance Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Analysis Time:</span>
                <span className="text-white font-mono">{result.analysis_time}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Average Response Time:</span>
                <span className="text-white font-mono">
                  {Math.round(result.results.reduce((sum, r) => sum + (r.response_time || 0), 0) / result.results.length)}ms
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
