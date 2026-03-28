"""
RAG Truth Analyzer — Maximum Accuracy Edition
- Multi-source retrieval: Semantic Scholar, PubMed, Wikipedia, OpenAlex, arXiv
- BART-large-mnli NLI with temperature-calibrated softmax
- Structured, evidence-backed explanations with citations
- Harm-weighted risk scoring with domain classification
"""

import torch
from transformers import BartForSequenceClassification, BartTokenizer
import numpy as np
import re
import requests
import json
import hashlib
import time
import urllib.parse
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime


# ─────────────────────────────────────────────
# Data Structures
# ─────────────────────────────────────────────

@dataclass
class EvidenceItem:
    title: str
    url: str
    year: int
    source_name: str
    authority_score: float
    snippet: str
    raw_text: str
    authors: List[str]
    venue: str
    doi: Optional[str] = None
    abstract: Optional[str] = None


# ─────────────────────────────────────────────
# Multi-Source Evidence Retrieval
# ─────────────────────────────────────────────

class MultiSourceRetriever:
    """Fetches high-quality evidence from Semantic Scholar, PubMed, Wikipedia, OpenAlex, arXiv"""

    AUTHORITY = {
        "nature": 0.98, "science": 0.97, "cell": 0.96,
        "nejm": 0.95, "lancet": 0.95, "pnas": 0.94,
        "jama": 0.94, "bmj": 0.93, "acs": 0.91,
        "arxiv": 0.88, "pubmed": 0.91,
        "nasa": 0.98, "noaa": 0.97, "esa": 0.97,
        "usgs": 0.95, "who": 0.96, "cdc": 0.95,
        "nih": 0.96, "nist": 0.95,
        "wikipedia": 0.60, "openalex": 0.72,
        "semanticscholar": 0.82,
    }

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "MisinfoResearchAI/2.0 (academic fact-checking; contact@research.edu)"
        })
        self.cache: Dict[str, List[EvidenceItem]] = {}
        self.timeout = 4  # seconds per request

    # ── Semantic Scholar ──────────────────────
    def search_semantic_scholar(self, query: str, limit: int = 8) -> List[EvidenceItem]:
        try:
            url = "https://api.semanticscholar.org/graph/v1/paper/search"
            params = {
                "query": query,
                "limit": limit,
                "fields": "title,abstract,year,authors,venue,externalIds,url,citationCount"
            }
            r = self.session.get(url, params=params, timeout=self.timeout)
            r.raise_for_status()
            items = []
            for p in r.json().get("data", []):
                venue = p.get("venue") or "Unknown"
                authority = self._score_venue(venue)
                # Boost highly-cited papers
                citations = p.get("citationCount", 0) or 0
                if citations > 500:
                    authority = min(0.99, authority + 0.05)
                abstract = p.get("abstract") or ""
                items.append(EvidenceItem(
                    title=p.get("title", ""),
                    url=p.get("url") or f"https://www.semanticscholar.org/paper/{p.get('paperId','')}",
                    year=p.get("year") or 0,
                    source_name="Semantic Scholar",
                    authority_score=authority,
                    snippet=abstract[:400] if abstract else p.get("title", ""),
                    raw_text=abstract or p.get("title", ""),
                    authors=[a.get("name", "") for a in (p.get("authors") or [])[:4]],
                    venue=venue,
                    doi=(p.get("externalIds") or {}).get("DOI"),
                ))
            return items
        except Exception as e:
            print(f"[SemanticScholar] {e}")
            return []

    # ── PubMed / NCBI ─────────────────────────
    def search_pubmed(self, query: str, limit: int = 6) -> List[EvidenceItem]:
        try:
            # Step 1: search for IDs
            search_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
            params = {"db": "pubmed", "term": query, "retmax": limit, "retmode": "json"}
            r = self.session.get(search_url, params=params, timeout=self.timeout)
            r.raise_for_status()
            ids = r.json().get("esearchresult", {}).get("idlist", [])
            if not ids:
                return []

            # Step 2: fetch summaries
            fetch_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
            params2 = {"db": "pubmed", "id": ",".join(ids), "retmode": "json"}
            r2 = self.session.get(fetch_url, params=params2, timeout=self.timeout)
            r2.raise_for_status()
            result = r2.json().get("result", {})

            items = []
            for uid in ids:
                doc = result.get(uid, {})
                title = doc.get("title", "")
                source = doc.get("source", "PubMed")
                year_raw = doc.get("pubdate", "")
                year = int(year_raw[:4]) if year_raw and year_raw[:4].isdigit() else 0
                authors = [a.get("name", "") for a in (doc.get("authors") or [])[:4]]
                items.append(EvidenceItem(
                    title=title,
                    url=f"https://pubmed.ncbi.nlm.nih.gov/{uid}/",
                    year=year,
                    source_name="PubMed",
                    authority_score=self._score_venue(source, base=0.91),
                    snippet=title,
                    raw_text=title,
                    authors=authors,
                    venue=source,
                ))
            return items
        except Exception as e:
            print(f"[PubMed] {e}")
            return []

    # ── Wikipedia ─────────────────────────────
    def search_wikipedia(self, query: str, limit: int = 3) -> List[EvidenceItem]:
        try:
            url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + urllib.parse.quote(query)
            r = self.session.get(url, timeout=self.timeout)
            if r.status_code == 200:
                data = r.json()
                extract = data.get("extract", "")
                return [EvidenceItem(
                    title=data.get("title", query),
                    url=data.get("content_urls", {}).get("desktop", {}).get("page", ""),
                    year=datetime.now().year,
                    source_name="Wikipedia",
                    authority_score=0.62,
                    snippet=extract[:400],
                    raw_text=extract,
                    authors=["Wikipedia contributors"],
                    venue="Wikipedia",
                )]
        except Exception as e:
            print(f"[Wikipedia] {e}")
        return []

    # ── OpenAlex ──────────────────────────────
    def search_openalex(self, query: str, limit: int = 6) -> List[EvidenceItem]:
        try:
            r = self.session.get(
                "https://api.openalex.org/works",
                params={"search": query, "per-page": limit, "sort": "cited_by_count:desc"},
                timeout=self.timeout
            )
            r.raise_for_status()
            items = []
            for w in r.json().get("results", []):
                venue = "Unknown"
                loc = w.get("primary_location") or {}
                src = loc.get("source") or {}
                venue = src.get("display_name", "Unknown")

                # Reconstruct abstract
                inv = w.get("abstract_inverted_index") or {}
                abstract = ""
                if inv:
                    try:
                        positions: Dict[int, str] = {}
                        for word, pos_list in inv.items():
                            for pos in pos_list:
                                positions[pos] = word
                        abstract = " ".join(positions[i] for i in sorted(positions))
                    except Exception:
                        abstract = ""

                authority = self._score_venue(venue, base=0.72)
                items.append(EvidenceItem(
                    title=w.get("display_name", ""),
                    url=f"https://openalex.org/{w.get('id','').split('/')[-1]}",
                    year=w.get("publication_year") or 0,
                    source_name="OpenAlex",
                    authority_score=authority,
                    snippet=(abstract or w.get("display_name", ""))[:400],
                    raw_text=abstract or w.get("display_name", ""),
                    authors=[],
                    venue=venue,
                    doi=w.get("doi"),
                ))
            return items
        except Exception as e:
            print(f"[OpenAlex] {e}")
            return []

    # ── arXiv ─────────────────────────────────
    def search_arxiv(self, query: str, limit: int = 5) -> List[EvidenceItem]:
        try:
            import xml.etree.ElementTree as ET
            r = self.session.get(
                "http://export.arxiv.org/api/query",
                params={"search_query": f"all:{query}", "max_results": limit, "sortBy": "relevance"},
                timeout=self.timeout
            )
            r.raise_for_status()
            ns = {"atom": "http://www.w3.org/2005/Atom"}
            root = ET.fromstring(r.text)
            items = []
            for entry in root.findall("atom:entry", ns):
                title = (entry.find("atom:title", ns).text or "").strip()
                summary = (entry.find("atom:summary", ns).text or "").strip()
                published = entry.find("atom:published", ns).text or ""
                year = int(published[:4]) if published else 0
                aid = (entry.find("atom:id", ns).text or "").split("/")[-1]
                authors = [(a.find("atom:name", ns).text or "") for a in entry.findall("atom:author", ns)][:4]
                items.append(EvidenceItem(
                    title=title,
                    url=f"https://arxiv.org/abs/{aid}",
                    year=year,
                    source_name="arXiv",
                    authority_score=0.87,
                    snippet=summary[:400],
                    raw_text=summary,
                    authors=authors,
                    venue="arXiv preprint",
                ))
            return items
        except Exception as e:
            print(f"[arXiv] {e}")
            return []

    # ── Aggregator ────────────────────────────
    def retrieve(self, claim: str, max_results: int = 20) -> List[EvidenceItem]:
        print(f"[RETRIEVE] Searching for: {claim[:50]}...")
        key = hashlib.md5(claim.lower().encode()).hexdigest()
        if key in self.cache:
            print(f"[RETRIEVE] Cache hit: {len(self.cache[key])} items")
            return self.cache[key]

        queries = self._make_queries(claim)
        print(f"[RETRIEVE] Queries: {queries}")
        all_items: List[EvidenceItem] = []

        for q in queries[:2]:
            print(f"[RETRIEVE] Searching for: {q}")
            ss_items = self.search_semantic_scholar(q, 6)
            print(f"[RETRIEVE] Semantic Scholar: {len(ss_items)} items")
            all_items += ss_items
            
            pub_items = self.search_pubmed(q, 4)
            print(f"[RETRIEVE] PubMed: {len(pub_items)} items")
            all_items += pub_items
            
            arxiv_items = self.search_arxiv(q, 4)
            print(f"[RETRIEVE] arXiv: {len(arxiv_items)} items")
            all_items += arxiv_items
            
            oa_items = self.search_openalex(q, 4)
            print(f"[RETRIEVE] OpenAlex: {len(oa_items)} items")
            all_items += oa_items

        # Wikipedia for context
        wiki_items = self.search_wikipedia(self._wiki_query(claim), 2)
        print(f"[RETRIEVE] Wikipedia: {len(wiki_items)} items")
        all_items += wiki_items

        print(f"[RETRIEVE] Total items before filtering: {len(all_items)}")
        
        # Deduplicate + filter
        seen: set = set()
        unique: List[EvidenceItem] = []
        for item in all_items:
            key2 = re.sub(r"[^a-z0-9]", "", item.title.lower())[:60]
            if key2 and key2 not in seen and item.authority_score >= 0.60:
                seen.add(key2)
                unique.append(item)

        # Sort: authority DESC, year DESC
        unique.sort(key=lambda x: (x.authority_score, x.year), reverse=True)
        result = unique[:max_results]
        self.cache[key] = result
        print(f"[RETRIEVE] Final result: {len(result)} items")
        return result

    # ── Helpers ───────────────────────────────
    def _score_venue(self, venue: str, base: float = 0.75) -> float:
        vl = venue.lower()
        for kw, score in self.AUTHORITY.items():
            if kw in vl:
                return score
        return base

    def _make_queries(self, claim: str) -> List[str]:
        clean = re.sub(r"[^\w\s]", " ", claim).strip()
        words = clean.split()
        # Short query for broad retrieval
        short = " ".join(words[:8])
        # Scientific framing
        scientific = f"scientific evidence {short}"
        # Fact-check framing
        factcheck = f"fact check debunk {short}"
        return list(dict.fromkeys([short, scientific, factcheck]))

    def _wiki_query(self, claim: str) -> str:
        """Extract best Wikipedia article name from claim"""
        stopwords = {"is", "are", "was", "the", "a", "an", "it", "its", "that", "this"}
        words = [w for w in claim.split() if w.lower() not in stopwords]
        return " ".join(words[:4])


