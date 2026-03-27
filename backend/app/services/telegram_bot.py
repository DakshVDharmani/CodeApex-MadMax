"""
Telegram Bot Service
Production-ready Telegram bot integration with misinformation detection.

Group behaviour
---------------
- The bot listens in groups for:
    • Any message that mentions it (@botusername)
    • Replies directed at it
    • /start, /help, /status commands (always processed regardless of mention)
- In private chats every message is processed normally.

/start → next-message capture
------------------------------
After a user sends /start the bot records that user's ID.  The very next
message from that user (in any chat) is forwarded to the text model and the
"pending" flag is cleared, regardless of whether the message mentions the bot.
"""

import logging
import aiohttp
import base64
import httpx
from typing import Optional, Dict, Any, Set
from telegram import Update, Bot
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    filters,
    ContextTypes,
)
import os

logger = logging.getLogger(__name__)


class TelegramBotService:
    """Production-ready Telegram bot service"""

    def __init__(self):
        self.bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
        self.api_base_url = os.getenv('API_BASE_URL', 'http://127.0.0.1:9000')
        self.text_model_url = os.getenv('TEXT_MODEL_URL', 'http://127.0.0.1:8081/fact-check')
        self.application: Optional[Application] = None
        self.bot: Optional[Bot] = None
        self.session: Optional[aiohttp.ClientSession] = None
        self.http_client: Optional[httpx.AsyncClient] = None

        # user_id → True  means "send the next message from this user to text model"
        self._awaiting_next_message: Set[int] = set()
        # Cache the bot's own username so we can detect @mentions in groups
        self._bot_username: Optional[str] = None

        if not self.bot_token:
            logger.warning("TELEGRAM_BOT_TOKEN not set, bot will not be functional")

    # ------------------------------------------------------------------ #
    #  Lifecycle                                                           #
    # ------------------------------------------------------------------ #

    async def initialize(self):
        """Initialize the Telegram bot"""
        try:
            if not self.bot_token:
                logger.error("Cannot initialize bot: TELEGRAM_BOT_TOKEN not set")
                return

            self.session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=30)
            )
            self.http_client = httpx.AsyncClient(timeout=120.0)

            self.application = Application.builder().token(self.bot_token).build()
            self.bot = self.application.bot

            self._register_handlers()

            await self.application.initialize()
            await self.application.start()

            # Fetch and cache bot username for @mention detection
            bot_info = await self.application.bot.get_me()
            self._bot_username = (bot_info.username or "").lower()
            logger.info(f"Bot username: @{self._bot_username}")

            await self.application.updater.start_polling(
                allowed_updates=Update.ALL_TYPES,
                drop_pending_updates=True,
            )

            logger.info("Telegram bot initialized and polling successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Telegram bot: {str(e)}", exc_info=True)
            raise

    async def shutdown(self):
        """Shutdown the Telegram bot"""
        try:
            if self.application:
                await self.application.updater.stop()
                await self.application.stop()
                await self.application.shutdown()
            if self.session:
                await self.session.close()
            if self.http_client:
                await self.http_client.aclose()
            logger.info("Telegram bot shutdown complete")
        except Exception as e:
            logger.error(f"Error during bot shutdown: {str(e)}", exc_info=True)

    # ------------------------------------------------------------------ #
    #  Handler registration                                                #
    # ------------------------------------------------------------------ #

    def _register_handlers(self):
        """Register message and command handlers"""
        app = self.application

        # Commands — work in all chat types
        app.add_handler(CommandHandler("start", self._handle_start))
        app.add_handler(CommandHandler("help", self._handle_help))
        app.add_handler(CommandHandler("status", self._handle_status))

        # URL handler before generic text to avoid double-dispatch (private chats)
        app.add_handler(
            MessageHandler(
                filters.Entity("url") & filters.ChatType.PRIVATE,
                self._handle_url_message,
            )
        )
        # Text — private chats (all text)
        app.add_handler(
            MessageHandler(
                filters.TEXT & ~filters.COMMAND & filters.ChatType.PRIVATE,
                self._handle_text_message,
            )
        )
        # Photos — private chats
        app.add_handler(
            MessageHandler(
                filters.PHOTO & filters.ChatType.PRIVATE,
                self._handle_photo_message,
            )
        )

        # ---- Group handlers ----
        # In groups we handle URL/text/photo only when the bot is addressed
        # OR when the user is in the "next-message" capture state.
        app.add_handler(
            MessageHandler(
                filters.Entity("url") & filters.ChatType.GROUPS,
                self._handle_group_message,
            )
        )
        app.add_handler(
            MessageHandler(
                filters.TEXT & ~filters.COMMAND & filters.ChatType.GROUPS,
                self._handle_group_message,
            )
        )
        app.add_handler(
            MessageHandler(
                filters.PHOTO & filters.ChatType.GROUPS,
                self._handle_group_message,
            )
        )

        app.add_error_handler(self._handle_error)

    # ------------------------------------------------------------------ #
    #  Helpers — should-respond logic for groups                          #
    # ------------------------------------------------------------------ #

    def _is_addressed_in_group(self, update: Update) -> bool:
        """
        Return True if the bot should respond to this group message.
        Criteria:
          1. The message is a reply to the bot's own message, OR
          2. The message text contains @<bot_username>
        """
        msg = update.message
        if not msg:
            return False

        # Reply to the bot?
        if (
            msg.reply_to_message
            and msg.reply_to_message.from_user
            and msg.reply_to_message.from_user.username
            and msg.reply_to_message.from_user.username.lower() == self._bot_username
        ):
            return True

        # @mention in text?
        if self._bot_username and msg.text:
            if f"@{self._bot_username}" in msg.text.lower():
                return True

        # @mention via entity (more reliable)?
        for entity in msg.entities or []:
            if entity.type == "mention":
                mention = msg.text[entity.offset: entity.offset + entity.length].lower()
                if mention == f"@{self._bot_username}":
                    return True

        return False

    def _clean_mention(self, text: str) -> str:
        """Strip the @botusername from message text before analysis."""
        if self._bot_username:
            text = text.replace(f"@{self._bot_username}", "").strip()
        return text

    # ------------------------------------------------------------------ #
    #  Command handlers                                                    #
    # ------------------------------------------------------------------ #

    async def _handle_start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = update.effective_user.id

        # Register this user for next-message capture
        self._awaiting_next_message.add(user_id)
        logger.info(f"User {user_id} sent /start — awaiting their next message for text analysis")

        welcome_message = (
            "*Misinformation Detection Bot*\n\n"
            "I can help you detect misinformation in:\n"
            "- Text messages\n"
            "- Images\n"
            "- URLs (YouTube, Instagram, websites)\n\n"
            "Go ahead — send me something to analyse!\n\n"
            "*Commands:*\n"
            "/help - Show this help message\n"
            "/status - Check bot status"
        )
        await update.message.reply_text(welcome_message, parse_mode='Markdown')

    async def _handle_help(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        help_message = (
            "*How to use this bot:*\n\n"
            "*Text Analysis*\n"
            "Send any text message and I'll analyse it for misinformation.\n\n"
            "*Image Analysis*\n"
            "Send an image and I'll analyse it for potential misinformation.\n\n"
            "*URL Analysis*\n"
            "Send a URL and I'll analyse the content.\n"
            "Supported: YouTube, Instagram, general websites\n\n"
            "*In groups*\n"
            "Mention me (@username) or reply to my messages.\n\n"
            "*Tips*\n"
            "- For best results, provide clear and specific content\n"
            "- Analysis may take a few seconds\n\n"
            "Use /start to see the welcome message."
        )
        await update.message.reply_text(help_message, parse_mode='Markdown')

    async def _handle_status(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        try:
            api_status = await self._check_api_health()
            icon = 'Online' if api_status else 'Offline'
            status_message = (
                "*Bot Status*\n\n"
                f"Telegram Bot: Online\n"
                f"API Connection: {icon}\n"
                f"API URL: `{self.api_base_url}`\n\n"
                "*Supported Analysis Types:*\n"
                "- Text\n"
                "- Image\n"
                "- URL"
            )
            await update.message.reply_text(status_message, parse_mode='Markdown')
        except Exception as e:
            logger.error(f"Status check failed: {str(e)}")
            await update.message.reply_text("Failed to check status. Please try again later.")

    # ------------------------------------------------------------------ #
    #  Private-chat message handlers                                       #
    # ------------------------------------------------------------------ #

    async def _handle_text_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle plain text in private chats (also catches /start next-message in private)."""
        try:
            text = update.message.text
            if not text or not text.strip():
                return

            user_id = update.effective_user.id

            # /start next-message capture (private chat)
            if user_id in self._awaiting_next_message:
                self._awaiting_next_message.discard(user_id)
                logger.info(f"Captured next-message from user {user_id} after /start")

            processing_msg = await update.message.reply_text("Analysing text…")
            result = await self._analyze_text(text)
            await self._send_analysis_result(update, result, processing_msg)

        except Exception as e:
            logger.error(f"Text message handling failed: {str(e)}", exc_info=True)
            await update.message.reply_text("Failed to analyse text. Please try again.")

    async def _handle_photo_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle photos in private chats."""
        await self._process_photo(update, context)

    async def _handle_url_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle URLs in private chats."""
        await self._process_url(update, context)

    # ------------------------------------------------------------------ #
    #  Group message handler (unified)                                     #
    # ------------------------------------------------------------------ #

    async def _handle_group_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """
        Unified handler for all group messages.
        Responds when:
          - The sender has a pending next-message capture (after /start), OR
          - The bot is directly addressed (@mention or reply)
        """
        msg = update.message
        if not msg:
            return

        user_id = update.effective_user.id
        is_pending = user_id in self._awaiting_next_message
        is_addressed = self._is_addressed_in_group(update)

        if not (is_pending or is_addressed):
            # Not for us — stay silent
            return

        # Clear pending flag if this is the capture message
        if is_pending:
            self._awaiting_next_message.discard(user_id)
            logger.info(f"Captured next-message from user {user_id} in group after /start")

        # Route to the right sub-handler
        if msg.photo:
            await self._process_photo(update, context)
        elif msg.entities and any(e.type == "url" for e in msg.entities):
            await self._process_url(update, context)
        elif msg.text:
            clean_text = self._clean_mention(msg.text)
            if not clean_text:
                await msg.reply_text("Please send some content for me to analyse.")
                return
            processing_msg = await msg.reply_text("Analysing text…")
            result = await self._analyze_text(clean_text)
            await self._send_analysis_result(update, result, processing_msg)

    # ------------------------------------------------------------------ #
    #  Shared processing helpers                                           #
    # ------------------------------------------------------------------ #

    async def _process_photo(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Download photo, base64-encode it and call the gateway API."""
        try:
            photo = update.message.photo[-1]
            processing_msg = await update.message.reply_text("Analysing image…")

            file = await context.bot.get_file(photo.file_id)
            photo_bytes = await file.download_as_bytearray()
            photo_base64 = base64.b64encode(photo_bytes).decode('utf-8')

            result = await self._call_api("image", photo_base64)
            await self._send_analysis_result(update, result, processing_msg)

        except Exception as e:
            logger.error(f"Photo message handling failed: {str(e)}", exc_info=True)
            await update.message.reply_text("Failed to analyse image. Please try again.")

    async def _process_url(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Extract first URL from message and call the gateway API."""
        try:
            entities = update.message.entities or []
            urls = [
                update.message.text[e.offset: e.offset + e.length]
                for e in entities if e.type == "url"
            ]
            if not urls:
                return

            processing_msg = await update.message.reply_text("Analysing URL…")
            result = await self._call_api("url", urls[0])
            await self._send_analysis_result(update, result, processing_msg)

        except Exception as e:
            logger.error(f"URL message handling failed: {str(e)}", exc_info=True)
            await update.message.reply_text("Failed to analyse URL. Please try again.")

    # ------------------------------------------------------------------ #
    #  Result formatting                                                   #
    # ------------------------------------------------------------------ #

    async def _send_analysis_result(
        self,
        update: Update,
        result: Dict[str, Any],
        processing_msg,
    ):
        try:
            await processing_msg.delete()
        except Exception:
            pass

        try:
            status = result.get("status", "error")

            # ---- Text model raw output path ----
            if status == "success" and "raw_model_output" in result:
                model_output = result["raw_model_output"]
                results = model_output.get('results', [])

                lines = ["*Model Analysis Result*\n"]

                for i, claim_result in enumerate(results, 1):
                    lines.append(f"*Claim {i}:* `{claim_result.get('claim', 'Unknown')}`")
                    lines.append(f"*Verdict:* `{claim_result.get('verdict', 'UNKNOWN')}`")

                    if 'scores' in claim_result:
                        scores = claim_result['scores']
                        lines.append("*Model Scores:*")
                        for score_type, value in scores.items():
                            lines.append(f"  • {score_type.title()}: {value:.3f}")

                    if claim_result.get('citations'):
                        lines.append("*Sources Consulted:*")
                        for j, citation in enumerate(claim_result['citations'], 1):
                            lines.append(f"  {j}. {citation}")

                    if i < len(results):
                        lines.append("\n---\n")

            else:
                # ---- Structured gateway result ----
                details = result.get("details", {})
                content_type = details.get("content_type", "unknown")

                if content_type == "youtube_video":
                    confidence = result.get("confidence")
                    risk_level = details.get("risk_level", "unknown")
                    conf_str = f"{confidence:.2%}" if confidence is not None else "N/A"

                    lines = [
                        "*YouTube Analysis Result*\n",
                        f"*Prediction:* `{result.get('prediction', 'NEEDS_REVIEW')}`",
                        f"*Confidence:* `{conf_str}`",
                        f"*Risk Level:* `{risk_level.upper()}`",
                        f"*Video ID:* `{details.get('video_id', 'Unknown')}`",
                    ]
                    if details.get("note"):
                        lines.append(f"*Note:* {details['note']}")
                    if details.get("url"):
                        lines.append(f"*URL:* {details['url']}")

                    # Surface any extra fields from raw model response
                    raw = details.get("raw_model_response", {})
                    extra_keys = {k for k in raw if k not in ("confidence", "label", "verdict", "prediction", "risk_level", "risk")}
                    if extra_keys:
                        lines.append("*Additional Model Info:*")
                        for k in sorted(extra_keys):
                            lines.append(f"  • {k}: {raw[k]}")

                elif content_type == "instagram_post":
                    lines = [
                        "*Instagram Analysis Result*\n",
                        f"*Prediction:* `{result.get('prediction', 'NEEDS_REVIEW')}`",
                        f"*Platform:* Instagram",
                    ]
                    if details.get("note"):
                        lines.append(f"*Note:* {details['note']}")

                elif content_type in ("webpage", "url"):
                    lines = [
                        "*Webpage Analysis Result*\n",
                        f"*Prediction:* `{result.get('prediction', 'NEEDS_REVIEW')}`",
                    ]
                    if details.get("url"):
                        lines.append(f"*URL:* {details['url']}")
                    if details.get("domain"):
                        lines.append(f"*Domain:* {details['domain']}")
                    if details.get("note"):
                        lines.append(f"*Note:* {details['note']}")

                elif content_type == "image":
                    # Image went through OCR → text pipeline
                    lines = [
                        "*Image Analysis Result*\n",
                        f"*Prediction:* `{result.get('prediction', 'NEEDS_REVIEW')}`",
                    ]
                    extracted = details.get("extracted_text", "")
                    if extracted:
                        preview = extracted[:200] + "…" if len(extracted) > 200 else extracted
                        lines.append(f"*Extracted Text:* `{preview}`")
                    if details.get("model_scores"):
                        lines.append("*Model Scores:*")
                        for k, v in details["model_scores"].items():
                            lines.append(f"  • {k.title()}: {v:.3f}")
                    if details.get("note"):
                        lines.append(f"*Note:* {details['note']}")

                else:
                    status_label = {"success": "Success", "error": "Error"}.get(status, status)
                    lines = [
                        "*Analysis Result*\n",
                        f"*Status:* {status_label}",
                    ]
                    if "error" in result:
                        lines.append(f"*Error:* {result['error']}")
                    elif content_type != "unknown":
                        lines.append(f"*Content Type:* {content_type}")

            await update.message.reply_text("\n".join(lines), parse_mode='Markdown')

        except Exception as e:
            logger.error(f"Failed to send analysis result: {str(e)}")
            await update.message.reply_text("Analysis completed but failed to display results.")

    # ------------------------------------------------------------------ #
    #  API helpers                                                         #
    # ------------------------------------------------------------------ #

    async def _analyze_text(self, text: str) -> Dict[str, Any]:
        """Directly call the text/fact-check model service and return raw output."""
        try:
            logger.info(f"Sending text directly to model: {self.text_model_url}")

            response = await self.http_client.post(
                self.text_model_url,
                json={"text": text},
            )
            response.raise_for_status()

            result = response.json()
            logger.info(f"Raw model response: {result}")

            return {
                "status": "success",
                "raw_model_output": result,
            }

        except Exception as e:
            logger.error(f"Direct model call failed: {str(e)}")
            return {"status": "error", "error": str(e)}

    async def _call_api(self, content_type: str, content: str) -> Dict[str, Any]:
        """Call the gateway API for image/URL analysis."""
        try:
            if not self.session:
                raise RuntimeError("HTTP session not initialised")

            url = f"{self.api_base_url}/api/v1/analyze"
            payload = {"type": content_type, "content": content}
            logger.info(f"Calling gateway API: POST {url} (type={content_type})")

            async with self.session.post(url, json=payload) as response:
                if response.status == 200:
                    return await response.json()
                error_text = await response.text()
                raise RuntimeError(f"API error {response.status}: {error_text}")

        except Exception as e:
            logger.error(f"API call failed: {str(e)}")
            return {
                "status": "error",
                "prediction": "ERROR",
                "confidence": 0.0,
                "details": {"error": str(e)},
            }

    async def _check_api_health(self) -> bool:
        try:
            if not self.session:
                return False
            async with self.session.get(f"{self.api_base_url}/health") as response:
                return response.status == 200
        except Exception as e:
            logger.error(f"API health check failed: {str(e)}")
            return False

    async def _handle_error(self, update: object, context: ContextTypes.DEFAULT_TYPE):
        logger.error(f"Telegram bot error: {context.error}", exc_info=True)
        if update and hasattr(update, 'message') and update.message:
            try:
                await update.message.reply_text("An unexpected error occurred. Please try again.")
            except Exception:
                pass