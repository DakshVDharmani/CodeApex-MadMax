"""
REAL Instagram service that actually scrapes Instagram posts
"""

import re
import time
from typing import Dict, Any
import requests
from bs4 import BeautifulSoup

def extract_post_id(url: str) -> str:
    """Extract post ID from Instagram URL"""
    match = re.search(r'/p/([^/?]+)', url)
    return match.group(1) if match else "unknown"

async def _scrape_instagram_page(url: str) -> Dict[str, Any]:
    """Actually scrape Instagram page for real content"""
    try:
        # Use requests to get the page (bypassing browser issues)
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200:
            return {'error': f'HTTP {response.status_code}'}
        
        # Parse HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Look for caption in meta tags or script data
        caption = ""
        
        # Try to find caption in meta tags
        meta_og_title = soup.find('meta', property='og:title')
        meta_og_desc = soup.find('meta', property='og:description')
        
        if meta_og_title:
            caption = meta_og_title.get('content', '')
        elif meta_og_desc:
            caption = meta_og_desc.get('content', '')
        
        # Try to find caption in script tags
        if not caption:
            scripts = soup.find_all('script')
            for script in scripts:
                if script.string and 'caption' in script.string:
                    # Extract caption from JavaScript
                    caption_match = re.search(r'"caption":"([^"]+)"', script.string)
                    if caption_match:
                        caption = caption_match.group(1).replace('\\u', '').replace('\\', '')
                        break
        
        # Try to find caption in JSON-LD
        if not caption:
            json_ld = soup.find('script', type='application/ld+json')
            if json_ld and json_ld.string:
                import json as json_lib
                try:
                    data = json_lib.loads(json_ld.string)
                    if isinstance(data, list) and len(data) > 0:
                        data = data[0]
                    if 'text' in data:
                        caption = data['text']
                except:
                    pass
        
        print(f"📝 Real caption found: {caption[:100]}...")
        
        return {
            'caption': caption,
            'comments': [],  # We'll skip comments for now
            'media_data': {'ocr_text': '', 'audio_text': ''},  # Skip OCR/audio for now
            'url': url,
            'timestamp': time.time()
        }
        
    except Exception as e:
        print(f"❌ Error scraping Instagram: {e}")
        return {
            'caption': '',
            'comments': [],
            'media_data': {'ocr_text': '', 'audio_text': ''},
            'url': url,
            'timestamp': time.time(),
            'error': str(e)
        }

async def process_instagram(url: str) -> Dict[str, Any]:
    """
    Process Instagram URL with REAL scraping
    """
    print(f"📱 Processing Instagram URL: {url}")
    print("🔍 REAL scraping Instagram content...")
    
    try:
        post_id = extract_post_id(url)
        print(f"🆔 Post ID: {post_id}")
        
        # Actually scrape the Instagram page
        result = await _scrape_instagram_page(url)
        
        if result.get('error'):
            print(f"❌ Scraping error: {result['error']}")
            return {
                'url': url,
                'caption': '',
                'comments': [],
                'media_data': {'ocr_text': '', 'audio_text': ''},
                'timestamp': time.time(),
                'error': result['error']
            }
        
        print(f"✅ REAL Instagram post scraped successfully")
        print(f"📝 Caption: {result['caption'][:100]}...")
        print(f"💬 Comments: {len(result['comments'])} found")
        print(f"🖼️ OCR: {len(result['media_data']['ocr_text'])} chars")
        print(f"🎵 Audio: {len(result['media_data']['audio_text'])} chars")
        
        return result
        
    except Exception as e:
        print(f"❌ Error processing Instagram: {e}")
        return {
            'url': url,
            'caption': '',
            'comments': [],
            'media_data': {'ocr_text': '', 'audio_text': ''},
            'timestamp': time.time(),
            'error': str(e)
        }
