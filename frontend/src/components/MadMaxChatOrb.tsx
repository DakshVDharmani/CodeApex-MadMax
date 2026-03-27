import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, X, Send, Trash2 } from "lucide-react";

/* ======================================================
   MARKDOWN-STYLE FORMATTING PARSER
====================================================== */

const parseFormattedText = (text: string) => {
  // Split by lines to handle lists separately
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];
  
  lines.forEach((line, lineIndex) => {
    // Handle numbered lists
    if (/^\d+\.\s/.test(line)) {
      const listItems = [];
      let i = lineIndex;
      
      // Collect consecutive list items
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const itemText = lines[i].replace(/^\d+\.\s/, '');
        listItems.push(
          <li key={i} className="ml-4 mb-1 text-gray-200">
            {parseInlineFormatting(itemText)}
          </li>
        );
        i++;
      }
      
      elements.push(
        <ol key={lineIndex} className="list-decimal list-inside mb-3 text-gray-200">
          {listItems}
        </ol>
      );
      return;
    }
    
    // Handle bullet points
    if (/^[•\-*]\s/.test(line)) {
      const listItems = [];
      let i = lineIndex;
      
      // Collect consecutive bullet points
      while (i < lines.length && /^[•\-*]\s/.test(lines[i])) {
        const itemText = lines[i].replace(/^[•\-*]\s/, '');
        listItems.push(
          <li key={i} className="ml-4 mb-1 text-gray-200">
            {parseInlineFormatting(itemText)}
          </li>
        );
        i++;
      }
      
      elements.push(
        <ul key={lineIndex} className="list-disc list-inside mb-3 text-gray-200">
          {listItems}
        </ul>
      );
      return;
    }
    
    // Handle headings
    if (line.startsWith('###')) {
      elements.push(
        <h3 key={lineIndex} className="text-red-400 font-bold text-sm mb-2 mt-3">
          {parseInlineFormatting(line.replace(/^###\s/, ''))}
        </h3>
      );
    } else if (line.startsWith('##')) {
      elements.push(
        <h2 key={lineIndex} className="text-red-300 font-bold text-base mb-2 mt-3">
          {parseInlineFormatting(line.replace(/^##\s/, ''))}
        </h2>
      );
    } else if (line.startsWith('#')) {
      elements.push(
        <h1 key={lineIndex} className="text-red-500 font-bold text-lg mb-2 mt-3">
          {parseInlineFormatting(line.replace(/^#\s/, ''))}
        </h1>
      );
    } else if (line.trim()) {
      // Regular paragraph
      elements.push(
        <p key={lineIndex} className="mb-2 text-gray-200 leading-relaxed">
          {parseInlineFormatting(line)}
        </p>
      );
    } else {
      // Empty line
      elements.push(<br key={lineIndex} />);
    }
  });
  
  return elements;
};

const parseInlineFormatting = (text: string) => {
  // Handle code blocks first
  let processed = text;
  const codeElements: JSX.Element[] = [];
  let codeIndex = 0;
  
  // Replace code blocks with placeholders
  processed = processed.replace(/`([^`]+)`/g, (match, code) => {
    const placeholder = `__CODE_${codeIndex}__`;
    codeElements[codeIndex] = <code key={codeIndex} className="bg-red-900/30 text-red-300 px-1 py-0.5 rounded text-xs font-mono">{code}</code>;
    codeIndex++;
    return placeholder;
  });
  
  // Handle bold text
  processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Handle italic text
  processed = processed.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Handle **critical** warnings with special styling
  processed = processed.replace(/<strong>([^<]*(?:critical|warning|alert|danger)[^<]*)<\/strong>/gi, 
    '<strong class="text-red-400 font-bold">$1</strong>');
  
  // Handle **important** terms with special styling
  processed = processed.replace(/<strong>([^<]*(?:important|key|primary|major)[^<]*)<\/strong>/gi, 
    '<strong class="text-yellow-400 font-semibold">$1</strong>');
  
  // Convert back code placeholders
  codeElements.forEach((element, index) => {
    processed = processed.replace(`__CODE_${index}__`, `__CODE_PLACEHOLDER_${index}__`);
  });
  
  // Split by placeholders and reconstruct
  const parts = processed.split(/__CODE_PLACEHOLDER_(\d+)__/);
  
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      // This is a placeholder index
      return codeElements[parseInt(part)];
    }
    // This is regular text
    return (
      <span 
        key={`text-${index}`} 
        dangerouslySetInnerHTML={{ __html: part }} 
      />
    );
  });
};

/* ======================================================
   CHAOSLENS AI — DEEPFAKE & MISINFORMATION ANALYST
   Using: Google Gemini API
   API Key: Loaded from .env (VITE_GEMINI_API_KEY)
====================================================== */

const SYSTEM_PROMPT = `You are CHAOSLENS AI, a concise expert assistant for deepfake detection and digital literacy.

CORE RULES:
- NEVER introduce yourself or explain what you are
- Give direct, concise answers to user questions
- Use proper formatting: **bold** for emphasis, bullet points for lists
- Keep responses under 150 words unless user asks for detailed info
- Focus on answering the specific question asked

RESPONSE STYLE:
- Start directly with answer
- Use **bold** for key terms
- Use bullet points (•) for lists
- One sentence per line for readability
- No self-introduction or explanations about your capabilities

EXAMPLE:
User: "What are deepfakes?"
Response: "**Deepfakes** are AI-generated synthetic media where someone's likeness is replaced with another person's using machine learning.

• Face swaps: Replacing Person A's face with Person B's
• Voice cloning: Synthesizing someone's voice to say new things
• Lip-syncing: Matching mouth movements to new audio
• Created using GANs (Generative Adversarial Networks)"

Answer questions directly and concisely.`;

const MadMaxChatOrb = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "CHAOSLENS AI ready. Ask me anything about deepfakes, misinformation, or digital security.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  /* ======================
     Scroll + textarea
  ====================== */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  /* ======================
     Send Message to ChatGPT
  ====================== */
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setLoading(true);
    setError(null);
    setInput("");

    const userMessage = { role: "user", content: text };
    const history = [...messages, userMessage];
    setMessages(history);

    const assistantPlaceholder = { role: "assistant", content: "" };
    setMessages([...history, assistantPlaceholder]);
    const assistantIndex = history.length;

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

      if (!apiKey) {
        throw new Error(
          "Gemini API key not found. Add VITE_GEMINI_API_KEY to your .env file."
        );
      }

      // Build conversation history for Gemini
      const chatMessages = [
        {
          role: "user",
          parts: [{ text: `${SYSTEM_PROMPT}\n\nUser: ${text}` }],
        },
      ];

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: chatMessages,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message ||
            `Gemini API Error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Extract text from Gemini response
      let assistantContent =
        data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated";

      // Clean up formatting for display
      assistantContent = assistantContent
        .replace(/\*\*(.*?)\*\*/g, "**$1**") // Convert **bold** to **bold**
        .replace(/•/g, "•") // Keep bullet points
        .replace(/\n\s*\n/g, "\n\n") // Ensure proper spacing
        .trim();

      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantIndex] = {
          role: "assistant",
          content: assistantContent,
        };
        return updated;
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";

      console.error("Chat error:", err);
      setError(errorMessage);

      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantIndex] = {
          role: "assistant",
          content: `Error: ${errorMessage}`,
        };
        return updated;
      });
    }

    setLoading(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /* ======================
     Clear Chat
  ====================== */
  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "CHAOSLENS AI ready. Ask me anything about deepfakes, misinformation, or digital security.",
      },
    ]);
    setError(null);
  };

  /* ======================
     Render
  ====================== */
  return (
    <>
      {/* ============================================
          FLOATING OMG GLITCH BUTTON
      ============================================ */}
      <style>{`
      `}</style>

      <motion.button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-8 right-8 z-50 w-14 h-14 rounded-full
        bg-black border-2 border-red-600
        flex items-center justify-center
        cursor-pointer group hover:bg-red-900/20 transition-colors"
        title="UNLOCK CHAOSLENS"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Cpu className="w-6 h-6 text-red-500" />
      </motion.button>

      {/* ============================================
          CHAT WINDOW
      ============================================ */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            className="fixed bottom-28 right-8 w-[380px] h-[540px] z-50
            rounded-2xl overflow-hidden
            bg-black/90 backdrop-blur-xl
            border-2 border-red-900
            shadow-[0_0_50px_rgba(255,0,0,0.45)]
            flex flex-col font-mono text-xs"
          >
            {/* HEADER - DISTINCTIVE DESIGN */}
            <div className="h-16 flex items-center justify-between px-4
            bg-gradient-to-r from-black via-red-950/60 to-black
            border-b-2 border-red-900 relative overflow-hidden">
              {/* Animated background glow */}
              <motion.div
                className="absolute inset-0 bg-red-900/20"
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 3, repeat: Infinity }}
              />

              <motion.div className="relative z-10">
                <p className="text-red-500 tracking-[0.25em] font-black text-sm">
                  CHAOSLENS
                </p>
                <p className="text-[9px] text-red-400/70 tracking-widest">
                  ANALYSIS UNIT
                </p>
              </motion.div>

              <div className="flex items-center gap-3 relative z-10">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Cpu className="text-red-500 w-5 h-5" />
                </motion.div>

                {/* CLEAR BUTTON - Icon style in toolbar */}
                <motion.button
                  onClick={clearChat}
                  whileHover={{ scale: 1.2, rotate: 180 }}
                  whileTap={{ scale: 0.85 }}
                  className="p-1.5 hover:bg-yellow-600/30 rounded-full
                  text-yellow-400 transition-colors"
                  title="PURGE HISTORY"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>

                {/* CLOSE BUTTON - Large X on top right */}
                <motion.button
                  onClick={() => setOpen(false)}
                  whileHover={{ scale: 1.15, rotate: 90 }}
                  whileTap={{ scale: 0.8 }}
                  className="p-1 hover:bg-red-700/40 rounded
                  text-red-400 hover:text-red-300 transition-all"
                  title="CLOSE UNIT"
                >
                  <X className="w-5 h-5" strokeWidth={3} />
                </motion.button>
              </div>
            </div>

            {/* MESSAGES */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-md leading-relaxed
                    ${
                      m.role === "user"
                        ? "bg-red-900/40 border border-red-700 text-white shadow-[0_0_10px_rgba(255,0,0,0.2)]"
                        : "bg-black/60 border border-gray-700 text-gray-200"
                    }`}
                  >
                    {m.content}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-500 text-[10px] font-bold tracking-widest"
                >
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4], y: [0, -2, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    ⚡ Processing your question…
                  </motion.span>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-yellow-300 text-[9px] bg-yellow-950/40 border-l-2 border-yellow-600 rounded p-2 pl-3"
                >
                  ⚠️ {error}
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* INPUT SECTION */}
            <div className="border-t-2 border-red-900 p-3 bg-black space-y-2">
              <div className="flex gap-2">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask me anything..."
                  className="flex-1 resize-none bg-black/70
                  border border-red-800 focus:border-red-600
                  text-white text-xs rounded px-3 py-2
                  outline-none transition-colors placeholder-gray-600"
                  disabled={loading}
                />
                <motion.button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  className="px-3 py-2 bg-red-900/40 border border-red-700
                  text-red-400 hover:text-red-300 hover:border-red-600
                  hover:bg-red-900/60
                  rounded transition-all disabled:opacity-40
                  disabled:cursor-not-allowed flex items-center justify-center"
                  title="TRANSMIT (Enter • Shift+Enter = newline)"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>
              <p className="text-[8px] text-gray-600 tracking-wider">
                ENTER → SEND • SHIFT+ENTER → LINE BREAK
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MadMaxChatOrb;