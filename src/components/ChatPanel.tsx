import React, { useState, useRef, useEffect } from "react";
import { useAgentStore } from "../store/useAgentStore.js";
import { Send, Image as ImageIcon, Bot, Loader2, CheckCircle2, AlertCircle, X, Terminal, History, Settings, Sparkles } from "lucide-react";

export const ChatPanel: React.FC = () => {
  const { messages, sendMessage, isThinking, suggestedActions, resetSession } = useAgentStore();
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

  const handleChipClick = (actionText: string) => {
    sendMessage(actionText, attachedImage || undefined);
    setAttachedImage(null);
  };

  const formatMessageText = (content: string) => {
    return content.split("\n").map((line, idx) => {
      if (line.startsWith("### ") || line.startsWith("#### ")) {
        return (
          <h4 key={idx} className="text-sm sm:text-base font-bold text-stone-900 mt-3 mb-1">
            {line.replace(/^###?\s+/, "")}
          </h4>
        );
      }
      if (line.trim().startsWith("- ")) {
        const bulletContent = line.trim().substring(2);
        return (
          <div key={idx} className="flex items-start gap-2 text-stone-700 text-xs sm:text-sm my-1 pl-1">
            <span className="text-purple-600 font-bold">•</span>
            <span dangerouslySetInnerHTML={{ __html: parseBoldAndCode(bulletContent) }} />
          </div>
        );
      }
      if (line.trim() === "") {
        return <div key={idx} className="h-2" />;
      }
      return (
        <p
          key={idx}
          className="text-stone-700 text-xs sm:text-sm leading-relaxed my-1"
          dangerouslySetInnerHTML={{ __html: parseBoldAndCode(line) }}
        />
      );
    });
  };

  const parseBoldAndCode = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-stone-900">$1</strong>')
      .replace(/`(.*?)`/g, '<code class="bg-stone-100 px-1.5 py-0.5 rounded font-mono text-purple-600 text-[11px] border border-stone-200">$1</code>');
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-transparent text-stone-900">
      {/* Clean Top Header */}
      <div className="px-5 py-4 border-b border-stone-200/60 flex items-center justify-between shrink-0 bg-transparent">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-purple-500/20">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-stone-900 text-sm sm:text-base tracking-tight block">MR. Plus AI Agent</span>
            <span className="text-[10px] text-stone-500 font-medium">Multimodal Retail Advisor</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-stone-500">
          <button
            onClick={() => resetSession("blank")}
            title="Clear & reset chat"
            className="p-1.5 rounded-lg hover:bg-stone-100 hover:text-stone-900 transition-colors"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            title="Settings"
            className="p-1.5 rounded-lg hover:bg-stone-100 hover:text-stone-900 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Welcome status when starting (before user asks something) */}
        {messages.length <= 1 && (
          <div className="flex flex-col items-center justify-center text-center my-auto py-8 animate-in fade-in duration-300">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 mb-3 border border-purple-100 shadow-sm">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-stone-900 mb-1">
              Ready for Your Project
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 max-w-xs leading-relaxed mb-4">
              Explore the studio cards on the left panel or type any question below to begin building your custom plan.
            </p>

            {suggestedActions && suggestedActions.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-sm mx-auto">
                {suggestedActions.slice(0, 3).map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleChipClick(action)}
                    className="px-3.5 py-1.5 rounded-full bg-white hover:bg-purple-50 text-stone-700 hover:text-purple-600 border border-stone-200/80 text-xs font-medium transition-all shadow-sm"
                  >
                    {action.split(" (")[0]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Render Chat Messages */}
        {messages.length > 1 &&
          messages
            .filter((msg) => msg.id !== "msg_init_0")
            .map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col gap-1.5 animate-in fade-in duration-200 ${
                  msg.role === "user" ? "ml-auto items-end max-w-[85%]" : "mr-auto items-start max-w-[92%]"
                }`}
              >
                {/* Tool Trace */}
                {msg.toolActivity && msg.toolActivity.length > 0 && (
                  <div className="w-full bg-stone-50/90 rounded-xl border border-stone-200 p-3 space-y-2 mb-1 shadow-inner text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-stone-800 font-mono">
                      <Terminal className="w-3.5 h-3.5 text-purple-600" />
                      <span>Agent Execution Trace:</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {msg.toolActivity.map((act, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-stone-200/70 shadow-sm"
                        >
                          <div className="flex items-center gap-2 truncate">
                            {act.status === "running" ? (
                              <Loader2 className="w-3.5 h-3.5 text-purple-600 animate-spin shrink-0" />
                            ) : act.status === "completed" ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            )}
                            <span className="font-mono text-stone-800 text-[11px] truncate">{act.tool}</span>
                          </div>
                          <span className="text-[10px] text-stone-500 font-medium truncate shrink-0">
                            {act.displayLabel || act.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Bubble Content */}
                <div
                  className={`p-4 sm:p-5 rounded-2xl border shadow-md ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white border-purple-400/50 rounded-tr-sm"
                      : "bg-white text-stone-800 border-stone-200/80 rounded-tl-sm w-full"
                  }`}
                >
                  {/* Attached Photo Preview */}
                  {msg.imageAttachment && (
                    <div className="mb-3 rounded-xl overflow-hidden border border-stone-200 bg-stone-50 max-w-sm shadow-sm">
                      <img src={msg.imageAttachment} alt="Attachment preview" className="w-full h-44 object-cover" />
                    </div>
                  )}

                  {/* Formatted Text */}
                  <div className="space-y-1">
                    {msg.role === "user" ? (
                      <p className="text-sm font-semibold text-white leading-relaxed">{msg.content}</p>
                    ) : (
                      formatMessageText(msg.content)
                    )}
                  </div>
                </div>
              </div>
            ))}

        {/* Minimal indicator when isThinking (since the video plays on the Left Workspace Panel) */}
        {isThinking && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/90 border border-stone-200 shadow-sm max-w-xs mr-auto animate-in fade-in duration-200">
            <div className="w-7 h-7 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0 border border-purple-100">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div>
              <div className="text-xs font-bold text-stone-900">AI Architect is working...</div>
              <div className="text-[10px] text-stone-500">Synthesizing live on left canvas</div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Clean Bottom Input Box */}
      <div className="p-4 shrink-0 bg-transparent">
        {attachedImage && (
          <div className="mb-2 p-2 rounded-xl bg-white/90 border border-purple-200 flex items-center justify-between gap-3 max-w-xs animate-in fade-in duration-200 shadow-md">
            <div className="flex items-center gap-2 overflow-hidden">
              <img src={attachedImage} alt="Preview" className="w-8 h-8 rounded-lg object-cover bg-stone-100 shrink-0 border border-stone-200" />
              <span className="text-xs font-bold text-stone-800 truncate">Photo Attached</span>
            </div>
            <button
              onClick={() => setAttachedImage(null)}
              className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white/90 border border-stone-200/90 focus-within:border-purple-600/80 rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-lg transition-all"
        >
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {/* Photo Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload photo for analysis"
            className={`p-1 transition-colors shrink-0 flex items-center justify-center ${
              attachedImage ? "text-purple-600" : "text-stone-400 hover:text-stone-700"
            }`}
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask me (e.g. balcony garden, apartment setup, or fix broken hinge)..."
            className="flex-1 bg-transparent border-none text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none py-1"
            disabled={isThinking}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={isThinking || (!inputText.trim() && !attachedImage)}
            className="text-purple-600 hover:text-purple-700 disabled:opacity-30 transition-colors shrink-0 p-1 flex items-center justify-center"
          >
            {isThinking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
};
