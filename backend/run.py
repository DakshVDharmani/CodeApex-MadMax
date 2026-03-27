#!/usr/bin/env python3
"""
Production Runner Script
Runs FastAPI server + Telegram bot concurrently in a single event loop.
"""

# MUST BE FIRST — load .env before any os.getenv() call
from dotenv import load_dotenv
load_dotenv()

import asyncio
import logging
import os
import sys
from pathlib import Path

# Fix Windows emoji/encoding crash
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Add app to Python path
sys.path.insert(0, str(Path(__file__).parent / "app"))

import uvicorn
from app.main import app
from app.services.telegram_bot import TelegramBotService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# FIX: read port from .env so it matches API_PORT=9000
API_PORT = int(os.getenv("API_PORT", 9000))
API_HOST = os.getenv("API_HOST", "0.0.0.0")


async def start_services():
    telegram_service = None
    server = None
    api_task = None

    try:
        # ── Telegram bot ──────────────────────────────────────────────
        telegram_service = TelegramBotService()

        for attempt in range(1, 4):
            try:
                logger.info(f"Starting Telegram bot (attempt {attempt}/3)…")
                await telegram_service.initialize()
                logger.info("Telegram bot initialised successfully")
                break
            except Exception as e:
                logger.error(f"Telegram init failed: {e}")
                if attempt < 3:
                    await asyncio.sleep(3)
        else:
            logger.warning("Telegram bot failed to start after 3 attempts — continuing without it")
            telegram_service = None

        # ── FastAPI ───────────────────────────────────────────────────
        config = uvicorn.Config(
            app=app,
            host=API_HOST,
            port=API_PORT,   # FIX: was hardcoded 8002
            log_level="info",
            loop="asyncio",
        )
        server = uvicorn.Server(config)

        logger.info(f"Starting FastAPI on http://{API_HOST}:{API_PORT}")
        logger.info(f"Health endpoint: http://localhost:{API_PORT}/health")

        # Run FastAPI as a background task so the event loop stays alive
        api_task = asyncio.create_task(server.serve())

        # Keep-alive: yield to the event loop every second
        while not server.should_exit:
            await asyncio.sleep(1)

    except KeyboardInterrupt:
        logger.info("Shutdown signal received")

    except Exception as e:
        logger.error(f"Fatal error: {str(e)}", exc_info=True)

    finally:
        logger.info("Cleaning up…")

        if telegram_service:
            try:
                await telegram_service.shutdown()
                logger.info("Telegram bot stopped")
            except Exception as e:
                logger.warning(f"Telegram shutdown issue: {e}")

        if server:
            server.should_exit = True

        if api_task:
            try:
                await asyncio.wait_for(api_task, timeout=5)
            except (asyncio.TimeoutError, Exception):
                pass

        logger.info("Shutdown complete")


if __name__ == "__main__":
    if not os.getenv("TELEGRAM_BOT_TOKEN"):
        logger.warning("TELEGRAM_BOT_TOKEN not set — bot will not work")

    asyncio.run(start_services())