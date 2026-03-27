"""
Analysis Router Service
Intelligent routing of content to appropriate analysis methods
"""

import logging
import base64
import io
import httpx
import os
from typing import Dict, Any, Optional
from PIL import Image
import pytesseract
import numpy as np

from utils.link_parser import LinkParser
from utils.image_handler import ImageHandler

logger = logging.getLogger(__name__)


class AnalysisRouter:
    """Intelligent routing service for content analysis"""

    def __init__(self):
        self.link_parser = LinkParser()
        self.image_handler = ImageHandler()

        # Load service URLs from environment
        self.text_model_url = os.getenv('TEXT_MODEL_URL', 'http://127.0.0.1:8081/fact-check')
        self.youtube_model_url = os.getenv('YOUTUBE_MODEL_URL', 'http://127.0.0.1:8000/api/youtube/ingest')
        # Initialize HTTP client with longer timeout for slow models
        self.http_client = httpx.AsyncClient(timeout=120.0)

        # --- Tesseract OCR ---
        self.ocr_reader = None  # Using pytesseract directly

        logger.info(
            f"AnalysisRouter initialized with "
            f"text_model_url={self.text_model_url}, "
            f"youtube_model_url={self.youtube_model_url}"
        )

    # ------------------------------------------------------------------ #
    #  Public entry point                                                  #
    # ------------------------------------------------------------------ #

    async def route_analysis(
        self,
        content_type: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Route content to appropriate analysis method.

        Args:
            content_type: 'text' | 'image' | 'url'
            content:      The raw content (text string, base64 image, or URL)
            metadata:     Optional extra metadata

        Returns:
            Normalised analysis result dict
        """
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
            return {
                "status": "error",
                "prediction": "ERROR",
                "confidence": 0.0,
                "details": {"error": str(e)},
            }

    # ------------------------------------------------------------------ #
    #  Text analysis — canonical pipeline used by text AND image routes   #
    # ------------------------------------------------------------------ #

    async def _analyze_text(
        self, text: str, metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Send text to the fact-check model service (port 8081) and return a
        normalised result.  This is the single canonical text pipeline —
        the image route calls this method directly so they always share the
        same code path.
        """
        try:
            logger.info(f"Sending text to model service: {self.text_model_url}")

            response = await self.http_client.post(
                self.text_model_url,
                json={"text": text},
            )
            response.raise_for_status()

            result = response.json()
            logger.info(f"Received response from text model: {result}")

            # Expected shape: {"results": [{"claim": "…", "verdict": "…", "scores": {…}}]}
            if "results" in result and len(result["results"]) > 0:
                first_result = result["results"][0]
                verdict = first_result.get("verdict", "UNKNOWN")
                scores = first_result.get("scores", {})

                return {
                    "status": "success",
                    "prediction": verdict,
                    "confidence": None,   # model provides scores, not a scalar confidence
                    "details": {
                        "content_type": "text",
                        "claims_analyzed": len(result["results"]),
                        "model_scores": scores,
                        "model_response": result,
                    },
                }

            # Unexpected format — surface it clearly
            return {
                "status": "success",
                "prediction": "UNKNOWN",
                "confidence": 0.0,
                "details": {
                    "content_type": "text",
                    "error": "Unexpected response format from text model",
                    "model_response": result,
                },
            }

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error from text model: {e}")
            return self._fallback_response("text", f"HTTP error: {e}")
        except httpx.ReadTimeout:
            logger.error("Timeout from text model")
            return self._fallback_response("text", "Request timeout — model took too long to respond")
        except httpx.ConnectError:
            logger.error("Connection error from text model")
            return self._fallback_response("text", "Connection error — model service unavailable")
        except Exception as e:
            logger.error(f"Text analysis failed: {str(e)}", exc_info=True)
            return self._fallback_response("text", str(e))

    # ------------------------------------------------------------------ #
    #  Image analysis — OCR → text pipeline                               #
    # ------------------------------------------------------------------ #

    async def _analyze_image(
        self, image_content: str, metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        1. Decode base64 → PIL Image
        2. Run Tesseract OCR to extract text
        3. Feed extracted text through _analyze_text (same pipeline as plain text)
        """
        try:
            image = self.image_handler.base64_to_image(image_content)
            logger.info(f"Processing image: size={image.size}, mode={image.mode}")

            # --- Tesseract OCR ---
            try:
                extracted_text = pytesseract.image_to_string(image).strip()
                preview = extracted_text[:100] + "…" if len(extracted_text) > 100 else extracted_text
                logger.info(f"OCR extracted text: {preview}")
            except Exception as ocr_err:
                logger.error(f"Tesseract OCR failed: {ocr_err}")
                return {
                    "status": "success",
                    "prediction": "NEEDS_REVIEW",
                    "confidence": 0.3,
                    "details": {
                        "content_type": "image",
                        "image_size": image.size,
                        "image_mode": image.mode,
                        "error": f"OCR failed: {ocr_err}",
                        "note": "OCR processing failed — manual review needed",
                    },
                }

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
                        "note": "No text found in image",
                    },
                }

            # --- Reuse the canonical text pipeline ---
            text_result = await self._analyze_text(extracted_text, metadata)

            # Enrich the result with image-specific metadata
            text_result["details"]["content_type"] = "image"
            text_result["details"]["image_size"] = image.size
            text_result["details"]["image_mode"] = image.mode
            text_result["details"]["extracted_text"] = extracted_text

            return text_result

        except Exception as e:
            logger.error(f"Image analysis failed: {str(e)}", exc_info=True)
            return self._fallback_response("image", str(e))

    # ------------------------------------------------------------------ #
    #  URL routing                                                         #
    # ------------------------------------------------------------------ #

    async def _analyze_url(
        self, url: str, metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Parse URL platform and dispatch to the appropriate handler."""
        try:
            url_info = self.link_parser.parse_url(url)
            platform = url_info.get("platform", "")

            if platform == "youtube":
                return await self._analyze_youtube_url(url, url_info)
            elif platform == "instagram":
                return await self._analyze_instagram_url(url, url_info)
            else:
                return await self._analyze_general_url(url, url_info)

        except Exception as e:
            logger.error(f"URL analysis failed: {str(e)}", exc_info=True)
            return self._fallback_response("url", str(e))

    # ------------------------------------------------------------------ #
    #  YouTube — calls port-8000 model and maps its response              #
    # ------------------------------------------------------------------ #

    async def _analyze_youtube_url(
        self, url: str, url_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Call the YouTube misinformation model on port 8000.

        Expected response shape from the model:
        {
            "confidence": 0.87,          # float 0-1
            "label": "misinformation",   # or "low_risk", "heavy", etc.
            "risk_level": "high",        # "high" | "low" | "medium" …
            ... any extra fields
        }
        All fields are extracted and surfaced; unknown keys are kept under
        'raw_model_response' so nothing is silently dropped.
        """
        video_id = url_info.get("video_id")
        logger.info(f"YouTube URL analysis requested for video_id={video_id}, url={url}")

        try:
            response = await self.http_client.post(
                self.youtube_model_url,
                json={"url": url, "video_id": video_id},
            )
            response.raise_for_status()
            result = response.json()
            logger.info(f"YouTube model raw response: {result}")

            # Pull out well-known fields; keep everything else in raw
            confidence = result.get("confidence")
            label = result.get("label") or result.get("verdict") or result.get("prediction", "UNKNOWN")
            risk_level = result.get("risk_level") or result.get("risk") or _infer_risk(label, confidence)

            # Normalise label to uppercase for consistency with text pipeline
            prediction = str(label).upper()

            return {
                "status": "success",
                "prediction": prediction,
                "confidence": confidence,
                "details": {
                    "content_type": "youtube_video",
                    "video_id": video_id,
                    "platform": "youtube",
                    "risk_level": risk_level,
                    "url": url,
                    "raw_model_response": result,   # preserve full model output
                },
            }

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error from YouTube model: {e}")
            return self._fallback_response("youtube", f"HTTP error: {e}")
        except httpx.ReadTimeout:
            logger.error("Timeout from YouTube model")
            return self._fallback_response("youtube", "Request timeout — YouTube model too slow")
        except httpx.ConnectError:
            logger.error("Connection error from YouTube model")
            return self._fallback_response("youtube", "Connection error — YouTube model unavailable")
        except Exception as e:
            logger.error(f"YouTube analysis failed: {str(e)}", exc_info=True)
            return self._fallback_response("youtube", str(e))

    # ------------------------------------------------------------------ #
    #  Instagram / general URL — placeholders                             #
    # ------------------------------------------------------------------ #

    async def _analyze_instagram_url(
        self, url: str, url_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Placeholder — integrate Instagram API / scraper here."""
        return {
            "status": "success",
            "prediction": "NEEDS_REVIEW",
            "confidence": 0.5,
            "details": {
                "content_type": "instagram_post",
                "platform": "instagram",
                "note": "Instagram caption analysis — integrate with Instagram API",
            },
        }

    async def _analyze_general_url(
        self, url: str, url_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Placeholder — integrate web scraper + text pipeline here."""
        return {
            "status": "success",
            "prediction": "NEEDS_REVIEW",
            "confidence": 0.5,
            "details": {
                "content_type": "webpage",
                "url": url,
                "domain": url_info.get("domain"),
                "note": "Webpage content analysis — integrate with web scraper",
            },
        }

    # ------------------------------------------------------------------ #
    #  Helpers                                                             #
    # ------------------------------------------------------------------ #

    def _fallback_response(self, content_type: str, error_msg: str) -> Dict[str, Any]:
        """Uniform fallback when any analysis stage fails."""
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


# ------------------------------------------------------------------ #
#  Module-level helper                                                #
# ------------------------------------------------------------------ #

def _infer_risk(label: str, confidence: Optional[float]) -> str:
    """
    Derive a risk level string when the model doesn't return one explicitly.
    Falls back on the label text itself so no information is lost.
    """
    label_lower = str(label).lower()
    if any(w in label_lower for w in ("misinfo", "false", "fake", "heavy", "high")):
        return "high"
    if any(w in label_lower for w in ("low", "safe", "true", "real")):
        return "low"
    if confidence is not None:
        return "high" if confidence >= 0.7 else ("medium" if confidence >= 0.4 else "low")
    return "medium"