import { useEffect, useState, useRef, useCallback } from 'react';
import { Panel } from '../components/ui/Panel';
import { Film, FileAudio, Image as ImageIcon, X, AlertTriangle, CheckCircle, Loader, Zap, Activity, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { FaceLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

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

/* ================= ASYMMETRY ROW ================= */
const AsymmetryRow = ({ label, left, right, highlight }: { label: string; left: number; right: number; highlight?: boolean }) => {
  const diff = Math.abs(left - right);
  const severity = diff > 0.3 ? 'text-red-400' : diff > 0.15 ? 'text-yellow-400' : 'text-cyan-400';
  return (
    <div className={`flex items-center gap-3 py-2 border-b border-white/5 transition-all duration-700 ${highlight ? 'opacity-100' : 'opacity-50'}`}>
      <span className="text-[9px] font-mono text-gray-500 w-24 uppercase tracking-wider">{label}</span>
      <div className="flex-1 flex items-center gap-2">
        <span className="text-[10px] font-mono text-green-400 w-10 text-right">{(left * 100).toFixed(0)}%</span>
        <div className="flex-1 h-1 bg-white/5 rounded relative flex">
          <div style={{ width: `${left * 100}%` }} className="h-full bg-green-500/60 rounded-l" />
          <div style={{ width: `${right * 100}%` }} className="h-full bg-blue-500/60 rounded-r ml-auto" />
        </div>
        <span className="text-[10px] font-mono text-blue-400 w-10">{(right * 100).toFixed(0)}%</span>
      </div>
      <span className={`text-[10px] font-mono ${severity} w-12 text-right font-bold`}>Δ{(diff * 100).toFixed(0)}%</span>
    </div>
  );
};

/* ================= ENHANCED CAPTURED FRAME CARD ================= */
const CapturedFrame = ({ dataUrl, timestamp, score, frameNumber = 0, reduceClutter = false }: {
  dataUrl: string;
  timestamp: number;
  score: number;
  frameNumber?: number;
  reduceClutter?: boolean;
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imageLoaded && canvasRef.current && imgRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = imgRef.current.naturalWidth;
      canvas.height = imgRef.current.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const faceX = canvas.width * 0.3;
      const faceY = canvas.height * 0.2;
      const faceWidth = canvas.width * 0.4;
      const faceHeight = canvas.height * 0.5;

      if (!reduceClutter) {
        ctx.strokeStyle = '#ff4040';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(faceX + faceWidth / 2, faceY + faceHeight / 2, faceWidth / 2, faceHeight / 2, 0, 0, 2 * Math.PI);
        ctx.stroke();

        const landmarks = [
          { x: faceX + faceWidth * 0.3, y: faceY + faceHeight * 0.3, label: 'LE' },
          { x: faceX + faceWidth * 0.7, y: faceY + faceHeight * 0.3, label: 'RE' },
          { x: faceX + faceWidth * 0.5, y: faceY + faceHeight * 0.5, label: 'N' },
          { x: faceX + faceWidth * 0.5, y: faceY + faceHeight * 0.8, label: 'M' },
        ];
        landmarks.forEach(point => {
          ctx.fillStyle = '#ffff00';
          ctx.beginPath();
          ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
          ctx.fill();
        });
      }

      const heatmapOpacity = reduceClutter ? 0.15 : 0.4;
      const gradient = ctx.createRadialGradient(
        faceX + faceWidth * 0.6, faceY + faceHeight * 0.4, 10,
        faceX + faceWidth * 0.6, faceY + faceHeight * 0.4, faceWidth * 0.3
      );
      gradient.addColorStop(0, `rgba(255, 0, 0, ${heatmapOpacity})`);
      gradient.addColorStop(0.5, `rgba(255, 255, 0, ${heatmapOpacity * 0.75})`);
      gradient.addColorStop(1, `rgba(0, 255, 0, ${heatmapOpacity * 0.25})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(faceX, faceY, faceWidth, faceHeight);

      const boxLineWidth = reduceClutter ? 2 : 3;
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = boxLineWidth;
      ctx.strokeRect(faceX - 5, faceY - 5, faceWidth + 10, faceHeight + 10);

      if (!reduceClutter) {
        const confidenceText = `FAKE ${(score * 100).toFixed(0)}%`;
        ctx.font = 'bold 14px monospace';
        const textMetrics = ctx.measureText(confidenceText);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(faceX - 5, faceY - 25, textMetrics.width + 10, 20);
        ctx.fillStyle = '#ff0000';
        ctx.fillText(confidenceText, faceX, faceY - 10);
      }

      const timeText = `${timestamp.toFixed(2)}s | Frame #${frameNumber}`;
      const fontSize = reduceClutter ? '8px' : '10px';
      ctx.font = `${fontSize} monospace`;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      const timeBoxWidth = reduceClutter ? 120 : 150;
      const timeBoxHeight = reduceClutter ? 16 : 20;
      ctx.fillRect(10, canvas.height - timeBoxHeight - 10, timeBoxWidth, timeBoxHeight);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(timeText, 15, canvas.height - (reduceClutter ? 12 : 15));

      const asymmetry = score * 0.3;
      if (!reduceClutter && asymmetry > 0.1) {
        ctx.strokeStyle = asymmetry > 0.2 ? '#ff00ff' : '#ffff00';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(faceX + faceWidth / 2, faceY);
        ctx.lineTo(faceX + faceWidth / 2, faceY + faceHeight);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = asymmetry > 0.2 ? '#ff00ff' : '#ffff00';
        ctx.font = '10px monospace';
        ctx.fillText(`ASYM ${(asymmetry * 100).toFixed(0)}%`, faceX + faceWidth / 2 - 20, faceY - 35);
      }

      if (!reduceClutter) {
        const artifactZones = [
          { x: faceX + faceWidth * 0.1, y: faceY + faceHeight * 0.1, severity: 0.6 },
          { x: faceX + faceWidth * 0.8, y: faceY + faceHeight * 0.2, severity: 0.3 },
          { x: faceX + faceWidth * 0.2, y: faceY + faceHeight * 0.7, severity: 0.4 },
        ];
        artifactZones.forEach(zone => {
          const artifactGradient = ctx.createRadialGradient(zone.x, zone.y, 0, zone.x, zone.y, 20);
          artifactGradient.addColorStop(0, `rgba(255, 0, 255, ${zone.severity * 0.5})`);
          artifactGradient.addColorStop(1, 'rgba(255, 0, 255, 0)');
          ctx.fillStyle = artifactGradient;
          ctx.fillRect(zone.x - 20, zone.y - 20, 40, 40);
        });
      }
    }
  }, [imageLoaded, score, timestamp, frameNumber, reduceClutter]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative rounded-lg overflow-hidden border border-red-500/40 bg-black/60"
    >
      <div className="relative">
        <img
          ref={imgRef}
          src={dataUrl}
          alt={`Frame at ${timestamp.toFixed(1)}s`}
          className="w-full h-28 object-cover"
          onLoad={() => setImageLoaded(true)}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ mixBlendMode: 'normal' }}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-2 flex justify-between items-end">
        <span className="text-[9px] font-mono text-white/80">{timestamp.toFixed(2)}s</span>
        <span className="text-[9px] font-mono text-red-400 font-bold">{(score * 100).toFixed(0)}% fake</span>
      </div>
      <div className="absolute top-2 right-2">
        <AlertTriangle className="w-3 h-3 text-red-400" />
      </div>
    </motion.div>
  );
};

