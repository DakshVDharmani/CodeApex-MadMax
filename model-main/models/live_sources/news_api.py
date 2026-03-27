import requests
import os
from datetime import datetime, timedelta
from urllib.parse import quote
from config import NEWSAPI_KEY


def extract_search_terms(claim):
    """
    Extract key search terms from a claim for better news API results
    """
    # Remove common stop words and focus on entities/actions
    stop_words = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", 
        "of", "with", "by", "is", "are", "was", "were", "be", "been", "have", 
        "has", "had", "do", "does", "did", "will", "would", "could", "should",
        "may", "might", "can", "this", "that", "these", "those", "continues", 
        "possibly", "soon", "happening"
    }
    
    words = claim.lower().split()
    key_terms = [word for word in words if word not in stop_words and len(word) > 2]
    
    # Prioritize countries, conflicts, important nouns
    priority_terms = []
    other_terms = []
    
    for term in key_terms:
        if any(country in term for country in ["iran", "us", "usa", "america", "israel", "palestine", "uk", "china", "russia", "ukraine"]):
            priority_terms.append(term)
        elif any(action in term for action in ["conflict", "talk", "war", "peace", "negotiation", "summit", "meeting"]):
            priority_terms.append(term)
        else:
            other_terms.append(term)
    
    # Combine priority terms first, then others
    search_terms = priority_terms + other_terms
    
    # Return a few different query combinations
    queries = []
    
    # Single entity queries
    for term in priority_terms[:2]:
        queries.append(term)
    
    # Two-word combinations
    if len(priority_terms) >= 2:
        queries.append(" ".join(priority_terms[:2]))
    
    # Entity + action
    if priority_terms and other_terms:
        queries.append(f"{priority_terms[0]} {other_terms[0]}")
    
    # Fallback to original claim shortened
    if not queries:
        queries.append(" ".join(key_terms[:3]))
    
    return queries[:3]  # Return max 3 different queries


def search_news_api(query, max_results=5):
    """
    Search NewsAPI for current news articles related to the query.
    Returns standardized format compatible with other live sources.
    """
    api_key = NEWSAPI_KEY
    if not api_key or api_key == "your_actual_api_key_here":
        print("Warning: Please set your actual NewsAPI key in config.py")
        return []

    # Try multiple search queries for better results
    search_queries = extract_search_terms(query)
    all_results = []
    
    for search_query in search_queries:
        if len(all_results) >= max_results:
            break
            
        base_url = "https://newsapi.org/v2/everything"
        
        # Search for articles from the last 7 days to get recent news
        from_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        
        params = {
            "q": search_query,
            "apiKey": api_key,
            "from": from_date,
            "sortBy": "relevancy",
            "language": "en",
            "pageSize": min(max_results - len(all_results), 5),
            "domains": ""  # Leave empty to search all sources
        }

        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (compatible; Bluebit-FactChecker/1.0; +https://github.com/example/bluebit)"
            }
            response = requests.get(base_url, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data.get("status") != "ok":
                print(f"NewsAPI error: {data.get('message', 'Unknown error')}")
                continue

            articles = data.get("articles", [])
            
            for article in articles:
                # Calculate authority based on recency and source reputation
                published_at = article.get("publishedAt", "")
                if published_at:
                    try:
                        pub_date = datetime.fromisoformat(published_at.replace('Z', '+00:00'))
                        days_old = (datetime.now(pub_date.tzinfo) - pub_date).days
                        
                        # Authority scoring: very recent news gets higher authority
                        if days_old <= 1:
                            authority = 0.9
                        elif days_old <= 3:
                            authority = 0.85
                        elif days_old <= 7:
                            authority = 0.8
                        else:
                            authority = 0.7
                    except:
                        authority = 0.7
                else:
                    authority = 0.7

                # Extract year from publication date
                year = None
                if published_at:
                    try:
                        year = datetime.fromisoformat(published_at.replace('Z', '+00:00')).year
                    except:
                        pass

                all_results.append({
                    "text": article.get("description", "") or article.get("title", ""),
                    "source": "NewsAPI",
                    "title": article.get("title", ""),
                    "url": article.get("url", ""),
                    "year": year,
                    "authority": authority
                })
                
                if len(all_results) >= max_results:
                    break

        except requests.exceptions.RequestException as e:
            print(f"NewsAPI request failed for query '{search_query}': {e}")
            continue
        except Exception as e:
            print(f"NewsAPI error for query '{search_query}': {e}")
            continue

    return all_results


def search_breaking_news(query, max_results=3):
    """
    Search for very recent breaking news (last 24 hours).
    """
    api_key = NEWSAPI_KEY
    if not api_key or api_key == "your_actual_api_key_here":
        return []

    base_url = "https://newsapi.org/v2/everything"
    
    # Search for articles from the last 24 hours
    from_date = (datetime.now() - timedelta(hours=24)).strftime("%Y-%m-%d")
    
    params = {
        "q": query,
        "apiKey": api_key,
        "from": from_date,
        "sortBy": "publishedAt",
        "language": "en",
        "pageSize": max_results
    }

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; Bluebit-FactChecker/1.0; +https://github.com/example/bluebit)"
        }
        response = requests.get(base_url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data.get("status") != "ok":
            return []

        articles = data.get("articles", [])
        results = []

        for article in articles:
            results.append({
                "text": article.get("description", "") or article.get("title", ""),
                "source": "NewsAPI-Breaking",
                "title": article.get("title", ""),
                "url": article.get("url", ""),
                "year": datetime.now().year,
                "authority": 0.95  # Highest authority for breaking news
            })

        return results

    except Exception as e:
        print(f"Breaking news search failed: {e}")
        return []
