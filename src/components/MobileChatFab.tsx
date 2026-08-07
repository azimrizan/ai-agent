import React from "react";
import { MessageSquare, Sparkles } from "lucide-react";
import { useAgentStore } from "../store/useAgentStore.js";

export const MobileChatFab: React.FC = () => {
  const { toggleMobileChat, isMobileChatOpen, hasUnreadReply } = useAgentStore();

  if (isMobileChatOpen) return null;

  return (
    <button
      onClick={() => toggleMobileChat(true)}
      className="fixed bottom-6 left-6 z-40 md:hidden flex items-center gap-2.5 px-4 py-3.5 rounded-full liquid-glass-card border border-white/15 text-white shadow-2xl backdrop-blur-xl active:scale-95 transition-all duration-300"
      title="Open MR.PLUS AI Chat"
    >
      <div className="relative flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
        {hasUnreadReply && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-black/80 animate-ping" />
        )}
        {hasUnreadReply && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-500/50" />
        )}
      </div>

      <span className="text-xs font-semibold tracking-tight text-white/90">
        Ask MR.PLUS AI Agent
      </span>

      <MessageSquare className="w-3.5 h-3.5 opacity-60 ml-0.5" />
    </button>
  );
};
