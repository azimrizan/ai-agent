import React, { useEffect } from "react";
import { ChevronRight, MessageSquare, ShoppingBag, Sparkles, X } from "lucide-react";
import { useAgentStore } from "../store/useAgentStore.js";

const NOTICE_AUTO_HIDE_MS = 12000;

export const MobileChatFab: React.FC = () => {
  const {
    toggleMobileChat,
    isMobileChatOpen,
    hasUnreadReply,
    isThinking,
    mobileReplyNotice,
    dismissMobileReplyNotice,
  } = useAgentStore();

  // Auto-hide the reply toast so it doesn't keep covering products; the unread badge stays
  useEffect(() => {
    if (!mobileReplyNotice) return;
    const timer = setTimeout(dismissMobileReplyNotice, NOTICE_AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [mobileReplyNotice, dismissMobileReplyNotice]);

  if (isMobileChatOpen) return null;

  return (
    <div className="fixed inset-x-4 bottom-5 z-40 lg:hidden flex flex-col gap-3 pointer-events-none">
      {/* Reply notification toast */}
      {mobileReplyNotice && (
        <div className="pointer-events-auto animate-toast-in rounded-[24px] liquid-glass-card border border-emerald-400/25 bg-[#101010]/95 shadow-2xl backdrop-blur-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 shrink-0 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-white">MR.PLUS AI replied</span>
                <button
                  type="button"
                  onClick={dismissMobileReplyNotice}
                  className="p-1 -m-1 rounded-full text-white/40 hover:text-white transition-colors"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {mobileReplyNotice.preview && (
                <p className="text-xs text-white/60 leading-relaxed mt-1 line-clamp-2">{mobileReplyNotice.preview}</p>
              )}

              <div className="flex items-center justify-between gap-2 mt-3">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  {mobileReplyNotice.productCount} {mobileReplyNotice.productCount === 1 ? "product" : "products"} below
                </span>

                <button
                  type="button"
                  onClick={() => toggleMobileChat(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white text-black text-[11px] font-semibold active:scale-95 transition-transform"
                >
                  Read reply
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Persistent "Ask" bar */}
      <button
        onClick={() => toggleMobileChat(true)}
        className="pointer-events-auto w-full flex items-center gap-3 pl-4 pr-2 py-2 rounded-full liquid-glass-card border border-white/15 bg-[#101010]/90 text-white shadow-2xl backdrop-blur-xl active:scale-[0.98] transition-all duration-300"
        title="Open MR.PLUS AI Chat"
      >
        <Sparkles className={`w-4 h-4 shrink-0 text-emerald-400 ${isThinking ? "animate-spin" : "animate-pulse"}`} />

        <span className="flex-1 text-left text-sm text-white/60 truncate">
          {isThinking ? "MR.PLUS is finding products..." : hasUnreadReply ? "New reply from MR.PLUS AI" : "Ask MR.PLUS AI Agent..."}
        </span>

        <span className="relative w-9 h-9 shrink-0 rounded-full bg-white/10 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-white/80" />
          {hasUnreadReply && (
            <>
              <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-black" />
            </>
          )}
        </span>
      </button>
    </div>
  );
};
