# Social Media Misinformation Detection Setup

## 🎯 Overview
Extended the misinformation detection system to support Instagram and Facebook in addition to existing YouTube functionality.

## 🆕 New Features

### 📱 Platform Support
- **Instagram**: Extract caption, comments, and media (images/videos)
- **Facebook**: Extract post text, comments, and media (images/videos)  
- **YouTube**: Existing functionality unchanged

### 🔍 Text Extraction Methods
1. **Scraping**: Playwright for dynamic content extraction
2. **OCR**: PaddleOCR for text from images
3. **Audio**: Whisper for speech-to-text from videos
4. **Aggregation**: Combines all text sources for comprehensive analysis

## 🛠️ Installation

### 1. Install New Dependencies
```bash
pip install playwright>=1.40.0 paddleocr>=2.7.0 opencv-python>=4.8.0
```

### 2. Install Playwright Browsers
```bash
playwright install
```

### 3. Install All Dependencies
```bash
pip install -r requirements.txt
```

## 🚀 Usage

### Start the Backend
```bash
python main.py
```

### New API Endpoint
- **POST** `/api/analyze` - Universal endpoint for all platforms

### Request Format
```json
{
  "url": "https://www.instagram.com/p/ABC123/"
}
```

### Response Format
```json
{
  "success": true,
  "platform": "instagram",
  "url": "https://www.instagram.com/p/ABC123/",
  "extracted_text": "Combined text from caption, comments, OCR, and audio",
  "claims": [...],
  "analysis_summary": {
    "total_claims": 5,
    "misinformation_claims": 2,
    "high_risk_claims": 1,
    "medium_risk_claims": 1,
    "low_risk_claims": 3,
    "misinformation_detected": true
  },
  "raw_data": {...},
  "system_info": {...}
}
```

## 📁 File Structure

### New Services Created
```
services/
├── __init__.py              # Package initialization
├── ocr_service.py           # PaddleOCR integration
├── audio_service.py         # Whisper audio processing
├── instagram_service.py     # Instagram scraping
└── facebook_service.py      # Facebook scraping
```

### Updated Files
- `main.py` - Added platform detection and new `/api/analyze` endpoint
- `requirements.txt` - Added new dependencies

## 🔄 Processing Pipeline

### Instagram
1. **Scraping**: Extract caption and visible comments
2. **Media Download**: Download images and videos
3. **OCR Processing**: Extract text from images using PaddleOCR
4. **Audio Processing**: Extract audio from videos, transcribe with Whisper
5. **Text Aggregation**: Combine all text sources
6. **Misinformation Analysis**: Send to existing RAG model

### Facebook
1. **Scraping**: Extract post text and comments
2. **Media Download**: Download images and videos  
3. **OCR Processing**: Extract text from images using PaddleOCR
4. **Audio Processing**: Extract audio from videos, transcribe with Whisper
5. **Text Aggregation**: Combine all text sources
6. **Misinformation Analysis**: Send to existing RAG model

## 🧪 Testing

### Run Test Script
```bash
python test_social_media.py
```

### Test Cases
- Platform detection for various URLs
- Service initialization
- OCR and audio service availability

## ⚠️ Important Notes

### Privacy & Ethics
- Only processes publicly available content
- No authentication or private data access
- Respects platform terms of service

### Technical Considerations
- **Rate Limiting**: Built-in delays to respect platform limits
- **Error Handling**: Graceful fallbacks for missing services
- **Memory Management**: Text length limits and cleanup
- **Browser Stealth**: Anti-detection measures for scraping

### Dependencies
- **Playwright**: For dynamic content scraping
- **PaddleOCR**: For accurate text extraction from images
- **Whisper**: For high-quality audio transcription
- **OpenCV**: For video frame processing

## 🐛 Troubleshooting

### Common Issues
1. **Playwright Installation**: Run `playwright install` after pip install
2. **OCR Not Loading**: Ensure PaddleOCR installed correctly
3. **Audio Processing**: Check ffmpeg installation for video processing
4. **Memory Issues**: Text length limits prevent overload

### Debug Mode
Enable detailed logging by setting environment variable:
```bash
export DEBUG=1
python main.py
```

## 📊 API Status

### Check System Status
```bash
curl http://localhost:8000/api/researcher/status
```

### Health Check
```bash
curl http://localhost:8000/health
```

## 🔮 Future Enhancements

### Planned Features
- **Twitter/X Support**: Add Twitter integration
- **LinkedIn Support**: Professional content analysis
- **TikTok Support**: Short-form video analysis
- **Real-time Processing**: WebSocket support for live updates
- **Batch Processing**: Multiple URL analysis
- **Confidence Scoring**: Platform-specific confidence metrics

### Performance Optimizations
- **Caching**: Redis for repeated content
- **Queue System**: Celery for background processing
- **Load Balancing**: Multiple browser instances
- **Database Integration**: Persistent analysis storage

## 📞 Support

For issues with the new social media features:
1. Check dependency installation
2. Verify browser installation with `playwright install`
3. Test with provided test script
4. Check logs for detailed error messages

## 🎉 Success Criteria

✅ **Instagram Posts**: Caption + comments + media analysis
✅ **Facebook Posts**: Text + comments + media analysis  
✅ **YouTube Videos**: Existing functionality preserved
✅ **Unified API**: Single endpoint for all platforms
✅ **Text Aggregation**: OCR + audio + scraped text
✅ **Model Integration**: Uses existing misinformation analysis
✅ **Error Handling**: Graceful degradation and fallbacks
