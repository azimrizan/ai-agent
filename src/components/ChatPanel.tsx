import React, { useState, useRef, useEffect } from "react";
import { useAgentStore } from "../store/useAgentStore.js";
import { ArrowUp, Image as ImageIcon, Sparkles, Mic, X } from "lucide-react";

const renderFormattedText = (text: string) => {
  const regex = /(\[.*?\]\(https?:\/\/[^\s\)]+\)|\*\*.*?\*\*|https?:\/\/[^\s\)]+)/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (!part) return null;

    // Markdown link: [Anchor Text](https://...)
    const mdLinkMatch = part.match(/^\[(.*?)\]\((https?:\/\/[^\s\)]+)\)$/);
    if (mdLinkMatch) {
      const anchorText = mdLinkMatch[1];
      const url = mdLinkMatch[2];
      return (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-4 transition-colors"
        >
          {anchorText} ↗
        </a>
      );
    }

    // Bold text: **text**
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Raw URL: https://...
    if (/^https?:\/\/[^\s\)]+$/.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-4 transition-colors break-all"
        >
          {part} ↗
        </a>
      );
    }

    return part;
  });
};

const FormattedMessage: React.FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => {
  if (isUser) {
    return <span>{content}</span>;
  }

  const blocks = content.split(/\n\s*\n/);

  return (
    <div className="space-y-2.5 text-xs sm:text-sm leading-relaxed text-white/90">
      {blocks.map((block, bIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith("###") || trimmed.startsWith("##") || trimmed.startsWith("#")) {
          const headerText = trimmed.replace(/^#+\s*/, "");
          return (
            <div key={bIdx} className="font-bold text-white text-sm tracking-tight border-b border-white/10 pb-1 mt-1">
              {renderFormattedText(headerText)}
            </div>
          );
        }

        const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
        const isList = lines.every((line) => /^([*•\-]||\d+\.)\s+/.test(line));

        if (isList) {
          return (
            <div key={bIdx} className="space-y-1.5 pl-0.5 my-1">
              {lines.map((line, lIdx) => {
                const isNumbered = /^\d+\.\s+/.test(line);
                const numberMatch = line.match(/^(\d+)\.\s+/);
                const cleanLine = line.replace(/^([*•\-]||\d+\.)\s+/, "");
                return (
                  <div key={lIdx} className="flex items-start gap-2">
                    {isNumbered ? (
                      <span className="text-white/50 font-mono text-[11px] min-w-[14px] mt-0.5">{numberMatch?.[1]}.</span>
                    ) : (
                      <span className="text-white/60 font-bold select-none text-[10px] mt-0.5">•</span>
                    )}
                    <span className="text-white/90">{renderFormattedText(cleanLine)}</span>
                  </div>
                );
              })}
            </div>
          );
        }

        return (
          <div key={bIdx} className="space-y-1">
            {lines.map((line, lIdx) => (
              <p key={lIdx}>{renderFormattedText(line)}</p>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export const ChatPanel: React.FC = () => {
  const { messages, sendMessage, isThinking, toggleMobileChat } = useAgentStore();
  const [inputText, setInputText] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedImage) return;

    sendMessage(inputText, attachedImage || undefined);
    setInputText("");
    setAttachedImage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setAttachedImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const activeConversationMessages = messages.filter((msg) => msg.id !== "msg_init_0");

  const cleanMessageContent = (content: string) => {
    return content
      .replace(/^> ⚠️.*?\n\n---\n\n/gs, "")
      .replace(/### Live Shopify Products.*?\n\n/gi, "")
      .replace(/\*gid:\/\/shopify\/.*?\*/gi, "")
      .replace(/\[([^\]]+)\]\s*\n\s*\((https?:\/\/[^\s\)]+)\)/g, "[$1]($2)")
      .trim();
  };


  const quickPrompts = [
    { title: "Show pressure cookers under ₹2,000", query: "Show me pressure cookers under ₹2,000" },
    { title: "Find non-stick frypans and appachatty", query: "Find non-stick frypans and appachatty" },
    { title: "Home Theatre & Soundbars", query: "Show me Home Theatre and Soundbar speakers" },
    { title: "Digital Air Fryer 5L", query: "Tell me about the MR.PLUS Digital Air Fryer 5L" },
  ];


  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-[#0E0E0E] text-white">
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 sm:w-80 sm:h-80 rounded-full blur-3xl opacity-40 pointer-events-none z-0"
        style={{
          background: "radial-gradient(circle, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.04) 50%, rgba(0, 0, 0, 0) 75%)",
        }}
      />

      <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 shrink-0 relative z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 opacity-70 text-emerald-400" />
          <span className="font-semibold text-sm tracking-tight text-white">Assistant</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-white/30 font-normal">MR.PLUS AI</span>
          <button
            type="button"
            onClick={() => toggleMobileChat(false)}
            className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white md:hidden transition-colors"
            title="Close Chat Overlay"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10">
        {activeConversationMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8 my-auto animate-in fade-in duration-300">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 shadow-lg">
              <Sparkles className="w-5 h-5 text-white/90" />
            </div>

            <h3 className="font-bold text-white text-xl tracking-tight mb-2">
              Ready for Your Project
            </h3>

            <p className="text-xs text-white/50 text-center max-w-xs leading-relaxed mb-6">
              Explore the studio cards on the left panel or type any question below to begin building your custom plan.
            </p>

            <div className="flex flex-col gap-2.5 w-full max-w-xs">
              {quickPrompts.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(item.query)}
                  className="w-full px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/25 text-xs text-white/80 hover:text-white font-medium transition-all text-center"
                >
                  {item.title}
                </button>
              ))}
            </div>
          </div>
        ) : (
          activeConversationMessages.map((msg) => {
            const isUser = msg.role === "user";
            const cleanedText = cleanMessageContent(msg.content);
            if (!cleanedText && !msg.imageAttachment) return null;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? "items-end" : "items-start"} animate-in fade-in duration-300`}
              >
                {msg.imageAttachment && (
                  <div className="mb-2 max-w-[220px] rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                    <img src={msg.imageAttachment} alt="Attachment" className="w-full h-auto object-cover" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] px-5 py-3.5 rounded-[22px] text-sm leading-relaxed ${
                    isUser
                      ? "bg-white text-black font-medium rounded-br-md shadow-md"
                      : "bg-[#151515] text-white/90 font-normal rounded-bl-md border border-white/5"
                  }`}
                >
                  <FormattedMessage content={cleanedText} isUser={isUser} />
                </div>
              </div>
            );
          })
        )}

        {/* Apple 3-Dot Breathing Typing Indicator */}
        {isThinking && (
          <div className="flex flex-col items-start animate-in fade-in duration-300">
            <div className="bg-[#151515] border border-white/5 px-5 py-3.5 rounded-[22px] rounded-bl-md flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white/70 animate-dot-1" />
              <span className="w-2 h-2 rounded-full bg-white/70 animate-dot-2" />
              <span className="w-2 h-2 rounded-full bg-white/70 animate-dot-3" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar (Floating Glass Capsule) */}
      <div className="p-4 shrink-0 relative z-10">
        {attachedImage && (
          <div className="mb-2 relative inline-block">
            <img src={attachedImage} alt="Attachment" className="w-12 h-12 rounded-lg object-cover border border-white/20" />
            <button
              onClick={() => setAttachedImage(null)}
              className="absolute -top-1.5 -right-1.5 bg-black text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center border border-white/20"
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask MR.PLUS or use voice..."
            className="w-full glass-capsule text-white placeholder-white/30 text-sm rounded-full pl-12 pr-20 py-3.5 focus:outline-none transition-all"
          />

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {/* Left Attachment Trigger */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute left-3.5 p-1.5 text-white/40 hover:text-white transition-colors"
            title="Attach image"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <div className="absolute right-2.5 flex items-center gap-1.5">
            {/* Mic Voice Search Trigger */}
            <button
              type="button"
              onClick={() => {
                const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                if (SpeechRecognition) {
                  const recognition = new SpeechRecognition();
                  recognition.lang = "en-IN";
                  recognition.onstart = () => setInputText("Listening...");
                  recognition.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    setInputText(transcript);
                  };
                  recognition.start();
                } else {
                  alert("Speech recognition is not supported in this browser.");
                }
              }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
              title="Voice query input"
            >
              <Mic className="w-3.5 h-3.5" />
            </button>

            {/* Send Trigger */}
            <button
              type="submit"
              disabled={!inputText.trim() && !attachedImage}
              className="p-2 rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-20 disabled:hover:bg-white transition-all shadow-md"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
