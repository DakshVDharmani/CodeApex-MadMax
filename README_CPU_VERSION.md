# Misinfo Research AI - CPU Version

A lightweight, CPU-based misinformation detection system that analyzes claims from YouTube videos using advanced NLP and evidence retrieval.

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- 8GB+ RAM recommended
- Internet connection for evidence retrieval

### Installation

```bash
# Clone and setup
cd misinfo-research-ai
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python main.py
```

The server will start on `http://localhost:8000`

## 📁 Project Structure

```
misinfo-research-ai/
├── main.py                 # FastAPI server and main entry point
├── rag_truth_analyzer.py   # Core analysis engine with BART NLI
├── bart_analyzer.py        # Backup BART analyzer with ArXiv integration
├── dashboard.html          # Web interface
├── requirements.txt        # CPU-only dependencies
├── frontend/              # React frontend (if needed)
└── configs/               # Configuration files
```

## 🔧 Core Components

### 1. **RAG Truth Analyzer** (`rag_truth_analyzer.py`)
- Multi-source evidence retrieval (Semantic Scholar, PubMed, arXiv, OpenAlex, Wikipedia)
- BART-large-mnli Natural Language Inference
- Domain-specific harm scoring
- Structured explanations with citations

### 2. **Main Server** (`main.py`)
- FastAPI REST API
- YouTube transcript processing
- Claim extraction and analysis
- Real-time evidence retrieval

### 3. **BART Analyzer** (`bart_analyzer.py`)
- Facebook BART for claim verification
- ArXiv research paper integration
- Semantic similarity analysis
- PhD-level explanations

## 📡 API Endpoints

### Analyze YouTube Video
```bash
POST /api/youtube/ingest
{
  "url": "https://youtube.com/watch?v=VIDEO_ID"
}
```

### System Status
```bash
GET /api/researcher/status
GET /health
```

### Web Interface
```bash
GET /  # Main dashboard
```

## 🎯 Features

- **Multi-Source Evidence**: Retrieves from 5+ academic databases
- **Advanced NLI**: BART-based natural language inference
- **Domain Classification**: Medical, scientific, financial, political
- **Risk Scoring**: Harm-weighted misinformation assessment
- **Real-Time Analysis**: Processes YouTube videos in seconds
- **CPU Optimized**: Runs efficiently without GPU requirements

## 🧠 Model Architecture

The system uses a Retrieval-Augmented Generation (RAG) approach:

1. **Claim Processing**: Extract and classify claims from transcripts
2. **Evidence Retrieval**: Multi-source academic database search
3. **NLI Analysis**: BART model evaluates claim-evidence relationships
4. **Risk Assessment**: Domain-specific harm scoring
5. **Explanation Generation**: Structured, evidence-backed explanations

## 📊 Performance

- **Processing Time**: ~30-60 seconds per video
- **Memory Usage**: ~4-6GB RAM
- **Accuracy**: High-precision claim verification
- **Sources**: 5+ academic databases with 1000+ papers

## 🔒 Privacy & Security

- No user data storage
- Stateless API design
- Evidence from public academic sources
- Optional local caching

## 🛠️ Configuration

Environment variables (`.env`):
```bash
# API Keys (optional)
SEMANTIC_SCHOLAR_API_KEY=your_key
OPENALEX_API_KEY=your_key

# Settings
RAG_MAX_CLAIMS=8
RAG_CLAIM_TIMEOUT=60
```

## 📝 Usage Example

```python
import requests

# Analyze a YouTube video
response = requests.post("http://localhost:8000/api/youtube/ingest", 
                         json={"url": "https://youtube.com/watch?v=dQw4w9WgXcQ"})

result = response.json()
print(f"Found {len(result['claims'])} claims")
print(f"Misinformation detected: {result['video_metadata']['misinformation_detected']}")

# View specific claim analysis
for claim in result['claims']:
    if claim['is_misinformation']:
        print(f"⚠️  {claim['text']}")
        print(f"Risk: {claim['risk_level']} ({claim['risk_score']}%)")
```

## 🚀 Deployment

### Docker
```bash
docker build -t misinfo-ai .
docker run -p 8000:8000 misinfo-ai
```

### Production
- Use Gunicorn for production serving
- Configure reverse proxy (nginx)
- Enable Redis for caching
- Monitor with Prometheus

## 📚 Dependencies

Core libraries:
- `fastapi` - Web framework
- `transformers` - BART model
- `torch` - ML framework (CPU)
- `requests` - HTTP client
- `yt-dlp` - YouTube processing
- `arxiv` - Academic paper search

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues:
1. Check the logs
2. Verify dependencies
3. Test with simple claims
4. Review configuration

---

**Note**: This CPU-optimized version is designed for easy deployment and sharing. For maximum performance, consider the GPU version with additional model optimizations.