# ─────────────────────────────────────────────
# NLI Engine
# ─────────────────────────────────────────────

class NLIEngine:
    """BART-large-mnli with temperature scaling and multi-evidence aggregation"""

    def __init__(self, temperature: float = 1.4):
        self.device = torch.device("cpu")
        self.temperature = temperature
        self.model = None
        self.tokenizer = None
        self._load_model()

    def _load_model(self):
        try:
            print("[NLI] Loading facebook/bart-large-mnli ...")
            self.tokenizer = BartTokenizer.from_pretrained("facebook/bart-large-mnli")
            self.model = BartForSequenceClassification.from_pretrained(
                "facebook/bart-large-mnli",
                torch_dtype=torch.float32,
                low_cpu_mem_usage=True,
            )
            self.model.to(self.device)
            self.model.eval()
            print("[NLI] ✅ Model loaded")
        except Exception as e:
            print(f"[NLI] ⚠️ Load failed: {e}")

    def analyze(self, claim: str, evidence_text: str) -> Dict[str, float]:
        if not self.model:
            return {"contradiction": 0.33, "neutral": 0.34, "entailment": 0.33}
        try:
            # Truncate evidence to most relevant portion
            evidence_text = evidence_text[:600]
            inputs = self.tokenizer(
                evidence_text, claim,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True,
            ).to(self.device)
            with torch.no_grad():
                logits = self.model(**inputs).logits / self.temperature
                probs = torch.softmax(logits, dim=-1).cpu().numpy()[0]
            return {
                "contradiction": float(probs[0]),
                "neutral": float(probs[1]),
                "entailment": float(probs[2]),
            }
        except Exception as e:
            print(f"[NLI] Error: {e}")
            return {"contradiction": 0.33, "neutral": 0.34, "entailment": 0.33}

    def aggregate(self, results: List[Dict[str, float]], weights: Optional[List[float]] = None) -> Dict[str, float]:
        if not results:
            return {"contradiction": 0.33, "neutral": 0.34, "entailment": 0.33}
        if weights is None:
            weights = [1.0] * len(results)
        total_w = sum(weights)
        agg = {"contradiction": 0.0, "neutral": 0.0, "entailment": 0.0}
        for r, w in zip(results, weights):
            for k in agg:
                agg[k] += r[k] * w
        for k in agg:
            agg[k] /= total_w
        return agg


