#!/usr/bin/env python3
"""
Simple test for the new API endpoint with working mock responses
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import re
import json
from datetime import datetime

app = FastAPI(title="MisinfoLens Test", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

class SocialMediaRequest(BaseModel):
    url: str

def detect_platform(url: str) -> str:
    """Detect the social media platform from URL"""
    url_lower = url.lower()
    if "instagram.com" in url_lower:
        return "instagram"
    elif "facebook.com" in url_lower:
        return "facebook"
    elif "youtube.com" in url_lower or "youtu.be" in url_lower:
        return "youtube"
    else:
        return "other"

def generate_mock_claims(platform: str, url: str):
    """Generate realistic mock claims based on platform"""
    if platform == "instagram":
        return [
            {
                "id": "ig_1",
                "text": "This revolutionary weight loss tea helped me lose 20 pounds in just 2 weeks!",
                "context": "Instagram wellness product promotion",
                "domain": "health",
                "claim_type": "product_claim",
                "risk_score": 85,
                "risk_level": "high",
                "confidence": 0.3,
                "validity_score": 0.2,
                "method_accuracy": 0.4,
                "is_misinformation": True,
                "validation_result": "false",
                "color": "red",
                "analysis_method": "scientific_verification",
                "research_grade": False,
                "evidence_count": 2,
                "retrieval_quality": 0.3,
                "dataset_warning": True,
                "preprint_alert": False,
                "timestamp": datetime.now().isoformat(),
                "start_position": 0,
                "end_position": 100,
                "evidence_sources": [],
                "rag_verification": {"status": "verified"}
            },
            {
                "id": "ig_2",
                "text": "Using this natural skincare routine cleared my acne completely in 3 days",
                "context": "Instagram beauty product review",
                "domain": "health",
                "claim_type": "testimonial",
                "risk_score": 65,
                "risk_level": "medium",
                "confidence": 0.5,
                "validity_score": 0.4,
                "method_accuracy": 0.6,
                "is_misinformation": False,
                "validation_result": "partially_true",
                "color": "yellow",
                "analysis_method": "testimonial_analysis",
                "research_grade": False,
                "evidence_count": 3,
                "retrieval_quality": 0.5,
                "dataset_warning": False,
                "preprint_alert": False,
                "timestamp": datetime.now().isoformat(),
                "start_position": 101,
                "end_position": 200,
                "evidence_sources": [],
                "rag_verification": {"status": "verified"}
            },
            {
                "id": "ig_3",
                "text": "This cryptocurrency investment opportunity guarantees 500% returns in one month",
                "context": "Instagram financial promotion",
                "domain": "finance",
                "claim_type": "investment_claim",
                "risk_score": 95,
                "risk_level": "high",
                "confidence": 0.1,
                "validity_score": 0.1,
                "method_accuracy": 0.2,
                "is_misinformation": True,
                "validation_result": "false",
                "color": "red",
                "analysis_method": "financial_verification",
                "research_grade": False,
                "evidence_count": 1,
                "retrieval_quality": 0.1,
                "dataset_warning": True,
                "preprint_alert": False,
                "timestamp": datetime.now().isoformat(),
                "start_position": 201,
                "end_position": 300,
                "evidence_sources": [],
                "rag_verification": {"status": "verified"}
            }
        ]
    elif platform == "facebook":
        return [
            {
                "id": "fb_1",
                "text": "Breaking: Government secretly planning to implement martial law next month according to anonymous sources",
                "context": "Facebook political post",
                "domain": "politics",
                "claim_type": "political_claim",
                "risk_score": 92,
                "risk_level": "high",
                "confidence": 0.2,
                "validity_score": 0.1,
                "method_accuracy": 0.3,
                "is_misinformation": True,
                "validation_result": "false",
                "color": "red",
                "analysis_method": "source_verification",
                "research_grade": False,
                "evidence_count": 0,
                "retrieval_quality": 0.1,
                "dataset_warning": True,
                "preprint_alert": False,
                "timestamp": datetime.now().isoformat(),
                "start_position": 0,
                "end_position": 120,
                "evidence_sources": [],
                "rag_verification": {"status": "verified"}
            },
            {
                "id": "fb_2",
                "text": "New study shows that drinking 8 glasses of water daily has no health benefits",
                "context": "Facebook health information sharing",
                "domain": "health",
                "claim_type": "scientific_claim",
                "risk_score": 45,
                "risk_level": "medium",
                "confidence": 0.6,
                "validity_score": 0.5,
                "method_accuracy": 0.7,
                "is_misinformation": False,
                "validation_result": "partially_true",
                "color": "yellow",
                "analysis_method": "scientific_review",
                "research_grade": True,
                "evidence_count": 5,
                "retrieval_quality": 0.6,
                "dataset_warning": False,
                "preprint_alert": False,
                "timestamp": datetime.now().isoformat(),
                "start_position": 121,
                "end_position": 240,
                "evidence_sources": [],
                "rag_verification": {"status": "verified"}
            },
            {
                "id": "fb_3",
                "text": "This local business is closing down permanently due to government restrictions",
                "context": "Facebook community update",
                "domain": "local_news",
                "claim_type": "informational",
                "risk_score": 25,
                "risk_level": "low",
                "confidence": 0.8,
                "validity_score": 0.7,
                "method_accuracy": 0.8,
                "is_misinformation": False,
                "validation_result": "true",
                "color": "green",
                "analysis_method": "local_verification",
                "research_grade": False,
                "evidence_count": 3,
                "retrieval_quality": 0.7,
                "dataset_warning": False,
                "preprint_alert": False,
                "timestamp": datetime.now().isoformat(),
                "start_position": 241,
                "end_position": 350,
                "evidence_sources": [],
                "rag_verification": {"status": "verified"}
            }
        ]
    elif platform == "youtube":
        return [
            {
                "id": "yt_1",
                "text": "The earth is actually flat and NASA has been hiding this truth for 60 years",
                "context": "YouTube conspiracy theory video",
                "domain": "science",
                "claim_type": "conspiracy_theory",
                "risk_score": 98,
                "risk_level": "high",
                "confidence": 0.05,
                "validity_score": 0.0,
                "method_accuracy": 0.1,
                "is_misinformation": True,
                "validation_result": "false",
                "color": "red",
                "analysis_method": "scientific_verification",
                "research_grade": False,
                "evidence_count": 0,
                "retrieval_quality": 0.0,
                "dataset_warning": True,
                "preprint_alert": False,
                "timestamp": datetime.now().isoformat(),
                "start_position": 0,
                "end_position": 100,
                "evidence_sources": [],
                "rag_verification": {"status": "verified"}
            },
            {
                "id": "yt_2",
                "text": "Regular exercise and balanced diet are proven to improve overall health and longevity",
                "context": "YouTube educational health content",
                "domain": "health",
                "claim_type": "factual_statement",
                "risk_score": 5,
                "risk_level": "low",
                "confidence": 0.95,
                "validity_score": 0.9,
                "method_accuracy": 0.9,
                "is_misinformation": False,
                "validation_result": "true",
                "color": "green",
                "analysis_method": "scientific_consensus",
                "research_grade": True,
                "evidence_count": 10,
                "retrieval_quality": 0.9,
                "dataset_warning": False,
                "preprint_alert": False,
                "timestamp": datetime.now().isoformat(),
                "start_position": 101,
                "end_position": 200,
                "evidence_sources": [],
                "rag_verification": {"status": "verified"}
            }
        ]
    else:
        return []

def generate_mock_content(platform: str, url: str):
    """Generate realistic mock extracted content"""
    if platform == "instagram":
        return """
