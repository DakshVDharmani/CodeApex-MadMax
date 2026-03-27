import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, X, Send, Trash2, ChevronDown } from "lucide-react";

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
  const elements: JSX.Element[] = [];
  let lastIndex = 0;
  
  // Handle code blocks first
  const codeRegex = /`([^`]+)`/g;
  let match;
  const codeElements: { text: string; index: number; length: number }[] = [];
  
  // Find all code blocks and their positions
  while ((match = codeRegex.exec(text)) !== null) {
    codeElements.push({
      text: match[1],
      index: match.index,
      length: match[0].length
    });
  }
  
  // Split text by code blocks
  let currentIndex = 0;
  codeElements.forEach((code, codeIndex) => {
    // Add text before code block
    if (currentIndex < code.index) {
      const beforeText = text.substring(currentIndex, code.index);
      const processedText = processInlineFormatting(beforeText);
      elements.push(...processedText);
    }
    
    // Add code block
    elements.push(
      <code key={`code-${codeIndex}`} className="bg-red-900/30 text-red-300 px-1 py-0.5 rounded text-xs font-mono">
        {code.text}
      </code>
    );
    
    currentIndex = code.index + code.length;
  });
  
  // Add remaining text
  if (currentIndex < text.length) {
    const remainingText = text.substring(currentIndex);
    const processedText = processInlineFormatting(remainingText);
    elements.push(...processedText);
  }
  
  return elements.length > 0 ? elements : [<span key="text">{text}</span>];
};

const processInlineFormatting = (text: string) => {
  const elements: JSX.Element[] = [];
  let parts = [text];
  
  // Handle bold text
  parts = parts.flatMap(part => {
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const boldParts: JSX.Element[] = [];
    let lastIndex = 0;
    let match;
    
    while ((match = boldRegex.exec(part)) !== null) {
      // Add text before bold
      if (lastIndex < match.index) {
        boldParts.push(<span key={lastIndex}>{part.substring(lastIndex, match.index)}</span>);
      }
      
      // Add bold text
      const boldText = match[1];
      const isCritical = /critical|warning|alert|danger/i.test(boldText);
      const isImportant = /important|key|primary|major/i.test(boldText);
      
      boldParts.push(
        <strong 
          key={`bold-${match.index}`} 
          className={
            isCritical ? "text-red-400 font-bold" : 
            isImportant ? "text-yellow-400 font-semibold" : 
            "font-bold"
          }
        >
          {boldText}
        </strong>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < part.length) {
      boldParts.push(<span key={lastIndex}>{part.substring(lastIndex)}</span>);
    }
    
    return boldParts;
  });
  
  // Handle italic text
  elements.push(...parts.flatMap(part => {
    if (typeof part === 'string') {
      const italicRegex = /\*([^*]+)\*/g;
      const italicParts: JSX.Element[] = [];
      let lastIndex = 0;
      let match;
      
      while ((match = italicRegex.exec(part)) !== null) {
        // Add text before italic
        if (lastIndex < match.index) {
          italicParts.push(<span key={lastIndex}>{part.substring(lastIndex, match.index)}</span>);
        }
        
        // Add italic text
        italicParts.push(<em key={`italic-${match.index}`}>{match[1]}</em>);
        
        lastIndex = match.index + match[0].length;
      }
      
      // Add remaining text
      if (lastIndex < part.length) {
        italicParts.push(<span key={lastIndex}>{part.substring(lastIndex)}</span>);
      }
      
      return italicParts;
    }
    return [part];
  }));
  
  return elements;
};

/* ======================================================
   CHAOSLENS AI — DEEPFAKE & MISINFORMATION ANALYST
   Using: OpenAI ChatGPT API
   API Key: Loaded from .env (VITE_OPENAI_API_KEY)
====================================================== */

const SYSTEM_PROMPT = `You are CHAOSLENS AI.

MISSION:
You are an expert system specialized in:
- Deepfake detection (image, video, audio)
- Misinformation & disinformation analysis
- AI-generated content identification
- Media forensics & verification
- Propaganda & manipulation patterns
- Digital trust and authenticity