# ─────────────────────────────────────────────
# Domain & Risk Classifier
# ─────────────────────────────────────────────

DOMAIN_HARM_WEIGHTS = {
    "medical": 1.00, "health": 0.95, "vaccine": 0.98,
    "treatment": 0.96, "safety": 0.90, "financial": 0.85,
    "political": 0.70, "social": 0.60,
    "scientific": 0.45, "historical": 0.30, "entertainment": 0.10,
    "general": 0.40,
}

DOMAIN_KEYWORDS = {
    "medical": ["medical", "health", "vaccine", "virus", "bacteria", "disease",
                "treatment", "cure", "medicine", "drug", "symptom", "hospital", "cancer"],
    "financial": ["money", "investment", "stock", "crypto", "bitcoin", "financial", "fraud"],
    "political": ["government", "politics", "election", "policy", "law", "democrat", "republican"],
    "scientific": ["earth", "climate", "space", "physics", "gravity", "evolution",
                   "flat", "moon", "planet", "star", "galaxy", "orbit", "nasa"],
    "historical": ["history", "historical", "ancient", "medieval", "war", "century"],
    "entertainment": ["movie", "celebrity", "music", "entertainment", "actor"],
}

ACTIONABILITY_PATTERNS = [
    r"\b(should|must|need to|have to|required|essential)\b",
    r"\b(do|take|use|drink|eat|apply|follow)\b",
    r"\b(treatment|cure|prevention|solution|remedy)\b",
    r"\b(avoid|stop|quit|eliminate)\b",
]


