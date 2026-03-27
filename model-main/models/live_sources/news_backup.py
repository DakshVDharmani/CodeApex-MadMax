import requests
import json
from datetime import datetime, timedelta
from config import NEWSAPI_KEY


def search_gnews_backup(query, max_results=5):
    """
    Backup news search using GNews API (alternative to NewsAPI)
    GNews has more lenient CORS policies and a good free tier.
    """
    # You can get a free GNews API key from https://gnews.io/
    # For now, we'll use their demo endpoint or you can add GNEWS_API_KEY to config
    
    try:
        # Using public RSS feeds as fallback
        rss_feeds = [
            "https://rss.cnn.com/rss/edition.rss",
            "https://feeds.bbci.co.uk/news/rss.xml",
            "https://feeds.reuters.com/reuters/topNews"
        ]
        
        all_articles = []
        
        for feed_url in rss_feeds:
            try:
                response = requests.get(feed_url, timeout=5)
                response.raise_for_status()
                
                # Parse RSS (simplified - you might want to use feedparser)
                import xml.etree.ElementTree as ET
                root = ET.fromstring(response.content)
                
                items = root.findall('.//item')[:max_results]
                for item in items:
                    title = item.find('title').text if item.find('title') is not None else ""
                    description = item.find('description').text if item.find('description') is not None else ""
                    link = item.find('link').text if item.find('link') is not None else ""
                    
                    if query.lower() in title.lower() or query.lower() in description.lower():
                        all_articles.append({
                            "text": description or title,
                            "source": "RSS-News",
                            "title": title,
                            "url": link,
                            "year": datetime.now().year,
                            "authority": 0.7
                        })
                        
                        if len(all_articles) >= max_results:
                            break
                            
                if len(all_articles) >= max_results:
                    break
                    
            except Exception as e:
                print(f"RSS feed {feed_url} failed: {e}")
                continue
        
        return all_articles[:max_results]
        
    except Exception as e:
        print(f"Backup news search failed: {e}")
        return []


def search_news_with_fallback(query, max_results=5):
    """
    Try NewsAPI first, then fallback to RSS feeds
    """
    # First try NewsAPI
    from .news_api import search_news_api
    results = search_news_api(query, max_results)
    
    # If NewsAPI fails, use RSS fallback
    if not results:
        print("NewsAPI failed, using RSS fallback...")
        results = search_gnews_backup(query, max_results)
    
    return results
