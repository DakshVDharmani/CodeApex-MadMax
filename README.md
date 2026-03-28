# Misinformation Research AI

AI-powered misinformation detection for scientific content with real-time analysis capabilities.

## 🚀 Features

### Ingestion Layer
- **YouTube Integration**: Extract and analyze captions using `youtube_transcript_api`
- **Audio Upload**: Transcribe MP3 files using local Whisper GPU inference
- **Google Meet Live**: Real-time caption streaming via WebSocket

### NLP Pipeline
- **Claim Extraction**: Scientific claim detection using SciBERT
- **Entity Tagging**: Extract methods, datasets, and statistical entities
- **Domain Classification**: Route claims to medical, physics, CS, or biology domains
- **Misinformation Detection**: Multi-factor risk assessment

### RAG System
- **Entity-Based Retrieval**: Parallel search across PubMed, Semantic Scholar, and arXiv
- **Scientific Embeddings**: Domain-specific vector representations
- **Validation Engine**: Evidence-based claim verification

### GPU Acceleration
- **CUDA Pipeline**: Parallel processing with CUDA streams
- **Chunk Scheduler**: Optimized batch processing
- **Memory Management**: Efficient GPU memory utilization

## 🏗️ Architecture

```
misinfo-research-ai/
├── frontend/                 # Next.js dashboard
│   ├── pages/
│   │   ├── youtube_ingest.tsx
│   │   ├── upload_audio.tsx
│   │   ├── gmeet_live.tsx
│   │   ├── dashboard.tsx
│   │   └── report.tsx
│   ├── components/
│   │   ├── VideoInput.tsx
│   │   ├── MeetStream.tsx
│   │   ├── TranscriptViewer.tsx
│   │   └── RiskPanel.tsx
│   └── api/
│       └── ingest.ts
├── backend/                  # FastAPI services
│   ├── ingest/
│   │   ├── youtube_downloader.py
│   │   ├── mp3_parser.py
│   │   └── gmeet_caption_stream.py
│   ├── nlp/
│   │   ├── claim_extractor.py
│   │   ├── entity_tagger.py
│   │   ├── domain_classifier.py
│   │   └── misinformation_classifier.py
│   ├── rag/
│   │   ├── retriever.py
│   │   ├── embedding.py
│   │   └── validator.py
│   ├── parallel/
│   │   ├── cuda_pipeline.py
│   │   └── chunk_scheduler.py
│   └── main.py
├── vector_db/
│   └── faiss_store/
├── configs/
│   ├── rag.yaml
│   └── gpu.yaml
└── docker/
    └── Dockerfile
```

## 🛠️ Installation

### Prerequisites
- Python 3.9+
- CUDA 11.8+ (for GPU acceleration)
- Node.js 18+
- Docker (optional)

### Backend Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd misinfo-research-ai
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Download spaCy model:
```bash
python -m spacy download en_core_web_sm
```

5. Set up environment variables:
```bash
export BACKEND_URL="http://localhost:8000"
export CUDA_VISIBLE_DEVICES="0"
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

### Docker Deployment

1. Build the image:
```bash
docker build -t misinfo-research-ai -f docker/Dockerfile .
```

2. Run with GPU support:
```bash
docker run --gpus all -p 8000:8000 -p 3000:3000 misinfo-research-ai
```

## 🚀 Usage

### YouTube Analysis
```python
import requests

# Analyze YouTube video
response = requests.post("http://localhost:8000/api/youtube/ingest", 
                        json={"url": "https://youtube.com/watch?v=..."})
result = response.json()
```

### Audio Transcription
```python
# Upload and analyze audio file
with open("audio.mp3", "rb") as f:
    files = {"audio": f}
    response = requests.post("http://localhost:8000/api/audio/ingest", 
                           files=files)
```

### Real-time Streaming
```javascript
// WebSocket connection for live analysis
const ws = new WebSocket("ws://localhost:8000/ws/gmeet");

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log("Detected claims:", data.claims);
};
```

## 🧠 Model Configuration

### Claim Extraction
- **Model**: SciBERT (`allenai/scibert_scivocab_uncased`)
- **Task**: Binary classification (claim vs non-claim)
- **Domain**: Scientific literature

### Entity Recognition
- **Scientific NER**: BioBERT (`dmis-lab/biobert-base-cased-v1.1`)
- **General NER**: BERT-large (`dbmdz/bert-large-cased-finetuned-conll03-english`)

### Misinformation Detection
- **Base Model**: RoBERTa-base
- **Classes**: Reliable, Misleading, False
- **Features**: Pattern analysis, credibility assessment

## ⚡ Performance

### GPU Acceleration
- **Embedding Generation**: 32 vectors/batch
- **Parallel Retrieval**: 4 concurrent streams
- **Memory Optimization**: 80% GPU memory utilization

### Benchmarks
- **YouTube Processing**: ~30 seconds for 10-minute video
- **Audio Transcription**: Real-time with Whisper GPU
- **Claim Validation**: ~2 seconds per claim

## 🔧 Configuration

### RAG Settings (`configs/rag.yaml`)
```yaml
retrieval:
  max_results_per_source: 10
  similarity_threshold: 0.3

validation:
  weights:
    evidence_support: 0.4
    source_credibility: 0.3
    recency: 0.2
    consensus: 0.1
```

### GPU Settings (`configs/gpu.yaml`)
```yaml
cuda:
  enable: true
  memory_fraction: 0.8
  streams:
    count: 4
```

## 📊 API Endpoints

### Core Endpoints
- `POST /api/youtube/ingest` - Analyze YouTube video
- `POST /api/audio/ingest` - Transcribe audio file
- `POST /api/claims/extract` - Extract claims from text
- `POST /api/claims/validate` - Validate claim against literature
- `GET /api/claims` - Get processed claims
- `POST /api/report` - Generate analysis report

### WebSocket
- `WS /ws/gmeet` - Real-time caption streaming

## 🧪 Testing

### Run Tests
```bash
# Backend tests
pytest backend/tests/

# Frontend tests
cd frontend && npm test
```

### Integration Tests
```bash
# Test full pipeline
python -m tests.integration.test_pipeline
```

## 📈 Monitoring

### Metrics
- GPU utilization and memory usage
- Request latency and throughput
- Model inference times
- Cache hit rates

### Health Checks
```bash
curl http://localhost:8000/health
```

## 🔒 Security

- Input validation and sanitization
- Rate limiting on API endpoints
- CORS configuration
- No persistent data storage by default

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Hugging Face** - Transformer models
- **FAISS** - Vector similarity search
- **PubMed/arXiv/Semantic Scholar** - Scientific literature APIs
- **Whisper** - Audio transcription
- **Next.js** - Frontend framework

## 📞 Support

For questions and support:
- Create an issue on GitHub
- Contact the development team
- Check the documentation

---

**Note**: This is a research prototype. Always verify important information with authoritative sources.
