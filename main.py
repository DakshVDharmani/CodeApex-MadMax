"""
gpu_scientific_main_v2.py
Drop-in replacement / patch instructions for gpu_scientific_main.py

CHANGES:
1. Import rag_truth_analyzer_v2 (falls back to v1 if not present)
2. Pass full structured explanation + NLI probs to frontend
3. Serve new dashboard.html from disk (or embedded below)
4. Better claim extraction — more signal, less noise
5. Async claim analysis with proper timeout and fallback
"""

# ─── Place this at the TOP of gpu_scientific_main.py (replace existing imports) ───

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
from datetime import datetime
import re, os, tempfile, asyncio, json
from typing import Optional, List, Dict
import requests, yt_dlp

# Import new services
try:
    import services
    # Use REAL Instagram service
    from real_instagram import process_instagram
    process_facebook = services.process_facebook
    SERVICES_AVAILABLE = True
    print("✅ Social media services loaded")
    print(f"Instagram service: {process_instagram is not None}")
    print(f"Facebook service: {process_facebook is not None}")
except Exception as e:
    SERVICES_AVAILABLE = False
    print(f"⚠️ Social media services not available: {e}")
    import traceback
    traceback.print_exc()
    process_instagram = None
    process_facebook = None

app = FastAPI(title="MisinfoLens v2", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

class YouTubeRequest(BaseModel):
    url: str

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

# ── Load analyzer ────────────────────────────────
try:
    from rag_truth_analyzer import analyze_claim_comprehensive, get_analyzer
    RAG_VERSION = "v2"
    RAG_TRUTH_AVAILABLE = True
    print("✅ RAG Truth Analyzer loaded")
    # Preload the analyzer to avoid timeout during first request
    print("🔄 Preloading BART model and components...")
    analyzer = get_analyzer()
    print("✅ BART model and components preloaded successfully")
except ImportError:
    RAG_VERSION = "none"
    RAG_TRUTH_AVAILABLE = False
    print("⚠️  No RAG analyzer available")
    def analyze_claim_comprehensive(claim: str) -> Dict:
        return {
            "claim": claim, "validation_result": "unverified",
            "truth_confidence": 0.5, "harm_risk": 50.0,
            "color": "yellow", "explanation": "Analysis unavailable.",
            "research_grade": False, "analysis_method": "none",
            "evidence_sources": [], "nli_probabilities": {},
            "retrieval_quality": 0.0, "evidence_count": 0,
            "domain": "general", "claim_type": "general",
        }

# ── System Info ─────────────────────────────────────────────────────────────
SYSTEM_INFO = {"processing_method": "CPU", "device_count": 1}

def detect_system():
    """Detect system capabilities (CPU only)"""
    try:
        import torch
        SYSTEM_INFO.update({
            "torch_version": torch.__version__,
            "processing_method": "CPU"
        })
        return True
    except ImportError:
        pass
    return False

detect_system()

# ── YouTube helpers ───────────────────────────────────────────────────────────
def extract_video_id(url: str) -> Optional[str]:
    patterns = [
        r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([^&\n?#]+)',
        r'youtube\.com/watch\?.*v=([^&\n?#]+)',
    ]
    for p in patterns:
        m = re.search(p, url)
        if m: return m.group(1)
    return None


def get_transcript(video_url: str) -> Dict:
    try:
        with tempfile.TemporaryDirectory() as tmp:
            ydl_opts = {
                'quiet': True, 'no_warnings': True, 'skip_download': True,
                'writesubtitles': True, 'writeautomaticsub': True,
                'subtitleslangs': ['en', 'en-US'], 'subtitlesformat': 'srt',
                'outtmpl': os.path.join(tmp, 'sub.%(ext)s'),
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                title    = info.get('title', 'Unknown')
                duration = info.get('duration', 0)
                ydl.download([video_url])

            text = ""
            for fname in os.listdir(tmp):
                if fname.endswith('.srt'):
                    with open(os.path.join(tmp, fname), encoding='utf-8') as f:
                        raw = f.read()
                    matches = re.findall(r'\d+\n[\d:,]+ --> [\d:,]+\n(.+?)(?=\n\d+|\Z)', raw, re.DOTALL)
                    text = ' '.join(m.strip() for m in matches)
                    if len(text) > 80: break

            if len(text) > 80:
                return {'success': True, 'transcript': text, 'video_title': title,
                        'duration': duration, 'word_count': len(text.split()),
                        'method': 'yt_dlp_srt'}
            return {'success': False, 'error': 'No transcript found', 'video_title': title}
    except Exception as e:
        return {'success': False, 'error': str(e)}


# ── Improved claim extractor ──────────────────────────────────────────────────
SCIENTIFIC_KEYWORDS = [
    "earth", "moon", "sun", "mars", "planet", "galaxy", "universe", "star", "space",
    "billion", "million", "trillion", "light-year", "distance", "size", "diameter",
    "gravity", "speed of light", "climate", "temperature", "vaccine", "virus",
    "dna", "evolution", "big bang", "curvature", "sphere", "orbit", "rotation",
    "atom", "electron", "quantum", "relativity", "radiation", "chemical",
    "water", "oxygen", "carbon", "protein", "cell", "neuron", "brain",
]

FACTUAL_VERBS = [
    "is", "are", "was", "were", "has", "have", "contains", "measures",
    "consists of", "equals", "proves", "shows", "demonstrates", "confirms",
    "causes", "leads to", "results in", "affects", "produces",
]

SKIP_FRAGMENTS = [
    "that's", "here's", "let's", "you know", "i mean", "so basically",
    "kind of", "sort of", "like i said", "as i said", "right?", "okay?",
]

def extract_claims(transcript: str) -> List[Dict]:
    """Smarter claim extraction — scientific content only, clean sentences."""
    # Clean transcript
    clean = re.sub(r'\[.*?\]', '', transcript)  # remove [Music], [Applause]
    clean = re.sub(r'\s+', ' ', clean).strip()

    # Split on sentence boundaries
    parts = re.split(r'(?<=[.!?])\s+', clean)
    claims = []
    pos = 0

    for part in parts:
        part = part.strip()
        if len(part) < 20:
            pos += len(part) + 1
            continue

        pl = part.lower()

        # Must contain scientific keywords
        has_sci = any(kw in pl for kw in SCIENTIFIC_KEYWORDS)
        # Must have factual verb
        has_verb = any(v in pl for v in FACTUAL_VERBS)
        # Skip opinion/conversational
        is_skip = any(s in pl for s in SKIP_FRAGMENTS)
        # Skip questions
        is_question = part.strip().endswith('?')
        # Minimum word count
        word_count = len(part.split())

        if has_sci and has_verb and not is_skip and not is_question and word_count >= 5:
            claims.append({
                'text': part,
                'start_pos': pos,
                'end_pos': pos + len(part),
            })

        pos += len(part) + 1

    return claims[:40]  # cap at 40 claims max


# ── Async claim analysis ──────────────────────────────────────────────────────
MAX_COMPREHENSIVE = int(os.getenv("RAG_MAX_CLAIMS", "8"))
PER_CLAIM_TIMEOUT = float(os.getenv("RAG_CLAIM_TIMEOUT", "60"))


async def analyze_claims(sentences: List[Dict], transcript: str) -> List[Dict]:
    results = []
    comprehensive_used = 0

    for i, sent in enumerate(sentences):
        text = sent['text']
        if len(text) < 15:
            continue

        use_comprehensive = comprehensive_used < MAX_COMPREHENSIVE
        try:
            rag = await asyncio.wait_for(
                asyncio.to_thread(analyze_claim_comprehensive, text),
                timeout=PER_CLAIM_TIMEOUT
            )
            if rag.get("research_grade") and use_comprehensive:
                comprehensive_used += 1
        except asyncio.TimeoutError:
            rag = {"claim": text, "validation_result": "unverified",
                   "truth_confidence": 0.5, "harm_risk": 50.0, "color": "yellow",
                   "explanation": "Analysis timed out.", "research_grade": False,
                   "analysis_method": "timeout", "evidence_sources": [],
                   "nli_probabilities": {}, "retrieval_quality": 0.0,
                   "evidence_count": 0, "domain": "general", "claim_type": "general"}
        except Exception as e:
            rag = {"claim": text, "validation_result": "error",
                   "truth_confidence": 0.5, "harm_risk": 50.0, "color": "yellow",
                   "explanation": f"Error: {e}", "research_grade": False,
                   "analysis_method": "error", "evidence_sources": [],
                   "nli_probabilities": {}, "retrieval_quality": 0.0,
                   "evidence_count": 0, "domain": "general", "claim_type": "general"}

        # Build unified claim object for frontend
        validation = rag.get("validation_result", "unverified")
        confidence = rag.get("truth_confidence", 0.5)
        harm_risk  = rag.get("harm_risk", 50.0)
        color      = rag.get("color", "yellow")
        is_misinfo = validation in ("false", "partially_true")

        # Context window from transcript
        s, e = sent['start_pos'], sent['end_pos']
        context = transcript[max(0, s-80): min(len(transcript), e+80)]

        results.append({
            "id": i + 1,
            "text": text,
            "context": context,
            "start_position": s,
            "end_position": e,
            "is_misinformation": is_misinfo,
            "validation_result": validation,
            "risk_score": harm_risk,
            "risk_level": "high" if harm_risk >= 70 else "medium" if harm_risk >= 40 else "low",
            "confidence": confidence,
            "color": color,
            "domain": rag.get("domain", "general"),
            "claim_type": rag.get("claim_type", "general"),
            "analysis_method": rag.get("analysis_method", "unknown"),
            "research_grade": rag.get("research_grade", False),
            "evidence_count": rag.get("evidence_count", 0),
            "retrieval_quality": rag.get("retrieval_quality", 0.0),
            # Evidence sources for the evidence tab
            "evidence_sources": rag.get("evidence_sources", []),
            # NLI probabilities for the NLI tab
            "rag_verification": {
                "is_misinformation": is_misinfo,
                "verification_details": {
                    "nli_probabilities": rag.get("nli_probabilities", {}),
                    "detailed_explanation": rag.get("explanation", ""),
                    "comprehensive_analysis": {
                        "explanation": rag.get("explanation", ""),
                        "truth_confidence": confidence,
                        "harm_risk": harm_risk,
                        "validation_result": validation,
                        "color": color,
                        "domain": rag.get("domain", "general"),
                        "claim_type": rag.get("claim_type", "general"),
                        "evidence_count": rag.get("evidence_count", 0),
                        "retrieval_quality": rag.get("retrieval_quality", 0.0),
                    },
                    "source_items": rag.get("evidence_sources", []),
                }
            }
        })

    # Sort: misinformation first, then by risk score
    results.sort(key=lambda x: (not x["is_misinformation"], -x["risk_score"]))
    return results


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
async def serve_dashboard():
    """Serve the redesigned dashboard"""
    # Look for dashboard.html next to this file
    dash_path = os.path.join(os.path.dirname(__file__), "dashboard.html")
    if os.path.exists(dash_path):
        with open(dash_path, encoding="utf-8") as f:
            return HTMLResponse(f.read())
    return HTMLResponse("<h1>dashboard.html not found</h1>", status_code=404)


@app.get("/youtube", response_class=HTMLResponse)
async def serve_youtube_ingest():
    """Serve the YouTube ingest page"""
    # Look for youtube_ingest.html next to this file
    youtube_path = os.path.join(os.path.dirname(__file__), "youtube_ingest.html")
    if os.path.exists(youtube_path):
        with open(youtube_path, encoding="utf-8") as f:
            return HTMLResponse(f.read())
    return HTMLResponse("<h1>youtube_ingest.html not found</h1>", status_code=404)


@app.get("/api/researcher/status")
def status():
    detect_system()
    return {
        "status": "ready",
        "system_info": SYSTEM_INFO,
        "models_loaded": RAG_TRUTH_AVAILABLE,
        "rag_version": RAG_VERSION,
        "endpoints": [
            {"method": "GET",  "path": "/"},
            {"method": "GET",  "path": "/youtube"},
            {"method": "POST", "path": "/api/youtube/ingest"},
            {"method": "POST", "path": "/api/analyze"},
            {"method": "GET",  "path": "/api/researcher/status"},
        ]
    }


@app.get("/debug/services")
def debug_services():
    """Debug endpoint to check service availability"""
    return {
        "SERVICES_AVAILABLE": SERVICES_AVAILABLE,
        "process_instagram": process_instagram is not None,
        "process_facebook": process_facebook is not None,
        "instagram_type": str(type(process_instagram)),
        "facebook_type": str(type(process_facebook)),
        "services_dir": os.path.exists("services"),
        "instagram_file": os.path.exists("services/instagram_service.py"),
        "facebook_file": os.path.exists("services/facebook_service.py")
    }


@app.post("/api/youtube/ingest")
async def ingest(request: YouTubeRequest):
    video_id = extract_video_id(request.url)
    if not video_id:
        raise HTTPException(400, "Invalid YouTube URL")

    # Step 1: transcript
    tr = get_transcript(request.url)
    if not tr.get("success"):
        raise HTTPException(500, f"Transcript failed: {tr.get('error','unknown')}")

    transcript_text = tr["transcript"]

    # Step 2: extract claims
    sentences = extract_claims(transcript_text)

    # Step 3: analyze
    claims = await analyze_claims(sentences, transcript_text)

    detect_system()
    misinfo_count = sum(1 for c in claims if c["is_misinformation"])

    return {
        "success": True,
        "transcript": transcript_text,
        "claims": claims,
        "video_title": tr.get("video_title", f"Video {video_id}"),
        "video_metadata": {
            "video_id": video_id,
            "url": request.url,
            "title": tr.get("video_title", ""),
            "duration": f"{tr.get('duration',0)}s",
            "word_count": tr.get("word_count", 0),
            "transcript_method": tr.get("method", "yt_dlp"),
            "total_claims_found": len(claims),
            "misinformation_claims": misinfo_count,
            "high_risk_claims": sum(1 for c in claims if c["risk_score"] >= 70),
            "misinformation_detected": misinfo_count > 0,
        },
        "system_info": SYSTEM_INFO,
        "rag_version": RAG_VERSION,
    }


@app.post("/api/analyze")
async def analyze_social_media(request: SocialMediaRequest):
    """Main analysis endpoint for all social media platforms"""
    platform = detect_platform(request.url)
    
    if platform == "other":
        raise HTTPException(400, "Unsupported platform. Please provide Instagram, Facebook, or YouTube URL.")
    
    try:
        # Extract text based on platform
        if platform == "instagram":
            if not SERVICES_AVAILABLE or not process_instagram:
                raise HTTPException(503, "Instagram service not available")
            
            try:
                # Process Instagram post
                post_data = await process_instagram(request.url)
                
                # Check if we got real data
                if post_data.get('error') or not post_data.get('caption'):
                    return {
                        "success": False,
                        "error": f"Instagram scraping failed: {post_data.get('error', 'Unknown error')}. Instagram may require login or the post may be private.",
                        "platform": "instagram",
                        "url": request.url
                    }
                
                # ONLY use caption for analysis - NO comments, OCR, or audio
                final_text = post_data.get('caption', '')
                
            except Exception as e:
                return {
                    "success": False,
                    "error": f"Instagram service error: {str(e)}",
                    "platform": "instagram",
                    "url": request.url
                }
            
        elif platform == "facebook":
            if not SERVICES_AVAILABLE or not process_facebook:
                raise HTTPException(503, "Facebook service not available")
            
            try:
                # Process Facebook post
                post_data = await process_facebook(request.url)
                
                # Check if we got real data
                if post_data.get('error') or not post_data.get('post_text'):
                    return {
                        "success": False,
                        "error": f"Facebook scraping failed: {post_data.get('error', 'Unknown error')}. Facebook may require login or the post may be private.",
                        "platform": "facebook",
                        "url": request.url
                    }
                
                # Combine all text sources
                final_text = f"""
Post Text: {post_data.get('post_text', '')}
Comments: {' '.join(post_data.get('comments', []))}
OCR: {post_data.get('media_data', {}).get('ocr_text', '')}
Audio: {post_data.get('media_data', {}).get('audio_text', '')}
""".strip()
                
            except Exception as e:
                return {
                    "success": False,
                    "error": f"Facebook service error: {str(e)}",
                    "platform": "facebook",
                    "url": request.url
                }
            
        elif platform == "youtube":
            # Use existing YouTube pipeline
            video_id = extract_video_id(request.url)
            if not video_id:
                raise HTTPException(400, "Invalid YouTube URL")
            
            # Get transcript
            tr = get_transcript(request.url)
            if not tr.get("success"):
                raise HTTPException(500, f"Transcript failed: {tr.get('error','unknown')}")
            
            final_text = tr["transcript"]
        
        else:
            raise HTTPException(400, "Unsupported platform")
        
        # Clean and prepare text for analysis
        cleaned_text = clean_aggregated_text(final_text)
        
        # Send to existing misinformation model
        if not RAG_TRUTH_AVAILABLE:
            raise HTTPException(503, "Misinformation analysis model not available")
        
        # Extract claims from aggregated text
        sentences = extract_claims(cleaned_text)
        
        # Analyze claims using existing model
        claims = await analyze_claims(sentences, cleaned_text)
        
        # Calculate statistics
        misinfo_count = sum(1 for c in claims if c["is_misinformation"])
        
        return {
            "success": True,
            "platform": platform,
            "url": request.url,
            "extracted_text": cleaned_text,
            "claims": claims,
            "analysis_summary": {
                "total_claims": len(claims),
                "misinformation_claims": misinfo_count,
                "high_risk_claims": sum(1 for c in claims if c["risk_score"] >= 70),
                "medium_risk_claims": sum(1 for c in claims if 40 <= c["risk_score"] < 70),
                "low_risk_claims": sum(1 for c in claims if c["risk_score"] < 40),
                "misinformation_detected": misinfo_count > 0,
            },
            "raw_data": post_data if platform in ["instagram", "facebook"] else None,
            "system_info": SYSTEM_INFO,
            "rag_version": RAG_VERSION,
        }
        
    except HTTPException:
        # Re-raise FastAPI HTTP exceptions
        raise
    except Exception as e:
        # Catch-all for any other errors
        return {
            "success": False,
            "error": f"Analysis failed: {str(e)}",
            "platform": platform,
            "url": request.url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error analyzing social media content: {e}")
        raise HTTPException(500, f"Analysis failed: {str(e)}")


def clean_aggregated_text(text: str) -> str:
    """Clean and deduplicate aggregated text from multiple sources"""
    if not text:
        return ""
    
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text.strip())
    
    # Remove duplicate sentences (simple approach)
    sentences = text.split('.')
    unique_sentences = []
    seen = set()
    
    for sentence in sentences:
        sentence = sentence.strip()
        if sentence and sentence not in seen:
            unique_sentences.append(sentence)
            seen.add(sentence)
    
    # Rejoin and limit length
    cleaned_text = '. '.join(unique_sentences)
    if len(cleaned_text) > 5000:  # Limit to prevent memory issues
        cleaned_text = cleaned_text[:5000] + "..."
    
    return cleaned_text


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)