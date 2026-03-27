# Production-Ready AI Pipeline for Misinformation Detection

A comprehensive, production-ready backend system that connects a Telegram bot to an existing misinformation detection model via FastAPI.

## 🏗️ Architecture

```
backend/
│
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── routes/
│   │   └── analyze.py       # API routes for content analysis
│   ├── services/
│   │   ├── router.py        # Input routing service
│   │   └── telegram_bot.py  # Telegram bot integration
│   └── utils/
│       ├── link_parser.py   # URL parsing and platform detection
│       └── image_handler.py # Image processing utilities
│
├── model_main/              # Existing misinformation detection model
├── requirements.txt         # Python dependencies
├── .env.example            # Environment configuration template
└── README.md               # This file
```

## 🚀 Features

- **FastAPI Server**: Production-ready REST API with async support
- **Telegram Bot Integration**: Full-featured bot with python-telegram-bot v20+
- **Intelligent Routing**: Automatic content type detection and routing
- **Multi-Format Support**: Text, image, and URL analysis
- **Platform Detection**: YouTube, Instagram, and general website support
- **Error Handling**: Comprehensive error handling and logging
- **Production Ready**: Structured logging, health checks, and monitoring

## 📋 Requirements

- Python 3.8+
- Existing model-main module
- Telegram Bot Token
- (Optional) YouTube API Key for transcript extraction

## 🛠️ Installation

### 1. Clone and Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` and add your configuration:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
API_BASE_URL=http://localhost:8000
```

### 4. Model Setup

Ensure the `model-main` directory is properly configured with all required models and dependencies.

## 🚀 Running the Application

### Development Mode

```bash
cd app
python main.py
```

### Production Mode

```bash
cd app
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Docker Deployment (Optional)

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

## 📡 API Endpoints

### Analyze Content

```http
POST /api/v1/analyze
Content-Type: application/json

{
  "type": "text|image|url",
  "content": "<data>"
}
```

**Response:**
```json
{
  "status": "success|error|insufficient_data",
  "prediction": "SUPPORTED|REFUTED|INSUFFICIENT|NEEDS_REVIEW",
  "confidence": 0.85,
  "details": {
    "content_type": "text",
    "claims_analyzed": 2,
    "claim_results": [...]
  },
  "processing_time": 1.23
}
```

### Upload Image

```http
POST /api/v1/analyze/image
Content-Type: multipart/form-data

image: <file>
metadata: <optional_json_string>
```

### Health Check

```http
GET /health
```

## 🤖 Telegram Bot Commands

- `/start` - Welcome message and introduction
- `/help` - Detailed usage instructions
- `/status` - Bot and API status check

## 🔄 Content Processing Flow

```
Telegram Message → Bot Handler → FastAPI (/analyze) → Router Service → Model-Main → Response → Telegram
```

### Text Analysis
1. Split text into individual claims
2. Extract entities and classify intent
3. Fetch relevant evidence
4. Apply NLI verification
5. Aggregate results and return verdict

### Image Analysis
1. Download and validate image
2. Convert to PIL Image format
3. Extract metadata
4. Route to vision model (placeholder)
5. Return analysis results

### URL Analysis
1. Parse URL and detect platform
2. Extract content (transcript, caption, webpage)
3. Analyze extracted text
4. Return platform-specific results

## 🧪 Testing

### Unit Tests

```bash
pytest tests/
```

### API Testing

```bash
# Test text analysis
curl -X POST "http://localhost:8000/api/v1/analyze" \
     -H "Content-Type: application/json" \
     -d '{"type": "text", "content": "The earth is flat"}'

# Test image analysis
curl -X POST "http://localhost:8000/api/v1/analyze/image" \
     -F "image=@test_image.jpg"

# Test URL analysis
curl -X POST "http://localhost:8000/api/v1/analyze" \
     -H "Content-Type: application/json" \
     -d '{"type": "url", "content": "https://youtube.com/watch?v=example"}'
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | Required |
| `API_BASE_URL` | API base URL | `http://localhost:8000` |
| `API_HOST` | API host | `0.0.0.0` |
| `API_PORT` | API port | `8000` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `DEBUG` | Debug mode | `false` |

### Model Configuration

Edit the router service to adjust:
- NLI model selection
- Analysis thresholds
- Evidence retrieval parameters

## 📊 Monitoring

### Logging

- Application logs: `backend.log`
- Structured logging with timestamps
- Error tracking and performance metrics

### Health Monitoring

- `/health` endpoint for service status
- Component health checks
- API response time monitoring

## 🔒 Security Considerations

- Input validation and sanitization
- File upload size limits
- Rate limiting for API endpoints
- Secure handling of bot tokens
- HTTPS in production

## 🚀 Production Deployment

### System Requirements

- **CPU**: 4+ cores recommended
- **Memory**: 8GB+ RAM
- **Storage**: 50GB+ for models and logs
- **Network**: Stable internet connection

### Recommended Setup

1. **Reverse Proxy**: Nginx or Traefik
2. **Process Manager**: Supervisor or systemd
3. **Monitoring**: Prometheus + Grafana
4. **Load Balancer**: For high availability

### Example Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Bot not responding**
   - Check TELEGRAM_BOT_TOKEN
   - Verify API connectivity
   - Check logs for errors

2. **Model loading errors**
   - Verify model-main dependencies
   - Check model file paths
   - Ensure sufficient memory

3. **Image analysis failures**
   - Check image format support
   - Verify file size limits
   - Check PIL installation

### Debug Mode

Enable debug logging:

```env
DEBUG=true
LOG_LEVEL=DEBUG
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📝 License

This project is part of the misinformation detection system. See the main project license for details.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review application logs
3. Create an issue with detailed information

---

**Note**: This is a production-ready system designed for scalability and reliability. Ensure proper testing before deployment to production environments.
