# config.py

# -------- MODELS --------
CLAIM_MODEL = "t5-small"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
NLI_MODEL = "facebook/bart-large-mnli"

# -------- RETRIEVAL --------
TOP_K_EVIDENCE = 5

# -------- VERDICT THRESHOLDS --------
# Tuned for BART-large-MNLI + real-world evidence
SUPPORT_THRESHOLD = 0.7
REFUTE_THRESHOLD = 0.7

# -------- AUTHORITY BOOST --------
# Applied when evidence comes from high-authority sources
AUTHORITY_ENTAILMENT_BOOST = 0.05

# -------- NEWS API --------
# Set your NewsAPI key here or use environment variable: NEWSAPI_KEY
# Get free key from: https://newsapi.org/register
NEWSAPI_KEY = "986cd266a3384ca3a60108968bd808fc"  # Replace with your real key
NEWSAPI_URL = "https://newsapi.org/v2/everything"
NEWSAPI_MAX_RESULTS = 5