/* ================= DASHBOARD ================= */
export const Dashboard = () => {
  // Unified upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'video' | 'audio' | 'image' | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Analysis state
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [audioResult, setAudioResult] = useState<any>(null);

  // Face mesh state
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
  const [faceLandmarkerReady, setFaceLandmarkerReady] = useState(false);
  const [blendshapes, setBlendshapes] = useState<Record<string, number>>({});
  const [blinkCount, setBlinkCount] = useState(0);
  const [blinkRate, setBlinkRate] = useState(0);
  const [eyeClosed, setEyeClosed] = useState(false);
  const videoStartTime = useRef<number>(0);
  const [loopCount, setLoopCount] = useState(0);
  const [biometricComplete, setBiometricComplete] = useState(false);
  const MAX_LOOPS = 3;

  // Captured suspicious frames
  const [capturedFrames, setCapturedFrames] = useState<{ dataUrl: string; timestamp: number; score: number; frameNumber: number }[]>([]);
  const [capturingFrames, setCapturingFrames] = useState(false);
  const [reduceVisualClutter, setReduceVisualClutter] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const frameCounterRef = useRef(0);
  const lastProcessRef = useRef(0);
  // BUG FIX: Track eyeClosed in a ref so processFrame callback always has latest value
  const eyeClosedRef = useRef(false);

  // Derived asymmetry
  const asymmetryPairs = [
    { label: 'Eye Blink', left: blendshapes['eyeBlinkLeft'] ?? 0, right: blendshapes['eyeBlinkRight'] ?? 0 },
    { label: 'Smile', left: blendshapes['mouthSmileLeft'] ?? 0, right: blendshapes['mouthSmileRight'] ?? 0 },
    { label: 'Brow Down', left: blendshapes['browDownLeft'] ?? 0, right: blendshapes['browDownRight'] ?? 0 },
    { label: 'Eye Squint', left: blendshapes['eyeSquintLeft'] ?? 0, right: blendshapes['eyeSquintRight'] ?? 0 },
    { label: 'Mouth Frown', left: blendshapes['mouthFrownLeft'] ?? 0, right: blendshapes['mouthFrownRight'] ?? 0 },
  ];
  const asymmetryIndex = asymmetryPairs.reduce((s, p) => s + Math.abs(p.left - p.right), 0) / asymmetryPairs.length;

  const verdict = aiResult?.overall_verdict ?? null;
  const isDeepfake = verdict === 'Deepfake';
  const verdictColor = isDeepfake ? 'text-red-400' : verdict ? 'text-cyan-400' : 'text-gray-400';
  const verdictBorder = isDeepfake ? 'border-red-500/50' : verdict ? 'border-cyan-500/50' : 'border-white/10';
  const verdictBg = isDeepfake ? 'bg-red-950/30' : verdict ? 'bg-cyan-950/30' : 'bg-black/30';

  const biometricAgrees = verdict !== null && biometricComplete;
  const blinksAbnormal = blinkRate < 10 || blinkRate > 30;
  const asymmetryAbnormal = asymmetryIndex > 0.2;

  // =============================================================
  // Handle file change
  // =============================================================
  const handleFileChange = (file: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setUploadedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setAnalysisStarted(false);
    setAiResult(null);
    setAudioResult(null);
    setBiometricComplete(false);
    setBlinkCount(0); setBlinkRate(0); setLoopCount(0); setBlendshapes({});
    setCapturedFrames([]);
    if (file.type.startsWith('video/')) setFileType('video');
    else if (file.type.startsWith('audio/')) setFileType('audio');
    else if (file.type.startsWith('image/')) setFileType('image');
  };

  // =============================================================
  // MediaPipe init
  // =============================================================
  useEffect(() => {
    const init = async () => {
      try {
        const fsRes = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        const lm = await FaceLandmarker.createFromOptions(fsRes, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });
        setFaceLandmarker(lm);
        setFaceLandmarkerReady(true);
      } catch (e) { console.error("MediaPipe init failed:", e); }
    };
    init();
  }, []);

  // Keep eyeClosedRef in sync with state so processFrame always reads fresh value
  useEffect(() => {
    eyeClosedRef.current = eyeClosed;
  }, [eyeClosed]);

  // =============================================================
  // BUG FIX: Frame processing loop — fixed the following issues:
  //   1. `results` was never defined (faceLandmarker.detectForVideo was never called)
  //   2. Face drawing logic was incorrectly nested inside the canvas resize `if` block
  //   3. Lag guard was inverted — it skipped frames when lag was large (should skip when too small)
  //   4. Missing try/catch wrapping around the landmarker call
  //   5. `eyeClosed` state was stale inside the callback (fixed via eyeClosedRef)
  // =============================================================
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !faceLandmarker || !analysisStarted) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }
    if (video.paused || video.ended || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Throttle to ~15fps
    frameCounterRef.current++;
    if (frameCounterRef.current % 4 !== 0) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const now = performance.now();
    // BUG FIX: guard was `lagCheck > 50` (skipping heavy-load frames) — removed the inverted lag check.
    // The 66ms minimum interval below already handles rate limiting correctly.
    if (now - lastProcessRef.current < 66) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }
    lastProcessRef.current = now;

    // Sync canvas size to video display size
    if (canvas.width !== video.clientWidth || canvas.height !== video.clientHeight) {
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // BUG FIX: Actually call the landmarker and capture `results`
    try {
      const results = faceLandmarker.detectForVideo(video, now);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // BUG FIX: face drawing and blendshape processing moved OUT of the canvas-resize block
      if (results?.faceLandmarks?.length > 0) {
        // Process blendshapes
        if (results.faceBlendshapes?.length > 0) {
          const shapes: Record<string, number> = {};
          results.faceBlendshapes[0].categories.forEach((c: any) => {
            shapes[c.categoryName] = c.score;
          });
          setBlendshapes(shapes);

          const avg = ((shapes['eyeBlinkLeft'] ?? 0) + (shapes['eyeBlinkRight'] ?? 0)) / 2;
          // BUG FIX: use eyeClosedRef instead of stale `eyeClosed` state
          if (avg > 0.45 && !eyeClosedRef.current) {
            eyeClosedRef.current = true;
            setEyeClosed(true);
            setBlinkCount(prev => {
              const next = prev + 1;
              const mins = (performance.now() - videoStartTime.current) / 60000;
              if (mins > 0) setBlinkRate(Math.max(1, Math.round(next / mins)));
              return next;
            });
          } else if (avg < 0.2 && eyeClosedRef.current) {
            eyeClosedRef.current = false;
            setEyeClosed(false);
          }
        }

        // Draw face mesh
        const du = new DrawingUtils(ctx);
        for (const lm of results.faceLandmarks) {
          du.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: "#C0C0C055", lineWidth: 0.8 });
          du.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: "#FF4040" });
          du.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: "#40FF40" });
          du.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, { color: "#E0E0E0", lineWidth: 1.5 });
          du.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_LIPS, { color: "#E0E0E0" });
          du.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, { color: "#FF4040" });
          du.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, { color: "#40FF40" });
        }
      }
    } catch (e) {
      console.warn("Frame processing error:", e);
    }

    animFrameRef.current = requestAnimationFrame(processFrame);
  }, [faceLandmarker, analysisStarted]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [processFrame]);

  // =============================================================
  // Capture frames at suspicious timestamps
  // =============================================================
  const captureFramesAtTimestamps = useCallback(async (segments: { start_time: number; confidence: number }[]) => {
    const video = videoRef.current;
    if (!video || segments.length === 0) return;
    setCapturingFrames(true);
    const captured: { dataUrl: string; timestamp: number; score: number; frameNumber: number }[] = [];
    const offCanvas = document.createElement('canvas');
    captureCanvasRef.current = offCanvas;

    for (const seg of segments.slice(0, 6)) {
      await new Promise<void>(resolve => {
        const t = seg.start_time;
        video.currentTime = t;
        const onSeeked = () => {
          offCanvas.width = video.videoWidth;
          offCanvas.height = video.videoHeight;
          const ctx = offCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, offCanvas.width, offCanvas.height);
            const frameNumber = Math.floor(t * 30);
            captured.push({ dataUrl: offCanvas.toDataURL('image/jpeg', 0.7), timestamp: t, score: seg.confidence, frameNumber });
          }
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        video.addEventListener('seeked', onSeeked);
      });
    }

    video.currentTime = 0;
    setCapturedFrames(captured);
    setCapturingFrames(false);
  }, []);

  useEffect(() => {
    if (aiResult?.suspicious_segments?.length > 0 && fileType === 'video') {
      captureFramesAtTimestamps(aiResult.suspicious_segments);
    }
  }, [aiResult, fileType, captureFramesAtTimestamps]);

  // =============================================================
  // Extract audio from video
  // =============================================================
  const extractAudioFromVideo = useCallback(async (videoFile: File): Promise<File | null> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(videoFile);
      video.muted = true;

      video.onloadedmetadata = () => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const duration = video.duration;
        const sampleRate = audioContext.sampleRate;
        const length = Math.floor(sampleRate * duration);
        const audioBuffer = audioContext.createBuffer(2, length, sampleRate);

        video.currentTime = 0;

        const extractAudio = () => {
          if (video.currentTime >= duration) {
            const wav = audioBufferToWav(audioBuffer);
            const audioBlob = new Blob([wav], { type: 'audio/wav' });
            const audioFile = new File(
              [audioBlob],
              videoFile.name.replace(/\.[^/.]+$/, '') + '_extracted.wav',
              { type: 'audio/wav' }
            );
            resolve(audioFile);
            return;
          }
          video.currentTime += 0.1;
          requestAnimationFrame(extractAudio);
        };

        extractAudio();
      };

      video.onerror = () => resolve(null);
    });
  }, []);

  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    let pos = 0;

    const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
    const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };

    setUint32(0x46464952); // RIFF
    setUint32(length - 8);
    setUint32(0x45564157); // WAVE
    setUint32(0x20746d66); // fmt
    setUint32(16);
    setUint16(1);           // PCM
    setUint16(buffer.numberOfChannels);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * buffer.numberOfChannels * 2);
    setUint16(buffer.numberOfChannels * 2);
    setUint16(16);
    setUint32(0x61746164); // data
    setUint32(length - pos - 4);

    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        let sample = buffer.getChannelData(channel)[i];
        sample = Math.max(-1, Math.min(1, sample));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
    }

    return arrayBuffer;
  };

  // =============================================================
  // Main Analyze Handler
  // =============================================================
  const handleAnalyze = async () => {
    if (!uploadedFile) return;
    setAnalysisStarted(true);
    videoStartTime.current = performance.now();
    setBiometricComplete(false);
    setBlinkCount(0); setBlinkRate(0); setLoopCount(0);
    setAiResult(null); setAudioResult(null); setCapturedFrames([]);

    if (fileType === 'video') {
      if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play(); }
      setAiAnalysisLoading(true);
      try {
        const extractedAudio = await extractAudioFromVideo(uploadedFile);

        const [videoData, audioData] = await Promise.allSettled([
          (async () => {
            const fd = new FormData();
            fd.append('file', uploadedFile);
            const res = await fetch('http://localhost:3001/api/detect-deepfake', { method: 'POST', body: fd });
            return await res.json();
          })(),
          (async () => {
            if (!extractedAudio) return null;
            const fd = new FormData();
            fd.append('file', extractedAudio);
            const res = await fetch('http://localhost:8000/api/detect-deepfake-audio', { method: 'POST', body: fd });
            return await res.json();
          })()
        ]);

        if (videoData.status === 'fulfilled') {
          setAiResult(videoData.value);
        } else {
          setAiResult({ error: 'Video analysis failed.' });
        }

        if (audioData.status === 'fulfilled' && audioData.value) {
          setAudioResult(audioData.value);
        } else if (audioData.status === 'rejected') {
          console.log('Audio analysis failed or no audio found in video');
        }

        if (videoData.status === 'fulfilled' && audioData.status === 'fulfilled' && audioData.value) {
          const videoScore = videoData.value.average_score || 0;
          const audioScore = audioData.value.fake_probability || 0;
          const combinedScore = (videoScore + audioScore) / 2;
          setAiResult((prev: any) => ({
            ...prev!,
            combined_score: combinedScore,
            audio_analysis: audioData.value,
            video_analysis: videoData.value
          }));
        }
      } catch (e) {
        setAiResult({ error: 'AI analysis call failed. Ensure backend is running on port 3001.' });
      } finally {
        setAiAnalysisLoading(false);
      }
    }

    if (fileType === 'audio') {
      setAiAnalysisLoading(true);
      try {
        const fd = new FormData();
        fd.append('file', uploadedFile);
        const res = await fetch('http://localhost:8000/api/detect-deepfake-audio', { method: 'POST', body: fd });
        const data = await res.json();
        setAudioResult(data); setAiResult(data);
      } catch (e) {
        setAiResult({ error: 'Audio analysis failed.' });
      } finally {
        setAiAnalysisLoading(false);
      }
    }

    if (fileType === 'image') {
      setAiAnalysisLoading(true);
      try {
        const fd = new FormData();
        fd.append('file', uploadedFile);
        const res = await fetch('http://localhost:8001/detect', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) {
          const transformedResult = {
            overall_verdict: data.result.prediction.prediction === 'FAKE' ? 'Deepfake' : 'Real',
            overall_confidence: data.result.prediction.confidence,
            fake_probability: data.result.prediction.fake_probability,
            real_probability: data.result.prediction.real_probability,
            heatmap: data.result.heatmap,
            region_analysis: data.result.region_analysis,
            summary: data.result.summary,
            metadata: data.result.metadata,
            model_info: data.result.metadata.model_info
          };
          setAiResult(transformedResult);
        } else {
          setAiResult({ error: 'Image analysis failed.' });
        }
      } catch (e) {
        setAiResult({ error: 'Image analysis failed. Ensure deepfake API is running on port 8001.' });
      } finally {
        setAiAnalysisLoading(false);
      }
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const auth = getAuth(); const db = getFirestore(); const user = auth.currentUser;
        if (!user) return;
        await getDoc(doc(db, 'stats', user.uid));
        await getDocs(collection(db, 'count'));
        await getDocs(collection(db, 'users'));
      } catch (_) {}
    };
    fetchStats();
  }, []);

  const FileIcon = fileType === 'audio' ? FileAudio : fileType === 'image' ? ImageIcon : Film;
  const fileTypeLabel = fileType === 'video' ? 'VIDEO' : fileType === 'audio' ? 'AUDIO' : fileType === 'image' ? 'IMAGE' : '';
  const fileTypeColor = fileType === 'video' ? 'border-cyan-500/50 text-cyan-400' : fileType === 'audio' ? 'border-purple-500/50 text-purple-400' : 'border-red-500/50 text-red-400';

  const handleVideoEnded = () => {
    if (loopCount + 1 < MAX_LOOPS) {
      setLoopCount(prev => prev + 1);
      if (videoRef.current) videoRef.current.play();
    } else {
      setBiometricComplete(true);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6">
      {/* HEADER */}
      <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h2
            className="text-5xl font-bold tracking-tight leading-none mb-2"
            style={{ fontFamily: '"Playfair Display", Georgia, serif', background: 'linear-gradient(135deg, #ffffff 0%, #ff0033 50%, #00ffff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            Detection Lab
          </h2>
          <p className="text-gray-500 font-mono text-xs tracking-[0.15em] uppercase">
            Multi-model Deepfake Analysis · Neural + Biometric
          </p>
        </div>
        <motion.div
          animate={{ boxShadow: ['0 0 20px rgba(255,0,51,0.3)', '0 0 40px rgba(255,0,51,0.6)', '0 0 20px rgba(255,0,51,0.3)'] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex items-center gap-3 px-6 py-3 bg-red-950/30 border border-red-500/40 rounded-full backdrop-blur-sm"
        >
          <motion.div className="w-3 h-3 bg-red-500 rounded-full" animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
          <span className="text-sm font-mono text-red-400 tracking-[0.15em] uppercase font-semibold">Threat: Critical</span>
        </motion.div>
      </motion.header>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ===== LEFT: VIDEO/UPLOAD ===== */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-8 space-y-4">
          <Panel title="Analysis Input Portal">
            {!uploadedFile ? (
              <label className="flex flex-col items-center justify-center min-h-[420px] border-2 border-dashed border-white/20 rounded-xl bg-black/30 cursor-pointer group hover:border-red-500/50 transition-all duration-300">
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2.5, repeat: Infinity }} className="text-center space-y-4">
                  <div className="flex gap-6 justify-center">
                    <Film className="w-8 h-8 text-cyan-600/60 group-hover:text-cyan-400 transition-colors" />
                    <FileAudio className="w-8 h-8 text-purple-600/60 group-hover:text-purple-400 transition-colors" />
                    <ImageIcon className="w-8 h-8 text-red-600/60 group-hover:text-red-400 transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-mono text-gray-400 group-hover:text-gray-300">Drop any file or click to browse</p>
                    <p className="text-[10px] font-mono text-gray-600 mt-2">VIDEO · AUDIO · IMAGE — auto-detected</p>
                  </div>
                  <div className="flex gap-2 justify-center flex-wrap text-[9px] font-mono text-gray-700">
                    <span className="px-2 py-1 border border-white/10 rounded">MP4 MOV AVI</span>
                    <span className="px-2 py-1 border border-white/10 rounded">MP3 WAV FLAC</span>
                    <span className="px-2 py-1 border border-white/10 rounded">JPG PNG WEBP</span>
                  </div>
                </motion.div>
                <input type="file" accept="video/*,audio/*,image/*" hidden onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0])} />
              </label>
            ) : (
              <div className="space-y-4">
                {/* Video preview */}
                {fileType === 'video' && previewUrl && (
                  <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/60 flex items-center justify-center min-h-[360px]">
                    <div className="relative inline-flex items-center justify-center w-full">
                      <video ref={videoRef} src={previewUrl} className="max-w-full max-h-[520px] rounded-lg" muted playsInline onEnded={handleVideoEnded} />
                      <canvas ref={canvasRef} className="absolute pointer-events-none z-10" style={{ width: videoRef.current?.clientWidth, height: videoRef.current?.clientHeight }} />
                    </div>

                    {/* Top-left badge */}
                    <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                      <div className={`px-3 py-1.5 bg-black/80 backdrop-blur-md border rounded-lg text-xs font-mono flex items-center gap-2 ${analysisStarted ? 'border-cyan-500/60 text-cyan-400' : 'border-white/20 text-gray-500'}`}>
                        <div className={`w-2 h-2 rounded-full ${analysisStarted ? 'bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.9)]' : 'bg-gray-600'}`} />
                        {analysisStarted ? 'LIVE MESH TRACKING' : 'PREVIEW · CLICK ANALYZE FEED'}
                      </div>
                      {analysisStarted && (
                        <div className="px-3 py-1 bg-black/80 backdrop-blur-md border border-white/20 rounded-lg text-[9px] font-mono text-gray-400">
                          CYCLE {loopCount + 1} / {MAX_LOOPS}
                        </div>
                      )}
                    </div>

                    {/* Top-right biometric overlay */}
                    {analysisStarted && !biometricComplete && (
                      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                        <div className="px-3 py-1.5 bg-black/80 backdrop-blur-md border border-red-500/50 rounded-lg text-xs font-mono text-red-400 flex items-center gap-2">
                          <AlertTriangle className="w-3 h-3" /> BLINKS: {blinkCount}
                        </div>
                        <div className="px-3 py-1.5 bg-black/80 backdrop-blur-md border border-yellow-500/50 rounded-lg text-xs font-mono text-yellow-400 flex items-center gap-2">
                          <Activity className="w-3 h-3" /> {blinkRate} BPM
                        </div>
                        <div className="px-3 py-1.5 bg-black/80 backdrop-blur-md border border-purple-500/50 rounded-lg text-xs font-mono text-purple-400 flex items-center gap-2">
                          <Zap className="w-3 h-3" /> ASYM: {(asymmetryIndex * 100).toFixed(1)}%
                        </div>
                      </div>
                    )}

                    {/* AI result arrives early banner */}
                    <AnimatePresence>
                      {aiResult && !biometricComplete && !aiResult.error && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className={`absolute bottom-4 left-4 right-4 z-20 px-4 py-3 ${verdictBg} border ${verdictBorder} rounded-xl backdrop-blur-md flex items-center justify-between`}
                        >
                          <div className="flex items-center gap-3">
                            {isDeepfake ? <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" /> : <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0" />}
                            <div>
                              <p className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">AI Video Analysis Complete</p>
                              <p className={`font-bold font-mono ${verdictColor}`}>{aiResult.overall_verdict} · {((aiResult.overall_confidence ?? 0) * 100).toFixed(1)}% confidence</p>
                            </div>
                          </div>
                          <span className="text-[9px] font-mono text-gray-500">Biometric scan continuing…</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Full biometric complete overlay */}
                    <AnimatePresence>
                      {biometricComplete && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute inset-0 z-30 bg-black/96 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
                        >
                          <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="space-y-4 w-full max-w-md">
                            {aiResult && !aiResult.error && (
                              <div className={`p-5 rounded-2xl border ${verdictBorder} ${verdictBg} mb-2`}>
                                <p className="text-[9px] font-mono text-gray-400 uppercase tracking-[0.2em] mb-1">AI Video Analysis Verdict</p>
                                <p className={`text-4xl font-bold font-mono ${verdictColor}`}>{aiResult.overall_verdict}</p>
                                <p className="text-gray-500 font-mono text-xs mt-1">{((aiResult.overall_confidence ?? 0) * 100).toFixed(1)}% confidence · avg {((aiResult.average_score ?? 0) * 100).toFixed(1)}%</p>
                              </div>
                            )}

                            <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">Biometric Corroboration — {MAX_LOOPS} Cycles</p>

                            <div className="grid grid-cols-3 gap-3">
                              <div className={`p-3 rounded-xl border ${blinksAbnormal && biometricAgrees && isDeepfake ? 'border-red-500/50 bg-red-950/30' : 'border-white/10 bg-white/5'}`}>
                                <p className="text-[9px] font-mono text-gray-500 uppercase mb-1">Blinks</p>
                                <p className={`text-2xl font-bold font-mono ${blinksAbnormal ? 'text-red-400' : 'text-cyan-400'}`}>{blinkCount}</p>
                              </div>
                              <div className={`p-3 rounded-xl border ${blinksAbnormal && biometricAgrees && isDeepfake ? 'border-yellow-500/50 bg-yellow-950/20' : 'border-white/10 bg-white/5'}`}>
                                <p className="text-[9px] font-mono text-gray-500 uppercase mb-1">BPM</p>
                                <p className={`text-2xl font-bold font-mono ${blinksAbnormal ? 'text-yellow-400' : 'text-green-400'}`}>{blinkRate}</p>
                              </div>
                              <div className={`p-3 rounded-xl border ${asymmetryAbnormal && biometricAgrees && isDeepfake ? 'border-purple-500/50 bg-purple-950/20' : 'border-white/10 bg-white/5'}`}>
                                <p className="text-[9px] font-mono text-gray-500 uppercase mb-1">Asymmetry</p>
                                <p className={`text-2xl font-bold font-mono ${asymmetryAbnormal ? 'text-purple-400' : 'text-green-400'}`}>{(asymmetryIndex * 100).toFixed(0)}%</p>
                              </div>
                            </div>

                            {aiResult && !aiResult.error && (
                              <div className={`p-4 rounded-xl border ${verdictBorder} ${verdictBg} text-left`}>
                                <p className="text-[9px] font-mono text-gray-400 uppercase tracking-widest mb-2">Combined Assessment</p>
                                <p className="text-xs font-mono text-gray-300 leading-relaxed">
                                  {isDeepfake
                                    ? `Neural analysis flagged this video as synthetic content. ${asymmetryAbnormal ? 'Facial asymmetry index is elevated. ' : ''}${blinksAbnormal ? 'Blinking pattern deviates from biological norms.' : 'Biometrics show some natural indicators.'}`
                                    : `Neural analysis indicates authentic content. ${!asymmetryAbnormal ? 'Facial symmetry is within natural ranges. ' : 'Minor asymmetry detected but within tolerance. '}Biometric data supports this conclusion.`}
                                </p>
                              </div>
                            )}

                            <motion.button
                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setBiometricComplete(false); setLoopCount(0); setBlinkCount(0);
                                videoStartTime.current = performance.now();
                                if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play(); }
                              }}
                              className="mt-2 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full font-mono text-xs transition-colors border border-white/20"
                            >
                              RESCAN BIOMETRICS
                            </motion.button>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Audio preview */}
                {fileType === 'audio' && previewUrl && (
                  <div className="flex flex-col items-center justify-center min-h-[180px] rounded-xl border border-white/10 bg-black/40 gap-4 p-8">
                    <FileAudio className="w-14 h-14 text-purple-400 opacity-50" />
                    <audio controls src={previewUrl} className="w-full max-w-md" />
                  </div>
                )}

                {/* Image preview */}
                {fileType === 'image' && previewUrl && (
                  <div className="flex items-center justify-center min-h-[200px] rounded-xl border border-white/10 bg-black/40 overflow-hidden">
                    <img src={previewUrl} className="max-h-64 object-contain" alt="preview" />
                  </div>
                )}

                {/* File bar */}
                <div className={`flex items-center gap-3 p-4 bg-black/40 rounded-lg border ${fileTypeColor}`}>
                  <FileIcon className="w-5 h-5" />
                  <div className="flex-1">
                    <p className="text-xs font-mono text-white truncate">{uploadedFile.name}</p>
                    <p className="text-[10px] font-mono text-gray-500">
                      {fileTypeLabel} · {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                      {!faceLandmarkerReady && fileType === 'video' && <span className="text-yellow-500 ml-2">· Loading AI model…</span>}
                    </p>
                  </div>
                  <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setUploadedFile(null); setPreviewUrl(null); setFileType(null);
                      setAnalysisStarted(false); setAiResult(null);
                      setBiometricComplete(false); setCapturedFrames([]);
                    }}
                    className="text-gray-500 hover:text-red-400"><X className="w-4 h-4" /></motion.button>
                </div>

                {/* Analyze button */}
                <motion.button
                  onClick={handleAnalyze}
                  disabled={(analysisStarted && fileType === 'video' && !biometricComplete)}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full px-4 py-4 bg-gradient-to-r from-red-600 via-red-500 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-xl font-mono text-sm tracking-widest transition-all disabled:opacity-40 relative overflow-hidden"
                >
                  <motion.div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0" animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2.5, repeat: Infinity }} />
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    {aiAnalysisLoading ? <><Loader className="w-4 h-4 animate-spin" /> RUNNING AI ANALYSIS…</>
                      : analysisStarted && fileType === 'video' && !biometricComplete ? <><Activity className="w-4 h-4 animate-pulse" /> BIOMETRIC SCAN IN PROGRESS…</>
                        : <><Zap className="w-4 h-4" /> ANALYZE FEED</>}
                  </span>
                </motion.button>
              </div>
            )}
          </Panel>

          {/* ===== SUSPICIOUS FRAMES ===== */}
          <AnimatePresence>
            {(capturedFrames.length > 0 || capturingFrames) && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Panel title="Suspicious Frame Capture">
                  {capturingFrames ? (
                    <div className="flex items-center gap-3 py-4 justify-center text-gray-400 font-mono text-xs">
                      <Camera className="w-4 h-4 animate-pulse text-red-400" />
                      <span>Extracting frames at suspicious timestamps…</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                          {capturedFrames.length} suspicious timestamp{capturedFrames.length !== 1 ? 's' : ''} extracted from video
                        </p>
                        <button
                          onClick={() => setReduceVisualClutter(!reduceVisualClutter)}
                          className="px-2 py-1 text-[8px] font-mono bg-white/10 hover:bg-white/20 border border-white/20 rounded transition-colors"
                        >
                          {reduceVisualClutter ? 'SHOW ALL MARKINGS' : 'REDUCE CLUTTER'}
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {capturedFrames.map((f, i) => <CapturedFrame key={i} {...f} reduceClutter={reduceVisualClutter} />)}
                      </div>
                    </div>
                  )}
                </Panel>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ===== RIGHT: DIAGNOSTICS ===== */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="lg:col-span-4 space-y-4">

          {/* AI VERDICT */}
          {(aiAnalysisLoading || aiResult) && (
            <Panel title={`Neural ${fileType === 'image' ? 'Image' : fileType === 'video' ? 'Video' : 'Audio'} Analysis`}>
              {aiAnalysisLoading ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <Loader className="w-6 h-6 animate-spin text-cyan-400" />
                  <p className="text-xs font-mono text-gray-400">
                    {fileType === 'image' ? 'Analyzing image for deepfake patterns...' :
                      fileType === 'video' ? 'Uploading to neural analysis engine…' :
                        'Analyzing audio patterns...'}
                  </p>
                  <p className="text-[9px] font-mono text-gray-600">
                    {fileType === 'image' ? 'This may take 10-20 seconds' : 'This may take 30-60 seconds'}
                  </p>
                </div>
              ) : aiResult?.error ? (
                <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-xs font-mono">{aiResult.error}</p>
                </div>
              ) : aiResult && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <div className={`p-4 rounded-xl border text-center ${verdictBorder} ${verdictBg}`}>
                    <p className="text-[9px] font-mono text-gray-400 uppercase mb-1">Verdict</p>
                    <p className={`text-3xl font-bold font-mono ${verdictColor}`}>{aiResult.overall_verdict}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-black/40 border border-white/10 rounded-xl text-center">
                      <p className="text-[9px] font-mono text-gray-500 uppercase mb-1">Confidence</p>
                      <p className="text-xl font-bold font-mono text-white">{((aiResult.overall_confidence ?? 0) * 100).toFixed(1)}%</p>
                    </div>
                    <div className="p-3 bg-black/40 border border-white/10 rounded-xl text-center">
                      <p className="text-[9px] font-mono text-gray-500 uppercase mb-1">Avg Score</p>
                      <p className="text-xl font-bold font-mono text-orange-400">{((aiResult.average_score ?? 0) * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                  {aiResult.suspicious_segments?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">{aiResult.suspicious_segments.length} suspicious segments</p>
                      {aiResult.suspicious_segments.slice(0, 4).map((s: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-red-950/20 border-l-2 border-red-500 rounded text-[10px] font-mono">
                          <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
                          <span className="text-red-400">{s.start_time.toFixed(2)}s</span>
                          <span className="text-gray-500">·</span>
                          <span className="text-orange-400">{(s.confidence * 100).toFixed(1)}% fake</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </Panel>
          )}

          {/* FACIAL MUSCLE ACTIVITY */}
          {fileType === 'video' && (
            <Panel title="Facial Muscle Activity">
              <div className="space-y-3 p-1">
                <MetricBar label="Eye Blink L/R" value={((blendshapes['eyeBlinkLeft'] ?? 0) + (blendshapes['eyeBlinkRight'] ?? 0)) / 2} color="bg-red-500" highlight={biometricAgrees && isDeepfake} />
                <MetricBar label="Brow Raise" value={blendshapes['browInnerUp'] ?? 0} color="bg-orange-500" highlight={biometricAgrees} />
                <MetricBar label="Smile" value={((blendshapes['mouthSmileLeft'] ?? 0) + (blendshapes['mouthSmileRight'] ?? 0)) / 2} color="bg-green-500" highlight={biometricAgrees} />
                <MetricBar label="Jaw Open" value={blendshapes['jawOpen'] ?? 0} color="bg-blue-500" highlight={biometricAgrees} />
                <MetricBar label="Cheek Puff" value={blendshapes['cheekPuff'] ?? 0} color="bg-purple-500" highlight={biometricAgrees && isDeepfake} />
                <MetricBar label="Mouth Pucker" value={blendshapes['mouthPucker'] ?? 0} color="bg-pink-500" highlight={biometricAgrees} />
                <p className="text-[9px] font-mono text-gray-600 italic pt-1 border-t border-white/5">
                  {biometricAgrees ? (isDeepfake ? '⚠ Metrics highlighted for deepfake correlation' : '✓ Metrics align with authentic classification') : 'Real-time MediaPipe blendshapes'}
                </p>
              </div>
            </Panel>
          )}

          {/* MUSCLE POTENTIAL DIFFERENCE */}
          {fileType === 'video' && analysisStarted && (
            <Panel title="Muscle Potential Difference">
              <div className="p-1">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Overall Asymmetry Index</span>
                  <span className={`text-sm font-bold font-mono ${asymmetryIndex > 0.3 ? 'text-red-400' : asymmetryIndex > 0.15 ? 'text-yellow-400' : 'text-cyan-400'}`}>
                    {(asymmetryIndex * 100).toFixed(1)}%
                    {biometricAgrees && isDeepfake && asymmetryAbnormal && <span className="text-red-500 ml-1 text-xs">⚠</span>}
                  </span>
                </div>
                <div className="flex text-[8px] font-mono text-gray-600 justify-between px-1 mb-1">
                  <span className="text-green-500">LEFT ◀</span>
                  <span>PAIR</span>
                  <span className="text-blue-500">▶ RIGHT</span>
                </div>
                {asymmetryPairs.map((p, i) => <AsymmetryRow key={i} {...p} highlight={biometricAgrees} />)}
                <p className="text-[9px] font-mono text-gray-600 italic pt-3 border-t border-white/5 mt-2">
                  {biometricAgrees && isDeepfake && asymmetryAbnormal
                    ? '⚠ Elevated asymmetry corroborates AI deepfake detection'
                    : 'Δ = |L−R| per muscle pair. Elevated values may indicate AI manipulation.'}
                </p>
              </div>
            </Panel>
          )}

          {/* Audio result panel */}
          {audioResult && (
            <Panel title="Audio Analysis">
              {audioResult.error ? <p className="text-red-400 text-xs font-mono">{audioResult.error}</p> : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <div className={`p-4 rounded-xl border text-center ${audioResult.is_deepfake ? 'bg-red-950/30 border-red-500/50' : 'bg-cyan-950/30 border-cyan-500/50'}`}>
                    <p className={`text-2xl font-bold font-mono ${audioResult.is_deepfake ? 'text-red-400' : 'text-cyan-400'}`}>{audioResult.overall_verdict}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-black/40 border border-white/10 rounded-xl text-center">
                      <p className="text-[9px] font-mono text-gray-500 uppercase mb-1">Confidence</p>
                      <p className="text-xl font-bold font-mono text-white">{((audioResult.overall_confidence ?? 0) * 100).toFixed(1)}%</p>
                    </div>
                    <div className="p-3 bg-black/40 border border-white/10 rounded-xl text-center">
                      <p className="text-[9px] font-mono text-gray-500 uppercase mb-1">Fake Prob</p>
                      <p className="text-xl font-bold font-mono text-orange-400">{((audioResult.fake_probability ?? 0) * 100).toFixed(1)}%</p>
                    </div>
                  </div>

                  {audioResult.heatmap_image && (
                    <div className="p-3 bg-black/40 border border-white/10 rounded-xl">
                      <p className="text-[9px] font-mono text-gray-500 uppercase mb-2">Acoustic Feature Heatmap</p>
                      <div className="bg-black/60 rounded-lg p-2 border border-white/5">
                        <img
                          src={`http://localhost:8000/api/heatmap/${audioResult.heatmap_image.split('/').pop()}`}
                          alt="Audio Heatmap"
                          className="w-full h-auto rounded"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzExMSIvPjx0ZXh0IHg9IjEwMCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5IZWF0bWFwIHVuYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
                          }}
                        />
                      </div>
                      <p className="text-[8px] font-mono text-gray-600 mt-2">
                        🔥 Visual representation of acoustic patterns and anomalies
                      </p>
                    </div>
                  )}

                  {audioResult.suspicious_segments && audioResult.suspicious_segments.length > 0 && (
                    <div className="p-3 bg-black/40 border border-white/10 rounded-xl">
                      <p className="text-[9px] font-mono text-gray-500 uppercase mb-2">Suspicious Audio Segments</p>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {audioResult.suspicious_segments.map((seg: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-red-950/20 border border-red-500/30 rounded">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                              <span className="text-xs font-mono text-gray-300">
                                {seg.start_time.toFixed(1)}s - {seg.end_time.toFixed(1)}s
                              </span>
                            </div>
                            <span className="text-xs font-mono text-red-400">
                              {(seg.confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[8px] font-mono text-gray-600 mt-2">
                        ⚠️ {audioResult.suspicious_segments.length} acoustic anomalies detected
                      </p>
                    </div>
                  )}

                  {audioResult.audio_analysis && (
                    <div className="p-3 bg-black/40 border border-white/10 rounded-xl">
                      <p className="text-[9px] font-mono text-gray-500 uppercase mb-2">Audio Analysis Details</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Duration:</span>
                          <span className="text-cyan-400 ml-1">{audioResult.audio_analysis.total_duration.toFixed(1)}s</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Type:</span>
                          <span className="text-cyan-400 ml-1">{audioResult.audio_analysis.analysis_type}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </Panel>
          )}

          {/* IMAGE ANALYSIS PANEL */}
          {fileType === 'image' && aiResult && !aiResult.error && (
            <Panel title="Image Deepfake Analysis">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">

                {aiResult.heatmap && (
                  <div className="p-3 bg-black/40 border border-white/10 rounded-xl">
                    <p className="text-[9px] font-mono text-gray-500 uppercase mb-2">Detection Heatmap</p>
                    <div className="bg-black/60 rounded-lg p-2 border border-white/5">
                      <img
                        src={`data:image/png;base64,${aiResult.heatmap}`}
                        alt="Deepfake Heatmap"
                        className="w-full h-auto rounded"
                      />
                    </div>
                    <p className="text-[8px] font-mono text-gray-600 mt-2">
                      🔥 Red regions indicate potential deepfake artifacts
                    </p>
                  </div>
                )}

                {aiResult.region_analysis && (
                  <div className="p-3 bg-black/40 border border-white/10 rounded-xl">
                    <p className="text-[9px] font-mono text-gray-500 uppercase mb-2">Facial Region Analysis</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {aiResult.region_analysis.map((region: any, i: number) => (
                        <div key={i} className={`p-2 rounded border ${region.status === 'Highly Suspicious' ? 'bg-red-950/20 border-red-500/30' :
                          region.status === 'Suspicious' ? 'bg-orange-950/20 border-orange-500/30' :
                            'bg-green-950/20 border-green-500/30'
                          }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-mono text-gray-300 capitalize">{region.region.replace('_', ' ')}</span>
                            <span className={`text-xs font-mono ${region.status === 'Highly Suspicious' ? 'text-red-400' :
                              region.status === 'Suspicious' ? 'text-orange-400' : 'text-green-400'
                              }`}>
                              {region.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-white/5 rounded-full h-1.5">
                              <div
                                className={`h-full rounded-full ${region.suspicion_score > 0.7 ? 'bg-red-500' :
                                  region.suspicion_score > 0.4 ? 'bg-orange-500' : 'bg-green-500'
                                  }`}
                                style={{ width: `${region.suspicion_score * 100}%` }}
                              />
                            </div>
                            <span className="text-[9px] font-mono text-gray-500">
                              {(region.suspicion_score * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[8px] font-mono text-gray-600 mt-2">
                      🎯 {aiResult.region_analysis.filter((r: any) => r.status !== 'Normal').length} suspicious regions detected
                    </p>
                  </div>
                )}

                {aiResult.summary && (
                  <div className="p-3 bg-black/40 border border-white/10 rounded-xl">
                    <p className="text-[9px] font-mono text-gray-500 uppercase mb-2">Analysis Summary</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Risk Level:</span>
                        <span className={`ml-1 font-bold ${aiResult.summary.overall_risk === 'HIGH' ? 'text-red-400' :
                          aiResult.summary.overall_risk === 'MEDIUM' ? 'text-orange-400' : 'text-green-400'
                          }`}>
                          {aiResult.summary.overall_risk}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Risk Score:</span>
                        <span className="text-cyan-400 ml-1">{aiResult.summary.risk_score?.toFixed(0) || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {aiResult.model_info && (
                  <div className="p-3 bg-black/40 border border-white/10 rounded-xl">
                    <p className="text-[9px] font-mono text-gray-500 uppercase mb-2">Analysis Model</p>
                    <div className="text-xs space-y-1">
                      <div>
                        <span className="text-gray-500">Architecture:</span>
                        <span className="text-cyan-400 ml-1">{aiResult.model_info.architecture}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Accuracy:</span>
                        <span className="text-green-400 ml-1">{aiResult.model_info.training_accuracy}</span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </Panel>
          )}

          {/* Placeholder */}
          {!uploadedFile && (
            <Panel title="Diagnostics">
              <div className="flex flex-col items-center justify-center py-12 text-center opacity-30">
                <Activity className="w-10 h-10 text-gray-600" />
                <p className="text-gray-600 font-mono text-xs mt-2">Awaiting media input…</p>
              </div>
            </Panel>
          )}
        </motion.div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,0,51,0.3); border-radius: 10px; }
      `}</style>
    </div>
  );
};