def classify_domain(claim: str) -> str:
    cl = claim.lower()
    for domain, kws in DOMAIN_KEYWORDS.items():
        if any(k in cl for k in kws):
            return domain
    return "general"


def actionability_score(claim: str) -> float:
    cl = claim.lower()
    score = sum(0.25 for p in ACTIONABILITY_PATTERNS if re.search(p, cl))
    return min(1.0, score)


# ─────────────────────────────────────────────
# Claim Type Classifier
# ─────────────────────────────────────────────

OPINION_PATTERNS = [
    r"\b(i think|i believe|in my opinion|it seems|maybe|perhaps|possibly|might be|could be)\b",
    r"\b(some people say|many believe|it is said|interesting|surprising|amazing)\b",
    r"\b(question|why|how|what|when|where)\?"
]
SOCIOLOGICAL_PATTERNS = [
    r"\b(theory|belief|idea|concept|viewpoint|movement|community|followers)\b",
    r"\b(people|society|culture|mainstream|fringe|echo\s+chamber)\b",
]
SCIENTIFIC_PATTERNS = [
    r"\b(earth|sun|moon|planet|star|galaxy|universe|climate|temperature|gravity|evolution)\b",
    r"\b(vaccine|virus|bacteria|dna|protein|cell|neuron|quantum|relativity)\b",
    r"\b(is|are|causes|results|leads|affects|measures|contains|has|have)\b",
]


