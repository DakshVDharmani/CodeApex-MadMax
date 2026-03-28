"""
Facebook Service for scraping Facebook posts using Playwright
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

class FacebookService:
    def __init__(self):
        """Initialize Facebook service"""
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
            
            # Set viewport
            await self.page.set_viewport_size({'width': 1366, 'height': 768})
            
            print("✅ Facebook browser initialized")
            
        except Exception as e:
            print(f"❌ Failed to initialize Facebook browser: {e}")
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
            print("✅ Facebook browser closed")
        except Exception as e:
            print(f"⚠️ Error closing browser: {e}")
    
    async def extract_post_data(self, url: str) -> Dict[str, Any]:
        """
        Extract data from Facebook post
        
        Args:
            url: Facebook post URL
            
        Returns:
            Dictionary containing post data
        """
        try:
            print(f"📘 Processing Facebook URL: {url}")
            
            # Navigate to the Facebook post
            await self.page.goto(url, wait_until='networkidle')
            await asyncio.sleep(5)  # Wait for dynamic content to load
            
            # Try to bypass login wall
            await self._bypass_login_wall()
            
            # Extract post text
            post_text = await self._extract_post_text()
            
            # Extract comments
            comments = await self._extract_comments()
            
            # Download and process media
            media_data = await self._download_and_process_media()
            
            post_data = {
                'url': url,
                'post_text': post_text,
                'comments': comments,
                'media_data': media_data,
                'timestamp': time.time()
            }
            
            print(f"✅ Facebook post extracted successfully")
            return post_data
            
        except Exception as e:
            print(f"❌ Error extracting Facebook post: {e}")
            return {
                'url': url,
                'post_text': '',
                'comments': [],
                'media_data': {'ocr_text': '', 'audio_text': ''},
                'timestamp': time.time(),
                'error': str(e)
            }
    
    async def _bypass_login_wall(self):
        """Try to bypass Facebook login wall"""
        try:
            # Try to close any login popups
            close_selectors = [
                '[aria-label="Close"]',
                '[data-testid="dialog-close"]',
                'button[aria-label="Close"]',
                '.x9f619.x1n2onr.x1ja2u2z',
            ]
            
            for selector in close_selectors:
                try:
                    close_button = await self.page.query_selector(selector)
                    if close_button:
                        await close_button.click()
                        await asyncio.sleep(1)
                except:
                    continue
            
            # Try to scroll to load content
            await self.page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
            await asyncio.sleep(2)
            
        except Exception as e:
            print(f"⚠️ Error bypassing login wall: {e}")
    
    async def _extract_post_text(self) -> str:
        """Extract post text/content"""
        try:
            # Try multiple selectors for post content
            text_selectors = [
                '[data-testid="post_message"]',
                '.x1lliihq.x193iq5w.xh8yej3.x1n2onr6',
                '.x1i10hfl.xjbqb8w.x6ikm8r.x10wlt62.x1h911qt.x1ypdohk.x78zum5.xdt5ytf',
                'div[data-text]',
                '.userContent',
                'p',
            ]
            
            for selector in text_selectors:
                try:
                    element = await self.page.wait_for_selector(selector, timeout=5000)
                    if element:
                        text = await element.inner_text()
                        if text and len(text.strip()) > 10:  # Filter very short texts
                            print(f"📝 Post text found: {len(text)} characters")
                            return text.strip()
                except:
                    continue
            
            print("⚠️ No post text found")
            return ""
            
        except Exception as e:
            print(f"⚠️ Error extracting post text: {e}")
            return ""
    
    async def _extract_comments(self) -> List[str]:
        """Extract visible comments"""
        try:
            comments = []
            
            # Try to load more comments
            try:
                # Look for "More comments" or "View more comments" buttons
                more_comments_selectors = [
                    '[aria-label="See more comments"]',
                    '[data-testid="UFI2CommentsPagerRenderer/pager"]',
                    '.x1i10hfl.xjbqb8w.x6ikm8r.x10wlt62',
                    'a[href*="comment"]',
                ]
                
                for selector in more_comments_selectors:
                    try:
                        more_button = await self.page.query_selector(selector)
                        if more_button:
                            await more_button.click()
                            await asyncio.sleep(2)
                    except:
                        continue
            except:
                pass
            
            # Extract comments using multiple selectors
            comment_selectors = [
                '[data-testid="UFI2Comment/body"]',
                '.x1lliihq.x193iq5w.xh8yej3.x1n2onr6 span',
                '.x1i10hfl.xjbqb8w.x6ikm8r.x10wlt62 span',
                '.comment_content span',
                'div[role="article"] span',
            ]
            
            for selector in comment_selectors:
                try:
                    comment_elements = await self.page.query_selector_all(selector)
                    for element in comment_elements[:30]:  # Limit to first 30 comments
                        try:
                            comment_text = await element.inner_text()
                            if comment_text and len(comment_text.strip()) > 5:
                                # Filter out common non-comment text
                                if not any(word in comment_text.lower() for word in ['like', 'share', 'reply', 'see more']):
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
    
    async def _download_and_process_media(self) -> Dict[str, str]:
        """Download media (images/videos) and extract text using OCR and audio processing"""
        try:
            ocr_text = ""
            audio_text = ""
            
            # Find media elements
            image_selectors = [
                'img[data-testid="feed_photo"]',
                'img[src*="scontent"]',
                'img[alt*="Image"]',
                'img[src*="facebook.com"]',
            ]
            
            video_selectors = [
                'video[data-testid="video"]',
                'video[src*="scontent"]',
                'video[src*="facebook.com"]',
                'video',
            ]
            
            # Process images
            for selector in image_selectors:
                try:
                    images = await self.page.query_selector_all(selector)
                    for img in images:
                        try:
                            src = await img.get_attribute('src')
                            if src and ('scontent' in src or 'facebook.com' in src):
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
                            if src and ('scontent' in src or 'facebook.com' in src):
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
            print(f"⚠️ Error processing Facebook media: {e}")
            return {'ocr_text': '', 'audio_text': ''}
    
    async def _download_image(self, url: str) -> Optional[str]:
        """Download image from URL"""
        try:
            # Add higher resolution parameters if possible
            if 'scontent' in url:
                url = url.split('?')[0]  # Remove query parameters
            
            response = requests.get(url, stream=True, timeout=30)
            if response.status_code == 200:
                # Create temporary file
                with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
                    for chunk in response.iter_content(chunk_size=8192):
                        temp_file.write(chunk)
                    return temp_file.name
        except Exception as e:
            print(f"⚠️ Error downloading Facebook image: {e}")
            return None
    
    async def _download_video(self, url: str) -> Optional[str]:
        """Download video from URL"""
        try:
            # Clean URL
            if 'scontent' in url:
                url = url.split('?')[0]
            
            response = requests.get(url, stream=True, timeout=60)
            if response.status_code == 200:
                # Create temporary file
                with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as temp_file:
                    for chunk in response.iter_content(chunk_size=8192):
                        temp_file.write(chunk)
                    return temp_file.name
        except Exception as e:
            print(f"⚠️ Error downloading Facebook video: {e}")
            return None

async def process_facebook(url: str) -> Dict[str, Any]:
    """
    Main function to process Facebook URL
    
    Args:
        url: Facebook post URL
        
    Returns:
        Dictionary containing extracted data
    """
    async with FacebookService() as service:
        return await service.extract_post_data(url)
