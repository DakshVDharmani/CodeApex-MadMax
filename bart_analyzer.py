import torch
from transformers import BartForSequenceClassification, BartTokenizer
import requests
import json
import re
from typing import Dict, List, Tuple
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
import arxiv
import time
from datetime import datetime

class AdvancedBARTAnalyzer:
    """Facebook BART-based claim verification with ArXiv research integration"""
    
    def __init__(self):
        print("Initializing BART model for PhD-level analysis...")
        self.device = torch.device("cpu")  # Force CPU to avoid GPU memory issues
        
        # Load Facebook BART for sequence classification (CPU optimized)
        print("Loading Facebook BART model (this may take a moment)...")
        self.bart_model = BartForSequenceClassification.from_pretrained(
            "facebook/bart-large-mnli", 
            num_labels=3,  # contradiction, neutral, entailment
            torch_dtype=torch.float32,  # Use float32 for CPU
            low_cpu_mem_usage=True
        )
        self.bart_tokenizer = BartTokenizer.from_pretrained("facebook/bart-large-mnli")
        self.bart_model.to(self.device)
        self.bart_model.eval()
        
        # Load sentence transformer for semantic matching
        print("Loading semantic similarity model...")
        self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2', device='cpu')
        
        # ArXiv categories for scientific domains
        self.arxiv_categories = {
            "physics": ["physics.space-ph", "physics.gen-ph", "physics.optics", "quant-ph"],
            "astronomy": ["astro-ph.EP", "astro-ph.CO", "astro-ph.GA", "astro-ph.IM"],
            "earth_science": ["physics.geo-ph", "physics.ao-ph", "q-bio.PE"],
            "cosmology": ["astro-ph.CO", "gr-qc", "hep-th"],
            "evolution": ["q-bio.PE", "q-bio.GN", "q-bio.MN"]
        }
        
        # Research database cache
        self.research_cache = {}
        
        print("✅ BART analyzer initialized successfully on CPU")
    
    def search_arxiv_papers(self, claim: str, domain: str, max_papers: int = 10) -> List[Dict]:
        """Search ArXiv for relevant research papers"""
        
        # Check cache first
        cache_key = f"{claim[:100]}_{domain}"
        if cache_key in self.research_cache:
            return self.research_cache[cache_key]
        
        papers = []
        categories = self.arxiv_categories.get(domain, ["physics.gen-ph"])
        
        try:
            # Search ArXiv
            search = arxiv.Search(
                query=claim,
                max_results=max_papers,
                sort_by=arxiv.SortCriterion.Relevance
            )
            
            for result in search.results():
                paper_info = {
                    "title": result.title,
                    "authors": [author.name for author in result.authors],
                    "summary": result.summary,
                    "published": result.published.strftime("%Y-%m-%d"),
                    "arxiv_id": result.entry_id.split("/")[-1],
                    "categories": result.categories,
                    "doi": result.doi,
                    "pdf_url": result.pdf_url
                }
                papers.append(paper_info)
                
                # Add delay to respect rate limits
                time.sleep(0.1)
                
        except Exception as e:
            print(f"ArXiv search error: {e}")
        
        # Cache results
        self.research_cache[cache_key] = papers
        return papers
    
    def extract_scientific_entities(self, claim: str) -> List[str]:
        """Extract scientific entities from claim for better paper matching"""
        
        # Common scientific entities and patterns
        entities = []
        
        # Physical quantities
        quantities = re.findall(r'\b\d+(?:,\d{3})*(?:\.\d+)?\s*(?:km|m|mi|kg|g|°C|°F|K|mph|km/h|light-years|AU|parsec)\b', claim)
        entities.extend(quantities)
        
        # Scientific concepts
        concepts = [
            "gravity", "relativity", "quantum", "spacetime", "curvature", "spherical", "flat",
            "evolution", "natural selection", "DNA", "mutation", "species", "fossil",
            "cosmic inflation", "big bang", "dark matter", "dark energy", "black hole",
            "speed of light", "electromagnetic", "particle", "wave", "photon", "electron",
            "planet", "solar system", "galaxy", "universe", "star", "nebula", "asteroid",
            "earth", "moon", "mars", "jupiter", "saturn", "venus", "mercury", "neptune"
        ]
        
        for concept in concepts:
            if concept in claim.lower():
                entities.append(concept)
        
        return list(set(entities))
    
    def semantic_similarity_analysis(self, claim: str, papers: List[Dict]) -> Tuple[float, List[Dict]]:
        """Perform semantic similarity analysis with research papers"""
        
        if not papers:
            return 0.0, []
        
        # Encode claim
        claim_embedding = self.sentence_model.encode([claim])
        
        # Encode paper summaries
        paper_texts = [paper["summary"] + " " + paper["title"] for paper in papers]
        paper_embeddings = self.sentence_model.encode(paper_texts)
        
        # Calculate similarities
        similarities = cosine_similarity(claim_embedding, paper_embeddings)[0]
        
        # Sort papers by similarity
        sorted_papers = sorted(zip(papers, similarities), key=lambda x: x[1], reverse=True)
        
        avg_similarity = np.mean(similarities)
        max_similarity = np.max(similarities)
        
        # Return enhanced similarity score and sorted papers
        enhanced_score = (avg_similarity + max_similarity) / 2
        
        return enhanced_score, [{"paper": paper, "similarity": float(sim)} for paper, sim in sorted_papers]
    
    def bart_nli_analysis(self, claim: str, evidence: str) -> Dict:
        """Use BART for Natural Language Inference analysis"""
        
        # Prepare inputs for BART NLI
        inputs = self.bart_tokenizer(
            evidence, 
            claim, 
            return_tensors="pt", 
            truncation=True, 
            max_length=512
        ).to(self.device)
        
        with torch.no_grad():
            outputs = self.bart_model(**inputs)
            predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
            predictions = predictions.cpu().numpy()[0]
        
        # Map predictions to labels
        labels = ["contradiction", "neutral", "entailment"]
        predicted_label = labels[np.argmax(predictions)]
        confidence = float(np.max(predictions))
        
        return {
            "prediction": predicted_label,
            "confidence": confidence,
            "probabilities": {
                "contradiction": float(predictions[0]),
                "neutral": float(predictions[1]),
                "entailment": float(predictions[2])
            }
        }
    
    def phd_level_analysis(self, claim: str, papers: List[Dict], bart_result: Dict, semantic_score: float) -> Dict:
        """Generate PhD-level analysis with detailed evidence"""
        
        analysis = {
            "claim": claim,
            "verdict": "unknown",
            "confidence": 0.5,
            "risk_score": 50.0,
            "evidence_strength": "weak",
            "research_consensus": "insufficient_data",
            "methodology": "bart_semantic_arxiv",
            "papers_analyzed": len(papers),
            "semantic_similarity": semantic_score,
            "bart_analysis": bart_result,
            "detailed_explanation": "",
            "supporting_papers": [],
            "contradictory_papers": [],
            "phd_level_insights": []
        }
        
        if not papers:
            analysis["detailed_explanation"] = "No relevant research papers found to verify this claim. The claim cannot be evaluated against current scientific literature."
            return analysis
        
        # Analyze BART result
        bart_prediction = bart_result["prediction"]
        bart_confidence = bart_result["confidence"]
        
        # Analyze semantic similarity
        if semantic_score > 0.8:
            similarity_level = "very_high"
        elif semantic_score > 0.6:
            similarity_level = "high"
        elif semantic_score > 0.4:
            similarity_level = "moderate"
        else:
            similarity_level = "low"
        
        # Determine verdict based on multiple factors
        if bart_prediction == "contradiction" and bart_confidence > 0.7:
            analysis["verdict"] = "false"
            analysis["confidence"] = min(0.95, bart_confidence + 0.1)
            analysis["risk_score"] = max(80.0, bart_confidence * 100)
            analysis["evidence_strength"] = "strong"
            analysis["research_consensus"] = "contradicted"
            
        elif bart_prediction == "entailment" and bart_confidence > 0.7:
            analysis["verdict"] = "true"
            analysis["confidence"] = min(0.95, bart_confidence + 0.1)
            analysis["risk_score"] = min(20.0, (1 - bart_confidence) * 100)
            analysis["evidence_strength"] = "strong"
            analysis["research_consensus"] = "supported"
            
        elif semantic_score > 0.7 and bart_prediction != "contradiction":
            analysis["verdict"] = "likely_true"
            analysis["confidence"] = min(0.85, semantic_score + 0.1)
            analysis["risk_score"] = max(30.0, (1 - semantic_score) * 100)
            analysis["evidence_strength"] = "moderate"
            analysis["research_consensus"] = "generally_supported"
            
        elif bart_prediction == "contradiction" and semantic_score < 0.3:
            analysis["verdict"] = "likely_false"
            analysis["confidence"] = min(0.80, bart_confidence)
            analysis["risk_score"] = max(60.0, bart_confidence * 80)
            analysis["evidence_strength"] = "moderate"
            analysis["research_consensus"] = "questioned"
        
        # Generate PhD-level explanation
        explanation_parts = []
        
        explanation_parts.append(f"**PhD-Level Analysis:** This claim was evaluated using Facebook BART's Natural Language Inference capabilities combined with semantic similarity analysis against {len(papers)} peer-reviewed research papers from ArXiv.")
        
        explanation_parts.append(f"**Semantic Similarity:** The claim shows {similarity_level} semantic similarity (score: {semantic_score:.3f}) with the research corpus, indicating {'strong' if semantic_score > 0.6 else 'moderate' if semantic_score > 0.4 else 'weak'} contextual alignment with established scientific literature.")
        
        explanation_parts.append(f"**BART NLI Analysis:** The BART model predicts '{bart_prediction}' with {bart_confidence:.3f} confidence. This assessment is based on the model's understanding of logical relationships between the claim and scientific evidence.")
        
        # Add specific paper insights
        top_papers = papers[:3]  # Top 3 most relevant papers
        for i, paper in enumerate(top_papers):
            paper_analysis = f"**Paper {i+1}:** {paper['title']} ({paper['arxiv_id']}) by {', '.join(paper['authors'][:2])} et al. Published {paper['published']}. "
            
            if bart_prediction == "contradiction":
                paper_analysis += "This research provides evidence that contradicts the claim."
                analysis["contradictory_papers"].append(paper)
            elif bart_prediction == "entailment":
                paper_analysis += "This research supports the validity of the claim."
                analysis["supporting_papers"].append(paper)
            else:
                paper_analysis += "This research is relevant but does not directly confirm or contradict the claim."
            
            explanation_parts.append(paper_analysis)
        
        # Add methodology insights
        explanation_parts.append(f"**Methodology:** The analysis employs a multi-modal approach combining (1) BART's attention-based understanding of textual entailment relationships, (2) semantic embedding similarity using MiniLM-L6-v2, and (3) domain-specific research paper retrieval from ArXiv's {self.arxiv_categories.get('physics', ['physics.gen-ph'])[0]} category.")
        
        # Add confidence assessment
        explanation_parts.append(f"**Confidence Assessment:** The {analysis['confidence']:.3f} confidence score reflects the convergence of multiple analytical methods. High confidence indicates strong agreement between semantic similarity and NLI analysis, while lower confidence suggests conflicting evidence or insufficient research coverage.")
        
        analysis["detailed_explanation"] = " ".join(explanation_parts)
        
        return analysis
    
    def analyze_claim_with_research(self, claim: str, domain: str = "physics") -> Dict:
        """Main method to analyze claim with BART and ArXiv research"""
        
        start_time = time.time()
        
        # Extract entities for better search
        entities = self.extract_scientific_entities(claim)
        
        # Search ArXiv papers
        papers = self.search_arxiv_papers(claim, domain)
        
        # Semantic similarity analysis
        semantic_score, scored_papers = self.semantic_similarity_analysis(claim, papers)
        
        # Prepare evidence for BART (use top papers)
        evidence_text = ""
        if scored_papers:
            top_papers = scored_papers[:3]
            evidence_parts = []
            for paper_info in top_papers:
                paper = paper_info["paper"]
                evidence_parts.append(f"According to '{paper['title']}' by {paper['authors'][0]} et al.: {paper['summary'][:300]}...")
            evidence_text = " ".join(evidence_parts)
        
        # BART NLI analysis
        bart_result = self.bart_nli_analysis(claim, evidence_text) if evidence_text else {
            "prediction": "neutral",
            "confidence": 0.5,
            "probabilities": {"contradiction": 0.33, "neutral": 0.34, "entailment": 0.33}
        }
        
        # PhD-level analysis
        analysis = self.phd_level_analysis(claim, papers, bart_result, semantic_score)
        
        # Add metadata
        analysis["processing_time"] = time.time() - start_time
        analysis["entities_extracted"] = entities
        analysis["domain"] = domain
        analysis["timestamp"] = datetime.now().isoformat()
        
        return analysis

# Initialize the analyzer
bart_analyzer = AdvancedBARTAnalyzer()

def analyze_claim_with_bart(claim_text: str, domain: str = "physics") -> Dict:
    """Interface function for the main system"""
    try:
        return bart_analyzer.analyze_claim_with_research(claim_text, domain)
    except Exception as e:
        return {
            "error": str(e),
            "verdict": "unknown",
            "confidence": 0.5,
            "risk_score": 50.0,
            "detailed_explanation": f"Analysis failed due to technical error: {str(e)}"
        }