def classify_claim(claim: str) -> Dict:
    cl = claim.lower()
    is_opinion = any(re.search(p, cl) for p in OPINION_PATTERNS)
    is_social = any(re.search(p, cl) for p in SOCIOLOGICAL_PATTERNS)
    is_scientific = any(re.search(p, cl) for p in SCIENTIFIC_PATTERNS)
    flat_earth = any(t in cl for t in ["flat earth", "earth is flat", "flat-earth"])

    if is_opinion:
        return {"type": "opinion", "verifiable": False}
    if flat_earth:
        return {"type": "scientific_factual", "verifiable": True}
    if is_social and not is_scientific:
        return {"type": "sociological", "verifiable": False}
    if is_scientific:
        return {"type": "scientific_factual", "verifiable": True}
    return {"type": "general", "verifiable": True}


# ─────────────────────────────────────────────
# Explanation Builder
# ─────────────────────────────────────────────

def build_explanation(
    claim: str,
    evidence_items: List[EvidenceItem],
    nli: Dict[str, float],
    domain: str,
    claim_type: str,
    validation: str,
    confidence: float,
) -> str:
    """Build a rich, structured, evidence-backed explanation."""

    if claim_type == "opinion":
        return (
            "⚠️ This appears to be an opinion or subjective statement rather than a verifiable factual claim. "
            "Opinion statements cannot be fact-checked against scientific evidence. "
            "Consider whether the speaker presents this as fact or personal view."
        )

    if claim_type == "sociological":
        return (
            "ℹ️ This is a sociological observation about beliefs, movements, or social phenomena — "
            "not a testable physical or scientific claim. Such statements describe social reality "
            "rather than make falsifiable assertions about the natural world."
        )

    # ── Verdict header ────────────────────────
    if validation == "true":
        verdict_icon = "✅"
        verdict_text = "SUPPORTED by scientific evidence"
    elif validation == "false":
        verdict_icon = "❌"
        verdict_text = "CONTRADICTED by scientific evidence"
    elif validation == "partially_true":
        verdict_icon = "⚠️"
        verdict_text = "PARTIALLY SUPPORTED — contains both accurate and misleading elements"
    else:
        verdict_icon = "❓"
        verdict_text = "UNVERIFIED — insufficient evidence retrieved"

    lines: List[str] = []
    lines.append(f"{verdict_icon} <strong>VERDICT: {verdict_text}</strong>")
    lines.append(f"<em>Confidence: {confidence*100:.0f}% | Domain: {domain.title()}</em>")
    lines.append("")

    # ── NLI breakdown ─────────────────────────
    contra_pct = nli.get("contradiction", 0) * 100
    entail_pct = nli.get("entailment", 0) * 100
    neutral_pct = nli.get("neutral", 0) * 100
    lines.append("📊 <strong>Evidence Signal Breakdown</strong>")
    lines.append(
        f"• Contradicts claim: <strong>{contra_pct:.0f}%</strong> | "
        f"Supports claim: <strong>{entail_pct:.0f}%</strong> | "
        f"Neutral/Mixed: <strong>{neutral_pct:.0f}%</strong>"
    )
    lines.append("")

    # ── Domain-specific scientific context ────
    context = _get_domain_context(claim, domain)
    if context:
        lines.append("🔬 <strong>Scientific Context</strong>")
        lines.append(context)
        lines.append("")

    # ── Evidence citations ─────────────────────
    # Only show items with actual text content
    citable = [e for e in evidence_items if (e.snippet or e.raw_text) and e.authority_score >= 0.75][:5]
    if citable:
        lines.append(f"📚 <strong>Evidence from {len(citable)} Sources</strong>")
        for i, e in enumerate(citable, 1):
            text = (e.snippet or e.raw_text or "").strip()
            text = re.sub(r"\s+", " ", text)
            if len(text) > 280:
                text = text[:277] + "…"
            authors_str = ", ".join(e.authors[:2]) if e.authors else e.source_name
            year_str = f" ({e.year})" if e.year else ""
            venue_str = f" — {e.venue}" if e.venue and e.venue != "Unknown" else ""
            lines.append(
                f"<strong>[{i}]</strong> \"{text}\" "
                f"<em>— {authors_str}{venue_str}{year_str}</em> "
                f"[{e.source_name}, authority: {e.authority_score:.2f}]"
            )
        lines.append("")
    else:
        lines.append("⚠️ <strong>Limited peer-reviewed evidence retrieved.</strong> Analysis based on established scientific consensus.")
        lines.append("")

    # ── What makes this claim risky / accurate ─
    risk_analysis = _risk_language(claim, domain, validation, confidence)
    if risk_analysis:
        lines.append("⚡ <strong>Risk Analysis</strong>")
        lines.append(risk_analysis)
        lines.append("")

    # ── Recommended actions ────────────────────
    lines.append("🔗 <strong>Recommended Sources to Verify</strong>")
    source_recs = _recommend_sources(domain)
    lines.append(source_recs)

    return "<br>".join(lines)


