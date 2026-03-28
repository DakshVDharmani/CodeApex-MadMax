"""
Instagram Service for scraping Instagram posts using Playwright
"""

import os
import asyncio
import tempfile
import re
from typing import Dict, List, Optional, Any
from playwright.async_api import async_playwright, Browser, Page
import requests
import time

from .ocr_service import extract_text_from_image, extract_text_from_video_frames
from .audio_service import process_video_audio

class InstagramService:
    def __init__(self):
        """Initialize Instagram service"""
        self.browser = None
        self.page = None
    
    async def __aenter__(self):
        """Async context manager entry"""
        await self.init_browser()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close_browser()
    
    async def init_browser(self):
        """Initialize Playwright browser"""
        try:
            self.playwright = await async_playwright().start()
            # Launch browser with minimal settings
            self.browser = await self.playwright.chromium.launch(headless=True)
            
            # Create new page
            self.page = await self.browser.new_page()
            await self.page.set_extra_http_headers({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            })
            
            print("✅ Instagram browser initialized")
            
        except Exception as e:
            print(f"❌ Failed to initialize Instagram browser: {e}")
            raise
    
    async def close_browser(self):
        """Close browser and cleanup"""
        try:
            if self.page:
                await self.page.close()
            if self.browser:
                await self.browser.close()
            if hasattr(self, 'playwright'):
                await self.playwright.stop()
            print("✅ Instagram browser closed")
        except Exception as e:
            print(f"⚠️ Error closing browser: {e}")
    
    async def extract_post_data(self, url: str) -> Dict[str, Any]:
        """
        Extract data from Instagram post
        
        Args:
            url: Instagram post URL
            
        Returns:
            Dictionary containing post data
        """
        try:
            print(f"📱 Processing Instagram URL: {url}")
            
            # Navigate to the Instagram post
            await self.page.goto(url, wait_until='networkidle')
            await asyncio.sleep(3)  # Wait for dynamic content
            
            # Try to find main content - don't wait for article selector
            # Instead, directly try to extract content
            print("🔍 Looking for Instagram content...")
            
            # Extract caption
            caption = await self._extract_caption()
            
            # Extract comments
            comments = await self._extract_comments()
            
            # Download and process media
            media_data = await self._download_and_process_media(url)
            
            post_data = {
                'url': url,
                'caption': caption,
                'comments': comments,
                'media_data': media_data,
                'timestamp': time.time()
            }
            
            print(f"✅ Instagram post extracted successfully")
            return post_data
            
        except Exception as e:
            print(f"❌ Error extracting Instagram post: {e}")
            return {
                'url': url,
                'caption': '',
                'comments': [],
                'media_data': {'ocr_text': '', 'audio_text': ''},
                'timestamp': time.time(),
                'error': str(e)
            }
    
    async def _extract_caption(self) -> str:
        """Extract post caption"""
        try:
            # Try multiple selectors for caption
            caption_selectors = [
                'div[data-testid="post-caption"]',
                'h1._aacl._aaco._aacu._aacx._aacy._aad6._aade',
                'span._aacl._aaco._aacu._aacx._aacy._aad6._aade',
                'div[class*="caption"]',
                'h1',
            ]
            
            for selector in caption_selectors:
                try:
                    element = await self.page.wait_for_selector(selector, timeout=5000)
                    if element:
                        caption = await element.inner_text()
                        if caption and len(caption.strip()) > 0:
                            print(f"📝 Caption found: {len(caption)} characters")
                            return caption.strip()
                except:
                    continue
            
            print("⚠️ No caption found")
            return ""
            
        except Exception as e:
            print(f"⚠️ Error extracting caption: {e}")
            return ""
    
    async def _extract_comments(self) -> List[str]:
        """Extract visible comments"""
        try:
            comments = []
            
            # Try to load more comments
            try:
                load_more_button = await self.page.query_selector('button._acan._acap._acat._acau._acav._acaw._acax._acaz._acb_._aca_._acb0._acb1._acb2')
                if load_more_button:
                    await load_more_button.click()
                    await asyncio.sleep(2)
            except:
                pass
            
            # Extract comments using multiple selectors
            comment_selectors = [
                'ul._aa5k._aa5l._aa5m._aa5n._aa5o._aa5p._aa5q._aa5r._aa5s._aa5t li div span',
                'div[data-testid="comment-item"] span',
                'li[class*="comment"] span',
            ]
            
            for selector in comment_selectors:
                try:
                    comment_elements = await self.page.query_selector_all(selector)
                    for element in comment_elements[:20]:  # Limit to first 20 comments
                        try:
                            comment_text = await element.inner_text()
                            if comment_text and len(comment_text.strip()) > 5:
                                comments.append(comment_text.strip())
                        except:
                            continue
                    
                    if comments:
                        break
                except:
                    continue
            
            print(f"💬 Comments extracted: {len(comments)}")
            return comments
            
        except Exception as e:
            print(f"⚠️ Error extracting comments: {e}")
            return []
    
    async def _download_and_process_media(self, url: str) -> Dict[str, str]:
        """Download media (images/videos) and extract text using OCR and audio processing"""
        try:
            ocr_text = ""
            audio_text = ""
            
            # Find media elements
            image_selectors = [
                'img[data-testid="post-image"]',
                'img[src*="cdninstagram.com"]',
                'img[alt*="Photo"]',
                'img',
            ]
            
            video_selectors = [
                'video[data-testid="post-video"]',
                'video[src*="cdninstagram.com"]',
                'video',
            ]
            
            # Process images
            for selector in image_selectors:
                try:
                    images = await self.page.query_selector_all(selector)
                    for img in images:
                        try:
                            src = await img.get_attribute('src')
                            if src and 'cdninstagram.com' in src:
                                # Download image
                                image_path = await self._download_image(src)
                                if image_path:
                                    # Extract text using OCR
                                    text = extract_text_from_image(image_path)
                                    ocr_text += f" {text}"
                                    # Clean up
                                    os.unlink(image_path)
                        except:
                            continue
                    if ocr_text:
                        break
                except:
                    continue
            
            # Process videos
            for selector in video_selectors:
                try:
                    videos = await self.page.query_selector_all(selector)
                    for video in videos:
                        try:
                            src = await video.get_attribute('src')
                            if src and 'cdninstagram.com' in src:
                                # Download video
                                video_path = await self._download_video(src)
                                if video_path:
                                    # Extract text using OCR on frames
                                    ocr_result = extract_text_from_video_frames(video_path)
                                    ocr_text += f" {ocr_result}"
                                    
                                    # Extract audio and transcribe
                                    audio_result = process_video_audio(video_path)
                                    audio_text += f" {audio_result}"
                                    
                                    # Clean up
                                    os.unlink(video_path)
                        except:
                            continue
                    if ocr_text or audio_text:
                        break
                except:
                    continue
            
            print(f"🖼️ OCR text: {len(ocr_text)} characters")
            print(f"🎤 Audio text: {len(audio_text)} characters")
            
            return {
                'ocr_text': ocr_text.strip(),
                'audio_text': audio_text.strip()
            }
            
        except Exception as e:
            print(f"⚠️ Error processing media: {e}")
            return {'ocr_text': '', 'audio_text': ''}
    
    async def _download_image(self, url: str) -> Optional[str]:
        """Download image from URL"""
        try:
            response = requests.get(url, stream=True, timeout=30)
            if response.status_code == 200:
                # Create temporary file
                with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
                    for chunk in response.iter_content(chunk_size=8192):
                        temp_file.write(chunk)
                    return temp_file.name
        except Exception as e:
            print(f"⚠️ Error downloading image: {e}")
            return None
    
    async def _download_video(self, url: str) -> Optional[str]:
        """Download video from URL"""
        try:
            response = requests.get(url, stream=True, timeout=60)
            if response.status_code == 200:
                # Create temporary file
                with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as temp_file:
                    for chunk in response.iter_content(chunk_size=8192):
                        temp_file.write(chunk)
                    return temp_file.name
        except Exception as e:
            print(f"⚠️ Error downloading video: {e}")
            return None

async def process_instagram(url: str) -> Dict[str, Any]:
    """
    Main function to process Instagram URL
    
    Args:
        url: Instagram post URL
        
    Returns:
        Dictionary containing extracted data
    """
    async with InstagramService() as service:
        return await service.extract_post_data(url)
