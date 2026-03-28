import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";
import { useIntelligence } from "@/context/IntelligenceContext";
import { useAnalysisChat } from "@/hooks/useBackendData";

interface Message {
  role: "user" | "assistant";
  content: string;
  meta?: string;
  timestamp: Date;
}

const suggestions = [
  "What are the primary risk drivers for this country?",
  "Summarize the geopolitical threat landscape",
  "What policy actions are recommended?",
  "Forecast risk trajectory for next 30 days",
];

const AIChat = () => {
  const { selectedCountry, newsCategory, newsRegion, newsStartDate, newsEndDate } = useIntelligence();
  const chatMutation = useAnalysisChat();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>(`chat-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: `Intelligence briefing initialized for **${selectedCountry}**. Ask any strategic question to run live graph analysis.`,
        timestamp: new Date(),
      },
    ]);
  }, [selectedCountry]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatMutation.isPending]);

  const handleSend = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim() || chatMutation.isPending) return;

    const userMsg: Message = { role: "user", content: msg, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const response = await chatMutation.mutateAsync({
        question: msg,
        country: selectedCountry,
        sessionId: sessionIdRef.current,
        category: newsCategory || undefined,
        region: newsRegion || undefined,
        startDate: newsStartDate || undefined,
        endDate: newsEndDate || undefined,
      });
      const answerMsg: Message = {
        role: "assistant",
        content: response.answer || "No answer returned.",
        meta: [
          response.confidence ? `Confidence: ${response.confidence.toUpperCase()}` : "",
          response.context_used ? `Context: ${response.context_used}` : "",
        ]
          .filter(Boolean)
          .join(" | "),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, answerMsg]);
    } catch (error) {
      const errorMsg: Message = {
        role: "assistant",
        content: "I could not process that request right now. Please retry in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      console.error(error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-coral" />
          <h3 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Intelligence AI</h3>
          <div className="ml-auto flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${chatMutation.isPending ? "bg-yellow-400" : "bg-status-online"}`} />
            <span className="text-[10px] text-text-secondary">{chatMutation.isPending ? "Thinking" : "Active"}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-md bg-coral/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-coral" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.role === "user" ? "bg-coral/15 text-foreground" : "bg-accent text-foreground"
              }`}
            >
              {msg.content.split("\n").map((line, li) => (
                <p key={li} className={li > 0 ? "mt-1.5" : ""}>
                  {line.split(/(\*\*.*?\*\*)/).map((part, pi) =>
                    part.startsWith("**") && part.endsWith("**") ? (
                      <span key={pi} className="font-semibold text-foreground">
                        {part.slice(2, -2)}
                      </span>
                    ) : (
                      <span key={pi}>{part}</span>
                    )
                  )}
                </p>
              ))}
              <span className="block mt-2 text-[10px] text-text-secondary">{msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              {msg.meta && <span className="block mt-1 text-[10px] text-coral/90">{msg.meta}</span>}
            </div>
            {msg.role === "user" && (
              <div className="w-6 h-6 rounded-md bg-elevated flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-text-secondary" />
              </div>
            )}
          </div>
        ))}

        {chatMutation.isPending && (
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-md bg-coral/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-coral" />
            </div>
            <div className="bg-accent rounded-lg px-3.5 py-2.5">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSend(s)}
              className="text-[10px] px-2.5 py-1.5 rounded-md bg-accent text-text-secondary hover:text-foreground hover:bg-elevated transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="px-3 pb-3 pt-2 border-t border-border">
        <div className="flex items-center gap-2 bg-accent rounded-md px-3 py-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about intelligence, risks, or policy..."
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-text-secondary outline-none"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || chatMutation.isPending}
            className="text-coral hover:text-coral-muted transition-colors disabled:opacity-30"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