def _get_domain_context(claim: str, domain: str) -> str:
    cl = claim.lower()

    if domain == "scientific":
        if any(t in cl for t in ["flat earth", "flat-earth", "earth is flat", "no curvature"]):
            return (
                "Earth's oblate spheroid shape is confirmed by independent methods spanning centuries: "
                "Eratosthenes calculated circumference in 240 BCE (accurate to 2%); satellite laser ranging "
                "measures to millimeter precision; GPS (31 satellites) requires spherical geometry for operation; "
                "GRACE mission maps gravitational variations revealing mass distribution. "
                "Earth's equatorial diameter: 12,756.34 km; polar diameter: 12,713.55 km; "
                "flattening ratio: 1/298.257. These figures are cross-verified by space agencies "
                "in 30+ countries independently."
            )
        if "gravity" in cl:
            return (
                "Gravity is described by Newton's law (F = Gm₁m₂/r²) and Einstein's General Relativity "
                "(spacetime curvature). Surface gravity on Earth: 9.80665 m/s². The ISS experiences ~90% "
                "of surface gravity — it doesn't 'escape' gravity, it's in continuous free-fall. "
                "LIGO has directly detected gravitational waves, confirming GR predictions."
            )
        if any(t in cl for t in ["vaccine", "vaccination"]):
            return (
                "Vaccine safety and efficacy are established through multi-phase randomized controlled trials, "
                "post-market surveillance involving millions of participants, and independent regulatory review "
                "(FDA, EMA, WHO). The scientific consensus on vaccine safety is based on decades of data."
            )
        if any(t in cl for t in ["climate", "global warming", "co2", "carbon"]):
            return (
                "Anthropogenic climate change is supported by >97% of climate scientists based on "
                "atmospheric CO₂ records (Keeling Curve, NOAA), ice core data spanning 800,000 years, "
                "ocean heat content, sea level rise (NASA/CNES satellite altimetry), and Arctic/Antarctic "
                "ice mass loss (GRACE). Multiple independent datasets converge on the same conclusion."
            )
        if "evolution" in cl:
            return (
                "Evolution by natural selection is supported by the fossil record, comparative genomics "
                "(humans share 98.7% DNA with chimpanzees), direct observation in fast-reproducing organisms, "
                "biogeography, embryology, and vestigial structures. The last common ancestor of humans "
                "and chimpanzees lived ~6-7 million years ago."
            )
    if domain == "medical":
        return (
            "Medical claims should be evaluated against peer-reviewed clinical trials, systematic reviews, "
            "and meta-analyses indexed in PubMed/MEDLINE. Extraordinary health claims require extraordinary "
            "evidence — anecdotes and testimonials do not constitute scientific proof."
        )
    if domain == "financial":
        return (
            "Financial claims should be verified against regulatory filings, peer-reviewed economics research, "
            "and official government statistics (BLS, Federal Reserve, SEC). Be skeptical of guaranteed returns "
            "or claims that contradict fundamental financial principles."
        )
    return ""


