"""
Link Parser Utility
Extracts information from URLs and determines platform
"""

import re
import logging
from typing import Dict, Any, Optional
from urllib.parse import urlparse, parse_qs

logger = logging.getLogger(__name__)


class LinkParser:
    """Utility class for parsing and analyzing URLs"""
    
    def __init__(self):
        # YouTube URL patterns
        self.youtube_patterns = [
            r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})',
            r'(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})',
            r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})',
            r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})'
        ]
        
        # Instagram URL patterns
        self.instagram_patterns = [
            r'(?:https?:\/\/)?(?:www\.)?instagram\.com\/p\/([a-zA-Z0-9_-]+)',
            r'(?:https?:\/\/)?(?:www\.)?instagram\.com\/reel\/([a-zA-Z0-9_-]+)',
            r'(?:https?:\/\/)?(?:www\.)?instagr\.am\/p\/([a-zA-Z0-9_-]+)',
            r'(?:https?:\/\/)?(?:www\.)?instagr\.am\/reel\/([a-zA-Z0-9_-]+)'
        ]
        
        # Social media domains
        self.social_domains = {
            'twitter.com': 'twitter',
            'x.com': 'twitter',
            'facebook.com': 'facebook',
            'tiktok.com': 'tiktok',
            'linkedin.com': 'linkedin',
            'reddit.com': 'reddit'
        }
        
        # News domains (example list - expand as needed)
        self.news_domains = {
            'cnn.com': 'news',
            'bbc.com': 'news',
            'reuters.com': 'news',
            'apnews.com': 'news',
            'npr.org': 'news',
            'washingtonpost.com': 'news',
            'nytimes.com': 'news',
            'theguardian.com': 'news'
        }
    
    def parse_url(self, url: str) -> Dict[str, Any]:
        """
        Parse URL and extract platform-specific information
        
        Args:
            url: URL to parse
            
        Returns:
            Dictionary containing parsed information
        """
        try:
            # Clean and normalize URL
            url = url.strip()
            if not url.startswith(('http://', 'https://')):
                url = 'https://' + url
            
            # Parse URL components
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            
            # Remove www. prefix
            if domain.startswith('www.'):
                domain = domain[4:]
            
            result = {
                'original_url': url,
                'domain': domain,
                'platform': 'general',
                'path': parsed.path,
                'query_params': parse_qs(parsed.query),
                'is_secure': parsed.scheme == 'https'
            }
            
            # Check YouTube URLs
            youtube_info = self._parse_youtube(url)
            if youtube_info:
                result.update(youtube_info)
                result['platform'] = 'youtube'
                return result
            
            # Check Instagram URLs
            instagram_info = self._parse_instagram(url)
            if instagram_info:
                result.update(instagram_info)
                result['platform'] = 'instagram'
                return result
            
            # Check social media
            if domain in self.social_domains:
                result['platform'] = self.social_domains[domain]
                return result
            
            # Check news sites
            if domain in self.news_domains:
                result['platform'] = 'news'
                return result
            
            return result
            
        except Exception as e:
            logger.error(f"URL parsing failed for {url}: {str(e)}")
            return {
                'original_url': url,
                'platform': 'unknown',
                'error': str(e)
            }
    
    def _parse_youtube(self, url: str) -> Optional[Dict[str, Any]]:
        """Parse YouTube URL and extract video ID"""
        for pattern in self.youtube_patterns:
            match = re.search(pattern, url)
            if match:
                video_id = match.group(1)
                return {
                    'video_id': video_id,
                    'video_url': f'https://www.youtube.com/watch?v={video_id}',
                    'embed_url': f'https://www.youtube.com/embed/{video_id}',
                    'thumbnail_url': f'https://img.youtube.com/vi/{video_id}/maxresdefault.jpg'
                }
        return None
    
    def _parse_instagram(self, url: str) -> Optional[Dict[str, Any]]:
        """Parse Instagram URL and extract post/reel ID"""
        for pattern in self.instagram_patterns:
            match = re.search(pattern, url)
            if match:
                post_id = match.group(1)
                return {
                    'post_id': post_id,
                    'post_url': f'https://www.instagram.com/p/{post_id}/',
                    'embed_url': f'https://www.instagram.com/p/{post_id}/embed'
                }
        return None
    
    def is_valid_url(self, url: str) -> bool:
        """Check if URL is valid"""
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except:
            return False
    
    def extract_domain(self, url: str) -> str:
        """Extract domain from URL"""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            if domain.startswith('www.'):
                domain = domain[4:]
            return domain
        except:
            return ''
    
    def is_social_media(self, url: str) -> bool:
        """Check if URL is from a social media platform"""
        domain = self.extract_domain(url)
        return domain in self.social_domains or domain in ['instagram.com', 'youtube.com']
    
    def is_news_site(self, url: str) -> bool:
        """Check if URL is from a news site"""
        domain = self.extract_domain(url)
        return domain in self.news_domains
