import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({ dest: "uploads/" });

app.post("/api/chat", async (req, res) => {
  const { message, model } = req.body;

  try {
    const ollamaRes = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || "mistral",
        prompt: message,
        stream: true,
      }),
    });

    res.setHeader("Content-Type", "text/plain");

    for await (const chunk of ollamaRes.body) {
      res.write(chunk);
    }

    res.end();
  } catch (error) {
    console.error("Ollama error:", error);
    res.status(500).send("Error connecting to Ollama");
  }
});

app.post("/api/detect-deepfake", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const videoPath = req.file.path;
  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;

  if (!apiUser || !apiSecret || apiUser === "your_api_user_here") {
    return res.status(500).json({ error: "Sightengine API credentials not configured in .env" });
  }

  console.log(`Analyzing video: ${req.file.originalname}`);

  try {
    const formData = new FormData();
    formData.append("media", fs.createReadStream(videoPath));
    formData.append("models", "deepfake");
    formData.append("api_user", apiUser);
    formData.append("api_secret", apiSecret);

    const response = await fetch("https://api.sightengine.com/1.0/video/check-sync.json", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    // Clean up uploaded file
    fs.unlinkSync(videoPath);

    if (data.status === "success") {
      const frames = data.data?.frames || [];
      let maxScore = 0;
      let avgScore = 0;

      if (frames.length > 0) {
        const scores = frames.map((f) => f.type?.deepfake || 0);
        maxScore = Math.max(...scores);
        avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      }

      // Map response to something the frontend expects (or simplify it)
      const result = {
        status: "success",
        overall_verdict: maxScore > 0.5 ? "Deepfake" : "Real",
        overall_confidence: maxScore,
        average_score: avgScore,
        suspicious_segments: frames
          .filter(f => (f.type?.deepfake || 0) > 0.5)
          .map(f => ({
            start_time: f.info.position / 1000,
            end_time: f.info.position / 1000,
            confidence: f.type.deepfake
          }))
      };

      res.json(result);
    } else {
      res.status(500).json({ 
        error: "Sightengine Analysis failed", 
        details: data.error?.message || "Unknown error" 
      });
    }
  } catch (error) {
    console.error("Deepfake detection error:", error);
    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    res.status(500).json({ error: "Server error during analysis" });
  }
});

app.post("/api/detect-deepfake-audio", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const audioPath = req.file.path;
  
  console.log(`Analyzing audio: ${req.file.originalname}`);
  console.log(`File mimetype: ${req.file.mimetype}`);
  console.log(`File size: ${req.file.size}`);

  try {
    // Connect to the audio deepfake API
    const formData = new FormData();
    formData.append("file", fs.createReadStream(audioPath));
    
    console.log(`📤 Forwarding audio file to http://localhost:8000/analyze`);
    
    const response = await fetch("http://localhost:8000/analyze", {
      method: "POST",
      body: formData,
      headers: formData.getHeaders(),
    });

    console.log(`📥 Audio API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Audio API error response: ${errorText}`);
      throw new Error(`Audio API returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ Audio API response data:`, data);

    // Clean up uploaded file
    fs.unlinkSync(audioPath);

    // Transform the response to match frontend expectations
    const result = {
      status: "success",
      overall_verdict: data.prediction?.prediction ? 
        data.prediction.prediction.charAt(0).toUpperCase() + data.prediction.prediction.slice(1) : 
        "Unknown",
      overall_confidence: data.prediction?.confidence || 0,
      real_probability: data.prediction?.real_probability || 0,
      fake_probability: data.prediction?.fake_probability || 0,
      is_deepfake: data.prediction?.is_deepfake || false,
      heatmap_image: data.heatmap?.heatmap_image || null,
      suspicious_segments: data.suspicious_segments || [],
      audio_analysis: data.audio_analysis || null,
      backend_used: "audio_deepfake"
    };
    
    console.log(`✅ Success! Prediction: ${result.overall_verdict}, Confidence: ${result.overall_confidence}`);
    res.json(result);
  } catch (error) {
    console.error("❌ Audio deepfake detection error:", error);
    // Clean up uploaded file if it exists
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }
    res.status(500).json({ 
      error: "Audio analysis failed", 
      details: error.message || "Unknown error" 
    });
  }
});

// Serve heatmap images from audio model
app.get('/api/heatmap/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, '..', 'deepfakeforsound', filename);
  
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.status(404).send('Heatmap image not found');
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`✅ Backend running on http://localhost:${PORT}`)
);