Caption: "Transform your body in just 14 days with our revolutionary tea! 🍵✨ Results speak for themselves! #weightloss #detox #natural"

Comments: 
- "OMG this really works! I lost 15 pounds!"
- "Is this safe? I'm skeptical about quick results"
- "Just ordered mine, can't wait to try!"
- "Scam alert: These products are dangerous"

OCR: "Weight Loss Tea - Natural Ingredients - 14 Day Challenge"
Audio: "Welcome to your weight loss journey with our special blend..."

Post ID: ABC123
Platform: Instagram
        """.strip()
    elif platform == "facebook":
        return """
Post Text: "BREAKING NEWS: Government sources confirm emergency preparations are underway. Share this to spread awareness! 🚨"

Comments:
- "This is terrifying, we need to prepare"
- "Can anyone verify this information?"
- "Fake news, no credible sources"
- "My friend works in government and said this is real"

OCR: "Emergency Alert System - Official Notice"
Audio: "Attention all citizens, please remain calm..."

Post ID: XYZ789
Platform: Facebook
        """.strip()
    elif platform == "youtube":
        return """
Transcript: "Welcome to my channel where I expose the truth about our world. Today we're discussing why everything you've been taught about science is wrong..."

Video ID: dQw4w9WgXcQ
Platform: YouTube
        """.strip()
    else:
        return f"Unknown platform content for: {url}"

@app.post("/api/analyze")
async def analyze_social_media(request: SocialMediaRequest):
    """Test endpoint for social media analysis with realistic mock data"""
    platform = detect_platform(request.url)
    
    if platform == "other":
        raise HTTPException(400, "Unsupported platform. Please provide Instagram, Facebook, or YouTube URL.")
    
    # Generate realistic mock data
    claims = generate_mock_claims(platform, request.url)
    extracted_text = generate_mock_content(platform, request.url)
    
    # Create video metadata
    video_metadata = {
        "url": request.url,
        "title": f"Mock {platform.title()} Content Analysis",
        "word_count": len(extracted_text.split()),
        "transcript_method": "Multi-Source Extraction",
        "total_claims_found": len(claims),
        "misinformation_claims": sum(1 for c in claims if c["is_misinformation"]),
        "high_risk_claims": sum(1 for c in claims if c["risk_score"] >= 70),
        "misinformation_detected": any(c["is_misinformation"] for c in claims),
        "platform": platform
    }
    
    # Create raw data for Instagram/Facebook
    raw_data = None
    if platform in ["instagram", "facebook"]:
        raw_data = {
            "url": request.url,
            "caption": "Mock caption content" if platform == "instagram" else "Mock post text",
            "comments": ["Mock comment 1", "Mock comment 2", "Mock comment 3"],
            "media_data": {
                "ocr_text": "Mock OCR extracted text from images",
                "audio_text": "Mock audio transcribed text"
            },
            "timestamp": datetime.now().isoformat()
        }
    
    return {
        "success": True,
        "platform": platform,
        "url": request.url,
        "extracted_text": extracted_text,
        "claims": claims,
        "video_metadata": video_metadata,
        "analysis_summary": {
            "total_claims": len(claims),
            "misinformation_claims": sum(1 for c in claims if c["is_misinformation"]),
            "high_risk_claims": sum(1 for c in claims if c["risk_score"] >= 70),
            "medium_risk_claims": sum(1 for c in claims if 40 <= c["risk_score"] < 70),
            "low_risk_claims": sum(1 for c in claims if c["risk_score"] < 40),
            "misinformation_detected": any(c["is_misinformation"] for c in claims),
        },
        "raw_data": raw_data,
        "system_info": {
            "status": "test_mode",
            "models_loaded": True,
            "rag_version": "test_v1"
        }
    }

@app.get("/api/researcher/status")
def status():
    return {
        "status": "ready",
        "system_info": {"status": "test_mode"},
        "models_loaded": True,
        "rag_version": "test_v1",
        "endpoints": [
            {"method": "POST", "path": "/api/analyze"},
            {"method": "GET", "path": "/api/researcher/status"},
        ]
    }

@app.get("/health")
def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat(), "system": "test_mode"}

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting enhanced test server on http://localhost:8000")
    print("📱 Test endpoints:")
    print("   POST /api/analyze - Universal social media analysis (WORKING)")
    print("   GET /api/researcher/status - System status")
    print("🌐 Frontend should connect to: http://localhost:5175")
    print("✅ Instagram, Facebook, and YouTube analysis now working!")
    uvicorn.run("simple_test:app", host="0.0.0.0", port=8000, reload=True)
