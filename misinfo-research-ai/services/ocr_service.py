"""
OCR Service using PaddleOCR for text extraction from images
"""

import os
import cv2
import numpy as np
try:
    from paddleocr import PaddleOCR
    PADDLE_AVAILABLE = True
except ImportError:
    PADDLE_AVAILABLE = False
    print("⚠️ PaddleOCR not available, using fallback")

from typing import List, Dict, Any
import tempfile

class OCRService:
    def __init__(self):
        """Initialize PaddleOCR"""
        if PADDLE_AVAILABLE:
            try:
                self.ocr = PaddleOCR(use_angle_cls=True, lang='en')
                print("✅ PaddleOCR initialized successfully")
            except Exception as e:
                print(f"❌ Failed to initialize PaddleOCR: {e}")
                self.ocr = None
        else:
            self.ocr = None
            print("⚠️ PaddleOCR not available, OCR functions will return empty strings")
    
    def extract_text_from_image(self, image_path: str) -> str:
        """
        Extract text from a single image using PaddleOCR
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Extracted text as a string
        """
        if not self.ocr:
            print("❌ OCR not available")
            return ""
        
        try:
            # Read image
            img = cv2.imread(image_path)
            if img is None:
                print(f"❌ Could not read image: {image_path}")
                return ""
            
            # Perform OCR
            result = self.ocr.ocr(img, cls=True)
            
            # Extract text from OCR result
            texts = []
            if result and len(result) > 0 and result[0]:
                for line in result[0]:
                    if line and len(line) >= 2:
                        texts.append(line[1][0])  # Extract the text part
            
            extracted_text = " ".join(texts)
            print(f"📸 OCR extracted {len(texts)} text lines from image")
            return extracted_text.strip()
            
        except Exception as e:
            print(f"❌ Error extracting text from image {image_path}: {e}")
            return ""
    
    def extract_text_from_video_frames(self, video_path: str, frames_per_second: int = 1) -> str:
        """
        Extract text from video frames using OCR
        
        Args:
            video_path: Path to the video file
            frames_per_second: Number of frames to extract per second
            
        Returns:
            Combined text from all frames
        """
        if not self.ocr:
            print("❌ OCR not available for video processing")
            return ""
        
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                print(f"❌ Could not open video: {video_path}")
                return ""
            
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_interval = int(fps / frames_per_second)
            
            all_texts = []
            frame_count = 0
            extracted_texts = set()  # For deduplication
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Extract frame at specified interval
                if frame_count % frame_interval == 0:
                    try:
                        result = self.ocr.ocr(frame, cls=True)
                        
                        if result and len(result) > 0 and result[0]:
                            frame_texts = []
                            for line in result[0]:
                                if line and len(line) >= 2:
                                    text = line[1][0].strip().lower()
                                    if text and len(text) > 3:  # Filter very short texts
                                        frame_texts.append(text)
                            
                            # Add new unique texts
                            for text in frame_texts:
                                if text not in extracted_texts:
                                    extracted_texts.add(text)
                                    all_texts.append(text)
                    
                    except Exception as e:
                        print(f"⚠️ Error processing frame {frame_count}: {e}")
                
                frame_count += 1
            
            cap.release()
            
            combined_text = " ".join(all_texts)
            print(f"🎥 OCR processed {frame_count} frames, extracted {len(all_texts)} unique text segments")
            return combined_text
            
        except Exception as e:
            print(f"❌ Error extracting text from video {video_path}: {e}")
            return ""
    
    def cleanup_temp_files(self, temp_dir: str):
        """Clean up temporary files"""
        try:
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception as e:
            print(f"⚠️ Error cleaning up temp files: {e}")

# Singleton instance
ocr_service = OCRService()

def extract_text_from_image(image_path: str) -> str:
    """Convenience function to extract text from image"""
    return ocr_service.extract_text_from_image(image_path)

def extract_text_from_video_frames(video_path: str, frames_per_second: int = 1) -> str:
    """Convenience function to extract text from video frames"""
    return ocr_service.extract_text_from_video_frames(video_path, frames_per_second)
