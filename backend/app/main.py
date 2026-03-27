"""
FastAPI Main Entry Point
Production-ready misinformation detection API with Telegram bot integration
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routes.analyze import router as analyze_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backend.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting FastAPI application…")
    yield
    logger.info("Shutting down FastAPI application…")


app = FastAPI(
    title="Misinformation Detection API",
    description="Production-ready AI pipeline for misinformation detection with Telegram bot integration",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "status": "healthy",
        "service": "Misinformation Detection API",
        "version": "2.0.0",
    }


@app.get("/health")
async def health_check():
    # FIX: removed hardcoded "telegram_bot: initialized" — the bot is managed
    # by run.py, not by the FastAPI process itself.
    return {
        "status": "healthy",
        "components": {
            "api": "running",
        },
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "Internal server error",
            "details": str(exc) if app.debug else "An unexpected error occurred",
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=9000,          # FIX: matches .env API_PORT=9000
        reload=True,
        log_level="info",
    )