def _risk_language(claim: str, domain: str, validation: str, confidence: float) -> str:
    if validation == "false" and confidence > 0.7:
        harm_weight = DOMAIN_HARM_WEIGHTS.get(domain, 0.4)
        if harm_weight >= 0.90:
            return (
                "🚨 HIGH HARM POTENTIAL: This false claim is in a high-stakes domain (medical/health). "
                "If acted upon, it could lead to dangerous health decisions. People should consult qualified "
                "medical professionals rather than trusting this claim."
            )
        elif harm_weight >= 0.60:
            return (
                "⚠️ MODERATE HARM POTENTIAL: This misleading claim could influence important decisions. "
                "Cross-reference with authoritative sources before acting on this information."
            )
        else:
            return (
                "📌 LOW HARM: While this claim is scientifically inaccurate, it is unlikely to cause "
                "direct harm. It may contribute to general science literacy issues."
            )
    elif validation == "true" and confidence > 0.7:
        return "✅ This claim is consistent with scientific evidence. It can be used as accurate information."
    return ""


def _recommend_sources(domain: str) -> str:
    sources = {
        "scientific": "NASA (nasa.gov) · ESA (esa.int) · NOAA (noaa.gov) · arXiv (arxiv.org) · Nature (nature.com)",
        "medical": "PubMed (pubmed.ncbi.nlm.nih.gov) · WHO (who.int) · CDC (cdc.gov) · Cochrane Library · NEJM",
        "financial": "SEC (sec.gov) · Federal Reserve · BLS (bls.gov) · peer-reviewed economics journals",
        "political": "PolitiFact · FactCheck.org · Snopes · Reuters Fact Check · AP Fact Check",
        "historical": "JSTOR · Google Scholar · peer-reviewed history journals · national archives",
        "general": "Google Scholar · PubMed · Reuters · AP News · Wikipedia (as starting point only)",
    }
    return sources.get(domain, sources["general"])


# ─────────────────────────────────────────────
# Main Analyzer
# ─────────────────────────────────────────────

