"""
Analysis Router Service
Intelligent routing of content to appropriate analysis methods
"""

import logging
import httpx
import os
from typing import Dict, Any, Optional
import pytesseract

from utils.link_parser import LinkParser
from utils.image_handler import ImageHandler

from fastapi import APIRouter
from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class AnalysisRouter:
    """Intelligent routing service for content analysis"""

    def __init__(self):
        self.link_parser = LinkParser()
        self.image_handler = ImageHandler()

        # Full URLs — set TEXT_MODEL_URL to whatever your model exposes
        # e.g. http://127.0.0.1:8081/predict  or  http://127.0.0.1:8081/analyze
        self.text_model_url = os.getenv('TEXT_MODEL_URL', 'http://127.0.0.1:8081/analyze')
        self.youtube_model_url = os.getenv('YOUTUBE_MODEL_URL', 'http://127.0.0.1:8000/analyze')

        self.http_client = httpx.AsyncClient(timeout=30.0)

        logger.info(f"AnalysisRouter ready | text_model={self.text_model_url} | youtube_model={self.youtube_model_url}")

    async def route_analysis(
        self,
        content_type: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Route content to the appropriate analysis method."""
        try:
            if content_type == "text":
                return await self._analyze_text(content, metadata)
            elif content_type == "image":
                return await self._analyze_image(content, metadata)
            elif content_type == "url":
                return await self._analyze_url(content, metadata)
            else:
                raise ValueError(f"Unsupported content type: {content_type}")
        except Exception as e:
            logger.error(f"Analysis routing failed: {str(e)}", exc_info=True)
            return self._fallback_response(content_type, str(e))

    # ------------------------------------------------------------------ #
    #  Text                                                                #
    # ------------------------------------------------------------------ #

    async def _analyze_text(self, text: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Send text to the ML model service and return structured result."""
        try:
            logger.info(f"POST {self.text_model_url} | payload={{text: <{len(text)} chars>}}")

            response = await self.http_client.post(
                self.text_model_url,
                json={"text": text},
            )

            # Log full response so you can see what your model actually returns
            logger.info(f"Text model HTTP {response.status_code} | body: {response.text[:300]}")
            response.raise_for_status()

            result = response.json()

            return {
                "status": "success",
                "prediction": result.get("prediction", "UNKNOWN"),
                "confidence": result.get("confidence", 0.0),
                "details": {
                    "content_type": "text",
                    "claims_analyzed": result.get("claims_analyzed", 1),
                    "model_response": result,
                },
            }

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error from text model: {e.response.status_code} {e.response.text}")
            return self._fallback_response("text", f"HTTP {e.response.status_code}: {e.response.text[:200]}")
        except Exception as e:
            logger.error(f"Text analysis failed: {str(e)}", exc_info=True)
            return self._fallback_response("text", str(e))

    # ------------------------------------------------------------------ #
    #  Image                                                               #
    # ------------------------------------------------------------------ #

    async def _analyze_image(self, image_content: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Decode image, run OCR, then send extracted text to the text model."""
        try:
            image = self.image_handler.base64_to_image(image_content)
            logger.info(f"Image received: size={image.size}, mode={image.mode}")

            try:
                extracted_text = pytesseract.image_to_string(image).strip()
                logger.info(f"OCR result ({len(extracted_text)} chars): {extracted_text[:120]}")

                if not extracted_text:
                    return {
                        "status": "success",
                        "prediction": "NEEDS_REVIEW",
                        "confidence": 0.5,
                        "details": {
                            "content_type": "image",
                            "image_size": image.size,
                            "image_mode": image.mode,
                            "extracted_text": "",
                            "note": "No text found in image — visual-only analysis not yet supported",
                        },
                    }

                # Reuse text model
                text_response = await self.http_client.post(
                    self.text_model_url,
                    json={"text": extracted_text},
                )
                logger.info(f"Text model HTTP {text_response.status_code} (image path)")
                text_response.raise_for_status()
                text_result = text_response.json()

                return {
                    "status": "success",
                    "prediction": text_result.get("prediction", "UNKNOWN"),
                    "confidence": text_result.get("confidence", 0.0),
                    "details": {
                        "content_type": "image",
                        "image_size": image.size,
                        "image_mode": image.mode,
                        "extracted_text": extracted_text,
                        "text_analysis": text_result,
                    },
                }

            except Exception as ocr_error:
                logger.error(f"OCR failed: {str(ocr_error)}")
                return {
                    "status": "success",
                    "prediction": "NEEDS_REVIEW",
                    "confidence": 0.3,
                    "details": {
                        "content_type": "image",
                        "image_size": image.size,
                        "image_mode": image.mode,
                        "note": f"OCR failed: {str(ocr_error)}",
                    },
                }

        except Exception as e:
            logger.error(f"Image analysis failed: {str(e)}", exc_info=True)
            return self._fallback_response("image", str(e))

    # ------------------------------------------------------------------ #
    #  URL                                                                 #
    # ------------------------------------------------------------------ #

    async def _analyze_url(self, url: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        try:
            url_info = self.link_parser.parse_url(url)
            platform = url_info.get("platform", "unknown")

            if platform == "youtube":
                return await self._analyze_youtube_url(url, url_info)
            elif platform == "instagram":
                return await self._analyze_instagram_url(url, url_info)
            else:
                return await self._analyze_general_url(url, url_info)

        except Exception as e:
            logger.error(f"URL analysis failed: {str(e)}", exc_info=True)
            return self._fallback_response("url", str(e))

    async def _analyze_youtube_url(self, url: str, url_info: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze YouTube URL - currently returns placeholder response"""
        try:
            video_id = url_info.get("video_id")
            logger.info(f"DEBUG: YouTube URL analysis requested for video_id: {video_id}")
            
            # Since YouTube model service doesn't exist yet, return a proper response
            return {
                "status": "success",
                "prediction": "NEEDS_REVIEW",
                "confidence": None,
                "details": {
                    "content_type": "youtube_video",
                    "video_id": video_id,
                    "platform": "youtube",
                    "note": "YouTube analysis service not yet implemented - manual review needed",
                    "url": url
                }
            }
            
        except Exception as e:
            logger.error(f"YouTube analysis failed: {str(e)}")
            return self._fallback_response("youtube", str(e))

    async def _analyze_instagram_url(self, url: str, url_info: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "status": "success",
            "prediction": "NEEDS_REVIEW",
            "confidence": 0.5,
            "details": {
                "content_type": "instagram_post",
                "platform": "instagram",
                "note": "Instagram analysis not yet integrated",
            },
        }

    async def _analyze_general_url(self, url: str, url_info: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "status": "success",
            "prediction": "NEEDS_REVIEW",
            "confidence": 0.5,
            "details": {
                "content_type": "webpage",
                "url": url,
                "domain": url_info.get("domain"),
                "note": "General webpage analysis not yet integrated",
            },
        }

    # ------------------------------------------------------------------ #
    #  Fallback                                                            #
    # ------------------------------------------------------------------ #

    def _fallback_response(self, content_type: str, error_msg: str) -> Dict[str, Any]:
        return {
            "status": "error",
            "prediction": "INSUFFICIENT",
            "confidence": 0.0,
            "details": {
                "content_type": content_type,
                "error": error_msg,
                "fallback": True,
            },
        }


# ── FastAPI route wiring ──────────────────────────────────────────────── #
# This file doubles as the route module imported by main.py               #

router = APIRouter()
analysis_router_instance = AnalysisRouter()


@router.post("/analyze")
async def analyze_endpoint(request: Request):
    """Main analysis endpoint called by the Telegram bot."""
    data = await request.json()
    content_type = data.get("type")
    content = data.get("content")
    metadata = data.get("metadata")

    if not content_type or not content:
        return JSONResponse(
            status_code=422,
            content={"status": "error", "message": "Both 'type' and 'content' are required"},
        )

    result = await analysis_router_instance.route_analysis(content_type, content, metadata)
    return JSONResponse(result)