BEHAVIOR RULES:
- Be analytical, precise, and calm
- Do NOT roleplay or chit-chat
- Do NOT hallucinate sources
- If uncertain, say so clearly
- Provide structured explanations
- Focus on verification methods and signals

FORMATTING REQUIREMENTS:
- Use **bold** for critical warnings, key findings, and important terms
- Use *italic* for emphasis on specific techniques or methods
- Use \`code\` for technical terms, file formats, or tool names
- Use numbered lists for step-by-step analysis
- Use bullet points for key indicators
- Structure responses with clear headings when appropriate
- Emphasize user needs and actionable insights

STYLE:
- Professional intelligence analyst
- Clear sections with emphasized key points
- Use formatting to highlight critical information
- Focus on what the user needs to know most`;

const ChaosLensChatOrb = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "CHAOSLENS AI online. I analyze deepfakes, misinformation, and AI-generated content. What requires verification?",
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
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

      if (!apiKey) {
        throw new Error(
          "OpenAI API key not found. Add VITE_OPENAI_API_KEY to your .env file."
        );
      }

      // Build conversation history for ChatGPT
      const chatMessages = [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        // Add conversation history (skip initial assistant greeting)
        ...messages.slice(1).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        {
          role: "user",
          content: text,
        },
      ];

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo", // or "gpt-4" for better results
            messages: chatMessages,
            temperature: 0.7,
            max_tokens: 1024,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message ||
            `API Error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Extract text from ChatGPT response
      const assistantContent =
        data.choices?.[0]?.message?.content || "No response generated";

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
          "CHAOSLENS AI online. I analyze deepfakes, misinformation, and AI-generated content. What requires verification?",
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
        @keyframes glitch-x {
          0%, 100% { transform: translate(0, 0) skewX(0deg); }
          20% { transform: translate(-2px, 0) skewX(-5deg); }
          40% { transform: translate(2px, -1px) skewX(3deg); }
          60% { transform: translate(-1px, 1px) skewX(-2deg); }
          80% { transform: translate(1px, 0) skewX(4deg); }
        }
        
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 0, 0, 0.8), inset 0 0 20px rgba(255, 0, 0, 0.3); }
          50% { box-shadow: 0 0 40px rgba(255, 0, 0, 1), inset 0 0 30px rgba(255, 0, 0, 0.5), 0 0 80px rgba(255, 0, 0, 0.6); }
        }

        @keyframes scale-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }

        .glitch-button {
          animation: glitch-x 0.6s infinite, pulse-glow 2s ease-in-out infinite;
        }

        .glitch-button:hover {
          animation: glitch-x 0.3s infinite, pulse-glow 1.2s ease-in-out infinite, scale-pop 0.4s ease-in-out !important;
        }

        .omg-text {
          font-size: 1.8rem;
          font-weight: 900;
          letter-spacing: -0.15em;
          line-height: 1;
          text-transform: uppercase;
          font-family: 'Arial Black', sans-serif;
          background: linear-gradient(135deg, #ff3333 0%, #ff8800 50%, #ff3333 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 8px rgba(255, 51, 51, 0.8));
        }
      `}</style>

      <motion.button
        onClick={() => setOpen((o) => !o)}
        className="glitch-button fixed bottom-8 right-8 z-50 w-20 h-20 rounded-full
        bg-black border-2 border-red-600
        flex flex-col items-center justify-center
        cursor-pointer group"
        title="UNLOCK CHAOSLENS"
      >
        <div className="omg-text">OMG</div>
        <div className="text-[0.65rem] font-bold text-red-400 tracking-widest mt-1">
          SCAN
        </div>
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
                    {m.role === "assistant" ? parseFormattedText(m.content) : m.content}
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
                    ⚡ ANALYZING SIGNAL…
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
                  placeholder="Submit evidence for analysis…"
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

export default ChaosLensChatOrb;