class RAGTruthAnalyzer:
    def __init__(self):
        self.retriever = MultiSourceRetriever()
        self.nli = NLIEngine(temperature=1.4)

    def analyze(self, claim: str) -> Dict:
        start = time.time()

        # 1. Classify
        claim_info = classify_claim(claim)
        claim_type = claim_info["type"]
        domain = classify_domain(claim)
        action_score = actionability_score(claim)

        # Non-verifiable
        if not claim_info["verifiable"]:
            explanation = build_explanation(claim, [], {"contradiction": 0.33, "neutral": 0.34, "entailment": 0.33},
                                            domain, claim_type, "not_applicable", 0.5)
            return self._build_result(claim, claim_type, domain, "not_applicable",
                                      0.5, 20.0, "yellow", explanation, [], {}, 0.0, start)

        # 2. Retrieve evidence
        evidence = self.retriever.retrieve(claim, max_results=18)

        # 3. NLI analysis — weight by authority score
        nli_results = []
        weights = []
        for ev in evidence[:7]:
            text = (ev.snippet or ev.raw_text or ev.title or "").strip()
            if len(text) < 20:
                continue
            r = self.nli.analyze(claim, text)
            nli_results.append(r)
            weights.append(ev.authority_score)

        if not nli_results:
            # Fallback: scientific consensus embeddings
            nli_agg = self._scientific_consensus_fallback(claim, domain)
        else:
            nli_agg = self.nli.aggregate(nli_results, weights)

        # 4. Calibrate
        calibrated = self._calibrate(nli_agg)
        primary = max(calibrated, key=calibrated.get)

        # 5. Confidence
        retrieval_quality = (sum(e.authority_score for e in evidence[:5]) / max(1, min(5, len(evidence))))
        margin = abs(calibrated["entailment"] - calibrated["contradiction"])
        source_agreement = 0.5 + 0.5 * margin
        confidence = float(np.clip(
            calibrated[primary] * (0.55 + 0.45 * retrieval_quality) * (0.70 + 0.30 * source_agreement),
            0.05, 0.97
        ))

        # 6. Validation label
        if primary == "entailment":
            validation = "true"
        elif primary == "contradiction":
            validation = "false"
        else:
            validation = "partially_true"

        # 7. Harm risk
        domain_weight = DOMAIN_HARM_WEIGHTS.get(domain, 0.40)
        falsehood_prob = calibrated.get("contradiction", 0.0)
        harm_risk = float(np.clip(
            domain_weight * 100 * (0.15 + 0.55 * falsehood_prob + 0.20 * action_score + 0.10 * (1 - confidence)),
            5.0, 97.0
        ))
        # Floor for clearly-false claims
        if falsehood_prob >= 0.65:
            harm_risk = max(harm_risk, 55.0 * domain_weight + 20.0)

        # 8. Color
        color = self._color(confidence, harm_risk, retrieval_quality, primary)

        # 9. Rich explanation
        explanation = build_explanation(claim, evidence, calibrated, domain, claim_type, validation, confidence)

        return self._build_result(
            claim, claim_type, domain, validation, confidence, harm_risk, color,
            explanation, evidence, calibrated, retrieval_quality, start
        )

    def _calibrate(self, nli: Dict[str, float]) -> Dict[str, float]:
        """Temperature + prior calibration"""
        # Slight prior toward neutral for rare-claim bias reduction
        prior = {"contradiction": 0.30, "neutral": 0.40, "entailment": 0.30}
        out = {k: nli[k] * 0.85 + prior[k] * 0.15 for k in nli}
        total = sum(out.values())
        return {k: v / total for k, v in out.items()}

    def _scientific_consensus_fallback(self, claim: str, domain: str) -> Dict[str, float]:
        """Rule-based fallback when retrieval returns nothing"""
        cl = claim.lower()
        known_false = [
            "flat earth", "earth is flat", "no curvature", "earth doesn't rotate",
            "moon landing fake", "vaccines cause autism", "5g causes covid",
            "chemtrails", "evolution is false", "climate change is hoax",
        ]
        if any(kf in cl for kf in known_false):
            return {"contradiction": 0.82, "neutral": 0.12, "entailment": 0.06}
        return {"contradiction": 0.33, "neutral": 0.34, "entailment": 0.33}

    def _color(self, confidence: float, harm_risk: float, retrieval_quality: float, primary: str) -> str:
        if primary == "entailment" and confidence >= 0.70 and harm_risk <= 35 and retrieval_quality >= 0.65:
            return "green"
        if harm_risk >= 68 or (primary == "contradiction" and confidence >= 0.55):
            return "red"
        return "yellow"

    def _build_result(self, claim, claim_type, domain, validation, confidence,
                      harm_risk, color, explanation, evidence, nli_agg, retrieval_quality, start):
        evidence_sources = []
        for e in evidence[:5]:
            evidence_sources.append({
                "title": e.title,
                "source": e.source_name,
                "venue": e.venue,
                "year": e.year,
                "url": e.url,
                "authority": round(e.authority_score, 2),
                "summary": (e.snippet or e.raw_text or "")[:200],
                "authors": e.authors[:3],
                "supports_claim": nli_agg.get("entailment", 0) > nli_agg.get("contradiction", 0),
            })
        return {
            "claim": claim,
            "claim_type": claim_type,
            "domain": domain,
            "validation_result": validation,
            "truth_confidence": confidence,
            "harm_risk": harm_risk,
            "color": color,
            "explanation": explanation,
            "evidence_count": len(evidence),
            "retrieval_quality": retrieval_quality,
            "nli_probabilities": nli_agg,
            "evidence_sources": evidence_sources,
            "research_grade": True,
            "analysis_method": "rag_multisource",
            "processing_time": time.time() - start,
        }


# ── Singleton ─────────────────────────────────
_analyzer: Optional[RAGTruthAnalyzer] = None


def get_analyzer() -> RAGTruthAnalyzer:
    global _analyzer
    if _analyzer is None:
        _analyzer = RAGTruthAnalyzer()
    return _analyzer


def analyze_claim_comprehensive(claim_text: str) -> Dict:
    try:
        return get_analyzer().analyze(claim_text)
    except Exception as e:
        return {
            "error": str(e),
            "claim": claim_text,
            "validation_result": "error",
            "truth_confidence": 0.5,
            "harm_risk": 50.0,
            "color": "yellow",
            "explanation": f"Analysis error: {e}",
            "research_grade": False,
            "analysis_method": "error_fallback",
        }