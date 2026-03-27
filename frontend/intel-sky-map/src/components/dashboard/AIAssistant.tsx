import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Globe } from "lucide-react";
import { useIntelligence } from "@/context/IntelligenceContext";
import { useAnalysisChat } from "@/hooks/useBackendData";

type ConversationItem = {
  role: "assistant" | "user";
  text: string;
};

const starterConversation: ConversationItem[] = [
  {
    role: "assistant",
    text: "Hi, I have latest updates on global intelligence factors and cross-sector risk spillovers.",
  },
  {
    role: "user",
    text: "How are equity and commodity markets reacting to current tensions?",
  },
  {
    role: "assistant",
    text: "I can correlate event signals with market movement and explain the intelligence chain.",
  },
];

const AIAssistant = () => {
  const [input, setInput] = useState("");
  const [conversation, setConversation] = useState<ConversationItem[]>(starterConversation);
  const navigate = useNavigate();
  const { processQuery, selectedCountry } = useIntelligence();
  const chatMutation = useAnalysisChat();
  const sessionIdRef = useRef<string>(`assist-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || chatMutation.isPending) return;

    processQuery(question);
    setConversation((prev) => [...prev, { role: "user", text: question }]);
    setInput("");

    try {
      const response = await chatMutation.mutateAsync({
        question,
        country: selectedCountry,
        sessionId: sessionIdRef.current,
      });

      setConversation((prev) => [
        ...prev,
        {
          role: "assistant",
          text: response.answer || "No answer returned.",
        },
      ]);
    } catch {
      setConversation((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "I could not fetch the answer right now. Please try again.",
        },
      ]);
    }
  };

  return (
    <div
      className="flex h-full flex-col p-4"
      onDoubleClick={() => navigate("/analysis")}
      title="Double click to open full analysis"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xl font-semibold uppercase tracking-[0.08em] text-white sm:text-2xl">AI Assistant</h3>
        <span className="text-xl text-text-secondary">^</span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
        {conversation.map((item, idx) => (
          <div
            key={idx}
            className={`rounded-xl border p-3 text-sm leading-snug sm:text-base ${
              item.role === "assistant"
                ? "border-[#2f3f52] bg-[#152433]/78 text-white"
                : "border-coral/35 bg-coral/15 text-white/95"
            }`}
          >
            <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.11em] text-text-secondary">
              <Globe className="h-3.5 w-3.5" />
              {item.role === "assistant" ? "Intel AI" : "You"}
            </div>
            {item.text}
          </div>
        ))}

        {chatMutation.isPending && (
          <div className="rounded-xl border border-[#2f3f52] bg-[#152433]/78 p-3 text-sm text-white">Thinking...</div>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-border/70 bg-[#0f1722] p-2.5">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about global intelligence..."
            className="flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-text-secondary sm:text-base"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending}
            className="rounded-md bg-coral px-2 py-2 text-white transition hover:bg-coral-muted disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
