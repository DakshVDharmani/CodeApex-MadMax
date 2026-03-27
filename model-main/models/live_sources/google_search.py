import requests
import json
from bs4 import BeautifulSoup
from urllib.parse import quote
from config import NEWSAPI_KEY


def search_google_for_claim(claim, max_results=3):
    """
    Search Google for the claim and return top results
    """
    # Extract key terms from claim
    claim_words = claim.lower().split()
    key_terms = [word for word in claim_words if len(word) > 3][:4]  # First 4 meaningful words
    
    # Try different queries
    queries = [
        quote(' '.join(key_terms)),  # Key terms only
        quote(claim)                  # Full claim
    ]
    
    all_results = []
    
    for query in queries:
        if len(all_results) >= max_results:
            break
            
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (compatible; FactChecker/1.0)"
            }
            
            url = f"https://duckduckgo.com/html/?q={query}"
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, "html.parser")
            
            # Get top results
            for result in soup.select(".result")[:max_results]:
                title_elem = result.select_one(".result__a")
                snippet_elem = result.select_one(".result__snippet")
                
                if title_elem and snippet_elem:
                    title = title_elem.text.strip()
                    url = title_elem.get("href", "")
                    snippet = snippet_elem.text.strip()
                    
                    # Very relaxed filtering - just check if any key term appears
                    text_to_check = (title + " " + snippet).lower()
                    if any(term in text_to_check for term in key_terms):
                        all_results.append({
                            "text": snippet,
                            "source": "Google-Search",
                            "title": title,
                            "url": url,
                            "year": None,
                            "authority": 0.8
                        })
                        
                        if len(all_results) >= max_results:
                            break
            
        except Exception as e:
            print(f"Google search failed for query '{query}': {e}")
            continue
    
    return all_results


def verify_news_claim_with_google(claim):
    """
    Simple news verification using Google search
    """
    print(f"[GOOGLE SEARCH] Searching: '{claim}'")
    
    # Search for exact claim
    results = search_google_for_claim(claim, max_results=3)
    
    if not results:
        print("[GOOGLE SEARCH] No relevant results found")
        return []
    
    print(f"[GOOGLE SEARCH] Found {len(results)} relevant results:")
    for i, result in enumerate(results, 1):
        print(f"  {i}. {result['title'][:60]}...")
        print(f"     {result['text'][:80]}...")
    
    return results


def is_news_claim(claim):
    """
    Quick check if this is a news/current events claim
    """
    news_keywords = [
        "conflict", "talks", "blocked", "spikes", "economic", "political",
        "election", "protest", "summit", "negotiations", "diplomatic", 
        "government", "officials", "announced", "military", "sanctions",
        "strait", "oil", "price", "market", "war", "peace"
    ]
    
    claim_lower = claim.lower()
    return any(keyword in claim_lower for keyword in news_keywords)
